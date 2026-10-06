const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('../app.json').expo;

function verifyBuild(result, expectedCommit) {
  assert(Array.isArray(result) && result.length === 1, 'Expected exactly one Expo build');
  const build = result[0];
  assert.equal(build.status, 'FINISHED', 'Expo build must be finished');
  assert.equal(build.platform, 'ANDROID', 'Build must target Android');
  assert.equal(build.buildProfile, 'preview', 'Build must use the preview profile');
  assert.equal(build.distribution, 'INTERNAL', 'Build must use internal distribution');
  assert.equal(build.app?.id, app.extra.eas.projectId, 'Unexpected Expo project');
  assert.equal(build.app?.ownerAccount?.name, app.owner, 'Unexpected Expo owner');
  assert.equal(build.app?.slug, app.slug, 'Unexpected Expo project slug');
  assert.equal(build.appIdentifier, app.android.package, 'Unexpected Android package');
  assert.equal(build.appVersion, app.version, 'Unexpected app version');
  assert.equal(String(build.appBuildVersion), String(app.android.versionCode), 'Unexpected Android versionCode');
  if (expectedCommit) assert.equal(build.gitCommitHash, expectedCommit, 'Unexpected source commit');
  assert.match(build.id || '', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Invalid Expo build ID');
  const artifact = new URL(build.artifacts?.buildUrl);
  assert.equal(artifact.protocol, 'https:', 'APK artifact must use HTTPS');
  assert(artifact.pathname.endsWith('.apk'), 'Expected an APK artifact');
  return {
    id: build.id,
    version: build.appVersion,
    versionCode: build.appBuildVersion,
    commit: build.gitCommitHash,
    url: `https://expo.dev/accounts/${app.owner}/projects/${app.slug}/builds/${build.id}`,
  };
}

if (require.main === module) {
  const verified = verifyBuild(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), process.env.GITHUB_SHA);
  const summary = `Verified completed Expo EAS Android preview ${verified.version} (versionCode ${verified.versionCode}).\n\nBuild: ${verified.url}\n\nCommit: ${verified.commit}\n\nAPK artifact is available on the Expo build page. Device testing is still required.\n`;
  // Print only the selected build details, never the full EAS response or signed URLs.
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

module.exports = { verifyBuild };
