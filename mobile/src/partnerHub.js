import {supabase} from './supabase';
export async function getMyPartnerOrganizations(){
 const {data,error}=await supabase.from('studenthood_partner_organizations')
   .select('id,employer_org_id,verification_status,created_at')
   .order('created_at',{ascending:false});
 if(error)throw new Error('Unable to load your partner requests.');
 return data||[];
}
export async function requestPartnerVerification(employerOrgId){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in to request partner verification.');
 const {data,error}=await supabase.from('studenthood_partner_organizations')
  .insert({employer_org_id:employerOrgId,requested_by:user.id,verification_status:'pending'})
  .select('id,verification_status').single();
 if(error)throw new Error(error.message||'Partner request could not be submitted.');
 return data;
}
export async function getMyPartnerCampaigns(partnerIds=[]){
 if(!partnerIds.length)return [];
 const {data,error}=await supabase.from('studenthood_partner_campaigns')
   .select('id,partner_id,category,title,description,placement,start_at,end_at,approval_status,quote_currency,quote_amount,created_at')
   .in('partner_id',partnerIds).order('created_at',{ascending:false}).limit(50);
 if(error)throw new Error('Unable to load your campaign drafts.');
 return data||[];
}
export async function createPartnerCampaign({partnerId,category,title,description,startAt,endAt}){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in to create a campaign request.');
 if(title.trim().length<5||description.trim().length<20)throw new Error('Enter a title and clear description.');
 const start=new Date(startAt),end=new Date(endAt);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||end<=new Date())
   throw new Error('Choose valid future campaign dates.');
 const {data,error}=await supabase.from('studenthood_partner_campaigns')
   .insert({partner_id:partnerId,created_by:user.id,category,title:title.trim(),
     description:description.trim(),placement:'eligible_campus',sponsored:true,
     approval_status:'draft',quote_amount:null,start_at:start.toISOString(),end_at:end.toISOString()})
   .select('id,approval_status').single();
 if(error)throw new Error(error.message||'Unable to save campaign draft.');
 return data;
}
export async function changePartnerCampaign(campaignId,action){
 const {data,error}=await supabase.rpc('studenthood_partner_campaign_action',{
   p_campaign_id:campaignId,p_action:action
 });
 if(error)throw new Error(error.message||'Unable to change this campaign.');
 return data;
}
export async function getPartnerCampaignMetrics(campaignId){
 const {data,error}=await supabase.from('studenthood_partner_campaign_daily_metrics')
  .select('metric_date,impressions,opt_in_clicks,redeemed')
  .eq('campaign_id',campaignId).order('metric_date',{ascending:false}).limit(40);
 if(error)throw new Error('Campaign analytics are not available.');
 return data||[];
}
