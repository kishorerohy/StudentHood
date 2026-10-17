import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {supabase} from './supabase';

// Realtime events are invalidation hints, not untrusted rendered payloads.
// Always re-fetch through the established RLS/RPC permission checks.
// Foreground fallback and resuming from sleep cover missed WebSocket events.
let sequence=0;
export default function useLiveRefresh({tables=[],refresh,intervalMs=30000,enabled=true}){
  const latest=useRef(refresh);
  latest.current=refresh;
  const watched=tables.join(',');
  useEffect(()=>{
    if(!enabled)return;
    let active=AppState.currentState==='active';
    let working=false;
    let last=0;
    const sync=()=>{
      if(!active||working||Date.now()-last<800)return;
      last=Date.now();
      working=true;
      Promise.resolve().then(()=>latest.current?.())
        .catch(()=>{}).finally(()=>{working=false});
    };
    const channel=watched
      ?supabase.channel('studenthood-live-'+(++sequence))
      :null;
    watched.split(',').filter(Boolean).forEach(table=>{
      channel?.on('postgres_changes',{event:'*',schema:'public',table},sync);
    });
    channel?.subscribe();
    const lifecycle=AppState.addEventListener('change',state=>{
      const resumed=state==='active'&&!active;
      active=state==='active';
      if(resumed)sync();
    });
    const timer=setInterval(sync,Math.max(3000,intervalMs));
    return()=>{
      clearInterval(timer);
      lifecycle.remove();
      if(channel)supabase.removeChannel(channel);
    };
  },[watched,intervalMs,enabled]);
}
