-- REVIEW ONLY. Requires 20261018_studenthood_experiences_foundation.sql.
-- Gigs Plus: verified employer requests and private job application workflow.
create table if not exists public.studenthood_employer_organizations(
 id uuid primary key default gen_random_uuid(),
 legal_name text not null check(length(trim(legal_name)) between 3 and 120),
 website_url text check(website_url is null or website_url ~ '^https://'),
 requested_by uuid not null references public.profiles(id),
 verification_status text not null default 'pending'
   check(verification_status in ('pending','verified','denied','suspended')),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.studenthood_employer_organizations enable row level security;
revoke all on public.studenthood_employer_organizations from public,anon,authenticated;
grant select,insert on public.studenthood_employer_organizations to authenticated;
drop policy if exists "Eligible adults see only verified employers or own request" on public.studenthood_employer_organizations;
create policy "Eligible adults see only verified employers or own request"
on public.studenthood_employer_organizations for select to authenticated
using ((requested_by=(select auth.uid()) or verification_status='verified')
   and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18);
drop policy if exists "Adult applicant may request employer verification" on public.studenthood_employer_organizations;
create policy "Adult applicant may request employer verification"
on public.studenthood_employer_organizations for insert to authenticated with check (
  requested_by=(select auth.uid()) and verification_status='pending'
  and verified_at is null
  and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18
  and coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
  and exists(select 1 from public.studenthood_experience_flags where feature_key='gigs_plus' and enabled)
);
-- There is intentionally NO authenticated UPDATE/DELETE or verified-badge grant.
-- Human operators must review identity evidence through separately approved private methods.

create table if not exists public.studenthood_employer_memberships(
 employer_id uuid not null references public.studenthood_employer_organizations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in ('owner','recruiter')),
 status text not null default 'active' check(status in ('active','suspended')),
 primary key(employer_id,user_id)
);
alter table public.studenthood_employer_memberships enable row level security;
revoke all on public.studenthood_employer_memberships from public,anon,authenticated;
grant select on public.studenthood_employer_memberships to authenticated;
drop policy if exists "Employer staff may see own membership" on public.studenthood_employer_memberships;
create policy "Employer staff may see own membership"
on public.studenthood_employer_memberships for select to authenticated
using (user_id=(select auth.uid()));

create or replace function private.studenthood_employer_owner_membership()
returns trigger language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 insert into public.studenthood_employer_memberships(employer_id,user_id,role,status)
 values(new.id,new.requested_by,'owner','active') on conflict do nothing;
 return new;
end;
$function$;
revoke all on function private.studenthood_employer_owner_membership() from public,anon,authenticated;
drop trigger if exists studenthood_employer_owner_membership on public.studenthood_employer_organizations;
create trigger studenthood_employer_owner_membership
 after insert on public.studenthood_employer_organizations
 for each row execute function private.studenthood_employer_owner_membership();

alter table public.gigs add column if not exists employer_org_id uuid
 references public.studenthood_employer_organizations(id);
alter table public.gigs add column if not exists application_deadline timestamptz;
alter table public.gigs add column if not exists expires_at timestamptz;
alter table public.gigs add column if not exists work_mode text
 check(work_mode is null or work_mode in ('on_campus','hybrid','remote','in_person'));
alter table public.gigs add column if not exists minimum_age smallint
 check(minimum_age is null or minimum_age between 18 and 21);

-- Enforce privileged employer claims even through old clients and existing INSERT RLS.
create or replace function private.studenthood_guard_verified_employer_gig()
returns trigger language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 if new.employer_org_id is not null then
  if auth.uid() is null or new.creator_id<>auth.uid() or
    not exists(
      select 1 from public.studenthood_employer_organizations o
       join public.studenthood_employer_memberships m on m.employer_id=o.id
      where o.id=new.employer_org_id and o.verification_status='verified'
       and m.user_id=auth.uid() and m.status='active'
    )
    or not exists (select 1 from public.studenthood_experience_flags
        where feature_key='gigs_plus' and enabled)
  then raise exception 'Verified employer membership required';end if;
 end if;
 return new;
end;
$function$;
revoke all on function private.studenthood_guard_verified_employer_gig() from public,anon,authenticated;
drop trigger if exists studenthood_guard_verified_employer_gig on public.gigs;
create trigger studenthood_guard_verified_employer_gig
 before insert or update of employer_org_id,creator_id on public.gigs
 for each row execute function private.studenthood_guard_verified_employer_gig();

