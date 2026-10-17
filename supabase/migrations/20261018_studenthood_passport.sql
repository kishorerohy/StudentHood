-- REVIEW ONLY. Requires experience flags, Crews HQ RSVPs and Gigs Plus.
-- Passport is private by default and is NOT a university-issued qualification.
create table if not exists public.studenthood_passport_entries(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 entry_type text not null check(entry_type in ('hang_participation','gig_engagement','crew_organizer','volunteer')),
 title text not null check(length(title) between 3 and 140),
 source_type text not null check(source_type in ('hang','gig_application','crew')),
 source_id uuid not null,
 issuer_id uuid not null references public.profiles(id),
 assurance text not null check(assurance in ('organizer_confirmed','employer_confirmed')),
 status text not null default 'active' check(status in ('active','revoked')),
 visibility text not null default 'private' check(visibility in ('private','profile')),
 issued_at timestamptz not null default now(),
 revoked_at timestamptz,
 unique(owner_id,source_type,source_id)
);
alter table public.studenthood_passport_entries enable row level security;
revoke all on public.studenthood_passport_entries from public,anon,authenticated;
grant select on public.studenthood_passport_entries to authenticated;
drop policy if exists "Passport visible only to record owner" on public.studenthood_passport_entries;
create policy "Passport visible only to record owner"
 on public.studenthood_passport_entries for select to authenticated
 using(owner_id=(select auth.uid()));
-- Never grant authenticated INSERT/UPDATE/DELETE, including self-attested verification.

create table if not exists public.studenthood_passport_share_grants(
 id uuid primary key default gen_random_uuid(),
 entry_id uuid not null references public.studenthood_passport_entries(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 token_hash text unique not null,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.studenthood_passport_share_grants enable row level security;
revoke all on public.studenthood_passport_share_grants from public,anon,authenticated;
grant select on public.studenthood_passport_share_grants to authenticated;
drop policy if exists "Owner sees private share grant metadata" on public.studenthood_passport_share_grants;
create policy "Owner sees private share grant metadata"
 on public.studenthood_passport_share_grants for select to authenticated
 using(owner_id=(select auth.uid()));

create or replace function public.studenthood_passport_issue_hang(p_hang_id uuid,p_student_id uuid)
returns uuid language plpgsql security definer
set search_path to pg_catalog,public,private,extensions
as $function$
declare me uuid:=auth.uid();h public.hangs%rowtype;issued uuid;
begin
 if me is null or not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
 then raise exception 'Account access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags
  where feature_key='passport' and enabled) then raise exception 'Passport disabled';end if;
 select * into h from public.hangs where id=p_hang_id;
 if h.id is null or h.creator_id<>me or h.moderation_status<>'approved' or h.starts_at>now()
 then raise exception 'Organizer confirmation is not available';end if;
 if not public.studenthood_same_campus_name(me,p_student_id,h.campus_name)
   or public.studenthood_interaction_blocked(me,p_student_id)
   or not exists(select 1 from public.studenthood_hang_rsvps where hang_id=h.id and user_id=p_student_id and status='going')
 then raise exception 'No eligible RSVP evidence for this student';end if;
 insert into public.studenthood_passport_entries(
  owner_id,entry_type,title,source_type,source_id,issuer_id,assurance,status,visibility)
 values(p_student_id,'hang_participation',left('Hang participation: '||h.title,140),
   'hang',h.id,me,'organizer_confirmed','active','private')
 on conflict (owner_id,source_type,source_id) do nothing returning id into issued;
 if issued is null then raise exception 'An entry for this activity already exists';end if;
 return issued;
end;
$function$;
revoke all on function public.studenthood_passport_issue_hang(uuid,uuid) from public,anon;
grant execute on function public.studenthood_passport_issue_hang(uuid,uuid) to authenticated;

-- Accepted work application alone is NOT proof of completion.
-- The label intentionally says employer-confirmed involvement, not degree/certificate.
create or replace function public.studenthood_passport_issue_gig_engagement(p_application_id uuid)
returns uuid language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid();a public.studenthood_gig_applications%rowtype;g public.gigs%rowtype;issued uuid;
begin
 if me is null or not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
 then raise exception 'Account access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags
  where feature_key='passport' and enabled) then raise exception 'Passport disabled';end if;
 select * into a from public.studenthood_gig_applications where id=p_application_id;
 if a.id is null or a.status<>'accepted' then raise exception 'Accepted application evidence required';end if;
 select * into g from public.gigs where id=a.gig_id;
 if g.id is null or not exists(
  select 1 from public.studenthood_employer_organizations o
  join public.studenthood_employer_memberships m on m.employer_id=o.id and m.status='active'
  where o.id=g.employer_org_id and o.verification_status='verified' and m.user_id=me)
 then raise exception 'Only this verified employer may issue confirmation';end if;
 if public.studenthood_interaction_blocked(me,a.applicant_id) then raise exception 'Interaction blocked';end if;
 insert into public.studenthood_passport_entries(
   owner_id,entry_type,title,source_type,source_id,issuer_id,assurance,status,visibility)
 values(a.applicant_id,'gig_engagement',left('Gig involvement: '||g.title,140),
   'gig_application',a.id,me,'employer_confirmed','active','private')
 on conflict (owner_id,source_type,source_id) do nothing returning id into issued;
 if issued is null then raise exception 'An entry for this activity already exists';end if;
 return issued;
