-- Give a participant a non-specific interaction availability signal so the
-- composer is disabled for blocks in either direction. Never reveal WHICH
-- student initiated a block; the only personal flag is blocked_by_me.
BEGIN;
CREATE OR REPLACE FUNCTION public.studenthood_ping_block_status(p_target uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_target IS NULL OR auth.uid()=p_target THEN
    RAISE EXCEPTION 'Invalid Ping participant';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.studenthood_ping_threads t
    WHERE auth.uid() IN(t.user_a,t.user_b)
      AND p_target IN(t.user_a,t.user_b)
  ) AND NOT public.studenthood_can_discover_profile(p_target) THEN
    -- A block prevents discovery. No relation is revealed to a stranger.
    RAISE EXCEPTION 'Conversation is unavailable';
  END IF;
  RETURN jsonb_build_object(
    'blocked_by_me',EXISTS(
      SELECT 1 FROM private.studenthood_ping_blocks b
      WHERE b.blocker_id=auth.uid() AND b.blocked_id=p_target
    ),
    'interaction_available',
      NOT public.studenthood_interaction_blocked(auth.uid(),p_target)
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_block_status(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_block_status(uuid) TO authenticated;
COMMIT;
