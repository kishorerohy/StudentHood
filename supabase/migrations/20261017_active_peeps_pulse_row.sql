-- Populate Scenes Pulse rings from genuinely active Pulse posts by accepted mutual Peeps.
-- Never substitute campus student suggestions for a Pulse that does not exist.
BEGIN;
CREATE OR REPLACE FUNCTION public.studenthood_active_peeps_pulses(p_limit integer DEFAULT 16)
RETURNS TABLE(
  id uuid, author_id uuid, author_name text, author_username text,
  author_avatar_url text, body text, media_path text, media_type text,
  created_at timestamptz, expires_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog
AS $fn$
 SELECT entries.id,entries.author_id,profile.full_name,profile.username,
   profile.avatar_url,entries.body,entries.media_path,entries.media_type,
   entries.created_at,entries.expires_at
 FROM (
   SELECT DISTINCT ON (p.author_id)
     p.id,p.author_id,p.campus_name,p.visibility,p.moderation_status,
     p.body,p.media_path,p.media_type,p.created_at,p.expires_at
   FROM public.pulse_entries p
   WHERE auth.uid() IS NOT NULL
     AND p.author_id<>auth.uid()
     AND p.expires_at>now()
     AND p.moderation_status='approved'
     AND public.studenthood_are_peeps(auth.uid(),p.author_id)
     AND public.studenthood_can_view_creation(
       'pulse',p.author_id,p.campus_name,p.visibility,p.moderation_status)
   ORDER BY p.author_id,p.created_at DESC,p.id DESC
 ) entries
 JOIN public.profiles profile ON profile.id=entries.author_id
 ORDER BY entries.created_at DESC,entries.id DESC
 LIMIT least(greatest(coalesce(p_limit,16),1),30);
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_active_peeps_pulses(integer)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_active_peeps_pulses(integer)
TO authenticated;

-- Pulse media stays in its existing PRIVATE bucket. A viewer only receives
-- signed URLs for unexpired approved Pulses within the author-defined
-- audience, and (for this UI) only from mutual Peeps.
CREATE OR REPLACE FUNCTION public.studenthood_can_view_pulse_media(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_catalog
AS $fn$
 SELECT auth.uid() IS NOT NULL AND p_path IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.pulse_entries p
   WHERE p.media_path=p_path
     AND (p.author_id=auth.uid()
       OR (p.moderation_status='approved'
         AND p.expires_at>now()
         AND public.studenthood_are_peeps(auth.uid(),p.author_id)
         AND public.studenthood_can_view_creation(
           'pulse',p.author_id,p.campus_name,p.visibility,p.moderation_status)))
 );
$fn$;
REVOKE ALL ON FUNCTION public.studenthood_can_view_pulse_media(text)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studenthood_can_view_pulse_media(text)
TO authenticated;

DROP POLICY IF EXISTS "Eligible Peeps read active Pulse media" ON storage.objects;
CREATE POLICY "Eligible Peeps read active Pulse media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='pulse-media'
  AND public.studenthood_can_view_pulse_media(name));
COMMIT;
