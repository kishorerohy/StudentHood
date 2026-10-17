-- Only an opaque invalidation for permitted profile viewers. No DOB, exact location,
-- contact details or campus-presence value are sent in realtime payloads.
create table if not exists public.studenthood_presence_signals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  changed_at timestamptz not null default now()
);
alter table public.studenthood_presence_signals enable row level security;
revoke all on public.studenthood_presence_signals from public, anon, authenticated;
grant select on public.studenthood_presence_signals to authenticated;

drop policy if exists "Authorized viewers observe presence invalidation" on public.studenthood_presence_signals;
create policy "Authorized viewers observe presence invalidation"
on public.studenthood_presence_signals for select to authenticated
using (user_id=(select auth.uid())
  or (public.studenthood_can_discover_profile(user_id)
    and not public.studenthood_interaction_blocked((select auth.uid()),user_id)));

create or replace function private.studenthood_emit_presence_signal()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  insert into public.studenthood_presence_signals(user_id,changed_at)
  values (new.id,clock_timestamp())
  on conflict (user_id) do update set changed_at=excluded.changed_at;
  return new;
end;
$function$;
revoke all on function private.studenthood_emit_presence_signal() from public,anon,authenticated;

drop trigger if exists studenthood_profile_presence_changed on public.profiles;
create trigger studenthood_profile_presence_changed
after update of campus_presence,campus_name,city,profile_visibility on public.profiles
for each row
when (old.campus_presence is distinct from new.campus_presence
   or old.campus_name is distinct from new.campus_name
   or old.city is distinct from new.city
   or old.profile_visibility is distinct from new.profile_visibility)
execute function private.studenthood_emit_presence_signal();

do $migration$
begin
  if not exists(select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public' and tablename='studenthood_presence_signals') then
    alter publication supabase_realtime add table public.studenthood_presence_signals;
  end if;
end
$migration$;
