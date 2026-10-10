import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getPeepConnection,getProfileCard,sendPeepRequest} from '../api';

// Campus candidates are supplied by the privacy-aware studenthood_campus_peeps RPC.
// Interests are only read via the existing permission-checked profile-card RPC.
export default function DiscoverPeoplePanel({people=[],viewer,theme,onOpenProfile}){
  if(!people.length)return null;
  return <View style={styles.section}>
    <Text style={[styles.heading,{color:theme.text}]}>Find your people</Text>
    <Text style={[styles.subheading,{color:theme.muted}]}>Students you can discover from your campus</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} accessibilityLabel="Discover campus students">
      {people.slice(0,16).map(person=><PersonCard key={person.id} person={person} viewer={viewer} theme={theme} onOpenProfile={onOpenProfile}/>)}
    </ScrollView>
  </View>;
}
function PersonCard({person,viewer,theme,onOpenProfile}){
  const [details,setDetails]=useState(null);
  const [relationship,setRelationship]=useState(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let live=true;
    setReady(false);setDetails(null);setRelationship(null);setNotice('');
    Promise.all([getProfileCard(person.id),getPeepConnection(person.id)])
      .then(([card,connection])=>{if(live){setDetails(card);setRelationship(connection);setReady(true);}})
      .catch(()=>{if(live){setReady(false);setNotice('Peep status unavailable');}});
    return()=>{live=false};
  },[person.id]);
  const mine=new Set((Array.isArray(viewer?.interests)?viewer.interests:[]).map(v=>String(v).trim().toLowerCase()).filter(Boolean));
  const shared=(Array.isArray(details?.interests)?details.interests:[]).filter(v=>mine.has(String(v).trim().toLowerCase())).slice(0,3);
  const isPeep=details?.is_peep||relationship?.status==='accepted';
  const pending=relationship?.status==='pending';
  const canRequest=ready&&!!details&&!isPeep&&!pending&&!busy;
  const label=busy?'Sending…':isPeep?'Peeps':pending?(relationship?.requester_id===person.id?'Request received':'Request sent'):'Add Peep';
  async function request(){
    if(!canRequest)return;
    setBusy(true);setNotice('');
    try{setRelationship(await sendPeepRequest(person.id));}
    catch(e){setNotice(e?.message||'Peep request unavailable');}
    finally{setBusy(false);}
  }
  return <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <Pressable onPress={()=>onOpenProfile?.(person.id)} accessibilityRole="button" accessibilityLabel={'Open '+(person.full_name||person.username||'student')+' profile'} style={styles.person}>
      <View style={[styles.photo,{backgroundColor:theme.surface2}]}>
        {person.avatar_url?<Image source={{uri:person.avatar_url}} style={styles.photoImage}/>:<Feather name="user" size={28} color={theme.accent}/>}
      </View>
      <Text numberOfLines={1} style={[styles.name,{color:theme.text}]}>{person.full_name||person.username||'Student'}</Text>
      <Text numberOfLines={1} style={[styles.username,{color:theme.muted}]}>{person.username?'@'+person.username:'StudentHood'}</Text>
      <View style={styles.campus}><Feather name="book-open" size={12} color={theme.accent}/><Text numberOfLines={1} style={[styles.campusText,{color:theme.muted}]}>{person.campus_name||'Same campus'}</Text></View>
      <Text numberOfLines={2} style={[styles.common,{color:theme.muted}]}>{shared.length?shared.join(' · ')+' in common':'Explore their profile'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!canRequest}} onPress={request} disabled={!canRequest} style={[styles.add,{backgroundColor:canRequest?theme.accent:theme.surface2}]}>
      {busy?<ActivityIndicator color="#fff" size="small"/>:<Feather name={isPeep?'check':'user-plus'} size={15} color={canRequest?'#fff':theme.muted}/>}
      <Text style={[styles.addLabel,{color:canRequest?'#fff':theme.text}]}>{ready?label:'Checking…'}</Text>
    </Pressable>
    {!!notice&&<Text numberOfLines={2} accessibilityRole="alert" style={[styles.notice,{color:theme.danger}]}>{notice}</Text>}
  </View>;
}
const styles=StyleSheet.create({
  section:{marginBottom:17},
  heading:{fontSize:19,fontWeight:'900',marginBottom:3},
  subheading:{fontSize:11,marginBottom:13},
  cards:{gap:11,paddingRight:16,paddingBottom:10},
  card:{width:180,borderRadius:21,borderWidth:1,padding:13,alignItems:'center',justifyContent:'space-between'},
  person:{width:'100%',alignItems:'center',gap:5},
  photo:{width:77,height:77,borderRadius:39,overflow:'hidden',alignItems:'center',justifyContent:'center',marginBottom:5},
  photoImage:{width:'100%',height:'100%'},
  name:{fontSize:13,fontWeight:'800',maxWidth:'100%'},
  username:{fontSize:11,maxWidth:'100%'},
  campus:{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%',marginTop:7},
  campusText:{fontSize:10,flexShrink:1},
  common:{fontSize:10,lineHeight:14,textAlign:'center',marginTop:5,minHeight:29},
  add:{height:35,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,borderRadius:17,paddingHorizontal:13,marginTop:12,minWidth:135},
  addLabel:{fontWeight:'800',fontSize:11},
  notice:{fontSize:10,marginTop:6,textAlign:'center'}
});
