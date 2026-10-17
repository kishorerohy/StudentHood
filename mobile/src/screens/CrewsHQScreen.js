import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getVisibleCrews,getMyCrewMembership,getCrewMembersForOrganizer,changeCrewMembership} from '../crewsHub';
import {getProfileCard} from '../api';
import useLiveRefresh from '../useLiveRefresh';

export default function CrewsHQScreen({theme,profile,onBack,onHangs}){
 const [enabled,setEnabled]=useState(false);
 const [ready,setReady]=useState(false);
 const [rows,setRows]=useState([]);
 const [selected,setSelected]=useState(null);
 const [membership,setMembership]=useState(null);
 const [requests,setRequests]=useState([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  try{
   const flags=await getExperienceFlags();
   setEnabled(flags.crews_hq===true);
   if(!flags.crews_hq){setRows([]);return;}
   setRows(await getVisibleCrews());
  }catch(e){setError(e.message);}
  finally{setReady(true);}
 },[]);
 const loadSelected=useCallback(async()=>{
  if(!selected?.id||!profile?.id)return;
  try{
   const own=await getMyCrewMembership(selected.id,profile.id);
   setMembership(own);
   if(selected.creator_id===profile.id){
    const roster=await getCrewMembersForOrganizer(selected.id);
    const requested=roster.filter(row=>row.status==='requested');
    const labels=await Promise.all(requested.map(async row=>{
      try{
       const person=await getProfileCard(row.user_id);
       return {...row,label:person?.full_name||person?.username||'Private student'};
      }catch{return {...row,label:'Private student'};}
    }));
    setRequests(labels);
   }else setRequests([]);
  }catch(e){setError(e.message);}
 },[selected?.id,selected?.creator_id,profile?.id]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{loadSelected()},[loadSelected]);
 useLiveRefresh({tables:['crews','studenthood_crew_memberships'],intervalMs:20000,enabled,
   refresh:()=>selected?loadSelected():load()});
 async function act(action,memberId=null){
  if(!selected||busy)return;
  setBusy(true);setError('');
  try{await changeCrewMembership(selected.id,action,memberId);await loadSelected();}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <View style={styles.top}>
   <Pressable onPress={()=>selected?setSelected(null):onBack()} accessibilityRole="button" accessibilityLabel="Back">
    <Feather name="arrow-left" size={23} color={theme.text}/>
   </Pressable>
   <View style={{flex:1}}/>
   <Pressable onPress={()=>selected?loadSelected():load()} accessibilityRole="button" accessibilityLabel="Refresh Crews" disabled={busy}>
    <Feather name="refresh-cw" size={18} color={theme.muted}/>
   </Pressable>
  </View>
  <ScrollView contentContainerStyle={styles.content}>
   {!ready?<ActivityIndicator color={theme.accent}/>:
    !enabled?<Text style={[styles.copy,{color:theme.muted}]}>Crews HQ is not enabled for your campus yet. Existing Crews remain available in StudentHood.</Text>:
    selected?<View style={styles.group}>
      <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
       <Feather name="users" color={theme.accent} size={25}/>
       <Text style={[styles.name,{color:theme.text}]}>{selected.name}</Text>
       {!!selected.description&&<Text style={[styles.copy,{color:theme.muted}]}>{selected.description}</Text>}
       <Text style={[styles.copy,{color:theme.muted}]}>{selected.campus_name||'Campus Crew'} · {selected.category||'Community'}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>{selected.visibility==='invite_only'?'Invite-only membership':'Campus membership'}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>Your membership: {membership?.status||'Not joined'}</Text>
      </View>
      {selected.creator_id===profile?.id?
        <View style={styles.group}>
         <Text style={[styles.subTitle,{color:theme.text}]}>Membership requests</Text>
         {!requests.length?<Text style={[styles.copy,{color:theme.muted}]}>No pending membership requests.</Text>:
          requests.map(row=><View key={row.user_id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            <Text style={[styles.copy,{color:theme.text}]}>{row.label}</Text>
            <View style={styles.buttons}>
             <Action theme={theme} text="Approve" disabled={busy} onPress={()=>act('approve',row.user_id)}/>
             <Action theme={theme} text="Decline" disabled={busy} onPress={()=>act('decline',row.user_id)} outline/>
            </View>
          </View>)}
         <Pressable onPress={onHangs} accessibilityRole="button" style={[styles.link,{borderColor:theme.line}]}>
          <Feather name="calendar" color={theme.accent} size={17}/>
          <Text style={[styles.copy,{color:theme.text}]}>Browse campus Hangs</Text>
         </Pressable>
        </View>:
        <View style={styles.group}>
         {membership?.status==='active'?
          <Action theme={theme} text="Leave Crew" disabled={busy} outline onPress={()=>act('leave')}/>:
          selected.visibility==='invite_only'
            ?<Text style={[styles.copy,{color:theme.muted}]}>This private Crew requires an invitation.</Text>
            :<Action theme={theme} text="Join Crew" disabled={busy} onPress={()=>act('join')}/>}
        </View>}
    </View>:
    <View style={styles.group}>
     <Text style={[styles.copy,{color:theme.muted}]}>Discover real, eligible communities at your campus. To create a new Crew, use the central +.</Text>
     {!rows.length?<Text style={[styles.copy,{color:theme.muted}]}>No permitted Crews are available yet.</Text>:
       rows.map(crew=><Pressable key={crew.id} onPress={()=>{setMembership(null);setSelected(crew)}}
         accessibilityRole="button" style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
         <View style={styles.titleRow}>
          <Feather name="users" color={theme.accent} size={20}/>
          <Text style={[styles.name,{color:theme.text,flex:1}]} numberOfLines={2}>{crew.name}</Text>
          <Feather name="chevron-right" color={theme.muted} size={18}/>
         </View>
         <Text style={[styles.copy,{color:theme.muted}]}>{crew.category||'Campus Crew'} · {crew.campus_name}</Text>
         {!!crew.description&&<Text style={[styles.copy,{color:theme.muted}]} numberOfLines={3}>{crew.description}</Text>}
        </Pressable>)}
    </View>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger,fontSize:12}}>{error}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
function Action({theme,text,onPress,disabled,outline=false}){
 return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
   style={[styles.action,{backgroundColor:outline?theme.surface:theme.accent,borderColor:outline?theme.line:theme.accent}]}>
    <Text style={{fontWeight:'800',color:outline?theme.text:'#fff'}}>{text}</Text>
  </Pressable>;
}
const styles=StyleSheet.create({
 root:{flex:1},top:{minHeight:55,paddingHorizontal:17,alignItems:'center',flexDirection:'row',gap:20},
 content:{padding:18,paddingBottom:70,gap:18,width:'100%',maxWidth:720,alignSelf:'center'},
 group:{gap:13},card:{padding:16,borderWidth:1,borderRadius:18,gap:9},
 titleRow:{flexDirection:'row',gap:10,alignItems:'center'},
 name:{fontSize:16,fontWeight:'900'},subTitle:{fontWeight:'900',fontSize:15},
 copy:{fontSize:12,lineHeight:19},
 buttons:{flexDirection:'row',gap:8},
 action:{borderRadius:13,borderWidth:1,padding:13,alignItems:'center',minWidth:95},
 link:{borderWidth:1,borderRadius:13,padding:14,flexDirection:'row',gap:10,alignItems:'center'}
});
