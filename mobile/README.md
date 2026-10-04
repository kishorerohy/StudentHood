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