create table if not exists public.studenthood_gig_applications(
 id uuid primary key default gen_random_uuid(),
 gig_id uuid not null references public.gigs(id) on delete cascade,
 applicant_id uuid not null references public.profiles(id) on delete cascade,
 statement text check(statement is null or length(statement)<=1000),
 status text not null default 'submitted'
  check(status in ('submitted','in_review','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(gig_id,applicant_id)
);
alter table public.studenthood_gig_applications enable row level security;
revoke all on public.studenthood_gig_applications from public,anon,authenticated;
grant select on public.studenthood_gig_applications to authenticated;
drop policy if exists "Private applications for student and verified employer" on public.studenthood_gig_applications;
create policy "Private applications for student and verified employer"
on public.studenthood_gig_applications for select to authenticated using (
 applicant_id=(select auth.uid())
 or exists(select 1 from public.gigs g
  join public.studenthood_employer_organizations o on o.id=g.employer_org_id and o.verification_status='verified'
  join public.studenthood_employer_memberships m on m.employer_id=o.id and m.status='active'
  where g.id=gig_id and m.user_id=(select auth.uid()))
);

create table if not exists public.studenthood_gig_application_events(
 id bigint generated always as identity primary key,
 application_id uuid not null references public.studenthood_gig_applications(id) on delete cascade,
 actor_id uuid not null references public.profiles(id),
 action text not null,
 created_at timestamptz not null default now()
);
alter table public.studenthood_gig_application_events enable row level security;
revoke all on public.studenthood_gig_application_events from public,anon,authenticated;
-- Auditing remains operator-only; student UI reads status from application.

create or replace function public.studenthood_gig_application_action(
 p_gig_id uuid,p_action text,p_statement text default null,p_applicant_id uuid default null)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare
 me uuid:=auth.uid();
 g public.gigs%rowtype;
 a public.studenthood_gig_applications%rowtype;
 access jsonb;
 organization_verified boolean;
 actor_staff boolean;
 target uuid;
begin
 if me is null then raise exception 'Authentication required';end if;
 access:=public.studenthood_access_policy();
 if not coalesce((access->>'app_access')::boolean,false)
    or coalesce((access->>'conservative_age')::integer,0)<18
    or not coalesce((access->>'adult_access_verified')::boolean,false)
    then raise exception 'Verified adult access required';end if;
 if not exists(select 1 from public.studenthood_experience_flags
     where feature_key='gigs_plus' and enabled) then raise exception 'Gigs Plus disabled';end if;
 select * into g from public.gigs where id=p_gig_id for update;
 if g.id is null or g.moderation_status<>'approved' then raise exception 'Gig unavailable';end if;
 select exists(select 1 from public.studenthood_employer_organizations o
  where o.id=g.employer_org_id and o.verification_status='verified') into organization_verified;
 if not organization_verified then raise exception 'Employer not verified';end if;
 select exists(select 1 from public.studenthood_employer_memberships m
  where m.employer_id=g.employer_org_id and m.user_id=me and m.status='active')
  into actor_staff;
 target:=coalesce(p_applicant_id,me);
 if p_action='apply' then
  if target<>me or actor_staff or g.creator_id=me then raise exception 'Cannot apply as employer';end if;
  if not public.studenthood_can_view_creation('gig',g.creator_id,g.campus_name,'campus',g.moderation_status)
    then raise exception 'Gig outside permitted campus';end if;
  if (g.application_deadline is not null and now()>g.application_deadline)
    or (g.expires_at is not null and now()>g.expires_at)
    or coalesce((access->>'conservative_age')::integer,0)<coalesce(g.minimum_age,18)
    then raise exception 'Gig no longer accepting applications';end if;
  if p_statement is not null and length(p_statement)>1000 then raise exception 'Statement too long';end if;
  insert into public.studenthood_gig_applications(gig_id,applicant_id,statement,status)
   values(g.id,me,nullif(trim(p_statement),''),'submitted')
    on conflict (gig_id,applicant_id) do nothing
   returning * into a;
  if a.id is null then raise exception 'Application already exists';end if;
 elsif p_action='withdraw' then
  if target<>me then raise exception 'Only applicant may withdraw';end if;
  update public.studenthood_gig_applications
    set status='withdrawn',updated_at=now()
    where gig_id=g.id and applicant_id=me and status in ('submitted','in_review')
    returning * into a;
  if a.id is null then raise exception 'Application cannot be withdrawn';end if;
 elsif p_action in ('in_review','accepted','declined') then
  if not actor_staff or p_applicant_id is null then raise exception 'Verified employer staff only';end if;
  update public.studenthood_gig_applications
    set status=p_action,updated_at=now()
    where gig_id=g.id and applicant_id=target and status in ('submitted','in_review')
    returning * into a;
  if a.id is null then raise exception 'Application cannot be updated';end if;
 else raise exception 'Unsupported application action';end if;
 insert into public.studenthood_gig_application_events(application_id,actor_id,action)
 values(a.id,me,p_action);
 return jsonb_build_object('id',a.id,'status',a.status,'updated_at',a.updated_at);
end;
$function$;
revoke all on function public.studenthood_gig_application_action(uuid,text,text,uuid) from public,anon;
grant execute on function public.studenthood_gig_application_action(uuid,text,text,uuid) to authenticated;
