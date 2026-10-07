-- Applied to Supabase on 2026-10-07.
-- If an Auth user still exists but the matching public.profiles row was
-- removed, recreate only that authenticated user's own profile before
-- continuing age/safety onboarding.

create or replace function public.initialize_safety_profile(
  p_date_of_birth date,
  p_country_code text,
  p_time_zone text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','pg_catalog'
as $$
declare
  p public.profiles%rowtype;
  normalized_country text;
  age_years integer;
  consent_state text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_date_of_birth is null
     or p_date_of_birth < date '1900-01-01'
     or p_date_of_birth > current_date then
    raise exception 'Invalid date of birth';
  end if;

  normalized_country := upper(btrim(coalesce(p_country_code,'')));
  if normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;

  if not exists (
    select 1 from pg_timezone_names where name = p_time_zone
  ) then
    raise exception 'Invalid time zone';
  end if;

  insert into public.profiles (id,full_name)
  select
    u.id,
    nullif(
      btrim(
        coalesce(
          u.raw_user_meta_data ->> 'full_name',
          u.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  select profile_row.*
  into p
  from public.profiles as profile_row
  where profile_row.id = auth.uid()
  for update;

  if p.id is null then
    raise exception 'Profile could not be initialized';
  end if;

  if coalesce(p.onboarding_completed,false) then
    if p.date_of_birth is not null and p.date_of_birth <> p_date_of_birth then
      raise exception 'Date of birth is already set';
    end if;

    if p.country_code is not null and p.country_code <> normalized_country then
      raise exception 'Country is already set';
    end if;

    if p.time_zone is not null and p.time_zone <> p_time_zone then
      raise exception 'Time zone is already set';
    end if;
  end if;

  age_years := extract(year from age(current_date, p_date_of_birth))::integer;

  consent_state :=
    case
      when normalized_country = 'IN' and age_years < 18 then 'required'
      when normalized_country = 'US' and age_years < 13 then 'required'
      else 'not_required'
    end;

  update public.profiles
  set date_of_birth =
        case
          when coalesce(onboarding_completed,false) then coalesce(date_of_birth, p_date_of_birth)
          else p_date_of_birth
        end,
      country_code =
        case
          when coalesce(onboarding_completed,false) then coalesce(country_code, normalized_country)
          else normalized_country
        end,
      time_zone =
        case
          when coalesce(onboarding_completed,false) then coalesce(time_zone, p_time_zone)
          else p_time_zone
        end,
      time_zone_locked_at =
        case
          when coalesce(onboarding_completed,false) then coalesce(time_zone_locked_at, now())
          else now()
        end,
      guardian_consent_status =
        case
          when guardian_consent_status = 'verified' then 'verified'
          else consent_state
        end
  where id = auth.uid();

  return public.studenthood_access_policy();
end;
$$;
