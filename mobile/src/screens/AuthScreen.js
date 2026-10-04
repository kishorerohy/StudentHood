import React,{useMemo,useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import {Feather} from '@expo/vector-icons';
import {countryOptions,localeRegion} from '../countries';
import {requestPasswordReset,signInWithEmail,signUpWithEmail,startGoogleAuth} from '../auth';

const LOGO=require('../../../assets/studenthood-logo.png');

function toIsoDate(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function ageFromDob(iso){
  const parts=String(iso||'').split('-').map(Number);
  if(parts.length!==3||parts.some(Number.isNaN)) return null;
  const [y,m,d]=parts;
  const now=new Date();
  let age=now.getFullYear()-y;
  if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d)) age--;
  return age;
}

function signupDecision(dob,country){
  const age=ageFromDob(dob);
  if(age===null||age<0) return {allowed:false,message:'Choose a valid date of birth.'};
  if(country==='AU'&&age<16) return {allowed:false,message:'StudentHood cannot create an under-16 account in Australia under the current social-media age restriction.'};
  if(country==='IN'&&age<18) return {allowed:false,message:'A parent or guardian must be verified before an under-18 StudentHood account can be activated in India.'};
  if(country==='US'&&age<13) return {allowed:false,message:'A parent or guardian must be verified before this account can be activated.'};
  return {allowed:true,age};
}

