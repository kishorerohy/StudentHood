# StudentHood coding agent instructions

StudentHood is a student social-network app with an Expo/React Native mobile client in `mobile/`, public GitHub Pages website at repository root, and a Supabase backend. Read only relevant project files for the task.

## Product and branding
- Keep product vocabulary exact: Pulse, Discover, Scenes, Peeps, Ping, Hangs, Crews, Gigs and Drops. A posted video is a **Scene**; use **Share Scene**, never "clip", "reel" or "short".
- New Pings and Ping requests belong in **Ping**, not Drops. Drops is for non-message activity.
- Use the existing approved StudentHood app icon and wordmarks as-is. Do not redraw, recolor or replace brand assets. Preserve automatic light/dark variants.
- Preserve mobile navigation and interaction conventions in `mobile/README.md`.

## Security and changes
- Default to a small feature branch and a pull request. Explain what changed, list tests run and evidence, and ask the owner to review before merging. Do not auto-merge or release.
- Never add, log, commit, print or request API secrets, OAuth credentials, service-role keys, signing keys, user tokens or customer data. Never grant yourself privileges.
- Do not modify production Supabase schemas, auth policies, users, records, RLS, OAuth settings, or sending services without explicit task-level approval and a reviewed migration. Do not delete real accounts.
- Age and guardian restrictions are enforced by Supabase, not solely by UI. Do not weaken under-18 restrictions, age assurance, privacy, rate limits, or guardian consent.
- Approval emails through Resend and any domain purchase are **postponed**. Keep existing manual guardian-link flow operational until the verified sending domain and provider are deliberately configured.
- Disposable account deletion in the preview must apply only to explicitly marked test email accounts. Existing Google, Apple and regular accounts are retained.
- Do not assume an APK was built just because JavaScript checks pass. Use **Expo EAS** for official Android/iOS builds. Do not reintroduce GitHub-native APK builds; do not change build ownership, signing or Expo project ID without approval.
- Do not modify billing, registrar, Resend, app-store distribution or public legal policies unless the task explicitly requests it.

## Completion criteria
- Keep each PR scoped to one issue and describe security/UX impact.
- Test the specific change. For mobile changes run `cd mobile && npm install --no-audit --no-fund && npx expo-doctor@latest && npx expo export --platform android --output-dir dist` where feasible, and report any unavailable test tools or network failures instead of claiming success.
- Do not claim manual/device, OAuth, real guardian email, or live build tests passed unless they were actually performed.
