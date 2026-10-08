# StudentHood Project State

Last updated: 2026-10-08 (IST)

This file is the durable recovery checkpoint for StudentHood. Keep secrets and private user data out of this document.

## Current checkpoint

- StudentHood is an Expo / React Native student social-network app.
- Repository: `kishorerohy/StudentHood`
- Mobile app: `mobile/`
- Public website: GitHub Pages from the repository root
- Currently installed Android preview baseline: **0.1.5**, versionCode **6**
- Next consolidated preview pending approval/release: **0.1.6**, Android versionCode **7**, draft PR #5 (`fix/onboarding-campus-identity`).
- Android package: `com.studenthood.app`
- Official native builds use **Expo EAS**
- The owner installed and tested the current v0.1.5 preview APK and reported that it is working.
- The project is now in a batched correction pass.

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

- The owner has finished the current in-app correction pass; review draft PR #5 and request the owner's approval before merging/releasing the consolidated next APK. Do not auto-merge.
- For every correction, say whether it needs GitHub only, backend only, or the next APK.
- Continue guardian consent and preview account-lifecycle testing.
- Domain purchase and automatic guardian emails remain deferred.
- Review any older EAS workflow pull request against the current one-build-per-day policy before merging it.

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
