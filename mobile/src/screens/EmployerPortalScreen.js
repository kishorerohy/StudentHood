import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getMyEmployerOrganizations,requestEmployerVerification} from '../gigsPlus';
import {getMyStudentSubmissions} from '../creation';

export default function EmployerPortalScreen({theme,onBack,onOpenGig}){
 const [enabled,setEnabled]=useState(false),[rows,setRows]=useState([]),[gigs,setGigs]=useState([]);
 const [legalName,setLegalName]=useState(''),[website,setWebsite]=useState('');
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{
   const flags=await getExperienceFlags();setEnabled(flags.gigs_plus===true);
   if(!flags.gigs_plus)return;
   const [orgs,mine]=await Promise.all([getMyEmployerOrganizations(),getMyStudentSubmissions('Gigs')]);
   setRows(orgs);
   setGigs(mine.filter(g=>orgs.some(o=>o.id===g.employer_org_id&&o.verification_status==='verified')));
   setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load()},[load]);
 async function request(){
  setBusy(true);setError('');
  try{await requestEmployerVerification(legalName,website);setLegalName('');setWebsite('');await load();}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Profile" style={styles.back}>
   <Feather name="arrow-left" size={22} color={theme.text}/>
  </Pressable>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <Feather name="shield" size={25} color={theme.accent}/>
    <Text style={[styles.title,{color:theme.text}]}>Employer verification</Text>
    <Text style={[styles.copy,{color:theme.muted}]}>Business verification is separate from ordinary Gigs. Submitting this request does not create a verified badge or publish a privileged listing.</Text>
   </View>
   {loading?<ActivityIndicator color={theme.accent}/>:
    !enabled?<Text style={[styles.copy,{color:theme.muted}]}>Gigs Plus employer tools are not enabled for your campus yet.</Text>:
    <>
      {rows.map(org=><View key={org.id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.title,{color:theme.text}]}>{org.legal_name}</Text>
        <Text style={[styles.copy,{color:theme.muted}]}>Verification: {org.verification_status}</Text>
        {org.verification_status==='verified'&&<Text style={[styles.copy,{color:theme.muted}]}>Use the central + → Post a Gig and select this organization.</Text>}
      </View>)}
      <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
       <Text style={[styles.copy,{color:theme.text,fontWeight:'900'}]}>Request organization review</Text>
       <TextInput accessibilityLabel="Organization legal name" value={legalName} onChangeText={setLegalName}
        placeholder="Registered organization name" placeholderTextColor={theme.muted} maxLength={120}
        style={[styles.input,{color:theme.text,borderColor:theme.line}]}/>
       <TextInput accessibilityLabel="Organization website" value={website} onChangeText={setWebsite}
        placeholder="https:// organization website (optional)" placeholderTextColor={theme.muted}
        autoCapitalize="none" autoCorrect={false} keyboardType="url"
        style={[styles.input,{color:theme.text,borderColor:theme.line}]}/>
       <Text style={[styles.copy,{color:theme.muted}]}>Further legal or identity evidence requires a separately approved, private verification process. Never post documents publicly.</Text>
       <Pressable disabled={busy} onPress={request} accessibilityRole="button" style={[styles.action,{backgroundColor:theme.accent}]}>
        <Text style={{color:'#fff',fontWeight:'900'}}>Submit verification request</Text>
       </Pressable>
      </View>
      {!!gigs.length&&<View style={styles.group}>
       <Text style={[styles.title,{color:theme.text}]}>Your verified organization Gigs</Text>
       {gigs.map(gig=><Pressable key={gig.id} onPress={()=>onOpenGig(gig)} accessibilityRole="button"
        style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.title,{color:theme.text}]}>{gig.title}</Text>
        <Text style={[styles.copy,{color:theme.muted}]}>Review applications and decisions</Text>
       </Pressable>)}
      </View>}
    </>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},back:{padding:18,alignSelf:'flex-start'},
 content:{paddingHorizontal:18,paddingBottom:80,gap:15,maxWidth:720,width:'100%',alignSelf:'center'},
 group:{gap:10},card:{padding:17,borderRadius:18,borderWidth:1,gap:10},
 title:{fontWeight:'900',fontSize:16},copy:{fontSize:12,lineHeight:19},
 input:{borderWidth:1,borderRadius:13,padding:13,minHeight:47},
 action:{borderRadius:13,padding:13,alignItems:'center'}
});
