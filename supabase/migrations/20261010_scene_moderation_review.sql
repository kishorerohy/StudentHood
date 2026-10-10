-- Explicit human moderation. No automatic publishing of pending Scenes.
-- Reviewer role must be assigned by a trusted Supabase administrator to an
-- independently verified adult through auth app_metadata, never user_metadata.
create or replace function public.studenthood_is_scene_moderator()
returns boolean language sql stable security definer
set search_path=public,private,pg_catalog as $$
 select auth.uid() is not null
   and coalesce(auth.jwt() #>> '{app_metadata,studenthood_moderator}','false')='true'
   and coalesce((private.studenthood_age_context(auth.uid())->>'ready')::boolean,false)
   and not coalesce((private.studenthood_age_context(auth.uid())->>'youth_account')::boolean,true)
   and coalesce((private.studenthood_age_context(auth.uid())->>'adult_access_verified')::boolean,false);
$$;
revoke all on function public.studenthood_is_scene_moderator() from public,anon;
grant execute on function public.studenthood_is_scene_moderator() to authenticated;

create table if not exists private.studenthood_scene_moderation_audit (
 id bigint generated always as identity primary key,
 scene_id uuid not null references public.scenes(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id),
 from_status text not null,
 to_status text not null,
 reviewed_at timestamptz not null default now()
);
alter table private.studenthood_scene_moderation_audit enable row level security;
revoke all on private.studenthood_scene_moderation_audit from public,anon,authenticated;

drop policy if exists "Approved adult moderators may review Scene media" on storage.objects;
create policy "Approved adult moderators may review Scene media"
 on storage.objects for select to authenticated
 using (bucket_id='scene-media' and public.studenthood_is_scene_moderator());

create or replace function public.studenthood_scene_moderation_queue(p_limit integer default 40)
returns table(id uuid,author_id uuid,body text,media_url text,media_type text,content_class text,created_at timestamptz)
language plpgsql stable security definer set search_path=public,private,pg_catalog as $$
begin
 if not public.studenthood_is_scene_moderator() then
  raise exception 'Not authorized to review Scenes';
 end if;
 return query select s.id,s.author_id,s.body,s.media_url,s.media_type,
                     s.content_class,s.created_at
 from public.scenes s
 where s.moderation_status='pending'
 order by s.created_at asc
 limit least(greatest(coalesce(p_limit,40),1),60);
end
$$;
revoke all on function public.studenthood_scene_moderation_queue(integer) from public,anon;
grant execute on function public.studenthood_scene_moderation_queue(integer) to authenticated;

create or replace function public.studenthood_review_scene(p_scene_id uuid,p_decision text)
returns boolean language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare item public.scenes%rowtype;
begin
 if not public.studenthood_is_scene_moderator() then
  raise exception 'Not authorized to review Scenes';
 end if;
 if p_decision not in ('approved','limited','removed') then
  raise exception 'Invalid moderation decision';
 end if;
 select * into item from public.scenes where id=p_scene_id for update;
 if item.id is null or item.moderation_status<>'pending' then
  raise exception 'This Scene is no longer pending review';
 end if;
 update public.scenes set moderation_status=p_decision where id=p_scene_id;
 insert into private.studenthood_scene_moderation_audit
 (scene_id,reviewer_id,from_status,to_status)
 values(item.id,auth.uid(),item.moderation_status,p_decision);
 return true;
end
$$;
revoke all on function public.studenthood_review_scene(uuid,text) from public,anon;
grant execute on function public.studenthood_review_scene(uuid,text) to authenticated;
