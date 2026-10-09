# StudentHood profile Save fix and action audit

## Reported issue (9 October 2026)
The owner tested the installed Android Edit Profile form and received `permission denied for table profiles` on Save.

## Production root cause, change and verification
- Existing UPDATE RLS: `auth.uid() = id` for both `USING` and `WITH CHECK`.
- Basic editable profile columns already had authenticated column-level UPDATE permission, but `campus_presence` and `avatar_url` did not.
- Approved and applied migration `fix_profile_campus_avatar_update_grants`: `grant update (campus_presence, avatar_url) on table public.profiles to authenticated;`
- Committed source: `supabase/migrations/20261009172000_fix_profile_campus_avatar_update_grants.sql`.
- Verified authenticated has UPDATE on `full_name`, `bio`, `city`, `campus_name`, `campus_presence`, `avatar_url`.
- Verified authenticated cannot UPDATE protected `date_of_birth`, `age_assurance_status`, `guardian_consent_status`, `adult_access_verified`, and `profile_visibility`.
- Verified existing own-profile UPDATE RLS remains unchanged.
- Zero-row UPDATE privilege tests with the authenticated DB role returned no permission error and modified no rows.
- **A signed-in real-device Save test has not yet been performed.**

## UI/API improvements on draft branch
1. `saveMyProfileChanges` validates lengths, updates the signed-in student's own profile, and reads back the stored values before confirming success.
2. `setCampusPresence` checks both the row update result and a second profile readback.
3. `uploadMyAvatar` verifies the avatar path is assigned to the correct profile, with cleanup on a failed DB link.
4. `completeProfile` validates onboarding data and confirms the profile row and all key fields were saved.
5. `EditProfileScreen` keeps its Save button disabled during requests, shows a success confirmation only after verification and refresh, and accurately identifies partial saves (e.g., text fields saved but photo upload failed). Photo-only Save cannot falsely succeed with no selected photo.

## Other feature action audit
| Feature | Current action behavior | Notes |
|---|---|---|
| Onboarding | Real save and readback | Requires age/guardian gating; verify live account on device |
| Edit Profile | Real save and readback | Corrected production column privileges |
| Campus status | Real manual save and readback | The pending slider UI needs an APK; older editor uses same backend column |
| Scene publishing | Real Supabase INSERT with returned row | Existing moderation and RLS apply |
| Add Peep | Real insert with returned row, dedup handling | Pending PR, do not claim shipped |
| Ping | No message write yet | UI clearly says unavailable; never claim delivery |
| Pulse | Publishing backend not released | Preview-only; no fake posts |
| Hangs | Event backend not released | Preview-only; no fake RSVPs |
| Crews | Membership backend not released | Preview-only; no fake join action |
| Gigs | Posting/application backend not released | Preview-only; no fake job applications |

## Device QA checklist after approved APK
- From signed-in account, change full name, bio, city, institution; tap Save once; check success feedback and return to Profile.
- Reopen Edit Profile and confirm all exact values survive refresh and relaunch. Confirm another student can see only permitted profile fields.
- Save profile with and without a new avatar; test permission denial, wrong file type, file over 5MB, slow network, offline mode and partial upload errors.
- Save each campus state; verify `Not shared` hides the badge on other students' profiles and in Ping.
- Confirm users cannot change DOB, safety status, guardianship or another student's profile through client-side requests.
- Confirm onboarding Save/Enter StudentHood persists username, name, institution, DOB-derived safety and allowed interests.
- Verify Scene Post shows only actual persisted Scenes and handles moderation states correctly.
- Device-test both Light and Dark themes and teen-restricted accounts.

## Build control
No merge to `main` or APK build authorized by this issue. Keep draft PR #7 for consolidated review. The production permissions correction takes effect server-side on installed APKs; the improved UI feedback/readback waits for a later explicitly approved build.
