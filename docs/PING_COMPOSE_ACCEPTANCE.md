# StudentHood — Ping Compose and secure test acceptance
**Status:** New compose/text messaging staged in source; production backend deployment and Android device QA are tracked separately. This is not a guarantee of zero bugs.

## Product behaviour
- Ping home: Compose button, conversation inbox, Peeps tab, **message** Requests tab, with separate placeholders for unavailable Hang and Crew chat.
- Compose: select a permitted person from discoverable same-campus students or accepted mutual Peeps, or open Ping from a permitted profile. Text up to 1500 chars; invalid/empty text is rejected.
- First message to a non-Peep creates a **single consent-gated Ping request** if both accounts are eligible and the recipient permits campus messages. Sender may not send follow-ups until accepted.
- The addressee accepts or declines the Ping request in **Ping > Requests**. Declining blocks future messaging on that pair.
- Accepted mutual Peeps can message immediately; accepted adult non-Peep requests can continue via explicit consent even if the sender later selects Peeps-only, but none permission blocks inbound.
- Threads refresh about every 12 seconds, open messages about every 10 seconds, with manual refresh.
- Existing Peeps friendship requests stay in **Drops**. Ping messages and message requests stay in **Ping**.
- Existing Scene shares in Ping remain accessible.

## Backend design
- Two new RLS-enabled tables: participant pairs and private text messages, no table-level grants to public/anon/authenticated clients.
- SECURITY DEFINER functions protect participant identity, recipient eligibility, accepted threads, one introductory message, age/guardian policy, recipient teen quiet hours, signed-in app access and message length.
- RPCs: studenthood_ping_send, studenthood_ping_threads_list, studenthood_ping_messages_list, studenthood_ping_request_decide.
- An internal eligibility function cannot be called by anonymous or authenticated app roles; no public youth-age probing.
- One on-platform introductory request per user pair. No direct peer row IDs, student emails, DOB, or contact details are returned to strangers.
- Rate limit at most ten new threads/hour, one message per second for a sender/thread. No web notification or encryption claims.
- Read last 200 messages per thread, sorted oldest-to-newest for display. Long-history pagination is a future requirement.
- This initial version is text-only and not end-to-end encrypted. Do not call it full-featured group chat.

## Real-world QA checklist
1. Two eligible adult test profiles, same campus, one with campus Ping permission: compose introductory Ping, recipient accepts, both can respond and reopen conversation.
2. Test sender whose permission is Peeps-only and accepted thread: recipient replies after acceptance. Target setting None blocks further inbound text.
3. Non-Peep request can contain only one introductory message until accepted; attempting a second should show a clear error.
4. Declined message request stays closed. Sender cannot revive the same thread.
5. Mutual Peeps can send directly. Confirm no false friendship changes from accepting a message request.
6. Under-18 or guardian-approval-pending account cannot bypass any quiet hours/consent restrictions; an ineligible recipient cannot receive a new Ping.
7. Signed-out and unrelated account cannot read any thread content, and requester cannot approve their own request.
8. Ping scene links still work. Peeps activity stays in Drops, message requests remain only in Ping.
9. Test keyboard overlays, navigation, slow network/errors, repeated button taps, light/dark mode, text up to 1500 chars, reopen after app restart.
10. **Do not use real user credentials or automatically alter live Peep or Ping requests for QA.**

## Test-profile access
Eligible test accounts can use the *same* feature routes and permissions as any other eligible account. No unrestricted bypass of age, guardian, privacy or RLS controls is added. If a dedicated seeded fixture/test account is desired, ask before creating one; do not change production users.

## Release
PR #14 builds on PR #13, includes pending #12 and #11 changes. White startup PR #10 remains separate. No APK without separate owner approval; max one EAS Android submission per Asia/Kolkata date.
