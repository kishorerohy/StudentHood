# StudentHood — External avatar visibility and Peep request decisions

Status: code staged, on-device retest required. Do not automatically accept real users' requests.

## Reproduction (16 Oct device screenshot)

- The student's own Profile has an uploaded photo, but another authorized viewer's visit to the profile shows only an initial.
- Incoming Peep request renders as a disabled "Request received" button with no Accept or Decline actions.
- The initial placeholder is correct for users who have not uploaded an avatar.

## Root causes

- The profile-avatars storage bucket is private; the app must create a signed URL. Old storage RLS joined profiles in the caller's context, so a permitted viewer's signing request could fail if profile row access was restricted. A narrow SECURITY DEFINER visibility helper now checks the saved avatar/cover path and authorized relationship/visibility.
- UserProfileScreen and DiscoverPeoplePanel detected inbound requests but disabled the control.
- The old table UPDATE policy permitted requester or addressee to update connections. The new recipient-only RPC handles incoming pending requests, while direct table UPDATE grants are revoked.

## QA gates

1. Only the recipient can accept or decline pending Peeps; requester/unrelated accounts cannot decide them.
2. Declined requests cannot be reused; duplicate/stale decisions return a safe error.
3. Accepted Peeps update the mutual relation on both devices; Ping and Scene rules are unchanged.
4. Private avatars/covers remain inaccessible to unauthorized viewers, teens are not exposed by global discovery, and permitted adult/student photos are visible with valid signed URLs.
5. Incoming Peep requests are actionable in Drops (non-message activity), Discover cards and visited profiles. Ping remains for messages and Ping requests, not friendship notifications.
6. Test real Android profiles with and without avatars, both themes, across two users, with valid sign-in and safety/guardian state.
7. Verify action feedback, persistence after reload, stale requests and denied permissions.
8. Never approve actual pending requests in production as a test. Obtain explicit build approval; consolidate one official EAS Android submission per Asia/Kolkata calendar day with dependent PRs.

## Scope

Migration: supabase/migrations/20261016_peep_recipient_decisions_and_profile_media.sql
Mobile API: mobile/src/api.js
Screens: UserProfileScreen, TopHubScreen, DiscoverPeoplePanel.
