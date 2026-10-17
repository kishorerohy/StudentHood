# StudentHood Discover — student search results visible above Android keyboard

User screenshot 17 October 2026: entering "vikram" under Discover still displayed large People/Hangs/Crews/Gigs tiles and the Android keyboard covered the actual matching profiles. The old Discover only locally filtered the first 100 campus students, so eligible globally discoverable accounts outside that list were never searched.

## Corrected universal behaviour
- Discover retains its compact, **heading-free** back/icon row per prior correction #22.
- Before typing: campus recommendations and People/Hangs/Crews/Gigs navigation tiles are available.
- After typing **any character**: hide category tiles and preloaded campus carousel. Display search feedback/results immediately below input. No second page or extra headings.
- At 1 character: "Enter at least two letters to find a student."
- At 2+ characters: 350ms debounced server search of name or @username; stale requests do not overwrite newer queries. Search does NOT stop at the first 100 students, while limiting results to at most 30 to avoid data crawling.
- Visible results show permitted student's avatar, full name, username and campus, with a working link to their full profile. No generic fake users or forced Peep relationship.
- Search button dismisses keyboard. Results can be tapped while Android keyboard is up, and content scrolls and dismisses keyboard appropriately.
- Clear search dismisses keyboard, restores category navigation and campus recommendations; errors and no-match states are explicit.

## Security
- Database RPC `studenthood_search_discoverable_students` is authenticated only, requires current `app_access`, completed target onboarding, and the existing per-user `studenthood_can_discover_profile` check.
- The existing check denies blocked users and disallowed adult/minor, private or campus-only profiles. Mutual Peeps are discoverable subject to access; the function does not expose private age, guardian or contact information.
- Search is global to *permitted* users, not a promise to expose every StudentHood profile regardless of privacy. An individual record matching "vikram" exists, but its accessibility to the testing account has not been confirmed.

## Acceptance tests
1. Search "vikram" from a small Android device with keyboard open: hide all four category cards and show matching authorized profiles directly below search.
2. Tap a result while the keyboard is visible; open the full correct student profile.
3. Search by case-insensitive full name, partial name and username; reject 1-character remote searches and clear on empty.
4. Change query rapidly: no stale old-name results; show clear loading/no-results/error states.
5. Search outside campus: show only discoverable public profiles or accepted Peeps. Hide other-campus `campus` profiles, private accounts and restricted underage accounts.
6. Block an account: it disappears from search; unblock restores it only when allowed by normal privacy settings.
7. Clear query: original category tiles return; People, Hangs, Crews, Gigs navigation and campus Peep cards remain functional.
8. Verify no title mastheads reappear, both light and dark themes work, font scaling/keyboard and scrolling remain accessible.
9. Run all existing guards: single branded launch, universal heading-free pages, publishing privacy, Ping blocking, Peeps Pulse, Expo Doctor and Android bundle export.

## Release
This change is staged in draft PR #23 building on draft PR #22. Supabase migration is separate from Android binary. Do not submit an Android EAS APK without explicit owner approval; maximum one official EAS submission per Asia/Kolkata date.
