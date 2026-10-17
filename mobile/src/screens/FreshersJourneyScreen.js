import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {FRESHERS_INTERESTS,getFreshersStatus,saveFreshersPreferences} from '../experiences';

const TASKS=[
 {key:'choose_interests',name:'Choose your interests',copy:'Pick topics that matter to you',icon:'heart'},
 {key:'connect_peep',name:'Connect with a Peep',copy:'Build one permitted mutual connection',icon:'users'}
];

export default function FreshersJourneyScreen({theme,onBack,onDiscover,onCrews,onHangs}){
 const [data,setData]=useState(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
   setError('');
   try{setData(await getFreshersStatus());}
   catch(e){setError(e.message);}
   finally{setLoading(false);}
 },[]);
 useEffect(()=>{load()},[load]);
 async function save(next){
   setBusy(true);setError('');
   try{setData(await saveFreshersPreferences({
     optedIn:next?.optedIn??data?.opted_in??false,
     interestTags:next?.interestTags??data?.interest_tags??[],
     dismissed:next?.dismissed??false
   }));}catch(e){setError(e.message);}
   finally{setBusy(false);}
 }
 function toggleInterest(tag){
   const selected=data?.interest_tags||[];
   const interestTags=selected.includes(tag)
     ?selected.filter(x=>x!==tag):[...selected,tag];
   if(interestTags.length<=8)save({interestTags});
 }
 const enabled=data?.enabled===true;
 const active=enabled&&data?.opted_in===true&&!data?.dismissed;
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <View style={styles.top}>
   <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Discover" style={styles.back}>
    <Feather name="arrow-left" size={21} color={theme.text}/>
   </Pressable>
   <View style={{flex:1}}/>
   {active&&<Pressable onPress={()=>save({dismissed:true,optedIn:false})} disabled={busy} accessibilityRole="button" accessibilityLabel="Dismiss Freshers Journey">
    <Text style={[styles.actionText,{color:theme.muted}]}>Dismiss</Text>
   </Pressable>}
  </View>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <Feather name="compass" size={29} color={theme.accent}/>
    <Text style={[styles.intro,{color:theme.text}]}>Your first 30 days, your way.</Text>
    <Text style={[styles.copy,{color:theme.muted}]}>Explore your campus at your own pace. This journey is optional, private and based on real StudentHood activity.</Text>
    {!!data?.campus_name&&<Text style={[styles.copy,{color:theme.muted}]}>{data.campus_name}</Text>}
   </View>
   {loading?<ActivityIndicator color={theme.accent}/>:
   !enabled?<Text style={[styles.copy,{color:theme.muted}]}>Freshers Journey is not enabled for this campus yet.</Text>:
   !active?<View style={styles.group}>
     <Text style={[styles.copy,{color:theme.muted}]}>Your progress is private. You can pause or leave at any time.</Text>
     <Pressable accessibilityRole="button" disabled={busy} onPress={()=>save({optedIn:true,dismissed:false})}
       style={[styles.primary,{backgroundColor:theme.accent}]}>
       <Text style={styles.primaryText}>{data?.dismissed?'Restart Freshers Journey':'Start Freshers Journey'}</Text>
     </Pressable>
   </View>:
   <>
    <Text style={[styles.copy,{color:theme.muted}]}>Choose up to eight interests to guide your campus exploration.</Text>
    <View style={styles.chips}>
     {FRESHERS_INTERESTS.map(tag=><Pressable key={tag} onPress={()=>toggleInterest(tag)} disabled={busy}
      accessibilityRole="button" accessibilityState={{selected:(data.interest_tags||[]).includes(tag)}}
      style={[styles.chip,{backgroundColor:(data.interest_tags||[]).includes(tag)?theme.accent:theme.surface,
        borderColor:(data.interest_tags||[]).includes(tag)?theme.accent:theme.line}]}>
      <Text style={{color:(data.interest_tags||[]).includes(tag)?'#fff':theme.text,fontWeight:'700'}}>{tag}</Text>
     </Pressable>)}
    </View>
    <Text style={[styles.copy,{color:theme.muted}]}>Your steps update only when the matching action is actually saved. Nothing is completed for simply opening a page.</Text>
    {TASKS.map(task=><View key={task.key} style={[styles.task,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Feather name={data.tasks?.[task.key]?'check-circle':task.icon} size={21}
       color={data.tasks?.[task.key]?theme.accent:theme.muted}/>
      <View style={{flex:1}}>
       <Text style={[styles.taskTitle,{color:theme.text}]}>{task.name}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>{task.copy}</Text>
      </View>
      <Text style={{color:theme.muted,fontSize:11}}>{data.tasks?.[task.key]?'Done':'Open'}</Text>
     </View>)}
    <View style={styles.group}>
     <Pressable accessibilityRole="button" onPress={onDiscover} style={[styles.link,{borderColor:theme.line}]}>
      <Feather name="users" color={theme.accent} size={19}/><Text style={[styles.taskTitle,{color:theme.text}]}>Discover permitted Peeps</Text>
      <Feather name="chevron-right" color={theme.muted}/>
     </Pressable>
     <Pressable accessibilityRole="button" onPress={onCrews} style={[styles.link,{borderColor:theme.line}]}>
      <Feather name="users" color={theme.accent} size={19}/><Text style={[styles.taskTitle,{color:theme.text}]}>Explore campus Crews</Text>
      <Feather name="chevron-right" color={theme.muted}/>
     </Pressable>
     <Pressable accessibilityRole="button" onPress={onHangs} style={[styles.link,{borderColor:theme.line}]}>
      <Feather name="calendar" color={theme.accent} size={19}/><Text style={[styles.taskTitle,{color:theme.text}]}>Find an eligible Hang</Text>
      <Feather name="chevron-right" color={theme.muted}/>
     </Pressable>
     <Pressable onPress={()=>save({optedIn:false})} disabled={busy} style={styles.pause} accessibilityRole="button">
       <Text style={{color:theme.muted,fontWeight:'700'}}>Pause journey</Text>
     </Pressable>
    </View>
   </>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},top:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,height:54},
 back:{height:42,width:42,alignItems:'center',justifyContent:'center'},actionText:{fontSize:12,fontWeight:'800',padding:8},
 content:{padding:18,paddingBottom:75,gap:17,width:'100%',maxWidth:720,alignSelf:'center'},
 hero:{borderWidth:1,borderRadius:22,padding:21,gap:10},
 intro:{fontSize:19,fontWeight:'900'},copy:{fontSize:12,lineHeight:19},
 group:{gap:10},
 primary:{padding:15,borderRadius:16,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'900'},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{borderWidth:1,borderRadius:30,paddingVertical:9,paddingHorizontal:14},
 task:{borderWidth:1,borderRadius:16,padding:13,flexDirection:'row',alignItems:'center',gap:12},
 taskTitle:{fontSize:13,fontWeight:'800'},link:{padding:14,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:12},
 pause:{alignSelf:'center',padding:10}
});
