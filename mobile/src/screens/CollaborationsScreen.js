import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {
 getActivePilotDestinations,getVisibleCollaborations,getMyCollaborationMembership,
 getCollaborationRequests,createCollaboration,changeCollaborationMembership,reportCollaboration
} from '../collaborations';
import useLiveRefresh from '../useLiveRefresh';

const CATEGORIES=['study','research','sports','arts','volunteering','other'];
const REPORT_REASONS=['spam','harassment','unsafe','misleading','other'];

export default function CollaborationsScreen({theme,profile,onBack,createMode=false}){
 const [eligible,setEligible]=useState(false);
 const [destinations,setDestinations]=useState([]);
 const [projects,setProjects]=useState([]);
 const [selected,setSelected]=useState(null);
 const [membership,setMembership]=useState(null),[pending,setPending]=useState([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [category,setCategory]=useState('study'),[maxMembers,setMaxMembers]=useState('6');
 const [destination,setDestination]=useState(0),[reason,setReason]=useState('spam');
 const reload=useCallback(async()=>{
  try{
    const flags=await getExperienceFlags();
    if(!flags.collaborations){setEligible(false);setDestinations([]);setProjects([]);return;}
    const verified=await getActivePilotDestinations();
    setDestinations(verified);setEligible(verified.length>0);
    if(verified.length>0)setProjects(await getVisibleCollaborations());
    else setProjects([]);
    setError('');
  }catch(e){setEligible(false);setError(e.message);}
  finally{setLoading(false);}
 },[]);
 const reloadMembership=useCallback(async()=>{
  if(!selected?.id||!profile?.id)return;
  try{
    setMembership(await getMyCollaborationMembership(selected.id));
    if(selected.organizer_id===profile.id)
      setPending(await getCollaborationRequests(selected.id));
    else setPending([]);
  }catch(e){setError(e.message);}
 },[selected?.id,selected?.organizer_id,profile?.id]);
 useEffect(()=>{reload()},[reload]);
 useEffect(()=>{reloadMembership()},[reloadMembership]);
 useLiveRefresh({tables:['studenthood_cross_campus_projects','studenthood_cross_campus_memberships'],
   enabled:eligible,intervalMs:22000,
   refresh:()=>selected?reloadMembership():reload()});

 async function act(action,studentId=null){
  if(!selected||busy)return;
  setBusy(true);setNotice('');setError('');
  try{
   await changeCollaborationMembership(selected.id,action,studentId);
   setNotice('Project membership updated.');await reloadMembership();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function create(){
  const campus=destinations[destination];
  if(!campus||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
    await createCollaboration({
      ...campus,title,description,category,maxMembers:Number(maxMembers)
    });
    setNotice('Your project is ready for eligible adult students from the enabled campuses.');
    setTitle('');setDescription('');await reload();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function report(){
  if(!selected||busy)return;
  setBusy(true);setError('');setNotice('');
  try{await reportCollaboration(selected.id,reason);setNotice('Your report was submitted privately for review.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <View style={styles.top}>
   <Pressable onPress={()=>selected?setSelected(null):onBack()}
    accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
    <Feather name="arrow-left" size={21} color={theme.text}/>
   </Pressable>
   <View style={{flex:1}}/>
   {!createMode&&<Pressable onPress={()=>selected?reloadMembership():reload()}
     accessibilityRole="button" accessibilityLabel="Refresh projects" disabled={busy}>
     <Feather name="refresh-cw" size={18} color={theme.muted}/>
   </Pressable>}
  </View>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <Feather name="git-merge" size={26} color={theme.accent}/>
    <Text style={[styles.title,{color:theme.text}]}>Campus projects, connected safely.</Text>
    <Text style={[styles.copy,{color:theme.muted}]}>Adult students from independently verified partner campuses can collaborate on a specific project. Your personal campus Scenes, Peeps and Ping privacy stay unchanged.</Text>
   </View>
   {loading?<ActivityIndicator color={theme.accent}/>:
    !eligible?<Text style={[styles.copy,{color:theme.muted}]}>
      Cross-Campus Collaborations are not enabled for your account. A verified campus enrollment and approved campus partnership are required.
    </Text>:
    createMode?
     <View style={styles.group}>
      <Text style={[styles.copy,{color:theme.muted}]}>Create a project only from the central +. Participating campuses are verified by StudentHood operators, not chosen from editable profile text.</Text>
      {destinations.map((pair,index)=><Pressable key={pair.homeCampusId+pair.partnerCampusId}
       accessibilityRole="button" accessibilityState={{selected:destination===index}}
       onPress={()=>setDestination(index)}
       style={[styles.card,{borderColor:destination===index?theme.accent:theme.line,backgroundColor:theme.surface}]}>
        <Text style={[styles.copy,{color:theme.text}]}>
          {pair.homeLabel} ↔ {pair.partnerLabel}
        </Text>
       </Pressable>)}
      <Input theme={theme} value={title} onChangeText={setTitle}
       label="Project title" placeholder="Describe your shared project" maxLength={140}/>
      <TextInput multiline value={description} onChangeText={setDescription}
       accessibilityLabel="Project details" placeholder="Explain the purpose, timeline and expected contribution"
       placeholderTextColor={theme.muted} maxLength={3000}
       style={[styles.input,{color:theme.text,borderColor:theme.line,minHeight:110,backgroundColor:theme.surface}]}/>
      <View style={styles.row}>{CATEGORIES.map(key=><Pressable key={key} onPress={()=>setCategory(key)}
       accessibilityRole="button" accessibilityState={{selected:category===key}}
       style={[styles.pill,{borderColor:category===key?theme.accent:theme.line,backgroundColor:theme.surface}]}>
        <Text style={{color:theme.text,fontSize:12}}>{key}</Text>
      </Pressable>)}</View>
      <Input theme={theme} label="Maximum members (2–30)" value={maxMembers}
       onChangeText={setMaxMembers} keyboardType="number-pad" maxLength={2}/>
      <Action theme={theme} label="Start collaboration" disabled={busy||title.trim().length<5||description.trim().length<30}
       onPress={create}/>
     </View>:
    selected?
     <View style={styles.group}>
      <View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <Text style={[styles.title,{color:theme.text}]}>{selected.title}</Text>
       <Text style={[styles.copy,{color:theme.text}]}>{selected.description}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>Category: {selected.category} · Maximum {selected.max_members} members</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>Your membership: {membership?.status||'Not joined'}</Text>
      </View>
      {selected.organizer_id===profile?.id?
       <View style={styles.group}>
        <Text style={[styles.title,{color:theme.text,fontSize:15}]}>Pending join requests</Text>
        {!pending.length?<Text style={[styles.copy,{color:theme.muted}]}>No pending requests.</Text>:
         pending.map((row,index)=><View key={row.user_id}
           style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
          <Text style={[styles.copy,{color:theme.text}]}>Eligible applicant #{index+1}</Text>
          <View style={styles.row}>
           <Action theme={theme} label="Approve" disabled={busy}
             onPress={()=>act('approve',row.user_id)}/>
           <Action theme={theme} label="Decline" outline disabled={busy}
             onPress={()=>act('decline',row.user_id)}/>
          </View>
         </View>)}
       </View>:
       membership?.status==='active'?
        <Action theme={theme} label="Leave project" outline disabled={busy} onPress={()=>act('leave')}/>:
        membership?.status==='requested'?
          <Text style={[styles.copy,{color:theme.muted}]}>Your request is awaiting organizer approval.</Text>:
          <Action theme={theme} label="Request to join" disabled={busy} onPress={()=>act('request')}/>
      }
      <View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <Text style={[styles.copy,{color:theme.muted}]}>Safety concerns are sent privately for review.</Text>
       <View style={styles.row}>{REPORT_REASONS.map(key=><Pressable key={key}
         onPress={()=>setReason(key)} accessibilityRole="button"
         style={[styles.pill,{borderColor:reason===key?theme.accent:theme.line}]}>
         <Text style={{color:theme.text,fontSize:11}}>{key}</Text>
       </Pressable>)}</View>
       <Action theme={theme} outline label="Report project" disabled={busy} onPress={report}/>
      </View>
     </View>:
     <View style={styles.group}>
      <Text style={[styles.copy,{color:theme.muted}]}>Discover permitted shared projects. New collaborations can be started only from the main + menu.</Text>
      {!projects.length?<Text style={[styles.copy,{color:theme.muted}]}>No approved cross-campus projects are available for your verified campus pair yet.</Text>:
       projects.map(project=><Pressable key={project.id} accessibilityRole="button"
        onPress={()=>{setMembership(null);setPending([]);setSelected(project)}}
        style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
        <View style={styles.row}>
         <Feather name="git-merge" size={20} color={theme.accent}/>
         <Text style={[styles.name,{color:theme.text}]}>{project.title}</Text>
         <Feather name="chevron-right" size={17} color={theme.muted}/>
        </View>
        <Text style={[styles.copy,{color:theme.muted}]}>{project.category} · Up to {project.max_members} members</Text>
        <Text numberOfLines={3} style={[styles.copy,{color:theme.text}]}>{project.description}</Text>
       </Pressable>)}
     </View>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
   {!!notice&&<Text accessibilityRole="alert" style={{color:theme.accent}}>{notice}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
function Input({theme,label,value,onChangeText,placeholder,keyboardType,maxLength}){
 return <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
  placeholder={placeholder||label} placeholderTextColor={theme.muted} keyboardType={keyboardType}
  maxLength={maxLength} style={[styles.input,{borderColor:theme.line,color:theme.text,backgroundColor:theme.surface}]}/>;
}
function Action({theme,label,onPress,disabled=false,outline=false}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={[styles.action,{borderColor:outline?theme.line:theme.accent,backgroundColor:outline?theme.surface:theme.accent}]}>
  <Text style={{fontWeight:'800',color:outline?theme.text:'#fff',fontSize:12}}>{label}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 root:{flex:1},top:{height:57,paddingHorizontal:18,flexDirection:'row',alignItems:'center'},
 back:{width:43,height:43,alignItems:'center',justifyContent:'center'},
 content:{padding:18,paddingBottom:85,maxWidth:760,width:'100%',alignSelf:'center',gap:15},
 hero:{borderWidth:1,borderRadius:19,padding:18,gap:10},
 title:{fontSize:18,fontWeight:'900'},name:{fontSize:14,fontWeight:'800',flex:1},
 copy:{fontSize:12,lineHeight:19},group:{gap:13},row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:9},
 card:{borderWidth:1,borderRadius:16,padding:15,gap:9},
 pill:{borderWidth:1,borderRadius:14,paddingVertical:8,paddingHorizontal:11},
 action:{borderWidth:1,padding:13,borderRadius:13,alignItems:'center'},
 input:{borderWidth:1,borderRadius:13,padding:12,minHeight:48,textAlignVertical:'top'}
});
