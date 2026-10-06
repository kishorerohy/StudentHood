const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyBuild } = require('./verify-eas-build.cjs');
const app = require('../app.json').expo;
const commit = 'a'.repeat(40);

function fixture() {
  return [{
    id: '12345678-1234-1234-1234-123456789abc',
    status: 'FINISHED', platform: 'ANDROID', buildProfile: 'preview', distribution: 'INTERNAL',
    app: { id: app.extra.eas.projectId, slug: app.slug, ownerAccount: { name: app.owner } },
    appIdentifier: app.android.package,
    appVersion: app.version, appBuildVersion: String(app.android.versionCode),
    gitCommitHash: commit,
    artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/example.apk?signature=private' },
  }];
}

test('accepts the completed preview and excludes signed URLs from output', () => {
  const result = verifyBuild(fixture(), commit);
  assert.match(result.url, /^https:\/\/expo.dev\/accounts\//);
  assert(!JSON.stringify(result).includes('signature'));
});

for (const [field, value] of Object.entries({
  status: 'IN_PROGRESS', platform: 'IOS', buildProfile: 'production', distribution: 'STORE',
  appVersion: '0.0.0', appBuildVersion: '0', gitCommitHash: 'b'.repeat(40), appIdentifier: 'com.other.app',
})) {
  test(`rejects unexpected ${field}`, () => {
    const result = fixture();
    result[0][field] = value;
    assert.throws(() => verifyBuild(result, commit));
  });
}

test('rejects another Expo project', () => {
  const result = fixture();
  result[0].app.id = 'another-project';
  assert.throws(() => verifyBuild(result, commit));
});

test('rejects another owner or slug', () => {
  const wrongOwner = fixture();
  wrongOwner[0].app.ownerAccount.name = 'another-owner';
  assert.throws(() => verifyBuild(wrongOwner, commit));
  const wrongSlug = fixture();
  wrongSlug[0].app.slug = 'another-app';
  assert.throws(() => verifyBuild(wrongSlug, commit));
});

test('rejects missing, insecure, or non-APK artifacts', () => {
  for (const buildUrl of [undefined, 'http://expo.dev/example.apk', 'https://expo.dev/example.aab']) {
    const result = fixture();
    result[0].artifacts.buildUrl = buildUrl;
    assert.throws(() => verifyBuild(result, commit));
  }
});

test('rejects empty or multiple build results', () => {
  assert.throws(() => verifyBuild([], commit));
  assert.throws(() => verifyBuild([...fixture(), ...fixture()], commit));
});
