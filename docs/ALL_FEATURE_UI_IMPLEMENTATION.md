# StudentHood feature UI implementation checkpoint (2026-10-09)

**Status: draft PR #7, mobile source only; not merged, not distributed. No APK build permitted without another explicit owner instruction.**

## Approved design coverage

| Feature | UI implemented | Data-backed now | Remaining services |
| --- | --- | --- | --- |
| Scenes | Existing immersive viewer, scene feed, protected creator navigation, manual campus status slider from PR #6; honest Pulse entry | Existing RLS-filtered Scenes, reactions and counts | Video playback, sharing deep links, comments composer, fully immersive default feed polish |
| Pulse | Full-screen premium concept with filter chips and honest locked state | Campus people avatars shown separately, not as fake Pulse posts | Pulse creation, expiry, audience rules, viewing, moderation, Ping replies |
| Discover | People search and navigable People/Hangs/Crews/Gigs categories | Real discoverable campus student rows | Hangs/Crews/Gigs indexes, search across supported institutions, pagination, profile requests |
| Ping | Real recipient context, Peep-gated campus status, segmented tabs including Requests, honest disabled states | Accepted Peep relation / permission checks | Secure conversations, requests, block/report, message storage and real-time delivery |
| Hangs | Full-screen event discovery shell and filters | No event backend currently | Moderated Hangs, calendars, RSVP, attendee visibility and locations |
| Crews | Community discovery shell, full-screen route from Discover | No Crew backend currently | Membership, permission groups, Lounge, Hang links and moderation |
| Gigs | Full-screen employment discovery shell and job-type filters | No verified employer/job backend currently | Employer verification, postings, currency/pay, eligibility, applications and safety |
| Drops | Responsive activity list with Scenes/Peeps filtering | Real non-message student-scoped Drops activity | Incorporate future Hangs/Crews/Gigs events as source tables become available |
| Profile | Approved cinematic full-screen layout from PR #6 | Own and permitted profiles with real scenes and Peeps | Optional custom cover upload, validated social links, verification system, collections |

## UX constraints

- Maintain approved StudentHood logo, icon, text terminology, Dark & Light themes, and minimal nongradient UI.
- Navigation: bottom Scenes — Hangs — + — Gigs — Profile; top-right Discover, Drops, Ping.
- Status control: inline transparent *vertical* scroll picker, not a modal.
- Creator swipe-left opens a full profile, not a compact pop-up.
- No fake verification badge, fake followers, unverified businesses, fabricated message history, fabricated events or revenue figures.
- Pings and Ping requests are never mixed into Drops. No fake button claiming success.
- Respect teen age, guardian, quiet hours, RLS, privacy and block rules from real backend.
- Use real media and counts only where the access control allows the viewer to see them.
- Do not substitute UI placeholders for real backend completion or real device QA.

## QA and release

- GitHub Expo Doctor + Android JS bundle export through mobile CI.
- No production schema changes in this draft feature UI batch.
- Draft PR #7 is the consolidated review candidate containing dependent draft PR #6 changes.
- Do not merge or invoke native EAS APK builds until the owner explicitly authorizes release; adhere to one APK submission per Asia/Kolkata day.
- Installed APKs do not automatically receive React Native source changes; a later approved EAS build and installation is required.

## Remaining work before calling everything fully functional
1. Implement moderated event/crew/gig/Pulse data and secure read/write policies.
2. Build real Pings and requests, blocking/reporting, age controls, delivery, retention, and notifications solely inside Ping.
3. Connect real data to discovery filters, Hangs, Crews, Gigs and Pulse with loading, empty, failure, and enforcement states.
4. Verify UI on actual Android/iOS tablets, across light/dark and teen/adult accounts.
