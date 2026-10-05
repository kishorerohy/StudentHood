import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {AppState,Platform} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from './config';

const CHUNK_SIZE=1800;
const AUTH_STORAGE_KEY='sb-'+SUPABASE_URL.replace(/^https?:\/\//,'').split('.')[0]+'-auth-token';

const SecureSessionStorage={
  async getItem(key){
    if(Platform.OS==='web') return AsyncStorage.getItem(key);
    const countRaw=await SecureStore.getItemAsync(key+'.count');
    if(!countRaw) return null;
    const count=Number(countRaw);
    if(!Number.isFinite(count)||count<1) return null;
    const parts=[];
    for(let i=0;i<count;i++){
      const part=await SecureStore.getItemAsync(key+'.'+i);
      if(part===null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key,value){
    if(Platform.OS==='web') return AsyncStorage.setItem(key,value);
    const previous=Number(await SecureStore.getItemAsync(key+'.count')||0);
    const parts=[];
    for(let i=0;i<value.length;i+=CHUNK_SIZE) parts.push(value.slice(i,i+CHUNK_SIZE));
    await SecureStore.setItemAsync(key+'.count',String(parts.length),{keychainAccessible:SecureStore.WHEN_UNLOCKED});
    for(let i=0;i<parts.length;i++){
      await SecureStore.setItemAsync(key+'.'+i,parts[i],{keychainAccessible:SecureStore.WHEN_UNLOCKED});
    }
    for(let i=parts.length;i<previous;i++) await SecureStore.deleteItemAsync(key+'.'+i);
  },
  async removeItem(key){
    if(Platform.OS==='web') return AsyncStorage.removeItem(key);
    const count=Number(await SecureStore.getItemAsync(key+'.count')||0);
    for(let i=0;i<count;i++) await SecureStore.deleteItemAsync(key+'.'+i);
    await SecureStore.deleteItemAsync(key+'.count');
  }
};

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    storage:SecureSessionStorage,
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:false,
    flowType:'pkce'
  }
});

export async function clearStoredAuthSession(){
  await SecureSessionStorage.removeItem(AUTH_STORAGE_KEY);
}

let autoRefreshBound=false;

export function bindAuthAutoRefresh(){
  if(autoRefreshBound) return ()=>{};
  autoRefreshBound=true;

  if(AppState.currentState==='active') supabase.auth.startAutoRefresh();

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
