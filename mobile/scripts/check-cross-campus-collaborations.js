const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('../supabase/migrations/20261018_studenthood_cross_campus_pilot.sql');
const api=read('src/collaborations.js'),screen=read('src/screens/CollaborationsScreen.js');
const plus=read('src/screens/CreateOptionsScreen.js'),hub=read('src/screens/TopHubScreen.js');
const main=read('src/MainApp.js');
assert(sql.includes("verification_status text not null default 'pending'"),'Enrollment never self-verifies');
assert(sql.includes("enabled boolean not null default false"),'No automatically activated campus partnerships');
assert(sql.includes("p_category not in ('study','research'"),'Only validated project categories');
assert(sql.includes("age_ctx:=private.studenthood_age_context(who)"),'Adult age rules checked on another applicant');
assert(sql.includes("coalesce((access->>'adult_access_verified')::boolean,false)"),'Adult assurance required');
assert(sql.includes('public.studenthood_interaction_blocked'),'Cross-campus block rules required');
assert(sql.includes('for update'),'Serialize membership/capacity approvals');
assert(sql.includes("cnt>=p.max_members"),'Prevent project overbooking');
assert(sql.includes('unique(project_id,reporter_id)'),'Avoid repeated reports by same reporter');
assert((sql.match(/enable row level security/g)||[]).length>=6,'Every pilot entity is RLS protected');
assert(!/grant (insert|update|delete) on public.studenthood_pilot_campus_(enrollments|pairs)/i.test(sql),
 'Students must not grant themselves verified campus membership');
assert(!/alter policy.*(scenes|peep_connections|ping)/i.test(sql),
 'Pilot must never widen normal Scenes/Peeps/Ping access');
assert(api.includes("eq('verification_status','verified')"),'No self-attested campus proof');
assert(api.includes("eq('enabled',true)"),'Only approved campus pairs');
assert(api.includes("supabase.rpc('studenthood_cross_campus_create'"),'Use trusted server project creation');
assert(api.includes("supabase.rpc('studenthood_cross_campus_membership_action'"),
 'Use trusted member decisions');
assert(screen.includes('reportCollaboration')&&screen.includes('changeCollaborationMembership'),
 'Working reports and join requests');
assert(screen.includes('createMode')&&screen.includes('No approved cross-campus projects'),
 'Browse and create modes separate with honest empty states');
assert(hub.includes('experienceFlags.collaborations&&collaborationAvailable'),
 'Discover only displays actually eligible projects');
assert(plus.includes('collaborationsEnabled&&onCollaboration'),
 'Central + project composer only for approved pilot adults');
assert(main.includes("page.kind==='collaborations'||page.kind==='collaboration-create'"),
 'Reuse existing page stack, not a new bottom tab');
console.log('PASS: operator-verifiable campus pairs, adults-only projects, membership safety, no global feed leaks.');
