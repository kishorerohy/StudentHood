-- Reports are private moderator input, never visible to the reported student.
create table if not exists private.studenthood_profile_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 target_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in ('harassment','spam','impersonation','unsafe','other')),
 created_at timestamptz not null default now(),
 constraint profile_reports_not_self check(reporter_id<>target_id),
 constraint profile_reports_one_per_target unique(reporter_id,target_id)
);
alter table private.studenthood_profile_reports enable row level security;
revoke all on private.studenthood_profile_reports from public,anon,authenticated;

create or replace function public.studenthood_report_profile(p_target_user uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare inserted uuid;
begin
 if auth.uid() is null or p_target_user is null or p_target_user=auth.uid()
    or p_reason not in ('harassment','spam','impersonation','unsafe','other') then
  raise exception 'Invalid profile report';
 end if;
 if public.studenthood_profile_card(p_target_user) is null then
  raise exception 'This profile is not available for reporting';
 end if;
 if (select count(*) from private.studenthood_profile_reports
      where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=10 then
  raise exception 'Report limit reached. Try again later.';
 end if;
 insert into private.studenthood_profile_reports(reporter_id,target_id,reason)
 values(auth.uid(),p_target_user,p_reason)
 on conflict(reporter_id,target_id) do nothing returning id into inserted;
 return inserted is not null;
end
$$;
revoke all on function public.studenthood_report_profile(uuid,text) from public,anon;
grant execute on function public.studenthood_report_profile(uuid,text) to authenticated;
