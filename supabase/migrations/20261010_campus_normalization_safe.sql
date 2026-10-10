-- Normalize punctuation/spacing without treating unrelated campuses in
-- different cities or countries as one institution. No wider age/visibility.
create or replace function public.studenthood_campus_label_key(p_label text)
returns text language sql immutable set search_path=pg_catalog as $$
 select regexp_replace(lower(btrim(coalesce(p_label,''))), '[^[:alnum:]]+', '', 'g');
$$;
revoke all on function public.studenthood_campus_label_key(text) from public,anon,authenticated;

create or replace function public.studenthood_same_campus_name(p_viewer_id uuid,p_author_id uuid,p_scene_campus_name text)
returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
 select coalesce((
   select public.studenthood_campus_label_key(v.campus_name)<>''
      and public.studenthood_campus_label_key(v.campus_name)=public.studenthood_campus_label_key(p_scene_campus_name)
      and public.studenthood_campus_label_key(a.campus_name)=public.studenthood_campus_label_key(p_scene_campus_name)
      and (nullif(btrim(v.country_code),'') is null or nullif(btrim(a.country_code),'') is null
           or upper(btrim(v.country_code))=upper(btrim(a.country_code)))
      and (nullif(btrim(v.city),'') is null or nullif(btrim(a.city),'') is null
           or public.studenthood_campus_label_key(v.city)=public.studenthood_campus_label_key(a.city))
   from public.profiles v
   join public.profiles a on a.id=p_author_id
   where v.id=p_viewer_id
 ),false);
$$;
revoke all on function public.studenthood_same_campus_name(uuid,uuid,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_can_view_scene(p_author_id uuid, p_campus_name text, p_visibility text, p_content_class text, p_moderation_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_catalog'
AS $function$
    declare
      viewer public.profiles%rowtype;
      author_profile public.profiles%rowtype;
      access_policy jsonb;
      viewer_age_ctx jsonb;
      author_age_ctx jsonb;
      viewer_youth boolean;
      author_youth boolean;
      connected boolean;
    begin
      if auth.uid() is null then return false; end if;
      if auth.uid()=p_author_id then return true; end if;

      access_policy:=public.studenthood_access_policy();
      if coalesce((access_policy->>'app_access')::boolean,false) is not true then
        return false;
      end if;

      if p_moderation_status not in ('approved','limited') then return false; end if;
      if not public.studenthood_can_view_content(p_content_class) then return false; end if;

      select * into viewer from public.profiles where id=auth.uid();
      select * into author_profile from public.profiles where id=p_author_id;
      if viewer.id is null or author_profile.id is null then return false; end if;

      viewer_age_ctx:=private.studenthood_age_context(auth.uid());
      author_age_ctx:=private.studenthood_age_context(p_author_id);

      viewer_youth:=coalesce((viewer_age_ctx->>'youth_account')::boolean,false);
      author_youth:=coalesce((author_age_ctx->>'youth_account')::boolean,false);
      connected:=public.studenthood_are_peeps(auth.uid(),p_author_id);

      if not viewer_youth and author_youth and not connected then
        return false;
      end if;

      if p_visibility='peeps' then
        return connected;
      end if;

      if p_visibility='campus' then
        return viewer.campus_name is not null
          and p_campus_name is not null
          and public.studenthood_same_campus_name(viewer.id,p_author_id,p_campus_name);
      end if;

      if p_visibility='public' then
        if viewer_youth then
          return connected or (
            viewer.campus_name is not null
            and p_campus_name is not null
            and public.studenthood_same_campus_name(viewer.id,p_author_id,p_campus_name)
          );
        end if;
        return true;
      end if;

      return false;
    end;
    $function$
;
CREATE OR REPLACE FUNCTION public.studenthood_campus_peeps(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, campus_name text, city text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  viewer public.profiles%rowtype;
  limit_value integer;
  offset_value integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select profile_row.*
  into viewer
  from public.profiles as profile_row
  where profile_row.id=auth.uid();

  if viewer.id is null
     or viewer.onboarding_completed is not true
     or viewer.campus_name is null
     or btrim(viewer.campus_name)='' then
    return;
  end if;

  limit_value:=least(greatest(coalesce(p_limit,100),1),200);
  offset_value:=greatest(coalesce(p_offset,0),0);

  return query
  select
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.campus_name,
    case
      when p.location_visibility='off' or p.location_visibility='campus_only' then null
      else p.city
    end
  from public.profiles p
  where p.id<>auth.uid()
    and p.onboarding_completed is true
    and p.campus_name is not null
    and public.studenthood_same_campus_name(viewer.id,p.id,p.campus_name)
    and public.studenthood_can_discover_profile(p.id)
  order by lower(coalesce(nullif(btrim(p.full_name),''),p.username,'')), p.id
  limit limit_value offset offset_value;
end;
$function$
;
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
      and viewer.campus_name is not null
      and s.campus_name is not null
      and public.studenthood_same_campus_name(viewer.id,s.author_id,s.campus_name)
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
$function$
;
