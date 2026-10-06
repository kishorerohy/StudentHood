# StudentHood mobile agent notes

The Expo SDK 54 / React Native app is in this directory. Respect root `AGENTS.md` in addition to these instructions.

- Auth: `src/auth.js`, `src/session.js`, `src/supabase.js`. The Supabase auth-state callback must not await Supabase requests inside its own callback, which may cause a deadlock.
- Safety: `src/screens/OnboardingScreen.js`, `src/screens/SafetyGate.js`, `src/ageAssurance.js`, `src/api.js`. Never allow guardian approval or platform age requirements to be bypassed by UI changes.
- Login, onboarding, and guardian gate are user-facing flows. Surface real errors, keep loading states reliable, and don't claim an email has been sent while only a local email draft or share sheet has opened.
- The `preview` profile in `eas.json` builds an APK on **Expo EAS**, owner `studenthood-0920`. `EXPO_TOKEN` is a protected GitHub Actions secret configured by the owner; never print or commit it.
- Preserve the official `assets/studenthood-app-icon-compact-1024.png` and existing light/dark logo images.
- Do not silently add tracking, public exposure of personal data, or any change to policy that would enable underage accounts incorrectly.
