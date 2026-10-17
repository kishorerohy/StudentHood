-- Universal Discover profile search for eligible students (not limited to first 100 campus cards).
-- Search is scoped by the existing profile visibility, consent/age/guardian,
-- block and user-access policies for EVERY query and viewer.
BEGIN;
CREATE OR REPLACE FUNCTION public.studenthood_search_discoverable_students(
  p_query text,p_limit integer DEFAULT 30,p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,full_name text,username text,avatar_url text,campus_name text,city text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  needle text:=left(btrim(coalesce(p_query,'')),64);
BEGIN
  IF auth.uid() IS NULL
    OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    OR length(needle)<2
  THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id,p.full_name,p.username,p.avatar_url,p.campus_name,
    CASE
      WHEN p.location_visibility IN ('off','campus_only') THEN NULL
      ELSE p.city
    END
  FROM public.profiles p
  WHERE p.id<>auth.uid()
    AND p.onboarding_completed IS TRUE
    AND (
      position(lower(needle) IN lower(coalesce(p.full_name,'')))>0
      OR position(lower(needle) IN lower(coalesce(p.username,'')))>0
    )
    AND public.studenthood_can_discover_profile(p.id)
  ORDER BY
    CASE WHEN lower(coalesce(p.username,''))=lower(needle) THEN 0
      WHEN lower(coalesce(p.username,'')) LIKE lower(needle)||'%' THEN 1
      WHEN lower(coalesce(p.full_name,'')) LIKE lower(needle)||'%' THEN 2
      ELSE 3 END,
    lower(coalesce(nullif(btrim(p.full_name),''),p.username,'')),p.id
  LIMIT least(greatest(coalesce(p_limit,30),1),50)
  OFFSET least(greatest(coalesce(p_offset,0),0),500);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_search_discoverable_students(text,integer,integer)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_search_discoverable_students(text,integer,integer)
TO authenticated;
COMMIT;
