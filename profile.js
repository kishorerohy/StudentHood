import { getSavedSession } from './auth.js?v=20261004-google-oauth';

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
    `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,full_name,username,date_of_birth,city,campus_name,locale,country_code,preferred_currency,bio,interests,onboarding_completed,created_at,updated_at`
  );
  return Array.isArray(rows)?rows[0]||null:null;
}

export async function completeMyProfile({fullName,username,dateOfBirth,city,campusName,bio,interests}){
  const session=requireSession();

  const normalizedUsername=String(username||'').trim().toLowerCase();
  const normalizedInterests=(Array.isArray(interests)?interests:[])
    .map(v=>String(v).trim())
    .filter(Boolean)
    .slice(0,12);

  const payload={
    full_name:String(fullName||'').trim(),
    username:normalizedUsername,
    date_of_birth:String(dateOfBirth||'').trim()||null,
    city:String(city||'').trim()||null,
    campus_name:String(campusName||'').trim()||null,
    locale:(navigator.language||null),
    bio:String(bio||'').trim()||null,
    interests:normalizedInterests,
    onboarding_completed:true
  };

  const rows=await rest(
    `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,full_name,username,date_of_birth,city,campus_name,locale,bio,interests,onboarding_completed,updated_at`,
    {
      method:'PATCH',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify(payload)
    }
  );

  return Array.isArray(rows)?rows[0]||null:null;
}
