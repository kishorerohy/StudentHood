create or replace function public.studenthood_share_peeps(p_limit integer default 60)
returns table(id uuid,full_name text,username text,avatar_url text,last_contact_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_catalog as $$
begin
 if auth.uid() is null or not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false) then return; end if;
 return query
 select p.id,p.full_name,p.username,p.avatar_url,
    coalesce((select max(s.created_at) from public.ping_scene_shares s
      where (s.sender_id=auth.uid() and s.recipient_id=p.id)
         or (s.recipient_id=auth.uid() and s.sender_id=p.id)),
       pc.updated_at,pc.created_at) as last_contact_at
 from public.peep_connections pc
 join public.profiles p on p.id=case when pc.requester_id=auth.uid() then pc.addressee_id else pc.requester_id end
 where pc.status='accepted'
   and (pc.requester_id=auth.uid() or pc.addressee_id=auth.uid())
   and p.onboarding_completed is true
   and public.studenthood_can_ping(p.id)
 order by last_contact_at desc nulls last,p.id
 limit least(greatest(coalesce(p_limit,60),1),100);
end $$;
revoke all on function public.studenthood_share_peeps(integer) from public,anon;
grant execute on function public.studenthood_share_peeps(integer) to authenticated;