// Static contract for all-account Ping conversation settings and protections.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const ping=read('src/screens/PingScreen.js');
const api=read('src/api.js');
const sql=read('../supabase/migrations/20261017_ping_universal_blocks_and_search.sql');
for(const literal of [
  'accessibilityLabel={\'Open Ping settings for \'+',
  'Conversation history','Search in chat','View profile',
  'Block student','Unblock student',
  'getPingHistoryPage','searchPingHistory','setPingBlock',
  'interactionAvailable===true&&<View',
  "mode==='settings'&&selected",
  "mode==='history'&&selected",
  "mode==='search'&&selected"
]){
 assert(ping.includes(literal),'Missing UI feature: '+literal);
}
assert(!ping.includes('accessibilityLabel="View recipient profile"'),
  'Remove second profile navigation row; conversation header is the entry point.');
for(const fn of ['studenthood_ping_set_block','studenthood_ping_block_status',
   'studenthood_ping_search_messages','studenthood_ping_history_page']){
 assert(api.includes(fn),'Missing API: '+fn);
 assert(sql.includes(fn),'Missing database RPC: '+fn);
}
for(const guard of ['studenthood_guard_blocked_ping_message',
   'studenthood_guard_blocked_ping_accept','studenthood_guard_blocked_peeps',
   'CREATE OR REPLACE FUNCTION public.studenthood_are_peeps',
   'studenthood_can_discover_profile',
   'studenthood_can_ping',
   'studenthood_can_view_scene',
   'regexp_replace(definition',]){
 assert(sql.includes(guard),'Missing global security guard: '+guard);
}
assert(sql.includes('private.studenthood_ping_blocks'),'Block storage must be private.');
assert(ping.includes('interactionAvailable===false'), 'Blocked conversation must show a generic unavailable state.');
assert(api.includes('interaction_available'), 'API must surface generic two-way interaction availability.');
const statusSQL=read('../supabase/migrations/20261017_ping_generic_block_ux_status.sql');
assert(statusSQL.includes("'interaction_available'"), 'Backend must provide generic deny-state without disclosing block origin.');
assert(!sql.includes(' RENAME TO studenthood_'),'RLS policy function OIDs must be preserved for blocks.');
assert(sql.includes('REVOKE ALL ON private.studenthood_ping_blocks'),
  'Private block records must not be client readable.');
assert(sql.includes('blocked_by_me') && !sql.includes("'blocked_by_other'"),
  'Do not disclose another student\'s blocking preference.');
assert(sql.includes('auth.uid() IN(t.user_a,t.user_b)'),
  'Search and history must be limited to conversation participants.');
console.log('PASS: Ping header settings, search/history, universal block/RLS contract.');
