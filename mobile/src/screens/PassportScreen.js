import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {getExperienceFlags} from '../experiences';
import {getMyPassportEntries,getMyPassportShareGrants,setPassportEntryVisibility,createPassportShare,revokePassportShare} from '../passport';

export default function PassportScreen({theme,onBack}){
 const [entries,setEntries]=useState([]),[grants,setGrants]=useState([]),[enabled,setEnabled]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  try{
   const flags=await getExperienceFlags();
   setEnabled(flags.passport===true);
   if(!flags.passport){setEntries([]);return;}
   const [list,shares]=await Promise.all([getMyPassportEntries(),getMyPassportShareGrants()]);
   setEntries(list);setGrants(shares);setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load()},[load]);
 async function act(task){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{const message=await task();if(message)setNotice(message);await load();}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Profile" style={styles.back}>
   <Feather name="arrow-left" size={22} color={theme.text}/>
  </Pressable>
  <ScrollView contentContainerStyle={styles.content}>
   <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <Feather name="award" size={27} color={theme.accent}/>
    <Text style={[styles.title,{color:theme.text}]}>StudentHood Passport</Text>
    <Text style={[styles.copy,{color:theme.muted}]}>Private by default. Organiser and employer confirmations require real supporting activity. They are not university-issued certificates or guaranteed qualifications.</Text>
   </View>
   {loading?<ActivityIndicator color={theme.accent}/>:
    !enabled?<Text style={[styles.copy,{color:theme.muted}]}>Passport is not available at your campus yet.</Text>:
    !entries.length?<Text style={[styles.copy,{color:theme.muted}]}>No confirmed participation yet. Approved organisers and verified employers can issue confirmations for real eligible activities.</Text>:
    entries.map(row=><View key={row.id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
     <View style={styles.row}><Feather name="check-circle" size={20} color={theme.accent}/><Text style={[styles.name,{color:theme.text}]}>{row.title}</Text></View>
     <Text style={[styles.copy,{color:theme.muted}]}>
      {row.assurance?.replace(/_/g,' ')} · {row.status} · {new Date(row.issued_at).toLocaleDateString()}
     </Text>
     <Text style={[styles.copy,{color:theme.muted}]}>Visibility: {row.visibility==='profile'?'Shown on your profile':'Private'}</Text>
     {row.status==='active'&&<>
      <View style={styles.row}>
       <Action theme={theme} disabled={busy}
        label={row.visibility==='profile'?'Hide from Profile':'Show on Profile'}
        onPress={()=>act(async()=>{await setPassportEntryVisibility(row.id,row.visibility!=='profile');return 'Visibility updated.'})}/>
       <Action theme={theme} disabled={busy} label="Share for 24 hours" outline
        onPress={()=>act(async()=>{
          const url=await createPassportShare(row.id);
          await Clipboard.setStringAsync(url);
          return 'Private share link copied. Recipients must be eligible and signed in.';
        })}/>
      </View>
      {grants.filter(g=>g.entry_id===row.id&&!g.revoked_at&&new Date(g.expires_at).getTime()>Date.now())
        .map(g=><Pressable key={g.id} onPress={()=>act(async()=>{await revokePassportShare(g.id);return 'Share link revoked.'})}
          accessibilityRole="button" style={styles.revoke}>
          <Text style={{color:theme.muted,fontSize:12}}>Revoke link expiring {new Date(g.expires_at).toLocaleString()}</Text>
         </Pressable>)}
     </>}
    </View>)}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
   {!!notice&&<Text accessibilityRole="alert" style={{color:theme.accent}}>{notice}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
function Action({theme,label,onPress,outline=false,disabled=false}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={[styles.action,{borderColor:outline?theme.line:theme.accent,backgroundColor:outline?theme.surface:theme.accent}]}>
  <Text style={{fontWeight:'800',fontSize:12,color:outline?theme.text:'#fff'}}>{label}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 root:{flex:1},back:{padding:18,alignSelf:'flex-start'},
 content:{paddingHorizontal:18,paddingBottom:90,maxWidth:720,width:'100%',alignSelf:'center',gap:15},
 card:{padding:17,borderWidth:1,borderRadius:18,gap:12},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9},
 title:{fontSize:19,fontWeight:'900'},name:{flex:1,fontSize:13,fontWeight:'900'},
 copy:{fontSize:12,lineHeight:19},action:{padding:11,borderWidth:1,borderRadius:12},revoke:{paddingVertical:8}
});
