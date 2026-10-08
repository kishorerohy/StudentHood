-- Applied to Supabase on 2026-10-07.
-- Qualifies the viewer profile id in studenthood_campus_peeps to avoid
-- ambiguity with the function's returned id column.

create or replace function public.studenthood_campus_peeps(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  campus_name text,
  city text
)
language plpgsql
stable
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare
  viewer public.profiles%rowtype;
  limit_value integer;
  offset_value integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select profile_row.*
  into viewer
  from public.profiles as profile_row
  where profile_row.id=auth.uid();

  if viewer.id is null
     or viewer.onboarding_completed is not true
     or viewer.campus_name is null
     or btrim(viewer.campus_name)='' then
    return;
  end if;

  limit_value:=least(greatest(coalesce(p_limit,100),1),200);
  offset_value:=greatest(coalesce(p_offset,0),0);

  return query
  select
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.campus_name,
    case
      when p.location_visibility='off' or p.location_visibility='campus_only' then null
      else p.city
    end
  from public.profiles p
  where p.id<>auth.uid()
    and p.onboarding_completed is true
    and p.campus_name is not null
    and lower(btrim(p.campus_name))=lower(btrim(viewer.campus_name))
    and public.studenthood_can_discover_profile(p.id)
  order by lower(coalesce(nullif(btrim(p.full_name),''),p.username,'')), p.id
  limit limit_value offset offset_value;
end;
$$;

revoke all on function public.studenthood_campus_peeps(integer,integer) from public;
revoke all on function public.studenthood_campus_peeps(integer,integer) from anon;
grant execute on function public.studenthood_campus_peeps(integer,integer) to authenticated;
