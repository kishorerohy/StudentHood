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

export async function consumeOAuthSessionFromUrl(){
  const hashParams=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):location.hash);
  const queryParams=new URLSearchParams(location.search);

  const oauthError=
    hashParams.get('error_description')||
    hashParams.get('error')||
    queryParams.get('error_description')||
    queryParams.get('error');

  if(oauthError) throw new Error(oauthError);

  const accessToken=hashParams.get('access_token');
  const refreshToken=hashParams.get('refresh_token');

  if(!accessToken||!refreshToken) return null;

  let user=null;
  try{
    user=await request('user',{
      method:'GET',
      headers:{Authorization:`Bearer ${accessToken}`}
    });
  }catch{}

  const session={
    access_token:accessToken,
    refresh_token:refreshToken,
    expires_at:hashParams.get('expires_at')?Number(hashParams.get('expires_at')):null,
    user
  };

  saveSession(session);

  if(location.hash){
    history.replaceState(null,'',`${location.pathname}${location.search}`);
  }

  return session;
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
