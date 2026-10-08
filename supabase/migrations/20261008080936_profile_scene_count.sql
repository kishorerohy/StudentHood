-- Applied to StudentHood production 2026-10-08.
-- Count only the authenticated user's own active Scenes.
create or replace function public.studenthood_my_scene_count()
returns bigint language sql stable security definer
set search_path='public','pg_catalog'
as $$
 select count(*)::bigint from public.scenes s
 where s.author_id=auth.uid()
   and s.moderation_status<>'removed'
   and coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false);
$$;
revoke all on function public.studenthood_my_scene_count() from public,anon;
grant execute on function public.studenthood_my_scene_count() to authenticated;
