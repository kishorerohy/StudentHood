// StudentHood startup visual regression gate.
// Android mandates a native splash window; it must NEVER show a second logo.
// The only branded loading page is the React StartupScreen.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const root=path.resolve(__dirname,'..');
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
const nativePlugin=app.plugins.find(item=>Array.isArray(item)&&item[0]==='expo-splash-screen');
assert(nativePlugin,'expo-splash-screen plugin required');
const cfg=nativePlugin[1]||{};
const blank='./assets/studenthood-native-blank.png';
assert.equal(cfg.image,blank,'Native splash must never contain the StudentHood logo-only art');
assert.equal(cfg.dark?.image,blank,'Dark native splash must also be blank');
assert.equal(cfg.imageWidth,1,'Native placeholder must be visually negligible');
assert.equal(cfg.backgroundColor,'#FFFFFF','Native splash must stay white');
assert.equal(cfg.dark?.backgroundColor,'#FFFFFF','Dark native splash must stay white');

const asset=fs.readFileSync(path.join(root,'assets/studenthood-native-blank.png'));
const digest=crypto.createHash('sha256').update(asset).digest('hex');
assert.equal(digest,'84595179392c2754adbac6c6f6e53be180854cea518afc2485d66a8942b5e37c',
  'Native splash image changed and may display a second logo');
// Approved StudentHood wordmark and tagline must remain in ONE React page.
const startup=fs.readFileSync(path.join(root,'src/screens/StartupScreen.js'),'utf8');
assert(startup.includes("require('../../assets/studenthood-logo-light.png')"),
  'Approved logo missing from React startup page');
assert(startup.includes('YOUR CAMPUS. YOUR PEOPLE.'),'Approved tagline missing');
assert(startup.includes('Opening StudentHood'),'Branded loading status missing');
const appCode=fs.readFileSync(path.join(root,'App.js'),'utf8');
assert(appCode.includes('SplashScreen.preventAutoHideAsync()'),'Splash protection missing');
assert(appCode.includes('requestAnimationFrame('),'Splash handoff must wait until the first React frame');
assert(appCode.includes('SplashScreen.hideAsync()'),'Native splash must be dismissed');
console.log('PASS: One branded StudentHood startup; native Android launch is plain white in both themes.');
