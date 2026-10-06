import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Linking,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Feather} from '@expo/vector-icons';
import {signOut} from '../auth';
import {createGuardianConsentRequest,getGuardianConsentStatus} from '../api';
import {GUARDIAN_CONSENT_URL,LEGAL_URLS,TEST_FRESH_START} from '../config';
import {useSession} from '../session';

const COPY={
  quiet_hours:{
    icon:'moon',
    kicker:'TEEN MODE',
    title:'StudentHood is paused for tonight.',
    body:'Under-18 accounts pause at 7:00 PM in their saved local time zone and reopen at 7:00 AM.',
    note:'Your account, Peeps, Scenes and Pings stay safe while access is paused.'
  },
  guardian_consent_required:{
    icon:'shield',
    kicker:'GUARDIAN APPROVAL',
    title:'A parent or guardian needs to approve this account.',
    body:'Your country or region requires parent or guardian permission before StudentHood can activate this account.',
    note:'Your profile is saved. Create a secure approval request and send the 24-hour link to your parent or legal guardian.'
  },
  regional_age_restriction:{
    icon:'lock',
    kicker:'REGIONAL AGE REQUIREMENT',
    title:'StudentHood is not available for this age in your region.',
    body:'Some countries set a higher minimum age for social-media accounts.',
    note:'StudentHood applies the local requirement even when younger users are permitted elsewhere.'
  },
  platform_age_verification_required:{
    icon:'shield',
    kicker:'AGE CHECK REQUIRED',
    title:'Your platform needs an age check.',
    body:'Google Play or the device platform requires age verification before StudentHood can continue in this region.',
    note:'StudentHood will not guess your age or treat an adult Google or Apple account as proof that the current user is an adult.'
  },
  safety_setup_required:{
    icon:'shield',
    kicker:'SAFETY SETUP',
    title:'Finish your safety setup.',
    body:'StudentHood needs your date of birth, country or region and saved time zone before opening the app.',
    note:'These details are used for age-appropriate protections and are not public profile data.'
  }
};

