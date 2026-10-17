# StudentHood — Per-conversation Ping settings / universal account blocking
Status: production Supabase migrations applied; draft PR #19 includes Android UI and depends on PR #18. No APK submitted; two-device QA required.

## Behaviour
- In any one-to-one Ping thread, **tap the contact name/avatar in the HEADER** to open that conversation's Ping settings. The old separate profile-shortcut row directly under the header is removed.
- Settings: Conversation history (paged, load older), Search in chat (search all retained messages with paging), View profile (only when permitted), Block student and Unblock student (with explicit confirmation).
- Blocking is universal for ALL pairs of distinct users, not tied to any named users, device IDs, test accounts or a specific conversation. Both directions of new Ping messages, Ping-request acceptance, new Peep requests/acceptance, Scene visibility, Scene Ping sharing, profile discovery and other interaction paths governed by the existing shared checks are denied. Existing conversation history stays viewable by its participants after blocking. No messages are deleted; pre-existing Peep record persists and becomes effective again if unblocked.
- Storage: private.studenthood_ping_blocks with RLS enabled and NO direct anon/authenticated table grants. Only user-owned block/unblock RPCs can change it. A status RPC reveals only the caller's own action, NEVER whether the other account blocked them.
- All message inserts use a server BEFORE INSERT trigger, catching existing active threads AND old Android APKs; client buttons alone do not enforce privacy.
- History and search SECURITY DEFINER RPCs verify signed-in participant and app-access policy. No unauthorized thread IDs, data leaks or cross-user search.
- Original guardian, under-18, timezone and app access restrictions remain; block is not a way to bypass these.
- Separate Hang Chats/Crew Chats are still unavailable and should not be mislabeled as working.

## QA matrix
1. Open Ping on two Android phones logged in as distinct permitted users. One sends Hey, the other replies Hi. Verify both sides see matching message history in both light/dark.
2. On each device, tap NAME/AVATAR in Ping header. Settings open; no duplicate profile shortcut row. Back returns to thread without losing message draft or breaking scroll.
3. Search "hey" (case insensitive), irrelevant query, 1-letter query, large number of messages (>150) and pagination. Search must be limited to selected thread; other users' messages never returned.
4. Conversation history view, load older repeatedly with stable cursor; after navigating back, recent thread still displays.
5. User A blocks B; A's settings show Unblock. B cannot send messages or create Ping requests to A, A cannot message B; existing history is still accessible on both devices. No UI-only block.
6. After block: try a client with the previous APK, directly invoke old send RPC, accept a pending Ping request, send a Peep request, accept a pending Peep request, share a Scene into Ping, discover/view profile and view a private/campus Scene. Verify security denied server-side where applicable.
7. Blocked person's block preference is not disclosed to the other user. Reports/takedowns stay possible via safety tools.
8. Unblock restores allowed interactions subject to existing privacy/age rules. Existing accepted Peep status is restored, documented in confirmation. Does not unblock any other user.
9. Anonymous cannot call read/search/block functions or read private block rows; participant-only thread history; no token/PII leaks.
10. All existing StudentHood modules pass CI: one branded launch, immediate publishing, existing profile displays, institution picker and EAS native export.
11. Handle offline, slow refresh, denied permission, small Android screen, keyboard overlap and session switch to a different signed-in account.

## Release
No official APK has been built or submitted. Stacked draft PR #19 depends on draft PR #18; retain one-build-per-Asia/Kolkata-day rule and request approval before merging/building. Automated CI is not real 2-device runtime verification.

## Live deployment confirmation (17 Oct 2026)
- Migrations `ping_universal_blocks_and_conversation_search` and `ping_generic_block_ux_status` applied to Supabase production successfully. Existing RLS eligibility functions updated in place (no OID-renaming loophole). The block checks were confirmed in Peep, profile discovery, can-Ping, Scene visibility, Drops and incoming Peep request functions.
- The private block table denies direct anonymous and authenticated reads; message insert/Peep request/Ping acceptance block triggers are enabled.
- The status RPC also returns a non-specific `interaction_available` flag, letting **both** phones disable blocked reply controls without exposing which person initiated the block. The caller only sees their own `blocked_by_me` flag.
- At verification: **zero account blocks created**, one existing thread and two existing messages retained; no user was blocked or deleted by engineering.
- CI validates these contracts and Android build export, but cannot prove user-facing behavior until installation.
