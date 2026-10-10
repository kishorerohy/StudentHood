# StudentHood Project State

Last updated: 2026-10-10 (IST)

This file is the durable recovery checkpoint for StudentHood. Keep secrets and private user data out of this document.

## Current checkpoint

- StudentHood is an Expo SDK 54 / React Native app with private Supabase `studenthood-production` services.
- GitHub repository: `kishorerohy/StudentHood`; Android package `com.studenthood.app`.
- Most recently built baseline: **v0.1.7, versionCode 8**, submitted 9 October 2026 (IST), Expo build `c82f47fe-5056-454a-bbe3-d25d86562528`.
- **User explicitly approved the one consolidated v0.1.8 APK on 10 October 2026.** PR #9 `release/v0.1.8-consolidated` contains new UI, Supabase migration/Edge Function changes and Android versionCode **9**. No claim of an APK until EAS actually submits it.
- Keep the complete 12-correction register in `docs/PENDING_CORRECTIONS.md`, and show it at end of StudentHood development conversations.
- Production Supabase institution-search **v3 ACTIVE** with a secondary Overpass endpoint; live authenticated city search and Android device tests remain required.
- New private cover photo storage, moderated Scene sharing via Ping, human Scene review audit and campus-label normalization have production migrations applied. No existing pending Scenes have been silently approved.
- The next action is to validate the latest PR #9 CI, inspect security/permissions, merge the approved release when ready, and submit one owner-approved Expo EAS build respecting the daily IST limit.

## Build policy

- Maximum **one official Expo EAS APK build per calendar day in Asia/Kolkata**.
- Accumulate approved mobile corrections throughout the day.
- Default end-of-day build time: **19:00 IST**.
- Skip the build if there are no new mobile/shared-asset changes.
- Do not create one APK for every correction.
- GitHub CI, tests, Expo Doctor, and JavaScript export checks may run throughout the day.
- Do not use GitHub-native Gradle APK builds as a workaround.
- Do not start extra Expo builds manually after the daily build is already submitted unless the owner explicitly approves an exception.

Active build workflow:
`.github/workflows/eas-android-preview.yml`

## Change classification

Before implementing a correction, classify it:

- **Website / GitHub only**: no APK required.
- **Backend only**: Supabase-side change; usually no APK if the installed client already supports it.
- **Mobile source change**: React Native UI, navigation, behavior, bundled assets, or client logic. Include it in the next daily APK.
- **Native/build change**: permissions, Expo config, native modules, app icon/splash, Android/iOS configuration. Requires a fresh EAS build.

Batch all APK-requiring changes into the single daily build.

## Product vocabulary

Use these terms consistently:

- Pulse
- Discover
- Scenes
- Peeps
- Ping
- Hangs
- Crews
- Gigs
- Drops

A video is a **Scene**. Use **Share Scene**. Never call it a clip, reel, or short.

Message notifications stay separate from Drops:
- New Pings and Ping requests belong only in **Ping**.
- **Drops** is for non-message activity such as Peeps, Scene activity, Hangs, Crews, Gigs, and other app events.

## Branding

Preserve the approved StudentHood branding unless the owner explicitly requests a redesign.

- Official mobile app icon: `mobile/assets/studenthood-app-icon-compact-1024.png`
- Android adaptive foreground: `mobile/assets/studenthood-app-icon-foreground.png`
- Keep the approved StudentHood wordmark and connection-H identity unchanged.
- Do not redraw, recolor, or silently replace approved assets.

## Auth and safety rules

- Do not weaken age assurance, guardian consent, teen restrictions, privacy protections, or RLS.
- Guardian restrictions must remain server-enforced, not UI-only.
- Keep the manual guardian approval-link flow working until automatic email delivery is explicitly resumed.
- Automatic guardian email delivery and domain setup remain deferred.
- Only explicitly marked disposable preview email test accounts may be cleaned up automatically.
- Google, Apple, and ordinary real accounts must be retained.
- **Signed-in sessions must persist across app closes/restarts** until the user explicitly logs out or a session becomes invalid/revoked. Do not use automatic fresh-start sign-out or clearing secure sessions in preview/development builds. The earlier preview APK sign-out issue was caused by `TEST_FRESH_START`; this has been removed in pending PR #5.
- Never delete real production accounts for routine testing.
- In Supabase auth handling, do not await Supabase requests directly inside `onAuthStateChange`; defer account refresh work outside the callback.

## Development workflow

1. Read `PROJECT_STATE.md`.
2. Read root `AGENTS.md`.
3. For mobile changes, also read `mobile/AGENTS.md` and `mobile/README.md`.
4. Check relevant GitHub issues and pull requests.
5. Keep changes scoped and reviewable.
6. Run appropriate validation.
7. Do not claim device tests passed unless they were actually performed.
8. Never expose secrets.
9. Respect the single-daily-EAS-build rule.

GitHub `main` is the durable code source of truth.

## Current backlog

- See **all 12 corrections** in `docs/PENDING_CORRECTIONS.md` with per-item GitHub/Supabase and device-QA status.
- Complete the v0.1.8 CI/release process and test on Android. A passed JS build is not handset verification.
- Globally canonical institution IDs/aliases need further design and safe existing-account backfill; current name normalization is not a globally complete institution registry.
- Pending Scene approvals require a verified, explicitly authorized adult moderator; underage or unreviewed Scenes cannot be shown to other users.
- Automatic guardian emails/domain purchase remain deferred, and real account deletion must never be automatic.

## Recovery procedure

If the ChatGPT Project or a chat becomes unavailable:

1. Open this GitHub repository.
2. Read `PROJECT_STATE.md`.
3. Read `AGENTS.md`, `mobile/AGENTS.md`, and `mobile/README.md`.
4. Inspect open GitHub issues and pull requests.
5. Treat `main` as the code source of truth.
6. Check Expo EAS for native build status when needed.
7. Check Supabase live configuration only when backend state matters.
8. Reconnect services using their proper secret stores; never reconstruct secrets from chat history.

Update this file whenever a release, architecture rule, build rule, safety rule, or major project milestone changes.
