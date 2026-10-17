# StudentHood universal heading-free primary screens
Status: draft PR #21, based on prior PR #20. No APK build submitted.

## Owner's design rule (17 October 2026)
Remove the prominent screen title and decorative redundant section headings from every main navigation page: Scenes, Ping, Drops, Hangs, Gigs, Discover and own Profile. Extend identical visual policy to Crew/Pulse feature landings and permitted visited profiles because they use the same components. **Do not change the rule for particular users, campuses, accounts, countries or themes.**

### Layout changes
- Scenes: remove the large Scenes title and marketing kicker. Keep a compact campus/location chip, visible teen-safety indicator and horizontal **+ Pulse soon** then real eligible mutual-Peep Pulses. The LIVE shortcuts retain filters but no decorative "Happening around campus" title.
- Ping: remove repeated Ping / Compose Ping / settings / history screen mastheads. Retain the back and refresh/compose icons, and **keep the contact's actual name and photo tappable in the conversation header** (their Ping settings entry point). Keep search input and setting-row labels.
- Discover/Drops: no page title/wordmark duplication; keep back and functional icons, filters, campus context, refresh and Peep-request controls. Discoverable student cards need no extra "Find your people" heading.
- Hangs/Gigs and shared Crews/Pulse landing: remove big header/eyebrow and redundant marketing hero/title text. Keep back, service context, feature cards, filters and Create actions.
- Own/visited Profile: preserve the student's real name, profile photo, cover, usernames, statistics and identity. Remove the redundant "Scenes" section heading above grid; accessibility still identifies the grid.
- Keep informative card text, navigation labels, actual student names, safety/status messages, search placeholders, form labels and confirmation dialogs. These are **content or controls**, not page mastheads.

## Regression and QA
- Mandatory CI script `mobile/scripts/check-headerless-primary-pages.js` confirms all requested primary views lack redundant headings and retain navigation and functional actions.
- Run the existing single-white-branded-startup, Pulse privacy, immediate publishing, Ping blocking and Expo Doctor / Android native config / bundle export checks on the same branch.
- Physical device QA: dark and light theme; small Android handset with cutout; large font; bottom navigation; back button and filter switching; Ping conversation header opens settings; no hidden Create buttons or clipped content; cover/profile names remain visible; read-only other-user profiles retain identity.
- A previous signed APK is unaffected until a new, owner-approved EAS Android build; no EAS submission from this PR. Max one EAS Android APK submission per Asia/Kolkata calendar day.

## Non-goals
No changes to user data, Supabase age/guardian rules, Scene moderation, privacy/RLS, account permissions, Ping messages, or published content. This is a universal client layout update.

## Additional Crews-specific verification
- The Crews landing page uses the same heading-free FeatureLandingScreen as Hangs/Gigs/Pulse; there is no Crews masthead or decorative 'A place for every Crew' empty-state headline. Explanatory empty-state copy remains.
- The Create a Crew editor hides the top Create a Crew title and duplicated STUDENTHOOD · CREATE label. Required Crew name, category and description field labels remain visible, along with the Save/Create button and back action.
- The shared creation menu has no generic Create heading but still includes the actionable Create a Crew option.
- Universal CI asserts the heading-free Crews landing, empty state, editor and creation selector, along with preserved actions. No account-specific exceptions.
