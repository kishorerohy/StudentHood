-- StudentHood Ping v1: private one-to-one text messaging and consented
-- message requests. No blanket testing bypass; no E2EE claim.
BEGIN;

CREATE TABLE IF NOT EXISTS public.studenthood_ping_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','active','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT studenthood_ping_no_self CHECK(user_a<>user_b),
  CONSTRAINT studenthood_ping_initiator_participant CHECK(initiator_id IN (user_a,user_b)),
  CONSTRAINT studenthood_ping_pair_order CHECK(user_a::text<user_b::text),
  UNIQUE(user_a,user_b)
);
CREATE INDEX IF NOT EXISTS studenthood_ping_threads_user_a_idx ON public.studenthood_ping_threads(user_a,updated_at DESC);
CREATE INDEX IF NOT EXISTS studenthood_ping_threads_user_b_idx ON public.studenthood_ping_threads(user_b,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.studenthood_ping_text_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.studenthood_ping_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studenthood_ping_messages_thread_idx ON public.studenthood_ping_text_messages(thread_id,created_at DESC,id);

ALTER TABLE public.studenthood_ping_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studenthood_ping_text_messages ENABLE ROW LEVEL SECURITY;
-- All message reads/writes use restricted RPCs; neither table is directly
-- accessible via the anon/authenticated PostgREST roles.
REVOKE ALL ON public.studenthood_ping_threads FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.studenthood_ping_text_messages FROM PUBLIC,anon,authenticated;

-- Don't allow sending to a recipient currently restricted by guardian/age,
-- their local teen quiet hours, or platform verification. Source of truth
-- is their own verified safety state, not a sender-supplied age flag.
CREATE OR REPLACE FUNCTION public.studenthood_ping_recipient_ready(p_user uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  p public.profiles%rowtype;
  ctx jsonb;
  age_value integer;
  youth boolean;
  local_clock time;
BEGIN
  IF auth.uid() IS NULL OR p_user IS NULL THEN RETURN false; END IF;
  SELECT * INTO p FROM public.profiles WHERE id=p_user;
  IF p.id IS NULL OR p.onboarding_completed IS NOT TRUE
    OR p.date_of_birth IS NULL OR p.country_code IS NULL OR p.time_zone IS NULL
    OR p.platform_age_status='verification_required'
  THEN RETURN false; END IF;
  ctx:=private.studenthood_age_context(p_user);
  IF NOT COALESCE((ctx->>'ready')::boolean,false) THEN RETURN false; END IF;
  age_value:=(ctx->>'conservative_age')::integer;
  youth:=COALESCE((ctx->>'youth_account')::boolean,false);
  IF age_value IS NULL THEN RETURN false; END IF;
  IF upper(p.country_code)='AU' AND age_value<16 THEN RETURN false; END IF;
  IF ((upper(p.country_code)='IN' AND age_value<18)
      OR (upper(p.country_code)='US' AND age_value<13))
    AND p.guardian_consent_status IS DISTINCT FROM 'verified'
  THEN RETURN false; END IF;
  IF youth THEN
    BEGIN
      local_clock:=(now() AT TIME ZONE p.time_zone)::time;
    EXCEPTION WHEN others THEN RETURN false;
    END;
    IF local_clock>=time '19:00' OR local_clock<time '07:00' THEN RETURN false; END IF;
  END IF;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_recipient_ready(uuid) FROM PUBLIC,anon,authenticated;
-- Internal helper only; callers may not probe another student's age readiness.

CREATE OR REPLACE FUNCTION public.studenthood_ping_send(p_target uuid,p_body text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  sender uuid:=auth.uid();
  message_text text:=btrim(coalesce(p_body,''));
  a uuid;
  b uuid;
  thread public.studenthood_ping_threads%rowtype;
  connected boolean;
  existing_consent boolean;
  recipient_privacy text;
  recent_new int;
  recent_message timestamptz;
  new_message uuid;
BEGIN
  IF sender IS NULL THEN RAISE EXCEPTION 'Sign in to send a Ping'; END IF;
  IF p_target IS NULL OR p_target=sender THEN RAISE EXCEPTION 'Choose another student'; END IF;
  IF length(message_text)<1 OR length(message_text)>1500 THEN
    RAISE EXCEPTION 'Ping messages must contain 1 to 1500 characters';
  END IF;
  IF NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    OR NOT public.studenthood_ping_recipient_ready(p_target)
  THEN RAISE EXCEPTION 'Ping is not available for this student or account'; END IF;

  connected:=public.studenthood_are_peeps(sender,p_target);
  IF sender::text<p_target::text THEN a:=sender;b:=p_target;
  ELSE a:=p_target;b:=sender; END IF;

  SELECT * INTO thread FROM public.studenthood_ping_threads
  WHERE user_a=a AND user_b=b FOR UPDATE;

  -- A recipient's explicit acceptance permits a conversation even if the
  -- requester later sets "Peeps only". "None" always blocks new messages.
  SELECT ping_permissions INTO recipient_privacy FROM public.profiles
  WHERE id=p_target;
  existing_consent:=thread.id IS NOT NULL AND thread.status='active'
    AND coalesce(recipient_privacy,'none')<>'none'
    AND NOT coalesce((private.studenthood_age_context(sender)->>'youth_account')::boolean,true)
    AND NOT coalesce((private.studenthood_age_context(p_target)->>'youth_account')::boolean,true);
  IF NOT public.studenthood_can_ping(p_target) AND NOT existing_consent
  THEN RAISE EXCEPTION 'Ping is not permitted by this student'; END IF;

  IF thread.id IS NULL THEN
    -- Limit unsolicited introductions; test accounts are not exempt.
    IF NOT connected THEN
      SELECT count(*) INTO recent_new FROM public.studenthood_ping_threads
      WHERE initiator_id=sender AND created_at>now()-interval '1 hour';
      IF recent_new>=10 THEN
        RAISE EXCEPTION 'Too many new Ping requests. Try again later';
      END IF;
    END IF;
    INSERT INTO public.studenthood_ping_threads
      (user_a,user_b,initiator_id,status)
    VALUES (a,b,sender,CASE WHEN connected THEN 'active' ELSE 'pending' END)
    ON CONFLICT (user_a,user_b) DO NOTHING;
    SELECT * INTO thread FROM public.studenthood_ping_threads
    WHERE user_a=a AND user_b=b FOR UPDATE;
  END IF;
  IF thread.status='declined' THEN
    RAISE EXCEPTION 'This Ping request was declined';
  END IF;
  IF thread.status='pending' THEN
    IF thread.initiator_id<>sender THEN
      RAISE EXCEPTION 'Accept the Ping request before replying';
    END IF;
    IF EXISTS(SELECT 1 FROM public.studenthood_ping_text_messages WHERE thread_id=thread.id) THEN
      RAISE EXCEPTION 'Your Ping request is awaiting approval';
    END IF;
  END IF;

  SELECT max(created_at) INTO recent_message
  FROM public.studenthood_ping_text_messages
  WHERE thread_id=thread.id AND sender_id=sender;
  IF recent_message>now()-interval '1 second' THEN
    RAISE EXCEPTION 'Please wait a moment before sending another Ping';
  END IF;

  INSERT INTO public.studenthood_ping_text_messages(thread_id,sender_id,body)
  VALUES(thread.id,sender,message_text) RETURNING id INTO new_message;
  UPDATE public.studenthood_ping_threads SET last_message_at=now(),updated_at=now()
  WHERE id=thread.id;
  RETURN jsonb_build_object('thread_id',thread.id,'message_id',new_message,
    'status',thread.status,'is_request',thread.status='pending');
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_send(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_send(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_ping_threads_list(p_limit integer DEFAULT 60)
RETURNS TABLE (
  id uuid,other_user_id uuid,other_name text,other_username text,
  other_avatar_url text,status text,incoming_request boolean,is_peep boolean,
  last_message text,last_message_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    THEN RETURN; END IF;
  RETURN QUERY
  SELECT t.id,other.id,other.full_name,other.username,
    CASE WHEN public.studenthood_can_discover_profile(other.id)
         OR public.studenthood_are_peeps(auth.uid(),other.id)
      THEN other.avatar_url ELSE NULL END,
    t.status,t.status='pending' AND t.initiator_id<>auth.uid(),
    public.studenthood_are_peeps(auth.uid(),other.id),
    (SELECT m.body FROM public.studenthood_ping_text_messages m
      WHERE m.thread_id=t.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1),
    t.last_message_at
  FROM public.studenthood_ping_threads t
  JOIN public.profiles other ON other.id=(
    CASE WHEN t.user_a=auth.uid() THEN t.user_b ELSE t.user_a END
  )
  WHERE auth.uid() IN (t.user_a,t.user_b)
    AND t.status<>'declined'
  ORDER BY t.last_message_at DESC NULLS LAST,t.created_at DESC
  LIMIT least(greatest(coalesce(p_limit,60),1),100);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_threads_list(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_threads_list(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_ping_messages_list(
  p_thread uuid,p_limit integer DEFAULT 100
) RETURNS TABLE (
  id uuid,sender_id uuid,body text,created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.studenthood_ping_threads t
    WHERE t.id=p_thread AND auth.uid() IN (t.user_a,t.user_b) AND t.status<>'declined')
    THEN RETURN; END IF;
  -- Fetch the most recent messages, not the oldest, then render chronologically.
  RETURN QUERY
  SELECT recent.id,recent.sender_id,recent.body,recent.created_at FROM (
    SELECT m.id,m.sender_id,m.body,m.created_at
    FROM public.studenthood_ping_text_messages m
    WHERE m.thread_id=p_thread
    ORDER BY m.created_at DESC,m.id DESC
    LIMIT least(greatest(coalesce(p_limit,100),1),200)
  ) recent ORDER BY recent.created_at ASC,recent.id ASC;
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_messages_list(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_messages_list(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.studenthood_ping_request_decide(p_thread uuid,p_decision text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,private,pg_catalog
AS $fn$
DECLARE
  t public.studenthood_ping_threads%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
    THEN RAISE EXCEPTION 'Ping is unavailable for this account'; END IF;
  IF p_decision NOT IN ('accept','decline') OR p_decision IS NULL
    THEN RAISE EXCEPTION 'Choose Accept or Decline'; END IF;
  SELECT * INTO t FROM public.studenthood_ping_threads
  WHERE id=p_thread AND status='pending' AND initiator_id<>auth.uid()
    AND auth.uid() IN (user_a,user_b)
  FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'This Ping request is not pending or is not yours'; END IF;
  IF p_decision='accept' AND NOT public.studenthood_ping_recipient_ready(t.initiator_id)
    THEN RAISE EXCEPTION 'This Ping request is no longer eligible'; END IF;
  UPDATE public.studenthood_ping_threads
  SET status=CASE WHEN p_decision='accept' THEN 'active' ELSE 'declined' END,
      updated_at=now()
  WHERE id=t.id;
  RETURN jsonb_build_object('thread_id',t.id,
    'status',CASE WHEN p_decision='accept' THEN 'active' ELSE 'declined' END);
END;
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_ping_request_decide(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_ping_request_decide(uuid,text) TO authenticated;

COMMIT;