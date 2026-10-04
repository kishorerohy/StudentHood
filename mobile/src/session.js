import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {bindAuthAutoRefresh,supabase} from './supabase';
import {getAccessPolicy,getEffectiveSafety,getMyProfile,initializeSafetyProfile} from './api';
import {consumePendingSignupSafety} from './auth';

const SessionContext=createContext(null);

export function SessionProvider({children}){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [policy,setPolicy]=useState(null);
  const [safety,setSafety]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const recheckTimer=useRef(null);

  const clearRecheck=useCallback(()=>{
    if(recheckTimer.current){
      clearInterval(recheckTimer.current);
      recheckTimer.current=null;
    }
  },[]);

  const refreshAccount=useCallback(async(nextSession=session)=>{
    if(!nextSession?.access_token){
      setProfile(null);
      setPolicy(null);
      setSafety(null);
      return;
    }

    const pending=await consumePendingSignupSafety();
    if(pending){
      try{await initializeSafetyProfile(pending)}catch{}
    }

    const nextProfile=await getMyProfile();
    setProfile(nextProfile);

    if(nextProfile?.date_of_birth&&nextProfile?.country_code&&nextProfile?.time_zone){
      const [nextPolicy,nextSafety]=await Promise.all([
        getAccessPolicy(),
        getEffectiveSafety()
      ]);
      setPolicy(nextPolicy);
      setSafety(nextSafety);

      clearRecheck();
      if(nextPolicy?.youth_account){
        recheckTimer.current=setInterval(async()=>{
          try{
            const updated=await getAccessPolicy();
            setPolicy(updated);
          }catch{}
        },60000);
      }
    }else{
      setPolicy(null);
      setSafety(null);
    }
  },[session,clearRecheck]);

  useEffect(()=>{
    const unbind=bindAuthAutoRefresh();
    let mounted=true;

    (async()=>{
      try{
        const {data,error:getError}=await supabase.auth.getSession();
        if(getError) throw getError;
        if(!mounted) return;
        const next=data?.session||null;
        setSession(next);
        if(next) await refreshAccount(next);
      }catch(e){
        if(mounted) setError(e?.message||'Could not restore your session.');
      }finally{
        if(mounted) setLoading(false);
      }
    })();

    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,next)=>{
      if(!mounted) return;
      setSession(next);
      setError('');
      if(next){
        try{await refreshAccount(next)}catch(e){setError(e?.message||'Could not load your StudentHood account.')}
      }else{
        clearRecheck();
        setProfile(null);
        setPolicy(null);
        setSafety(null);
      }
      setLoading(false);
    });

    const appSub=AppState.addEventListener('change',async state=>{
      if(state==='active'&&session?.access_token){
        try{await refreshAccount(session)}catch{}
      }
    });

    return ()=>{
      mounted=false;
      subscription.unsubscribe();
      appSub.remove();
      clearRecheck();
      unbind();
    };
  },[]);

  const value=useMemo(()=>({
    session,profile,policy,safety,loading,error,
    isSignedIn:!!session?.user,
    refreshAccount:()=>refreshAccount(session),
    setProfile,
    setPolicy
  }),[session,profile,policy,safety,loading,error,refreshAccount]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(){
  const value=useContext(SessionContext);
  if(!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
