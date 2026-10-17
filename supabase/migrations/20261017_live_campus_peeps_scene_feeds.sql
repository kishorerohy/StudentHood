-- Correction #26-33: strictly scoped same-institution discovery and new-first campus/Peeps Scenes.
-- Preserve existing privacy, youth, block, access, RLS, and moderation checks.
-- Chennai/Kunrattur is a known same-metro alias, not unrestricted city mixing.
CREATE OR REPLACE FUNCTION public.studenthood_same_campus_name(p_viewer_id uuid, p_author_id uuid, p_scene_campus_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
 select coalesce((
   select public.studenthood_campus_label_key(v.campus_name)<>''
      and public.studenthood_campus_label_key(v.campus_name)=public.studenthood_campus_label_key(p_scene_campus_name)
      and public.studenthood_campus_label_key(a.campus_name)=public.studenthood_campus_label_key(p_scene_campus_name)
      and (nullif(btrim(v.country_code),'') is null or nullif(btrim(a.country_code),'') is null
           or upper(btrim(v.country_code))=upper(btrim(a.country_code)))
      and (nullif(btrim(v.city),'') is null or nullif(btrim(a.city),'') is null
           or (public.studenthood_campus_label_key(v.city)=public.studenthood_campus_label_key(a.city)
                or (public.studenthood_campus_label_key(v.city) in ('chennai','kunrattur','kundrathur','kundrattur')
                    and public.studenthood_campus_label_key(a.city) in ('chennai','kunrattur','kundrathur','kundrattur'))))
   from public.profiles v
   join public.profiles a on a.id=p_author_id
   where v.id=p_viewer_id
 ),false);
$function$;

CREATE OR REPLACE FUNCTION public.studenthood_can_discover_profile(p_target_user uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_catalog'
AS $function$
    declare
      viewer public.profiles%rowtype;
      target public.profiles%rowtype;
      viewer_age_ctx jsonb;
      target_age_ctx jsonb;
      viewer_youth boolean;
      target_youth boolean;
      connected boolean;
    begin
          IF public.studenthood_interaction_blocked(auth.uid(),p_target_user) THEN RETURN false; END IF;
if auth.uid() is null or p_target_user is null then return false; end if;
      if auth.uid()=p_target_user then return true; end if;

      select * into viewer from public.profiles where id=auth.uid();
      select * into target from public.profiles where id=p_target_user;

      if viewer.id is null or target.id is null then return false; end if;

      viewer_age_ctx:=private.studenthood_age_context(auth.uid());
      target_age_ctx:=private.studenthood_age_context(p_target_user);

      if coalesce((viewer_age_ctx->>'ready')::boolean,false) is not true
         or coalesce((target_age_ctx->>'ready')::boolean,false) is not true then
        return false;
      end if;

      viewer_youth:=coalesce((viewer_age_ctx->>'youth_account')::boolean,false);
      target_youth:=coalesce((target_age_ctx->>'youth_account')::boolean,false);
      connected:=public.studenthood_are_peeps(auth.uid(),p_target_user);

      if connected then return true; end if;

      if target_youth and not viewer_youth then
        return false;
      end if;

      if target.profile_visibility='private' or target_youth then
        return false;
      end if;

      if target.profile_visibility='campus' then
        return viewer.campus_name is not null
          and target.campus_name is not null
          and public.studenthood_same_campus_name(viewer.id,target.id,target.campus_name);
      end if;

      return target.profile_visibility='public';
    end;
    $function$;

CREATE OR REPLACE FUNCTION public.studenthood_scene_feed(p_filter text DEFAULT 'for_you'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, author_id uuid, author_name text, author_username text, author_avatar_url text, author_campus_name text, body text, media_url text, media_type text, content_class text, visibility text, created_at timestamp with time zone, like_count bigint, comment_count bigint, liked_by_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
      and (
        s.author_id=auth.uid()
        or (viewer.campus_name is not null
          and s.campus_name is not null
          and public.studenthood_same_campus_name(viewer.id,s.author_id,s.campus_name))
        or (normalized_filter='campus'
          and public.studenthood_are_peeps(auth.uid(),s.author_id))
      )
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
$function$;

-- Enable realtime only for tables that already have viewer-scoped SELECT RLS policies.
-- Profiles are intentionally excluded: they include private DOB/guardian fields.
do $migration$
begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$migration$;
do $migration$
declare name text;
begin
  foreach name in array array['scenes','hangs','gigs','peep_connections','studenthood_ping_threads','studenthood_ping_text_messages','ping_scene_shares']
  loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=name) then
      execute format('alter publication supabase_realtime add table public.%I',name);
    end if;
  end loop;
end
$migration$;
