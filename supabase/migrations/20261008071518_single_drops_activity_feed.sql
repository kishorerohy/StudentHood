-- Applied to Supabase production on 2026-10-08.
-- Unified, viewer-scoped Drops feed with non-message activity only.
-- Current sources: Scene likes, approved/limited Scene comments,
-- Peep requests, accepted Peep requests. Hangs/Crews/Gigs can be
-- added when those backend activity sources exist.

CREATE OR REPLACE FUNCTION public.studenthood_drops_feed(p_limit integer DEFAULT 40, p_offset integer DEFAULT 0)
 RETURNS TABLE(event_key text, activity_type text, actor_id uuid, actor_name text, target_scene_id uuid, happened_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
with activity as (
 select 'scene-like:'||r.id::text as event_key, 'scene_like'::text as activity_type, r.user_id as actor_id, s.id as target_scene_id, r.created_at as happened_at
 from public.scene_reactions r join public.scenes s on s.id=r.scene_id
 where s.author_id=auth.uid() and r.user_id<>auth.uid() and r.reaction_type='like' and s.moderation_status<>'removed'
 union all
 select 'scene-comment:'||c.id::text,'scene_comment'::text,c.user_id,s.id,c.created_at
 from public.scene_comments c join public.scenes s on s.id=c.scene_id
 where s.author_id=auth.uid() and c.user_id<>auth.uid() and c.moderation_status in ('approved','limited') and s.moderation_status<>'removed'
 union all
 select 'peep-request:'||pc.id::text,'peep_request'::text,pc.requester_id,null::uuid,pc.created_at
 from public.peep_connections pc
 where pc.addressee_id=auth.uid() and pc.requester_id<>auth.uid() and pc.status='pending'
 union all
 select 'peep-accepted:'||pc.id::text,'peep_accepted'::text,pc.addressee_id,null::uuid,pc.updated_at
 from public.peep_connections pc
 where pc.requester_id=auth.uid() and pc.addressee_id<>auth.uid() and pc.status='accepted'
)
select a.event_key,a.activity_type,
 case when public.studenthood_can_discover_profile(a.actor_id) then a.actor_id else null::uuid end,
 case when public.studenthood_can_discover_profile(a.actor_id) then coalesce(nullif(btrim(p.full_name),''),p.username,'A student') else 'A student' end,
 a.target_scene_id,a.happened_at
from activity a left join public.profiles p on p.id=a.actor_id
where auth.uid() is not null
 and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
order by a.happened_at desc,a.event_key desc
limit least(greatest(coalesce(p_limit,40),1),100)
offset greatest(coalesce(p_offset,0),0);
$function$

revoke all on function public.studenthood_drops_feed(integer,integer) from public,anon;
grant execute on function public.studenthood_drops_feed(integer,integer) to authenticated;
