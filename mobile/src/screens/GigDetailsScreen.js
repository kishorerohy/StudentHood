import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getAccessPolicy} from '../api';
import {getGigEmployer,getMyGigApplication,changeGigApplication,getMyEmployerOrganizations,getApplicationsForEmployerGig} from '../gigsPlus';
import {issueEmployerGigConfirmation} from '../passport';

export default function GigDetailsScreen({gig,theme,onBack}){
 const [enabled,setEnabled]=useState(false),[employer,setEmployer]=useState(null);
 const [passportEnabled,setPassportEnabled]=useState(false),[notice,setNotice]=useState('');
 const [policy,setPolicy]=useState(null),[myApplication,setMyApplication]=useState(null);
 const [canManage,setCanManage]=useState(false),[applicants,setApplicants]=useState([]);
 const [statement,setStatement]=useState(''),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{
  try{
   const flags=await getExperienceFlags();setEnabled(flags.gigs_plus===true);
   setPassportEnabled(flags.passport===true);
   if(!flags.gigs_plus)return;
   const [org,access,own,orgs]=await Promise.all([
    getGigEmployer(gig),getAccessPolicy(),getMyGigApplication(gig.id),getMyEmployerOrganizations()
   ]);
   setEmployer(org);setPolicy(access);setMyApplication(own);
   const staff=!!org&&orgs.some(item=>item.id===org.id&&item.verification_status==='verified');
   setCanManage(staff);
   if(staff)setApplicants(await getApplicationsForEmployerGig(gig.id));
   else setApplicants([]);
   setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[gig?.id,gig?.employer_org_id]);
 useEffect(()=>{load()},[load]);
 async function act(action,applicantId=null){
  setBusy(true);setError('');
  try{
    await changeGigApplication(gig.id,action,action==='apply'?statement:null,applicantId);
    await load();
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 const adult=Number(policy?.conservative_age||0)>=18 && policy?.adult_access_verified===true;
 const expired=(gig.expires_at&&new Date(gig.expires_at).getTime()<=Date.now())
   ||(gig.application_deadline&&new Date(gig.application_deadline).getTime()<=Date.now());
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Gigs" style={styles.back}>
    <Feather name="arrow-left" size={22} color={theme.text}/>
  </Pressable>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   <View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
    <Feather name="briefcase" color={theme.accent} size={25}/>
    <Text style={[styles.title,{color:theme.text}]}>{gig.title}</Text>
    {!!gig.description&&<Text style={[styles.body,{color:theme.text}]}>{gig.description}</Text>}
    {!!gig.employer_name&&<Text style={[styles.body,{color:theme.muted}]}>Listed employer: {gig.employer_name}</Text>}
    <Text style={[styles.body,{color:theme.muted}]}>{gig.category||'Gig'} · {gig.campus_name||'Campus'} </Text>
    {!!gig.location_hint&&<Text style={[styles.body,{color:theme.muted}]}>{gig.location_hint}</Text>}
    {gig.pay_amount!=null&&<Text style={[styles.body,{color:theme.text}]}>
      {gig.pay_currency||''} {gig.pay_amount} {gig.pay_unit?'/ '+gig.pay_unit:''}
    </Text>}
    {!!gig.application_deadline&&<Text style={[styles.body,{color:theme.muted}]}>Application deadline: {new Date(gig.application_deadline).toLocaleDateString()}</Text>}
   </View>
   {loading?<ActivityIndicator color={theme.accent}/>:
     !enabled?<Text style={[styles.body,{color:theme.muted}]}>Gigs Plus applications are not yet available at your campus. Check the listing details and report suspicious opportunities.</Text>:
     !employer?<Text style={[styles.body,{color:theme.muted}]}>This is an ordinary student Gig listing, not a verified employer application. Do not send personal information or payments to unverified listings.</Text>:
     <>
      <View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
       <View style={styles.row}><Feather name="shield" color={theme.accent} size={20}/>
        <Text style={[styles.body,{color:theme.text,fontWeight:'800'}]}>Verified Employer: {employer.legal_name}</Text>
       </View>
       <Text style={[styles.body,{color:theme.muted}]}>StudentHood does not hold or guarantee employer payments. Never send money to apply for a Gig.</Text>
      </View>
      {canManage?<View style={styles.group}>
        <Text style={[styles.body,{color:theme.text,fontWeight:'900'}]}>Applications for your verified organization</Text>
        {!applicants.length?<Text style={[styles.body,{color:theme.muted}]}>No student applications received yet.</Text>:
         applicants.map(row=><View key={row.id} style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
          <Text style={[styles.body,{color:theme.text}]}>Application received {new Date(row.created_at).toLocaleDateString()}</Text>
          <Text style={[styles.body,{color:theme.muted}]}>Status: {row.status}</Text>
          {!!row.statement&&<Text style={[styles.body,{color:theme.text}]}>{row.statement}</Text>}
          {['submitted','in_review'].includes(row.status)&&<View style={styles.row}>
           <Action theme={theme} label="Review" disabled={busy} onPress={()=>act('in_review',row.applicant_id)}/>
           <Action theme={theme} label="Accept" disabled={busy} onPress={()=>act('accepted',row.applicant_id)}/>
           <Action theme={theme} label="Decline" disabled={busy} outline onPress={()=>act('declined',row.applicant_id)}/>
          </View>}
          {passportEnabled&&row.status==='accepted'&&<Action theme={theme}
            label="Confirm Gig involvement" disabled={busy} outline
            onPress={async()=>{setBusy(true);setError('');setNotice('');
             try{await issueEmployerGigConfirmation(row.id);setNotice('Private employer-confirmed involvement recorded.');}
             catch(e){setError(e.message);}finally{setBusy(false);}}}/>}
         </View>)}
      </View>:
      myApplication?<View style={styles.group}>
        <Text style={[styles.body,{color:theme.text,fontWeight:'900'}]}>My application: {myApplication.status}</Text>
        {['submitted','in_review'].includes(myApplication.status)&&<Action theme={theme} label="Withdraw application" outline disabled={busy} onPress={()=>act('withdraw')}/>}
      </View>:
      !adult?<Text style={[styles.body,{color:theme.muted}]}>Gigs Plus applications require verified adult eligibility.</Text>:
      expired?<Text style={[styles.body,{color:theme.muted}]}>Applications for this Gig have closed.</Text>:
      <View style={styles.group}>
       <Text style={[styles.body,{color:theme.text,fontWeight:'900'}]}>Apply privately</Text>
       <TextInput accessibilityLabel="Optional application statement" multiline maxLength={1000}
        placeholder="Tell the employer why you are interested (optional)" placeholderTextColor={theme.muted}
        value={statement} onChangeText={setStatement} style={[styles.input,{color:theme.text,borderColor:theme.line,backgroundColor:theme.surface}]}/>
       <Action theme={theme} label="Submit application" disabled={busy} onPress={()=>act('apply')}/>
      </View>}
     </>}
   {!!notice&&<Text accessibilityRole="alert" style={{color:theme.accent}}>{notice}</Text>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
   {busy&&<ActivityIndicator color={theme.accent}/>}
  </ScrollView>
 </View>;
}
function Action({theme,label,onPress,outline=false,disabled=false}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={[styles.action,{borderColor:outline?theme.line:theme.accent,backgroundColor:outline?theme.surface:theme.accent}]}>
  <Text style={{color:outline?theme.text:'#fff',fontWeight:'800'}}>{label}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 root:{flex:1},back:{padding:18,alignSelf:'flex-start'},
 content:{paddingHorizontal:18,paddingBottom:90,gap:15,maxWidth:720,width:'100%',alignSelf:'center'},
 card:{padding:17,borderWidth:1,borderRadius:19,gap:10},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 title:{fontSize:19,fontWeight:'900'},body:{fontSize:12,lineHeight:20},
 group:{gap:12},input:{padding:15,minHeight:94,borderWidth:1,borderRadius:15,textAlignVertical:'top'},
 action:{borderWidth:1,padding:12,borderRadius:13,alignItems:'center'}
});
