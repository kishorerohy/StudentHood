-- Shared, anonymous city-level OSM institution lookup cache.
-- This table holds no user IDs and never caches device GPS coordinates.
CREATE TABLE IF NOT EXISTS public.institution_city_cache (
  lookup_key text PRIMARY KEY,
  response jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_lookup_key_length CHECK (char_length(lookup_key) BETWEEN 3 AND 160),
  CONSTRAINT institution_cache_payload_shape CHECK (jsonb_typeof(response) = 'object')
);
REVOKE ALL ON public.institution_city_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.institution_city_cache TO service_role;
ALTER TABLE public.institution_city_cache ENABLE ROW LEVEL SECURITY;

-- Coordinate requests from users are never inserted in the city cache.
-- Across all function instances this allocator reserves at most one public
-- OSMF Nominatim request per second for distinct city queries.
CREATE TABLE IF NOT EXISTS public.institution_provider_slots (
  provider text PRIMARY KEY,
  next_slot_at timestamptz NOT NULL
);
REVOKE ALL ON public.institution_provider_slots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.institution_provider_slots TO service_role;
ALTER TABLE public.institution_provider_slots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.studenthood_reserve_nominatim_slot()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE reserved_at timestamptz;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required';
  END IF;
  INSERT INTO public.institution_provider_slots(provider, next_slot_at)
  VALUES ('nominatim', clock_timestamp() + interval '1.1 seconds')
  ON CONFLICT (provider) DO UPDATE
    SET next_slot_at = greatest(
      clock_timestamp(),
      public.institution_provider_slots.next_slot_at
    ) + interval '1.1 seconds'
  RETURNING next_slot_at - interval '1.1 seconds' INTO reserved_at;
  RETURN reserved_at;
END;
$$;
REVOKE ALL ON FUNCTION public.studenthood_reserve_nominatim_slot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studenthood_reserve_nominatim_slot() TO service_role;
