-- REVIEW ONLY. Never deploy without owner approval.
-- StudentHood six-experience flags and opt-in Freshers foundation.
-- No changes to existing accounts, campus data, Scenes, Gigs or guardian rules.
create table if not exists public.studenthood_experience_flags (
  feature_key text primary key check (feature_key in (
    'freshers','crews_hq','gigs_plus','passport','partner_hub','collaborations'
  )),
  enabled boolean not null default false,
  min_age integer not null default 0 check (min_age between 0 and 21),
  allowed_campus_keys text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);
alter table public.studenthood_experience_flags enable row level security;
revoke all on public.studenthood_experience_flags from public,anon,authenticated;
grant select on public.studenthood_experience_flags to authenticated;
drop policy if exists "Signed-in accounts read experience rollout flags" on public.studenthood_experience_flags;
create policy "Signed-in accounts read experience rollout flags"
 on public.studenthood_experience_flags for select to authenticated
 using ((select auth.uid()) is not null);

insert into public.studenthood_experience_flags(feature_key,min_age) values
 ('freshers',0),('crews_hq',0),('gigs_plus',18),
 ('passport',0),('partner_hub',18),('collaborations',18)
on conflict (feature_key) do nothing;

create table if not exists public.studenthood_freshers_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 opted_in boolean not null default false,
 interest_tags text[] not null default '{}'::text[],
 started_at timestamptz not null default now(),
 dismissed_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint freshers_interest_limit check (cardinality(interest_tags) <= 8),
 constraint freshers_interest_lengths check (
   array_position(interest_tags,null) is null
   and array_to_string(interest_tags,'') !~ '[<>]'
 )
);
alter table public.studenthood_freshers_preferences enable row level security;
revoke all on public.studenthood_freshers_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.studenthood_freshers_preferences to authenticated;

drop policy if exists "Freshers owner reads opt in" on public.studenthood_freshers_preferences;
create policy "Freshers owner reads opt in"
 on public.studenthood_freshers_preferences for select to authenticated
 using (user_id = (select auth.uid()));
drop policy if exists "Eligible Freshers owner starts journey" on public.studenthood_freshers_preferences;
create policy "Eligible Freshers owner starts journey"
 on public.studenthood_freshers_preferences for insert to authenticated
 with check (
  user_id=(select auth.uid())
  and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  and exists (select 1 from public.studenthood_experience_flags f
    where f.feature_key='freshers' and f.enabled
      and (cardinality(f.allowed_campus_keys)=0 or
        public.studenthood_campus_label_key((select campus_name from public.profiles where id=(select auth.uid())))
          = any(f.allowed_campus_keys)))
 );
drop policy if exists "Eligible Freshers owner changes journey" on public.studenthood_freshers_preferences;
create policy "Eligible Freshers owner changes journey"
 on public.studenthood_freshers_preferences for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid())
  and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false));
drop policy if exists "Freshers owner removes journey" on public.studenthood_freshers_preferences;
create policy "Freshers owner removes journey"
 on public.studenthood_freshers_preferences for delete to authenticated
 using (user_id=(select auth.uid()));

-- Returns only facts derived from the caller's real records.
-- No task gets marked done for simply opening a screen.
create or replace function public.studenthood_freshers_my_status()
returns jsonb language plpgsql stable security invoker
set search_path to public, pg_catalog
as $function$
declare
 me uuid := auth.uid();
 p record;
 prefs record;
 accepted_count integer := 0;
 allowed boolean := false;
 begin
  if me is null then raise exception 'Authentication required'; end if;
  select f.enabled and
       (cardinality(f.allowed_campus_keys)=0 or
        public.studenthood_campus_label_key(pr.campus_name)=any(f.allowed_campus_keys))
   into allowed
   from public.studenthood_experience_flags f
    cross join public.profiles pr
   where f.feature_key='freshers' and pr.id=me;
  if not coalesce(allowed,false) then return jsonb_build_object('enabled',false); end if;
  if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    then return jsonb_build_object('enabled',false); end if;
  select id,campus_name,interests into p from public.profiles where id=me;
  select opted_in,interest_tags,dismissed_at into prefs
    from public.studenthood_freshers_preferences where user_id=me;
  select count(*) into accepted_count from public.peep_connections
   where status='accepted' and (requester_id=me or addressee_id=me);
  return jsonb_build_object(
   'enabled',true,
   'opted_in',coalesce(prefs.opted_in,false),
   'dismissed',prefs.dismissed_at is not null,
   'campus_name',p.campus_name,
   'interest_tags',coalesce(prefs.interest_tags,'{}'::text[]),
   'tasks',jsonb_build_object(
     'choose_interests',cardinality(coalesce(p.interests,'{}'::text[]))>0
        or cardinality(coalesce(prefs.interest_tags,'{}'::text[]))>0,
     'connect_peep',accepted_count>0
   )
  );
end;
$function$;
revoke all on function public.studenthood_freshers_my_status() from public,anon;
grant execute on function public.studenthood_freshers_my_status() to authenticated;

-- Feature flags intentionally all disabled at deployment.
-- Only a reviewed, separately authorised rollout may activate specific campuses.
