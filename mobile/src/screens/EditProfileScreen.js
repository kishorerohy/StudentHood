import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,ToastAndroid,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {findInstitutionsByCity,searchInstitutionsByName,getAvatarDisplayUrl,saveMyProfileChanges,uploadMyAvatar,uploadMyCover} from '../api';
import useKeyboardAwareForm from '../hooks/useKeyboardAwareForm';

export default function EditProfileScreen({theme,profile,onBack,onSaved,photoOnly=false}){
  const [fullName,setFullName]=useState(profile?.full_name||'');
  const [bio,setBio]=useState(profile?.bio||'');
  const [city,setCity]=useState(profile?.city||'');
  const [campus,setCampus]=useState(profile?.campus_name||'');
  const [avatar,setAvatar]=useState(null);
  const [newPhoto,setNewPhoto]=useState(null);
  const [cover,setCover]=useState(null);
  const [newCover,setNewCover]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [institutionOpen,setInstitutionOpen]=useState(false);
  const [institutionRows,setInstitutionRows]=useState([]);
  const [institutionLoading,setInstitutionLoading]=useState(false);
  const [institutionError,setInstitutionError]=useState('');
  const [institutionQuery,setInstitutionQuery]=useState('');
  const [institutionMode,setInstitutionMode]=useState('nearby');
  const [globalRows,setGlobalRows]=useState([]);
  const [globalError,setGlobalError]=useState('');
  const [globalLoading,setGlobalLoading]=useState(false);
  const [globalHasMore,setGlobalHasMore]=useState(false);
  const [globalPage,setGlobalPage]=useState(1);
  const [globalSearched,setGlobalSearched]=useState(false);
  const globalRequest=useRef(0);
  const {scrollRef,onFieldFocus,onScrollLayout,onScroll,keyboardPadding}=useKeyboardAwareForm();

  useEffect(()=>{
    let active=true;
    getAvatarDisplayUrl(profile?.avatar_url).then(url=>{if(active)setAvatar(url)}).catch(()=>{});
    return()=>{active=false};
  },[profile?.avatar_url]);

  useEffect(()=>{
    let active=true;
    getAvatarDisplayUrl(profile?.cover_url).then(url=>{if(active)setCover(url)}).catch(()=>{});
    return()=>{active=false};
  },[profile?.cover_url]);

  useEffect(()=>{if(photoOnly&&!newPhoto)choosePhoto()},[photoOnly]);

  async function chooseCover(){
    setError('');
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){setError('Photo library permission is required to choose a cover picture.');return;}
      const result=await ImagePicker.launchImageLibraryAsync({
        mediaTypes:['images'],quality:0.88,allowsEditing:true,aspect:[16,9],allowsMultipleSelection:false
      });
      if(!result.canceled&&result.assets?.[0])setNewCover(result.assets[0]);
    }catch(e){setError(e?.message||'Could not choose a cover picture.');}
  }

  async function choosePhoto(){
    setError('');
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){setError('Photo library permission is required to choose a profile photo.');return;}
      const result=await ImagePicker.launchImageLibraryAsync({
        mediaTypes:['images'],
        quality:0.9,
        allowsEditing:true,
        aspect:[1,1],
        allowsMultipleSelection:false
      });
      if(!result.canceled&&result.assets?.[0]){
        setNewPhoto(result.assets[0]);
      }
    }catch(e){setError(e?.message||'Could not choose a photo.')}
  }

  async function save(){
    if(busy)return;
    if(photoOnly&&!newPhoto){
      setError('Choose a profile photo before saving.');
      return;
    }
    setBusy(true);
    setError('');
    let profileSaved=false;
    let photoSaved=false;
    let coverSaved=false;
    try{
      // These calls verify the saved record before returning success.
      if(!photoOnly){
        await saveMyProfileChanges({fullName,bio,city,campusName:campus});
        profileSaved=true;
      }
      if(newPhoto){
        await uploadMyAvatar(newPhoto);
        photoSaved=true;
        setNewPhoto(null);
      }
      if(newCover){
        await uploadMyCover(newCover);
        coverSaved=true;
        setNewCover(null);
      }
      // Refresh the profile the student sees after returning from Edit.
      await onSaved?.();
      if(Platform.OS==='android')ToastAndroid.show('Profile saved successfully',ToastAndroid.SHORT);
      else Alert.alert('Profile saved','Your updated details are saved on StudentHood.');
      onBack?.();
    }catch(e){
      const detail=e?.message||'Could not update your profile.';
      if(profileSaved||photoSaved||coverSaved){
        setError('Some changes were saved, but the remaining changes or profile refresh failed: '+detail);
        // Refresh any partial changes, but keep the editor open for retry.
        try{await onSaved?.()}catch{}
      }else{
        setError(detail);
      }
    }finally{setBusy(false)}
  }

  async function searchInstitutions(){
    const cityName=String(city||'').trim();
    const region=String(profile?.country_code||'').trim().toUpperCase();
    setInstitutionError('');
    setInstitutionLoading(true);
    try{
      const rows=await findInstitutionsByCity({city:cityName,countryCode:region});
      setInstitutionRows(rows);
      if(!rows.length)setInstitutionError('No mapped schools, colleges or universities found in this city. Check the city name and try again.');
    }catch(e){
      setInstitutionRows([]);
      setInstitutionError(e?.message||'Could not load the city institution directory.');
    }finally{setInstitutionLoading(false)}
  }

  function openInstitutions(){
    setError('');
    setInstitutionMode('nearby');
    setInstitutionQuery('');
    setInstitutionOpen(true);
    setGlobalRows([]);
    setGlobalError('');
    setGlobalSearched(false);
    globalRequest.current++;
    Keyboard.dismiss();
    if(String(city||'').trim())searchInstitutions();
    else setInstitutionError('Enter a city to browse nearby institutions, or use Country / Worldwide search.');
  }
  function changeInstitutionMode(mode){
    setInstitutionMode(mode);
    setInstitutionQuery('');
    setGlobalRows([]);
    setGlobalError('');
    setGlobalHasMore(false);
    setGlobalSearched(false);
    globalRequest.current++;
  }
  async function searchGlobalInstitutions(nextPage=1){
    const query=institutionQuery.trim();
    if(query.length<3){
      setGlobalError('Enter at least 3 letters of an institution name.');
      return;
    }
    const request=++globalRequest.current;
    setGlobalError('');
    setGlobalSearched(true);
    setGlobalLoading(true);
    try{
      const result=await searchInstitutionsByName({
        query,countryCode:profile?.country_code,scope:institutionMode,page:nextPage
      });
      if(request!==globalRequest.current)return;
      setGlobalRows(existing=>{
        if(nextPage===1)return result.institutions;
        const ids=new Set(existing.map(item=>item.id));
        return [...existing,...result.institutions.filter(item=>!ids.has(item.id))];
      });
      setGlobalPage(nextPage);
      setGlobalHasMore(result.hasMore);
    }catch(e){
      if(request!==globalRequest.current)return;
      if(nextPage===1){setGlobalRows([]);setGlobalHasMore(false);}
      setGlobalError(e?.message||'Global institution directory is unavailable.');
    }finally{
      if(request===globalRequest.current)setGlobalLoading(false);
    }
  }
  const filteredInstitutions=institutionRows.filter(item=>
    String(item?.name||'').toLowerCase().includes(institutionQuery.trim().toLowerCase())
  );

  const imageUri=newPhoto?.uri||avatar;
  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]} behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable onPress={onBack} disabled={busy} accessibilityLabel="Back" style={styles.headerAction}>
        <Feather name="arrow-left" size={22} color={theme.text}/>
      </Pressable>
      <Text style={[styles.headerText,{color:theme.text}]}>{photoOnly?'Profile picture':'Edit profile'}</Text>
      <Pressable onPress={save} disabled={busy} accessibilityRole="button" accessibilityLabel="Save profile changes" accessibilityState={{disabled:busy}} style={[styles.save,{backgroundColor:theme.accent}]}>
        {busy?<ActivityIndicator size="small" color="#fff"/>:<Text style={styles.saveText}>Save</Text>}
      </Pressable>
    </View>
    <ScrollView ref={scrollRef} style={{flex:1}} contentContainerStyle={[styles.content,{paddingBottom:140+keyboardPadding}]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'none'} onLayout={onScrollLayout} onScroll={onScroll} scrollEventThrottle={16} automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} showsVerticalScrollIndicator={false}>
      <Pressable onPress={choosePhoto} accessibilityLabel="Choose profile photo" style={styles.photoControl}>
        <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
          {imageUri?<Image source={{uri:imageUri}} style={styles.avatarImage}/>:<Feather name="user" size={45} color={theme.accent}/>}
        </View>
        <Text style={[styles.photoText,{color:theme.accent}]}>Change profile photo</Text>
        <Text style={[styles.photoHint,{color:theme.muted}]}>JPG, PNG or WebP, up to 5 MB</Text>
      </Pressable>
      {!photoOnly&&<>
        <Pressable onPress={chooseCover} accessibilityRole="button" accessibilityLabel="Choose independent profile cover" style={[styles.coverControl,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          {newCover?.uri||cover?<Image source={{uri:newCover?.uri||cover}} style={styles.coverPreview}/>:<Feather name="image" size={34} color={theme.accent}/>}
          <View style={styles.coverOverlay}><Feather name="camera" size={16} color="#fff"/><Text style={styles.coverOverlayText}>Change cover picture</Text></View>
        </Pressable>
        <Text style={[styles.hint,{color:theme.muted}]}>Your cover picture is separate from your Scenes. JPG, PNG or WebP, up to 5 MB.</Text>
        <LabeledInput label="Full name" value={fullName} onChangeText={setFullName} onFocus={onFieldFocus} theme={theme}/>
        <LabeledInput label="Username" value={profile?.username||''} editable={false} theme={theme}/>
        <Text style={[styles.hint,{color:theme.muted}]}>Your unique username is managed separately from profile details.</Text>
        <LabeledInput label="Bio" value={bio} onChangeText={setBio} multiline maxLength={280} onFocus={onFieldFocus} theme={theme}/>
        <LabeledInput label="City" value={city} onChangeText={value=>{
          if(value!==city){setCampus('');setInstitutionRows([]);}
          setCity(value);
        }} onFocus={onFieldFocus} theme={theme}/>
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldTitle,{color:theme.text}]}>School, college or university</Text>
          <Pressable onPress={openInstitutions}
            accessibilityRole="button" accessibilityLabel="Choose school, college or university from city directory"
            style={[styles.field,{backgroundColor:theme.surface,borderColor:theme.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]}>
            <Text numberOfLines={1} style={{flex:1,color:campus?theme.text:theme.muted,fontSize:14}}>{campus||'Choose from city institutions'}</Text>
            <Feather name="chevron-down" size={18} color={theme.accent}/>
          </Pressable>
        </View>
        <Text style={[styles.hint,{color:theme.muted}]}>Use your official institution name so classmates can find the same campus.</Text>
        <Text style={[styles.hint,{color:theme.muted}]}>Choose your campus status from the transparent slider on Scenes.</Text>
      </>}
      {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}
    </ScrollView>
    <Modal visible={institutionOpen} animationType="slide" presentationStyle="fullScreen"
      statusBarTranslucent={false} navigationBarTranslucent={false}
      onRequestClose={()=>{Keyboard.dismiss();setInstitutionOpen(false)}}>
      {/* A Modal has a separate native root; the app's outer SafeAreaProvider
          does not necessarily supply its status/navigation insets. */}
      <SafeAreaProvider>
        <SafeAreaView edges={['top','right','bottom','left']}
          style={[styles.pickerSafeArea,{backgroundColor:theme.bg}]}>
          {/* Android's resize keyboard mode already reduces this window.
              Combining it with KeyboardAvoidingView height doubles the shrink. */}
          <KeyboardAvoidingView style={styles.root}
            behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={[styles.pickerHeader,{borderBottomColor:theme.line}]}>
          <Pressable onPress={()=>setInstitutionOpen(false)} accessibilityRole="button" accessibilityLabel="Close institution directory" style={styles.headerAction}>
            <Feather name="arrow-left" size={22} color={theme.text}/>
          </Pressable>
          <Text numberOfLines={1} ellipsizeMode="tail"
            style={[styles.pickerHeaderTitle,{color:theme.text}]}>
            {institutionMode==='nearby'?'Institutions near '+(city||'you'):institutionMode==='country'?'Country institutions':'Worldwide institutions'}
          </Text>
          {institutionMode==='nearby'?<Pressable onPress={searchInstitutions} disabled={institutionLoading}
            accessibilityRole="button" accessibilityLabel="Refresh nearby institutions" style={styles.headerAction}>
            {institutionLoading?<ActivityIndicator color={theme.accent}/>:<Feather name="refresh-cw" size={19} color={theme.accent}/>}
          </Pressable>:<View style={styles.headerAction}/>} 
        </View>
        <View style={styles.pickerControls}>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:18}}>
            {institutionMode==='nearby'
              ?'Find actual institutions in your city or surrounding area. Results may be incomplete.'
              :'Search registered higher-education organizations. Individual campus branches and schools may not appear.'}
          </Text>
          <View style={{flexDirection:'row',gap:8,marginTop:12}}>
            {[{id:'nearby',label:'Nearby'},{id:'country',label:'Country'},{id:'worldwide',label:'Worldwide'}].map(mode=>
              <Pressable key={mode.id} accessibilityRole="button" accessibilityState={{selected:institutionMode===mode.id}}
                onPress={()=>changeInstitutionMode(mode.id)}
                style={{flex:1,minHeight:38,borderWidth:1,borderColor:theme.line,borderRadius:11,
                  alignItems:'center',justifyContent:'center',backgroundColor:institutionMode===mode.id?theme.accentSoft:theme.surface}}>
                <Text style={{color:institutionMode===mode.id?theme.accent:theme.muted,fontWeight:'700',fontSize:12}}>{mode.label}</Text>
              </Pressable>)}
          </View>
          <Text style={{color:theme.muted,fontSize:11,marginTop:10}}>
            {institutionMode==='nearby'?'Filter nearby city results.': 'Search higher-education organizations by name. Not every school or physical campus is listed.'}
          </Text>
          <TextInput accessibilityLabel="Search institutions"
            placeholder={institutionMode==='nearby'?'Filter nearby institutions':'Institution name, at least 3 letters'}
            placeholderTextColor={theme.muted}
            value={institutionQuery}
            onChangeText={value=>{setInstitutionQuery(value);if(institutionMode!=='nearby'){setGlobalRows([]);setGlobalSearched(false);setGlobalError('');setGlobalHasMore(false);globalRequest.current++;}}}
            style={[styles.field,{backgroundColor:theme.surface,borderColor:theme.line,color:theme.text,marginTop:12}]}/>
          {institutionMode!=='nearby'&&<Pressable onPress={()=>searchGlobalInstitutions(1)}
            disabled={globalLoading} accessibilityRole="button"
            style={[styles.save,{backgroundColor:theme.accent,marginTop:12}]}>
            <Text style={styles.saveText}>Search {institutionMode==='country'?'country':'worldwide'}</Text>
          </Pressable>}
        </View>
        {(institutionMode==='nearby'?institutionLoading:globalLoading&&globalRows.length===0)?
          <View style={{padding:30,alignItems:'center'}}><ActivityIndicator color={theme.accent}/><Text style={{color:theme.muted,marginTop:12}}>Searching institutions…</Text></View>:
          <ScrollView style={styles.pickerResults} keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerResultsContent}>
            {(institutionMode==='nearby'?filteredInstitutions:globalRows).map(item=><Pressable key={item.id}
              onPress={()=>{setCampus(String(item.name||''));setInstitutionOpen(false);Keyboard.dismiss();}}
              accessibilityRole="button"
              accessibilityLabel={'Choose '+item.name}
              style={{minHeight:62,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.line}}>
              <Feather name="book-open" size={19} color={theme.accent}/>
              <View style={{flex:1}}>
                <Text style={{color:theme.text,fontSize:13,fontWeight:'700'}}>{item.name}</Text>
                <Text style={{color:theme.muted,fontSize:11,marginTop:4}}>{item.type==='university'?'University':item.type==='college'?'College':item.type==='school'?'School':'Institution'}{item.city?' · '+item.city:''}{item.country_code?' · '+item.country_code:''}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.muted}/>
            </Pressable>)}
            {institutionMode==='nearby'&&filteredInstitutions.length===0&&<View style={{padding:24,alignItems:'center',gap:12}}>
              <Text style={{color:theme.muted,textAlign:'center',fontSize:12}}>{institutionError||'No matching nearby institutions. Try country or worldwide.'}</Text>
              <Pressable onPress={searchInstitutions} style={[styles.save,{backgroundColor:theme.accent}]}>
                <Text style={styles.saveText}>Retry city search</Text>
              </Pressable>
            </View>}
            {institutionMode!=='nearby'&&globalRows.length===0&&<Text style={{color:globalError?theme.danger:theme.muted,textAlign:'center',fontSize:12,marginTop:30}}>
              {globalError||(globalSearched?'No matching higher-education organizations found.':'Enter a name and tap Search.')}
            </Text>}
            {institutionMode!=='nearby'&&globalRows.length>0&&globalHasMore&&
              <Pressable disabled={globalLoading} onPress={()=>searchGlobalInstitutions(globalPage+1)}
                accessibilityRole="button" style={[styles.save,{backgroundColor:theme.accent,marginTop:20}]}>
                {globalLoading?<ActivityIndicator color="#fff"/>:<Text style={styles.saveText}>More results</Text>}
              </Pressable>}
            {institutionMode!=='nearby'&&!!globalError&&globalRows.length>0&&
              <Text style={{color:theme.danger,fontSize:12,marginTop:12}}>{globalError}</Text>}
          </ScrollView>}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  </KeyboardAvoidingView>;
}

