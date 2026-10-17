# StudentHood — Scenes Pulse strip from real mutual Peeps
Status: source staged in PR #20. No new APK submission. Supabase migration and CI must pass; real devices require acceptance after a later owner-approved APK.

## Approved UX (17 October 2026)
- The Scenes page does NOT show a "Campus people" heading or "See all" link above the Pulse row. No extra heading is introduced.
- Keep the leftmost plus sign and exact label "Pulse soon", now opening the Pulse creation editor directly.
- To its right, show one ring per accepted mutual Peep who has a genuine active Pulse. Sort by their latest Pulse, newest first.
- Do not show arbitrary campus student profiles in this strip. Do not generate fake or placeholder Pulse entries. If zero mutual Peeps have posted recently, display only the plus sign.
- Pressing a Peep's Pulse opens an overlay with that Peep's Pulse and a profile affordance. Text and image Pulses display in-app. Video uses an authenticated, time-limited signed link launched in the device viewer; in-app video playback is future QA/work, not a false promise.
- Add Report Pulse with private, post-publication moderator review. Expired, removed and blocked content must not appear.
- Refresh upon pull-to-refresh, when returning after a new creation via reloadKey and every 60 seconds while the Scenes page is mounted.

## Backend and privacy
- `studenthood_active_peeps_pulses` is a SECURITY DEFINER RPC requiring authentication. It returns only the latest unexpired, approved Pulse per accepted mutual Peep, with both account policy and per-Pulse audience filtering.
- `pulse-media` remains a private Storage bucket. A per-object RLS SELECT rule allows the owner or eligible mutual Peep to sign access to one active, approved, permitted Pulse. Signatures expire after 10 minutes.
- Pulse owners can choose Peeps or Campus at creation. Campus-scoped Pulse is shown to a friend only if campus eligibility also permits it; simply being a friend does not override a stricter audience.
- The strip never contains unrelated discoverable campus profiles or details of unauthorized students. No youth, guardian, moderation or block bypass.
- Existing production has no Pulse entries at inspection time: expected state after release is only "+ Pulse soon" until a mutual Peep genuinely publishes a Pulse.

## Device acceptance
1. Without any Pulse records, only the plus circle is visible; no "Campus people", no See all, no empty fake Peep circles.
2. Create a Pulse as account A. Confirm A's mutual Peep B sees A's ring promptly, with a working content overlay, after a refresh or within 60 seconds.
3. A and B are not Peeps: no Pulse ring even if both attend the same campus.
4. A's Pulse is Campus visibility: B must satisfy its campus audience; Peeps-only visibility must not appear to strangers.
5. An active image Pulse should show signed media; a text Pulse should show text; a video Pulse can open using the device's signed URL viewer. Expired links should fail safely.
6. A's Pulse expires after 24 hours: hide it from B on refresh/polling. A new Pulse replaces the older ring.
7. Block/unblock an account and retest. No blocked user Pulse, avatar or media exposure.
8. Test underage/guardian-incomplete accounts and cross-campus accounts; no protected media leakage.
9. Pressing + opens creation directly, not a separate landing page. Posting refreshes the strip on eligible friends.
10. Report a Pulse: report enters private moderator queue without automatically removing the post. Moderator takedown hides it on next refresh.
11. Light/dark, small Android phones, landscape, network errors and both online test devices must remain usable.

## Release gate
- No new Android EAS build without explicit owner permission, at most one official Android submission per Asia/Kolkata day.
- CI is necessary but does not replace authenticated Supabase real-device acceptance.
