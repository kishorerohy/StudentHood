-- Applied to Supabase as migration 20261007124243 allow_username_separators.
-- Usernames remain globally unique after lowercase normalization. The allowed
-- character set is lowercase letters, digits, underscore, dot, and hyphen.

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (
    username is null
    or (
      username = lower(username)
      and username ~ '^[a-z0-9._-]{3,24}$'
    )
  );

create or replace function public.studenthood_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare
  v_username text := lower(btrim(coalesce(p_username,'')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where p.username is not null
      and lower(p.username)=v_username
      and p.id<>auth.uid()
  );
end;
$$;

revoke all on function public.studenthood_username_available(text) from public;
revoke all on function public.studenthood_username_available(text) from anon;
grant execute on function public.studenthood_username_available(text) to authenticated;
