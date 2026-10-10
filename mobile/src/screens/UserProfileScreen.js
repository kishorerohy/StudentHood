import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getAvatarDisplayUrl,getPeepConnection,getProfileCard,getVisibleProfileScenes,getVisibleSceneCount,sendPeepRequest} from '../api';
import StudentProfileView from '../components/StudentProfileView';
import {supabase} from '../supabase';

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
  const [sceneCount,setSceneCount]=useState(null);
  const [profileOptionsOpen,setProfileOptionsOpen]=useState(false);
  const [reportBusy,setReportBusy]=useState(false);
  const [reportNotice,setReportNotice]=useState('');

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
    setSceneCount(null);

    (async()=>{
      try{
        const result=await getProfileCard(userId);
        if(!live)return;
        setCard(result);
        if(!result)return;
        const [photo,relationship,recent,count,cover]=await Promise.allSettled([
          getAvatarDisplayUrl(result.avatar_url),
          getPeepConnection(userId),
          getVisibleProfileScenes(userId,{limit:12}),
          getVisibleSceneCount(userId),
          getAvatarDisplayUrl(result.cover_url)
        ]);
        if(!live)return;
        if(photo.status==='fulfilled')setAvatar(photo.value);
        if(cover.status==='fulfilled')setCard({...result,cover_signed_url:cover.value});
        if(relationship.status==='fulfilled'){
          setConnection(relationship.value);
          setPeepReady(true);
        }else{
          setPeepError(relationship.reason?.message||'Unable to check Peep status.');
        }
        if(recent.status==='fulfilled')setScenes(recent.value);
        if(count.status==='fulfilled')setSceneCount(count.value);
      }catch(e){
        if(live)setError(e?.message||'Unable to load this student profile.');
      }finally{
        if(live)setLoading(false);
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

  async function report(reason){
    if(reportBusy)return;
    setReportBusy(true);setReportNotice('');
    try{
      const {data,error}=await supabase.rpc('studenthood_report_profile',{
        p_target_user:userId,p_reason:reason
      });
      if(error)throw error;
      setProfileOptionsOpen(false);
      setReportNotice(data?'Profile report submitted for safety review.':'You already reported this profile.');
    }catch(e){setPeepError(e?.message||'Unable to submit this profile report.');}
    finally{setReportBusy(false);}
  }

  if(loading)return <View style={[styles.center,{backgroundColor:theme.bg}]}>
    <ActivityIndicator color={theme.accent}/>
    <Text style={{color:theme.muted}}>Loading student profile…</Text>
  </View>;
  if(error||!card)return <View style={[styles.center,{backgroundColor:theme.bg}]}>
    <Pressable onPress={onBack} style={styles.back}><Feather name="arrow-left" size={22} color={theme.text}/></Pressable>
    <Text style={{color:theme.muted,textAlign:'center'}}>{error||"This profile isn't available to you."}</Text>
  </View>;

  return <><StudentProfileView
    theme={theme}
    student={card}
    avatarUrl={avatar}
    scenes={scenes}
    sceneCount={sceneCount}
    onBack={onBack}
    actions={<View style={styles.actionArea}>
      <View style={styles.actions}>
        <Pressable
          onPress={addPeep}
          disabled={!canRequest}
          accessibilityRole="button"
          accessibilityState={{disabled:!canRequest}}
          style={[styles.action,{backgroundColor:canRequest?theme.accent:theme.surface2,borderColor:canRequest?theme.accent:theme.line}]}>
          <Feather name={isPeep?'check':outgoing?'clock':'user-plus'} size={18} color={canRequest?'#fff':theme.muted}/>
          <Text style={[styles.actionText,{color:canRequest?'#fff':theme.text}]}>{peepLabel}</Text>
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
        <Pressable
          onPress={()=>{setPeepError('');setProfileOptionsOpen(true)}}
          accessibilityRole="button" accessibilityLabel="Student profile options"
          style={[styles.more,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <Feather name="more-vertical" size={21} color={theme.text}/>
        </Pressable>
      </View>
      {!!reportNotice&&<Text accessibilityRole="alert" style={[styles.note,{color:theme.accent}]}>{reportNotice}</Text>}
      {!!peepError&&<Text accessibilityRole="alert" style={[styles.note,{color:theme.danger}]}>{peepError}</Text>}
      {outgoing&&<Text style={[styles.note,{color:theme.muted}]}>Peep request sent. Awaiting acceptance.</Text>}
      {incoming&&<Text style={[styles.note,{color:theme.muted}]}>This student has already sent you a Peep request.</Text>}
      <Text style={[styles.note,{color:theme.muted}]}>
        {canPing?'Ping messaging is coming soon. No message has been sent.':'Ping is restricted by Peep and safety permissions.'}
      </Text>
    </View>}
  />
  <Modal visible={profileOptionsOpen} transparent animationType="fade" onRequestClose={()=>setProfileOptionsOpen(false)}>
    <View style={styles.optionsOverlay}>
      <Pressable onPress={()=>setProfileOptionsOpen(false)} accessibilityRole="button" accessibilityLabel="Close profile options" style={StyleSheet.absoluteFillObject}/>
      <View style={[styles.optionsCard,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.optionsTitle,{color:theme.text}]}>Profile options</Text>
        <Text style={[styles.optionsCopy,{color:theme.muted}]}>Report safety concerns. Reports are private and reviewed, not published.</Text>
        {[
          ['Harassment or bullying','harassment'],
          ['Spam','spam'],
          ['Impersonation','impersonation'],
          ['Unsafe content or behaviour','unsafe'],
          ['Other concern','other']
        ].map(([label,reason])=><Pressable key={reason} onPress={()=>report(reason)} disabled={reportBusy} accessibilityRole="button" accessibilityLabel={'Report '+label}
          style={[styles.reportOption,{borderBottomColor:theme.line}]}>
          <Feather name="flag" size={16} color={theme.danger}/>
          <Text style={{color:theme.text,fontSize:13,flex:1}}>{label}</Text>
          {reportBusy?<ActivityIndicator size="small" color={theme.accent}/>:<Feather name="chevron-right" color={theme.muted} size={16}/>}
        </Pressable>)}
        <Pressable onPress={()=>setProfileOptionsOpen(false)} accessibilityRole="button" style={[styles.cancel,{backgroundColor:theme.surface2}]}><Text style={{color:theme.text,fontWeight:'800'}}>Cancel</Text></Pressable>
      </View>
    </View>
  </Modal>
  </>;
}

const styles=StyleSheet.create({
  center:{flex:1,alignItems:'center',justifyContent:'center',gap:14,padding:25},
  back:{position:'absolute',top:16,left:16,padding:10},
  actionArea:{paddingHorizontal:20,paddingTop:23},
  actions:{flexDirection:'row',gap:12},
  action:{flex:1,minHeight:50,borderWidth:1,borderRadius:25,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  actionText:{fontWeight:'800',fontSize:12,textAlign:'center'},
  more:{height:50,width:48,borderWidth:1,borderRadius:25,alignItems:'center',justifyContent:'center'},
  optionsOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'flex-end'},
  optionsCard:{borderWidth:1,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingTop:25,paddingBottom:38},
  optionsTitle:{fontSize:21,fontWeight:'900'},
  optionsCopy:{fontSize:12,lineHeight:18,marginTop:7,marginBottom:13},
  reportOption:{height:49,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth},
  cancel:{height:45,borderRadius:13,alignItems:'center',justifyContent:'center',marginTop:16},
  note:{marginTop:10,textAlign:'center',fontSize:11,lineHeight:16}
});
