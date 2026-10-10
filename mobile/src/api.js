import {supabase} from './supabase';

function validateEditableProfile({full_name,bio,city,campus_name}){
  if(!full_name||full_name.length>100) throw new Error('Full name must be between 1 and 100 characters.');
  if(bio&&bio.length>280) throw new Error('Bio must be 280 characters or less.');
  if(city&&city.length>80) throw new Error('City must be 80 characters or less.');
  if(!campus_name||campus_name.length>160) throw new Error('Institution name must be between 1 and 160 characters.');
}


// Count only accepted mutual Peeps for the signed-in account. Existing RLS
// restricts this query to relationships involving the current user.
export async function getMyPeepCount(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError) throw authError;
  if(!user) return 0;
  const {count,error}=await supabase.from('peep_connections')
    .select('id',{count:'exact',head:true})
    .eq('status','accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if(error) throw error;
  return Number(count)||0;
}

// Count only the target's Scenes visible to the signed-in viewer. Never
// return an unrestricted creator total or bypass the Scene RLS policy.
export async function getVisibleSceneCount(userId){
  if(!userId) return 0;
  const {count,error}=await supabase.from('scenes')
    .select('id',{count:'exact',head:true})
    .eq('author_id',userId);
  if(error) throw error;
  return Number(count)||0;
}

export async function getMySceneCount(){
  const {data,error}=await supabase.rpc('studenthood_my_scene_count');
  if(error) throw error;
  return Number(data)||0;
}

export async function saveMyProfileChanges({fullName,bio,city,campusName}){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in again.');
  const payload={
    full_name:String(fullName||'').trim(),
    bio:String(bio||'').trim()||null,
    city:String(city||'').trim()||null,
    campus_name:String(campusName||'').trim()||null
  };
  validateEditableProfile(payload);
  const {data,error}=await supabase.from('profiles').update(payload).eq('id',user.id)
    .select('id,full_name,bio,city,campus_name,campus_presence').single();
  if(error) throw error;
  if(data?.id!==user.id) throw new Error('Profile changes could not be confirmed. Please try again.');
  const saved=await getMyProfile();
  const expected={full_name:payload.full_name,bio:payload.bio,city:payload.city,campus_name:payload.campus_name};
  if(!saved||Object.keys(expected).some(key=>(saved[key]??null)!==(expected[key]??null))){
    throw new Error('Your profile could not be verified after saving. Please reopen it and check your details.');
  }
  return saved;
}

// Campus status is voluntary and manually chosen from Scenes.
// Only the authenticated student's own row is updated; existing RLS applies.
export async function setCampusPresence(value){
  if(!['on_campus','off_campus','not_shared'].includes(value)) throw new Error('Invalid campus status.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in again.');
  const {data,error}=await supabase.from('profiles')
    .update({campus_presence:value})
    .eq('id',user.id)
    .select('id,campus_presence')
    .single();
  if(error) throw error;
  if(data?.id!==user.id||data.campus_presence!==value) throw new Error('Campus status was not saved.');
  const saved=await getMyProfile();
  if(saved?.campus_presence!==value) throw new Error('Campus status could not be confirmed. Please refresh your profile.');
  return saved;
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
  let updated;
  let error;
  try{
    const result=await supabase.from('profiles')
      .update({avatar_url:path}).eq('id',user.id)
      .select('id,avatar_url').single();
    updated=result.data;
    error=result.error;
  }catch(e){
    error=e;
  }
  if(error||updated?.id!==user.id||updated?.avatar_url!==path){
    await supabase.storage.from('profile-avatars').remove([path]).catch(()=>{});
    throw error||new Error('Your photo could not be linked to the profile.');
  }
  // The changed path is already confirmed by the database's own SELECT.
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
  if(error) throw await institutionLookupError(error);
  if(data?.error) throw new Error(data.error);
  return Array.isArray(data?.institutions)?data.institutions:[];
}

// Supabase FunctionsHttpError otherwise displays the opaque "non-2xx" message.
// Preserve the service's actionable error while keeping unexpected failures friendly.
async function institutionLookupError(error){
  try{
    const response=error?.context;
    if(response&&typeof response.json==='function'){
      const payload=await response.json();
      if(typeof payload?.error==='string'&&payload.error.trim())return new Error(payload.error);
    }
  }catch(_ignored){}
  return new Error('Campus directory is temporarily unavailable. Please retry shortly.');
}

