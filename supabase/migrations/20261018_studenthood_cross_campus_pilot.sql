-- REVIEW ONLY. No pilot campuses, enrollments or pairs enabled automatically.
-- Requires the experience foundation. This never changes Scenes/Peeps/Ping RLS.
create table if not exists public.studenthood_pilot_campus_enrollments(
 user_id uuid not null references public.profiles(id) on delete cascade,
 institution_id uuid not null references public.studenthood_institution_catalog(id),
 verification_status text not null default 'pending'
    check(verification_status in ('pending','verified','revoked')),
 verified_at timestamptz,
 primary key(user_id,institution_id)
);
alter table public.studenthood_pilot_campus_enrollments enable row level security;
revoke all on public.studenthood_pilot_campus_enrollments from public,anon,authenticated;
grant select on public.studenthood_pilot_campus_enrollments to authenticated;
drop policy if exists "Student sees only own pilot enrollment" on public.studenthood_pilot_campus_enrollments;
create policy "Student sees only own pilot enrollment"
 on public.studenthood_pilot_campus_enrollments for select to authenticated
 using(user_id=(select auth.uid()));
-- Operators alone verify canonical campus membership, never client self assertion.

create table if not exists public.studenthood_pilot_campus_pairs(
 campus_a_id uuid not null references public.studenthood_institution_catalog(id),
 campus_b_id uuid not null references public.studenthood_institution_catalog(id),
 enabled boolean not null default false,
 approved_at timestamptz,
 primary key(campus_a_id,campus_b_id),
 constraint distinct_campuses check(campus_a_id<>campus_b_id)
);
alter table public.studenthood_pilot_campus_pairs enable row level security;
revoke all on public.studenthood_pilot_campus_pairs from public,anon,authenticated;
grant select on public.studenthood_pilot_campus_pairs to authenticated;
drop policy if exists "Adult pilot enrolled student sees approved pairs" on public.studenthood_pilot_campus_pairs;
create policy "Adult pilot enrolled student sees approved pairs"
 on public.studenthood_pilot_campus_pairs for select to authenticated
 using (enabled and exists(select 1 from public.studenthood_pilot_campus_enrollments e
   where e.user_id=(select auth.uid()) and e.verification_status='verified'
     and e.institution_id in(campus_a_id,campus_b_id))
   and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18
   and coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false));

create table if not exists public.studenthood_cross_campus_projects(
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.profiles(id) on delete cascade,
 home_campus_id uuid not null references public.studenthood_institution_catalog(id),
 partner_campus_id uuid not null references public.studenthood_institution_catalog(id),
 title text not null check(length(trim(title)) between 5 and 140),
 description text not null check(length(trim(description)) between 30 and 3000),
 category text not null check(category in ('study','research','sports','arts','volunteering','other')),
 max_members integer not null default 6 check(max_members between 2 and 30),
 state text not null default 'open' check(state in ('open','closed','removed')),
 created_at timestamptz not null default now()
);
alter table public.studenthood_cross_campus_projects enable row level security;
revoke all on public.studenthood_cross_campus_projects from public,anon,authenticated;
grant select on public.studenthood_cross_campus_projects to authenticated;
drop policy if exists "Only two verified eligible pilot campuses see project" on public.studenthood_cross_campus_projects;
create policy "Only two verified eligible pilot campuses see project"
 on public.studenthood_cross_campus_projects for select to authenticated using(
 state<>'removed'
 and exists(select 1 from public.studenthood_pilot_campus_pairs pair
   where pair.enabled and
     ((pair.campus_a_id=home_campus_id and pair.campus_b_id=partner_campus_id)
       or (pair.campus_b_id=home_campus_id and pair.campus_a_id=partner_campus_id)))
 and exists(select 1 from public.studenthood_pilot_campus_enrollments e
   where e.user_id=(select auth.uid()) and e.verification_status='verified'
     and e.institution_id in(home_campus_id,partner_campus_id))
 and not public.studenthood_interaction_blocked((select auth.uid()),organizer_id)
 and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
 and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18
 and coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
 and exists(select 1 from public.studenthood_experience_flags
   where feature_key='collaborations' and enabled)
);

