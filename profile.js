import { getSavedSession } from './auth.js?v=20261005-dob-1';

const SUPABASE_URL='https://tkznlyoflopxxnkthjtb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DiolULbdNTpIDst11yfc-A_tmNCjCmV';

function requireSession(){
  const session=getSavedSession();
  if(!session?.access_token||!session?.user?.id){
    throw new Error('Your StudentHood session is missing. Please log in again.');
  }
  return session;
}

async function rest(path, options={}){
  const session=requireSession();
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    ...options,
    headers:{
      apikey:SUPABASE_PUBLISHABLE_KEY,
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });

  let data=null;
  const text=await response.text();
  if(text){
    try{data=JSON.parse(text);}catch{data=text;}
  }

  if(!response.ok){
    const message=
      data?.message||
      data?.details||
      data?.hint||
      'Could not access your StudentHood profile.';
    throw new Error(message);
  }

  return data;
}

export async function getMyProfile(){
  const session=requireSession();
  const rows=await rest(
    `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,full_name,username,date_of_birth,city,campus_name,locale,country_code,preferred_currency,time_zone,age_assurance_status,guardian_consent_status,bio,interests,onboarding_completed,created_at,updated_at`
  );
  return Array.isArray(rows)?rows[0]||null:null;
}

export async function initializeSafetyProfile({dateOfBirth,countryCode,timeZone}){
  return rest('rpc/initialize_safety_profile',{
    method:'POST',
    body:JSON.stringify({
      p_date_of_birth:String(dateOfBirth||'').trim(),
      p_country_code:String(countryCode||'').trim().toUpperCase(),
      p_time_zone:String(timeZone||'').trim()
    })
  });
}

export async function getAccessPolicy(){
  return rest('rpc/studenthood_access_policy',{
    method:'POST',
    body:'{}'
  });
}

export async function completeMyProfile({fullName,username,dateOfBirth,countryCode,timeZone,city,campusName,bio,interests}){
  const session=requireSession();

  await initializeSafetyProfile({dateOfBirth,countryCode,timeZone});

  const normalizedUsername=String(username||'').trim().toLowerCase();
  const normalizedInterests=(Array.isArray(interests)?interests:[])
    .map(v=>String(v).trim())
    .filter(Boolean)
    .slice(0,12);

  const payload={
    full_name:String(fullName||'').trim(),
    username:normalizedUsername,
    city:String(city||'').trim()||null,
    campus_name:String(campusName||'').trim()||null,
    locale:(navigator.language||null),
    bio:String(bio||'').trim()||null,
    interests:normalizedInterests,
    onboarding_completed:true
  };

  const rows=await rest(
    `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,full_name,username,date_of_birth,country_code,time_zone,guardian_consent_status,city,campus_name,locale,bio,interests,onboarding_completed,updated_at`,
    {
      method:'PATCH',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify(payload)
    }
  );

  return Array.isArray(rows)?rows[0]||null:null;
}