export default function SafetyGate({theme,policy}){
  const {session,refreshAccount}=useSession();
  const [guardianEmail,setGuardianEmail]=useState('');
  const [relationship,setRelationship]=useState('parent');
  const [request,setRequest]=useState(null);
  const [approvalLink,setApprovalLink]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  const item=COPY[policy?.reason]||{
    icon:'shield',kicker:'STUDENTHOOD SAFETY',title:'This account is paused.',
    body:'StudentHood cannot open this account right now.',note:'Visit Safety for more information.'
  };
  const isGuardianGate=policy?.reason==='guardian_consent_required';
  const storageKey=useMemo(()=>session?.user?.id?'studenthood.guardianApprovalLink.'+session.user.id:'',[session?.user?.id]);

  async function loadStatus(){
    if(!isGuardianGate) return;
    try{
      const next=await getGuardianConsentStatus();
      setRequest(next);
      if(next?.status==='approved'){
        setMessage('Guardian approval received. Opening StudentHood…');
        if(storageKey) await AsyncStorage.removeItem(storageKey);
        await refreshAccount();
      }
    }catch{}
  }

  useEffect(()=>{
    let active=true;
    let timer=null;
    (async()=>{
      if(storageKey){
        const saved=await AsyncStorage.getItem(storageKey);
        if(active&&saved) setApprovalLink(saved);
      }
      await loadStatus();
    })();
    if(isGuardianGate) timer=setInterval(loadStatus,5000);
    return ()=>{active=false;if(timer) clearInterval(timer)};
  },[isGuardianGate,storageKey]);

  async function askGuardian(){
    setError('');
    setMessage('');
    const email=guardianEmail.trim().toLowerCase();
    if(!/^[A-Z0-9._%+'-]+@[A-Z0-9.-]+[.][A-Z]{2,}$/i.test(email)){setError('Enter a valid email address.');return;}
    setBusy(true);
    try{
      const created=await createGuardianConsentRequest({guardianEmail:email,relationship});
      const link=GUARDIAN_CONSENT_URL+'?token='+encodeURIComponent(created.token);
      setRequest(created);
      setApprovalLink(link);
      if(storageKey) await AsyncStorage.setItem(storageKey,link);
      setMessage('Approval request created. Send the secure link to your parent or guardian.');
    }catch(e){
      setError(e?.message||'Could not create the guardian approval request.');
    }finally{setBusy(false)}
  }

  async function prepareApprovalEmail(){
    if(!approvalLink) return;
    const to=String(request?.guardian_email||guardianEmail||'').trim();
    const subject='StudentHood: please review my account approval';
    const body='Hello,\n\nPlease review my StudentHood guardian approval request using this secure link. It expires after 24 hours.\n\n'+approvalLink+'\n\nThank you.';
    const url='mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    try{
      await Linking.openURL(url);
      setMessage('Email draft opened. Please tap Send in your email app to deliver it.');
    }catch{
      setError('Could not open an email app. Use Share approval link instead.');
    }
  }

  async function shareApproval(){
    if(!approvalLink) return;
    try{
      await Share.share({
        title:'StudentHood guardian approval',
        message:'Please review and approve my StudentHood account using this secure link. The link expires after 24 hours.\n\n'+approvalLink
      });
    }catch(e){setError(e?.message||'Could not open the share sheet.')}
  }

  async function refreshApproval(){
    setBusy(true);
    setError('');
    try{await loadStatus();await refreshAccount()}
    catch(e){setError(e?.message||'Could not refresh guardian approval status.')}
    finally{setBusy(false)}
  }

  const requestStatus=request?.status||'none';
  const showRequestForm=!request||['none','expired','rejected'].includes(requestStatus);

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.icon,{backgroundColor:theme.accentSoft}]}><Feather name={item.icon} size={29} color={theme.accent}/></View>
      <Text style={[styles.kicker,{color:theme.accent}]}>{item.kicker}</Text>
      <Text style={[styles.title,{color:theme.text}]}>{item.title}</Text>
      <Text style={[styles.body,{color:theme.muted}]}>{item.body}</Text>
      <View style={[styles.note,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
        <Text style={[styles.noteText,{color:theme.muted}]}>{item.note}</Text>
        {policy?.time_zone&&<Text style={[styles.zone,{color:theme.text}]}>Local time zone: {policy.time_zone}</Text>}
      </View>

      {isGuardianGate?<>
        {showRequestForm?<>
          <View style={styles.form}>
            <Text style={[styles.label,{color:theme.text}]}>Parent or guardian email</Text>
            <TextInput value={guardianEmail} onChangeText={setGuardianEmail} keyboardType='email-address' autoCapitalize='none' autoCorrect={false} placeholder='guardian@example.com' placeholderTextColor={theme.muted} style={[styles.input,{backgroundColor:theme.surface2,borderColor:theme.line,color:theme.text}]}/>
            <Text style={[styles.label,{color:theme.text}]}>Relationship</Text>
            <View style={styles.relationshipRow}>
              {[[ 'parent','Parent' ],[ 'legal_guardian','Legal guardian' ]].map(([value,label])=><Pressable key={value} onPress={()=>setRelationship(value)} style={[styles.relationship,{borderColor:relationship===value?theme.accent:theme.line,backgroundColor:theme.surface2}]}>
                <Text style={[styles.relationshipText,{color:relationship===value?theme.accent:theme.text}]}>{label}</Text>
              </Pressable>)}
            </View>
            <Pressable onPress={askGuardian} disabled={busy} style={[styles.primary,{backgroundColor:theme.accent,opacity:busy?0.65:1}]}>
              {busy?<ActivityIndicator color='#fff'/>:<Text style={styles.primaryText}>Ask a parent or guardian</Text>}
            </Pressable>
          </View>
        </>:<>
          <View style={[styles.pending,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            <Feather name={requestStatus==='approved'?'check-circle':'clock'} size={18} color={theme.accent}/>
            <View style={{flex:1}}>
              <Text style={[styles.pendingTitle,{color:theme.text}]}>{requestStatus==='approved'?'Guardian approved':'Waiting for guardian approval'}</Text>
              <Text style={[styles.pendingCopy,{color:theme.muted}]}>{request?.guardian_email||guardianEmail}</Text>
              {requestStatus!=='approved'&&<Text style={[styles.expiry,{color:theme.muted}]}>The secure approval link expires after 24 hours.</Text>}
            </View>
          </View>
          {!!approvalLink&&requestStatus!=='approved'&&<>
            <Pressable onPress={prepareApprovalEmail} style={[styles.primary,{backgroundColor:theme.accent}]}>
              <Feather name='mail' size={16} color='#fff'/><Text style={styles.primaryText}>Prepare approval email</Text>
            </Pressable>
            <Pressable onPress={shareApproval} style={[styles.outline,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
              <Feather name='share-2' size={15} color={theme.text}/><Text style={[styles.outlineText,{color:theme.text}]}>Share approval link</Text>
            </Pressable>
            <Text style={[styles.expiry,{color:theme.muted,textAlign:'center',marginTop:8}]}>This test build prepares an email draft. Sending is completed in your email app.</Text>
          </>}
          <Pressable onPress={refreshApproval} disabled={busy} style={[styles.outline,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
            {busy?<ActivityIndicator color={theme.text}/>:<><Feather name='refresh-cw' size={15} color={theme.text}/><Text style={[styles.outlineText,{color:theme.text}]}>Check approval status</Text></>}
          </Pressable>
        </>}
        {!!message&&<Text style={[styles.message,{color:theme.muted}]}>{message}</Text>}
        {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}
        <Pressable onPress={()=>Linking.openURL(LEGAL_URLS.safety)} style={styles.linkButton}><Text style={[styles.linkText,{color:theme.muted}]}>How safety works</Text></Pressable>
      </>:<>
        <Pressable onPress={()=>Linking.openURL(LEGAL_URLS.safety)} style={[styles.primary,{backgroundColor:theme.accent}]}><Text style={styles.primaryText}>How safety works</Text></Pressable>
      </>}

      <Pressable onPress={signOut} style={styles.secondary}><Text style={[styles.secondaryText,{color:theme.muted}]}>Sign out</Text></Pressable>
      {TEST_FRESH_START&&<Text style={[styles.expiry,{color:theme.muted,textAlign:'center',marginTop:8}]}>Preview testing: Google accounts are retained. New disposable email test accounts are removed on sign-out or next cold launch; server cleanup runs after 26 hours.</Text>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:520,borderWidth:1,borderRadius:28,padding:26,alignItems:'center'},
  icon:{width:68,height:68,borderRadius:34,alignItems:'center',justifyContent:'center',marginBottom:18},
  kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.7},
  title:{fontSize:34,lineHeight:37,fontWeight:'800',letterSpacing:-1.2,textAlign:'center',marginTop:8},
  body:{fontSize:13,lineHeight:20,textAlign:'center',marginTop:13},
  note:{width:'100%',borderWidth:1,borderRadius:16,padding:14,marginTop:20},
  noteText:{fontSize:11,lineHeight:17,textAlign:'center'},
  zone:{fontSize:10,fontWeight:'800',textAlign:'center',marginTop:7},
  form:{width:'100%',marginTop:14},
  label:{fontSize:11,fontWeight:'800',marginTop:10,marginBottom:6},
  input:{height:50,borderWidth:1,borderRadius:14,paddingHorizontal:13,fontSize:14},
  relationshipRow:{flexDirection:'row',gap:8},
  relationship:{flex:1,minHeight:44,borderWidth:1,borderRadius:13,alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  relationshipText:{fontSize:11,fontWeight:'800'},
  pending:{width:'100%',borderWidth:1,borderRadius:16,padding:14,marginTop:16,flexDirection:'row',alignItems:'flex-start',gap:10},
  pendingTitle:{fontSize:12,fontWeight:'900'},
  pendingCopy:{fontSize:10,lineHeight:15,marginTop:3},
  expiry:{fontSize:9,lineHeight:14,marginTop:4},
  primary:{width:'100%',height:50,borderRadius:15,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:16},
  outline:{width:'100%',height:48,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:9},
  outlineText:{fontSize:11,fontWeight:'900'},
  message:{width:'100%',fontSize:10,lineHeight:15,textAlign:'center',marginTop:10},
  error:{width:'100%',fontSize:10,lineHeight:15,textAlign:'center',marginTop:10},
  linkButton:{padding:10,marginTop:4},
  linkText:{fontSize:10,fontWeight:'800'},
  primaryText:{color:'#fff',fontSize:12,fontWeight:'900'},
  secondary:{padding:12,marginTop:0},
  secondaryText:{fontSize:11,fontWeight:'800'}
});