create table if not exists public.studenthood_cross_campus_memberships(
 project_id uuid not null references public.studenthood_cross_campus_projects(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('organizer','member')),
 status text not null default 'requested'
  check(status in ('requested','active','declined','left','removed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(project_id,user_id)
);
alter table public.studenthood_cross_campus_memberships enable row level security;
revoke all on public.studenthood_cross_campus_memberships from public,anon,authenticated;
grant select on public.studenthood_cross_campus_memberships to authenticated;
drop policy if exists "Private project membership visible to member or organizer" on public.studenthood_cross_campus_memberships;
create policy "Private project membership visible to member or organizer"
 on public.studenthood_cross_campus_memberships for select to authenticated
 using(user_id=(select auth.uid()) or exists(
    select 1 from public.studenthood_cross_campus_projects p
     where p.id=project_id and p.organizer_id=(select auth.uid())));

create table if not exists public.studenthood_cross_campus_invitations(
 project_id uuid not null references public.studenthood_cross_campus_projects(id) on delete cascade,
 invitee_id uuid not null references public.profiles(id) on delete cascade,
 invited_by uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
 expires_at timestamptz not null default(now()+interval '7 days'),
 created_at timestamptz not null default now(),
 primary key(project_id,invitee_id)
);
alter table public.studenthood_cross_campus_invitations enable row level security;
revoke all on public.studenthood_cross_campus_invitations from public,anon,authenticated;
grant select on public.studenthood_cross_campus_invitations to authenticated;
drop policy if exists "Only project inviter and invitee see invitations" on public.studenthood_cross_campus_invitations;
create policy "Only project inviter and invitee see invitations"
 on public.studenthood_cross_campus_invitations for select to authenticated
 using(invitee_id=(select auth.uid()) or invited_by=(select auth.uid()));

create table if not exists public.studenthood_cross_campus_reports(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.studenthood_cross_campus_projects(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(reason in ('spam','harassment','unsafe','misleading','other')),
 created_at timestamptz not null default now(),
 unique(project_id,reporter_id)
);
alter table public.studenthood_cross_campus_reports enable row level security;
revoke all on public.studenthood_cross_campus_reports from public,anon,authenticated;
grant insert on public.studenthood_cross_campus_reports to authenticated;
drop policy if exists "Eligible visible project can be reported privately" on public.studenthood_cross_campus_reports;
create policy "Eligible visible project can be reported privately"
 on public.studenthood_cross_campus_reports for insert to authenticated with check(
 reporter_id=(select auth.uid())
 and exists(select 1 from public.studenthood_cross_campus_projects
   where id=project_id)
);
-- Only authorized human moderators/service processes may SELECT reports.

create or replace function private.studenthood_cross_campus_owner_membership()
returns trigger language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 insert into public.studenthood_cross_campus_memberships(project_id,user_id,role,status)
  values(new.id,new.organizer_id,'organizer','active');
 return new;
end;
$function$;
revoke all on function private.studenthood_cross_campus_owner_membership() from public,anon,authenticated;
drop trigger if exists studenthood_cross_campus_owner_membership on public.studenthood_cross_campus_projects;
create trigger studenthood_cross_campus_owner_membership
 after insert on public.studenthood_cross_campus_projects
 for each row execute function private.studenthood_cross_campus_owner_membership();

create or replace function public.studenthood_cross_campus_create(
 p_home_campus uuid,p_partner_campus uuid,p_title text,p_description text,
 p_category text,p_max_members integer default 6)
returns uuid language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid();new_id uuid;access jsonb;
begin
 if me is null then raise exception 'Authentication required';end if;
 access:=public.studenthood_access_policy();
 if not coalesce((access->>'app_access')::boolean,false)
   or coalesce((access->>'conservative_age')::integer,0)<18
   or not coalesce((access->>'adult_access_verified')::boolean,false)
 then raise exception 'Verified adult access required';end if;
 if not exists(select 1 from public.studenthood_experience_flags
  where feature_key='collaborations' and enabled) then raise exception 'Cross-campus pilot unavailable';end if;
 if not exists(select 1 from public.studenthood_pilot_campus_enrollments e
  where e.user_id=me and e.institution_id=p_home_campus and e.verification_status='verified')
 then raise exception 'Canonical campus enrollment not verified';end if;
 if not exists(select 1 from public.studenthood_pilot_campus_pairs c
  where c.enabled and ((c.campus_a_id=p_home_campus and c.campus_b_id=p_partner_campus)
   or (c.campus_a_id=p_partner_campus and c.campus_b_id=p_home_campus)))
 then raise exception 'This campus partnership is not approved';end if;
 if length(trim(coalesce(p_title,''))) not between 5 and 140
    or length(trim(coalesce(p_description,''))) not between 30 and 3000
    or p_category not in ('study','research','sports','arts','volunteering','other')
    or p_max_members not between 2 and 30
 then raise exception 'Invalid project details';end if;
 insert into public.studenthood_cross_campus_projects(
 organizer_id,home_campus_id,partner_campus_id,title,description,category,max_members)
 values(me,p_home_campus,p_partner_campus,trim(p_title),trim(p_description),p_category,p_max_members)
 returning id into new_id;
 return new_id;
end;
$function$;
revoke all on function public.studenthood_cross_campus_create(uuid,uuid,text,text,text,integer) from public,anon;
grant execute on function public.studenthood_cross_campus_create(uuid,uuid,text,text,text,integer) to authenticated;

create or replace function public.studenthood_cross_campus_membership_action(
 p_project_id uuid,p_action text,p_member_id uuid default null)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid();p public.studenthood_cross_campus_projects%rowtype;
 who uuid;cnt integer;role_state text;age_ctx jsonb;access jsonb;
begin
 if me is null then raise exception 'Authentication required';end if;
 access:=public.studenthood_access_policy();
 if not coalesce((access->>'app_access')::boolean,false)
    or coalesce((access->>'conservative_age')::integer,0)<18
    or not coalesce((access->>'adult_access_verified')::boolean,false)
 then raise exception 'Adult pilot access required';end if;
 if not exists(select 1 from public.studenthood_experience_flags
   where feature_key='collaborations' and enabled)
 then raise exception 'Collaborations disabled';end if;
 select * into p from public.studenthood_cross_campus_projects
  where id=p_project_id for update;
 if p.id is null or p.state='removed' then raise exception 'Project unavailable';end if;
 if not exists(select 1 from public.studenthood_pilot_campus_pairs pair where pair.enabled
  and ((pair.campus_a_id=p.home_campus_id and pair.campus_b_id=p.partner_campus_id)
  or (pair.campus_a_id=p.partner_campus_id and pair.campus_b_id=p.home_campus_id)))
 then raise exception 'Pilot connection disabled';end if;
 if not exists(select 1 from public.studenthood_pilot_campus_enrollments e
  where e.user_id=me and e.verification_status='verified'
   and e.institution_id in(p.home_campus_id,p.partner_campus_id))
 then raise exception 'Caller not enrolled in this pilot';end if;
 if public.studenthood_interaction_blocked(me,p.organizer_id)
 then raise exception 'Interaction blocked';end if;
 who:=coalesce(p_member_id,me);
 if p_action='request' then
  if who<>me or p.state<>'open' or me=p.organizer_id
   then raise exception 'Cannot request this project';end if;
  insert into public.studenthood_cross_campus_memberships(project_id,user_id,role,status)
   values(p.id,me,'member','requested')
   on conflict(project_id,user_id) do update set status='requested',updated_at=now()
   where public.studenthood_cross_campus_memberships.role<>'organizer';
 elsif p_action='leave' then
  if who<>me or me=p.organizer_id then raise exception 'Project organizer cannot leave';end if;
  update public.studenthood_cross_campus_memberships
   set status='left',updated_at=now() where project_id=p.id and user_id=me and role='member';
 elsif p_action in ('approve','decline','remove') then
  if me<>p.organizer_id or who=me then raise exception 'Only organizer can manage requests';end if;
  age_ctx:=private.studenthood_age_context(who);
  if not coalesce((age_ctx->>'adult_access_verified')::boolean,false)
    or coalesce((age_ctx->>'conservative_age')::integer,0)<18
    or not exists(select 1 from public.studenthood_pilot_campus_enrollments e where e.user_id=who
       and e.verification_status='verified' and e.institution_id in(p.home_campus_id,p.partner_campus_id))
    or public.studenthood_interaction_blocked(me,who)
  then raise exception 'Requested student is not eligible';end if;
  if p_action='approve' then
   select count(*) into cnt from public.studenthood_cross_campus_memberships
    where project_id=p.id and status='active';
   if cnt>=p.max_members then raise exception 'This project is full';end if;
   update public.studenthood_cross_campus_memberships
     set status='active',updated_at=now()
     where project_id=p.id and user_id=who and status='requested';
   if not found then raise exception 'Pending request not found';end if;
  else
   update public.studenthood_cross_campus_memberships set
     status=case when p_action='decline' then 'declined' else 'removed' end,updated_at=now()
     where project_id=p.id and user_id=who and role='member';
   if not found then raise exception 'Project member not found';end if;
  end if;
 else raise exception 'Unsupported project action';end if;
 select status into role_state from public.studenthood_cross_campus_memberships
  where project_id=p.id and user_id=who;
 select count(*) into cnt from public.studenthood_cross_campus_memberships where project_id=p.id and status='active';
 return jsonb_build_object('status',coalesce(role_state,'none'),'members',cnt);
end;
$function$;
revoke all on function public.studenthood_cross_campus_membership_action(uuid,text,uuid) from public,anon;
grant execute on function public.studenthood_cross_campus_membership_action(uuid,text,uuid) to authenticated;

-- No cross-campus global search, student profile access, Scene feed or Ping policy expansion.
-- An invitation table exists for separate approved UX without changing current messaging rules.
