import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getMyGigApplications} from '../gigsPlus';

export default function MyGigApplicationsScreen({theme,onBack,onOpenGig}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[enabled,setEnabled]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const flags=await getExperienceFlags();setEnabled(flags.gigs_plus===true);
   setRows(flags.gigs_plus?await getMyGigApplications():[]);
   setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load()},[load]);
 return <View style={{flex:1,backgroundColor:theme.bg}}>
  <View style={styles.bar}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Profile"><Feather name="arrow-left" color={theme.text} size={22}/></Pressable>
   <View style={{flex:1}}/>
   <Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Refresh applications"><Feather name="refresh-cw" color={theme.muted} size={19}/></Pressable>
  </View>
  <ScrollView contentContainerStyle={styles.content}>
   <Text style={[styles.hint,{color:theme.muted}]}>Only you can see your application history. You can withdraw eligible pending applications from the Gig details.</Text>
   {loading?<ActivityIndicator color={theme.accent}/>:
     !enabled?<Text style={[styles.hint,{color:theme.muted}]}>Application tracking is not enabled for this campus.</Text>:
     !rows.length?<Text style={[styles.hint,{color:theme.muted}]}>No applications yet. Only verified employers can receive Gigs Plus applications.</Text>:
     rows.map(row=><Pressable key={row.id} disabled={!row.gig} accessibilityRole="button"
       onPress={()=>row.gig&&onOpenGig(row.gig)}
       style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <View style={styles.row}>
        <Feather name="briefcase" size={18} color={theme.accent}/>
        <Text style={[styles.title,{color:theme.text}]}>{row.gig?.title||'Gig no longer available to view'}</Text>
        {!!row.gig&&<Feather name="chevron-right" size={17} color={theme.muted}/>}
       </View>
       <Text style={[styles.hint,{color:theme.muted}]}>Status: {row.status}</Text>
       <Text style={[styles.hint,{color:theme.muted}]}>Applied {new Date(row.created_at).toLocaleDateString()}</Text>
      </Pressable>)}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 bar:{padding:18,flexDirection:'row',alignItems:'center',gap:20},
 content:{paddingHorizontal:18,paddingBottom:80,maxWidth:720,width:'100%',alignSelf:'center',gap:14},
 card:{padding:15,borderWidth:1,borderRadius:17,gap:9},row:{flexDirection:'row',alignItems:'center',gap:9},
 title:{fontWeight:'800',fontSize:14,flex:1},hint:{fontSize:12,lineHeight:19}
});
