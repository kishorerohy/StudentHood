# StudentHood — Complete Correction Ledger

Last reviewed: 10 October 2026 (IST). **Always include all 12 corrections at the end of StudentHood development replies, even after a build, until verified on device.**

## Release checkpoints
- Live installed baseline: **v0.1.7**, Android versionCode **8**, Expo build c82f47fe-5056-454a-bbe3-d25d86562528, submitted 9 Oct.
- Owner approved the **one consolidated v0.1.8 APK** on 10 Oct. GitHub **PR #9 merged** to main. Android versionCode **9**. Mainline CI passed.
- **GitHub EAS submission successful 10 Oct 2026**: workflow https://github.com/kishorerohy/StudentHood/actions/runs/38050929041, Expo build ID `ef509aea-4f0b-4385-a6dc-ee7c376010bb` (https://expo.dev/accounts/studenthood-0920/projects/studenthood/builds/ef509aea-4f0b-4385-a6dc-ee7c376010bb). This is a submitted/queued build until EAS reports success and owner installs it. No second APK today.
- Do not equate GitHub CI, Supabase deployment or an EAS request with device verification. Real handset QA follows the new APK.
- **One official Expo EAS Android submission maximum per Asia/Kolkata calendar day.** No native rebuilds or build retries without checking the daily cap.
- Production SQL migrations for secure Scene-link Ping shares, Discover sharing Peeps, private independent cover photos, safe campus normalization, restricted human moderation, private profile reporting, cover path owner guard and cover column update grant were applied on 10 Oct.
- Supabase `institution-search` Edge Function v3 is active with second Overpass provider fallback. Authenticated production device lookup still needs a real test.
- **Scenes are moderation-gated:** all 3 existing production Scenes were `pending` when inspected Oct 10; no human moderator reviews have been performed. An approved adult reviewer must be authorized and review content manually; never auto-publish pending Scenes.
- The current Ping **only supports sharing a moderated Scene link to eligible mutual Peeps**; general text messaging is not falsely advertised as live.

## All twelve corrections

| # | Reported correction | In PR #9 / backend | Remaining validation |
|---|---|---|---|
| 1 | Discover scrollable student cards with photo, campus, interests, Add Peep | Implemented in `DiscoverPeoplePanel`, privacy-aware API and `TopHubScreen` | CI and real Android |
| 2 | Lower form inputs visible above Android keyboard | Carried forward from PR #8 v2 keyboard hook | Real Android keyboards |
| 3 | City-based canonical institution picker, GPS optional | PR #8 + Edge Function v3 fallback/caching, searchable Edit Profile city results | Authenticated city query and device QA; **true global canonical external-ID storage/backfill and alias registry remain outstanding** |
| 4 | Independent profile cover and borderless bottom fade | Cover storage/RLS and upload grant, signed URL, SVG fade | Android cover upload/display, light/dark |
| 5 | Profile three-dot beside Ping | Own action menu and visiting-user three-dot report menu | Android navigation/report tests |
| 6 | Floating elevated profile picture | Avatar overlap, elevation/shadow | Device light/dark QA |
| 7 | Globally unique usernames, coloured availability | Red exact unavailable string and SVG gradient availability; existing SQL unique check | Duplicate race/onboarding QA |
| 8 | Campus Edge Function HTTP 503 onboarding blocker | v3 fallback plus real error parsing; cached directory | Authenticated request/503 retry device QA |
| 9 | Replace radial Scene sharing with Peeps-first bottom panel | New `SceneShareSheet`, database RPC privacy checks, Ping-only link inbox, installed app checks | Device app availability and correct mutual-Peep delivery |
| 10 | Remove duplicate startup logo | Keep native splash until auth route resolved and avoid repeated branded pages | Android cold/warm startup QA |
| 11 | Other eligible students' Scenes from campus | Campus default feed + normalized campus matching + privacy-safe moderation queue | Actual **reviewed** Scenes and user-to-user testing; pending Scenes remain intentionally hidden |
| 12 | Swipe left on full-screen Scene → actual creator profile | Improved PanResponder and author ID navigation | Android gesture QA |

## Critical open gates
- Automated Expo Doctor, native introspection, Android JS export must pass at latest release HEAD.
- Validate production role grants/RLS on new tables/functions before release.
- PR #9 must merge to `main` before the sole owner-approved EAS APK submission. Confirm successful EAS workflow submission, then obtain actual Expo artifact link.
- True worldwide institution-ID/alias deduplication is **not fully complete**. Do not claim every campus in the world has a unique canonical ID solely from name normalization/OSM.
- Authorized adult moderator must review existing pending Scenes for other users to see them; never bypass age, guardian, content or RLS safeguards.

## StudentHood rules
Use only Scenes, Pulse, Peeps, Ping, Drops, Hangs, Crews and Gigs. Never call Scene media a reel or clip. Ping shares/notifications stay solely in Ping, never Drops. Preserve logo, onboarding safeguards, privacy, age verification and guardian consent. Never delete real users automatically.
