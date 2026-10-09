-- Approved 2026-10-09: voluntary campus status on authorized student profiles.
-- This is an additive JSON response change to an existing security-definer RPC.
-- No table RLS, grants, profile visibility, age rules or location policies change.
-- 'not_shared' is returned as NULL; clients render no presence badge.
-- Supabase production deployment is tracked by migration name.
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

