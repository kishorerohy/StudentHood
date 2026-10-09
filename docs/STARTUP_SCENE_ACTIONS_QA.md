# StudentHood launch, Scene options and See all — correction batch (2026-10-09)

Status: draft PR #7, not merged, no APK build submitted.

## 1. Opening experience and existing accounts
- App first shows the **approved StudentHood logo** in light/dark theme while restoring the Supabase session, profile, age permissions, and guardian-policy state.
- It must **not** treat a still-loading or failed profile fetch as a genuinely new account. An `error` screen provides a retry action rather than redirecting to setup.
- Session context separates initial authentication readiness from `resolvedUserId`, which is set only after profile and safety policy restoration completes.
- Auth-state user changes clear any prior account's cached profile/policy. Normal app restarts retain a valid Supabase session.
- Users with `profiles.onboarding_completed=true` and valid DOB, country and timezone proceed to Scenes. **An Auth account existing alone is insufficient**: genuinely incomplete safety/onboarding records must still finish setup. Never bypass teen age/guardian restrictions.
- No login, profile details, or DOB are invented during the logo screen.

## 2. Scene three-dot menu
- The Scene feed header and full-screen viewer now provide an **anchored, tappable three-dot menu**, not a decorative icon.
- Options: View creator profile, Share Scene, Copy Scene link, Hide this Scene (locally on this device), Report Scene (other users' posts), and Delete my Scene (own posts).
- The Hide action uses account-specific AsyncStorage and filters the feed. It does not change global visibility or count as a report.
- Delete requires destructive confirmation and calls the existing owner-guarded Supabase Scene DELETE; never allow one student to delete another's Scene.
- Report presents actual reasons and inserts a report in the existing `support_requests` queue under `category='report'`; it is a request for review, not an immediate moderation decision.
- Do not include private media/signed URLs in shared links. Sharing remains subject to RLS and age/privacy restrictions.
- Test three-dot controls for both owned and other people's Scenes, and when swipe navigation is active.

## 3. See all
- The **Campus people → See all** button opens the existing full-screen Discover > People page.
- Discover displays only the campus users returned by the authorized Supabase discovery function, respecting campus, age and profile-privacy restrictions. No fake profiles.
- Distinguish from the separate Pulse entry point; See all must not simply open Pulse or remain inert.

## 4. Device checks (before release)
1. Relaunch app with valid completed account: logo appears during restore, then Scenes. No repeat onboarding; retain account and profile.
2. With genuinely unfinished new account: logo then setup with profile data and age/guardian requirements intact. Existing login alone must not skip setup.
3. Simulate network failure/profile-access failure: show retry on branded startup, not an empty/overwritten profile.
4. Scene feed and viewer: tap three dots; actions appear; Copy link, Share, Hide and Report work; owned scene Delete asks for confirmation and persists deletion.
5. Tap See all: Discover opens with real allowed students; back navigates to Scenes.
6. Confirm light/dark and smaller Android screen layouts, keyboard overlays, returning from external apps, and account switching.
7. Automated Expo Doctor, native config introspection and Android JS export are static checks, not substitutes for device QA.

## Release control
- Keep draft PR #7 unmerged. No EAS APK build until explicit owner approval.
- Installed preview APK will not receive this new UI without a later authorized native build.
