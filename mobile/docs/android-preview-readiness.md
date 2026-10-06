# Android preview v0.1.5 readiness

Issue: https://github.com/kishorerohy/StudentHood/issues/1

Reviewed base: `87894a3` on 2026-10-06.

## Configuration and scope

- App version `0.1.5`, Android versionCode `6`.
- Expo SDK 54 / React Native 0.81.5.
- Existing owner `studenthood-0920`, project ID
  `2a76faaf-95de-438c-a4f5-f4f33a3dbcd3`, Android package
  `com.studenthood.app`, and preview APK profile retained.
- Approved branding, native age-signal code, authentication, guardian links,
  disposable test-account rules, and production Supabase data were unchanged.

## Validation actually performed

- `npm install --no-audit --no-fund`: passed, 749 packages installed.
- `npm ci --no-audit --no-fund`: passed from the committed lockfile candidate.
- `npx expo-doctor@latest`: 18/18 checks passed.
- `npx expo export --platform android --output-dir dist`: passed, 877 modules,
  one Android Hermes bundle and 21 assets exported.
- `node --test scripts/verify-eas-build.test.cjs`: 13/13 tests passed.
- Android Expo autolinking resolution includes
  `com.studenthood.agesignals.StudentHoodAgeSignalsModule`.
- Lockfile dependency declarations match `package.json`; workflow YAML parses;
  `git diff --check` passes.
- EAS CLI 24.11.0 help confirms `--wait`, `--json`, and
  `--freeze-credentials`. Verification fields were checked against that CLI's
  build GraphQL fragment, not against a live build response.

Validation ran on local Node 24.21.0. GitHub currently configures Node 20;
the pull-request CI must confirm that environment. Native Android compilation,
APK installation, Google OAuth, guardian approval, and device age-signal flows
were not tested. No EAS build was started.

## Confirmed blocker

The latest official workflow attempt at review time was:
https://github.com/kishorerohy/StudentHood/actions/runs/37473659652

It failed at **Check Expo access token** with `EXPO_TOKEN is missing`.
EAS setup, dependency installation, and Expo build submission were skipped.
There is no completed EAS APK from that attempt.

The agent's GitHub integration received HTTP 403 when listing repository
secret names. Whether the owner has since configured `EXPO_TOKEN` cannot be
confirmed. The owner must set the secret privately through GitHub's Actions
secret mechanism and confirm setup; never disclose its value. Existing EAS
signing credentials and project access remain unverified until authenticated
EAS validation/build execution. The workflow must fail rather than replace
missing signing credentials.

## Remaining acceptance steps

1. Owner reviews the PR; no merge occurs automatically.
2. Owner confirms the protected `EXPO_TOKEN` setup and approves build execution.
3. Run the official workflow for the reviewed source commit and verify the
   completed build summary, Expo build ID, version, source commit and APK.
4. Install on an Android device and document actual smoke-test results using
   designated test accounts. Preserve retention of existing non-disposable
   accounts and the preview's explicitly marked test-email deletion rules.

Issue #1 remains open until the completed EAS build and device checks are
verified. No GitHub-native Gradle APK is an acceptable substitute.
