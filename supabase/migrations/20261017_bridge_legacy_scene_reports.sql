-- Bridge Scene reports sent by older Android APKs to the new private
-- report-first queue. The support ticket must always remain preserved.
BEGIN;

CREATE OR REPLACE FUNCTION public.studenthood_bridge_legacy_scene_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  scene_text text;
  reason_text text;
  reporter_text text;
BEGIN
  IF NEW.category IS DISTINCT FROM 'report'
    OR NEW.subject IS DISTINCT FROM 'StudentHood Scene safety report'
    OR auth.uid() IS NULL
  THEN RETURN NEW; END IF;
  scene_text:=substring(split_part(NEW.message,E'\n',1)
    from '^Scene ID: ([0-9a-fA-F-]{36})$');
  reason_text:=substring(split_part(NEW.message,E'\n',2)
    from '^Report reason: (.+)$');
  reporter_text:=substring(split_part(NEW.message,E'\n',3)
    from '^Submitted by account: ([0-9a-fA-F-]{36})$');
  IF scene_text IS NULL OR reason_text IS NULL OR reporter_text IS DISTINCT FROM auth.uid()::text
    THEN RETURN NEW; END IF;
  BEGIN
    -- The RPC checks signed-in account, permission to see the Scene, whether
    -- the reporter owns it, the accepted reason and duplicate protections.
    PERFORM public.studenthood_report_content('scene',scene_text::uuid,reason_text);
  EXCEPTION WHEN others THEN
    -- Existing support ticket MUST still succeed if the new RPC refuses this
    -- conversion; the safety staff can inspect the unchanged support ticket.
    RAISE WARNING 'StudentHood legacy report bridge failed: restricted or invalid item';
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS studenthood_bridge_legacy_scene_report
ON public.support_requests;
CREATE TRIGGER studenthood_bridge_legacy_scene_report
AFTER INSERT ON public.support_requests FOR EACH ROW
EXECUTE FUNCTION public.studenthood_bridge_legacy_scene_report();

COMMIT;
