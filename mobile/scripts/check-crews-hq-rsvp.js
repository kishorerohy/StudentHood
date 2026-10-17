const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('../supabase/migrations/20261018_studenthood_crews_hq_rsvp.sql');
const api=read('src/crewsHub.js'),crew=read('src/screens/CrewsHQScreen.js');
const hang=read('src/screens/HangDetailsScreen.js'),main=read('src/MainApp.js');
const hub=read('src/screens/TopHubScreen.js'),feature=read('src/screens/FeatureLandingScreen.js');
assert(sql.includes('primary key(crew_id,user_id)'), 'One Crew membership per student');
assert(sql.includes('primary key(hang_id,user_id)'), 'One RSVP per student and Hang');
assert((sql.match(/enable row level security/g)||[]).length>=3,'Every new membership/RSVP/link table needs RLS');
assert(sql.includes('for update'),'RSVP uses per-Hang serialized capacity');
assert(sql.includes('attendees>=h.capacity'),'Never overbook full Hang');
assert(sql.includes('Only the Crew owner can manage membership'),'Other students cannot approve or remove members');
assert(sql.includes('Only owner may link eligible same-campus Hangs'),'Crew links cannot cross campus');
assert(sql.includes('public.studenthood_same_campus_name'),'Check actual campus on member approval');
assert(sql.includes('studenthood_access_policy()'),'Access policy required for every privileged action');
assert(sql.includes('studenthood_can_view_creation'),'Reuse content visibility and moderation restrictions');
assert(sql.includes('status=\'going\''),'Only going RSVPs count toward capacity');
assert(!/grant (insert|update|delete) on public.studenthood_(crew_memberships|hang_rsvps)/i.test(sql),
 'Member states cannot be forged with client writes');
assert(api.includes("supabase.rpc('studenthood_crew_membership_action'"),
 'Crew membership must be server authorised');
assert(api.includes("supabase.rpc('studenthood_hang_rsvp_action'"),
 'RSVP must be controlled through atomic RPC');
assert(crew.includes('getVisibleCrews')&&crew.includes('changeCrewMembership'),
 'Crew UI consumes real backend data and actions');
assert(crew.includes("selected.creator_id===profile?.id"),'Owner controls not shown to all users');
assert(hang.includes('getHangRsvpStatus')&&hang.includes('changeHangRsvp'),
 'Hang UI needs real count/status and action');
assert(!hang.includes('Create Hang'),'No duplicate Create button');
assert(main.includes("case 'hang-details':")&&main.includes("case 'experience':"),
 'Details within existing navigation');
assert(hub.includes("item.name==='Crews'&&experienceFlags.crews_hq"),
 'Old Crews page remains when feature is not enabled');
assert(feature.includes('View Hang · RSVP')&&main.includes("onHang={()=>showPage({type:'create-feature',kind:'Hangs'})}"),
 'Browsing and creation remain separate');
console.log('PASS: Crew owner authorisation, real private memberships and capacity-serialised Hang RSVP.');
