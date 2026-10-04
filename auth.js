// StudentHood authentication foundation.
// No service-role or secret keys are stored here.
const STUDENTHOOD_SUPABASE_URL='https://tkznlyoflopxxnkthjtb.supabase.co';
const STUDENTHOOD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_DiolULbdNTpIDst11yfc-A_tmNCjCmV';

const baseHeaders={
  apikey:STUDENTHOOD_SUPABASE_PUBLISHABLE_KEY,
  'Content-Type':'application/json'
};

async function request(path, options={}){
  const response=await fetch(`${STUDENTHOOD_SUPABASE_URL}/auth/v1/${path}`,{
    ...options,
    headers:{...baseHeaders,...(options.headers||{})}
  });
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok){
    const error=new Error(data.msg||data.message||data.error_description||data.error||'Authentication request failed.');
    error.status=response.status;
    error.details=data;
    throw error;
  }
  return data;
}

export async function signUpWithEmail({fullName,email,password,redirectTo}){
  const suffix=redirectTo?`?redirect_to=${encodeURIComponent(redirectTo)}`:'';
  return request(`signup${suffix}`,{
    method:'POST',
    body:JSON.stringify({
      email:String(email||'').trim().toLowerCase(),
      password,
      data:{full_name:String(fullName||'').trim()}
    })
  });
}

export async function signInWithEmail({email,password}){
  return request('token?grant_type=password',{
    method:'POST',
    body:JSON.stringify({
      email:String(email||'').trim().toLowerCase(),
      password
    })
  });
}

export async function requestPasswordReset({email,redirectTo}){
  const suffix=redirectTo?`?redirect_to=${encodeURIComponent(redirectTo)}`:'';
  return request(`recover${suffix}`,{
    method:'POST',
    body:JSON.stringify({email:String(email||'').trim().toLowerCase()})
  });
}

export function getOAuthUrl(provider,redirectTo){
  if(!['google','apple'].includes(provider)) throw new Error('Unsupported OAuth provider.');
  const url=new URL(`${STUDENTHOOD_SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set('provider',provider);
  if(redirectTo) url.searchParams.set('redirect_to',redirectTo);
  return url.toString();
}


export function saveSession(session){
  if(!session?.access_token||!session?.refresh_token) return;
  sessionStorage.setItem('studenthood_session',JSON.stringify({
    access_token:session.access_token,
    refresh_token:session.refresh_token,
    expires_at:session.expires_at||null,
    user:session.user||null
  }));
}

export function getSavedSession(){
  try{
    const raw=sessionStorage.getItem('studenthood_session');
    return raw?JSON.parse(raw):null;
  }catch{return null;}
}

export function clearSavedSession(){
  sessionStorage.removeItem('studenthood_session');
}
