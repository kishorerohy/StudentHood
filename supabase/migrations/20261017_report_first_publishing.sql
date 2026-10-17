-- StudentHood: publish user creations immediately, moderate on reports.
-- Privacy, youth/guardian access, audience scopes and removals are unchanged.
BEGIN;

-- Existing unreported pending drafts are eligible for publication. Legacy
-- support_reports contain no Scene report records as of 17 October 2026;
-- never undo existing removed/limited/rejected statuses.
ALTER TABLE public.scenes ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.scene_comments ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.pulse_entries ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.hangs ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.crews ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.gigs ALTER COLUMN moderation_status SET DEFAULT 'approved';

-- Enforce the status on the server, even when a client sends stale 'pending'.
-- Authors cannot reverse moderation decisions by editing an existing Scene.
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
  NEW.campus_name:=p.campus_name;
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

-- A Scene comment is visible immediately under the Scene's privacy policy,
-- but editing cannot restore a removed/limited comment.
CREATE OR REPLACE FUNCTION public.studenthood_comment_publish_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_catalog
AS $fn$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.moderation_status:='approved';
  ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
    AND NOT public.studenthood_is_scene_moderator() THEN
    NEW.moderation_status:=OLD.moderation_status;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS studenthood_comment_publish ON public.scene_comments;
CREATE TRIGGER studenthood_comment_publish
BEFORE INSERT OR UPDATE ON public.scene_comments
FOR EACH ROW EXECUTE FUNCTION public.studenthood_comment_publish_defaults();

-- Existing unpublished posts have no legacy Scene reports (checked before
-- this migration). Preserve any legacy pending items with a linked report.
-- The new security trigger intentionally prevents non-moderator status updates;
-- disable that ONE trigger only during the data backfill, inside this transaction.
ALTER TABLE public.scenes DISABLE TRIGGER scenes_apply_safety_defaults;
UPDATE public.scenes SET moderation_status='approved'
WHERE moderation_status='pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.support_requests support
    WHERE support.category='report' AND support.message LIKE '%'||public.scenes.id::text||'%'
  );
ALTER TABLE public.scenes ENABLE TRIGGER scenes_apply_safety_defaults;
-- Existing comments are backfilled before the new author-proof status rule
-- is reactivated; disable only this one trigger inside the transaction.
ALTER TABLE public.scene_comments DISABLE TRIGGER studenthood_comment_publish;
UPDATE public.scene_comments SET moderation_status='approved'
WHERE moderation_status='pending';
ALTER TABLE public.scene_comments ENABLE TRIGGER studenthood_comment_publish;
UPDATE public.pulse_entries SET moderation_status='approved'
WHERE moderation_status='pending';
UPDATE public.hangs SET moderation_status='approved'
WHERE moderation_status='pending';
UPDATE public.crews SET moderation_status='approved'
WHERE moderation_status='pending';
UPDATE public.gigs SET moderation_status='approved'
WHERE moderation_status='pending';

-- Restricted, human-reviewable reports are separate from content publication.
CREATE TABLE IF NOT EXISTS private.studenthood_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_kind text NOT NULL CHECK(content_kind IN ('scene','comment','pulse','hang','crew','gig')),
  content_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK(reason IN ('Inappropriate content','Harassment or bullying','Spam or scam','Other safety concern')),
  state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(content_kind,content_id,reporter_id)
);
CREATE INDEX IF NOT EXISTS studenthood_content_reports_open_idx
  ON private.studenthood_content_reports(state,created_at DESC);
ALTER TABLE private.studenthood_content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.studenthood_content_reports FROM PUBLIC,anon,authenticated;

