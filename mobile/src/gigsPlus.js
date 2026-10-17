import {supabase} from './supabase';

// Verified employer identity is read only from server-approved organizations.
// The client never writes verification_status or employer roles.
export async function getGigEmployer(gig){
 if(!gig?.employer_org_id)return null;
 const {data,error}=await supabase.from('studenthood_employer_organizations')
  .select('id,legal_name,verification_status')
  .eq('id',gig.employer_org_id).eq('verification_status','verified').maybeSingle();
 if(error)throw new Error('Unable to verify employer identity.');
 return data;
}
export async function getMyGigApplication(gigId){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in first.');
 const {data,error}=await supabase.from('studenthood_gig_applications')
  .select('id,status,created_at,updated_at').eq('gig_id',gigId).eq('applicant_id',user.id).maybeSingle();
 if(error)throw new Error('Unable to check your application status.');
 return data||null;
}
export async function changeGigApplication(gigId,action,statement=null,applicantId=null){
 const {data,error}=await supabase.rpc('studenthood_gig_application_action',{
  p_gig_id:gigId,p_action:action,p_statement:statement,p_applicant_id:applicantId
 });
 if(error)throw new Error(error.message||'Application action failed.');
 return data;
}
export async function requestEmployerVerification(legalName,websiteUrl=''){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in to request verification.');
 if(String(legalName).trim().length<3)throw new Error('Enter the organization legal name.');
 const {data,error}=await supabase.from('studenthood_employer_organizations')
  .insert({legal_name:String(legalName).trim(),website_url:websiteUrl.trim()||null,
    requested_by:user.id,verification_status:'pending'})
  .select('id,legal_name,verification_status').single();
 if(error)throw new Error(error.message||'Could not submit the verification request.');
 return data;
}
export async function getMyEmployerOrganizations(){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return [];
 const {data:roles,error:roleError}=await supabase.from('studenthood_employer_memberships')
  .select('employer_id,role,status').eq('user_id',user.id).eq('status','active');
 if(roleError)throw new Error('Unable to load your organizations.');
 if(!roles?.length)return [];
 const {data,error}=await supabase.from('studenthood_employer_organizations')
  .select('id,legal_name,verification_status').in('id',roles.map(r=>r.employer_id));
 if(error)throw new Error('Unable to load organization verification.');
 return data||[];
}
export async function getApplicationsForEmployerGig(gigId){
 const {data,error}=await supabase.from('studenthood_gig_applications')
  .select('id,applicant_id,status,created_at,statement').eq('gig_id',gigId)
  .order('created_at',{ascending:false}).limit(50);
 if(error)throw new Error('Application review is not permitted.');
 return data||[];
}

export async function getMyGigApplications(){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return [];
 const {data,error}=await supabase.from('studenthood_gig_applications')
   .select('id,gig_id,status,created_at,updated_at')
   .eq('applicant_id',user.id).order('created_at',{ascending:false}).limit(50);
 if(error)throw new Error('Unable to load your private applications.');
 const ids=(data||[]).map(row=>row.gig_id);
 if(!ids.length)return [];
 const {data:gigs,error:gigError}=await supabase.from('gigs')
   .select('id,title,campus_name,category,moderation_status,created_at,description,pay_amount,pay_currency,pay_unit,employer_name,employer_org_id,location_hint,application_deadline,expires_at')
   .in('id',ids);
 if(gigError)throw new Error('Unable to load permitted Gig details.');
 const titles=new Map((gigs||[]).map(item=>[item.id,item]));
 return (data||[]).map(row=>({...row,gig:titles.get(row.gig_id)||null}));
}
