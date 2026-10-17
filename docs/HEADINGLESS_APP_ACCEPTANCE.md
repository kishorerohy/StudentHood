# StudentHood — Universal heading-free page navigation
Status: Draft PR #21, device QA pending, no APK triggered.

## UI contract
- Across main StudentHood screens, remove large repeated page headings, subtitles/kickers and oversized empty top space. The global StudentHood logo, navigation controls and the bottom dial already communicate the app context.
- Use shared CompactPageBar across non-tab screen headers: a tappable, 43px accessible back control and compact right-side functional actions in a 55px bar. No heading text occupies the center.
- Scenes tab: remove "YOUR CAMPUS, RIGHT NOW" and the large "Scenes" label and redundant "Happening around campus" heading. Keep campus picker/status, youth indicator, filter chips, heading-free + Pulse soon and real friend Pulses, and scene content.
- Discover and Drops: no large Discover/Drops titles; preserve Back, icon, Drops refresh, Discover refresh, filters, list and user interactions.
- Ping: no standalone giant "Ping", Compose, Settings, Search or History page heading. Preserve one-tap header name/avatar to open per-student settings, plus back/compose/refresh and account-level block controls.
- Creation, Edit Profile, institution picker modal, profile menu, reporting review and Hangs/Crews/Gigs feature pages use compact title-free navigation. Preserve editor labels, Save/Cancel actions and search/query modes.
- A student's FULL NAME on their profile, a conversation contact name, labels that identify forms and buttons, essential safety/onboarding/guardian instructions, and content itself are NOT "decorative page headings" and MUST remain legible. Avoid removing them.
- This change is universal: no hardcoded account IDs, named campuses, device targets or per-user exceptions. Both light/dark share the same layout.
- No Supabase schema change is needed. No build submission is part of this PR.

## Device QA
1. Scenes: global wordmark still visible; intro large title absent; campus and teen settings visible; Pulse row and filter chips don't overlap system status/navigation bars or bottom dial; feed scroll behaves normally.
2. Drops and Discover: no page title; back, refresh, filters and Peep profile navigation still respond to presses; correct screen reader labels.
3. Ping inbox: no page title; Compose and Refresh still work. Conversation name/avatar must remain tappable for settings; search/history/Block and message text remain accessible.
4. Create menu and Pulse/Hang/Crew/Gig editors: no page title; Back/Save/create action, field validation, keyboard and audience settings still work.
5. Edit Profile and global/local institution modal: no large heading; back, mode changes, search, Save and system inset protection still correct, especially Android punch-hole phones.
6. Profile and profile options: name/photo visible; settings tabs/content and back accessible; no empty title-sized gaps.
7. Reporting/moderation: named actions remain clear and accessible even though the redundant title is hidden.
8. Light/dark, small/tall Android, zoomed text, tablet widths and screen readers; no cutoffs or dead buttons.
9. Privacy/guardian gates, scene reporting, blocked Ping and personal data remain as before.
10. After an owner-authorized consolidated native APK only, physically verify all of the above. CI export is not physical device evidence.

## Release
This is stacked on PR #20, which includes #19, #18 and #17 fixes. It must be integrated coherently into ONE approved Android release later, with the strict one-EAS-submission-per-Asia/Kolkata-day rule.
