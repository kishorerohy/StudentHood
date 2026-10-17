# StudentHood — Immediate publishing, report-based moderation and profile clarity
Status: draft PR #18. Automatic checks and real Android QA required. No APK submitted.

## Expected product behaviour
- Scenes, Scene comments, Pulse, Hangs, Crews and adult-only Gigs publish immediately for eligible selected audiences. No routine human preapproval.
- Reporting triggers private review by an authorized adult moderator. A report does not itself automatically delete the content or presume a violation.
- Authors cannot restore moderator-removed/restricted content simply by editing. Existing removed/limited/rejected records stay restricted.
- Keep all account safety, youth/guardian verification, teen restrictions, privacy, Peep/campus audience rules, abuse reporting and mandatory legal removals. No unrestricted content exemption.
- Existing pending content can be released if not reported. Legacy Scene report tickets checked as empty on 17 Oct 2026.
- A visiting student can see aggregate accepted Peep counts for a profile they are allowed to see, with no private Peep list exposure. Pull-to-refresh reloads public profile fields, photos, visible Scenes and counts.
- The user corrected the timing of the earlier campus-name screenshot; it was taken before the update, not evidence of stale profile cache. The earlier Scene itself retains its original campus label; the owner may explicitly opt in to sharing an old Scene with their current campus. No audience migration occurs automatically.

## Tests required
1. New campus Scene immediately visible on owner device and an eligible same-campus second device. Wrong campus, Peeps-only and private visibility remain hidden as appropriate.
2. Editing a published Scene does not force it into pending; modifying removed/limited content does not restore broad access.
3. New comments display immediately to eligible Scene viewers. Moderator removal is persistent.
4. Pulse, Hangs, Crews, adult-only Gigs are created with approved status; audience and age/guardian policies remain enforced.
5. Authorized viewer can report accessible content; report enters a private queue. Duplicate reports do not add extra rows.
6. Moderator reviews report and Keep/Remove works; unrelated clients cannot view report rows or change moderation.
7. Profiles show accurate visible Scene and aggregate accepted-Peep counts, and refresh.
8. Photos, Scene media URLs and private profile fields remain access-controlled; no private data is made public by a statistics query.
8a. An older Scene with a campus different from the owner's current campus stays restricted. Only the owner can explicitly choose Share with current campus. Confirm the prompt explains the audience change, and that removed/limited posts cannot be moved.
9. Previous white single startup, institution search, Peep decisions and Ping still pass Android QA.
10. Confirm no existing removed/rejected posts were republished.

## Release gate
- Expo Doctor, Android native configuration and JS bundle CI pass.
- Apply SQL migration transactionally and verify row-level permissions and old statuses after.
- Device QA still required on separate accounts. The migration cannot guarantee zero defects.
- Never trigger an official EAS build without separate owner approval; strict max one APK submission per Asia/Kolkata date.

## Backward compatibility / non-blockers
- Supabase migration `report_first_publishing_with_profile_counts` was applied successfully and checked: two older pending Scenes and one Hang are now approved, all six content-type defaults are approved, triggers enabled, and reports private.
- `bridge_legacy_scene_reports` is live so the installed v0.1.9 Scene Report action still reaches the new private queue while retaining its support ticket.
- `opt_in_old_scene_campus_reshare` is live as an authorized RPC; no user content was moved automatically.
- Installed v0.1.9 app may show a misleading failure after Pulse/Hangs/Crews/Gigs are successfully published, because its code expects `pending`. The updated client expects `approved`. Do not retry a submission blindly; new APK QA is required.
- Public discovery/list screens for Hangs/Crews/Gigs and Pulse are not all completed, even though eligible SELECT rules now permit appropriate API access. Never claim worldwide or cross-campus exposure.
