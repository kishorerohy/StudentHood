// StudentHood Scenes Pulse strip regression contract. Executed on every PR.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const screen=source('src/screens/ScenesScreen.js');
const api=source('src/api.js');
const main=source('src/MainApp.js');
const sql=source('../supabase/migrations/20261017_active_peeps_pulse_row.sql');
assert(!screen.includes('>Campus people</Text>'),'Do not restore the unwanted Campus people heading');
assert(!screen.includes('>See all →</Text>'),'Do not add a See all link above Pulse');
assert(!screen.includes('getCampusPeeps'),'Pulse is never a campus profile suggestion list');
assert(!screen.includes('>Pulse soon</Text>'),'Pulse creation belongs exclusively under the central + menu');
assert(screen.includes('peepsPulses.filter'),'Render authorized Peeps Pulse entries without an extra create entry');
assert(screen.includes('onPress={()=>setOpenPulse(item)}'),
 'A friend Pulse must open the Pulse itself, not redirect directly to the profile');
assert(screen.includes('getActivePeepsPulses'),'Use real Pulse rows');
assert(screen.includes('setInterval(loadPulse,60000)'),'Fetch new friends Pulses regularly');
assert(screen.includes('new Date(item.expires_at).getTime()>Date.now()'),
 'Expired Pulses must not show in the row');
assert(screen.includes('PeepsPulseViewer'),'Pulses need a viewer');
assert(main.includes("onPulse={()=>showPage({type:'create-feature',kind:'Pulse'})}"),
 'The central + menu must open the Pulse editor');
assert(api.includes("supabase.rpc('studenthood_active_peeps_pulses'"),
 'Use access-checked live Supabase Pulse data');
assert(api.includes("createSignedUrl(pulse.media_path,600)"),
 'Private Pulse media must use short-lived signed links');
assert(api.includes("p_kind:'pulse'"),'Pulse reports must work');
assert(sql.includes("public.studenthood_are_peeps(auth.uid(),p.author_id)"),
 'Only accepted mutual Peeps belong in the strip');
assert(sql.includes("public.studenthood_can_view_creation("),
 'Never bypass per-Pulse audience, account access or safety limits');
assert(sql.includes("p.expires_at>now()")&&sql.includes("p.moderation_status='approved'"),
 'Never show expired, removed or restricted Pulse content');
assert(sql.includes("CREATE POLICY \"Eligible Peeps read active Pulse media\""),
 'Media must have a scoped private-storage RLS policy');
assert(sql.includes("REVOKE ALL ON FUNCTION public.studenthood_active_peeps_pulses(integer)"),
 'No public Pulse listing RPC grants');
console.log('PASS: heading-free, authentic unexpired Peeps Pulses; only central + creates Pulse.');
