# StudentHood mobile agent notes

The Expo SDK 54 / React Native app is in this directory. Respect root `AGENTS.md` in addition to these instructions.

- Auth: `src/auth.js`, `src/session.js`, `src/supabase.js`. The Supabase auth-state callback must not await Supabase requests inside its own callback, which may cause a deadlock.
- Safety: `src/screens/OnboardingScreen.js`, `src/screens/SafetyGate.js`, `src/ageAssurance.js`, `src/api.js`. Never allow guardian approval or platform age requirements to be bypassed by UI changes.
- Login, onboarding, and guardian gate are user-facing flows. Surface real errors, keep loading states reliable, and don't claim an email has been sent while only a local email draft or share sheet has opened.
- The `preview` profile in `eas.json` builds an APK on **Expo EAS**, owner `studenthood-0920`. `EXPO_TOKEN` is a protected GitHub Actions secret configured by the owner; never print or commit it.
- **Sign-in persists across normal app closes and restarts.** Never restore `TEST_FRESH_START` or automatic Supabase sign-out/storage clearing for preview or development profiles. Users sign out explicitly; involuntary sign-out is reserved for auth revocation/expiry or other security requirements. Do not automatically delete test accounts.
- Preserve the official `assets/studenthood-app-icon-compact-1024.png` and existing light/dark logo images.
- Do not silently add tracking, public exposure of personal data, or any change to policy that would enable underage accounts incorrectly.

- Respect the single daily EOD EAS APK limit documented in root `AGENTS.md`: batch approved work during the day; no additional ad-hoc Expo EAS build.
