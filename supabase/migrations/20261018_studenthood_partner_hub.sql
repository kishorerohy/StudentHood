-- REVIEW ONLY. Requires experience flag and verified employer organizations.
-- Partner verification and each campaign have separate human approval gates.
create table if not exists public.studenthood_partner_organizations(
 id uuid primary key default gen_random_uuid(),
 employer_org_id uuid not null references public.studenthood_employer_organizations(id),
 requested_by uuid not null references public.profiles(id),
 verification_status text not null default 'pending'
   check(verification_status in ('pending','verified','denied','suspended')),
 created_at timestamptz not null default now(),
 unique(employer_org_id)
);
alter table public.studenthood_partner_organizations enable row level security;
revoke all on public.studenthood_partner_organizations from public,anon,authenticated;
grant select,insert on public.studenthood_partner_organizations to authenticated;
drop policy if exists "Partner verification private to organization staff" on public.studenthood_partner_organizations;
create policy "Partner verification private to organization staff"
 on public.studenthood_partner_organizations for select to authenticated
 using(exists(select 1 from public.studenthood_employer_memberships m
   where m.employer_id=employer_org_id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy if exists "Verified employer may request distinct partnership approval" on public.studenthood_partner_organizations;
create policy "Verified employer may request distinct partnership approval"
 on public.studenthood_partner_organizations for insert to authenticated
 with check (
  requested_by=(select auth.uid()) and verification_status='pending'
  and exists(select 1 from public.studenthood_employer_organizations o
    join public.studenthood_employer_memberships m on m.employer_id=o.id
    where o.id=employer_org_id and o.verification_status='verified'
      and m.user_id=(select auth.uid()) and m.status='active')
  and exists(select 1 from public.studenthood_experience_flags
    where feature_key='partner_hub' and enabled)
  and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18
  and coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
 );
-- Operators alone update partner verification_status.

create table if not exists public.studenthood_partner_campaigns(
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.studenthood_partner_organizations(id) on delete cascade,
 created_by uuid not null references public.profiles(id),
 category text not null check(category in ('promoted_hang','crew_collaboration','offer','employer_campaign')),
 title text not null check(length(trim(title)) between 5 and 140),
 description text not null check(length(trim(description)) between 20 and 2500),
 placement text not null default 'eligible_campus' check(placement in ('eligible_campus','eligible_gigs')),
 start_at timestamptz not null,
 end_at timestamptz not null,
 approval_status text not null default 'draft'
  check(approval_status in ('draft','submitted','approved','denied','paused','completed')),
 sponsored boolean not null default true check(sponsored is true),
 quote_currency text check(quote_currency is null or quote_currency ~ '^[A-Z]{3}$'),
 quote_amount numeric(12,2) check(quote_amount is null or quote_amount>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint partner_campaign_dates check(end_at>start_at)
);
alter table public.studenthood_partner_campaigns enable row level security;
revoke all on public.studenthood_partner_campaigns from public,anon,authenticated;
grant select,insert on public.studenthood_partner_campaigns to authenticated;
drop policy if exists "Campaign drafts restricted to verified partner staff" on public.studenthood_partner_campaigns;
create policy "Campaign drafts restricted to verified partner staff"
 on public.studenthood_partner_campaigns for select to authenticated
 using(exists(select 1 from public.studenthood_partner_organizations p
    join public.studenthood_employer_memberships m on m.employer_id=p.employer_org_id
    where p.id=partner_id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy if exists "Verified partners create only unsponsored draft requests" on public.studenthood_partner_campaigns;
create policy "Verified partners create only unsponsored draft requests"
 on public.studenthood_partner_campaigns for insert to authenticated
 with check(
  created_by=(select auth.uid()) and approval_status='draft' and sponsored is true
  and quote_amount is null
  and exists(select 1 from public.studenthood_partner_organizations p
    join public.studenthood_employer_memberships m on m.employer_id=p.employer_org_id
    where p.id=partner_id and p.verification_status='verified'
     and m.user_id=(select auth.uid()) and m.status='active')
  and exists(select 1 from public.studenthood_experience_flags
    where feature_key='partner_hub' and enabled)
  and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  and coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18
  and coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
);
-- There is no INSERT/UPDATE permission for a company to approve a campaign
-- or set its own quote, even if it can draft one.

create table if not exists public.studenthood_partner_campaign_daily_metrics(
 campaign_id uuid not null references public.studenthood_partner_campaigns(id) on delete cascade,
 metric_date date not null,
 impressions bigint not null default 0 check(impressions>=0),
 opt_in_clicks bigint not null default 0 check(opt_in_clicks>=0),
 redeemed bigint not null default 0 check(redeemed>=0),
 primary key(campaign_id,metric_date)
);
alter table public.studenthood_partner_campaign_daily_metrics enable row level security;
revoke all on public.studenthood_partner_campaign_daily_metrics from public,anon,authenticated;
grant select on public.studenthood_partner_campaign_daily_metrics to authenticated;
drop policy if exists "Partners see only own aggregated metrics" on public.studenthood_partner_campaign_daily_metrics;
create policy "Partners see only own aggregated metrics"
 on public.studenthood_partner_campaign_daily_metrics for select to authenticated
 using(exists(select 1 from public.studenthood_partner_campaigns c
  join public.studenthood_partner_organizations p on p.id=c.partner_id
  join public.studenthood_employer_memberships m on m.employer_id=p.employer_org_id
  where c.id=campaign_id and m.user_id=(select auth.uid()) and m.status='active'));
-- No per-user identifiers, fake attribution, event collection or ad tracking.

create or replace function public.studenthood_partner_campaign_action(p_campaign_id uuid,p_action text)
returns jsonb language plpgsql security definer
set search_path to pg_catalog,public,private
as $function$
declare me uuid:=auth.uid(); c public.studenthood_partner_campaigns%rowtype;
begin
 if me is null or not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  or coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)<18
  or not coalesce((public.studenthood_access_policy()->>'adult_access_verified')::boolean,false)
 then raise exception 'Partner access restricted';end if;
 if not exists(select 1 from public.studenthood_experience_flags
    where feature_key='partner_hub' and enabled) then raise exception 'Partner Hub disabled';end if;
 select c0.* into c from public.studenthood_partner_campaigns c0
  join public.studenthood_partner_organizations p on p.id=c0.partner_id and p.verification_status='verified'
  join public.studenthood_employer_memberships m on m.employer_id=p.employer_org_id
  where c0.id=p_campaign_id and m.user_id=me and m.status='active'
  for update of c0;
 if c.id is null then raise exception 'Campaign unavailable';end if;
 if p_action='submit' and c.approval_status='draft' then
  update public.studenthood_partner_campaigns set approval_status='submitted',updated_at=now()
   where id=c.id returning * into c;
 elsif p_action='pause' and c.approval_status='approved' then
  update public.studenthood_partner_campaigns set approval_status='paused',updated_at=now()
   where id=c.id returning * into c;
 else raise exception 'Only draft submission or approved-campaign pause is allowed';end if;
 return jsonb_build_object('id',c.id,'approval_status',c.approval_status);
end;
$function$;
revoke all on function public.studenthood_partner_campaign_action(uuid,text) from public,anon;
grant execute on function public.studenthood_partner_campaign_action(uuid,text) to authenticated;

-- A true "Sponsored" placement will require a later approved read endpoint,
-- verified compliance and adult-only targeting. This migration adds NONE.
