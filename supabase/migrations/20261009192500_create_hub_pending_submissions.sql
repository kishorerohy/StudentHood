-- StudentHood Create Hub: owner-only pending submissions.
-- STAGED MIGRATION: do not apply in production until reviewed and approved.
-- Pending submissions are not published or discoverable. No acceptance or
-- verification status can be set by clients; no user can edit age/guardian data.

CREATE OR REPLACE FUNCTION public.studenthood_set_submission_campus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE p public.profiles%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
  IF p.id IS NULL OR p.onboarding_completed IS NOT TRUE OR p.campus_name IS NULL
  THEN RAISE EXCEPTION 'Complete your student profile before creating'; END IF;
  NEW.campus_name := p.campus_name;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.pulse_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus_name text NOT NULL,
  body text,
  media_path text,
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text','image','video')),
  visibility text NOT NULL DEFAULT 'peeps' CHECK (visibility IN ('peeps','campus')),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT pulse_body_length CHECK (char_length(coalesce(body,''))<=500),
  CONSTRAINT pulse_needs_content CHECK (nullif(btrim(coalesce(body,'')),'') IS NOT NULL OR media_path IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.hangs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus_name text NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 100),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  category text NOT NULL CHECK (category IN ('Social','Study','Sports','Culture','Other')),
  starts_at timestamptz NOT NULL,
  location_hint text NOT NULL CHECK (char_length(btrim(location_hint)) BETWEEN 3 AND 120),
  visibility text NOT NULL DEFAULT 'campus' CHECK (visibility IN ('campus','peeps')),
  capacity integer CHECK (capacity BETWEEN 2 AND 1000),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus_name text NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 80),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 1500),
  category text NOT NULL CHECK (category IN ('Study','Arts','Tech','Sports','Other')),
  visibility text NOT NULL DEFAULT 'campus' CHECK (visibility IN ('campus','invite_only')),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campus_name text NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 100),
  employer_name text NOT NULL CHECK (char_length(btrim(employer_name)) BETWEEN 2 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 2500),
  category text NOT NULL CHECK (category IN ('Part-time','Internship','Campus','Remote','Other')),
  location_hint text NOT NULL CHECK (char_length(btrim(location_hint)) BETWEEN 2 AND 120),
  pay_amount numeric(12,2) NOT NULL CHECK (pay_amount>0),
  pay_currency text NOT NULL CHECK (pay_currency ~ '^[A-Z]{3}$'),
  pay_unit text NOT NULL CHECK (pay_unit IN ('hour','day','project')),
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.pulse_entries,public.hangs,public.crews,public.gigs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.pulse_entries,public.hangs,public.crews,public.gigs TO authenticated;
ALTER TABLE public.pulse_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER assign_pulse_campus BEFORE INSERT ON public.pulse_entries
 FOR EACH ROW EXECUTE FUNCTION public.studenthood_set_submission_campus();
CREATE TRIGGER assign_hang_campus BEFORE INSERT ON public.hangs
 FOR EACH ROW EXECUTE FUNCTION public.studenthood_set_submission_campus();
CREATE TRIGGER assign_crew_campus BEFORE INSERT ON public.crews
 FOR EACH ROW EXECUTE FUNCTION public.studenthood_set_submission_campus();
CREATE TRIGGER assign_gig_campus BEFORE INSERT ON public.gigs
 FOR EACH ROW EXECUTE FUNCTION public.studenthood_set_submission_campus();

CREATE POLICY "Owner sees their own Pulse submissions" ON public.pulse_entries FOR SELECT TO authenticated
 USING (author_id=(SELECT auth.uid()));
CREATE POLICY "Owner submits pending Pulse" ON public.pulse_entries FOR INSERT TO authenticated
 WITH CHECK (author_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
 AND expires_at BETWEEN now()+interval '23 hours' AND now()+interval '25 hours');
CREATE POLICY "Owner deletes own Pulse" ON public.pulse_entries FOR DELETE TO authenticated
 USING (author_id=(SELECT auth.uid()));

CREATE POLICY "Owner sees their own Hangs" ON public.hangs FOR SELECT TO authenticated
 USING (creator_id=(SELECT auth.uid()));
CREATE POLICY "Owner submits pending Hangs" ON public.hangs FOR INSERT TO authenticated
 WITH CHECK (creator_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND starts_at>now() AND starts_at<now()+interval '366 days'
 AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false));
CREATE POLICY "Owner deletes own Hangs" ON public.hangs FOR DELETE TO authenticated
 USING (creator_id=(SELECT auth.uid()));

CREATE POLICY "Owner sees their own Crews" ON public.crews FOR SELECT TO authenticated
 USING (creator_id=(SELECT auth.uid()));
CREATE POLICY "Owner submits pending Crews" ON public.crews FOR INSERT TO authenticated
 WITH CHECK (creator_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false));
CREATE POLICY "Owner deletes own Crews" ON public.crews FOR DELETE TO authenticated
 USING (creator_id=(SELECT auth.uid()));

CREATE POLICY "Owner sees their own Gigs" ON public.gigs FOR SELECT TO authenticated
 USING (creator_id=(SELECT auth.uid()));
CREATE POLICY "Adult submits pending Gigs" ON public.gigs FOR INSERT TO authenticated
 WITH CHECK (creator_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND coalesce((public.studenthood_access_policy()->>'app_access')::boolean,false)
 AND coalesce((public.studenthood_access_policy()->>'conservative_age')::integer,0)>=18);
CREATE POLICY "Owner deletes own Gigs" ON public.gigs FOR DELETE TO authenticated
 USING (creator_id=(SELECT auth.uid()));

-- Private Pulse media, owner-only until fully reviewed audience and moderation
-- read policies are implemented. No public bucket or signed URLs for strangers.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('pulse-media','pulse-media',false,52428800,ARRAY['image/jpeg','image/png','image/webp','video/mp4'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Owner uploads own Pulse media" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='pulse-media' AND split_part(name,'/',1)=(SELECT auth.uid())::text);
CREATE POLICY "Owner reads own Pulse media" ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='pulse-media' AND split_part(name,'/',1)=(SELECT auth.uid())::text);
CREATE POLICY "Owner deletes own Pulse media" ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='pulse-media' AND split_part(name,'/',1)=(SELECT auth.uid())::text);

-- There is intentionally NO public SELECT policy for submissions, NO employer
-- verification flag on client-owned tables, and NO fake public listing.
