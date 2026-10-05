import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {supabase} from './supabase';
import {OAUTH_REDIRECT_URI} from './config';

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(value){
  return String(value||'').trim().toLowerCase();
}

export async function signUpWithEmail({fullName,email,password}){
  const {data,error}=await supabase.auth.signUp({
    email:normalizeEmail(email),
    password,
    options:{
      data:{
        full_name:String(fullName||'').trim()
      }
    }
  });
  if(error) throw error;
  return data;
}

export async function signInWithEmail({email,password}){
  const {data,error}=await supabase.auth.signInWithPassword({
    email:normalizeEmail(email),
    password
  });
  if(error) throw error;
  return data;
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}

export async function requestPasswordReset(email){
  const redirectTo=Linking.createURL('auth/reset');
  const {error}=await supabase.auth.resetPasswordForEmail(normalizeEmail(email),{redirectTo});
  if(error) throw error;
}

export async function startGoogleAuth(){
  const {data,error}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{
      redirectTo:OAUTH_REDIRECT_URI,
      skipBrowserRedirect:true
    }
  });

  if(error) throw error;
  if(!data?.url) throw new Error('Google sign-in could not be started.');

  const result=await WebBrowser.openAuthSessionAsync(data.url,OAUTH_REDIRECT_URI);

  if(result.type!=='success'||!result.url){
    throw new Error(result.type==='cancel'?'Google sign-in was cancelled.':'Google sign-in did not complete.');
  }

  const parsed=Linking.parse(result.url);
  const code=parsed.queryParams?.code;

  if(code){
    const {data:sessionData,error:exchangeError}=await supabase.auth.exchangeCodeForSession(String(code));
    if(exchangeError) throw exchangeError;
    return sessionData;
  }

  const rawHash=result.url.split('#')[1]||'';
  const hash=new URLSearchParams(rawHash);
  const accessToken=hash.get('access_token');
  const refreshToken=hash.get('refresh_token');

  if(accessToken&&refreshToken){
    const {data:sessionData,error:setError}=await supabase.auth.setSession({
      access_token:accessToken,
      refresh_token:refreshToken
    });
    if(setError) throw setError;
    return sessionData;
  }

  throw new Error('Google sign-in returned without a usable session.');
}

