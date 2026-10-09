import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  ActivityIndicator,Animated,Image,Modal,PanResponder,Pressable,RefreshControl,ScrollView,
  StyleSheet,Text,useWindowDimensions,View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {SceneIcon} from '../icons';
import {getCampusPeeps} from '../api';
import {fetchScenes,fetchSharedScene,shareScene,toggleSceneLike} from '../scenes';
import SceneCommentsPanel from '../components/SceneCommentsPanel';

const FILTERS=['For you','Viral','Nearby','Campus','Live now'];

export default function ScenesScreen({theme,profile,safety,onOpenProfile,onOpenCreate,onOpenPulse,focusScene,reloadKey=0}){
  const [filter,setFilter]=useState('For you');
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [viewerIndex,setViewerIndex]=useState(null);
  const [commentScene,setCommentScene]=useState(null);
  const [sharedScene,setSharedScene]=useState(null);
  const [sharedLoading,setSharedLoading]=useState(false);
  const [pulsePeeps,setPulsePeeps]=useState([]);

  const loadPulse=useCallback(async()=>{
    try{
      const rows=await getCampusPeeps({limit:12,offset:0});
      const selfId=profile?.id;
      const seen=new Set();
      setPulsePeeps((rows||[]).filter(item=>{
        if(!item?.id||item.id===selfId||seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0,8));
    }catch{
      setPulsePeeps([]);
    }
  },[profile?.id,profile?.campus_name]);

  const load=useCallback(async(nextFilter=filter,{refresh=false}={})=>{
    refresh?setRefreshing(true):setLoading(true);
    setError('');
    try{
      const data=await fetchScenes(nextFilter,30,0);
      setItems(data);
    }catch(e){
      setError(e?.message||'Could not load Scenes.');
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  },[filter]);

  useEffect(()=>{load(filter)},[filter,reloadKey]);
  useEffect(()=>{loadPulse()},[loadPulse,reloadKey]);

  useEffect(()=>{
    if(!focusScene?.id)return;
    let active=true;
    setSharedLoading(true);
    fetchSharedScene(focusScene.id).then(scene=>{
      if(!active)return;
      setSharedScene(scene);
      setViewerIndex(0);
    }).catch(e=>{
      if(active)setError(e?.message||'This Scene cannot be opened.');
    }).finally(()=>{if(active)setSharedLoading(false)});
    return()=>{active=false};
  },[focusScene?.id,focusScene?.token]);

  async function handleShare(scene){
    try{await shareScene(scene.id)}
    catch(e){setError(e?.message||'Could not open your device share options.');}
  }

  async function like(sceneId){
    try{
      const result=await toggleSceneLike(sceneId);
      setItems(current=>current.map(item=>item.id===sceneId?{
        ...item,
        liked_by_me:!!result?.liked,
        like_count:Number(result?.like_count||0)
      }:item));
    }catch(e){
      setError(e?.message||'Could not update that Scene.');
    }
  }

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(filter,{refresh:true})} tintColor={theme.accent}/>}
    >
      <View style={styles.intro}>
        <View>
          <Text style={[styles.kicker,{color:theme.accent}]}>YOUR CAMPUS, RIGHT NOW</Text>
          <Text style={[styles.h1,{color:theme.text}]}>Scenes</Text>
        </View>
        <View style={styles.introRight}>
          {safety?.youth_account&&<View style={[styles.teenBadge,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            <Feather name="shield" size={14} color={theme.accent}/><Text style={[styles.teenText,{color:theme.text}]}>Teen Mode</Text>
          </View>}
          <View style={[styles.campusPill,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            <Feather name="map-pin" size={14} color={theme.accent}/>
            <Text numberOfLines={1} style={[styles.campusText,{color:theme.muted}]}>{profile?.campus_name||'Your campus'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <View style={styles.sectionHead}><Text style={[styles.h2,{color:theme.text}]}>Campus people</Text><Pressable accessibilityRole="button" accessibilityLabel="Explore Pulse" onPress={onOpenPulse}><Text style={[styles.link,{color:theme.accent}]}>Explore Pulse →</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pulseRow}>
          <Pressable onPress={onOpenPulse} style={styles.pulse}>
            <View style={[styles.pulseRing,{borderColor:theme.line,backgroundColor:theme.surface2}]}><Feather name="plus" size={22} color={theme.accent}/></View>
            <Text style={[styles.pulseName,{color:theme.muted}]}>Pulse soon</Text>
          </Pressable>
          {pulsePeeps.map(item=><Pressable key={item.id} onPress={()=>onOpenProfile?.(item.id)} style={styles.pulse}>
            <View style={[styles.pulseRing,{borderColor:theme.accent,backgroundColor:theme.surface2}]}>
              {item.avatar_url?<Image source={{uri:item.avatar_url}} style={styles.pulseImage}/>:<Feather name="user" size={22} color={theme.muted}/>}
            </View>
            <Text numberOfLines={1} style={[styles.pulseName,{color:theme.muted}]}>{item.full_name?.split(' ')[0]||item.username||'Peep'}</Text>
          </Pressable>)}
        </ScrollView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityLabel="Scenes filters">
        {FILTERS.map(name=><Pressable key={name} onPress={()=>setFilter(name)} style={[styles.chip,{backgroundColor:filter===name?theme.accent:theme.surface,borderColor:filter===name?theme.accent:theme.line}]}>
          <Text style={[styles.chipText,{color:filter===name?'#fff':theme.muted}]}>{name}</Text>
        </Pressable>)}
      </ScrollView>

      <View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <View style={styles.sectionHead}>
          <View><Text style={[styles.live,{color:theme.accent}]}>● LIVE</Text><Text style={[styles.h2,{color:theme.text}]}>Happening around campus</Text></View>
          <Feather name="arrow-up-right" size={18} color={theme.accent}/>
        </View>
        <View style={styles.happeningRow}>
          {[
            ['trending-up','Viral','What campus is talking about'],
            ['map-pin','Nearby',safety?.youth_account?'Approximate campus activity':'Activity around campus'],
            ['zap','Live now','Fresh Scenes from the last two hours']
          ].map(([icon,title,copy])=><Pressable key={title} onPress={()=>setFilter(title==='Live now'?'Live now':title)} style={[styles.happening,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            <Feather name={icon} size={18} color={theme.accent}/>
            <Text style={[styles.happeningTitle,{color:theme.text}]}>{title}</Text>
            <Text style={[styles.happeningCopy,{color:theme.muted}]}>{copy}</Text>
          </Pressable>)}
        </View>
      </View>

      {!!error&&<View style={[styles.message,{backgroundColor:theme.surface,borderColor:theme.line}]}><Feather name="alert-circle" size={17} color={theme.danger}/><Text style={[styles.messageText,{color:theme.muted}]}>{error}</Text></View>}

      {loading?<View style={styles.loading}><ActivityIndicator color={theme.accent}/><Text style={[styles.loadingText,{color:theme.muted}]}>Loading your campus…</Text></View>:
        items.length===0?<View style={[styles.empty,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <View style={[styles.emptyIcon,{backgroundColor:theme.accentSoft}]}><SceneIcon size={28} color={theme.accent}/></View>
          <Text style={[styles.emptyTitle,{color:theme.text}]}>Your campus is quiet here.</Text>
          <Text style={[styles.emptyCopy,{color:theme.muted}]}>Be the first to post a Scene. New Scenes are moderated before broader distribution.</Text>
          <Pressable onPress={onOpenCreate} style={[styles.emptyButton,{backgroundColor:theme.accent}]}><Text style={styles.emptyButtonText}>Create a Scene</Text></Pressable>
        </View>:
        <View style={styles.feed}>{items.map((scene,index)=><SceneCard key={scene.id} scene={scene} theme={theme} onOpen={()=>{setSharedScene(null);setViewerIndex(index)}} onProfile={()=>onOpenProfile?.(scene.author_id)} onLike={()=>like(scene.id)} onComments={()=>setCommentScene(scene)} onShare={()=>handleShare(scene)}/>)}</View>
      }
    </ScrollView>

    {sharedLoading&&<View style={[styles.message,{backgroundColor:theme.surface,borderColor:theme.line}]}><ActivityIndicator color={theme.accent}/><Text style={{color:theme.muted}}>Opening shared Scene…</Text></View>}
    <SceneViewer
      visible={viewerIndex!==null}
      scenes={sharedScene?[sharedScene]:items}
      index={viewerIndex??0}
      onIndex={setViewerIndex}
      onClose={()=>{setViewerIndex(null);setSharedScene(null)}}
      onProfile={scene=>onOpenProfile?.(scene.author_id)}
      onLike={scene=>like(scene.id)}
      onComments={scene=>{setViewerIndex(null);setSharedScene(null);setCommentScene(scene)}}
      onShare={handleShare}
      theme={theme}
    />
    <Modal visible={!!commentScene} animationType="slide" presentationStyle="fullScreen" onRequestClose={()=>setCommentScene(null)}>
      {!!commentScene&&<SceneCommentsPanel scene={commentScene} theme={theme} onClose={()=>setCommentScene(null)} onSent={(sceneId,saved)=>{
        if(saved?.moderation_status==='approved')setItems(current=>current.map(row=>row.id===sceneId?{...row,comment_count:Number(row.comment_count||0)+1}:row));
      }}/>} 
    </Modal>
  </View>;
}

function SceneCard({scene,theme,onOpen,onProfile,onLike,onComments,onShare}){
  return <View style={[styles.sceneCard,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <View style={styles.sceneHead}>
      <Pressable onPress={onProfile} style={styles.creator}>
        <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
          {scene.author_avatar_url?<Image source={{uri:scene.author_avatar_url}} style={styles.avatarImage}/>:<Feather name="user" size={18} color={theme.muted}/>}
        </View>
        <View style={{flex:1}}>
          <Text style={[styles.creatorName,{color:theme.text}]}>{scene.author_name||scene.author_username||'Student'}</Text>
          <Text style={[styles.meta,{color:theme.muted}]}>{scene.author_campus_name||'Campus'} · {timeAgo(scene.created_at)}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.more}><Feather name="more-horizontal" size={20} color={theme.muted}/></Pressable>
    </View>

    <Pressable onPress={onOpen} style={[styles.media,{backgroundColor:theme.surface2}]}>
      {scene.media_signed_url&&scene.media_type==='image'?<Image source={{uri:scene.media_signed_url}} style={styles.mediaImage}/>:scene.media_type==='video'?<View style={styles.videoCard}><Feather name="play-circle" size={54} color="#fff"/><Text style={styles.videoLabel}>Video Scene</Text></View>:<View style={styles.textScene}><Text style={[styles.textSceneCopy,{color:theme.text}]}>{scene.body}</Text></View>}
      {!!scene.body&&scene.media_type!=='text'&&<View style={styles.mediaCaption}><Text numberOfLines={3} style={styles.mediaCaptionText}>{scene.body}</Text></View>}
      <View style={styles.sceneTag}><Text style={styles.sceneTagText}>{scene.content_class==='teen'?'Teen safe':'Scene'}</Text></View>
    </Pressable>

    <View style={styles.actions}>
      <Pressable onPress={onLike} style={styles.action}><Feather name="heart" size={19} color={scene.liked_by_me?theme.accent:theme.muted}/><Text style={[styles.actionText,{color:scene.liked_by_me?theme.accent:theme.muted}]}>{compact(scene.like_count)}</Text></Pressable>
      <Pressable onPress={onComments} accessibilityRole="button" accessibilityLabel="View and add comments" style={styles.action}><Feather name="message-circle" size={19} color={theme.muted}/><Text style={[styles.actionText,{color:theme.muted}]}>{compact(scene.comment_count)}</Text></Pressable>
      <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share Scene" style={styles.action}><Feather name="send" size={19} color={theme.muted}/><Text style={[styles.actionText,{color:theme.muted}]}>Share Scene</Text></Pressable>
      <Feather name="bookmark" size={19} color={theme.muted} style={{marginLeft:'auto'}}/>
    </View>
  </View>;
}

function SceneViewer({visible,scenes,index,onIndex,onClose,onProfile,onLike,onComments,onShare,theme}){
  const {width}=useWindowDimensions();
  const slide=useRef(new Animated.Value(width)).current;
  const start=useRef({x:0,y:0}).current;

  useEffect(()=>{
    if(visible){
      slide.setValue(width);
      Animated.timing(slide,{toValue:0,duration:260,useNativeDriver:true}).start();
    }
  },[visible,slide,width]);

  function leave(next){
    Animated.timing(slide,{toValue:width,duration:230,useNativeDriver:true})
      .start(()=>{onClose();next?.()});
  }
  const pan=useMemo(()=>PanResponder.create({
    // Only claim an actual swipe; taps belong to the action Pressables.
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>25||Math.abs(g.dy)>25,
    onPanResponderGrant:(_,g)=>{start.x=g.x0;start.y=g.y0},
    onPanResponderRelease:(_,g)=>{
      const dx=g.dx;
      const dy=g.dy;
      if(Math.max(Math.abs(dx),Math.abs(dy))<45) return;
      if(Math.abs(dx)>Math.abs(dy)&&dx<0){leave(()=>onProfile(scenes[index]));return;}
      if(Math.abs(dy)>=Math.abs(dx)){
        const next=(index+(dy<0?1:-1)+scenes.length)%scenes.length;
        onIndex(next);
      }
    }
  }),[index,scenes,onIndex,onProfile]);

  const scene=scenes[index];
  if(!scene) return null;

  return <Modal visible={visible} animationType="none" statusBarTranslucent onRequestClose={()=>leave()}>
    <Animated.View style={[styles.viewer,{transform:[{translateX:slide}]}]} {...pan.panHandlers}>
      {scene.media_signed_url&&scene.media_type==='image'?<Image source={{uri:scene.media_signed_url}} style={StyleSheet.absoluteFillObject} resizeMode="cover"/>:<View style={[StyleSheet.absoluteFillObject,{backgroundColor:'#08090A',alignItems:'center',justifyContent:'center'}]}>{scene.media_type==='video'?<><Feather name="play-circle" size={72} color="#fff"/><Text style={styles.viewerVideo}>Video Scene</Text></>:<Text style={styles.viewerText}>{scene.body}</Text>}</View>}
      <View style={styles.viewerShade}/>
      <Pressable onPress={()=>leave()} style={styles.viewerClose}><Feather name="x" size={24} color="#fff"/></Pressable>
      <View style={styles.viewerBottom}>
        <Pressable onPress={()=>leave(()=>onProfile(scene))} style={styles.viewerCreator}><View style={styles.viewerAvatar}>{scene.author_avatar_url?<Image source={{uri:scene.author_avatar_url}} style={styles.avatarImage}/>:<Feather name="user" size={18} color="#fff"/>}</View><View><Text style={styles.viewerName}>{scene.author_name||scene.author_username||'Student'}</Text><Text style={styles.viewerMeta}>{scene.author_campus_name||'Campus'} · {timeAgo(scene.created_at)}</Text></View></Pressable>
        {!!scene.body&&scene.media_type!=='text'&&<Text style={styles.viewerCaption}>{scene.body}</Text>}
        <Text style={styles.viewerHint}>Swipe left for profile · Swipe up for next Scene</Text>
      </View>
      <View style={styles.viewerActions}>
        <Pressable onPress={()=>onLike(scene)} style={styles.viewerAction}><Feather name="heart" size={24} color={scene.liked_by_me?theme.accent:'#fff'}/><Text style={styles.viewerActionText}>{compact(scene.like_count)}</Text></Pressable>
        <Pressable onPress={()=>onComments?.(scene)} accessibilityRole="button" accessibilityLabel="View comments" style={styles.viewerAction}><Feather name="message-circle" size={24} color="#fff"/><Text style={styles.viewerActionText}>{compact(scene.comment_count)}</Text></Pressable>
        <Pressable onPress={()=>onShare?.(scene)} accessibilityRole="button" accessibilityLabel="Share Scene" style={styles.viewerAction}><Feather name="send" size={24} color="#fff"/><Text style={styles.viewerActionText}>Share Scene</Text></Pressable>
      </View>
    </Animated.View>
  </Modal>;
}

function compact(value){
  const n=Number(value||0);
  if(n>=1000000) return (n/1000000).toFixed(n>=10000000?0:1).replace('.0','')+'M';
  if(n>=1000) return (n/1000).toFixed(n>=10000?0:1).replace('.0','')+'K';
  return String(n);
}
function timeAgo(value){
  const ms=Date.now()-new Date(value).getTime();
  const min=Math.max(1,Math.floor(ms/60000));
  if(min<60) return min+'m';
  const hr=Math.floor(min/60);
  if(hr<24) return hr+'h';
  return Math.floor(hr/24)+'d';
}

const styles=StyleSheet.create({
  root:{flex:1},
  content:{paddingHorizontal:12,paddingTop:18,paddingBottom:120,gap:14,maxWidth:980,width:'100%',alignSelf:'center'},
  intro:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.6,marginBottom:5},
  h1:{fontSize:34,fontWeight:'800',letterSpacing:-1.4},
  introRight:{alignItems:'flex-end',gap:6,maxWidth:'55%'},
  teenBadge:{height:30,borderWidth:1,borderRadius:99,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9},
  teenText:{fontSize:9,fontWeight:'800'},
  campusPill:{height:34,borderWidth:1,borderRadius:99,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,maxWidth:180},
  campusText:{fontSize:10,flexShrink:1},
  panel:{borderWidth:1,borderRadius:20,padding:15},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  h2:{fontSize:16,fontWeight:'800'},
  link:{fontSize:10,fontWeight:'800'},
  live:{fontSize:9,fontWeight:'900',letterSpacing:1.2,marginBottom:3},
  pulseRow:{gap:10,paddingTop:13},
  pulse:{width:58,alignItems:'center',gap:5},
  pulseRing:{width:52,height:52,borderRadius:26,borderWidth:2,padding:2,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  pulseImage:{width:'100%',height:'100%',borderRadius:24},
  pulseName:{fontSize:9,maxWidth:58},
  filters:{gap:7},
  chip:{borderWidth:1,borderRadius:99,paddingHorizontal:13,paddingVertical:8},
  chipText:{fontSize:10,fontWeight:'800'},
  happeningRow:{flexDirection:'row',gap:8,marginTop:12},
  happening:{flex:1,minHeight:100,borderWidth:1,borderRadius:15,padding:11},
  happeningTitle:{fontSize:11,fontWeight:'800',marginTop:8},
  happeningCopy:{fontSize:9,lineHeight:13,marginTop:3},
  message:{borderWidth:1,borderRadius:15,padding:12,flexDirection:'row',gap:8,alignItems:'center'},
  messageText:{fontSize:10,flex:1},
  loading:{padding:40,alignItems:'center',gap:10},
  loadingText:{fontSize:11},
  empty:{borderWidth:1,borderRadius:22,padding:28,alignItems:'center'},
  emptyIcon:{width:58,height:58,borderRadius:29,alignItems:'center',justifyContent:'center'},
  emptyTitle:{fontSize:20,fontWeight:'800',marginTop:13},
  emptyCopy:{fontSize:11,lineHeight:17,textAlign:'center',marginTop:6,maxWidth:360},
  emptyButton:{marginTop:16,paddingHorizontal:18,paddingVertical:11,borderRadius:13},
  emptyButtonText:{color:'#fff',fontSize:11,fontWeight:'900'},
  feed:{gap:14},
  sceneCard:{borderWidth:1,borderRadius:20,overflow:'hidden'},
  sceneHead:{height:66,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:13},
  creator:{flex:1,flexDirection:'row',alignItems:'center',gap:9},
  avatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarImage:{width:'100%',height:'100%',borderRadius:99},
  creatorName:{fontSize:12,fontWeight:'800'},
  meta:{fontSize:9,marginTop:3},
  more:{padding:8},
  media:{minHeight:300,position:'relative',overflow:'hidden'},
  mediaImage:{width:'100%',height:440},
  videoCard:{height:440,backgroundColor:'#111',alignItems:'center',justifyContent:'center',gap:9},
  videoLabel:{color:'#fff',fontSize:11,fontWeight:'800'},
  textScene:{minHeight:300,padding:26,justifyContent:'center'},
  textSceneCopy:{fontSize:28,lineHeight:35,fontWeight:'700',letterSpacing:-.7},
  mediaCaption:{position:'absolute',left:0,right:0,bottom:0,padding:16,paddingTop:40,backgroundColor:'rgba(0,0,0,.52)'},
  mediaCaptionText:{color:'#fff',fontSize:14,lineHeight:20,fontWeight:'700'},
  sceneTag:{position:'absolute',top:12,left:12,backgroundColor:'rgba(8,8,8,.68)',borderRadius:99,paddingHorizontal:9,paddingVertical:6},
  sceneTagText:{color:'#fff',fontSize:8,fontWeight:'900'},
  actions:{height:54,flexDirection:'row',alignItems:'center',gap:17,paddingHorizontal:13},
  action:{flexDirection:'row',alignItems:'center',gap:5},
  actionText:{fontSize:9,fontWeight:'700'},
  viewer:{flex:1,backgroundColor:'#000'},
  viewerShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.16)'},
  viewerClose:{position:'absolute',left:16,top:54,width:42,height:42,borderRadius:21,backgroundColor:'rgba(0,0,0,.46)',alignItems:'center',justifyContent:'center'},
  viewerBottom:{position:'absolute',left:18,right:86,bottom:44},
  viewerCreator:{flexDirection:'row',alignItems:'center',gap:9},
  viewerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:'rgba(0,0,0,.5)',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  viewerName:{color:'#fff',fontSize:12,fontWeight:'900'},
  viewerMeta:{color:'rgba(255,255,255,.72)',fontSize:9,marginTop:2},
  viewerCaption:{color:'#fff',fontSize:14,lineHeight:20,marginTop:13},
  viewerHint:{color:'rgba(255,255,255,.64)',fontSize:9,marginTop:9},
  viewerActions:{position:'absolute',right:16,bottom:48,gap:15},
  viewerAction:{alignItems:'center',gap:4},
  viewerActionText:{color:'#fff',fontSize:9,fontWeight:'800'},
  viewerText:{color:'#fff',fontSize:30,lineHeight:38,fontWeight:'700',padding:30,textAlign:'center'},
  viewerVideo:{color:'#fff',fontSize:12,fontWeight:'800',marginTop:10}
});
