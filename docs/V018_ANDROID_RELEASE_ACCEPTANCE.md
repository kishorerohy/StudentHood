# StudentHood v0.1.8 — Android release acceptance checklist

Date opened: 2026-10-10 (Asia/Kolkata)
Source release: PR #9, merged to `main` on 10 October 2026; Android 0.1.8 / versionCode 9.
EAS submission: https://github.com/kishorerohy/StudentHood/actions/runs/38050929041
Expo build: https://expo.dev/accounts/studenthood-0920/projects/studenthood/builds/ef509aea-4f0b-4385-a6dc-ee7c376010bb
Last known installed baseline: v0.1.7 / versionCode 8.
Status at checklist creation: GitHub EAS submission succeeded. **Final EAS success, APK installation, and Android device QA are not yet verified.**

## Release invariants
- Maximum **one** official Android EAS build submission per Asia/Kolkata calendar day; the 10 October quota has already been used. No second build/retry today.
- No fresh build merely to update QA docs; documents do not imply a new APK.
- Keep existing StudentHood terminology, approved logos, tabs, privacy, RLS, guardian permission and moderation.
- Do not fabricate students, content, messages, success toasts, or publication status.
- Do not auto-delete real accounts. Test-data cleanup requires an explicit, isolated and verified development/test-account mechanism.
- Do not release content that is pending human moderation.

## Gate A — APK availability / install
1. Open the Expo build URL and read its **actual** status. Mark `PASS` only if status is Finished and a downloadable Android APK artifact exists.
2. Install on a test Android phone; confirm OS recognizes `com.studenthood.app`, app version 0.1.8 and versionCode 9, and launch with and without network.
3. Record install method, Android version, device model, keyboard app, signed-in account roles and local date/time. Do not store credentials in this file.
4. Test both fresh install and update over v0.1.7 without losing a real user's session or data.

## Gate B — corrections 1–12
Use `PASS`, `FAIL`, or `BLOCKED` only after test. All are **UNVERIFIED** at creation.

| # | Test | Expected result | Status |
|---|---|---|---|
| 1 | Discover > People; scroll horizontal cards, inspect university, common interests, avatar, Add Peep. Also test under-18/restricted visibility. | Only eligible real students appear; buttons navigate or write only authorized requests; no invented users. | UNVERIFIED |
| 2 | Edit Profile: focus bottom City and Campus fields with Gboard; switch between fields, scroll, dismiss keyboard and save. Repeat on onboarding and composers. | Focused text, label and caret remain above keyboard, and values persist without jumping. | UNVERIFIED |
| 3 | Deny GPS, enter city + country, open campus selector, search, choose result, save, change city. | Real nearby schools/colleges/universities appear when the directory has results; old campus selection resets; errors/empty states truthful. | UNVERIFIED |
| 4 | Set a new independent cover photo and relaunch; compare light/dark; visit from another permitted account. | Cover persists, fades without visible hard border; avatar and Scene media remain separate; private files cannot leak. | UNVERIFIED |
| 5 | Open own profile three-dots beside Ping; visit another student's profile and open three-dots/report. | Correct menus and safety/report actions, no inert controls or privilege bypass. | UNVERIFIED |
| 6 | Inspect overlapping/floating profile picture in light/dark, small and large screens. | Correct elevation and alignment; no crop/overlay obscures important content. | UNVERIFIED |
| 7 | Attempt same username across two authorized test accounts, including a concurrent attempt. | Server blocks duplicate globally; exact red `user name already exist` appears under field; valid username shows approved gradient availability. | UNVERIFIED |
| 8 | Simulate real network/provider instability when searching city/campus; retry after 503. | Fallback/caching/error handling works without blocking all onboarding; no false provider success. | UNVERIFIED |
| 9 | Share approved permitted Scene to an eligible mutual Peep, and via allowed installed external apps. Try non-Peep, minor, pending/restricted Scene. | Peeps-first bottom sheet, correct availability/order and eligibility; moderated link received only in Ping, not Drops; privacy remains enforced. | UNVERIFIED |
| 10 | Cold launch, warm return, force-stop/relaunch, Google login return. | Single native splash/brand appearance, no repeated logo sequence or incorrect onboarding entry. | UNVERIFIED |
| 11 | Two permitted same-campus test users; human reviewer approves eligible Scene; refresh campus feed. | Other permitted student's approved Scene appears; pending/rejected/restricted Scenes remain hidden. | BLOCKED — needs authorized review and test users |
| 12 | Open full-screen Scene, swipe left, use back navigation, then tap comments/share. | Navigates to the real Scene creator full profile, not pop-up or mismatched profile; action taps not consumed by gesture. | UNVERIFIED |

## Additional release-critical regression checks
- Google OAuth; first-run onboarding; guardian email verification/approval for under-18; adult account claiming a minor DOB must be restricted as a minor.
- Edit Profile Save (full name, bio, city, institution, campus status, avatar) survives re-entry/relaunch; no `permission denied for table profiles`.
- + contains proper Create editors for Scenes, Pulse, Hangs, Crews and Gigs; do not claim a functioning publishing backend unless a persisted record and permitted readback are confirmed.
- Scene comments open the input rather than enlarging the Scene; typed comment is persisted or truthfully shown as pending.
- Confirm no full Ping chat is presented as working; currently only eligible moderated Scene-link sharing is supported.
- New Scene moderation is always pending until a genuinely authorized adult reviewer makes a decision. Never auto-approve.
- Verify no message alert appears in Drops; Ping events stay exclusively in Ping.
- Campus Status hidden setting is respected on Profile and Ping.
- Password/account sign-out does not delete real accounts or bypass guardian policies.
- Privacy/terms/safety links open and match the current public policy pages.

## Known unfinished engineering beyond this APK
1. Globally exhaustive canonical campus identity needs stable external IDs, alias mapping/backfill, and collision handling. Normalized city/country/name matching is not proof of worldwide deduplication.
2. Full Ping chat and request workflows are not live.
3. Pulse, Hangs, Crews and Gigs require backend publishing/discovery/membership or application lifecycle and moderation before being described as full services.
4. A verified adult reviewer account and safe human moderation workflow are required; three existing Scenes were pending at last inspection.
5. Real-device smoke tests, offline paths, older-app upgrade paths, and multi-account access control remain outstanding.

## How to report results
For each failed check, attach device screenshot or concise steps, Android version, app versionCode, expected vs actual and whether reproducible. Avoid sharing real minors' details, live tokens or account passwords.

Only change a status from UNVERIFIED/BLOCKED after actual evidence. Keep `docs/PENDING_CORRECTIONS.md` authoritative for the complete 12-item status ledger; this file is the detailed execution sheet. 
