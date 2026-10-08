import {supabase} from './supabase';

export async function getMySceneCount(){
  const {data,error}=await supabase.rpc('studenthood_my_scene_count');
  if(error) throw error;
  return Number(data)||0;
}

export async function saveMyProfileChanges({fullName,bio,city,campusName,campusPresence}){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in again.');
  const payload={
    full_name:String(fullName||'').trim(),
    bio:String(bio||'').trim()||null,
    city:String(city||'').trim()||null,
    campus_name:String(campusName||'').trim()||null,
    campus_presence:campusPresence
  };
  if(!payload.full_name) throw new Error('Your name is required.');
  if(!payload.campus_name) throw new Error('Your institution is required.');
  if(!['on_campus','off_campus','not_shared'].includes(campusPresence)) throw new Error('Invalid campus status.');
  const {data,error}=await supabase.from('profiles').update(payload).eq('id',user.id)
    .select('id,full_name,bio,city,campus_name,campus_presence').single();
  if(error) throw error;
  return data;
}

export async function uploadMyAvatar(asset){
  if(!asset?.uri) throw new Error('Choose a photo first.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in again.');
  const bytes=await (await fetch(asset.uri)).arrayBuffer();
  if(bytes.byteLength>5*1024*1024) throw new Error('Choose an image smaller than 5 MB.');
  const contentType=asset.mimeType||'image/jpeg';
  const ext=contentType==='image/png'?'png':contentType==='image/webp'?'webp':'jpg';
  if(!['image/jpeg','image/png','image/webp'].includes(contentType)) throw new Error('Please choose a JPG, PNG or WebP image.');
  const path=`${user.id}/avatar-${Date.now()}.${ext}`;
  const {error:uploadError}=await supabase.storage.from('profile-avatars').upload(path,bytes,{contentType,upsert:false});
  if(uploadError) throw uploadError;
  const {error}=await supabase.from('profiles').update({avatar_url:path}).eq('id',user.id);
  if(error){
    await supabase.storage.from('profile-avatars').remove([path]);
    throw error;
  }
  return path;
}

export async function getAvatarDisplayUrl(value){
  if(!value) return null;
  if(/^https?:\/\//i.test(value)) return value;
  const {data,error}=await supabase.storage.from('profile-avatars').createSignedUrl(value,3600);
  if(error) return null;
  return data?.signedUrl||null;
}

export async function getMyProfile(){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) return null;

  const {data,error}=await supabase
    .from('profiles')
    .select('id,full_name,username,date_of_birth,city,campus_name,locale,country_code,preferred_currency,time_zone,age_assurance_status,guardian_consent_status,platform_age_provider,platform_age_status,platform_age_lower,platform_age_upper,platform_age_source,platform_age_signal_at,age_conflict,adult_access_verified,profile_visibility,location_visibility,recommendation_mode,ping_permissions,avatar_url,bio,interests,campus_presence,onboarding_completed,created_at,updated_at')
    .eq('id',user.id)
    .maybeSingle();

  if(error) throw error;
  return data;
}


export async function checkUsernameAvailability(username){
  const normalized=String(username||'').trim().toLowerCase();
  const {data,error}=await supabase.rpc('studenthood_username_available',{p_username:normalized});
  if(error) throw error;
  return data===true;
}

export async function findNearbyInstitutions({latitude,longitude,radiusMeters=18000}){
  const lat=Math.round(Number(latitude)*1000)/1000;
  const lon=Math.round(Number(longitude)*1000)/1000;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) throw new Error('Location is unavailable.');

  const {data,error}=await supabase.functions.invoke('institution-search',{
    body:{latitude:lat,longitude:lon,radiusMeters}
  });
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return Array.isArray(data?.institutions)?data.institutions:[];
}

export async function getCampusPeeps({limit=100,offset=0}={}){
  const {data,error}=await supabase.rpc('studenthood_campus_peeps',{
    p_limit:limit,
    p_offset:offset
  });
  if(error) throw error;

  const seen=new Set();
  const unique=(data||[]).filter(item=>{
    if(!item?.id||seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return Promise.all(unique.map(async item=>({
    ...item,
    avatar_url:await getAvatarDisplayUrl(item.avatar_url)
  })));
}

export async function getDropsFeed({limit=40,offset=0}={}){
  const {data,error}=await supabase.rpc('studenthood_drops_feed',{
    p_limit:limit,
    p_offset:offset
  });
  if(error) throw error;
  return Array.isArray(data)?data:[];
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

export async function deleteCurrentTestAccount(){
  const {data,error}=await supabase.rpc('studenthood_delete_test_account');
  if(error) throw error;
  return data;
}
