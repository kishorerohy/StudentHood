import React,{useState} from 'react';
import {
  ActivityIndicator,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,
  StyleSheet,Text,TextInput,View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import {Feather} from '@expo/vector-icons';
import CountryPicker from '../components/CountryPicker';
import {localeRegion} from '../countries';
import {completeProfile} from '../api';
import {useSession} from '../session';

const LOGO_DARK=require('../../assets/studenthood-logo.png');
const LOGO_LIGHT=require('../../assets/studenthood-logo-light.png');

function iso(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function parseDate(value){
  const [y,m,d]=String(value||'').split('-').map(Number);
  return y&&m&&d?new Date(y,m-1,d):new Date(2005,0,1);
}

export default function OnboardingScreen({theme}){
  const {profile,session,refreshAccount}=useSession();
  const locale=Localization.getLocales?.()[0];
  const metadataDob=session?.user?.user_metadata?.date_of_birth||'';
  const metadataCountry=String(session?.user?.user_metadata?.country_code||'').toUpperCase();
  const initialDob=metadataDob||profile?.date_of_birth||'';
  const [fullName,setFullName]=useState(profile?.full_name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||'');
  const [username,setUsername]=useState(profile?.username||'');
  const [dateOfBirth,setDateOfBirth]=useState(initialDob);
  const [dobDate,setDobDate]=useState(parseDate(initialDob));
  const [showDate,setShowDate]=useState(false);
  const [country,setCountry]=useState(metadataCountry||profile?.country_code||locale?.regionCode||localeRegion(locale?.languageTag||'en'));
  const [city,setCity]=useState(profile?.city||'');
  const [campus,setCampus]=useState(profile?.campus_name||'');
  const [bio,setBio]=useState(profile?.bio||'');
  const [interests,setInterests]=useState((profile?.interests||[]).join(', '));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [reviewSafety,setReviewSafety]=useState(false);

  const timeZone=profile?.time_zone||session?.user?.user_metadata?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  const savedDob=!!initialDob;
  const savedCountry=!!country;
  const safetyDetailsComplete=savedDob&&savedCountry;

  async function save(){
    setError('');
    const normalizedUsername=username.trim().toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)){setError('Username must use 3 to 24 lowercase letters, numbers or underscores.');return;}
    if(!dateOfBirth){setError('Add your date of birth.');return;}
    if(!country){setError('Choose your country or region.');return;}
    if(!campus.trim()){setError('Add your campus or institution.');return;}
    const list=interests.split(',').map(v=>v.trim()).filter(Boolean);
    if(list.length>12){setError('Choose up to 12 interests.');return;}

    setBusy(true);
    try{
      await completeProfile({
        fullName,username:normalizedUsername,dateOfBirth,countryCode:country,timeZone,
        city,campusName:campus,bio,interests:list
      });
      await refreshAccount();
    }catch(e){
      const message=String(e?.message||'Could not finish your profile.');
      setError(message.toLowerCase().includes('duplicate')?'That username is already taken.':message);
    }finally{setBusy(false);}
  }

  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={[styles.root,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Image source={theme.isLight?LOGO_LIGHT:LOGO_DARK} style={styles.logo} resizeMode="contain"/>
        <Text style={[styles.kicker,{color:theme.accent}]}>YOUR STUDENTHOOD</Text>
        <Text style={[styles.title,{color:theme.text}]}>Set up your profile</Text>
        <Text style={[styles.subtitle,{color:theme.muted}]}>Campus, identity and safety details now. Public details can be edited later.</Text>

        <Field theme={theme} icon="user" value={fullName} onChangeText={setFullName} placeholder="Full name"/>
        <Field theme={theme} icon="at-sign" value={username} onChangeText={v=>setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="Username" autoCapitalize="none"/>

        {safetyDetailsComplete&&!reviewSafety&&<View style={[styles.savedSafety,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <View style={styles.savedSafetyInfo}>
            <Feather name="shield" size={16} color={theme.accent}/>
            <View style={{flex:1}}>
              <Text style={[styles.savedSafetyTitle,{color:theme.text}]}>Private safety details saved</Text>
              <Text style={[styles.savedSafetyCopy,{color:theme.muted}]}>Your date of birth and country were carried over from sign-up.</Text>
            </View>
          </View>
          <Pressable onPress={()=>setReviewSafety(true)} hitSlop={8}>
            <Text style={[styles.reviewLink,{color:theme.accent}]}>Review</Text>
          </Pressable>
        </View>}

        {(!savedDob||reviewSafety)&&<Pressable onPress={()=>setShowDate(true)} style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <Feather name="calendar" size={18} color={theme.muted}/>
          <Text style={[styles.fieldText,{color:dateOfBirth?theme.text:theme.muted}]}>{dateOfBirth||'Date of birth'}</Text>
          <Feather name="chevron-down" size={17} color={theme.muted}/>
        </Pressable>}

        {(!savedCountry||reviewSafety)&&<CountryPicker theme={theme} value={country} onChange={setCountry}/>}

        {reviewSafety&&<Pressable onPress={()=>setReviewSafety(false)} style={styles.doneReview}>
          <Text style={[styles.reviewLink,{color:theme.accent}]}>Done reviewing</Text>
        </Pressable>}

        <View style={[styles.safetyBox,{backgroundColor:theme.accentSoft,borderColor:theme.line}]}>
          <Feather name="clock" size={16} color={theme.accent}/>
          <View style={{flex:1}}>
            <Text style={[styles.safetyTitle,{color:theme.text}]}>Local safety time</Text>
            <Text style={[styles.safetyCopy,{color:theme.muted}]}>{timeZone}. Teen quiet hours use this saved time zone.</Text>
          </View>
        </View>

        <Field theme={theme} icon="map-pin" value={city} onChangeText={setCity} placeholder="City"/>
        <Field theme={theme} icon="book-open" value={campus} onChangeText={setCampus} placeholder="Campus or institution"/>
        <Field theme={theme} icon="edit-3" value={bio} onChangeText={setBio} placeholder="Bio" multiline maxLength={280}/>
        <Field theme={theme} icon="hash" value={interests} onChangeText={setInterests} placeholder="Interests, separated by commas"/>

        <Text style={[styles.privacy,{color:theme.muted}]}>Your full DOB, country safety state and time zone stay private.</Text>
        {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}

        <Pressable onPress={save} disabled={busy} style={[styles.primary,{backgroundColor:theme.accent,opacity:busy?0.65:1}]}>
          {busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Enter StudentHood</Text>}
        </Pressable>
      </View>
    </ScrollView>

    {showDate&&<DateTimePicker
      value={dobDate}
      mode="date"
      display={Platform.OS==='ios'?'spinner':'default'}
      maximumDate={new Date()}
      minimumDate={new Date(1900,0,1)}
      onChange={(event,date)=>{
        if(Platform.OS==='android') setShowDate(false);
        if(event.type==='dismissed') return;
        if(date){setDobDate(date);setDateOfBirth(iso(date));}
      }}
    />}
    {showDate&&Platform.OS==='ios'&&<Pressable onPress={()=>setShowDate(false)} style={[styles.dateDone,{backgroundColor:theme.accent}]}><Text style={styles.primaryText}>Done</Text></Pressable>}
  </KeyboardAvoidingView>;
}

function Field({theme,icon,multiline=false,...props}){
  return <View style={[styles.field,multiline&&styles.multiline,{backgroundColor:theme.surface2,borderColor:theme.line,alignItems:multiline?'flex-start':'center'}]}>
    <Feather name={icon} size={18} color={theme.muted} style={multiline?{marginTop:2}:null}/>
    <TextInput {...props} multiline={multiline} placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text,textAlignVertical:multiline?'top':'center'}]}/>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  scroll:{flexGrow:1,justifyContent:'center',padding:18},
  card:{width:'100%',maxWidth:590,alignSelf:'center',borderWidth:1,borderRadius:28,padding:22},
  logo:{width:180,height:45,alignSelf:'center',marginBottom:20},
  kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.7,textAlign:'center'},
  title:{fontSize:34,fontWeight:'800',letterSpacing:-1.2,textAlign:'center',marginTop:7},
  subtitle:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:7,marginBottom:14},
  field:{minHeight:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
  fieldText:{flex:1,fontSize:14},
  input:{flex:1,fontSize:14,paddingVertical:0},
  multiline:{minHeight:96,paddingVertical:14},
  savedSafety:{borderWidth:1,borderRadius:15,padding:13,marginTop:10,flexDirection:'row',alignItems:'center',gap:12},
  savedSafetyInfo:{flex:1,flexDirection:'row',alignItems:'center',gap:10},
  savedSafetyTitle:{fontSize:11,fontWeight:'800'},
  savedSafetyCopy:{fontSize:9,lineHeight:14,marginTop:2},
  reviewLink:{fontSize:10,fontWeight:'900'},
  doneReview:{alignSelf:'flex-end',paddingTop:8,paddingHorizontal:3},
  safetyBox:{flexDirection:'row',gap:10,borderWidth:1,borderRadius:15,padding:13,marginTop:10},
  safetyTitle:{fontSize:11,fontWeight:'800'},
  safetyCopy:{fontSize:10,lineHeight:15,marginTop:3},
  privacy:{fontSize:10,lineHeight:15,marginTop:12},
  error:{fontSize:11,lineHeight:16,marginTop:10},
  primary:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:14},
  primaryText:{color:'#fff',fontWeight:'900',fontSize:13},
  dateDone:{position:'absolute',bottom:20,left:20,right:20,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
