# StudentHood — City-based institution directory

Status: 9 October 2026. Mobile UI changes are in draft PR #8 and are NOT released in the APK.

## Root cause
The v0.1.7 app used the institution-search service only for nearby GPS searches. Typing a city did not trigger a university lookup. Edit Profile offered free-form university text instead of an institution list. There was no institution city cache or complete university registry.

## Work completed
- Extended authenticated Supabase institution-search Edge Function from v1 to v2. It accepts city and two-letter country code, geocodes a city using public Nominatim and retrieves mapped school, college and university places through Overpass. The original GPS coordinate API remains supported for older APKs.
- Deployed a private institution_city_cache table (7-day cache) and a global Nominatim request reservation table (one request about every 1.1 seconds). The cache doesn't store user IDs or precise device location.
- Added a city lookup function to the mobile API with no GPS requirement. A city search happens when the user opens or retries the institution selector, not automatically on each keystroke.
- Onboarding now searches city and selected country; changing city clears stale campus choices and cached on-device list.
- Edit Profile now provides an explicit city-specific dropdown and searchable list. Selecting a result populates the existing campus field and goes through the existing secured save flow.
- Kept safety age checks and campus discovery permissions unchanged.

## Limitations and planned future work
OpenStreetMap is not a complete global university dictionary. Some campuses will not be mapped, names can vary, and city bounds may omit distant institutions. Further work is needed for a canonical worldwide institution registry with stable IDs and aliases rather than comparing campus names only.

## Test matrix (not yet device-verified)
1. Test several cities in different countries with Location/GPS permission denied.
2. Test wrong city spelling, empty city, provider errors, cached results, and retry.
3. Change city and ensure an institution from the previous city isn't silently retained.
4. Search and choose institutions during onboarding and Edit Profile, then Save/reopen.
5. Check the selector and bottom Edit Profile fields above Android Gboard and alternative keyboards.
6. Verify authenticated Edge Function city lookup and compatibility with older coordinate-based v0.1.7 calls.
7. Confirm duplicate OSM entries are reasonably suppressed but do not claim canonical worldwide dedup.
8. PR #8 remains draft/unmerged. No additional APK submission on 9 October 2026.
