-- Applied to Supabase on 2026-10-07.
-- Fixes PostgreSQL ambiguity because studenthood_scene_feed returns an output
-- column named id and previously used an unqualified id in the viewer lookup.

create or replace function public.studenthood_scene_feed(
  p_filter text default 'for_you'::text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  id uuid,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar_url text,
  author_campus_name text,
  body text,
  media_url text,
  media_type text,
  content_class text,
  visibility text,
  created_at timestamptz,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language plpgsql
stable
security definer
set search_path to 'public','pg_catalog'
as $$
declare
  viewer public.profiles%rowtype;
  normalized_filter text;
  limit_value integer;
  offset_value integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false) then
    return;
  end if;

  select profile_row.*
  into viewer
  from public.profiles as profile_row
  where profile_row.id=auth.uid();

  if viewer.id is null then return; end if;

  normalized_filter:=lower(btrim(coalesce(p_filter,'for_you')));
  if normalized_filter not in ('for_you','viral','nearby','campus','live') then
    normalized_filter:='for_you';
  end if;

  limit_value:=least(greatest(coalesce(p_limit,20),1),50);
  offset_value:=greatest(coalesce(p_offset,0),0);

  return query
  select
    s.id,
    s.author_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.campus_name,
    s.body,
    s.media_url,
    s.media_type,
    s.content_class,
    s.visibility,
    s.created_at,
    (select count(*) from public.scene_reactions r
      where r.scene_id=s.id and r.reaction_type='like')::bigint,
    (select count(*) from public.scene_comments c
      where c.scene_id=s.id and c.moderation_status in ('approved','limited'))::bigint,
    exists(
      select 1 from public.scene_reactions mine
      where mine.scene_id=s.id
        and mine.user_id=auth.uid()
        and mine.reaction_type='like'
    )
  from public.scenes s
  join public.profiles p on p.id=s.author_id
  where public.studenthood_can_view_scene(
    s.author_id,s.campus_name,s.visibility,s.content_class,s.moderation_status
  )
  and (
    normalized_filter='for_you'
    or (
      normalized_filter in ('nearby','campus')
      and viewer.campus_name is not null
      and s.campus_name is not null
      and lower(viewer.campus_name)=lower(s.campus_name)
    )
    or (
      normalized_filter='live'
      and s.created_at >= now()-interval '2 hours'
    )
    or normalized_filter='viral'
  )
  order by
    case when normalized_filter='viral' then
      (select count(*) from public.scene_reactions vr where vr.scene_id=s.id)
    end desc nulls last,
    s.created_at desc
  limit limit_value offset offset_value;
end;
$$;
