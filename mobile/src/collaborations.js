import {supabase} from './supabase';

// Only operator-verified canonical campus enrollments and enabled campus
// partnerships are used. Never infer pilot eligibility from editable campus text.
export async function getActivePilotDestinations(){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return [];
 const {data:enrollments,error:enrollError}=await supabase
  .from('studenthood_pilot_campus_enrollments')
  .select('institution_id').eq('user_id',user.id).eq('verification_status','verified');
 if(enrollError)throw new Error('Pilot campus verification is not yet available.');
 if(!enrollments?.length)return [];
 const homeIds=new Set(enrollments.map(x=>x.institution_id));
 const {data:pairs,error:pairError}=await supabase
  .from('studenthood_pilot_campus_pairs')
  .select('campus_a_id,campus_b_id').eq('enabled',true);
 if(pairError)throw new Error('Unable to load approved campus collaborations.');
 const destinations=[];
 for(const p of pairs||[]){
  if(homeIds.has(p.campus_a_id))destinations.push({
   homeCampusId:p.campus_a_id,partnerCampusId:p.campus_b_id
  });
  if(homeIds.has(p.campus_b_id))destinations.push({
   homeCampusId:p.campus_b_id,partnerCampusId:p.campus_a_id
  });
 }
 if(!destinations.length)return [];
 // The institution catalogue may expose only public institution display names.
 // No student lists, profile records or editable user data are fetched.
 const ids=[...new Set(destinations.flatMap(p=>[p.homeCampusId,p.partnerCampusId]))];
 let labels=new Map();
 const {data:catalog,error:catalogError}=await supabase
   .from('studenthood_institution_catalog').select('id,display_name').in('id',ids);
 if(!catalogError)labels=new Map((catalog||[]).map(row=>[row.id,row.display_name]));
 return destinations.map(p=>({
  ...p,
  homeLabel:labels.get(p.homeCampusId)||'Verified home campus',
  partnerLabel:labels.get(p.partnerCampusId)||'Approved partner campus'
 }));
}

export async function getVisibleCollaborations(){
 const {data,error}=await supabase.from('studenthood_cross_campus_projects')
  .select('id,title,description,category,state,created_at,max_members,organizer_id,home_campus_id,partner_campus_id')
  .eq('state','open').order('created_at',{ascending:false}).limit(50);
 if(error)throw new Error('Unable to load eligible cross-campus projects.');
 return data||[];
}

export async function getMyCollaborationMembership(projectId){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return null;
 const {data,error}=await supabase.from('studenthood_cross_campus_memberships')
  .select('role,status').eq('project_id',projectId).eq('user_id',user.id).maybeSingle();
 if(error)throw new Error('Unable to load your collaboration status.');
 return data||null;
}

export async function getCollaborationRequests(projectId){
 const {data,error}=await supabase.from('studenthood_cross_campus_memberships')
  .select('user_id,status,created_at').eq('project_id',projectId).eq('status','requested')
  .order('created_at',{ascending:false}).limit(30);
 if(error)throw new Error('Project membership requests are restricted.');
 return data||[];
}

export async function createCollaboration(values){
 const {data,error}=await supabase.rpc('studenthood_cross_campus_create',{
  p_home_campus:values.homeCampusId,p_partner_campus:values.partnerCampusId,
  p_title:values.title.trim(),p_description:values.description.trim(),
  p_category:values.category,p_max_members:Number(values.maxMembers)
 });
 if(error)throw new Error(error.message||'Could not start this collaboration.');
 return data;
}

export async function changeCollaborationMembership(projectId,action,memberId=null){
 const {data,error}=await supabase.rpc('studenthood_cross_campus_membership_action',{
  p_project_id:projectId,p_action:action,p_member_id:memberId
 });
 if(error)throw new Error(error.message||'Unable to update this project.');
 return data;
}

export async function reportCollaboration(projectId,reason){
 if(!['spam','harassment','unsafe','misleading','other'].includes(reason))
  throw new Error('Choose a valid reporting reason.');
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in to report this project.');
 const {error}=await supabase.from('studenthood_cross_campus_reports')
  .insert({project_id:projectId,reporter_id:user.id,reason});
 if(error&&error.code!=='23505')throw new Error('Unable to report this project.');
 return true;
}
