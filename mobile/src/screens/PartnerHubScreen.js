import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getMyEmployerOrganizations} from '../gigsPlus';
import {getMyPartnerOrganizations,requestPartnerVerification,getMyPartnerCampaigns,createPartnerCampaign,changePartnerCampaign,getPartnerCampaignMetrics} from '../partnerHub';

const CATEGORIES=['promoted_hang','crew_collaboration','offer','employer_campaign'];
export default function PartnerHubScreen({theme,onBack}){
 const [enabled,setEnabled]=useState(false),[orgs,setOrgs]=useState([]),[partners,setPartners]=useState([]),[campaigns,setCampaigns]=useState([]);
 const [selected,setSelected]=useState(''),[category,setCategory]=useState(CATEGORIES[0]);
 const [title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [start,setStart]=useState(''),[end,setEnd]=useState('');
 const [metrics,setMetrics]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  try{
   const flags=await getExperienceFlags();setEnabled(flags.partner_hub===true);
   if(!flags.partner_hub)return;
   const [verified,requests]=await Promise.all([getMyEmployerOrganizations(),getMyPartnerOrganizations()]);
   setOrgs(verified.filter(o=>o.verification_status==='verified'));setPartners(requests);
   const rows=await getMyPartnerCampaigns(requests.map(x=>x.id));setCampaigns(rows);
   const stats=await Promise.all(rows.map(async row=>{
    try{return [row.id,await getPartnerCampaignMetrics(row.id)]}catch{return [row.id,[]]}
   }));
   setMetrics(Object.fromEntries(stats));setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load()},[load]);
 async function act(fn){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await fn();await load();setNotice('Request updated successfully.');}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 const approved=partners.filter(p=>p.verification_status==='verified');
 function dateValue(text){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new Error('Enter campaign dates as YYYY-MM-DD.');
  const d=new Date(text+'T12:00:00');
  if(!Number.isFinite(d.getTime()))throw new Error('Invalid campaign date.');
  return d.toISOString();
 }
 return <View style={{flex:1,backgroundColor:theme.bg}}>
   <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Profile" style={styles.back}>
    <Feather name="arrow-left" color={theme.text} size={22}/>
   </Pressable>
   <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
     <Feather name="store" color={theme.accent} size={27}/>
     <Text style={[styles.title,{color:theme.text}]}>Campus Partner Hub</Text>
     <Text style={[styles.copy,{color:theme.muted}]}>Verified businesses may request approved, clearly Sponsored campaigns. StudentHood does not collect campaign payments or publish unapproved ads here.</Text>
    </View>
    {loading?<ActivityIndicator color={theme.accent}/>:
    !enabled?<Text style={[styles.copy,{color:theme.muted}]}>Campus Partner Hub is not enabled for your campus yet.</Text>:
    <>
     {orgs.filter(o=>!partners.some(p=>p.employer_org_id===o.id)).map(org=><Pressable key={org.id}
      onPress={()=>act(()=>requestPartnerVerification(org.id))} disabled={busy} accessibilityRole="button"
      style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <Text style={[styles.title,{color:theme.text}]}>{org.legal_name}</Text>
       <Text style={[styles.copy,{color:theme.accent}]}>Request separate Campus Partner verification</Text>
      </Pressable>)}
     {partners.map(p=><View key={p.id} style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <Text style={[styles.copy,{color:theme.text}]}>Partner verification: {p.verification_status}</Text>
       {p.verification_status==='pending'&&<Text style={[styles.copy,{color:theme.muted}]}>Awaiting human verification. No sponsored placements are active.</Text>}
      </View>)}
     {!!approved.length&&<View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
      <Text style={[styles.title,{color:theme.text}]}>Prepare a campaign for approval</Text>
      <Text style={[styles.copy,{color:theme.muted}]}>Only approved partners may draft requests. Publishing still requires separate campaign approval.</Text>
      {approved.map(p=><Pressable key={p.id} onPress={()=>setSelected(p.id)} accessibilityRole="button"
        style={[styles.choice,{borderColor:selected===p.id?theme.accent:theme.line}]}>
       <Text style={{color:theme.text,fontSize:12}}>{orgs.find(o=>o.id===p.employer_org_id)?.legal_name||'Verified partner'}</Text>
       {selected===p.id&&<Feather name="check-circle" color={theme.accent}/>}
      </Pressable>)}
      <View style={styles.row}>{CATEGORIES.map(value=><Pressable key={value} onPress={()=>setCategory(value)}
        style={[styles.choice,{borderColor:category===value?theme.accent:theme.line}]} accessibilityRole="button">
        <Text style={{color:theme.text,fontSize:11}}>{value.replace(/_/g,' ')}</Text>
       </Pressable>)}</View>
      <TextInput value={title} onChangeText={setTitle} maxLength={140}
       placeholder="Campaign title" placeholderTextColor={theme.muted}
       style={[styles.input,{borderColor:theme.line,color:theme.text}]} accessibilityLabel="Campaign title"/>
      <TextInput value={description} onChangeText={setDescription} multiline maxLength={2500}
       placeholder="Describe the proposed offer or collaboration" placeholderTextColor={theme.muted}
       style={[styles.input,{borderColor:theme.line,color:theme.text,minHeight:85}]} accessibilityLabel="Campaign description"/>
      <View style={styles.row}>
       <TextInput value={start} onChangeText={setStart} placeholder="Start YYYY-MM-DD"
        placeholderTextColor={theme.muted} accessibilityLabel="Campaign start date"
        style={[styles.input,{borderColor:theme.line,color:theme.text,flex:1}]}/>
       <TextInput value={end} onChangeText={setEnd} placeholder="End YYYY-MM-DD"
        placeholderTextColor={theme.muted} accessibilityLabel="Campaign end date"
        style={[styles.input,{borderColor:theme.line,color:theme.text,flex:1}]}/>
      </View>
      <Pressable disabled={busy||!selected} accessibilityRole="button"
       onPress={()=>act(async()=>{await createPartnerCampaign({
          partnerId:selected,category,title,description,startAt:dateValue(start),endAt:dateValue(end)});
          setTitle('');setDescription('');setStart('');setEnd('');})}
       style={[styles.action,{backgroundColor:theme.accent}]}>
       <Text style={styles.white}>Save campaign draft</Text>
      </Pressable>
     </View>}
     {campaigns.map(c=><View key={c.id} style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <Text style={[styles.title,{color:theme.text}]}>{c.title}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>Sponsored request · {c.approval_status}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>{c.category.replace(/_/g,' ')} · {new Date(c.start_at).toLocaleDateString()} to {new Date(c.end_at).toLocaleDateString()}</Text>
       <Text style={[styles.copy,{color:theme.muted}]}>{metrics[c.id]?.length?'Verified aggregate metrics available':'No campaign metrics recorded yet.'}</Text>
       {c.quote_amount!=null&&<Text style={[styles.copy,{color:theme.muted}]}>Quote: {c.quote_currency||''} {c.quote_amount}. Not charged or paid in-app.</Text>}
       {c.approval_status==='draft'&&<Pressable disabled={busy}
        onPress={()=>act(()=>changePartnerCampaign(c.id,'submit'))} accessibilityRole="button"
        style={[styles.action,{backgroundColor:theme.accent}]}><Text style={styles.white}>Submit for review</Text></Pressable>}
       {c.approval_status==='approved'&&<Pressable disabled={busy}
        onPress={()=>act(()=>changePartnerCampaign(c.id,'pause'))} accessibilityRole="button"
        style={[styles.action,{backgroundColor:theme.surface,borderColor:theme.line,borderWidth:1}]}>
        <Text style={{color:theme.text,fontWeight:'900'}}>Pause campaign</Text>
       </Pressable>}
      </View>)}
    </>}
    {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={{color:theme.accent}}>{notice}</Text>}
    {busy&&<ActivityIndicator color={theme.accent}/>}
   </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 back:{padding:18,alignSelf:'flex-start'},
 content:{paddingHorizontal:18,paddingBottom:90,gap:14,maxWidth:720,width:'100%',alignSelf:'center'},
 card:{padding:17,borderWidth:1,borderRadius:19,gap:11},
 title:{fontWeight:'900',fontSize:16},copy:{fontSize:12,lineHeight:19},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 choice:{borderWidth:1,borderRadius:12,padding:10,flexDirection:'row',gap:10},
 input:{borderWidth:1,borderRadius:12,padding:12,minHeight:47},
 action:{borderRadius:13,padding:13,alignItems:'center'},
 white:{color:'#fff',fontWeight:'900'}
});
