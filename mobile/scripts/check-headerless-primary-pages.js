// Universal primary-page layout rule: no redundant title mastheads.
// Applies to ALL StudentHood accounts in light/dark, not selected user IDs.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const scenes=read('src/screens/ScenesScreen.js');
const ping=read('src/screens/PingScreen.js');
const hub=read('src/screens/TopHubScreen.js');
const features=read('src/screens/FeatureLandingScreen.js');
const createFeature=read('src/screens/CreateFeatureScreen.js');
const createOptions=read('src/screens/CreateOptionsScreen.js');
const profile=read('src/components/StudentProfileView.js');
const discover=read('src/components/DiscoverPeoplePanel.js');

const absent=(source,fragment,context)=>{
  assert(!source.includes(fragment),context+' has a redundant heading: '+fragment);
};

for(const x of [
  'YOUR CAMPUS, RIGHT NOW',
  '<Text style={[styles.h1,{color:theme.text}]}>Scenes</Text>',
  'Happening around campus',
  '>Campus people</Text>'
])absent(scenes,x,'Scenes');

for(const x of [
  "<Text style={[styles.eyebrow,{color:theme.accent}]}>STUDENTHOOD</Text>",
  '<Text numberOfLines={1} style={[styles.heading,{color:theme.text}]}',
  '>Scenes shared in Ping</Text>'
])absent(ping,x,'Ping');

for(const x of [
  '<Text style={[styles.title,{color:theme.text}]}>{kind}</Text>',
  '>People from your campus</Text>',
  '>Peep requests</Text>'
])absent(hub,x,'Discover/Drops');

for(const x of [
  '<Text style={[styles.headingText,{color:theme.text}]}>{config.title}</Text>',
  '<Text style={[styles.eyebrow,{color:theme.accent}]}>{config.eyebrow}</Text>',
  '<Text style={[styles.heroTitle,{color:theme.text}]}',
  '>My submissions</Text>'
])absent(features,x,'Hangs/Gigs/Crews/Pulse');

for(const x of [
  '<Text style={[styles.headerTitle,{color:theme.text}]}>{config.heading}</Text>',
  '>STUDENTHOOD · CREATE</Text>',
  '<Text style={[styles.intro,{color:theme.muted}]}>{config.subheading}</Text>'
])absent(createFeature,x,'Create Crew/Hang/Gig/Pulse form');
absent(createOptions,'<Text style={[styles.title,{color:theme.text}]}>Create</Text>',
  'Shared Create options');

absent(profile,'<Text style={[styles.sceneTitle,{color:theme.text}]}>Scenes</Text>','own/visited Profile');
absent(discover,'>Find your people</Text>','Discover people cards');

for(const [source,need,context] of [
  [scenes,'profile?.campus_name','Scenes campus context'],
  [scenes,'>Pulse soon</Text>','Pulse create shortcut'],
  [scenes,'peepsPulses.filter','real Peep Pulses'],
  [ping,"mode==='thread'&&selected",'Ping recipient header'],
  [ping,'onPress={openSettings}','tappable conversation header'],
  [ping,'accessibilityLabel="Compose Ping"','Ping compose'],
  [hub,'accessibilityLabel="Back to StudentHood"','Discover/Drops back action'],
  [hub,'accessibilityLabel="Refresh campus people and profile photos"','Discover refresh'],
  [hub,'accessibilityLabel="Accept Peep request"','Peep request actions'],
  [features,'accessibilityLabel="Back to StudentHood"','Hangs/Gigs back action'],
  [features,'{config.filters.map','Hangs/Gigs filters'],
  [features,'accessibilityLabel={config.action}','creation entry point'],
  [features,"Crews:{",'Crew landing config'],
  [createFeature,'accessibilityLabel="Back to Create"','Crew editor back action'],
  [createFeature,'label="Crew name"','Crew name form field'],
  [createFeature,'label="Crew category"','Crew category form field'],
  [createFeature,'label="About your Crew"','Crew description form field'],
  [createFeature,'onPress={submit}','Crew editor submit action'],
  [createOptions,"name:'Create a Crew'",'Crew creation action'],
  [profile,'style={[styles.name,{color:theme.text}]}>{title}</Text>','student name'],
  [profile,'<Stat value={peeps} label="Peeps" theme={theme}/>','profile stats'],
  [profile,'accessibilityLabel="Edit profile"','own profile edit'],
  [discover,'accessibilityLabel="Discover campus students"','discoverable students']
])assert(source.includes(need),context+' must remain functional');

console.log('PASS: no duplicate headings across Scenes, Ping, Drops, Discover, Hangs, Gigs, Crews, creation and profiles; meaningful labels remain.');
