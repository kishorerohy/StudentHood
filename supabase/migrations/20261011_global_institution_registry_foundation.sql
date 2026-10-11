-- StudentHood global institution registry foundation (staged; no public data import).
-- ROR is an ORGANIZATION identity and must not silently become a physical campus.
-- Public inputs never create verified campuses or collapse two real institutions.
BEGIN;

CREATE TABLE IF NOT EXISTS public.studenthood_geo_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('geonames','overture','osm','official')),
  source_id text NOT NULL CHECK (length(source_id) BETWEEN 1 AND 180),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  kind text NOT NULL CHECK (kind IN ('country','state','district','city','town','suburb','locality','village')),
  parent_id uuid REFERENCES public.studenthood_geo_places(id) ON DELETE RESTRICT,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source,source_id)
);
CREATE INDEX IF NOT EXISTS studenthood_geo_parent_idx ON public.studenthood_geo_places(parent_id);
CREATE INDEX IF NOT EXISTS studenthood_geo_country_name_idx ON public.studenthood_geo_places(country_code,lower(name));

-- Verified source IDs are unique. Names are NOT globally unique: branch campuses
-- and distinct institutions can legitimately have the same or similar names.
CREATE TABLE IF NOT EXISTS public.studenthood_institution_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 160),
  kind text NOT NULL CHECK (kind IN ('school','college','university','research','institution')),
  entity_kind text NOT NULL CHECK (entity_kind IN ('organization','physical_campus')),
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  city text,
  area_id uuid REFERENCES public.studenthood_geo_places(id) ON DELETE SET NULL,
  parent_organization_id uuid REFERENCES public.studenthood_institution_catalog(id) ON DELETE RESTRICT,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  source text NOT NULL CHECK (source IN ('ror','overture','osm','official','reviewed')),
  source_id text NOT NULL CHECK (length(source_id) BETWEEN 2 AND 180),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source,source_id),
  CONSTRAINT studenthood_institution_no_self_parent CHECK (parent_organization_id IS NULL OR parent_organization_id <> id)
);
CREATE INDEX IF NOT EXISTS studenthood_institution_country_name_idx
  ON public.studenthood_institution_catalog (country_code,lower(display_name));
CREATE INDEX IF NOT EXISTS studenthood_institution_area_idx
  ON public.studenthood_institution_catalog (area_id);

-- A non-unique alias maps to ONE verified record; an alias may be shared by
-- multiple entities, so never auto-merge on text similarity alone.
CREATE TABLE IF NOT EXISTS public.studenthood_institution_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.studenthood_institution_catalog(id) ON DELETE CASCADE,
  alias_name text NOT NULL CHECK (length(btrim(alias_name)) BETWEEN 2 AND 160),
  normalized_alias text GENERATED ALWAYS AS
    (lower(regexp_replace(btrim(alias_name),'[[:space:][:punct:]]+',' ','g'))) STORED,
  source text NOT NULL CHECK (source IN ('ror','overture','osm','official','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id,normalized_alias)
);
CREATE INDEX IF NOT EXISTS studenthood_institution_alias_search_idx
  ON public.studenthood_institution_aliases(normalized_alias);

-- Missing-school requests are quarantined for verification: no instant listing.
CREATE TABLE IF NOT EXISTS public.studenthood_missing_institution_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 3 AND 160),
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  city text NOT NULL CHECK (length(btrim(city)) BETWEEN 2 AND 90),
  optional_website text CHECK (optional_website IS NULL OR length(optional_website) <= 250),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studenthood_missing_inst_by_user_idx
  ON public.studenthood_missing_institution_requests(submitted_by,created_at DESC);

ALTER TABLE public.studenthood_geo_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studenthood_institution_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studenthood_institution_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studenthood_missing_institution_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.studenthood_geo_places FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.studenthood_institution_catalog FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.studenthood_institution_aliases FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.studenthood_missing_institution_requests FROM PUBLIC,anon,authenticated;

GRANT SELECT ON public.studenthood_geo_places TO authenticated;
GRANT SELECT ON public.studenthood_institution_catalog TO authenticated;
GRANT SELECT ON public.studenthood_institution_aliases TO authenticated;
GRANT SELECT,INSERT ON public.studenthood_missing_institution_requests TO authenticated;

CREATE POLICY "verified geo only" ON public.studenthood_geo_places
  FOR SELECT TO authenticated USING (verified);
CREATE POLICY "verified institutions only" ON public.studenthood_institution_catalog
  FOR SELECT TO authenticated USING (verification_status='verified');
CREATE POLICY "aliases for verified entities only" ON public.studenthood_institution_aliases
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.studenthood_institution_catalog c
            WHERE c.id=institution_id AND c.verification_status='verified')
  );
CREATE POLICY "read own institution suggestions" ON public.studenthood_missing_institution_requests
  FOR SELECT TO authenticated USING (submitted_by=(SELECT auth.uid()));
CREATE POLICY "submit own institution suggestions" ON public.studenthood_missing_institution_requests
  FOR INSERT TO authenticated WITH CHECK (submitted_by=(SELECT auth.uid()) AND status='pending');

-- Campus profile FK/linking will be a separate, reviewed migration once
-- verified *physical campus* IDs are populated and real account linking QA passes.
COMMIT;
