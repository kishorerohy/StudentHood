const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const oldReleaseWarning='pending';
const creation=file('src/creation.js');
const reportFirst=file('../supabase/migrations/20261017_report_first_publishing.sql');
const campusGuard=file('../supabase/migrations/20261017_preserve_scene_campus_on_updates.sql');
const oldReports=file('../supabase/migrations/20261017_bridge_legacy_scene_reports.sql');
const oldCampus=file('../supabase/migrations/20261017_opt_in_old_scene_campus_reshare.sql');
const sceneApi=file('src/scenes.js');
const api=file('src/api.js');
const view=file('src/components/StudentProfileView.js');
const comments=file('src/components/SceneCommentsPanel.js');

assert(creation.includes("moderation_status:'approved'"),'Creator must request approved publication');
assert(!creation.includes("moderation_status:'pending'"),'Creator may not expect preapproval');
for(const name of ['scenes','scene_comments','pulse_entries','hangs','crews','gigs']){
  assert(reportFirst.includes('ALTER TABLE public.'+name+" ALTER COLUMN moderation_status SET DEFAULT 'approved';"),name+' must publish immediately');
}
assert(reportFirst.includes('private.studenthood_content_reports'),'Private reports required');
assert(reportFirst.includes('studenthood_scene_safety_defaults()'),'Scene safety trigger required');
assert(reportFirst.includes("OLD.moderation_status IN ('removed','limited')"),'Removed/limited Scenes must not reappear');
assert(reportFirst.includes('studenthood_access_policy()'),'Account policies must remain');
assert(oldCampus.includes("author_id=auth.uid()"),'Only owner can change an older Scene audience');
assert(oldCampus.includes("moderation_status='approved'"),'Restricted Scenes may not be moved');
assert(campusGuard.includes('NEW.campus_name:=OLD.campus_name'),'Old campus must be preserved except opt-in');
assert(oldReports.includes('studenthood_report_content'),'Old APK reports must reach private moderation');
assert(sceneApi.includes("p_kind:'scene'"),'Scene report call missing');
assert(comments.includes("p_kind:'comment'"),'Comment report action missing');
assert(api.includes('getVisiblePeepCount'),'Visiting profile Peeps count missing');
assert(api.includes('shareOwnSceneWithCurrentCampus'),'Opt-in reshare API missing');
assert(view.includes('Share with '+ ' {student.campus_name}?') || view.includes('Share with {student.campus_name}?'),'Opt-in UI must be visible');
console.log('PASS: immediate publishing, report-based moderation, no automatic campus moves and clear-profile contract.');
