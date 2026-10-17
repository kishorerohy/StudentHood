-- Prevent ordinary edits or report review from silently reassigning a Scene to the author's newly selected campus.
BEGIN;
CREATE OR REPLACE FUNCTION public.studenthood_scene_safety_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  p public.profiles%rowtype;
  ctx jsonb;
  youth boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id=NEW.author_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Profile required before posting a Scene'; END IF;
  -- Capture the campus only when creating a Scene. Ordinary edits and
  -- moderator decisions must NEVER silently re-target an old Scene's audience.
  -- An author may explicitly choose to re-share one approved campus Scene
  -- to the campus currently on their profile, after confirmation in the app.
  IF TG_OP='INSERT' THEN
    NEW.campus_name:=p.campus_name;
  ELSIF NEW.campus_name IS DISTINCT FROM OLD.campus_name
    AND auth.uid()=NEW.author_id
    AND NEW.visibility='campus'
    AND OLD.moderation_status='approved'
    AND nullif(btrim(p.campus_name),'') IS NOT NULL
    AND NEW.campus_name=p.campus_name THEN
    -- Explicit owner opt-in to current campus, checked again by trigger.
    NULL;
  ELSE
    NEW.campus_name:=OLD.campus_name;
  END IF;
  NEW.updated_at:=now();
  ctx:=private.studenthood_age_context(NEW.author_id);
  youth:=coalesce((ctx->>'youth_account')::boolean,false);
  IF youth AND NEW.visibility='public' THEN NEW.visibility:='campus'; END IF;

  IF TG_OP='INSERT' THEN
    NEW.content_class:='general';
    NEW.moderation_status:='approved';
  ELSIF NEW.body IS DISTINCT FROM OLD.body
     OR NEW.media_url IS DISTINCT FROM OLD.media_url
     OR NEW.media_type IS DISTINCT FROM OLD.media_type THEN
    NEW.content_class:=OLD.content_class;
    NEW.moderation_status:=CASE
      WHEN OLD.moderation_status IN ('removed','limited') THEN OLD.moderation_status
      ELSE 'approved' END;
  ELSE
    NEW.content_class:=OLD.content_class;
    IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
      AND public.studenthood_is_scene_moderator() THEN
      IF NEW.moderation_status NOT IN ('approved','limited','removed') THEN
        RAISE EXCEPTION 'Invalid moderation status';
      END IF;
    ELSE
      NEW.moderation_status:=OLD.moderation_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
COMMIT;
