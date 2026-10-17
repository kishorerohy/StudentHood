const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const chrome=read('src/components/CompactPageBar.js');
assert(chrome.includes('accessibilityLabel={backLabel}'),'Shared chrome needs a labeled back control');
assert(chrome.includes('minHeight:55'),'Compact bar must not leave old title-sized whitespace');
assert(!chrome.includes('fontSize:32'),'Shared chrome must not contain a large page title');

const scenes=read('src/screens/ScenesScreen.js');
assert(!scenes.includes('>YOUR CAMPUS, RIGHT NOW</Text>'),'No Scenes kicker');
assert(!scenes.includes('>Scenes</Text>'),'No redundant Scenes page heading');
assert(!scenes.includes('>Happening around campus</Text>'),'Remove decorative activity heading');
assert(scenes.includes('>Pulse soon</Text>'),'Keep Pulse creator button');
assert(scenes.includes('profile?.campus_name'),'Keep campus indicator');

const hub=read('src/screens/TopHubScreen.js');
assert(hub.includes('<CompactPageBar'),'Discover/Drops require compact title-free bar');
assert(!hub.includes('>{kind}</Text>'),'Remove Discover and Drops full page titles');
assert(!hub.includes('>People from your campus</Text>'),'Avoid unnecessary Discover page heading');
assert(hub.includes('Refresh Drops')&&hub.includes('Refresh campus people'),'Keep both refresh functions');

const ping=read('src/screens/PingScreen.js');
assert(ping.includes('<CompactPageBar'),'Ping inbox requires compact header');
assert(!ping.includes('styles.heading,{color:theme.text}'),'No large Ping page heading');
assert(ping.includes('onPress={openSettings}'),'Contact name/avatar remains tappable');
assert(ping.includes('selected.other_name'),'Preserve recipient identity and names');
assert(ping.includes('Compose Ping')&&ping.includes('Refresh Ping inbox'),
  'Keep functional header controls');

for(const file of [
 'src/screens/EditProfileScreen.js','src/screens/CreateOptionsScreen.js',
 'src/screens/CreateFeatureScreen.js','src/screens/ProfileMenuScreen.js',
 'src/screens/SceneModerationScreen.js','src/screens/FeatureLandingScreen.js'
]){
  const code=read(file);
  assert(code.includes('<CompactPageBar'),file+' must use shared heading-free chrome');
  assert(code.includes('onBack'),file+' must retain navigation');
}
const edit=read('src/screens/EditProfileScreen.js');
assert(!edit.includes('>{photoOnly?\'Profile picture\':\'Edit profile\'}</Text>'),
  'Remove Edit Profile page heading');
assert(edit.includes('Save profile changes'),'Saving remains accessible');
assert(edit.includes('institutionMode'),'Institution search options remain');
const ownProfile=read('src/components/StudentProfileView.js');
assert(ownProfile.includes('student?.full_name')||ownProfile.includes('student.full_name'),
  'Keep the student name as identity, not a redundant page heading');
console.log('PASS: universal compact title-free page chrome with intact profile identity and actions.');
