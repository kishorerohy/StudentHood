# StudentHood — Single branded startup screen (Android)
Status: code fix staged. Physical Android acceptance pending; a new binary is required.

## Evidence
Owner's two consecutive v0.1.9 launch photos (17 Oct 2026 IST) demonstrate two different branded surfaces:
1. Native Android logo-only splash, centered on white (partially cropped logo).
2. React startup page with approved StudentHood wordmark, `YOUR CAMPUS. YOUR PEOPLE.`, and `Opening StudentHood…`.

The earlier v0.1.9 PR #10 used `studenthood-logo-light.png` both as native logo and React logo, but **the native surface never contained the tagline**. That produced two visibly distinct branded screens despite a shared white background.

## Corrected launch contract
- Android 12+ mandates a system-native startup window. It cannot be entirely removed.
- Native splash (light AND dark) is **plain #FFFFFF**, using a 4x4 all-white PNG at 1dp image width, **with no brand logo**. Android app launcher icon and approved brand assets are unchanged.
- The React `StartupScreen` is the **only** page showing the approved StudentHood logo + `YOUR CAMPUS. YOUR PEOPLE.` + status `Opening StudentHood…`.
- Native-to-React handoff occurs after the first React layout/paint frame, with no native animation fading one logo into another.
- Startup profile restoration, guardian consent, underage policy checks and session routing are unchanged. Do not bypass them for launch speed.
- Keep React startup in white in both Android themes; after restoration, the normal app can use the user's selected theme.
- Guard `mobile/scripts/check-single-startup.js` runs on every Android CI to reject reintroduction of a logo-only native splash or deletion of the approved React design.

## Physical acceptance criteria for next authorized APK
1. On Android (camera cutout/gesture-nav handset), force-stop and cold-open. Confirm **no separate logo-only StudentHood image ever appears**, only the single logo+tagline React page after the unavoidable blank Android startup frame.
2. Repeat 5 cold starts and 5 warm starts, both light/dark, including slow network. Check white native window, no dark intermediate screen, no duplicated logo.
3. Authenticated adult: startup transitions to Scenes; signed-out: login; first-time: onboarding; guardian-restricted: proper gate. No bypass or premature content.
4. Error/timeout: show Retry connection on same approved white branded page.
5. Take video/screenshot evidence of first visible branded frame, not just a still photo after loading.
6. Validate the exact new APK versionCode before comparing screenshots; updating JavaScript over-the-air does not replace native splash asset.

## Release rule
Fix is in a draft PR only. Do **not** submit another official EAS Android build without owner approval; retain the strict max one submission per Asia/Kolkata calendar day. The 16 Oct v0.1.9 APK cannot be fixed at runtime because it embeds the logo-only native splash.
