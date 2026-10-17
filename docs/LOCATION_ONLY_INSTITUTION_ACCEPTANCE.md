# StudentHood — Location-only institution picker, global registry behind the scenes

Status: staged in draft PR #25, Android QA required. Do not build an APK without explicit approval.

## Owner-approved experience
- NO "Nearby", "Country" or "Worldwide" selection tabs in **either onboarding or Edit Profile** institution pickers.
- StudentHood selects local schools, colleges and universities automatically from the city and verified country supplied by the device or the existing profile.
- Text input only filters the location's returned institution list. Refresh searches the same city. Do not display unfiltered worldwide institution lists in the local picker.
- A student in Chennai should see Chennai-area institutions, London sees London/GB results, Chicago sees Chicago/US results, subject to actual directory coverage and provider availability.
- When GPS is permitted, reverse geocoding supplies the country ISO code *for institution lookup*. Do NOT override the account's independent age/guardian/safety country with that code. A manually changed city invalidates old GPS coordinates.
- GPS is optional: the student can type a city and use their selected country code. A mismatched typed city/country should never be broadened silently to a different country.

## Backend
- Keep ROR global higher-education search provider and its organizational identifiers behind the scenes, not as a user-facing search tab.
- For each city/country, combine nearby mapped school/campus objects (OSM), strictly city/country matched ROR universities, and **verified** rows already present in studenthood_institution_catalog.
- Deduplicate only exact normalized name and locality; do not conflate unrelated campus sites or pretend that an organization ID is a canonical physical campus ID.
- Honor 7-day cache; merge current catalog entries even for cached responses. Preserve stale-cache and catalog-only fallback when external providers fail.
- ROR does not include all K-12 schools or all campus branches. The 17 October production catalog holds 223 verified organisation rows, all currently IN; this is not a complete worldwide catalog. Avoid "complete global list" claims.
- Do not expose any private GPS record, tokens, identities, or change Supabase RLS. The backend service-role selects only published verified directory records.

## Device acceptance
1. Profile editor in Chennai has no Nearby/Country/Worldwide tabs, no unnecessary heading; filter list and refresh work.
2. First-time onboarding picker has identical location-only design and still correctly saves selected institution.
3. Phone in London, country GB: city lookup shows only verified London/GB local results (not unrelated universities). Phone in Chicago, country US: Chicago/US results.
4. Change city or country: results refresh and no old-city GPS or old-country results get reused.
5. Search within local institutions by name. No unrestricted global results; country/global registry provider remains deployed and usable by backend.
6. Existing Indian catalog data, Chennai/Kunrattur metro aliases, cached results and fallback behaviour remain available.
7. Offline/rate-limited providers return accurate errors or proven cache/catalog records rather than fabricated schools.
8. Check approved profile, teen/guardian and privacy flows remain unchanged.
9. Verify UI on small Android devices with keyboard, accessibility labels and both themes.
10. Run required CI: single startup, universal headerless, Peep Pulse, Ping, Discover, Hang and Android bundle export.

No official EAS build submitted; strict max one official Android build per Asia/Kolkata calendar day after owner approval.
