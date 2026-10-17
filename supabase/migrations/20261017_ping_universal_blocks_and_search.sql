-- StudentHood: universal Ping blocks and participant-only message history/search.
-- Blocks are directional decisions but restrict interactions in BOTH directions.
-- Old thread history remains readable to its two participants.
BEGIN;

CREATE TABLE private.studenthood_ping_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id,blocked_id),
  CHECK(blocker_id<>blocked_id)
);
CREATE INDEX studenthood_ping_blocks_reverse_idx
  ON private.studenthood_ping_blocks(blocked_id,blocker_id);
ALTER TABLE private.studenthood_ping_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.studenthood_ping_blocks FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_interaction_blocked(p_a uuid,p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
  SELECT coalesce(p_a<>p_b,false) AND EXISTS (
    SELECT 1 FROM private.studenthood_ping_blocks b
    WHERE (b.blocker_id=p_a AND b.blocked_id=p_b)
       OR (b.blocker_id=p_b AND b.blocked_id=p_a)
  );
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_interaction_blocked(uuid,uuid)
FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_ping_block_status(p_target uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_target IS NULL OR auth.uid()=p_target THEN
    RAISE EXCEPTION 'Invalid Ping participant';
  END IF;
  -- Reveal only YOUR OWN blocking decision, not the other user's block status.
  RETURN jsonb_build_object('blocked_by_me',
    EXISTS(SELECT 1 FROM private.studenthood_ping_blocks b
    WHERE b.blocker_id=auth.uid() AND b.blocked_id=p_target));
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_block_status(uuid)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_block_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_ping_set_block(
  p_target uuid,p_block boolean
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_target IS NULL OR p_target=auth.uid()
    OR p_block IS NULL THEN RAISE EXCEPTION 'Invalid student to block'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target) THEN
    RAISE EXCEPTION 'Student not found'; END IF;
  IF p_block THEN
    INSERT INTO private.studenthood_ping_blocks(blocker_id,blocked_id)
    VALUES(auth.uid(),p_target) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM private.studenthood_ping_blocks
    WHERE blocker_id=auth.uid() AND blocked_id=p_target;
  END IF;
  RETURN public.studenthood_ping_block_status(p_target);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_set_block(uuid,boolean)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_set_block(uuid,boolean) TO authenticated;

-- Replace eligibility checks IN PLACE. RLS policies and other functions may
-- refer to their original function OIDs; renaming old implementations would
-- silently bypass new block gates in those existing dependent policies.
-- Replacing original functions preserves OID, grants and dependent bindings.
CREATE OR REPLACE FUNCTION public.studenthood_are_peeps(p_user_a uuid,p_user_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
  SELECT NOT public.studenthood_interaction_blocked(p_user_a,p_user_b)
    AND EXISTS(
      SELECT 1 FROM public.peep_connections pc
      WHERE pc.status='accepted' AND
        ((pc.requester_id=p_user_a AND pc.addressee_id=p_user_b)
         OR (pc.requester_id=p_user_b AND pc.addressee_id=p_user_a))
    );
$fn$;

-- Preserve ALL original age, consent, guardian, visibility and campus checks
-- rather than rewriting their lengthy behavior. Inject a single early
-- denial into the body of the EXISTING functions at migration time.
DO $migration$
DECLARE
  name text;
  definition text;
  guarded text;
  subject text;
BEGIN
  FOREACH name IN ARRAY ARRAY[
    'studenthood_can_discover_profile','studenthood_can_ping',
    'studenthood_can_view_scene'
  ] LOOP
    SELECT pg_get_functiondef(p.oid) INTO definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=name;
    IF definition IS NULL THEN RAISE EXCEPTION 'Missing eligibility function %',name; END IF;
    subject:=CASE WHEN name='studenthood_can_view_scene'
      THEN 'p_author_id' ELSE 'p_target_user' END;
    IF position('studenthood_interaction_blocked' IN definition)>0 THEN
      RAISE EXCEPTION 'Block gate already installed in %',name;
    END IF;
    guarded:=regexp_replace(definition,'([[:space:]]begin[[:space:]]+)',
      E'\\1    IF public.studenthood_interaction_blocked(auth.uid(),'
      ||subject||E') THEN RETURN false; END IF;\n',
      'i');
    IF guarded=definition THEN
      RAISE EXCEPTION 'Cannot safely update existing eligibility function %',name;
    END IF;
    EXECUTE guarded;
  END LOOP;
END;
$migration$;

-- Existing Ping send RPC has a consent branch permitting active threads.
-- A DB trigger is the final universal denial for EVERY message insertion,
-- including older APK calls, pre-existing threads and future RPCs.
CREATE FUNCTION private.studenthood_guard_blocked_ping_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
DECLARE other_user uuid;
BEGIN
  SELECT CASE WHEN t.user_a=NEW.sender_id THEN t.user_b
              WHEN t.user_b=NEW.sender_id THEN t.user_a
              ELSE NULL END
  INTO other_user
  FROM public.studenthood_ping_threads t WHERE t.id=NEW.thread_id;
  IF other_user IS NULL OR
    public.studenthood_interaction_blocked(NEW.sender_id,other_user) THEN
    RAISE EXCEPTION 'Ping is unavailable for this conversation';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER studenthood_guard_blocked_ping_message
BEFORE INSERT ON public.studenthood_ping_text_messages
FOR EACH ROW EXECUTE FUNCTION private.studenthood_guard_blocked_ping_message();

CREATE FUNCTION private.studenthood_guard_blocked_ping_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF NEW.status='active' AND OLD.status IS DISTINCT FROM 'active'
    AND public.studenthood_interaction_blocked(NEW.user_a,NEW.user_b) THEN
    RAISE EXCEPTION 'Ping request cannot be accepted';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER studenthood_guard_blocked_ping_accept
BEFORE UPDATE ON public.studenthood_ping_threads
FOR EACH ROW EXECUTE FUNCTION private.studenthood_guard_blocked_ping_accept();

CREATE FUNCTION private.studenthood_guard_blocked_peeps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF TG_OP='INSERT' THEN
    IF public.studenthood_interaction_blocked(NEW.requester_id,NEW.addressee_id) THEN
      RAISE EXCEPTION 'Peep request is not available';
    END IF;
  ELSIF NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    IF public.studenthood_interaction_blocked(NEW.requester_id,NEW.addressee_id) THEN
      RAISE EXCEPTION 'Peep request is not available';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER studenthood_guard_blocked_peeps
BEFORE INSERT OR UPDATE ON public.peep_connections
FOR EACH ROW EXECUTE FUNCTION private.studenthood_guard_blocked_peeps();

-- Search all history, not only the most recent 200. The caller must be a
-- participant in a non-declined thread and pass their app access policy.
CREATE FUNCTION public.studenthood_ping_search_messages(
  p_thread uuid,p_query text,p_limit integer DEFAULT 40,p_offset integer DEFAULT 0
) RETURNS TABLE(id uuid,sender_id uuid,body text,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
DECLARE needle text:=left(btrim(coalesce(p_query,'')),100);
BEGIN
  IF auth.uid() IS NULL OR
    NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    OR length(needle)<2 THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.studenthood_ping_threads t
    WHERE t.id=p_thread AND auth.uid() IN(t.user_a,t.user_b)
      AND t.status<>'declined') THEN RETURN; END IF;
  RETURN QUERY SELECT m.id,m.sender_id,m.body,m.created_at
  FROM public.studenthood_ping_text_messages m
  WHERE m.thread_id=p_thread AND position(lower(needle) IN lower(m.body))>0
  ORDER BY m.created_at DESC,m.id DESC
  LIMIT least(greatest(coalesce(p_limit,40),1),100)
  OFFSET least(greatest(coalesce(p_offset,0),0),5000);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_search_messages(uuid,text,integer,integer)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_search_messages(uuid,text,integer,integer)
TO authenticated;

CREATE FUNCTION public.studenthood_ping_history_page(
  p_thread uuid,p_limit integer DEFAULT 50,
  p_before_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL
) RETURNS TABLE(id uuid,sender_id uuid,body text,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL OR
    NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.studenthood_ping_threads t
    WHERE t.id=p_thread AND auth.uid() IN(t.user_a,t.user_b)
      AND t.status<>'declined') THEN RETURN; END IF;
  RETURN QUERY
  SELECT recent.id,recent.sender_id,recent.body,recent.created_at FROM (
    SELECT m.id,m.sender_id,m.body,m.created_at
    FROM public.studenthood_ping_text_messages m
    WHERE m.thread_id=p_thread
      AND (p_before_at IS NULL OR
        (m.created_at,m.id)<(p_before_at,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    ORDER BY m.created_at DESC,m.id DESC
    LIMIT least(greatest(coalesce(p_limit,50),1),100)
  ) recent ORDER BY recent.created_at ASC,recent.id ASC;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_history_page(uuid,integer,timestamptz,uuid)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_history_page(uuid,integer,timestamptz,uuid)
TO authenticated;

COMMIT;
