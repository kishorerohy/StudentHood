// StudentHood: corrections #26-33 are invariant across every user account.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const main=read('src/MainApp.js');
const scenes=read('src/screens/ScenesScreen.js');
const profiles=read('src/screens/ProfileScreen.js');
const other=read('src/screens/UserProfileScreen.js');
const studentView=read('src/components/StudentProfileView.js');
const edit=read('src/screens/EditProfileScreen.js');
const feature=read('src/screens/FeatureLandingScreen.js');
const creation=read('src/creation.js');
const hook=read('src/useLiveRefresh.js');
const sounds=read('src/notificationSounds.js');
const app=JSON.parse(read('app.json'));
const pkg=JSON.parse(read('package.json'));
const sound=fs.readFileSync(path.join(root,'assets/studenthood-notification.wav'));
const sql=read('../supabase/migrations/20261017_live_campus_peeps_scene_feeds.sql');
const presence=read('../supabase/migrations/20261017_private_campus_presence_invalidation.sql');

assert.equal(sound.toString('ascii',0,4),'RIFF','Original StudentHood notification audio must be a WAV');
assert.equal(sound.toString('ascii',8,12),'WAVE','Notification WAV must be a valid sound file');
assert(pkg.dependencies['expo-notifications'],'Expo notifications native dependency required');
assert(app.expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-notifications'
  &&p[1].sounds.includes('./assets/studenthood-notification.wav')),'Bundle native chime with APK');
assert(sounds.includes('studenthood-pings-v1')&&sounds.includes('studenthood-drops-v1'),'Separate Ping/Drops native channels');
assert(sounds.includes('getPingMessages')&&sounds.includes('newest.sender_id!==profileId'),
  'Only another author should cause an incoming Ping chime');
assert(!sounds.includes('getExpoPushTokenAsync'),'Never claim production push delivery before FCM provisioning');
assert(main.includes('useForegroundNotificationSounds(profile?.id)'),'Enable foreground notification alerts');

assert(hook.includes("on('postgres_changes'")&&hook.includes('AppState.addEventListener')
  &&hook.includes('supabase.removeChannel')&&hook.includes('setInterval'),
  'Realtime, resume, polling and connection cleanup are all required');
assert(scenes.includes('useLiveRefresh({tables:')&&scenes.includes('load(filter,{silent:true})'),
  'Scenes must update without UI refresh or spinner');
assert(other.includes("'studenthood_presence_signals'"),'Visited profile must listen for status updates');
assert(profiles.includes("'studenthood_presence_signals'"),'Own profile must refresh automatically');
assert(sql.includes('studenthood_are_peeps(auth.uid(),s.author_id)')&&sql.includes('s.created_at desc'),
  'Eligible mutual Peeps and newest-first Scenes required');
assert(sql.includes('kunrattur')&&sql.includes('kundrathur'),
  'Known Chennai suburbs need same-campus canonical treatment');
assert(presence.includes('enable row level security')
  &&presence.includes('studenthood_can_discover_profile(user_id)'),
  'Presence signals cannot expose private student profiles');
assert(!presence.includes('grant select on public.profiles'),'Private profile table remains protected');

assert(main.includes('onEditCover={()=>showPage')&&studentView.includes('accessibilityLabel="Edit cover picture"'),
  'Owner needs explicit independent cover editing');
assert(edit.includes('coverOnly')&&edit.includes('uploadMyCover'),'Edit Cover must upload real photo, not change avatar');

assert(!main.includes("onCreate={()=>showPage({type:'create-feature',kind:'Hangs'})}"),
  'Hangs tab must not create a Hang');
assert(!main.includes("onCreate={()=>showPage({type:'create-feature',kind:'Gigs'})}"),
  'Gigs tab must not create a Gig');
assert(!feature.includes('onPress={onCreate}'),'Feature landing must contain no other create buttons');
assert(feature.includes('getVisibleCampusCreations(kind)')&&creation.includes(".neq('creator_id',user.id)"),
  'Hangs/Gigs browse eligible creations by other students, not the owners submissions');
assert(creation.includes(".eq('moderation_status','approved')"),
  'Moderated or restricted Hangs/Gigs are never shown');
assert(creation.includes("moderation_status:'approved'"),'Creation must publish without a routine review queue');
assert(main.includes("onHang={()=>showPage({type:'create-feature',kind:'Hangs'})}")
  &&main.includes("onGig={()=>showPage({type:'create-feature',kind:'Gigs'})}")
  &&main.includes("onPulse={()=>showPage({type:'create-feature',kind:'Pulse'})}"),
  'Only central + menu creates Hangs/Gigs/Pulse');

console.log('PASS: live campus discovery, latest-first Scenes, cover edit, central +, approved Hangs/Gigs, private presence and device chimes.');
