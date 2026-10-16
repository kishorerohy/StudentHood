# StudentHood — Edit Profile institution picker layout QA

Reported: 16 October 2026 Android screenshot, 6:19. The full-screen "Institutions in Chennai" picker places its title too close to or behind the Android status bar.

## Correction staged

- Wrap the separate native full-screen Modal in its own safe-area provider and safe-area view for top/bottom/horizontal insets.
- Respect the Android status bar, punch-hole camera and navigation gesture bar. Never add an arbitrary top spacer.
- Keep back arrow, context title and refresh within a 62px header, and truncate long city titles.
- Limit header/filter/results width on tablets and in landscape.
- On Android, rely on the existing softwareKeyboardLayoutMode=resize; avoid a second KeyboardAvoidingView height reduction.
- Keep Nearby/Country/Worldwide modes, filters, Search and result selection reachable with keyboard open.
- Reduce excessive result-list bottom padding while respecting bottom safe area.
- Current installed APK does not contain these changes and lacks the newer search tabs.

## Physical acceptance tests

1. Android portrait with hole-punch and gesture navigation: title and controls remain below the status bar.
2. Light/dark theme: status/navigation icons and modal content have sufficient contrast.
3. Larger font and long city names: title truncates instead of overlapping refresh/back.
4. Android keyboard in Nearby/Country/Worldwide searches: filter, Search and results remain accessible.
5. Smaller handset, landscape and tablet: usable widths and no clipping, last row accessible.
6. Empty city directory: Retry remains visible.
7. Selecting an institution returns to Edit Profile and Save persists the chosen value.
8. Other screens including onboarding are unaffected.

Draft PR #15 depends on #14, #13, #12 and #11. White startup PR #10 is separate. No APK submission without owner approval; at most one official Android EAS submission per Asia/Kolkata date.
