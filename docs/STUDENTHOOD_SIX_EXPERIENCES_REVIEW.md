# StudentHood competitive experiences — development review (18 October 2026 IST)

**Status: six feature branches implemented as code prototypes, review-only and NOT live.** All six rollout flags default OFF. Current verified distribution remains the prior StudentHood v0.2.0/versionCode 11 APK. This changes neither production database nor installed mobile app.

## Review order and affected surfaces

| Stage | Feature | PR / stacked branch | Screens added, existing locations used | Additive migration |
|---|---|---|---|---|
| 1 | Shared rollout and Freshers Journey | #28 `feat/campus-experiences-foundation` | New optional Journey, Discover/Profile settings | `20261018_studenthood_experiences_foundation.sql` |
| 2 | Crews HQ and Hang RSVPs | #29 `feat/crews-hq-and-hangs-rsvp`, bases #28 | Discover/Crews and Hangs detail; no Hangs creation there | `20261018_studenthood_crews_hq_rsvp.sql` |
| 3 | Gigs Plus | #30 `feat/gigs-plus-applications`, bases #29 | Existing Gigs details, + creator, Profile employer/My Applications | `20261018_studenthood_gigs_plus.sql` |
| 4 | StudentHood Passport | #31 `feat/studenthood-passport`, bases #30 | Private Profile menu, visible opt-in activity cards, authenticated expiring links | `20261018_studenthood_passport.sql` |
| 5 | Campus Partner Hub | #32 `feat/campus-partner-hub`, bases #31 | Restricted Profile portal, verification and sponsored review drafts | `20261018_studenthood_partner_hub.sql` |
| 6 | Cross-Campus Collaborations | #33 `feat/cross-campus-collaborations`, bases #32 | Conditional adult Discover project browsing and central + project creation | `20261018_studenthood_cross_campus_pilot.sql` |

**Product invariants:** Official brand, icons, glass/premium visual direction, light/dark, heading-free pages, Scenes | Hangs | + | Gigs | Profile bottom navigation, Discover/Drops/Ping top actions and their notification routing, mandatory age/guardian controls, profile-cover edit, same-campus Peeps, newer Scenes first, live foreground refresh, report-first ordinary user-content publication. All ordinary Scene/Pulse/Hang/Crew/Gig *creation* begins at central +. Employer-verification/Passport/paid-placement approval is intentionally separate. No fake users, jobs, sponsors, credentials, metrics or payments.

## Deployment and release **not authorised**
- None of the six new SQL migrations was applied to production.
- No new or existing Supabase account, guardian, campus, content, RLS or auth data was changed.
- None of the six feature PRs was merged or marked ready; each remains a draft for review.
- New functions/tables do not exist on production; feature service reads return safe unavailable states/hidden entry points until migrations are explicitly reviewed, applied and rollout flags intentionally enabled.
- **No new EAS Android APK requested.** At most one *approved* consolidated daily build and never confuse CI with a verified APK. User's earlier one-per-IST-day gate still applies.

## Required independent verification before production rollout
1. **SQL structural review:** Run all six additive migrations on a fresh isolated Supabase *test* database in declared order. Do not use the existing production users for testing or run DDL on production from this PR.
2. **RLS tests:** Authenticated actor as teen/guardian-restricted, permitted adult, unauthorised other campus, blocked Peep, organizer, accepted member, ordinary employer, verified employer, verified partner and moderator. Include malformed RPC inputs, rate limits and concurrency.
3. **Freshers:** Opt in, interests persist, only recorded accepted Peeps count, pause/dismiss/restart and out-of-scope campus denial.
4. **Crews/Hangs:** Real permitted Crew with member requests, owner approval and unauthorized rejection, private Crew limitations, Hang RSVP capacity under simultaneous requests, cancellations, organizer attendance dispute/revocation flow.
5. **Gigs:** Pending employer must not show Verified; independent operator verifies; only registered adult can apply to eligible active Gig; no duplicate applications; employer cannot read other organizations' applicants; status/withdraw; scam report.
6. **Passport:** Only post-event organizer evidence or accepted-application employer involvement confirmation, never auto-generated university credential or false completed Gig certificate. Issuer revocation and private owner controls. Signed-in adult share open/expire/revoke and blocked account denial.
7. **Partner:** Operator-approved business and separately approved campaign, Sponsored label when eventually exposed, no unapproved public placements, partner-only aggregate metric reads, no billing or personalised minor ads.
8. **Collaboration:** Operator-verified real pilot campus enrollment and enabled campus pair **required**. Eligible adult request/join and organizer approval, project capacity under concurrency, reporting/blocking, no general cross-campus Scenes/Peeps/Ping visibility. Only show UI after second campus is actually enabled.
9. **Regression/device:** All prior correction-ledger items, light/dark, app lifecycle, 2 real consenting test identities, valid Android signed package, no broken navigation, no crash on missing migration/feature flag; release build only upon separate owner approval.

## Explicit residual work, not overstated as finished
- No production or isolated-database DDL execution yet, and no real multi-account RLS permission/concurrency E2E QA.
- No partner ad-serving, billing/payouts or partner compliance approval mechanism; campaign drafts only.
- Campus verification/enrollment must be performed by trusted operators, and no campus pair is currently enabled. Invitations table exists but no separately exposed student invitation composer; member request/owner-accept flow is the implemented path.
- Passport proof is issuer attestation from real RSVP/accepted application, not tamper-proof external attendance, payroll record, course accreditation or independently proven Gig completion.
- No universal official university identity integration or employer documents upload/verification operator console; trusted verification still needs reviewed operations.
- Current feature flag activation would require separate authorized SQL changes and staged rollout; until then none are live.
- Existing closed-app push-notification dispatch remains outside these six features.
