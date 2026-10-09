# StudentHood + Creation Hub — Correction and QA

## Reported issue

In the installed preview APK, pressing **+** exposes Scene creation, but **Start a Hang** and **Post a Gig** lead to existing browse/island screens; **Create a Crew** is missing. Pulse also navigated to the preview instead of a composer.

## Fixed navigation

The single **+** hub now has exactly five creation choices:
1. Post a Scene → existing Scene composer and moderated Scene database insert.
2. Add to Pulse → Pulse composer, short text, optional image/video and Peep/Campus audience.
3. Start a Hang → title, category, description, future date/time, public campus meeting point, capacity and audience.
4. Create a Crew → name, description, category, campus/invite-only.
5. Post a Gig → title, employer, job description, category, location, positive pay, explicit ISO currency and pay period.

No choice navigates to the feature browsing island as a substitute for a composer. Hangs and Gigs stay accessible as their normal bottom-island browsing tabs, with Create actions that also open the dedicated composers. Crews is reachable through Discover; Pulse via Scenes/Create.

## Persistence model

Proposed SQL migration: `supabase/migrations/20261009192500_create_hub_pending_submissions.sql` (staged, **not deployed**). Creates owner-only pending `pulse_entries`, `hangs`, `crews`, `gigs`; RLS blocks cross-account reads, and submission privileges are INSERT, SELECT-own and DELETE-own only. Campus is assigned by the server from the authenticated student profile, not trusted from form input. Gig submission requires an adult account per `studenthood_access_policy()`. All submissions default to `pending` and **are not publicly listed**, because moderation, RSVP, employment verification and audience-specific read policies are not yet implemented.

Pulse media bucket is private; only the owner can upload/read pending media. No public image access is granted.

The new `mobile/src/creation.js` validates inputs, checks current access policy, creates exactly one pending record, and reads it back under owner RLS before confirming success. In uncertain network outcomes it does not delete already-uploaded media because a row might have been committed. The UI keeps error state and reports confirmed submissions as **Saved for review**, never Published.

`FeatureLandingScreen` displays real **My submissions** rows and review state. Missing or undeployed tables are reported honestly instead of showing fake records.

## Release blockers

- Security review and explicit owner authorization before applying the migration to production.
- Implement actual moderation decisions and approval workflow; until then no pending submission becomes public.
- Build publishing/discovery, RSVP, Crew membership and Gig application permissions separately with suitable teen protections.
- Test signed-in adult and teen accounts, guardian consent, quiet hours, upload size/type, offline/double-submit, correct owner RLS, and missing tables.
- Expo Doctor + Android JS export checks validate bundle only; native APK needs later approved EAS build and device QA.
- **No APK build started or requested in this correction.**
