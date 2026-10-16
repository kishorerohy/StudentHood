# StudentHood 0.1.9 Android consolidated release acceptance
Release approval: owner, 16 October 2026. Official EAS submissions: maximum one per Asia/Kolkata calendar day.
APK target: version 0.1.9 / Android versionCode 10. Expo EAS preview profile.

## Included source
- PR #10: all-white native splash in both Android display themes, single approved white StudentHood startup while session/guardian age gating loads.
- PR #11: resilient city/locality institution directory with verified Chennai/Kunrattur metro fallback.
- PR #12: Nearby / Country / Worldwide ROR name search in onboarding and Edit Profile, plus canonical registry foundations. The physical-campus database is still incomplete.
- PR #13: permitted avatar signed URL, incoming Peep accept/decline actions on profile/Discover and in Drops.
- PR #14: Compose Ping, private one-to-one text messages, consent-controlled message requests inside Ping only.
- PR #15: inset-aware Android institution modal and responsive layout.
- Previous PR #9 feature work and safety checks carried forward.

## Mandatory pre-submit checks
- [ ] Android Expo Doctor passes on integrated release head.
- [ ] Expo native Android configuration inspection passes, with status bar/light native splash correct.
- [ ] Expo Android JS bundle export passes on integrated release head.
- [ ] Confirm app.json 0.1.9 and versionCode 10; current main versionCode 9.
- [ ] Audit the EAS preview workflow submission steps over the last IST day; do not submit more than one.
- [ ] Confirm required production Supabase migrations already active, with RLS on new private tables and no youth/guardian bypass.
- [ ] Check that there are no accidental real-account destructive operations, fake Scenes or automatic Peep request decisions.

## After Expo delivers the APK — physical device QA still required
- [ ] Cold launch directly into approved WHITE native splash, same logo and white React startup, no intermediate dark frame.
- [ ] Startup routes correctly for logged-out, logged-in, underage guardian-required, and resumed accounts.
- [ ] Onboarding: auto city/GPS denied, Chennai/Kunrattur lists, institution selection, keyboard, country and worldwide ROR searches.
- [ ] Edit Profile institution full-screen dialog: status-bar cutout, safe area, long title, search, retry error, keyboard, Save persistence.
- [ ] Discover and full visited profiles: saved profile photos for authorized people; no unauthorized minor/private media disclosure.
- [ ] Peep request recipient can Accept/Decline, confirmed on both phones and in Drops; requester cannot decide.
- [ ] Compose Ping: mutual Peeps direct messages, eligible adult non-Peep one introductory request, accept/decline, reopen/refresh, no unauthorized access, guardian/teen restrictions.
- [ ] Scenes: verify moderation visibility and actual eligible campus Scene discovery. Never automatically approve pending Scenes.
- [ ] Scenes sharing: eligible mutual Peeps, native share sheet, restricted link access; swipe-left profile, menu, floating avatar, profile cover, username race handling.
- [ ] Both light/dark and compact/large phone densities, network offline/timeout/retry, emulator and two physical devices where available.

## Unresolved product coverage (NOT release-blocking if accurately presented)
- No complete worldwide school/physical campus dataset. ROR is higher-ed organizations, not a physical campus registry.
- Ping initial release is text-only and not end-to-end encrypted; Hang/Crew group chat not implemented.
- Physical QA cannot be called PASS from GitHub CI alone. App-level runtime bugs may be discovered after installation.
