import React,{useEffect,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {getAvatarDisplayUrl,getMyPeepCount,getMySceneCount,getVisibleProfileScenes,shareOwnSceneWithCurrentCampus} from '../api';
import StudentProfileView from '../components/StudentProfileView';
import PassportProfileCards from '../components/PassportProfileCards';
import useLiveRefresh from '../useLiveRefresh';

// The owner's profile uses the same premium full-screen layout seen by other
// students, but with edit controls rather than Peep/Ping request actions.
export default function ProfileScreen({theme,profile,onMenu,onEdit,onEditPicture,onEditCover,reloadKey=0}){
  const [sceneCount,setSceneCount]=useState(null);
  const [peepCount,setPeepCount]=useState(null);
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [coverUrl,setCoverUrl]=useState(null);
  const [scenes,setScenes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [sceneRevision,setSceneRevision]=useState(0);
  const [liveRevision,setLiveRevision]=useState(0);
  useLiveRefresh({tables:['scenes','peep_connections','studenthood_presence_signals'],intervalMs:18000,
    refresh:()=>setLiveRevision(n=>n+1)});

  useEffect(()=>{
    let live=true;
    setLoading(true);
    setSceneCount(null);
    setPeepCount(null);
    setScenes([]);
    Promise.allSettled([
      getMySceneCount(),
      getMyPeepCount(),
      profile?.id?getVisibleProfileScenes(profile.id,{limit:12}):Promise.resolve([])
    ]).then(([count,peeps,visible])=>{
      if(!live)return;
      if(count.status==='fulfilled')setSceneCount(count.value);
      if(peeps.status==='fulfilled')setPeepCount(peeps.value);
      if(visible.status==='fulfilled')setScenes(visible.value);
    }).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[profile?.id,reloadKey,sceneRevision,liveRevision]);
  useEffect(()=>{
    let live=true;
    getAvatarDisplayUrl(profile?.avatar_url).then(url=>{if(live)setAvatarUrl(url)}).catch(()=>{if(live)setAvatarUrl(null)});
    return()=>{live=false};
  },[profile?.avatar_url,reloadKey]);

  useEffect(()=>{
    let active=true;
    getAvatarDisplayUrl(profile?.cover_url).then(url=>{if(active)setCoverUrl(url)}).catch(()=>{if(active)setCoverUrl(null)});
    return()=>{active=false};
  },[profile?.cover_url,reloadKey]);

  async function moveSceneToCurrentCampus(sceneId){
    await shareOwnSceneWithCurrentCampus(sceneId);
    setSceneRevision(value=>value+1);
  }

  if(!profile)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:theme.bg}}>
    <ActivityIndicator color={theme.accent}/>
  </View>;
  return <StudentProfileView
    own
    theme={theme}
    student={{...profile,cover_signed_url:coverUrl}}
    avatarUrl={avatarUrl}
    scenes={scenes}
    sceneCount={sceneCount}
    peepCount={peepCount}
    onMenu={onMenu}
    onEdit={onEdit}
    onEditPhoto={onEditPicture}
    onEditCover={onEditCover}
    footer={<PassportProfileCards profileId={profile?.id} theme={theme}/>}
    onMoveScene={moveSceneToCurrentCampus}
  />;
}
