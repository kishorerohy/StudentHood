import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {getAvatarDisplayUrl,saveMyProfileChanges,uploadMyAvatar} from '../api';

export default function EditProfileScreen({theme,profile,onBack,onSaved,photoOnly=false}){
  const [fullName,setFullName]=useState(profile?.full_name||'');
  const [bio,setBio]=useState(profile?.bio||'');
  const [city,setCity]=useState(profile?.city||'');
  const [campus,setCampus]=useState(profile?.campus_name||'');
  const [presence,setPresence]=useState(profile?.campus_presence||'not_shared');
  const [avatar,setAvatar]=useState(null);
  const [newPhoto,setNewPhoto]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    getAvatarDisplayUrl(profile?.avatar_url).then(url=>{if(active)setAvatar(url)}).catch(()=>{});
    return()=>{active=false};
  },[profile?.avatar_url]);

  useEffect(()=>{if(photoOnly&&!newPhoto)choosePhoto()},[photoOnly]);

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
    setBusy(true);
    setError('');
    try{
      if(!photoOnly) await saveMyProfileChanges({fullName,bio,city,campusName:campus,campusPresence:presence});
      if(newPhoto) await uploadMyAvatar(newPhoto);
      await onSaved?.();
      onBack?.();
    }catch(e){
      setError(e?.message||'Could not update your profile.');
    }finally{setBusy(false)}
  }

  const imageUri=newPhoto?.uri||avatar;
  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable onPress={onBack} disabled={busy} accessibilityLabel="Back" style={styles.headerAction}>
        <Feather name="arrow-left" size={22} color={theme.text}/>
      </Pressable>
      <Text style={[styles.headerText,{color:theme.text}]}>{photoOnly?'Profile picture':'Edit profile'}</Text>
      <Pressable onPress={save} disabled={busy} accessibilityRole="button" style={[styles.save,{backgroundColor:theme.accent}]}>
        {busy?<ActivityIndicator size="small" color="#fff"/>:<Text style={styles.saveText}>Save</Text>}
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={choosePhoto} accessibilityLabel="Choose profile photo" style={styles.photoControl}>
        <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
          {imageUri?<Image source={{uri:imageUri}} style={styles.avatarImage}/>:<Feather name="user" size={45} color={theme.accent}/>}
        </View>
        <Text style={[styles.photoText,{color:theme.accent}]}>Change profile photo</Text>
        <Text style={[styles.photoHint,{color:theme.muted}]}>JPG, PNG or WebP, up to 5 MB</Text>
      </Pressable>
      {!photoOnly&&<>
        <LabeledInput label="Full name" value={fullName} onChangeText={setFullName} theme={theme}/>
        <LabeledInput label="Username" value={profile?.username||''} editable={false} theme={theme}/>
        <Text style={[styles.hint,{color:theme.muted}]}>Your unique username is managed separately from profile details.</Text>
        <LabeledInput label="Bio" value={bio} onChangeText={setBio} multiline maxLength={280} theme={theme}/>
        <LabeledInput label="City" value={city} onChangeText={setCity} theme={theme}/>
        <LabeledInput label="School, college or university" value={campus} onChangeText={setCampus} theme={theme}/>
        <Text style={[styles.hint,{color:theme.muted}]}>Use your official institution name so classmates can find the same campus.</Text>
        <Text style={[styles.fieldTitle,{color:theme.text}]}>Campus status</Text>
        <View style={styles.statusChoices}>
          {[
            ['on_campus','On campus'],
            ['off_campus','Off campus'],
            ['not_shared','Not shared']
          ].map(([value,label])=><Pressable key={value} onPress={()=>setPresence(value)} accessibilityState={{selected:presence===value}} style={[styles.status,{backgroundColor:presence===value?theme.accentSoft:theme.surface,borderColor:presence===value?theme.accent:theme.line}]}>
            <Text style={[styles.statusText,{color:theme.text}]}>{label}</Text>
          </Pressable>)}
        </View>
        <Text style={[styles.hint,{color:theme.muted}]}>This is a manual indicator, not live GPS tracking.</Text>
      </>}
      {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}
    </ScrollView>
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
 header:{height:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:StyleSheet.hairlineWidth},
 headerAction:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 headerText:{fontSize:19,fontWeight:'800'},
 save:{height:38,minWidth:64,borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:12},
 saveText:{fontSize:12,color:'#fff',fontWeight:'800'},
 content:{padding:18,paddingBottom:60,width:'100%',maxWidth:760,alignSelf:'center'},
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
