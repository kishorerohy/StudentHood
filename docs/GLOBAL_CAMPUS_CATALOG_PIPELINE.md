# StudentHood: Global campus catalogue data pipeline (implementation gates)

**Status (11 Oct 2026):** RLS schema applied to production, and **223 source-identified ROR academic organizations in India** seeded from verified cached provider records. **Zero verified physical campus records**. This is not a completed worldwide campus directory. Owner explicitly requires schools, colleges, universities and real campus-level dedup, not just ROR parent organizations.

## Data layers (do not conflate)

1. **Geographic place**: country, region, district, city, suburb/locality, with source geographical ID and a parent hierarchy; Kunrattur/Kundrathur is a locality in the wider Chennai metro, not an independent institution city.
2. **Academic organization**: parent university, school organization, education board or institute, with source ROR/official organization ID. This is NOT inherently a physical campus.
3. **Physical campus**: actual named school/college/university site. Use spatial coordinates, verified postal locality, provider POI IDs and official campus site references; link to parent organization when objectively verified.
4. **Alias**: multiple spellings/names that refer to the exact same geographic area or academic identity. Never auto-merge distinct campuses because names are identical.
5. **Missing campus suggestion**: quarantined, reviewable request (not an instant, public addition). Limit spam and expose no student's private details.

## Recommended imported datasets

- **Research Organization Registry (ROR)**: organization identities, searchable by name/country via ROR v2 API and downloadable full registry. Useful for higher-ed/research. NOT comprehensive for primary/secondary schools or sites. https://ror.readme.io/docs/rest-api
- **Overture Maps Places**: global geospatial points of interest, including education-related categories, with GERS UUIDs, coordinates, names, and category metadata. Stream by geographic bounding box/category using DuckDB/GeoParquet. Official catalog: https://docs.overturemaps.org/getting-data/cloud-sources/
- **Overture Maps Divisions**: country/region/city/neighborhood hierarchies; regional completeness is not guaranteed. https://docs.overturemaps.org/guides/divisions/
- **Regional official institution directories**: government education registries where licenses and identifiers permit importing; cross-check for false/missing mapped campuses.
- **OSM**: supplementary educational POI features, preferably via a licensed batch extraction or dedicated managed endpoint rather than hammering public Overpass/Nominatim APIs.

## ETL ingestion sequence

1. Record release version, source URL, license, attribution requirements, and ingestion timestamp.
2. Extract geography and education POIs in **bounded regional batches** (e.g., Indian states / UK counties / US states), not unbounded mobile API calls.
3. Reject closed/invalid/ambiguous POIs; normalize Unicode names; preserve original spellings.
4. Assign source IDs; insert/upsert unique (source, source_id) records; keep raw provenance and source confidence.
5. Spatial-join each POI to supported country/city/locality polygons, using correct geographic admin IDs.
6. Propose organization ↔ campus relations only with corroborated evidence (official domains, official addresses, government IDs); otherwise keep independent sites.
7. Resolve possible duplicates as reviewed mappings, never as automatic name-equality merges; store merge audit history.
8. Publish only **verified** campuses for canonical Peeps/Scenes grouping; pending/uncertain POIs can be displayed only if correctly labeled and not used as stable canonical IDs.
9. Make dataset sync incremental, monitor provider changes/deletions/renames, and support redirects if a verified campus merges or closes.
10. Add audited human review and anti-spam controls for missing-campus submissions.

## App/API and access boundaries

- Nearby query uses resolved city **and** child localities with a configurable radius when safely supported. Return `coverage`, geographic scope, and whether results are site-level or organization-level.
- Country and Worldwide name search should query indexed canonical catalogue first and supplement with bounded ROR names; results indicate `organization` vs `physical_campus`.
- Return stable StudentHood campus UUID only for verified physical sites; do not persist a ROR org ID as a campus site.
- On profile selection, bind to a validated physical-campus FK after migration and imports, while retaining existing `campus_name` for backward compatibility. Migrate existing names **only** when resolution is unambiguous. Otherwise request user confirmation.
- Existing age/guardian, RLS, user privacy, and approved campus-discovery rules remain authoritative. Never expose a list of students merely because the school has an ID.
- No uncontrolled provider fetches per keystroke; throttle user-initiated name searches by account and bound pages/calls.
- Explicitly distinguish 'No verified record yet' vs provider outage.

## Validation gates

- Test known schools, colleges, universities, and multi-campus universities across at least two continents, including Chennai / Kunrattur variations.
- Confirm no false city assignment, no cross-country bleed, and no duplicate canonical physical-campus IDs.
- Rehearse imports on staging; review storage, compute and external provider quotas/costs before production bulk import.
- Inspect RLS after applying additive SQL migration; never expose unverified submission rows to other users.
- Validate profile backfill, student grouping, and multiple real test users before calling campus identity complete.
- Android APK only in owner-approved consolidated release; limit one EAS submission per Asia/Kolkata calendar day.

## Release checkpoints

- **Now:** production Edge Function v7 offers explicit ROR name search (authenticated) but installed APK does not include its controls.
- **Draft PR #12:** mobile mode picker plus production-applied additive RLS schema and 223 source-identified academic organization records; not a full worldwide physical campus dataset.
- **Next:** implement a sourced physical-campus batch import job, run a controlled region pilot, and review IDs and quality before broader staged country rollouts.
- **Later:** link verified physical IDs into profiles and student grouping, with human-reviewed alias migrations.
