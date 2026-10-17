# StudentHood Android v0.2.0 · release acceptance

Owner-approved **18 October 2026 (Asia/Kolkata)** consolidation, with all PR #17–26 work including PR #21's superseding updates via #22. Main base previously v0.1.9/versionCode 10. New version v0.2.0/versionCode 11. Keep **one EAS Android APK submission per IST calendar day**, and NEVER assume GitHub CI success means an Expo APK has finished.

## Release invariants
- Application name / icon / wordmark remain approved StudentHood assets. Single branded React startup after unbranded native white window.
- All screens heading-free as approved, correct Android keyboard/safe-area behaviour and selected Hang date/time shown inside native buttons.
- Onboarding institution picker filtered by detected city/country, no global tabs. Same physical institution across recognised Chennai/Kunrattur locality alias is matched without making unrestricted global assumptions. Worldwide catalog is incomplete.
- Peep identity/avatars permission-gated, both Accept/Decline and discover search results above keyboard work with two phones.
- Ping text composer, private message requests, click recipient heading for history/search/profile/block, both-way block tests. Ping alerts live inside Ping; Drops contain only other activity.
- Scene feed: eligible new Scenes from own account, mutual Peeps, shared campus in newest-first order, maintain old content further down, no automatic deletion; moderation and youth/privacy/guardian protection remain enforced; scene sharing/reporting work.
- Pulse strip only real approved current Peeps Pulse entries; creation only central +.
- Hangs and Gigs browse approved eligible creations from OTHER users, filtered by category, sorted newest-first. No page-based create or My submissions; create Hangs/Gigs/Pulse/Scene/Crew only through +. New posts immediately published to eligible audience, with post-report review/safety still operating.
- Your cover has obvious Edit Cover control; upload independent image and verify persistence, no avatar overwrite.
- React realtime: refreshing foreground Scenes, Hangs, Gigs, Peep discovery and live campus status from eligible profiles; verify 2-device cross-account behaviour and app-resume reconnection. Never expose DOB / safety / guardian / messages outside viewer RLS.
- New original WAV chime configured for Android Ping and Drops native notification channels. **Foreground notification only staged**; closed/background push needs separate FCM/APNs token registration and service dispatch before it can be called complete.
- Profile status tracking, persistent account auth, app age restrictions, messages, moderator reporting and existing media RLS remain intact.

## Automated gates
- All mandatory `mobile/scripts/check-*.js` regression checks.
- `npx expo-doctor@latest`.
- `npx expo config --type introspect --json`.
- `npx expo export --platform android --output-dir dist`.
- Supabase production migrations `live_campus_peeps_scene_feeds` and `private_campus_presence_invalidation` applied; RLS policy and Realtime publication verified.
- Post-merge CI for exact release SHA must be successful before one EAS submission.
- The EAS `preview` profile has `distribution: internal`, Android `buildType: apk`, and authorized EXPO_TOKEN in GitHub Actions.

## Physical QA after APK finishes
Using two permitted student accounts (one with campus city Chennai, another with Kunrattur but the same institution), test Discover / Add Peep, set On Campus / Off Campus and verify other user's badge automatically changes, then publish Scenes successively from both accounts and validate newest-first without manual refresh. Send Ping messages both directions and verify notification chime/permission, Drops separation, blocking and return from app sleep. Create a Hang and a Gig from central + and confirm they appear in the *other* account's appropriate browse tab. Replace cover and check persistence after reopening. Verify underage/privacy protections separately. Unavailable content/notifications must not leak via Realtime.

## Release artifact verification
GitHub EAS workflow with `--no-wait` means only **submission** is confirmed. Record Expo build ID and URL from workflow. Check Expo `Finished` and an APK artifact before saying it is ready to install. If pending or failed, report that precisely; never request second EAS build during same IST calendar day.
