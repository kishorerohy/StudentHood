const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('../supabase/migrations/20261018_studenthood_passport.sql');
const app=read('src/MainApp.js'),screen=read('src/screens/PassportScreen.js');
const share=read('src/screens/PassportSharedScreen.js'),profile=read('src/components/PassportProfileCards.js');
const api=read('src/passport.js'),hang=read('src/screens/HangDetailsScreen.js'),gig=read('src/screens/GigDetailsScreen.js');
assert(sql.includes("visibility text not null default 'private'"),'Records must begin private');
assert(sql.includes("status text not null default 'active'"),'Persist real issuance/revocation');
assert(sql.includes('unique(owner_id,source_type,source_id)'),'No duplicate evidence claims');
assert(sql.includes("status='going'"),'Organizer must have an actual RSVP');
assert(sql.includes("h.starts_at>now()"),'No attendance confirmations before event occurs');
assert(sql.includes("a.status<>'accepted'"),'Employer can only confirm accepted involvement');
assert(sql.includes("assurance in ('organizer_confirmed','employer_confirmed')"),
 'No forged accredited-university status');
assert(sql.includes("grant select on public.studenthood_passport_entries to authenticated"),'Own records readable');
assert(!sql.includes('grant insert on public.studenthood_passport_entries'),'No user-forged trusted entry insertion');
assert(sql.includes("owner_id=(select auth.uid())"),'Private by owner RLS');
assert(sql.includes("public.studenthood_can_discover_profile(p_owner)"),'Published badges respect visibility');
assert(sql.includes('public.studenthood_interaction_blocked'),'Blocks respected on shares');
assert(sql.includes('extensions.gen_random_bytes(24)')&&sql.includes('extensions.digest'),
 'Secure hashed, unguessable share grants');
assert(sql.includes('g.expires_at>now()')&&sql.includes('g.revoked_at is null'),
 'Expired/revoked shares cannot be opened');
assert(sql.includes('p_hours not between 1 and 168'),'Bounded share duration');
assert(sql.includes('e.status=\'active\''),'Revoked credentials cannot be shared');
assert(screen.includes('getMyPassportEntries')&&screen.includes('setPassportEntryVisibility')
  &&screen.includes('revokePassportShare'),'Private entry control works');
assert(share.includes('getSharedPassportCard'),'Share view must rely on authorised RPC');
assert(profile.includes('getVisiblePassportCards'),'Only published permissioned cards appear');
assert(app.includes('SHARED_PASSPORT_LINK'),'App handles non-public expiring share links');
assert(hang.includes('issueOrganizerHangConfirmation'),'Organisers can record confirmed attendance');
assert(gig.includes('issueEmployerGigConfirmation'),'Verified employers can issue involvement');
console.log('PASS: private, evidence-linked, issuer-controlled Passport with revocable shares.');
