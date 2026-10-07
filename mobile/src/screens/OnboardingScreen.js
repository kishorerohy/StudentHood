import React,{useEffect,useRef,useState} from 'react';
import {
  ActivityIndicator,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,
  StyleSheet,Text,TextInput,View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Localization from 'expo-localization';
import * as Location from 'expo-location';
import {Feather} from '@expo/vector-icons';
import CountryPicker from '../components/CountryPicker';
import {localeRegion} from '../countries';
import {
  checkUsernameAvailability,completeProfile,findNearbyInstitutions,initializeSafetyProfile,
  recordPlatformAgeSignal,recordPlatformAgeStatus
} from '../api';
import {platformAgeSignalsAvailable,requestPlatformAgeSignal} from '../ageAssurance';
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
  const initialCountry=metadataCountry||profile?.country_code||locale?.regionCode||localeRegion(locale?.languageTag||'en');
  const alreadyChecked=!!(
    profile?.date_of_birth
    && profile?.country_code
    && profile?.time_zone
    && profile?.platform_age_status
    && profile.platform_age_status!=='unknown'
  );

  const [fullName,setFullName]=useState(profile?.full_name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||'');
  const [username,setUsername]=useState(profile?.username||'');
  const [dateOfBirth,setDateOfBirth]=useState(initialDob);
  const [dobDate,setDobDate]=useState(parseDate(initialDob));
  const [showDate,setShowDate]=useState(false);
  const [country,setCountry]=useState(initialCountry);
  const [city,setCity]=useState(profile?.city||'');
  const [campus,setCampus]=useState(profile?.campus_name||'');
  const [bio,setBio]=useState(profile?.bio||'');
  const [interests,setInterests]=useState((profile?.interests||[]).join(', '));
  const [busy,setBusy]=useState(false);
  const [checkingSafety,setCheckingSafety]=useState(false);
  const [safetyChecked,setSafetyChecked]=useState(alreadyChecked);
  const [safetyNote,setSafetyNote]=useState(
    alreadyChecked?'Your age and regional safety details have already been checked.':''
  );
  const [error,setError]=useState('');
  const [usernameState,setUsernameState]=useState('idle');
  const [locationNote,setLocationNote]=useState('');
  const [locating,setLocating]=useState(false);
  const [currentCoords,setCurrentCoords]=useState(null);
  const [institutions,setInstitutions]=useState([]);
  const [institutionLoading,setInstitutionLoading]=useState(false);
  const [institutionError,setInstitutionError]=useState('');
  const [campusOpen,setCampusOpen]=useState(false);
  const [campusQuery,setCampusQuery]=useState('');
  const usernameRequest=useRef(0);
  const locationAttempted=useRef(false);

  const timeZone=profile?.time_zone||session?.user?.user_metadata?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';

  useEffect(()=>{
    const normalized=username.trim().toLowerCase();
    const original=String(profile?.username||'').trim().toLowerCase();
    const request=++usernameRequest.current;

    if(!normalized){setUsernameState('idle');return;}
    if(!/^[a-z0-9._-]{3,24}$/.test(normalized)){setUsernameState('invalid');return;}
    if(original&&normalized===original){setUsernameState('available');return;}

    setUsernameState('checking');
    const timer=setTimeout(async()=>{
      try{
        const available=await checkUsernameAvailability(normalized);
        if(request===usernameRequest.current) setUsernameState(available?'available':'taken');
      }catch{
        if(request===usernameRequest.current) setUsernameState('error');
      }
    },350);

    return()=>clearTimeout(timer);
  },[username,profile?.username]);

  useEffect(()=>{
    if(!safetyChecked||city.trim()||locationAttempted.current) return;
    locationAttempted.current=true;
    detectLocation();
  },[safetyChecked]);

  async function loadInstitutions(coords){
    if(!coords) return;
    setInstitutionLoading(true);
    setInstitutionError('');
    try{
      const rows=await findNearbyInstitutions(coords);
      setInstitutions(rows);
      if(rows.length===0) setInstitutionError('No nearby schools, colleges or universities were found.');
    }catch(e){
      setInstitutions([]);
      setInstitutionError(e?.message||'Could not load nearby institutions.');
    }finally{
      setInstitutionLoading(false);
    }
  }

  async function detectLocation(){
    setLocating(true);
    setLocationNote('');
    setInstitutionError('');
    try{
      const enabled=await Location.hasServicesEnabledAsync();
      if(!enabled){
        setLocationNote('Turn on location services to find your city and nearby institutions.');
        return;
      }

      const permission=await Location.requestForegroundPermissionsAsync();
      if(permission.status!=='granted'){
        setLocationNote('Location permission is needed to find your city and nearby institutions.');
        return;
      }

      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      const coords={
        latitude:Math.round(position.coords.latitude*1000)/1000,
        longitude:Math.round(position.coords.longitude*1000)/1000
      };
      setCurrentCoords(coords);

      const addresses=await Location.reverseGeocodeAsync(coords);
      const address=addresses?.[0];
      const detectedCity=String(address?.city||address?.district||address?.subregion||'').trim();
      if(detectedCity) setCity(detectedCity);
      setLocationNote(detectedCity?'City detected from your current location.':'Location found. Choose your institution below.');
      await loadInstitutions(coords);
    }catch(e){
      setLocationNote(e?.message||'Could not detect your location. You can retry.');
    }finally{
      setLocating(false);
    }
  }

  function chooseInstitution(item){
    setCampus(String(item?.name||'').trim());
    setCampusOpen(false);
    setCampusQuery('');
  }

  const filteredInstitutions=institutions.filter(item=>
    String(item?.name||'').toLowerCase().includes(campusQuery.trim().toLowerCase())
  );

  function changeCountry(value){
    setCountry(value);
    setSafetyChecked(false);
    setSafetyNote('');
  }

  async function checkSafety(){
    setError('');
    setSafetyNote('');
    if(!dateOfBirth){setError('Add your date of birth.');return;}
    if(!country){setError('Choose your country or region.');return;}

    setCheckingSafety(true);
    try{
      let nextPolicy=await initializeSafetyProfile({
        dateOfBirth,countryCode:country,timeZone
      });

      if(platformAgeSignalsAvailable()){
        const signal=await requestPlatformAgeSignal();

        if(signal.status==='shared'){
          nextPolicy=await recordPlatformAgeSignal({
            provider:signal.provider,
            ageLower:signal.ageLower,
            ageUpper:signal.ageUpper,
            source:signal.source
          });
          setSafetyNote('Age signal checked. If age signals disagree, StudentHood uses the safer younger result.');
        }else{
          nextPolicy=await recordPlatformAgeStatus({
            provider:signal.provider,
            status:signal.status
          });
          setSafetyNote(
            signal.status==='verification_required'
              ?'Your device platform requires an additional age check before StudentHood can continue.'
              :'No platform age range was shared. Your declared DOB and regional safety rules remain active.'
          );
        }
      }else{
        const provider=Platform.OS==='ios'?'apple':'google';
        nextPolicy=await recordPlatformAgeStatus({provider,status:'unavailable'});
        setSafetyNote('Device age signals are unavailable in this build. Your declared DOB and regional safety rules remain active.');
      }

      setSafetyChecked(true);
      await refreshAccount();

      if(nextPolicy?.reason==='platform_age_verification_required'){
        return;
      }
    }catch(e){
      setSafetyChecked(false);
      setError(e?.message||'Could not complete the age and safety check.');
    }finally{
      setCheckingSafety(false);
    }
  }

  async function save(){
    setError('');
    const normalizedUsername=username.trim().toLowerCase();
    if(!safetyChecked){setError('Complete the age and safety check first.');return;}
    if(!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)){setUsernameState('invalid');return;}
    if(usernameState==='checking'){setError('Checking username availability.');return;}
    try{
      const available=await checkUsernameAvailability(normalizedUsername);
      if(!available){setUsernameState('taken');return;}
    }catch(e){
      setError(e?.message||'Could not check username availability.');
      return;
    }
    if(!campus.trim()){setError('Choose your campus or institution.');return;}
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
      if(message.toLowerCase().includes('duplicate')||message.includes('profiles_username_lower_unique')){
        setUsernameState('taken');
      }else{
        setError(message);
      }
    }finally{setBusy(false);}
  }

  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={[styles.root,{backgroundColor:theme.bg}]}>
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Image source={theme.isLight?LOGO_LIGHT:LOGO_DARK} style={styles.logo} resizeMode="contain"/>
        <Text style={[styles.kicker,{color:theme.accent}]}>YOUR STUDENTHOOD</Text>
        <Text style={[styles.title,{color:theme.text}]}>Set up your profile</Text>
        <Text style={[styles.subtitle,{color:theme.muted}]}>One private age and safety check, then your campus profile.</Text>

        <View style={[styles.section,{borderColor:theme.line}]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon,{backgroundColor:theme.accentSoft}]}>
              <Feather name="shield" size={17} color={theme.accent}/>
            </View>
            <View style={{flex:1}}>
              <Text style={[styles.sectionTitle,{color:theme.text}]}>Age & regional safety</Text>
              <Text style={[styles.sectionCopy,{color:theme.muted}]}>Private. Used only for age protections and local rules.</Text>
            </View>
          </View>

          {!safetyChecked&&<>
            <Pressable onPress={()=>setShowDate(true)} style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
              <Feather name="calendar" size={18} color={theme.muted}/>
              <Text style={[styles.fieldText,{color:dateOfBirth?theme.text:theme.muted}]}>{dateOfBirth||'Date of birth'}</Text>
              <Feather name="chevron-down" size={17} color={theme.muted}/>
            </Pressable>

            <CountryPicker theme={theme} value={country} onChange={changeCountry}/>

            <View style={[styles.safetyBox,{backgroundColor:theme.accentSoft,borderColor:theme.line}]}>
              <Feather name="clock" size={16} color={theme.accent}/>
              <View style={{flex:1}}>
                <Text style={[styles.safetyTitle,{color:theme.text}]}>Local safety time</Text>
                <Text style={[styles.safetyCopy,{color:theme.muted}]}>{timeZone}. Teen quiet hours use this saved time zone.</Text>
              </View>
            </View>

            <Pressable onPress={checkSafety} disabled={checkingSafety} style={[styles.safetyButton,{backgroundColor:theme.text,opacity:checkingSafety?.65:1}]}>
              {checkingSafety?<ActivityIndicator color={theme.bg}/>:<>
                <Feather name="shield" size={16} color={theme.bg}/>
                <Text style={[styles.safetyButtonText,{color:theme.bg}]}>Check age & continue</Text>
              </>}
            </Pressable>
          </>}

          {safetyChecked&&<View style={[styles.checkedBox,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            <View style={[styles.checkedIcon,{backgroundColor:theme.accentSoft}]}>
              <Feather name="check" size={17} color={theme.accent}/>
            </View>
            <View style={{flex:1}}>
              <Text style={[styles.checkedTitle,{color:theme.text}]}>Age & safety check complete</Text>
              <Text style={[styles.checkedCopy,{color:theme.muted}]}>{dateOfBirth} · {country} · {timeZone}</Text>
              {!!safetyNote&&<Text style={[styles.checkedNote,{color:theme.muted}]}>{safetyNote}</Text>}
            </View>
            <Pressable onPress={()=>{setSafetyChecked(false);setSafetyNote('')}} hitSlop={8}>
              <Text style={[styles.reviewLink,{color:theme.accent}]}>Review</Text>
            </Pressable>
          </View>}
        </View>

        {safetyChecked&&<>
          <Text style={[styles.profileSectionTitle,{color:theme.text}]}>Your profile</Text>
          <Field theme={theme} icon="user" value={fullName} onChangeText={setFullName} placeholder="Full name"/>
          <Field theme={theme} icon="at-sign" value={username} onChangeText={v=>setUsername(v.toLowerCase().replace(/[^a-z0-9._-]/g,''))} placeholder="Username" autoCapitalize="none"/>
          {usernameState==='checking'&&<Text style={[styles.fieldHint,{color:theme.muted}]}>Checking username...</Text>}
          {usernameState==='available'&&!!username.trim()&&<Text style={[styles.fieldHint,{color:theme.accent}]}>Username available</Text>}
          {usernameState==='taken'&&<Text style={[styles.fieldHint,{color:theme.danger}]}>user name already exist</Text>}
          {usernameState==='invalid'&&!!username.trim()&&<Text style={[styles.fieldHint,{color:theme.danger}]}>Use 3 to 24 lowercase letters, numbers, dots, hyphens or underscores.</Text>}
          {usernameState==='error'&&<Text style={[styles.fieldHint,{color:theme.danger}]}>Could not check username. Try again.</Text>}

          <View style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            <Feather name="map-pin" size={18} color={theme.muted}/>
            <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text}]}/>
            <Pressable onPress={detectLocation} disabled={locating} hitSlop={8} accessibilityLabel="Detect current city">
              {locating?<ActivityIndicator size="small" color={theme.accent}/>:<Feather name="navigation" size={17} color={theme.accent}/>}
            </Pressable>
          </View>
          {!!locationNote&&<Text style={[styles.fieldHint,{color:theme.muted}]}>{locationNote}</Text>}

          <Pressable onPress={()=>{setCampusOpen(true);if(currentCoords&&institutions.length===0&&!institutionLoading)loadInstitutions(currentCoords)}} style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            <Feather name="book-open" size={18} color={theme.muted}/>
            <Text numberOfLines={1} style={[styles.fieldText,{color:campus?theme.text:theme.muted}]}>{campus||'Campus or institution'}</Text>
            <Feather name="chevron-down" size={17} color={theme.muted}/>
          </Pressable>
          {!!institutionError&&<Text style={[styles.fieldHint,{color:theme.danger}]}>{institutionError}</Text>}
          <Field theme={theme} icon="edit-3" value={bio} onChangeText={setBio} placeholder="Bio" multiline maxLength={280}/>
          <Field theme={theme} icon="hash" value={interests} onChangeText={setInterests} placeholder="Interests, separated by commas"/>

          <Text style={[styles.privacy,{color:theme.muted}]}>Your full DOB, country safety state and time zone stay private.</Text>
          {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}

          <Pressable onPress={save} disabled={busy} style={[styles.primary,{backgroundColor:theme.accent,opacity:busy?0.65:1}]}>
            {busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Enter StudentHood</Text>}
          </Pressable>
        </>}

        {!safetyChecked&&!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}
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
        if(date){
          setDobDate(date);
          setDateOfBirth(iso(date));
          setSafetyChecked(false);
          setSafetyNote('');
        }
      }}
    />}
    {showDate&&Platform.OS==='ios'&&<Pressable onPress={()=>setShowDate(false)} style={[styles.dateDone,{backgroundColor:theme.accent}]}><Text style={styles.primaryText}>Done</Text></Pressable>}

    <Modal visible={campusOpen} transparent animationType="fade" onRequestClose={()=>setCampusOpen(false)}>
      <Pressable style={styles.pickerBackdrop} onPress={()=>setCampusOpen(false)}/>
      <View style={[styles.pickerSheet,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <View style={styles.pickerHead}>
          <View style={{flex:1}}>
            <Text style={[styles.pickerTitle,{color:theme.text}]}>Choose your institution</Text>
            <Text style={[styles.pickerCopy,{color:theme.muted}]}>Schools, colleges and universities near your detected location.</Text>
          </View>
          <Pressable onPress={()=>setCampusOpen(false)} hitSlop={8}><Feather name="x" size={21} color={theme.muted}/></Pressable>
        </View>
        <View style={[styles.pickerSearch,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <Feather name="search" size={17} color={theme.muted}/>
          <TextInput value={campusQuery} onChangeText={setCampusQuery} placeholder="Search nearby institutions" placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text}]}/>
        </View>
        {institutionLoading?<View style={styles.pickerLoading}><ActivityIndicator color={theme.accent}/><Text style={[styles.pickerCopy,{color:theme.muted}]}>Finding nearby institutions...</Text></View>:
          <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerList}>
            {filteredInstitutions.map(item=><Pressable key={item.id} onPress={()=>chooseInstitution(item)} style={[styles.institutionRow,{borderBottomColor:theme.line}]}>
              <View style={[styles.institutionIcon,{backgroundColor:theme.accentSoft}]}><Feather name="book-open" size={17} color={theme.accent}/></View>
              <View style={{flex:1}}>
                <Text style={[styles.institutionName,{color:theme.text}]}>{item.name}</Text>
                <Text style={[styles.institutionMeta,{color:theme.muted}]}>{String(item.type||'institution').replace(/^./,c=>c.toUpperCase())}{Number.isFinite(item.distance_m)?' · '+(item.distance_m/1000).toFixed(1)+' km':''}</Text>
              </View>
              {campus===item.name&&<Feather name="check" size={18} color={theme.accent}/>}
            </Pressable>)}
            {!filteredInstitutions.length&&!institutionLoading&&<View style={styles.pickerLoading}><Text style={[styles.pickerCopy,{color:theme.muted}]}>No matching institution found. Retry location to refresh the nearby list.</Text></View>}
          </ScrollView>}
      </View>
    </Modal>
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
  subtitle:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:7,marginBottom:16},
  section:{borderWidth:1,borderRadius:18,padding:14},
  sectionHead:{flexDirection:'row',alignItems:'center',gap:10},
  sectionIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  sectionTitle:{fontSize:13,fontWeight:'900'},
  sectionCopy:{fontSize:9,lineHeight:14,marginTop:2},
  field:{minHeight:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
  fieldText:{flex:1,fontSize:14},
  input:{flex:1,fontSize:14,paddingVertical:0},
  multiline:{minHeight:96,paddingVertical:14},
  safetyBox:{flexDirection:'row',gap:10,borderWidth:1,borderRadius:15,padding:13,marginTop:10},
  safetyTitle:{fontSize:11,fontWeight:'800'},
  safetyCopy:{fontSize:10,lineHeight:15,marginTop:3},
  safetyButton:{height:50,borderRadius:15,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:12},
  safetyButtonText:{fontSize:12,fontWeight:'900'},
  checkedBox:{borderWidth:1,borderRadius:15,padding:13,marginTop:12,flexDirection:'row',alignItems:'flex-start',gap:10},
  checkedIcon:{width:34,height:34,borderRadius:11,alignItems:'center',justifyContent:'center'},
  checkedTitle:{fontSize:11,fontWeight:'900'},
  checkedCopy:{fontSize:9,lineHeight:14,marginTop:2},
  checkedNote:{fontSize:9,lineHeight:14,marginTop:5},
  reviewLink:{fontSize:10,fontWeight:'900'},
  profileSectionTitle:{fontSize:14,fontWeight:'900',marginTop:18,marginBottom:2},
  privacy:{fontSize:10,lineHeight:15,marginTop:12},
  error:{fontSize:11,lineHeight:16,marginTop:10},
  fieldHint:{fontSize:9,lineHeight:13,marginTop:5,marginHorizontal:5},
  pickerBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.42)'},
  pickerSheet:{position:'absolute',left:14,right:14,bottom:14,maxHeight:'76%',borderWidth:1,borderRadius:24,padding:16},
  pickerHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},
  pickerTitle:{fontSize:18,fontWeight:'900'},
  pickerCopy:{fontSize:10,lineHeight:15,marginTop:3},
  pickerSearch:{height:48,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,marginTop:14},
  pickerList:{marginTop:8},
  pickerLoading:{padding:24,alignItems:'center',gap:8},
  institutionRow:{minHeight:66,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  institutionIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  institutionName:{fontSize:11,fontWeight:'800'},
  institutionMeta:{fontSize:9,marginTop:3},
  primary:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:14},
  primaryText:{color:'#fff',fontWeight:'900',fontSize:13},
  dateDone:{position:'absolute',bottom:20,left:20,right:20,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
