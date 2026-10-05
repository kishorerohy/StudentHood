import {supabase} from './supabase';

export async function getMyProfile(){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) return null;

  const {data,error}=await supabase
    .from('profiles')
    .select('id,full_name,username,date_of_birth,city,campus_name,locale,country_code,preferred_currency,time_zone,age_assurance_status,guardian_consent_status,platform_age_provider,platform_age_status,platform_age_lower,platform_age_upper,platform_age_source,platform_age_signal_at,age_conflict,adult_access_verified,profile_visibility,location_visibility,recommendation_mode,ping_permissions,avatar_url,bio,interests,onboarding_completed,created_at,updated_at')
    .eq('id',user.id)
    .maybeSingle();

  if(error) throw error;
  return data;
}

export async function initializeSafetyProfile({dateOfBirth,countryCode,timeZone}){
  const {data,error}=await supabase.rpc('initialize_safety_profile',{
    p_date_of_birth:dateOfBirth,
    p_country_code:String(countryCode||'').toUpperCase(),
    p_time_zone:timeZone
  });
  if(error) throw error;
  return data;
}

export async function getAccessPolicy(){
  const {data,error}=await supabase.rpc('studenthood_access_policy');
  if(error) throw error;
  return data;
}

export async function getEffectiveSafety(){
  const {data,error}=await supabase.rpc('studenthood_effective_safety');
  if(error) throw error;
  return data;
}

export async function completeProfile({
  fullName,username,dateOfBirth,countryCode,timeZone,city,campusName,bio,interests
}){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('You are not signed in.');

  await initializeSafetyProfile({dateOfBirth,countryCode,timeZone});

  const payload={
    full_name:String(fullName||'').trim(),
    username:String(username||'').trim().toLowerCase(),
    city:String(city||'').trim()||null,
    campus_name:String(campusName||'').trim()||null,
    locale:Intl.DateTimeFormat().resolvedOptions().locale||null,
    bio:String(bio||'').trim()||null,
    interests:(Array.isArray(interests)?interests:[]).map(x=>String(x).trim()).filter(Boolean).slice(0,12),
    onboarding_completed:true
  };

  const {data,error}=await supabase
    .from('profiles')
    .update(payload)
    .eq('id',user.id)
    .select('id,full_name,username,date_of_birth,country_code,time_zone,city,campus_name,bio,interests,onboarding_completed,guardian_consent_status')
    .single();

  if(error) throw error;
  return data;
}

export async function getProfileCard(userId){
  const {data,error}=await supabase.rpc('studenthood_profile_card',{p_target_user:userId});
  if(error) throw error;
  return data;
}


export async function recordPlatformAgeSignal({provider,ageLower,ageUpper=null,source='unknown'}){
  const {data,error}=await supabase.rpc('studenthood_record_platform_age_signal',{
    p_provider:String(provider||'').toLowerCase(),
    p_age_lower:Number(ageLower),
    p_age_upper:ageUpper===null||ageUpper===undefined?null:Number(ageUpper),
    p_source:String(source||'unknown').toLowerCase()
  });
  if(error) throw error;
  return data;
}


export async function recordPlatformAgeStatus({provider,status}){
  const {data,error}=await supabase.rpc('studenthood_record_platform_age_status',{
    p_provider:String(provider||'').toLowerCase(),
    p_status:String(status||'unknown').toLowerCase()
  });
  if(error) throw error;
  return data;
}

export async function createGuardianConsentRequest({guardianEmail,relationship='parent_or_guardian'}){
  const {data,error}=await supabase.rpc('studenthood_create_guardian_consent_request',{
    p_guardian_email:String(guardianEmail||'').trim().toLowerCase(),
    p_relationship:String(relationship||'parent_or_guardian').toLowerCase()
  });
  if(error) throw error;
  return data;
}

export async function getGuardianConsentStatus(){
  const {data,error}=await supabase.rpc('studenthood_guardian_consent_status');
  if(error) throw error;
  return data;
}