-- Other creation types remain confined to their chosen audience. Visibility
-- of a creation is not an authorization to discover an unrelated private
-- profile or any private student information.
CREATE OR REPLACE FUNCTION public.studenthood_can_view_creation(
  p_kind text,p_creator uuid,p_campus text,p_visibility text,p_status text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  access jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_creator IS NULL THEN RETURN false; END IF;
  IF auth.uid()=p_creator THEN RETURN true; END IF;
  IF p_status<>'approved' THEN RETURN false; END IF;
  access:=public.studenthood_access_policy();
  IF NOT coalesce((access->>'app_access')::boolean,false) THEN RETURN false; END IF;
  IF NOT (public.studenthood_are_peeps(auth.uid(),p_creator)
    OR public.studenthood_can_discover_profile(p_creator)) THEN RETURN false; END IF;
  IF p_kind='gig' AND coalesce((access->>'conservative_age')::int,0)<18 THEN
    RETURN false;
  END IF;
  IF p_visibility='invite_only' THEN RETURN false; END IF;
  IF p_visibility='peeps' THEN
    RETURN public.studenthood_are_peeps(auth.uid(),p_creator);
  END IF;
  IF p_visibility='campus' THEN
    RETURN p_campus IS NOT NULL
      AND public.studenthood_same_campus_name(auth.uid(),p_creator,p_campus);
  END IF;
  RETURN false;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_can_view_creation(text,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_view_creation(text,uuid,text,text,text) TO authenticated;

-- Existing installed v0.1.9 APKs explicitly send 'pending' when
-- creating Pulse/Hangs/Crews/Gigs. Rewrite it BEFORE RLS WITH CHECK so older
-- signed-in clients can still publish rather than unexpectedly failing.
CREATE OR REPLACE FUNCTION public.studenthood_publish_creation_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
BEGIN
  NEW.moderation_status:='approved';
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS studenthood_publish_pulse ON public.pulse_entries;
CREATE TRIGGER studenthood_publish_pulse
BEFORE INSERT ON public.pulse_entries FOR EACH ROW
EXECUTE FUNCTION public.studenthood_publish_creation_defaults();
DROP TRIGGER IF EXISTS studenthood_publish_hangs ON public.hangs;
CREATE TRIGGER studenthood_publish_hangs
BEFORE INSERT ON public.hangs FOR EACH ROW
EXECUTE FUNCTION public.studenthood_publish_creation_defaults();
DROP TRIGGER IF EXISTS studenthood_publish_crews ON public.crews;
CREATE TRIGGER studenthood_publish_crews
BEFORE INSERT ON public.crews FOR EACH ROW
EXECUTE FUNCTION public.studenthood_publish_creation_defaults();
DROP TRIGGER IF EXISTS studenthood_publish_gigs ON public.gigs;
CREATE TRIGGER studenthood_publish_gigs
BEFORE INSERT ON public.gigs FOR EACH ROW
EXECUTE FUNCTION public.studenthood_publish_creation_defaults();

-- Replace stale "submit pending" policies with immediate publishing. Keep
-- all prior app-access, eligibility, future-date and age restrictions.
DROP POLICY IF EXISTS "Owner submits pending Pulse" ON public.pulse_entries;
CREATE POLICY "Eligible owner publishes Pulse" ON public.pulse_entries
FOR INSERT TO authenticated WITH CHECK (
  author_id=(SELECT auth.uid()) AND moderation_status='approved'
  AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  AND expires_at BETWEEN now()+interval '23 hours' AND now()+interval '25 hours'
);
DROP POLICY IF EXISTS "Owner submits pending Hangs" ON public.hangs;
CREATE POLICY "Eligible owner publishes Hangs" ON public.hangs
FOR INSERT TO authenticated WITH CHECK (
  creator_id=(SELECT auth.uid()) AND moderation_status='approved'
  AND starts_at>now() AND starts_at<now()+interval '366 days'
  AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
);
DROP POLICY IF EXISTS "Owner submits pending Crews" ON public.crews;
CREATE POLICY "Eligible owner publishes Crews" ON public.crews
FOR INSERT TO authenticated WITH CHECK (
  creator_id=(SELECT auth.uid()) AND moderation_status='approved'
  AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
);
DROP POLICY IF EXISTS "Adult submits pending Gigs" ON public.gigs;
CREATE POLICY "Eligible adult publishes Gigs" ON public.gigs
FOR INSERT TO authenticated WITH CHECK (
  creator_id=(SELECT auth.uid()) AND moderation_status='approved'
  AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  AND coalesce((public.studenthood_access_policy()->>'conservative_age')::int,0)>=18
);

-- Other students see only eligible, approved content in its intended
-- audience. This adds read policies; does not grant new edit access.
CREATE POLICY "Eligible peers see Pulse" ON public.pulse_entries
FOR SELECT TO authenticated USING (
  expires_at>now()
  AND public.studenthood_can_view_creation('pulse',author_id,campus_name,visibility,moderation_status)
);
CREATE POLICY "Eligible peers see Hangs" ON public.hangs
FOR SELECT TO authenticated USING (
  public.studenthood_can_view_creation('hang',creator_id,campus_name,visibility,moderation_status)
);
CREATE POLICY "Eligible peers see Crews" ON public.crews
FOR SELECT TO authenticated USING (
  public.studenthood_can_view_creation('crew',creator_id,campus_name,visibility,moderation_status)
);
CREATE POLICY "Eligible adults see Gigs" ON public.gigs
FOR SELECT TO authenticated USING (
  public.studenthood_can_view_creation('gig',creator_id,campus_name,'campus',moderation_status)
);

-- Reports can only target items currently accessible to their reporter.
-- The requester cannot report their own content or infer private items.
CREATE OR REPLACE FUNCTION public.studenthood_report_content(
  p_kind text,p_content_id uuid,p_reason text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  creator uuid;
  allowed boolean:=false;
  existing_scene uuid;
  item_status text;
BEGIN
  IF auth.uid() IS NULL
    OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
  THEN RAISE EXCEPTION 'Sign in to report content'; END IF;
  IF p_reason NOT IN ('Inappropriate content','Harassment or bullying','Spam or scam','Other safety concern')
    OR p_reason IS NULL THEN RAISE EXCEPTION 'Choose a report reason'; END IF;
  IF p_content_id IS NULL THEN RAISE EXCEPTION 'Invalid content'; END IF;

  CASE p_kind
    WHEN 'scene' THEN
      SELECT author_id INTO creator FROM public.scenes WHERE id=p_content_id;
      allowed:=public.studenthood_can_view_scene_id(p_content_id);
    WHEN 'comment' THEN
      SELECT user_id,scene_id,moderation_status
        INTO creator,existing_scene,item_status
      FROM public.scene_comments WHERE id=p_content_id;
      allowed:=item_status IN ('approved','limited')
        AND public.studenthood_can_view_scene_id(existing_scene);
    WHEN 'pulse' THEN
      SELECT author_id INTO creator FROM public.pulse_entries WHERE id=p_content_id;
      SELECT public.studenthood_can_view_creation('pulse',author_id,campus_name,visibility,moderation_status)
        AND expires_at>now() INTO allowed
      FROM public.pulse_entries WHERE id=p_content_id;
    WHEN 'hang' THEN
      SELECT creator_id INTO creator FROM public.hangs WHERE id=p_content_id;
      SELECT public.studenthood_can_view_creation('hang',creator_id,campus_name,visibility,moderation_status)
        INTO allowed FROM public.hangs WHERE id=p_content_id;
    WHEN 'crew' THEN
      SELECT creator_id INTO creator FROM public.crews WHERE id=p_content_id;
      SELECT public.studenthood_can_view_creation('crew',creator_id,campus_name,visibility,moderation_status)
        INTO allowed FROM public.crews WHERE id=p_content_id;
    WHEN 'gig' THEN
      SELECT creator_id INTO creator FROM public.gigs WHERE id=p_content_id;
      SELECT public.studenthood_can_view_creation('gig',creator_id,campus_name,'campus',moderation_status)
        INTO allowed FROM public.gigs WHERE id=p_content_id;
    ELSE RAISE EXCEPTION 'Unknown content type';
  END CASE;

  IF creator IS NULL OR creator=auth.uid() OR NOT coalesce(allowed,false)
  THEN RAISE EXCEPTION 'This content is not available to report'; END IF;

  INSERT INTO private.studenthood_content_reports(content_kind,content_id,reporter_id,reason)
  VALUES(p_kind,p_content_id,auth.uid(),p_reason)
  ON CONFLICT(content_kind,content_id,reporter_id) DO NOTHING;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_report_content(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_report_content(text,uuid,text) TO authenticated;

-- Moderator queue covers REPORTED, published Scenes, not every upload.
-- Legacy pending Scenes can still appear if any genuinely remain.
CREATE OR REPLACE FUNCTION public.studenthood_scene_moderation_queue(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,author_id uuid,body text,media_url text,
  media_type text,content_class text,created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
BEGIN
  IF NOT public.studenthood_is_scene_moderator() THEN
    RAISE EXCEPTION 'Not authorized to review Scenes';
  END IF;
  RETURN QUERY SELECT s.id,s.author_id,s.body,s.media_url,
    s.media_type,s.content_class,s.created_at
  FROM public.scenes s
  WHERE s.moderation_status='pending'
    OR (s.moderation_status IN ('approved','limited')
      AND EXISTS(SELECT 1 FROM private.studenthood_content_reports r
        WHERE r.content_kind='scene' AND r.content_id=s.id AND r.state='open'))
  ORDER BY s.created_at ASC
  LIMIT least(greatest(coalesce(p_limit,40),1),60);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.studenthood_review_scene(
  p_scene_id uuid,p_decision text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  item public.scenes%rowtype;
BEGIN
  IF NOT public.studenthood_is_scene_moderator() THEN
    RAISE EXCEPTION 'Not authorized to review Scenes'; END IF;
  IF p_decision NOT IN ('approved','limited','removed') OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Invalid moderation decision'; END IF;
  SELECT * INTO item FROM public.scenes WHERE id=p_scene_id FOR UPDATE;
  IF item.id IS NULL OR NOT(
    item.moderation_status='pending'
    OR EXISTS(SELECT 1 FROM private.studenthood_content_reports r
      WHERE r.content_kind='scene' AND r.content_id=item.id AND r.state='open')
  ) THEN RAISE EXCEPTION 'This Scene is not awaiting a report decision'; END IF;

  UPDATE public.scenes SET moderation_status=p_decision WHERE id=item.id;
  UPDATE private.studenthood_content_reports SET state='resolved',reviewed_at=now()
  WHERE content_kind='scene' AND content_id=item.id AND state='open';
  INSERT INTO private.studenthood_scene_moderation_audit
    (scene_id,reviewer_id,from_status,to_status)
  VALUES(item.id,auth.uid(),item.moderation_status,p_decision);
  RETURN true;
END;
$fn$;

-- Report-only review operations for other content types. All are
-- moderator-only, never general-user content edits or automatic removals.
CREATE OR REPLACE FUNCTION public.studenthood_content_report_queue(
  p_limit integer DEFAULT 50
) RETURNS TABLE(
  report_id uuid,content_kind text,content_id uuid,
  reason text,reported_at timestamptz,summary text
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF NOT public.studenthood_is_scene_moderator() THEN
    RAISE EXCEPTION 'Not authorized to review reports'; END IF;
  RETURN QUERY
    SELECT r.id,r.content_kind,r.content_id,r.reason,r.created_at,
      CASE r.content_kind
        WHEN 'scene' THEN (SELECT left(coalesce(s.body,'[Scene media]'),360) FROM public.scenes s WHERE s.id=r.content_id)
        WHEN 'comment' THEN (SELECT left(c.body,360) FROM public.scene_comments c WHERE c.id=r.content_id)
        WHEN 'pulse' THEN (SELECT left(coalesce(p.body,'[Pulse media: inspect securely]'),360) FROM public.pulse_entries p WHERE p.id=r.content_id)
        WHEN 'hang' THEN (SELECT left(h.title||': '||h.description,360) FROM public.hangs h WHERE h.id=r.content_id)
        WHEN 'crew' THEN (SELECT left(c.name||': '||c.description,360) FROM public.crews c WHERE c.id=r.content_id)
        WHEN 'gig' THEN (SELECT left(g.title||' / '||g.employer_name||': '||g.description,360) FROM public.gigs g WHERE g.id=r.content_id)
        ELSE '[Content no longer available]'
      END
    FROM private.studenthood_content_reports r
    WHERE r.state='open'
    ORDER BY r.created_at ASC
    LIMIT least(greatest(coalesce(p_limit,50),1),100);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_content_report_queue(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_content_report_queue(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_decide_content_report(
  p_report_id uuid,p_action text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
DECLARE
  r private.studenthood_content_reports%rowtype;
BEGIN
  IF NOT public.studenthood_is_scene_moderator() THEN
    RAISE EXCEPTION 'Not authorized to review reports'; END IF;
  IF p_action NOT IN ('keep','remove') OR p_action IS NULL THEN
    RAISE EXCEPTION 'Choose Keep or Remove'; END IF;
  SELECT * INTO r FROM private.studenthood_content_reports
  WHERE id=p_report_id AND state='open' FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Report is no longer open'; END IF;

  IF r.content_kind='scene' THEN
    PERFORM public.studenthood_review_scene(
      r.content_id,CASE WHEN p_action='keep' THEN 'approved' ELSE 'removed' END);
  ELSIF r.content_kind='comment' THEN
    UPDATE public.scene_comments
    SET moderation_status=CASE WHEN p_action='keep' THEN 'approved' ELSE 'removed' END
    WHERE id=r.content_id;
  ELSIF r.content_kind='pulse' THEN
    UPDATE public.pulse_entries
    SET moderation_status=CASE WHEN p_action='keep' THEN 'approved' ELSE 'rejected' END
    WHERE id=r.content_id;
  ELSIF r.content_kind='hang' THEN
    UPDATE public.hangs
    SET moderation_status=CASE WHEN p_action='keep' THEN 'approved' ELSE 'rejected' END
    WHERE id=r.content_id;
  ELSIF r.content_kind='crew' THEN
    UPDATE public.crews
    SET moderation_status=CASE WHEN p_action='keep' THEN 'approved' ELSE 'rejected' END
    WHERE id=r.content_id;
  ELSIF r.content_kind='gig' THEN
    UPDATE public.gigs
    SET moderation_status=CASE WHEN p_action='keep' THEN 'approved' ELSE 'rejected' END
    WHERE id=r.content_id;
  ELSE RAISE EXCEPTION 'Unknown reported content type';
  END IF;
  UPDATE private.studenthood_content_reports
    SET state='resolved',reviewed_at=now()
  WHERE content_kind=r.content_kind AND content_id=r.content_id AND state='open';
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_decide_content_report(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_decide_content_report(uuid,text) TO authenticated;

-- A visiting student may see a public/eligible profile's total number of
-- mutually accepted Peeps; never return names or relationship lists.
CREATE OR REPLACE FUNCTION public.studenthood_visible_peep_count(p_target uuid)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_target IS NULL THEN RETURN NULL; END IF;
  IF auth.uid()<>p_target
     AND NOT public.studenthood_are_peeps(auth.uid(),p_target)
     AND NOT public.studenthood_can_discover_profile(p_target) THEN RETURN NULL; END IF;
  RETURN (
    SELECT count(*)::bigint
    FROM public.peep_connections p
    WHERE p.status='accepted' AND p_target IN (p.requester_id,p.addressee_id)
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_visible_peep_count(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_visible_peep_count(uuid) TO authenticated;

COMMIT;