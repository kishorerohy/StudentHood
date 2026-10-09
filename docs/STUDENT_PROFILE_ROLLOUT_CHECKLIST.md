# StudentHood premium profile rollout checklist

Status: proposed implementation on draft PR #6. **Not released.**

## User-approved design
The profile reference specifies a full-screen campus-themed header with centered avatar, display name, username, manually set campus status badge, genuine statistics, bio/interests, university/city, wide profile actions, and a row of circular photo highlights. Both the owner profile and other permitted student profiles should share the same visual treatment. Navigation from a Scene must open the full page rather than a centered card.

## Completed on PR #6
- Shared `StudentProfileView` and both account-specific presentation screens.
- Camera and edit controls for the owner; Add Peep and guarded Ping for visitors.
- Real RLS-limited Scenes and tappable previews; accepted Peep counts for self.
- Compact transparent vertical campus slider on Scenes with manually saved `campus_presence`.
- Green/red presence badges for `on_campus` or `off_campus`; `not_shared` is absent from all other-user views.
- No invented verification badge, follower/following numbers, social links, curated collections, or messaging.
- Android JS export and Expo Doctor checks via GitHub CI.

## Release dependencies — require human review before production change
1. The existing `studenthood_profile_card(p_target_user uuid)` SECURITY DEFINER function currently does **not** return `campus_presence`. Extend only its returned JSON with a nullable property based on `profiles.campus_presence`, showing `on_campus` / `off_campus` and otherwise returning NULL. Keep its existing tests, permissions, `studenthood_can_discover_profile`, accepted-Peep check, teen profile restrictions, and location redactions unchanged. No permissive profiles SELECT policy.
2. A dedicated editable cover photo requires a new nullable `profiles.cover_url` path, a tenant-specific upload, safe storage owner policy and a viewing policy that checks either the owner or that the target is discoverable / an accepted Peep. Do not apply these security-sensitive changes without SQL review and approval. Until then the cover is derived from a viewer-permitted Scene or a neutral background.
3. An optional profile website/Instagram link should use a dedicated validated field, reasonable link-safety restrictions and a reviewed nullable column. The current UI only renders a URL if such trusted data becomes available.
4. Verification check marks require a verified identity/status workflow and privileged authoritative flag; they must not be invented from an avatar or sign-in provider.
5. Dedicated Pulse collections, real Crews, complete Pings, and externally visible Peep counts are separate backend features. Use only real numbers and media.

## Rollout
- Review PR #6 and Android CI. Review and apply authorized backend changes *before* expecting viewer badges.
- Merge after owner's explicit release approval. Do not trigger more than one Expo EAS Android preview APK per Asia/Kolkata day.
- StudentHood currently distributes preview APKs internally. It has **no EAS Update configuration**, so GitHub source changes alone will not update installed APKs.
- Upload/send a verified Expo install URL after native build completion. A new APK must be installed to test the new UI.
- QA on Android/iPad: own/edit profile, adult permitted viewer, pending and accepted Peeps, age-protected account, `not_shared`, light/dark, onboarding session, image preview, Swipe-to-profile, and backgrounding.
