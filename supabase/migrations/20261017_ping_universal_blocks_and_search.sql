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

-- Keep legacy eligibility logic intact while adding one universal block gate
-- shared by all discovery/Scene/Peeps/Ping callers. Never expose _unblocked
-- functions to client roles.
ALTER FUNCTION public.studenthood_are_peeps(uuid,uuid)
  RENAME TO studenthood_are_peeps_unblocked;
REVOKE ALL ON FUNCTION public.studenthood_are_peeps_unblocked(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.studenthood_are_peeps(p_user_a uuid,p_user_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
 SELECT NOT public.studenthood_interaction_blocked(p_user_a,p_user_b)
        AND public.studenthood_are_peeps_unblocked(p_user_a,p_user_b);
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_are_peeps(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_are_peeps(uuid,uuid) TO authenticated;

ALTER FUNCTION public.studenthood_can_discover_profile(uuid)
  RENAME TO studenthood_can_discover_profile_unblocked;
REVOKE ALL ON FUNCTION public.studenthood_can_discover_profile_unblocked(uuid)
  FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.studenthood_can_discover_profile(p_target_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
 SELECT auth.uid() IS NOT NULL
   AND NOT public.studenthood_interaction_blocked(auth.uid(),p_target_user)
   AND public.studenthood_can_discover_profile_unblocked(p_target_user);
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_can_discover_profile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_discover_profile(uuid) TO authenticated;

ALTER FUNCTION public.studenthood_can_ping(uuid)
  RENAME TO studenthood_can_ping_unblocked;
REVOKE ALL ON FUNCTION public.studenthood_can_ping_unblocked(uuid)
  FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.studenthood_can_ping(p_target_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
 SELECT auth.uid() IS NOT NULL
   AND NOT public.studenthood_interaction_blocked(auth.uid(),p_target_user)
   AND public.studenthood_can_ping_unblocked(p_target_user);
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_can_ping(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_ping(uuid) TO authenticated;

ALTER FUNCTION public.studenthood_can_view_scene(uuid,text,text,text,text)
  RENAME TO studenthood_can_view_scene_unblocked;
REVOKE ALL ON FUNCTION public.studenthood_can_view_scene_unblocked(uuid,text,text,text,text)
  FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.studenthood_can_view_scene(
  p_author_id uuid,p_campus_name text,p_visibility text,
  p_content_class text,p_moderation_status text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog AS $fn$
 SELECT auth.uid() IS NOT NULL
   AND NOT public.studenthood_interaction_blocked(auth.uid(),p_author_id)
   AND public.studenthood_can_view_scene_unblocked(
     p_author_id,p_campus_name,p_visibility,p_content_class,p_moderation_status);
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_can_view_scene(uuid,text,text,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_view_scene(uuid,text,text,text,text)
  TO authenticated;

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
  IF (TG_OP='INSERT' OR (NEW.status='accepted'
       AND OLD.status IS DISTINCT FROM 'accepted'))
    AND public.studenthood_interaction_blocked(NEW.requester_id,NEW.addressee_id)
  THEN RAISE EXCEPTION 'Peep request is not available'; END IF;
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
