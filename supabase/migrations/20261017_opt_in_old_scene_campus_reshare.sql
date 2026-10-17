-- An account can explicitly choose to re-share ONE old campus Scene to
-- their current campus. No bulk or automatic audience migration on edit.
BEGIN;
CREATE OR REPLACE FUNCTION public.studenthood_move_my_scene_to_current_campus(
  p_scene_id uuid
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  current_campus text;
  changed_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_scene_id IS NULL
     OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  THEN RAISE EXCEPTION 'Campus sharing is unavailable for this account'; END IF;

  SELECT nullif(btrim(campus_name),'') INTO current_campus
  FROM public.profiles WHERE id=auth.uid() AND onboarding_completed IS TRUE;
  IF current_campus IS NULL THEN
    RAISE EXCEPTION 'Choose your campus before sharing this Scene';
  END IF;

  UPDATE public.scenes SET campus_name=current_campus
  WHERE id=p_scene_id AND author_id=auth.uid()
    AND visibility='campus'
    AND moderation_status='approved'
    AND campus_name IS DISTINCT FROM current_campus
  RETURNING id INTO changed_id;

  IF changed_id IS NULL THEN
    RAISE EXCEPTION 'This Scene is not eligible to share with your current campus';
  END IF;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_move_my_scene_to_current_campus(uuid)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_move_my_scene_to_current_campus(uuid)
TO authenticated;
COMMIT;