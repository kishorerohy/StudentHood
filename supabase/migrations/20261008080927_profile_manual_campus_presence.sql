-- Applied to StudentHood production 2026-10-08.
-- Campus status is voluntary and never derived from precise location.
alter table public.profiles
  add column if not exists campus_presence text not null default 'not_shared';

alter table public.profiles
  drop constraint if exists profiles_campus_presence_check;

alter table public.profiles
  add constraint profiles_campus_presence_check
  check (campus_presence in ('on_campus','off_campus','not_shared'));

comment on column public.profiles.campus_presence
  is 'Voluntary manual campus presence; never inferred from GPS';
