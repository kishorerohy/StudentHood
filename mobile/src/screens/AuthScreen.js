import React,{useState} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {requestPasswordReset,signInWithEmail,signUpWithEmail,startGoogleAuth} from '../auth';
import {TEST_FRESH_START} from '../config';
import useKeyboardAwareForm from '../hooks/useKeyboardAwareForm';

const LOGO_DARK=require('../../assets/studenthood-logo.png');
const LOGO_LIGHT=require('../../assets/studenthood-logo-light.png');

export default function AuthScreen({theme}){
  const [mode,setMode]=useState('signin');
  const [fullName,setFullName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const {scrollRef,onFieldFocus,onScrollLayout,onScroll,keyboardPadding}=useKeyboardAwareForm();

  async function submit(){
    setError('');
    setStatus('');
    setBusy(true);
    try{
      if(mode==='signup'){
        if(!fullName.trim()) throw new Error('Add your full name.');
        if(password.length<8) throw new Error('Use at least 8 characters for your password.');

        const result=await signUpWithEmail({fullName,email,password});

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
      await startGoogleAuth();
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
    <ScrollView
      ref={scrollRef}
      onLayout={onScrollLayout}
      onScroll={onScroll}
      scrollEventThrottle={16}
      automaticallyAdjustKeyboardInsets={Platform.OS==='ios'}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent,mode==='signin'&&styles.scrollContentCentered,{paddingBottom:160+keyboardPadding}]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS==='ios'?'interactive':'none'}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Image source={theme.isLight?LOGO_LIGHT:LOGO_DARK} style={styles.logo} resizeMode="contain"/>
        <Text style={[styles.kicker,{color:theme.accent}]}>YOUR CAMPUS. YOUR PEOPLE.</Text>
        <Text style={[styles.title,{color:theme.text}]}>{mode==='signin'?'Welcome back':'Join StudentHood'}</Text>
        <Text style={[styles.subtitle,{color:theme.muted}]}>
          {mode==='signin'?'Sign in to get back to your campus.':'Create your account. Age and regional safety setup comes next.'}
        </Text>

        <View style={[styles.modeSwitch,{backgroundColor:theme.surface2}]}>
          {['signin','signup'].map(item=><Pressable key={item} onPress={()=>{setMode(item);setError('');setStatus('')}} style={[styles.modeButton,mode===item&&{backgroundColor:theme.surface}]}>
            <Text style={[styles.modeText,{color:mode===item?theme.text:theme.muted}]}>{item==='signin'?'Sign in':'Sign up'}</Text>
          </Pressable>)}
        </View>

        {mode==='signup'&&<Input onFocus={onFieldFocus} icon="user" placeholder="Full name" value={fullName} onChangeText={setFullName} theme={theme} autoCapitalize="words"/>}

        <Input onFocus={onFieldFocus} icon="mail" placeholder="Email" value={email} onChangeText={setEmail} theme={theme} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/>
        <Input onFocus={onFieldFocus} icon="lock" placeholder="Password" value={password} onChangeText={setPassword} theme={theme} secureTextEntry autoCapitalize="none"/>

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

        {TEST_FRESH_START&&<Text style={[styles.legal,{color:theme.muted}]}>TEST PREVIEW: New email signups are disposable and cleared on sign-out, at the next fresh launch, or after about 26 hours. Google accounts are retained and closing the app alone cannot reliably delete an account.</Text>}
        <Text style={[styles.legal,{color:theme.muted}]}>By continuing, you agree to StudentHood’s Terms and acknowledge the Privacy and Safety policies.</Text>
      </View>
    </ScrollView>

  </KeyboardAvoidingView>;
}

function Input({icon,theme,...props}){
  return <View style={[styles.inputShell,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
    <Feather name={icon} size={18} color={theme.muted}/>
    <TextInput placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text}]} {...props}/>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  scroll:{flex:1},
  scrollContent:{flexGrow:1,width:'100%',maxWidth:536,alignSelf:'center',paddingHorizontal:18,paddingTop:18,paddingBottom:160},
  scrollContentCentered:{justifyContent:'center'},
  card:{width:'100%',alignSelf:'center',borderWidth:1,borderRadius:28,paddingHorizontal:22,paddingTop:18,paddingBottom:22},
  logo:{width:154,height:38,alignSelf:'center',marginBottom:16},
  kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.7,textAlign:'center'},
  title:{fontSize:34,fontWeight:'800',letterSpacing:-1.2,textAlign:'center',marginTop:7},
  subtitle:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:7,marginBottom:20},
  modeSwitch:{flexDirection:'row',borderRadius:14,padding:4,marginBottom:14},
  modeButton:{flex:1,paddingVertical:9,borderRadius:11,alignItems:'center'},
  modeText:{fontSize:12,fontWeight:'800'},
  inputShell:{height:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
  input:{flex:1,fontSize:14},
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
  dateDone:{position:'absolute',bottom:20,right:20,left:20,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
