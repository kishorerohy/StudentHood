# StudentHood correction #10 — logo landing, Scene options, See all

Date: 2026-10-09

## Reported with physical-device photos
1. An existing student saw **Set up your profile** immediately on reopening instead of the StudentHood branded landing.
2. The **•••** action at the top of a Scene did nothing.
3. **See all** in the campus people/Pulse strip did not open another screen.

## Code changes prepared in draft PR #7
### Login/launch
- Native Expo SDK 54 `expo-splash-screen` configured using **approved** StudentHood logos for light and dark mode; no logo redraw, no colours changed.
- React Native StartupScreen displays the approved theme-correct logo and 'Opening StudentHood…' while restoring the existing account.
- SessionProvider exposes `resolvedUserId` only after the appropriate user's profile and age/safety policy are fetched. Stale asynchronous profile results from a previous session are discarded.
- App root waits for `resolvedUserId` before checking `onboarding_completed`/DOB/country/timezone. Loading failure displays a branded error/retry screen, not profile setup. Auth sessions remain persisted across normal app restarts.
- **Do not bypass onboarding** for accounts whose `onboarding_completed` is truly false or whose required age/guardian records are missing. Existing complete profiles should go straight to Scenes after branded startup. Production aggregate check: some accounts are complete; incomplete accounts exist as well. Individual accounts were not identified or changed.
### Scene three dots
- The top-right three-dot menu is measured and opens a compact anchored menu in both Scene cards and full-screen viewers, independent of the media enlargement action.
- Actions: View creator profile, Share Scene (native share), Copy Scene link, Hide Scene locally (per authenticated user and persisted on device), and **Report Scene** using the existing `support_requests` safety/report flow. For the owning account: Delete my Scene with confirmation and verified owner-only Supabase delete.
- Reports use `category='report'`, report reason, opaque Scene ID and authenticated email, and only the existing INSERT-only support request privileges. No report record is exposed to other users. No fake report confirmation.
- A hidden Scene is filtered from the local feed; it is not secretly deleted, blocked globally or made invisible to other students. Deletion requires owner RLS on the server.
- No new Supabase schema or production permissions required.
### See all
- The campus people strip's **See all →** opens the full-screen **Discover > People** section showing students available to the signed-in account under existing campus privacy restrictions. Student avatars in the strip still open individual full profiles.
- Pulse creation and viewing retain their separate routes. 'See all' no longer points at the Pulse placeholder.

## Physical device QA required after explicit build authorization
- On cold launch, visually verify theme-correct StudentHood native splash and React startup logo. An existing fully configured account must open Scenes, never setup. New/incomplete profiles must still complete age/guardian and onboarding checks.
- Test forced slow/offline Supabase profile load: logo stays while fetching; errors show retry; an empty/error response does not replace saved information with an onboarding form.
- Switch accounts/sign out/sign in: no briefly exposed prior-user profile; correct age and guardian rules enforced.
- On a Scene press •••: menu opens, outside tap closes, each action has feedback. Viewer and feed both work; the menu does not cause Scene enlargement.
- Test Copy Scene link, Share, Hide Scene (persists after restart for that user), Report Scene with a reason (one actual support_requests insert), and Delete my Scene (only owner, confirmation, id removed from feed); another student must not be able to delete it.
- Tap 'See all →' and verify Discover loads real permitted campus students; row tapping opens full creator profile. Confirm empty/error states and age/campus privacy.
- Run Expo Doctor, Expo Android config introspection and Android JS export. They are code checks, not proof of native behavior.

## Release control
All changes are staged in **draft PR #7**, not merged or delivered. **No EAS APK build** without explicit owner instruction. Android native splash requires a newly approved binary before it can appear in the installed preview.
