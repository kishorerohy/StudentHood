
-- Explicit Scene-link delivery inside Ping only. No general messaging, external
-- notifications, message body or Drops event is created.
create table if not exists public.ping_scene_shares (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 scene_id uuid not null references public.scenes(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint ping_scene_shares_not_self check (sender_id<>recipient_id),
 constraint ping_scene_shares_unique unique (sender_id,recipient_id,scene_id)
);
create index if not exists ping_scene_shares_recipient_latest_idx
 on public.ping_scene_shares(recipient_id,created_at desc);
create index if not exists ping_scene_shares_sender_recent_idx
 on public.ping_scene_shares(sender_id,created_at desc);
alter table public.ping_scene_shares enable row level security;
revoke all on public.ping_scene_shares from public, anon, authenticated;
grant select on public.ping_scene_shares to authenticated;
drop policy if exists "Scene shares visible only to legitimate participants" on public.ping_scene_shares;
create policy "Scene shares visible only to legitimate participants"
 on public.ping_scene_shares for select to authenticated
 using (
  (auth.uid()=sender_id or (auth.uid()=recipient_id and public.studenthood_are_peeps(sender_id,recipient_id)))
  and public.studenthood_can_view_scene_id(scene_id)
 );

create or replace function public.studenthood_send_scene_ping(p_scene_id uuid,p_recipient_id uuid)
 returns uuid language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare
 s public.scenes%rowtype;
 recipient public.profiles%rowtype;
 recipient_age jsonb;
 creator_age jsonb;
 result uuid;
begin
 if auth.uid() is null or p_scene_id is null or p_recipient_id is null
    or auth.uid()=p_recipient_id then
  raise exception 'Invalid Scene sharing request';
 end if;
 if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    or not public.studenthood_are_peeps(auth.uid(),p_recipient_id)
    or not public.studenthood_can_ping(p_recipient_id) then
  raise exception 'Sharing is restricted to eligible mutual Peeps';
 end if;
 select * into s from public.scenes where id=p_scene_id;
 select * into recipient from public.profiles where id=p_recipient_id;
 if s.id is null or recipient.id is null or recipient.onboarding_completed is not true
    or s.moderation_status<>'approved'
    or not public.studenthood_can_view_scene_id(p_scene_id) then
  raise exception 'This Scene is not available for Ping sharing';
 end if;
 recipient_age:=private.studenthood_age_context(p_recipient_id);
 creator_age:=private.studenthood_age_context(s.author_id);
 if not coalesce((recipient_age->>'ready')::boolean,false) then
  raise exception 'The recipient cannot receive Scenes at this time';
 end if;
 if coalesce((recipient_age->>'youth_account')::boolean,false)
    and s.content_class not in ('general','teen') then
  raise exception 'This Scene is restricted for the recipient';
 end if;
 if s.content_class='adult'
    and not coalesce((recipient_age->>'adult_access_verified')::boolean,false) then
  raise exception 'This Scene is restricted for the recipient';
 end if;
 if coalesce((creator_age->>'youth_account')::boolean,false)
    and not coalesce((recipient_age->>'youth_account')::boolean,false)
    and not public.studenthood_are_peeps(p_recipient_id,s.author_id) then
  raise exception 'This Scene is restricted for the recipient';
 end if;
 if s.visibility='peeps' and not public.studenthood_are_peeps(p_recipient_id,s.author_id) then
  raise exception 'Only the creator''s Peeps can receive this Scene';
 end if;
 if s.visibility='campus' and (
  recipient.campus_name is null or s.campus_name is null
  or lower(btrim(recipient.campus_name))<>lower(btrim(s.campus_name))
 ) then
  raise exception 'This Scene is restricted to its campus';
 end if;
 if (select count(*) from public.ping_scene_shares
     where sender_id=auth.uid() and created_at>now()-interval '1 hour')>=24 then
  raise exception 'Too many Scene shares. Please retry later';
 end if;
 insert into public.ping_scene_shares(sender_id,recipient_id,scene_id)
 values(auth.uid(),p_recipient_id,p_scene_id)
 on conflict (sender_id,recipient_id,scene_id)
 do update set created_at=public.ping_scene_shares.created_at
 returning id into result;
 return result;
end
$$;
revoke all on function public.studenthood_send_scene_ping(uuid,uuid) from public, anon;
grant execute on function public.studenthood_send_scene_ping(uuid,uuid) to authenticated;

create or replace function public.studenthood_ping_scene_inbox(p_limit integer default 50)
 returns table(id uuid,sender_id uuid,sender_name text,sender_username text,
   sender_avatar_url text,scene_id uuid,created_at timestamptz)
 language plpgsql stable security definer
 set search_path=public,pg_catalog as $$
begin
 if auth.uid() is null or
   not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false) then
  return;
 end if;
 return query
 select m.id,m.sender_id,p.full_name,p.username,p.avatar_url,
        m.scene_id,m.created_at
 from public.ping_scene_shares m
 join public.profiles p on p.id=m.sender_id
 where m.recipient_id=auth.uid()
   and public.studenthood_are_peeps(auth.uid(),m.sender_id)
   and public.studenthood_can_view_scene_id(m.scene_id)
 order by m.created_at desc
 limit least(greatest(coalesce(p_limit,50),1),100);
end
$$;
revoke all on function public.studenthood_ping_scene_inbox(integer) from public, anon;
grant execute on function public.studenthood_ping_scene_inbox(integer) to authenticated;
