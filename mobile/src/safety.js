const SUPABASE_URL='https://tkznlyoflopxxnkthjtb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DiolULbdNTpIDst11yfc-A_tmNCjCmV';

async function rpc(name,accessToken,body={}){
  if(!accessToken) throw new Error('A signed-in StudentHood session is required.');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_PUBLISHABLE_KEY,
      Authorization:`Bearer ${accessToken}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.message||'StudentHood safety check failed.');
  return data;
}

export function getAccessPolicy(accessToken){
  return rpc('studenthood_access_policy',accessToken);
}

export function getEffectiveSafety(accessToken){
  return rpc('studenthood_effective_safety',accessToken);
}

export function initializeSafetyProfile(accessToken,{dateOfBirth,countryCode,timeZone}){
  return rpc('initialize_safety_profile',accessToken,{
    p_date_of_birth:String(dateOfBirth||'').trim(),
    p_country_code:String(countryCode||'').trim().toUpperCase(),
    p_time_zone:String(timeZone||'').trim()
  });
}

export function canPingUser(accessToken,targetUserId){
  return rpc('studenthood_can_ping',accessToken,{p_target_user:String(targetUserId||'')});
}

export function canDiscoverProfile(accessToken,targetUserId){
  return rpc('studenthood_can_discover_profile',accessToken,{p_target_user:String(targetUserId||'')});
}

export function getSafeProfileCard(accessToken,targetUserId){
  return rpc('studenthood_profile_card',accessToken,{p_target_user:String(targetUserId||'')});
}

/*
  Native clients must not implement age/content restrictions only in UI.
  The server policy remains authoritative. Re-check access when the app
  enters foreground and while a youth session is active near quiet hours.
*/
