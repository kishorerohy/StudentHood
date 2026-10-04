import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from './config';

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    storage:AsyncStorage,
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:false,
    flowType:'pkce'
  }
});

let autoRefreshBound=false;

export function bindAuthAutoRefresh(){
  if(autoRefreshBound) return ()=>{};
  autoRefreshBound=true;

  if(AppState.currentState==='active'){
    supabase.auth.startAutoRefresh();
  }

  const sub=AppState.addEventListener('change',state=>{
    if(state==='active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });

  return ()=>{
    sub.remove();
    supabase.auth.stopAutoRefresh();
    autoRefreshBound=false;
  };
}
