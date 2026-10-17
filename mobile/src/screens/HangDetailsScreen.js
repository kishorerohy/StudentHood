import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getHangRsvpStatus,changeHangRsvp,getOrganizerHangRsvps} from '../crewsHub';
import {issueOrganizerHangConfirmation} from '../passport';
import {getProfileCard} from '../api';
import useLiveRefresh from '../useLiveRefresh';

// Only eligible Hangs supplied by the existing RLS-visible browse feed are accepted.
// The server repeats all visibility, capacity, campus and youth checks.
export default function HangDetailsScreen({hang,theme,profile,onBack}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [canConfirm,setCanConfirm]=useState(false),[attendees,setAttendees]=useState([]),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
   try{
    const flags=await getExperienceFlags();
    if(!flags.crews_hq){setData({enabled:false});return;}
    setData(await getHangRsvpStatus(hang.id));setError('');
    const confirm=flags.passport&&hang.creator_id===profile?.id&&
      new Date(hang.starts_at).getTime()<=Date.now();
    setCanConfirm(!!confirm);
    if(confirm){
      const roster=await getOrganizerHangRsvps(hang.id);
      const permitted=await Promise.all(roster.map(async attendee=>{
        try{const person=await getProfileCard(attendee.user_id);
          return {...attendee,label:person?.full_name||person?.username||'Private participant'};}
        catch{return {...attendee,label:'Private participant'};}
      }));setAttendees(permitted);
    }
   }catch(e){setError(e.message);}
   finally{setLoading(false);}
 },[hang?.id,hang?.creator_id,hang?.starts_at,profile?.id]);
 useEffect(()=>{load()},[load]);
 useLiveRefresh({tables:['studenthood_hang_rsvps'],enabled:data?.enabled===true,intervalMs:15000,refresh:load});
 async function rsvp(join){
   setBusy(true);setError('');
   try{await changeHangRsvp(hang.id,join);await load();}
   catch(e){setError(e.message);}
   finally{setBusy(false);}
 }
 const started=hang.starts_at&&new Date(hang.starts_at).getTime()<=Date.now();
 const full=data?.capacity!=null&&data.attendees>=data.capacity;
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
   <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Hangs" style={styles.back}>
    <Feather name="arrow-left" size={22} color={theme.text}/>
   </Pressable>
   <ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Feather name="calendar" size={27} color={theme.accent}/>
      <Text style={[styles.title,{color:theme.text}]}>{hang.title}</Text>
      {!!hang.description&&<Text style={[styles.description,{color:theme.text}]}>{hang.description}</Text>}
      <Text style={[styles.detail,{color:theme.muted}]}>{hang.category||'Hang'} · {hang.campus_name||'Your campus'}</Text>
      {!!hang.starts_at&&<Text style={[styles.detail,{color:theme.muted}]}>
        {new Date(hang.starts_at).toLocaleString()}
      </Text>}
      {!!hang.location_hint&&<Text style={[styles.detail,{color:theme.muted}]}>{hang.location_hint}</Text>}
    </View>
    {loading?<ActivityIndicator color={theme.accent}/>:
      !data?.enabled?<Text style={[styles.detail,{color:theme.muted}]}>
        RSVP is not yet enabled for your campus. You can still view this permitted Hang.
      </Text>:<>
       <Text style={[styles.detail,{color:theme.muted}]}>
         {data.attendees} going {data.capacity!=null?' · '+data.capacity+' places total':''}
       </Text>
       <Text style={[styles.detail,{color:theme.muted}]}>Your RSVP: {data.own_status==='going'?'Going':'Not attending'}</Text>
       {!started&&data.own_status==='going'?
        <Pressable onPress={()=>rsvp(false)} disabled={busy} accessibilityRole="button"
          style={[styles.action,{borderColor:theme.line,backgroundColor:theme.surface}]}>
          <Text style={{color:theme.text,fontWeight:'800'}}>Cancel RSVP</Text>
        </Pressable>:
        !started&&<Pressable onPress={()=>rsvp(true)} disabled={busy||full} accessibilityRole="button"
         style={[styles.action,{borderColor:theme.accent,backgroundColor:theme.accent,opacity:full?0.5:1}]}>
         <Text style={{color:'#fff',fontWeight:'800'}}>{full?'Hang is full':'RSVP to this Hang'}</Text>
        </Pressable>}
       {started&&<Text style={[styles.detail,{color:theme.muted}]}>RSVPs have closed for this Hang.</Text>}
      </>}
    {canConfirm&&<View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
     <Text style={[styles.title,{color:theme.text,fontSize:15}]}>Organizer attendance confirmation</Text>
     <Text style={[styles.detail,{color:theme.muted}]}>Confirm only participants who actually attended. This is an organizer-confirmed Passport record, not a university-issued qualification.</Text>
     {!attendees.length?<Text style={[styles.detail,{color:theme.muted}]}>No going RSVPs are available to confirm.</Text>:
       attendees.map(person=><Pressable key={person.user_id} disabled={busy} accessibilityRole="button"
         onPress={async()=>{setBusy(true);setError('');setNotice('');
           try{await issueOrganizerHangConfirmation(hang.id,person.user_id);
             setNotice('Organizer attendance confirmation issued privately.');}
           catch(e){setError(e.message);}finally{setBusy(false);}}}
         style={[styles.action,{borderColor:theme.line,backgroundColor:theme.surface}]}>
         <Text style={{color:theme.text,fontWeight:'800'}}>{person.label} · Confirm attendance</Text>
       </Pressable>)}
    </View>}
   {!!notice&&<Text accessibilityRole="alert" style={{color:theme.accent}}>{notice}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
    {busy&&<ActivityIndicator color={theme.accent}/>}
   </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},back:{padding:18,alignSelf:'flex-start'},
 content:{paddingHorizontal:18,paddingBottom:80,gap:18,maxWidth:720,width:'100%',alignSelf:'center'},
 card:{padding:20,borderRadius:20,borderWidth:1,gap:11},
 title:{fontWeight:'900',fontSize:19},description:{fontSize:13,lineHeight:21},
 detail:{fontSize:12,lineHeight:19},
 action:{alignItems:'center',padding:15,borderWidth:1,borderRadius:14}
});
