# StudentHood keyboard obstruction fix — Android and iOS

Date: 2026-10-09
Status: implemented in draft PR #7; no merge, no APK build.

## Bug reproduction
In the installed Android v0.1.6, opening Edit Profile and tapping the lower city or school/college/university input caused the Android on-screen keyboard to overlap and obscure the focused field. This is especially apparent on smaller screens and taller third-party keyboards.

## Proposed correction
1. Expo Android app configuration sets `softwareKeyboardLayoutMode: 'resize'`. Requires a new APK because the Android window keyboard setting is native configuration, not an OTA UI change.
2. A reusable `useKeyboardAwareForm` hook remembers the currently focused TextInput and asks the owning ScrollView to reveal its native input handle when focus changes, when the keyboard is displayed, and when the scrollable viewport changes.
3. Edit Profile uses the hook for editable full name, bio, city and institution; keeps Save in the fixed header and increases scroll padding below the final field.
4. Profile onboarding uses the same keyboard reveal for full name, username, city, bio and interests; its full-height scroll area retains enough space to show the last field.
5. Pulse, Hangs, Crews and Gigs composers use the same solution for every editable text field. New Scene composer receives keyboard avoidance, focused-field scroll, and extra padding.
6. Scene comments retain a keyboard-resized composer above the keyboard and no forced keyboard dismissal on Android.
7. Sign-in and Sign-up also use the shared keyboard-aware input focus and extra scrolling clearance so email/password inputs cannot be obscured on smaller screens.

## Testing required on real device
- Small Android handset and iOS: focus city and university at the bottom of Edit Profile. Input label and typed text must be visible above the raised keyboard.
- Focus / unfocus each input in order and in reverse order, including multiline bio, with both Gboard and third-party keyboards where available.
- Confirm the user can scroll while the keyboard is open and the Save button remains reachable.
- Dismiss keyboard using Back; no jump to the top or lost unsaved edits.
- Repeat on sign-in/sign-up (email/password), onboarding (interests), Scene composer, Pulse, Hangs (location/capacity), Crews (description), Gigs (pay/currency), and Scene comments.
- Test screen rotation and font-size/accessibility scaling; iPad and landscape where supported.
- Confirm app Save and submission values still persist; keyboard UI changes are unrelated to Supabase permissions.
- Run Expo Doctor, Android Expo config introspection and JavaScript bundle export on PR head. These are static checks, NOT proof of keyboard layout on a real device.

## Release control
Leave PR #7 as draft and unmerged. Do not queue an APK without explicit user approval; previous user requested build hold. This fix is not present in the installed Android v0.1.6 APK.

## Follow-up: persistent keyboard obstruction reported after v0.1.7 — 2026-10-09

The owner confirms the Android keyboard still covers lower app content despite the previous `softwareKeyboardLayoutMode='resize'` setting. Root implementation defect confirmed: the old `useKeyboardAwareForm` passes `onFocus.nativeEvent.target` (a native target identifier) to `scrollResponderScrollNativeHandleToKeyboard`. This is not a reliable measurable TextInput ref under React Native 0.81 / newer architecture, so the request may be silently ignored.

### Correction v2 (branch `fix/keyboard-visible-fields-v2`)
- Use `TextInput.State.currentlyFocusedInput()` as the actual measurable focused TextInput.
- Measure its rectangle and the owning scroll viewport using `measureInWindow`; use reported keyboard `screenY` to identify the usable visible area.
- Scroll by the required delta only, preserving input label clearance and scrolling upward when an input is above the viewport.
- Retry focus reveal immediately and after 90ms/260ms for Android keyboard animation and layout updates, including keyboard-frame changes.
- Track the ScrollView scroll position with `onScroll` and add temporary bottom padding only when the keyboard overlaps the scrollable viewport; clear on keyboard hide.
- Apply to Edit Profile, profile onboarding, sign-in/up, Scene composer and Pulse/Hangs/Crews/Gigs composers; do not let the nested institution-picker search use the parent scroll ref.
- Keep iOS automatic keyboard inset handling and native Android adjustResize as complementary behavior.
- No DB schema changes and no account/safety-policy changes.

### Must manually verify before claiming fixed
1. Install a *future explicitly approved* APK containing this branch and reproduce the exact reported City and School/College/University case.
2. Tap University with Gboard shown; field and field label must be above keyboard, and cursor visible. Repeat with a taller keyboard and landscape.
3. Reopen Edit Profile and switch between Bio, City and University without dismissing keyboard; scroll should neither jump to top nor oscillate.
4. Confirm Save in the top bar works, and dismissing Android keyboard with Back retains the form values.
5. Repeat for the final inputs in onboarding and each creation form, including number keyboards.
6. Verify the country/institution full-screen selectors retain their own navigation and the keyboard only shifts the relevant pane.
7. Expo Doctor, native config introspection, and Android JS export must pass; these static tests do not substitute for on-device keyboard measurement.
8. This release branch must remain unmerged until approved; owner one APK/day cap remains in effect.
