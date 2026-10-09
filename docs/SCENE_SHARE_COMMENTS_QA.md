# Correction #6 — Scene Share and Comment actions

Date: 2026-10-09
Status: source fixed in draft PR #7; NOT merged/released; no EAS APK build submitted.

## Reported
- Tapping **Share Scene** in the feed did nothing.
- Tapping the comment icon enlarged the Scene instead of allowing comments.
- Full-screen viewer share/comment icons were decorative, and the viewer PanResponder captured touch starts before Pressable controls.

## Implementation
- Scene cards and the full-screen Scene viewer wire **Share Scene** to React Native's native `Share.share` dialog with a privacy-preserving HTTPS Scene link. The share contains only a Scene UUID, not a user's personal data, signed media URL, or Scene text.
- A static `scene.html` landing page (to be deployed with GitHub Pages after PR merge) explains that Scene visibility requires a signed-in authorized account and links to the existing `studenthood://scene/<uuid>` app scheme.
- Mobile MainApp listens to cold-start and in-app deep links. ScenesScreen fetches a targeted Scene using the existing Supabase `scenes` RLS; a forwarded Scene link never grants access to private content.
- Shared Scenes opened outside normal feed do not fabricate reaction/comment counts.
- SceneCard comment icon launches a **dedicated full-screen comments composer**, not SceneViewer. Viewer comments open in the existing SceneViewer modal and disable swipe interception while editing. Android Back returns from comments to the Scene.
- `SceneCommentsPanel` loads real `scene_comments` with Supabase RLS, validates the 1–1000 character limit, writes through `addSceneComment`, supports refresh and shows pending moderation state. Pending comments are only visible to their author until approved under existing policy.
- Viewer PanResponder only claims actual swipe movement; taps now reach Like, Comment, and Share controls.
- No new Supabase schema or RLS changes. No fake shares, likes or comments.

## Validation and release
- Verify Expo Doctor and Android JS export on PR head (syntax/bundle tests only).
- **Device test required**: in-feed Share and full-screen Share invoke Android share sheet and send the HTTPS link to WhatsApp/SMS/email, recipient opens the static landing and launches StudentHood app, permitted Scene opens, ineligible/private Scene is denied without leaks.
- Test comments with signed-in adult and teen accounts, pending/approved status, normal feed and full-screen viewer, long text, empty text, offline/permission errors, and Android Back/tap versus swipe.
- Deep-link destination webpage won't be live until site changes are merged/deployed. Installed APK won't support new deep links until a later separately authorized EAS build. GitHub code validation does not prove native share behavior.
- Keep PR #7 draft and do not merge or request an APK build without explicit owner instruction.

## Sharing priority update — 2026-10-09

The owner requested **Instagram first, TikTok second, WhatsApp third, then the rest of the native sharing options**. Implemented in `SceneSharePanel` with explicit labels and social-brand icons, called from both the Scene feed and immersive viewer. The regular Android/iOS share chooser cannot reliably have its app order changed, so StudentHood controls this first-choice panel itself.

- **Instagram:** copy the Scene HTTPS permalink, then open the Instagram app if supported or the Instagram website. Student pastes the link in a supported destination themselves; StudentHood does **not** claim direct feed/Story publication.
- **TikTok:** copy the Scene HTTPS permalink and open TikTok's site (may hand off to the installed app depending on platform settings). Student pastes the link where supported; do **not** claim direct media upload/auto-publishing.
- **WhatsApp:** open the WhatsApp app with a prefilled link message where available; fall back to the WhatsApp HTTPS share entry point. The student chooses the recipient and confirms sending.
- **More apps:** retain React Native's native `Share.share` chooser for other installed apps.
- **Copy Scene link:** clipboard-only choice, with confirmation or error.

No social SDK keys, direct posting permissions, third-party tracking, private media URLs, or bypass of Scene RLS are introduced. Uses `expo-clipboard` compatible with Expo SDK 54. Native app switch and deep-link behavior must be tested on Android/iOS devices after an authorized APK release; Expo Doctor and JS export cannot verify recipient-app installation or handoff. Draft PR #7 only. **No merge, deployment, or EAS build.**