end;
$function$;
revoke all on function public.studenthood_passport_issue_gig_engagement(uuid) from public,anon;
grant execute on function public.studenthood_passport_issue_gig_engagement(uuid) to authenticated;

create or replace function public.studenthood_passport_entry_action(p_entry_id uuid,p_action text)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public
as $function$
declare me uuid:=auth.uid();e public.studenthood_passport_entries%rowtype;
begin
 if me is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.studenthood_experience_flags where feature_key='passport' and enabled)
   then raise exception 'Passport disabled';end if;
 select * into e from public.studenthood_passport_entries where id=p_entry_id for update;
 if e.id is null then raise exception 'Passport entry unavailable';end if;
 if p_action in ('show','hide') and me=e.owner_id then
   if e.status<>'active' then raise exception 'Revoked record cannot be displayed';end if;
   update public.studenthood_passport_entries
     set visibility=case when p_action='show' then 'profile' else 'private' end
     where id=e.id returning * into e;
 elsif p_action='revoke' and me=e.issuer_id then
   update public.studenthood_passport_entries
     set status='revoked',revoked_at=now(),visibility='private' where id=e.id returning * into e;
   update public.studenthood_passport_share_grants set revoked_at=now()
     where entry_id=e.id and revoked_at is null;
 else raise exception 'Not authorized to change this Passport entry';end if;
 return jsonb_build_object('id',e.id,'status',e.status,'visibility',e.visibility);
end;
$function$;
revoke all on function public.studenthood_passport_entry_action(uuid,text) from public,anon;
grant execute on function public.studenthood_passport_entry_action(uuid,text) to authenticated;

-- For a permitted viewer, only explicitly published and unrevoked cards.
create or replace function public.studenthood_passport_profile_cards(p_owner uuid)
returns jsonb language plpgsql stable security definer
set search_path to pg_catalog,public
as $function$
declare me uuid:=auth.uid();records jsonb;
begin
 if me is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.studenthood_experience_flags where feature_key='passport' and enabled)
   then return '[]'::jsonb;end if;
 if p_owner<>me and (
  not public.studenthood_can_discover_profile(p_owner) or
  public.studenthood_interaction_blocked(me,p_owner))
 then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'title',title,'entry_type',entry_type,'assurance',assurance,'issued_at',issued_at)
  order by issued_at desc),'[]'::jsonb) into records
 from public.studenthood_passport_entries
 where owner_id=p_owner and status='active' and visibility='profile';
 return records;
end;
$function$;
revoke all on function public.studenthood_passport_profile_cards(uuid) from public,anon;
grant execute on function public.studenthood_passport_profile_cards(uuid) to authenticated;

