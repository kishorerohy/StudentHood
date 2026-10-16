-- StudentHood: request-recipient Peep decisions and privacy-scoped avatar access.
-- Additive except tightening Peep UPDATE to a recipient-only RPC.
-- Existing pending Peep connections and account profiles remain unchanged.
BEGIN;

-- Only the addressed student may decide an existing pending Peep request.
-- Requests remain pending until explicitly accepted/declined by the recipient.
DROP POLICY IF EXISTS "Users can update their own Peep connections" ON public.peep_connections;
REVOKE UPDATE ON public.peep_connections FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_respond_to_peep_request(
  p_connection_id uuid, p_decision text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  decided public.peep_connections%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_decision NOT IN ('accept','decline') OR p_decision IS NULL THEN
    RAISE EXCEPTION 'Choose Accept or Decline';
  END IF;
  IF NOT COALESCE((public.studenthood_access_policy()->>'app_access')::boolean,false) THEN
    RAISE EXCEPTION 'Your StudentHood account cannot respond to Peep requests right now';
  END IF;
  UPDATE public.peep_connections
    SET status=CASE WHEN p_decision='accept' THEN 'accepted' ELSE 'declined' END,
        updated_at=now()
  WHERE id=p_connection_id
    AND addressee_id=auth.uid()
    AND status='pending'
  RETURNING * INTO decided;
  IF decided.id IS NULL THEN
    RAISE EXCEPTION 'This incoming Peep request is no longer pending or is not yours';
  END IF;
  RETURN jsonb_build_object(
    'id',decided.id,
    'requester_id',decided.requester_id,
    'addressee_id',decided.addressee_id,
    'status',decided.status
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.studenthood_respond_to_peep_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studenthood_respond_to_peep_request(uuid,text) TO authenticated;

-- Recipient-only request overview for Drops. Initiating a request makes the
-- sender's name and username visible to that recipient (never to everyone).
-- The server does not divulge dates of birth, student emails, or private city.
CREATE OR REPLACE FUNCTION public.studenthood_incoming_peep_requests(
  p_limit integer DEFAULT 25
) RETURNS TABLE (
  id uuid,
  requester_id uuid,
  requester_name text,
  requester_username text,
  requester_avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT pc.id,pc.requester_id,p.full_name,p.username,
    CASE WHEN public.studenthood_can_discover_profile(p.id)
      OR public.studenthood_are_peeps(auth.uid(),p.id)
      THEN p.avatar_url ELSE NULL END,
    pc.created_at
  FROM public.peep_connections pc
  INNER JOIN public.profiles p ON p.id=pc.requester_id
  WHERE pc.addressee_id=auth.uid()
    AND pc.status='pending'
    AND p.onboarding_completed IS TRUE
  ORDER BY pc.created_at DESC
  LIMIT least(greatest(coalesce(p_limit,25),1),50);
END;
$function$;
REVOKE ALL ON FUNCTION public.studenthood_incoming_peep_requests(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studenthood_incoming_peep_requests(integer) TO authenticated;

-- Ownership alone doesn't allow another student to read private photo files.
-- Existing storage-object policies joined RLS-filtered profiles in an
-- invoker context; resolve the narrow visibility test with a helper that
-- safely reads profiles under SECURITY DEFINER without exposing their rows.
CREATE OR REPLACE FUNCTION public.studenthood_can_view_profile_media(
  p_object_path text,
  p_is_cover boolean DEFAULT false
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND p_object_path IS NOT NULL
    AND EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE (CASE WHEN p_is_cover THEN p.cover_url ELSE p.avatar_url END)=p_object_path
        AND (
          p.id=auth.uid()
          OR public.studenthood_can_discover_profile(p.id)
          OR public.studenthood_are_peeps(auth.uid(),p.id)
        )
    );
$function$;
REVOKE ALL ON FUNCTION public.studenthood_can_view_profile_media(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_view_profile_media(text,boolean) TO authenticated;

DROP POLICY IF EXISTS "StudentHood view permitted avatar" ON storage.objects;
CREATE POLICY "StudentHood view permitted avatar" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='profile-avatars'
  AND public.studenthood_can_view_profile_media(name,false)
);
DROP POLICY IF EXISTS "StudentHood read permitted profile covers" ON storage.objects;
CREATE POLICY "StudentHood read permitted profile covers" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='profile-avatars'
  AND public.studenthood_can_view_profile_media(name,true)
);
COMMIT;
