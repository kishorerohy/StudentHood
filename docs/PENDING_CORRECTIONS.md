# StudentHood — Pending Corrections Register

**Owner instruction (10 October 2026, IST):** Include the complete pending-corrections register at the end of **every StudentHood development reply**, in this and future chats, until the owner **explicitly authorizes the next consolidated APK build**. At each build approval, first check this file, pending PRs, CI and Expo release status; confirm which entries enter that build. Do not silently omit previously reported bugs, and do not merge/build automatically. Update this file when corrections are added, implemented, tested, released or reopened.

**Status legend**
- `BACKLOG`: requested, not fully implemented.
- `IN DRAFT`: code staged outside `main`, not in an installed APK.
- `BACKEND LIVE`: server change deployed; mobile feature may still require an APK.
- `IN v0.1.7 / QA`: included in released source, not necessarily verified on owner's Android handset.
- `DEVICE QA`: a real handset test is required; CI alone is not sufficient.
- `RELEASED + VERIFIED`: user confirms behavior on installed APK (do not mark prematurely).

## Release checkpoint
- GitHub repo: `kishorerohy/StudentHood`; approved mainline merged PR #7.
- Most recent consolidated APK request: **v0.1.7**, Android `versionCode 8`, Expo build ID `c82f47fe-5056-454a-bbe3-d25d86562528`, submitted 9 October 2026 (IST). GitHub EAS submission succeeded. Check Expo to confirm current build status before claiming APK installed or finished.
- Current pending mobile changes: draft **PR #8** `fix/keyboard-visible-fields-v2`, not merged.
- Other requested but not fully committed: Discover personalized-card redesign. Branch `fix/discover-personalized-cards` exists but its proposed `DiscoverPeoplePanel` implementation was **not verified to exist**. Do not mark as implemented.
- **Daily release policy:** max one Expo EAS APK submission per Asia/Kolkata calendar day; each new batch needs explicit owner approval. Never infer build approval from having a completed list. CI and GitHub docs updates do not count as APK builds.

## Active corrections for NEXT owner-approved build

| ID | Requested correction / acceptance outcome | Work status | Release gate |
|---|---|---|---|
| K-01 | **Edit Profile keyboard obstruction**: tapping City / University / Bio moves input and label fully above Android keyboard; no hiding of typed text; Save reachable. | IN DRAFT — PR #8 revised keyboard measurements, bottom padding and Android height fallback | DEVICE QA; not in v0.1.7 |
| K-02 | **All lower text fields**: same safe keyboard handling in sign-in, account setup, Scene creation, Pulse, Hangs, Crews, Gigs and comments, including tall keyboards and keyboard closing. | IN DRAFT — PR #8 | DEVICE QA |
| I-01 | **City-to-institution search on onboarding**: entering/detecting a city and country lists real schools, colleges and universities; does not require GPS permission. | IN DRAFT — PR #8 mobile; BACKEND LIVE institution-search v2 | Authenticated service + device QA |
| I-02 | **Edit Profile institution dropdown**: city-specific searchable school/college/university results replace free-text campus field. City changes clear stale campus choices. | IN DRAFT — PR #8 mobile | DEVICE QA |
| I-03 | **Reliable institution service**: report provider errors and no matches; city cache and Nominatim rate-limiter; protect privacy. | BACKEND LIVE — `institution-search` Edge Function v2 and private `institution_city_cache` / `institution_provider_slots` tables | Confirm end-to-end authenticated city lookup in real app; OSM is not exhaustive |
| I-04 | **One canonical ID for each campus**, global institution identity and aliases: avoid duplicate campus communities even when users type different names. | BACKLOG — current `profiles.campus_name` is text; OSM IDs returned by API aren't yet permanently mapped to user campus IDs | Design/review DB migration, safe existing-account backfill, and discovery-function update; no unreviewed production schema change |
| D-01 | **Discover premium student cards**: horizontal swipeable People cards with photo, username, campus, shared interests and working Add Peep action, respecting teen/privacy restrictions; light/dark design. | BACKLOG — current Discover is vertical campus list; design not merged/verified | Implement + CI + DEVICE QA |
| D-02 | **Discover navigation**: Keep People/Hangs/Crews/Gigs discover sections and ensure See all opens the full People page, with real campus students; no inert links. | IN v0.1.7 / QA — See all wired in PR #7; full Discover redesign outstanding | DEVICE QA |
| R-01 | **Regression check: startup and Scenes actions**: approved logo splash, existing completed account goes to Scenes, Scene three-dot menu works, Scene radial share country rules, comments, and account safety remain correct. | IN v0.1.7 / QA — PR #7 shipped in source | DEVICE QA/retest after next consolidated build |
| R-02 | **Profile, username and campus reliability**: globally unique usernames with exact duplicate warning, country/location handling, privacy-safe campus discovery, saved profile/Peep state. | IN v0.1.7 / QA (some previous backend fixes live); canonical campus ID work still backlog | DEVICE QA/retest |

## Already consolidated into v0.1.7 (do not mislabel as new pending code)
- Main navigation: Scenes / Hangs / + / Gigs / Profile; Discover / Drops / Ping in header.
- Full Scene creator profile and profile UI; other-user Peep request flows and profile permissions.
- Scene comments, Scene link sharing, approved anchored semi-circular Share fan with installed-app/region logic, functional three-dot options, See all route.
- New creation UI for Scenes, Pulse, Hangs, Crews and Gigs; pending submission database tables and RLS.
- StudentHood logo startup/routing checks, light/dark brand assets, profile fields and initial keyboard correction.
- Functional shells do **not** imply live Ping messaging, full Gigs application flow, Crew membership or RSVP backend; those larger services remain separate roadmap work.
- The owner reported **persistent keyboard overlap, missing city/university list, and incomplete Discover** after this build. These remain active in K/I/D above; do not close based solely on the v0.1.7 CI success.

## Checklist for each future ChatGPT reply
1. **Answer the immediate user question first.**
2. Append `### StudentHood corrections awaiting next build` and show **all active IDs K-01 through R-02**, with short one-line statuses, grouped to avoid excessive scrolling.
3. When a new correction is requested, assign a new ID and update the register in GitHub; carry it forward in every response until next explicit build approval.
4. Differentiate `IN DRAFT`, `BACKEND LIVE`, `CI PASSED`, `DEVICE QA`, and `RELEASED + VERIFIED`. A GitHub commit is never evidence of a device fix.
5. State PR/merge and APK-release status, **whether the one-build/day limit has been used**, and refrain from new Expo submissions until user approval.
6. At build approval, form a new batch/checklist, update `PROJECT_STATE.md` and reset shipped items to post-release QA rather than losing them. Keep unresolved defects carried forward.
7. Preserve StudentHood product names, brand, account/privacy/guardian safety checks, and separation of Ping message alerts from Drops.

**Sources of truth:** GitHub `main`, PR #8, EAS project `studenthood-0920/studenthood`, live Supabase `studenthood-production`. Do not rely on chat-only memory for the checklist.
