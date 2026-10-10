-- Independent profile cover, never a recycled Scene. No public bucket.
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles drop constraint if exists profiles_cover_url_length;
alter table public.profiles add constraint profiles_cover_url_length
 check (cover_url is null or length(cover_url)<=300);
drop policy if exists "StudentHood read permitted profile covers" on storage.objects;
create policy "StudentHood read permitted profile covers"
 on storage.objects for select to authenticated
 using (bucket_id='profile-avatars'
   and exists(select 1 from public.profiles p
     where p.cover_url=storage.objects.name
       and (p.id=auth.uid()
         or public.studenthood_can_discover_profile(p.id)
         or public.studenthood_are_peeps(auth.uid(),p.id))
   )
 );
CREATE OR REPLACE FUNCTION public.studenthood_profile_card(p_target_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
    declare
      p public.profiles%rowtype;
      connected boolean;
      permitted boolean;
    begin
      if auth.uid() is null or p_target_user is null then return null; end if;

      select * into p from public.profiles where id=p_target_user;
      if p.id is null then return null; end if;

      connected:=public.studenthood_are_peeps(auth.uid(),p_target_user);
      permitted:=connected
        or auth.uid()=p_target_user
        or public.studenthood_can_discover_profile(p_target_user);

      if not permitted then return null; end if;

      return jsonb_build_object(
        'id',p.id,
        'full_name',p.full_name,
        'username',p.username,
        'avatar_url',p.avatar_url,
        'cover_url',p.cover_url,
        'bio',p.bio,
        'interests',p.interests,
        'campus_name',p.campus_name,
        'city',
          case
            when auth.uid()=p_target_user then p.city
            when p.location_visibility='off' then null
            when p.location_visibility='campus_only' then null
            else p.city
          end,
        'campus_presence',
          case
            when p.campus_presence in ('on_campus','off_campus') then p.campus_presence
            else null
          end,
        'is_peep',connected,
        'can_ping',
          case when auth.uid()=p_target_user then false
          else public.studenthood_can_ping(p_target_user) end
      );
    end;
    $function$
;
