# StudentHood Mobile

Native Expo/React Native UI for iOS, Android and tablets.

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
