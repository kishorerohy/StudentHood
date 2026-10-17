-- REVIEW ONLY: Crews HQ + Hangs RSVP. Requires the experiences foundation migration.
-- Never deploy without separate production migration and privacy approval.
create table if not exists public.studenthood_crew_memberships (
 crew_id uuid not null references public.crews(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','member')),
 status text not null default 'requested' check(status in ('requested','active','left','declined','removed')),
 joined_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(crew_id,user_id)
);
alter table public.studenthood_crew_memberships enable row level security;
revoke all on public.studenthood_crew_memberships from public,anon,authenticated;
grant select on public.studenthood_crew_memberships to authenticated;
drop policy if exists "Crew membership visible only to student or own Crew manager" on public.studenthood_crew_memberships;
create policy "Crew membership visible only to student or own Crew manager"
 on public.studenthood_crew_memberships for select to authenticated
 using (user_id=(select auth.uid()) or exists(
  select 1 from public.crews c where c.id=crew_id and c.creator_id=(select auth.uid())));

-- Trust the existing Crew creator, not a client-supplied role or claim.
create or replace function private.studenthood_crew_owner_membership()
returns trigger language plpgsql security definer
set search_path to pg_catalog,public
as $function$
begin
 insert into public.studenthood_crew_memberships(crew_id,user_id,role,status)
 values(new.id,new.creator_id,'owner','active')
 on conflict (crew_id,user_id) do update set role='owner',status='active';
 return new;
end;
$function$;
revoke all on function private.studenthood_crew_owner_membership() from public,anon,authenticated;
drop trigger if exists studenthood_crew_owner_membership on public.crews;
create trigger studenthood_crew_owner_membership
 after insert on public.crews for each row
 execute function private.studenthood_crew_owner_membership();
insert into public.studenthood_crew_memberships(crew_id,user_id,role,status)
select id,creator_id,'owner','active' from public.crews
on conflict (crew_id,user_id) do nothing;

create table if not exists public.studenthood_hang_rsvps (
 hang_id uuid not null references public.hangs(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null check(status in ('going','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(hang_id,user_id)
);
alter table public.studenthood_hang_rsvps enable row level security;
revoke all on public.studenthood_hang_rsvps from public,anon,authenticated;
grant select on public.studenthood_hang_rsvps to authenticated;
drop policy if exists "Hang participation only visible to attendee or organizer" on public.studenthood_hang_rsvps;
create policy "Hang participation only visible to attendee or organizer"
 on public.studenthood_hang_rsvps for select to authenticated
 using (user_id=(select auth.uid()) or exists(
  select 1 from public.hangs h where h.id=hang_id and h.creator_id=(select auth.uid())));

create table if not exists public.studenthood_crew_hangs (
 crew_id uuid not null references public.crews(id) on delete cascade,
 hang_id uuid not null references public.hangs(id) on delete cascade,
 linked_by uuid not null references public.profiles(id),
 linked_at timestamptz not null default now(),
 primary key(crew_id,hang_id)
);
alter table public.studenthood_crew_hangs enable row level security;
revoke all on public.studenthood_crew_hangs from public,anon,authenticated;
grant select on public.studenthood_crew_hangs to authenticated;
drop policy if exists "Student can view linked eligible Crew and Hang" on public.studenthood_crew_hangs;
create policy "Student can view linked eligible Crew and Hang" on public.studenthood_crew_hangs
 for select to authenticated using (
  exists(select 1 from public.crews c join public.hangs h on h.id=hang_id
   where c.id=crew_id
     and public.studenthood_can_view_creation('crew',c.creator_id,c.campus_name,c.visibility,c.moderation_status)
     and public.studenthood_can_view_creation('hang',h.creator_id,h.campus_name,h.visibility,h.moderation_status))
 );

create or replace function public.studenthood_crew_membership_action(
 p_crew_id uuid, p_action text, p_member_id uuid default null)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare
 me uuid:=auth.uid();
 c public.crews%rowtype;
 who uuid;
 previous text;
 member_count integer;
 access jsonb;
begin
 if me is null then raise exception 'Authentication required';end if;
 access:=public.studenthood_access_policy();
 if not coalesce((access->>'app_access')::boolean,false) then raise exception 'Account access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags f
    where f.feature_key='crews_hq' and f.enabled
      and (cardinality(f.allowed_campus_keys)=0 or
        public.studenthood_campus_label_key((select campus_name from public.profiles where id=me))=any(f.allowed_campus_keys)))
    then raise exception 'Crews HQ is not enabled for your campus';end if;
 select * into c from public.crews where id=p_crew_id for update;
 if c.id is null then raise exception 'Crew unavailable';end if;
 if c.moderation_status<>'approved' then raise exception 'Crew unavailable';end if;
 who:=coalesce(p_member_id,me);
 if p_action in ('join','request') then
   if who<>me then raise exception 'Cannot join for another student';end if;
   if not public.studenthood_can_view_creation('crew',c.creator_id,c.campus_name,c.visibility,c.moderation_status)
     then raise exception 'Crew not eligible for this account';end if;
   if c.visibility='invite_only' then raise exception 'Private Crew requires an invitation';end if;
   if exists(select 1 from public.studenthood_crew_memberships
     where crew_id=c.id and user_id=me and status in ('removed','declined'))
     then raise exception 'Membership is not currently available';end if;
   insert into public.studenthood_crew_memberships(crew_id,user_id,role,status,updated_at)
    values(c.id,me,'member',case when p_action='request' then 'requested' else 'active' end,now())
    on conflict (crew_id,user_id) do update
      set status=excluded.status,updated_at=now()
      where public.studenthood_crew_memberships.role<>'owner';
 elsif p_action='leave' then
   if who<>me or me=c.creator_id then raise exception 'Crew owners cannot leave without ownership transfer';end if;
   update public.studenthood_crew_memberships set status='left',updated_at=now()
      where crew_id=c.id and user_id=me and role<>'owner';
 elsif p_action in ('approve','decline','remove') then
   if me<>c.creator_id then raise exception 'Only the Crew owner can manage membership';end if;
   if who=me then raise exception 'Cannot modify owner membership';end if;
   if p_action='approve' then
     if not exists(select 1 from public.profiles p where p.id=who
        and public.studenthood_same_campus_name(me,who,c.campus_name)
        and not public.studenthood_interaction_blocked(me,who))
       then raise exception 'Member no longer eligible';end if;
     update public.studenthood_crew_memberships set status='active',updated_at=now()
       where crew_id=c.id and user_id=who and status='requested';
     if not found then raise exception 'Pending request not found';end if;
   else
     update public.studenthood_crew_memberships set
       status=case when p_action='decline' then 'declined' else 'removed' end,updated_at=now()
       where crew_id=c.id and user_id=who and role<>'owner';
     if not found then raise exception 'Crew member not found';end if;
   end if;
 else raise exception 'Unsupported Crew action';end if;
 select count(*) into member_count from public.studenthood_crew_memberships
  where crew_id=c.id and status='active';
 select status into previous from public.studenthood_crew_memberships
  where crew_id=c.id and user_id=who;
 return jsonb_build_object('status',coalesce(previous,'none'),'member_count',member_count);
end;
$function$;
revoke all on function public.studenthood_crew_membership_action(uuid,text,uuid) from public,anon;
grant execute on function public.studenthood_crew_membership_action(uuid,text,uuid) to authenticated;

-- RSVP is serialized on the Hang row to prevent capacity races.
create or replace function public.studenthood_hang_rsvp_action(p_hang_id uuid,p_join boolean)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare
 me uuid:=auth.uid();
 h public.hangs%rowtype;
 current_state text;
 attendees integer;
 access jsonb;
begin
 if me is null then raise exception 'Authentication required';end if;
 access:=public.studenthood_access_policy();
 if not coalesce((access->>'app_access')::boolean,false) then raise exception 'Account access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags f
   where f.feature_key='crews_hq' and f.enabled
     and (cardinality(f.allowed_campus_keys)=0 or
       public.studenthood_campus_label_key((select campus_name from public.profiles where id=me))=any(f.allowed_campus_keys)))
   then raise exception 'Event participation is not enabled';end if;
 select * into h from public.hangs where id=p_hang_id for update;
 if h.id is null or h.moderation_status<>'approved'
   or h.starts_at<=now() or not public.studenthood_can_view_creation('hang',h.creator_id,h.campus_name,h.visibility,h.moderation_status)
   then raise exception 'Hang not available for RSVP';end if;
 select status into current_state from public.studenthood_hang_rsvps
   where hang_id=h.id and user_id=me;
 if p_join then
   if current_state is distinct from 'going' then
     select count(*) into attendees from public.studenthood_hang_rsvps where hang_id=h.id and status='going';
     if h.capacity is not null and attendees>=h.capacity then raise exception 'This Hang is full';end if;
     insert into public.studenthood_hang_rsvps(hang_id,user_id,status,updated_at)
       values(h.id,me,'going',now())
       on conflict (hang_id,user_id) do update set status='going',updated_at=now();
   end if;
 else
   update public.studenthood_hang_rsvps set status='cancelled',updated_at=now()
     where hang_id=h.id and user_id=me and status='going';
 end if;
 select count(*) into attendees from public.studenthood_hang_rsvps where hang_id=h.id and status='going';
 return jsonb_build_object('status',case when p_join then 'going' else 'cancelled' end,
   'attendees',attendees,'capacity',h.capacity);
end;
$function$;
revoke all on function public.studenthood_hang_rsvp_action(uuid,boolean) from public,anon;
grant execute on function public.studenthood_hang_rsvp_action(uuid,boolean) to authenticated;

create or replace function public.studenthood_crew_link_hang(p_crew_id uuid,p_hang_id uuid)
returns boolean language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid();c public.crews%rowtype;h public.hangs%rowtype;
begin
 if me is null or not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    then raise exception 'Account access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags
  where feature_key='crews_hq' and enabled) then raise exception 'Crews HQ disabled';end if;
 select * into c from public.crews where id=p_crew_id;
 select * into h from public.hangs where id=p_hang_id;
 if c.id is null or h.id is null or c.creator_id<>me or h.creator_id<>me
    or c.moderation_status<>'approved' or h.moderation_status<>'approved'
    or not public.studenthood_same_campus_name(me,me,h.campus_name)
    or public.studenthood_campus_label_key(c.campus_name)<>public.studenthood_campus_label_key(h.campus_name)
    then raise exception 'Only owner may link eligible same-campus Hangs';end if;
 insert into public.studenthood_crew_hangs(crew_id,hang_id,linked_by)
 values(c.id,h.id,me) on conflict do nothing;
 return true;
end;
$function$;
revoke all on function public.studenthood_crew_link_hang(uuid,uuid) from public,anon;
grant execute on function public.studenthood_crew_link_hang(uuid,uuid) to authenticated;

-- Capacity and membership counts never expose the identities of other attendees.
create or replace function public.studenthood_hang_rsvp_status(p_hang_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid();h public.hangs%rowtype;own_status text; attendees integer;
begin
 if me is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.studenthood_experience_flags
   where feature_key='crews_hq' and enabled) then return jsonb_build_object('enabled',false);end if;
 if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
   then return jsonb_build_object('enabled',false);end if;
 select * into h from public.hangs where id=p_hang_id;
 if h.id is null or not public.studenthood_can_view_creation('hang',h.creator_id,h.campus_name,h.visibility,h.moderation_status)
   then raise exception 'Hang not available';end if;
 select status into own_status from public.studenthood_hang_rsvps
   where hang_id=p_hang_id and user_id=me;
 select count(*) into attendees from public.studenthood_hang_rsvps
   where hang_id=p_hang_id and status='going';
 return jsonb_build_object('enabled',true,'own_status',coalesce(own_status,'none'),
    'attendees',attendees,'capacity',h.capacity,'has_started',h.starts_at<=now());
end;
$function$;
revoke all on function public.studenthood_hang_rsvp_status(uuid) from public,anon;
grant execute on function public.studenthood_hang_rsvp_status(uuid) to authenticated;