function CountryPicker({theme,value,onChange}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const locale=Localization.getLocales?.()[0]?.languageTag||'en';
  const options=useMemo(()=>countryOptions(locale),[locale]);
  const filtered=options.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())||x.code.toLowerCase().includes(query.toLowerCase()));
  const selected=options.find(x=>x.code===value);

  return <>
    <Pressable onPress={()=>setOpen(true)} style={[styles.inputShell,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
      <Feather name="globe" size={18} color={theme.muted}/>
      <Text style={[styles.inputText,{color:selected?theme.text:theme.muted}]}>{selected?selected.name:'Country or region'}</Text>
      <Feather name="chevron-down" size={18} color={theme.muted}/>
    </Pressable>
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setOpen(false)}>
      <View style={[styles.countryModal,{backgroundColor:theme.bg}]}>
        <View style={styles.modalTop}>
          <Text style={[styles.modalTitle,{color:theme.text}]}>Country or region</Text>
          <Pressable onPress={()=>setOpen(false)} style={[styles.iconButton,{backgroundColor:theme.surface}]}>
            <Feather name="x" size={20} color={theme.text}/>
          </Pressable>
        </View>
        <View style={[styles.searchBox,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="search" size={17} color={theme.muted}/>
          <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search countries" placeholderTextColor={theme.muted} style={[styles.searchInput,{color:theme.text}]}/>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item=>item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({item})=><Pressable onPress={()=>{onChange(item.code);setOpen(false);setQuery('')}} style={[styles.countryRow,{borderBottomColor:theme.line}]}>
            <Text style={[styles.countryName,{color:theme.text}]}>{item.name}</Text>
            <Text style={[styles.countryCode,{color:theme.muted}]}>{item.code}</Text>
          </Pressable>}
        />
      </View>
    </Modal>
  </>;
}

export default function AuthScreen({theme}){
  const locale=Localization.getLocales?.()[0];
  const defaultCountry=locale?.regionCode||localeRegion(locale?.languageTag||'en');
  const [mode,setMode]=useState('signin');
  const [fullName,setFullName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [dob,setDob]=useState('');
  const [dobDate,setDobDate]=useState(new Date(2005,0,1));
  const [showDate,setShowDate]=useState(false);
  const [country,setCountry]=useState(defaultCountry||'');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';

  async function submit(){
    setError('');
    setStatus('');
    setBusy(true);
    try{
      if(mode==='signup'){
        if(!fullName.trim()) throw new Error('Add your full name.');
        if(!dob) throw new Error('Add your date of birth.');
        if(!country) throw new Error('Choose your country or region.');
        const decision=signupDecision(dob,country);
        if(!decision.allowed) throw new Error(decision.message);
        if(password.length<8) throw new Error('Use at least 8 characters for your password.');

        const result=await signUpWithEmail({
          fullName,email,password,dateOfBirth:dob,countryCode:country,timeZone
        });

        if(result?.session){
          setStatus('Account created. Setting up your StudentHood now.');
        }else{
          setStatus('Account created. Check your email to verify your address, then sign in.');
          setMode('signin');
        }
      }else{
        await signInWithEmail({email,password});
      }
    }catch(e){
      setError(e?.message||'Could not continue.');
    }finally{
      setBusy(false);
    }
  }

  async function google(){
    setError('');
    setStatus('');
    setBusy(true);
    try{
      let pending=null;
      if(mode==='signup'){
        if(!dob||!country) throw new Error('Add your date of birth and country before continuing with Google.');
        const decision=signupDecision(dob,country);
        if(!decision.allowed) throw new Error(decision.message);
        pending={dateOfBirth:dob,countryCode:country,timeZone};
      }
      await startGoogleAuth(pending);
    }catch(e){
      setError(e?.message||'Google sign-in could not be completed.');
    }finally{
      setBusy(false);
    }
  }

  async function resetPassword(){
    if(!email.trim()){
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError('');
    try{
      await requestPasswordReset(email);
      setStatus('Password reset email sent.');
    }catch(e){
      setError(e?.message||'Could not send the reset email.');
    }finally{
      setBusy(false);
    }
  }

  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain"/>
      <Text style={[styles.kicker,{color:theme.accent}]}>YOUR CAMPUS. YOUR PEOPLE.</Text>
      <Text style={[styles.title,{color:theme.text}]}>{mode==='signin'?'Welcome back':'Join StudentHood'}</Text>
      <Text style={[styles.subtitle,{color:theme.muted}]}>
        {mode==='signin'?'Sign in to get back to your campus.':'Create your account with age-appropriate safety built in.'}
      </Text>

      <View style={[styles.modeSwitch,{backgroundColor:theme.surface2}]}>
        {['signin','signup'].map(item=><Pressable key={item} onPress={()=>{setMode(item);setError('');setStatus('')}} style={[styles.modeButton,mode===item&&{backgroundColor:theme.surface}]}>
          <Text style={[styles.modeText,{color:mode===item?theme.text:theme.muted}]}>{item==='signin'?'Sign in':'Sign up'}</Text>
        </Pressable>)}
      </View>

      {mode==='signup'&&<>
        <Input icon="user" placeholder="Full name" value={fullName} onChangeText={setFullName} theme={theme} autoCapitalize="words"/>
        <Pressable onPress={()=>setShowDate(true)} style={[styles.inputShell,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <Feather name="calendar" size={18} color={theme.muted}/>
          <Text style={[styles.inputText,{color:dob?theme.text:theme.muted}]}>{dob||'Date of birth'}</Text>
          <Feather name="chevron-down" size={18} color={theme.muted}/>
        </Pressable>
        <CountryPicker theme={theme} value={country} onChange={setCountry}/>
        <Text style={[styles.helper,{color:theme.muted}]}>DOB and country are private. They are used for age, safety and regional rules.</Text>
      </>}

      <Input icon="mail" placeholder="Email" value={email} onChangeText={setEmail} theme={theme} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/>
      <Input icon="lock" placeholder="Password" value={password} onChangeText={setPassword} theme={theme} secureTextEntry autoCapitalize="none"/>

      {mode==='signin'&&<Pressable onPress={resetPassword} disabled={busy}><Text style={[styles.forgot,{color:theme.accent}]}>Forgot password?</Text></Pressable>}

      {!!error&&<Text style={[styles.status,{color:theme.danger}]}>{error}</Text>}
      {!!status&&<Text style={[styles.status,{color:theme.success}]}>{status}</Text>}

      <Pressable onPress={submit} disabled={busy} style={[styles.primary,{backgroundColor:theme.accent,opacity:busy?0.65:1}]}>
        {busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{mode==='signin'?'Sign in':'Create account'}</Text>}
      </Pressable>

      <View style={styles.orRow}><View style={[styles.line,{backgroundColor:theme.line}]}/><Text style={[styles.or,{color:theme.muted}]}>or</Text><View style={[styles.line,{backgroundColor:theme.line}]}/></View>

      <Pressable onPress={google} disabled={busy} style={[styles.provider,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
        <Text style={[styles.googleG,{color:theme.text}]}>G</Text>
        <Text style={[styles.providerText,{color:theme.text}]}>Continue with Google</Text>
      </Pressable>

      <Text style={[styles.legal,{color:theme.muted}]}>By continuing, you agree to StudentHood’s Terms and acknowledge the Privacy and Safety policies.</Text>
    </View>

    {showDate&&<DateTimePicker
      value={dobDate}
      mode="date"
      display={Platform.OS==='ios'?'spinner':'default'}
      maximumDate={new Date()}
      minimumDate={new Date(1900,0,1)}
      onChange={(event,date)=>{
        if(Platform.OS==='android') setShowDate(false);
        if(event.type==='dismissed') return;
        if(date){setDobDate(date);setDob(toIsoDate(date));}
      }}
    />}
    {showDate&&Platform.OS==='ios'&&<Pressable onPress={()=>setShowDate(false)} style={[styles.dateDone,{backgroundColor:theme.accent}]}><Text style={styles.primaryText}>Done</Text></Pressable>}
  </KeyboardAvoidingView>;
}

function Input({icon,theme,...props}){
  return <View style={[styles.inputShell,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
    <Feather name={icon} size={18} color={theme.muted}/>
    <TextInput placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text}]} {...props}/>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,justifyContent:'center',padding:18},
  card:{width:'100%',maxWidth:500,alignSelf:'center',borderWidth:1,borderRadius:28,padding:22},
  logo:{width:176,height:44,alignSelf:'center',marginBottom:24},
  kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.7,textAlign:'center'},
  title:{fontSize:34,fontWeight:'800',letterSpacing:-1.2,textAlign:'center',marginTop:7},
  subtitle:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:7,marginBottom:20},
  modeSwitch:{flexDirection:'row',borderRadius:14,padding:4,marginBottom:14},
  modeButton:{flex:1,paddingVertical:9,borderRadius:11,alignItems:'center'},
  modeText:{fontSize:12,fontWeight:'800'},
  inputShell:{height:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
  input:{flex:1,fontSize:14},
  inputText:{flex:1,fontSize:14},
  helper:{fontSize:10,lineHeight:15,marginTop:7,paddingHorizontal:3},
  forgot:{fontSize:11,fontWeight:'800',alignSelf:'flex-end',marginTop:10},
  status:{fontSize:11,lineHeight:16,marginTop:10},
  primary:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:14},
  primaryText:{color:'#fff',fontWeight:'900',fontSize:13},
  orRow:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:14},
  line:{height:1,flex:1},
  or:{fontSize:10,fontWeight:'700'},
  provider:{height:50,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  googleG:{fontSize:17,fontWeight:'900'},
  providerText:{fontSize:13,fontWeight:'800'},
  legal:{fontSize:9,lineHeight:14,textAlign:'center',marginTop:14},
  countryModal:{flex:1,paddingTop:18,paddingHorizontal:16},
  modalTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  modalTitle:{fontSize:24,fontWeight:'800',letterSpacing:-.5},
  iconButton:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  searchBox:{height:48,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,marginBottom:8},
  searchInput:{flex:1},
  countryRow:{height:52,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  countryName:{fontSize:14,fontWeight:'600'},
  countryCode:{fontSize:11,fontWeight:'700'},
  dateDone:{position:'absolute',bottom:20,right:20,left:20,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