// City-based institution lookup works without phone GPS permission. The
// Supabase Edge Function caches public OpenStreetMap matches by city/country.
// This is a manually submitted lookup, never per-keystroke autocomplete.
export async function findInstitutionsByCity({city,countryCode}={}){
  const term=String(city||'').trim().replace(/\s+/g,' ');
  const country=String(countryCode||'').trim().toUpperCase();
  if(term.length<2)throw new Error('Enter your city to find schools, colleges and universities.');
  if(!/^[A-Z]{2}$/.test(country))throw new Error('Choose your country before searching institutions.');
  const {data,error}=await supabase.functions.invoke('institution-search',{
    body:{city:term,countryCode:country}
  });
  if(error)throw await institutionLookupError(error);
  if(data?.error)throw new Error(data.error);
  if(!Array.isArray(data?.institutions))throw new Error('The institution directory did not return a valid list.');
  return data.institutions;
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
  validateEditableProfile(payload);

  const {data,error}=await supabase
    .from('profiles')
    .update(payload)
    .eq('id',user.id)
    .select('id,full_name,username,date_of_birth,country_code,time_zone,city,campus_name,bio,interests,onboarding_completed,guardian_consent_status')
    .single();

  if(error) throw error;
  if(data?.id!==user.id||data.username!==payload.username||data.onboarding_completed!==true){
    throw new Error('StudentHood could not confirm your new profile. Please try again.');
  }
  const saved=await getMyProfile();
  if(!saved||saved.id!==user.id||!saved.onboarding_completed||
     saved.full_name!==payload.full_name||saved.username!==payload.username||
     (saved.city??null)!==payload.city||(saved.campus_name??null)!==payload.campus_name||
     (saved.bio??null)!==payload.bio||
     !Array.isArray(saved.interests)||
     saved.interests.join('\u0001')!==payload.interests.join('\u0001')){
    throw new Error('Your profile was submitted but its saved details could not be verified. Please refresh before retrying.');
  }
  return saved;
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


// Read only the Peep relationship involving the signed-in viewer. Database RLS
// remains authoritative; no other student's relationship data is returned.
export async function getPeepConnection(targetUserId){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in to view Peep requests.');
  const target=String(targetUserId||'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(target)) throw new Error('Invalid student profile.');
  if(user.id===target) return null;
  const filter=`and(requester_id.eq.${user.id},addressee_id.eq.${target}),and(requester_id.eq.${target},addressee_id.eq.${user.id})`;
  const {data,error}=await supabase.from('peep_connections')
    .select('id,requester_id,addressee_id,status')
    .or(filter).maybeSingle();
  if(error) throw error;
  return data||null;
}

export async function sendPeepRequest(targetUserId){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('Please sign in to send a Peep request.');
  const target=String(targetUserId||'').trim();
  if(target===user.id) throw new Error('You cannot add yourself as a Peep.');
  // The profile card checks the target's discovery and age restrictions.
  const allowedProfile=await getProfileCard(target);
  if(!allowedProfile?.id) throw new Error('This student cannot receive your Peep request.');
  const existing=await getPeepConnection(target);
  if(existing) return existing;
  const {data,error}=await supabase.from('peep_connections')
    .insert({requester_id:user.id,addressee_id:target,status:'pending'})
    .select('id,requester_id,addressee_id,status')
    .single();
  if(error){
    if(error.code==='23505'){
      const latest=await getPeepConnection(target);
      if(latest) return latest;
    }
    throw error;
  }
  return data;
}

// Fetch only Scenes the viewer is permitted to see under the existing RLS
// policy, with short-lived media URLs rather than exposing storage paths.
export async function getVisibleProfileScenes(targetUserId,{limit=12}={}){
  const target=String(targetUserId||'').trim();
  const {data,error}=await supabase.from('scenes')
    .select('id,body,media_url,media_type,created_at')
    .eq('author_id',target)
    .order('created_at',{ascending:false})
    .limit(Math.min(18,Math.max(1,Number(limit)||12)));
  if(error) throw error;
  return Promise.all((data||[]).map(async scene=>{
    if(!scene.media_url) return {...scene,media_signed_url:null};
    if(scene.media_url.startsWith('https://')||scene.media_url.startsWith('http://')) return {...scene,media_signed_url:scene.media_url};
    const signed=await supabase.storage.from('scene-media')
      .createSignedUrl(scene.media_url,3600);
    return {...scene,media_signed_url:signed.error?null:signed.data?.signedUrl||null};
  }));
}
