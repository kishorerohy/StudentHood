# StudentHood Mobile

Native Expo/React Native UI for iOS, Android and tablets.

## Android preview validation and EAS build

Install the committed dependencies with `npm ci --no-audit --no-fund`, then run:

```sh
npx expo-doctor@latest
node --test scripts/verify-eas-build.test.cjs
npx expo export --platform android --output-dir dist
```

The JavaScript export is validation only; it does not produce an APK or compile
the native age-signals module. Official APKs are built only on Expo EAS using
the existing `preview` profile, owner, project ID, Android package and signing
credentials.

The owner must privately create an Expo access token with access to the existing
`studenthood-0920` project and configure it as the GitHub Actions repository
secret `EXPO_TOKEN`. Use GitHub Settings → Secrets and variables → Actions;
never paste the token into an issue, pull request, chat, or log.

After build approval, run **StudentHood Expo EAS Android Preview** from GitHub
Actions for the reviewed commit. The workflow freezes signing credentials,
waits for EAS completion, and checks the returned status, owner/project,
Android package, version, versionCode, source commit, and APK artifact. Its
summary links to the Expo build page. A missing token or missing existing
signing credentials must be resolved by the owner; do not create replacement
credentials or use a GitHub Gradle build.

Waiting may exceed the workflow's 120-minute timeout during a long Expo queue.
If it times out after submission, check the submitted build on Expo before
requesting another build. Download the APK from that build page and record
actual device results: install/launch, approved icons and light/dark logos,
email/Google login, onboarding, guardian-link approval, age restrictions and
Scenes. Do not mark device checks complete based on a successful bundle export.

Preview fresh-start behavior remains enabled: only explicitly marked disposable
test email accounts are eligible for deletion on a later launch. Existing
Google, Apple and regular accounts must be retained. Use designated test
accounts and record relaunch behavior; never delete real accounts for testing.

## Product rules implemented

- **Scenes** is the main feed for posts, photos and videos.
- **Pulse** is the quick-update/story layer.
- Bottom dial: **Scenes · Hangs · + · Gigs · Profile**.
- Top-right icon actions only: **Discover · Drops · Ping**.
- Ping contains all message alerts and chats.
- Drops contains non-message activity only.
- Scene viewer: swipe up/down between Scenes, swipe left to creator profile, swipe right from profile to return.
- Automatic light/dark theme follows the device.
- No decorative UI gradients. The approved StudentHood logo itself remains unchanged.
- iPad/tablet uses the same product model with a wider content layout.

## Localization and money

Use `src/localization.js` for locale-aware dates, times, numbers and currency formatting. Every money record must carry its original ISO 4217 currency code; the UI must not silently convert or infer currencies.

## Legal/compliance

The product links to the live Safety, Privacy and Terms pages. Country-specific age, consumer, privacy, content, employment/Gig, tax, payment and marketplace requirements still require market-by-market legal review before launch. UI code alone cannot certify worldwide legal compliance.


## Teen Mode

The native app uses `src/safety.js` to read the same server-enforced safety policy as the web experience.

For under-18 accounts where local law permits access:

- private profile defaults
- no precise-location exposure
- personalized advertising disabled
- teen-safe recommendations
- adult/explicit content excluded by database policy
- new Pings limited to approved Peeps
- adult discovery of teen profiles blocked unless already approved Peeps
- quiet hours from 19:00 to 07:00 in the locked account time zone

Country-specific minimum-age and guardian-consent requirements override the general Teen Mode rule. The server policy is authoritative; native UI checks are supplementary.


## Age assurance

StudentHood does **not** treat Google Sign-In or Sign in with Apple as proof that the person holding the device is the account owner.

The native app now has a platform-age bridge for:

- Apple Declared Age Range on supported iPhone/iPad versions.
- Google Play Age Signals 0.0.4 on supported Android devices.

StudentHood requests age bands around 13, 16 and 18. The server compares a platform age band with the private DOB supplied to StudentHood.

Rules:

- A platform signal can make an account more restricted, never less restricted.
- If DOB and a platform signal disagree across the under-18 boundary, the younger category wins until the discrepancy is resolved.
- A parent’s 18+ Google/Apple account cannot override a StudentHood DOB that says the user is under 18.
- An 18+ platform account does not set `adult_access_verified`.
- Adult-classified content remains locked unless a separate person-level verification result marks the StudentHood user as a verified adult.
- Raw IDs, selfies and biometric templates are not intended to be stored in StudentHood's database. The private verification audit stores only the result/provider reference needed for enforcement and audit.
- When Google Play reports `VERIFICATION_REQUIRED` in a mandatory jurisdiction, StudentHood pauses account activation until the platform age requirement is resolved.

The platform age module lives in `modules/studenthood-age-signals`. It requires a native development build; Expo Go cannot provide these native platform APIs.