-- Explicit high-entropy, expiring, revocable adult shares.
-- Raw token is returned once and NEVER stored. Recipients must sign in.
create or replace function public.studenthood_passport_create_share(p_entry_id uuid,p_hours integer default 24)
returns text language plpgsql security definer
set search_path to pg_catalog,public,extensions
as $function$
declare me uuid:=auth.uid();raw_token text;
begin
 if me is null or p_hours not between 1 and 168
   then raise exception 'Invalid share request';end if;
 if not exists(select 1 from public.studenthood_experience_flags where feature_key='passport' and enabled)
   then raise exception 'Passport disabled';end if;
 if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   or coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)<18
   or not coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
 then raise exception 'Only eligible verified adults can share Passport entries';end if;
 if not exists(select 1 from public.studenthood_passport_entries
   where id=p_entry_id and owner_id=me and status='active')
 then raise exception 'Entry unavailable';end if;
 raw_token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.studenthood_passport_share_grants(entry_id,owner_id,token_hash,expires_at)
  values(p_entry_id,me,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+make_interval(hours=>p_hours));
 return raw_token;
end;
$function$;
revoke all on function public.studenthood_passport_create_share(uuid,integer) from public,anon;
grant execute on function public.studenthood_passport_create_share(uuid,integer) to authenticated;

create or replace function public.studenthood_passport_read_share(p_token text)
returns jsonb language plpgsql stable security definer
set search_path to pg_catalog,public,extensions
as $function$
declare me uuid:=auth.uid();record jsonb;
begin
 if me is null or p_token !~ '^[0-9a-f]{48}
 if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   or coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)<18
 then raise exception 'Share unavailable';end if;
 select jsonb_build_object('title',e.title,'entry_type',e.entry_type,'assurance',e.assurance,
   'issued_at',e.issued_at,'status',e.status) into record
 from public.studenthood_passport_share_grants g
 join public.studenthood_passport_entries e on e.id=g.entry_id
 where g.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
   and g.revoked_at is null and g.expires_at>now()
   and e.status='active' and not public.studenthood_interaction_blocked(me,e.owner_id);
 return coalesce(record,'{}'::jsonb);
end;
$function$;
revoke all on function public.studenthood_passport_read_share(text) from public,anon;
grant execute on function public.studenthood_passport_read_share(text) to authenticated;

create or replace function public.studenthood_passport_revoke_share(p_share_id uuid)
returns boolean language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 update public.studenthood_passport_share_grants set revoked_at=now()
  where id=p_share_id and owner_id=auth.uid() and revoked_at is null;
 return found;
end;
$function$;
revoke all on function public.studenthood_passport_revoke_share(uuid) from public,anon;
grant execute on function public.studenthood_passport_revoke_share(uuid) to authenticated;
 then raise exception 'Invalid share';end if;
 if not exists(select 1 from public.studenthood_experience_flags where feature_key='passport' and enabled)
   then return '{}'::jsonb;end if;
 if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   or coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)<18
 then raise exception 'Share unavailable';end if;
 select jsonb_build_object('title',e.title,'entry_type',e.entry_type,'assurance',e.assurance,
   'issued_at',e.issued_at,'status',e.status) into record
 from public.studenthood_passport_share_grants g
 join public.studenthood_passport_entries e on e.id=g.entry_id
 where g.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
   and g.revoked_at is null and g.expires_at>now()
   and e.status='active' and not public.studenthood_interaction_blocked(me,e.owner_id);
 return coalesce(record,'{}'::jsonb);
end;
$function$;
revoke all on function public.studenthood_passport_read_share(text) from public,anon;
grant execute on function public.studenthood_passport_read_share(text) to authenticated;

create or replace function public.studenthood_passport_revoke_share(p_share_id uuid)
returns boolean language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 update public.studenthood_passport_share_grants set revoked_at=now()
  where id=p_share_id and owner_id=auth.uid() and revoked_at is null;
 return found;
end;
$function$;
revoke all on function public.studenthood_passport_revoke_share(uuid) from public,anon;
grant execute on function public.studenthood_passport_revoke_share(uuid) to authenticated;
