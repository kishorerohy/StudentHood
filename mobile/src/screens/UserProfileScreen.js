import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getAvatarDisplayUrl,getPeepConnection,getProfileCard,getVisibleProfileScenes,sendPeepRequest} from '../api';

export default function UserProfileScreen({userId,currentUserId,theme,onBack,onPing}){
  const [card,setCard]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [avatar,setAvatar]=useState(null);
  const [connection,setConnection]=useState(null);
  const [peepReady,setPeepReady]=useState(false);
  const [peepError,setPeepError]=useState('');
  const [requestBusy,setRequestBusy]=useState(false);
  const [scenes,setScenes]=useState([]);
  const [scenesLoading,setScenesLoading]=useState(false);

  useEffect(()=>{
    let live=true;
    setLoading(true);
    setCard(null);
    setError('');
    setAvatar(null);
    setConnection(null);
    setPeepReady(false);
    setPeepError('');
    setScenes([]);
    setScenesLoading(false);
    (async()=>{
      try{
        const result=await getProfileCard(userId);
        if(!live) return;
        setCard(result);
        if(!result) return;
        setScenesLoading(true);
        const [photo,relationship,recent]=await Promise.allSettled([
          getAvatarDisplayUrl(result.avatar_url),
          getPeepConnection(userId),
          getVisibleProfileScenes(userId,{limit:12})
        ]);
        if(!live) return;
        if(photo.status==='fulfilled') setAvatar(photo.value);
        if(relationship.status==='fulfilled'){
          setConnection(relationship.value);
          setPeepReady(true);
        }else{
          setPeepError(relationship.reason?.message||'Unable to check Peep status.');
        }
        if(recent.status==='fulfilled') setScenes(recent.value);
      }catch(e){
        if(live)setError(e?.message||'Unable to load this student profile.');
      }finally{
        if(live){setLoading(false);setScenesLoading(false);}
      }
    })();
    return()=>{live=false};
  },[userId]);

  const isPeep=!!card?.is_peep||connection?.status==='accepted';
  const outgoing=connection?.status==='pending'&&connection?.requester_id!==userId;
  const incoming=connection?.status==='pending'&&connection?.requester_id===userId;
  const isSelf=!!currentUserId&&currentUserId===userId;
  const canRequest=!!card&&!isSelf&&!isPeep&&!connection&&peepReady&&!requestBusy;
  const peepLabel=isSelf?'Your profile':requestBusy?'Sending…':isPeep?'Peeps':outgoing?'Request sent':incoming?'Request received':connection?'Unavailable':'Add Peep';
  const canPing=!!card?.can_ping;
  const interests=Array.isArray(card?.interests)?card.interests.filter(value=>typeof value==='string'&&value.trim()):[];

  async function addPeep(){
    if(!canRequest)return;
    setRequestBusy(true);
    setPeepError('');
    try{
      const result=await sendPeepRequest(userId);
      setConnection(result);
    }catch(e){
      setPeepError(e?.message||'Could not send the Peep request.');
    }finally{
      setRequestBusy(false);
    }
  }

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable onPress={onBack} style={[styles.back,{backgroundColor:theme.surface,borderColor:theme.line}]} accessibilityRole="button" accessibilityLabel="Back to Scenes">
        <Feather name="arrow-left" size={21} color={theme.text}/>
      </Pressable>
      <Text style={[styles.headerTitle,{color:theme.text}]}>Student profile</Text>
      <View style={{width:44}}/>
    </View>

    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {loading?<View style={styles.center}><ActivityIndicator color={theme.accent}/><Text style={[styles.secondary,{color:theme.muted}]}>Loading student profile…</Text></View>:
      error?<Text style={[styles.unavailable,{color:theme.muted}]}>{error}</Text>:
      !card?<Text style={[styles.unavailable,{color:theme.muted}]}>This profile isn't available to you.</Text>:
      <>
        <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
            {avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<Feather name="user" size={48} color={theme.accent}/>}
          </View>
          <Text style={[styles.name,{color:theme.text}]}>{card.full_name||card.username||'Student'}</Text>
          {!!card.username&&<Text style={[styles.handle,{color:theme.muted}]}>@{card.username}</Text>}
          <Text style={[styles.studentId,{color:theme.muted}]}>Student ID · {card.id.slice(0,8).toUpperCase()}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={addPeep}
              disabled={!canRequest}
              accessibilityRole="button"
              accessibilityState={{disabled:!canRequest}}
              style={[styles.action,{backgroundColor:canRequest?theme.accent:theme.surface2,borderColor:canRequest?theme.accent:theme.line}]}>
              <Feather name={isPeep?'check':outgoing?'clock':'user-plus'} size={18} color={canRequest?'#fff':theme.muted}/>
              <Text style={[styles.actionText,{color:canRequest?'#fff':theme.muted}]}>{peepLabel}</Text>
            </Pressable>
            <Pressable
              onPress={()=>onPing?.({id:card.id,full_name:card.full_name,username:card.username})}
              disabled={!canPing}
              accessibilityRole="button"
              accessibilityState={{disabled:!canPing}}
              style={[styles.action,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
              <Feather name="message-circle" size={18} color={canPing?theme.text:theme.muted}/>
              <Text style={[styles.actionText,{color:canPing?theme.text:theme.muted}]}>Ping</Text>
            </Pressable>
          </View>
          {!!peepError&&<Text accessibilityRole="alert" style={[styles.notice,{color:theme.accent}]}>{peepError}</Text>}
          {outgoing&&<Text style={[styles.notice,{color:theme.muted}]}>Your Peep request is waiting for a response.</Text>}
          {incoming&&<Text style={[styles.notice,{color:theme.muted}]}>This student has already sent you a Peep request.</Text>}
          <Text style={[styles.notice,{color:theme.muted}]}>
            {canPing?'Ping messaging is coming soon. No message can be sent yet.':"Ping isn't available under your Peep and safety permissions."}
          </Text>
        </View>

        <View style={[styles.section,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>About</Text>
          <Text style={[styles.secondary,{color:theme.muted}]}>{card.bio||'This student has not added a bio yet.'}</Text>
          {interests.length>0&&<>
            <Text style={[styles.subheading,{color:theme.text}]}>Interests</Text>
            <View style={styles.chips}>{interests.map((interest,i)=>
              <View key={i} style={[styles.chip,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
                <Text style={[styles.chipText,{color:theme.text}]}>{interest}</Text>
              </View>
            )}</View>
          </>}
        </View>

        <View style={[styles.section,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>Campus</Text>
          <InfoLine theme={theme} icon="book-open" label="Institution" value={card.campus_name||'Not shared'}/>
          <InfoLine theme={theme} icon="map-pin" label="City / location" value={card.city||'Not shared'}/>
        </View>

        <View style={[styles.section,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>Scenes</Text>
          <Text style={[styles.secondary,{color:theme.muted}]}>Recent Scenes you are allowed to view.</Text>
          {scenesLoading?<ActivityIndicator style={{marginTop:16}} color={theme.accent}/>:
            scenes.length===0?<Text style={[styles.emptyScenes,{color:theme.muted}]}>No visible Scenes yet.</Text>:
            <View style={styles.sceneGrid}>{scenes.map(scene=>
              <View key={scene.id} style={[styles.scene,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
                {scene.media_type==='image'&&scene.media_signed_url?
                  <Image source={{uri:scene.media_signed_url}} style={styles.sceneImage}/>:
                scene.media_type==='video'?
                  <View style={styles.scenePlaceholder}><Feather name="play-circle" size={29} color={theme.accent}/><Text style={[styles.sceneLabel,{color:theme.muted}]}>Video Scene</Text></View>:
                  <View style={styles.scenePlaceholder}><Feather name="file-text" size={25} color={theme.accent}/></View>}
                {!!scene.body&&<Text numberOfLines={3} style={[styles.sceneBody,{color:theme.text}]}>{scene.body}</Text>}
              </View>
            )}</View>}
        </View>
      </>}
    </ScrollView>
  </View>;
}

function InfoLine({theme,icon,label,value}){
  return <View style={[styles.infoLine,{borderTopColor:theme.line}]}>
    <Feather name={icon} size={19} color={theme.accent}/>
    <View style={{flex:1}}>
      <Text style={[styles.infoLabel,{color:theme.muted}]}>{label}</Text>
      <Text style={[styles.infoValue,{color:theme.text}]}>{value}</Text>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
  back:{height:44,width:44,borderWidth:1,borderRadius:14,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:18,fontWeight:'800'},
  scroll:{flex:1},
  content:{padding:16,paddingBottom:80,gap:14,maxWidth:820,width:'100%',alignSelf:'center'},
  center:{paddingTop:100,alignItems:'center',gap:12},
  unavailable:{paddingTop:90,textAlign:'center',fontSize:13},
  hero:{borderWidth:1,borderRadius:24,paddingHorizontal:20,paddingVertical:24,alignItems:'center'},
  avatar:{width:112,height:112,borderRadius:56,overflow:'hidden',alignItems:'center',justifyContent:'center'},
  avatarImage:{width:'100%',height:'100%'},
  name:{fontSize:25,fontWeight:'900',marginTop:14,textAlign:'center'},
  handle:{fontSize:13,marginTop:5},
  studentId:{fontSize:10,marginTop:8},
  bio:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:14,maxWidth:500},
  actions:{flexDirection:'row',width:'100%',gap:10,marginTop:20},
  action:{flex:1,borderWidth:1,borderRadius:15,paddingVertical:14,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,minHeight:50},
  actionText:{fontSize:13,fontWeight:'800',textAlign:'center'},
  notice:{fontSize:11,lineHeight:16,textAlign:'center',marginTop:12},
  section:{borderWidth:1,borderRadius:22,padding:20,gap:10},
  sectionTitle:{fontSize:19,fontWeight:'800'},
  secondary:{fontSize:12,lineHeight:19},
  subheading:{fontSize:13,fontWeight:'800',marginTop:7},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
  chip:{borderRadius:99,borderWidth:1,paddingHorizontal:11,paddingVertical:7},
  chipText:{fontSize:11,fontWeight:'700'},
  infoLine:{borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12},
  infoLabel:{fontSize:10},
  infoValue:{fontSize:13,fontWeight:'700',marginTop:4},
  emptyScenes:{paddingVertical:12,fontSize:12},
  sceneGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  scene:{width:'48%',minHeight:125,borderWidth:1,borderRadius:14,overflow:'hidden'},
  sceneImage:{height:150,width:'100%'},
  scenePlaceholder:{height:110,alignItems:'center',justifyContent:'center',gap:7},
  sceneLabel:{fontSize:10,fontWeight:'700'},
  sceneBody:{fontSize:11,lineHeight:16,padding:10}
});
