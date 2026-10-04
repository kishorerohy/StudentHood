import React,{useState} from 'react';
import {
  ActivityIndicator,Image,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Feather} from '@expo/vector-icons';
import {createScene} from '../scenes';

export default function CreateSceneSheet({visible,onClose,onCreated,theme}){
  const [body,setBody]=useState('');
  const [asset,setAsset]=useState(null);
  const [visibility,setVisibility]=useState('campus');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function chooseMedia(){
    setError('');
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){
      setError('Allow photo library access to add an image or video.');
      return;
    }
    const result=await ImagePicker.launchImageLibraryAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.All,
      quality:0.9,
      videoMaxDuration:60,
      allowsMultipleSelection:false
    });
    if(!result.canceled&&result.assets?.[0]) setAsset(result.assets[0]);
  }

  async function publish(){
    if(!body.trim()&&!asset?.uri){
      setError('Add some text, a photo or a video.');
      return;
    }
    setBusy(true);
    setError('');
    try{
      const scene=await createScene({body,asset,visibility});
      setBody('');
      setAsset(null);
      setVisibility('campus');
      onCreated?.(scene);
      onClose();
    }catch(e){
      setError(e?.message||'Could not post your Scene.');
    }finally{
      setBusy(false);
    }
  }

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.root,{backgroundColor:theme.bg}]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={[styles.iconBtn,{backgroundColor:theme.surface}]}><Feather name="x" size={21} color={theme.text}/></Pressable>
        <Text style={[styles.title,{color:theme.text}]}>New Scene</Text>
        <Pressable onPress={publish} disabled={busy} style={[styles.post,{backgroundColor:theme.accent,opacity:busy?0.6:1}]}>
          {busy?<ActivityIndicator color="#fff" size="small"/>:<Text style={styles.postText}>Post</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={1200}
          placeholder="What's happening?"
          placeholderTextColor={theme.muted}
          style={[styles.composer,{backgroundColor:theme.surface,borderColor:theme.line,color:theme.text}]}
        />

        {asset?.uri&&<View style={[styles.preview,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          {asset.type==='image'?<Image source={{uri:asset.uri}} style={styles.previewImage}/>:<View style={styles.videoPreview}><Feather name="play-circle" size={44} color={theme.accent}/><Text style={[styles.videoText,{color:theme.text}]}>Video selected</Text></View>}
          <Pressable onPress={()=>setAsset(null)} style={styles.remove}><Feather name="x" size={18} color="#fff"/></Pressable>
        </View>}

        <Pressable onPress={chooseMedia} style={[styles.mediaButton,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="image" size={20} color={theme.accent}/>
          <View style={{flex:1}}><Text style={[styles.mediaTitle,{color:theme.text}]}>Add photo or video</Text><Text style={[styles.mediaCopy,{color:theme.muted}]}>Images and videos up to 100 MB</Text></View>
          <Feather name="chevron-right" size={18} color={theme.muted}/>
        </Pressable>

        <Text style={[styles.label,{color:theme.muted}]}>WHO CAN SEE THIS</Text>
        <View style={styles.visibilityRow}>
          {[
            ['peeps','users','Peeps'],
            ['campus','book-open','Campus'],
            ['public','globe','Public']
          ].map(([value,icon,label])=><Pressable key={value} onPress={()=>setVisibility(value)} style={[styles.visibility,{backgroundColor:visibility===value?theme.accentSoft:theme.surface,borderColor:visibility===value?theme.accent:theme.line}]}>
            <Feather name={icon} size={17} color={visibility===value?theme.accent:theme.muted}/>
            <Text style={[styles.visibilityText,{color:visibility===value?theme.accent:theme.text}]}>{label}</Text>
          </Pressable>)}
        </View>

        <View style={[styles.safety,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <Feather name="shield" size={18} color={theme.accent}/>
          <Text style={[styles.safetyText,{color:theme.muted}]}>New and edited Scenes go through StudentHood moderation before broader distribution. Teen safety rules are enforced by the server.</Text>
        </View>

        {!!error&&<Text style={[styles.error,{color:theme.danger}]}>{error}</Text>}
      </ScrollView>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:66,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
  iconBtn:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  title:{fontSize:18,fontWeight:'800'},
  post:{minWidth:64,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:14},
  postText:{color:'#fff',fontSize:11,fontWeight:'900'},
  content:{padding:16,paddingBottom:40},
  composer:{minHeight:160,borderWidth:1,borderRadius:18,padding:16,fontSize:17,textAlignVertical:'top'},
  preview:{marginTop:12,borderWidth:1,borderRadius:18,overflow:'hidden',position:'relative'},
  previewImage:{width:'100%',height:320},
  videoPreview:{height:220,alignItems:'center',justifyContent:'center',gap:8},
  videoText:{fontSize:12,fontWeight:'800'},
  remove:{position:'absolute',right:10,top:10,width:32,height:32,borderRadius:16,backgroundColor:'rgba(0,0,0,.65)',alignItems:'center',justifyContent:'center'},
  mediaButton:{minHeight:68,borderWidth:1,borderRadius:16,marginTop:12,padding:14,flexDirection:'row',alignItems:'center',gap:11},
  mediaTitle:{fontSize:12,fontWeight:'800'},
  mediaCopy:{fontSize:9,marginTop:3},
  label:{fontSize:9,fontWeight:'900',letterSpacing:1.4,marginTop:20,marginBottom:8},
  visibilityRow:{flexDirection:'row',gap:8},
  visibility:{flex:1,height:48,borderWidth:1,borderRadius:14,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},
  visibilityText:{fontSize:10,fontWeight:'800'},
  safety:{borderWidth:1,borderRadius:15,padding:13,marginTop:18,flexDirection:'row',gap:10},
  safetyText:{flex:1,fontSize:10,lineHeight:15},
  error:{fontSize:11,lineHeight:16,marginTop:12}
});
