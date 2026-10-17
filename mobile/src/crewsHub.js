import {supabase} from './supabase';

// All queries use the signed-in caller and existing creation RLS;
// never join directly to private profiles or expose another member's data.
export async function getVisibleCrews({limit=45}={}){
 const {data,error}=await supabase.from('crews').select('id,creator_id,campus_name,name,description,category,visibility,moderation_status,created_at')
   .eq('moderation_status','approved').order('created_at',{ascending:false})
   .limit(Math.min(60,Math.max(1,limit)));
 if(error)throw new Error('Unable to load eligible Crews right now.');
 return data||[];
}
export async function getOwnCrewMembership(crewId){
 const {data,error}=await supabase.from('studenthood_crew_memberships')
   .select('role,status').eq('crew_id',crewId).maybeSingle();
 // Multiple members may be visible to the owner: only use this helper for ordinary
 // member accounts; organizer dashboard deliberately loads the roster separately.
 if(error&&error.code!=='PGRST116')throw new Error('Unable to read Crew membership.');
 return data||null;
}
export async function getMyCrewMembership(crewId,userId){
 const {data,error}=await supabase.from('studenthood_crew_memberships')
   .select('role,status').eq('crew_id',crewId).eq('user_id',userId).maybeSingle();
 if(error)throw new Error('Unable to read your Crew membership.');
 return data||null;
}
export async function getCrewMembersForOrganizer(crewId){
 const {data,error}=await supabase.from('studenthood_crew_memberships')
   .select('user_id,status,role,joined_at').eq('crew_id',crewId)
   .order('joined_at',{ascending:false}).limit(80);
 if(error)throw new Error('Membership records are restricted.');
 return data||[];
}
export async function changeCrewMembership(crewId,action,memberId=null){
 const {data,error}=await supabase.rpc('studenthood_crew_membership_action',{
   p_crew_id:crewId,p_action:action,p_member_id:memberId
 });
 if(error)throw new Error(error.message||'Crew request could not be completed.');
 return data;
}
export async function getHangRsvpStatus(hangId){
 const {data,error}=await supabase.rpc('studenthood_hang_rsvp_status',{p_hang_id:hangId});
 if(error)throw new Error('Unable to load Hang availability.');
 return data||{enabled:false};
}
export async function changeHangRsvp(hangId,join){
 const {data,error}=await supabase.rpc('studenthood_hang_rsvp_action',{
  p_hang_id:hangId,p_join:join===true
 });
 if(error)throw new Error(error.message||'Unable to update your RSVP.');
 return data;
}
