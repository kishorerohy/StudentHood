import {supabase} from './supabase';

export async function getMyPassportEntries(){
 const {data,error}=await supabase.from('studenthood_passport_entries')
  .select('id,title,entry_type,assurance,status,visibility,issued_at,revoked_at')
  .order('issued_at',{ascending:false}).limit(60);
 if(error)throw new Error('Could not open private Passport entries.');
 return data||[];
}
export async function getMyPassportShareGrants(){
 const {data,error}=await supabase.from('studenthood_passport_share_grants')
  .select('id,entry_id,expires_at,revoked_at,created_at').order('created_at',{ascending:false}).limit(60);
 if(error)throw new Error('Could not check your Passport sharing links.');
 return data||[];
}
export async function setPassportEntryVisibility(entryId,show){
 const {data,error}=await supabase.rpc('studenthood_passport_entry_action',{
  p_entry_id:entryId,p_action:show?'show':'hide'
 });
 if(error)throw new Error(error.message||'Could not change Passport visibility.');
 return data;
}
export async function createPassportShare(entryId){
 const {data,error}=await supabase.rpc('studenthood_passport_create_share',{
  p_entry_id:entryId,p_hours:24
 });
 if(error)throw new Error(error.message||'Could not create a Passport share.');
 if(!/^[a-f0-9]{48}$/.test(data||''))throw new Error('The sharing token was not returned.');
 return 'studenthood://passport/'+data;
}
export async function revokePassportShare(shareId){
 const {data,error}=await supabase.rpc('studenthood_passport_revoke_share',{p_share_id:shareId});
 if(error)throw new Error(error.message||'Could not revoke this share.');
 return data===true;
}
export async function getVisiblePassportCards(profileId){
 const {data,error}=await supabase.rpc('studenthood_passport_profile_cards',{p_owner:profileId});
 if(error)throw new Error('Unable to load permitted Passport cards.');
 return Array.isArray(data)?data:[];
}
export async function getSharedPassportCard(token){
 if(!/^[a-f0-9]{48}$/.test(token||''))throw new Error('Invalid share link.');
 const {data,error}=await supabase.rpc('studenthood_passport_read_share',{p_token:token});
 if(error)throw new Error(error.message||'Passport share is unavailable or expired.');
 return data&&Object.keys(data).length?data:null;
}
export async function issueOrganizerHangConfirmation(hangId,studentId){
 const {data,error}=await supabase.rpc('studenthood_passport_issue_hang',{p_hang_id:hangId,p_student_id:studentId});
 if(error)throw new Error(error.message||'Confirmation could not be issued.');
 return data;
}
export async function issueEmployerGigConfirmation(applicationId){
 const {data,error}=await supabase.rpc('studenthood_passport_issue_gig_engagement',{p_application_id:applicationId});
 if(error)throw new Error(error.message||'Employer confirmation could not be issued.');
 return data;
}