function LabeledInput({label,theme,multiline=false,...props}){
  return <View style={styles.fieldGroup}>
    <Text style={[styles.fieldTitle,{color:theme.text}]}>{label}</Text>
    <TextInput {...props} multiline={multiline} placeholderTextColor={theme.muted}
      style={[styles.field,{backgroundColor:theme.surface,borderColor:theme.line,color:theme.text},multiline&&styles.bio,props.editable===false&&{opacity:.6}]}/>
  </View>;
}

const styles=StyleSheet.create({
 root:{flex:1},
 pickerSafeArea:{flex:1,width:'100%'},
 pickerHeader:{height:62,width:'100%',maxWidth:760,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderBottomWidth:StyleSheet.hairlineWidth},
 pickerHeaderTitle:{fontSize:17,fontWeight:'800',flex:1,flexShrink:1,includeFontPadding:false},
 pickerControls:{width:'100%',maxWidth:760,alignSelf:'center',paddingHorizontal:16,paddingTop:12,paddingBottom:10},
 pickerResults:{flex:1,width:'100%'},
 pickerResultsContent:{width:'100%',maxWidth:760,alignSelf:'center',paddingHorizontal:16,paddingTop:4,paddingBottom:32},
 header:{height:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:StyleSheet.hairlineWidth},
 headerAction:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 headerText:{fontSize:19,fontWeight:'800'},
 save:{height:38,minWidth:64,borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:12},
 saveText:{fontSize:12,color:'#fff',fontWeight:'800'},
 content:{padding:18,paddingBottom:140,width:'100%',maxWidth:760,alignSelf:'center'},
 coverControl:{height:160,borderRadius:18,borderWidth:1,overflow:'hidden',alignItems:'center',justifyContent:'center',marginTop:10},
 coverPreview:{width:'100%',height:'100%',position:'absolute'},
 coverOverlay:{position:'absolute',bottom:0,left:0,right:0,minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(0,0,0,0.44)'},
 coverOverlayText:{color:'#fff',fontWeight:'800',fontSize:12},
 photoControl:{alignItems:'center',marginVertical:18},
 avatar:{width:108,height:108,borderRadius:54,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 avatarImage:{width:'100%',height:'100%'},
 photoText:{fontSize:13,fontWeight:'800',marginTop:11},
 photoHint:{fontSize:10,marginTop:5},
 fieldGroup:{marginTop:15},
 fieldTitle:{fontSize:12,fontWeight:'800',marginBottom:8},
 field:{borderWidth:1,borderRadius:14,height:49,paddingHorizontal:13,fontSize:14},
 bio:{height:92,textAlignVertical:'top',paddingTop:12},
 hint:{fontSize:10,lineHeight:16,marginTop:7},
 statusChoices:{flexDirection:'row',gap:7},
 status:{flex:1,borderWidth:1,borderRadius:12,paddingVertical:14,alignItems:'center'},
 statusText:{fontSize:10,fontWeight:'800'},
 error:{fontSize:12,marginTop:15}
});
