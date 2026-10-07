-- Applied to Supabase on 2026-10-07.
-- Normalize every username to lowercase before the existing global
-- case-insensitive unique index evaluates it.

create or replace function public.studenthood_normalize_username()
returns trigger
language plpgsql
security invoker
set search_path = 'public', 'pg_catalog'
as $$
begin
  if new.username is not null then
    new.username := lower(btrim(new.username));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_username on public.profiles;

create trigger profiles_normalize_username
before insert or update of username on public.profiles
for each row
execute function public.studenthood_normalize_username();

update public.profiles
set username = lower(btrim(username))
where username is not null
  and username is distinct from lower(btrim(username));
