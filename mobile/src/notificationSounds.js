import {useEffect} from 'react';
import {AppState,Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {getDropsFeed,getPingMessages,getPingThreads} from './api';

const SOUND='studenthood_notification.wav';
const PING_CHANNEL='studenthood-pings-v1';
const DROPS_CHANNEL='studenthood-drops-v1';

// Foreground notifications are generic and do not expose message content.
Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false
  })
});

async function ready(){
  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(PING_CHANNEL,{
      name:'Pings',importance:Notifications.AndroidImportance.HIGH,
      sound:SOUND,vibrationPattern:[0,120,70,140]
    });
    await Notifications.setNotificationChannelAsync(DROPS_CHANNEL,{
      name:'Drops',importance:Notifications.AndroidImportance.DEFAULT,
      sound:SOUND
    });
  }
  let permission=await Notifications.getPermissionsAsync();
  if(!permission.granted&&permission.canAskAgain){
    permission=await Notifications.requestPermissionsAsync();
  }
  return permission.granted;
}

async function chime(kind){
  const channelId=kind==='Ping'?PING_CHANNEL:DROPS_CHANNEL;
  await Notifications.scheduleNotificationAsync({
    content:{
      title:kind==='Ping'?'New Ping':'New Drop',
      body:kind==='Ping'?'You have new activity in Ping.':'You have new StudentHood activity.',
      sound:SOUND,data:{kind}
    },
    trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:1,channelId}
  });
}

// Active-app fallback. Background delivery requires server push and FCM/APNs.
export default function useForegroundNotificationSounds(profileId){
  useEffect(()=>{
    if(!profileId)return;
    let active=AppState.currentState==='active';
    let authorized=false,initial=true,busy=false,stopped=false;
    let lastThreads=new Map(),lastDrops=new Set();
    ready().then(value=>{authorized=value}).catch(()=>{});
    async function check(){
      if(!active||stopped||busy)return;
      busy=true;
      try{
        const [threads,drops]=await Promise.all([
          getPingThreads({limit:40}),getDropsFeed({limit:30})
        ]);
        if(stopped)return;
        const currentThreads=new Map(threads.map(row=>[row.id,
          String(row.last_message_at||'')+'|'+String(row.incoming_request||false)]));
        const currentDrops=new Set(drops.map(item=>item.event_key).filter(Boolean));
        if(!initial&&authorized){
          const incoming=threads.filter(row=>row.id&&currentThreads.get(row.id)!==lastThreads.get(row.id)
            &&(row.last_message_at||row.incoming_request));
          let notifyPing=false;
          for(const row of incoming.slice(0,5)){
            if(row.incoming_request){notifyPing=true;break;}
            try{
              const messages=await getPingMessages(row.id,{limit:4});
              const newest=[...messages].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
              if(newest?.sender_id&&newest.sender_id!==profileId){notifyPing=true;break;}
            }catch{}
          }
          if(notifyPing)await chime('Ping');
          if(drops.some(item=>item.event_key&&!lastDrops.has(item.event_key)))await chime('Drop');
        }
        lastThreads=currentThreads;lastDrops=currentDrops;initial=false;
      }catch{
        // Failed reads must not create false positives or advance baselines.
      }finally{busy=false;}
    }
    const start=setTimeout(check,1800);
    const interval=setInterval(check,9000);
    const appState=AppState.addEventListener('change',state=>{
      const resumed=state==='active'&&!active;
      active=state==='active';
      if(resumed)check();
    });
    return()=>{stopped=true;clearTimeout(start);clearInterval(interval);appState.remove()};
  },[profileId]);
}
