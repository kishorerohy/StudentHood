import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Image,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather,FontAwesome5} from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {getSceneSharingPeeps,sendSceneToPeep} from '../api';
import {sceneShareUrl,shareScene} from '../scenes';
import {availableShareApps} from '../shareAvailability';

// Replaces the radial menu with an accessible bottom-up sheet.
// Direct delivery is a verified Scene link inside Ping, never a false claim
// that rich messaging or third-party automatic posting has launched.
export default function SceneShareSheet({scene,theme,profileCountry,onClose}){
  const [peeps,setPeeps]=useState([]);
  const [query,setQuery]=useState('');
  const [apps,setApps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState('');
  useEffect(()=>{
    let live=true;
    Promise.allSettled([getSceneSharingPeeps({limit:60}),availableShareApps(profileCountry)])
      .then(([recipients,installed])=>{
        if(!live)return;
        if(recipients.status==='fulfilled')setPeeps(recipients.value);
        else setError('Peeps are temporarily unavailable. You can still copy the link.');
        if(installed.status==='fulfilled')setApps(installed.value);
      }).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[profileCountry]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return peeps.filter(p=>!q||String(p.full_name||'').toLowerCase().includes(q)||String(p.username||'').toLowerCase().includes(q));
  },[query,peeps]);
  async function deliver(person){
    if(busy)return;
    setBusy(person.id);setError('');setFeedback('');
    try{
      await sendSceneToPeep({sceneId:scene.id,recipientId:person.id});
      setFeedback('Scene link sent to '+(person.full_name||person.username||'your Peep')+' in Ping.');
    }catch(e){setError(e?.message||'Unable to send this Scene. Check its visibility and moderation status.');}
    finally{setBusy('');}
  }
  async function share(action){
    if(busy)return;
    setBusy(action.name);setError('');setFeedback('');
    const url=sceneShareUrl(scene.id);
    try{
      if(action.name==='Copy link'){
        await Clipboard.setStringAsync(url);
        setFeedback('Scene link copied. The recipient must be allowed to view it.');
      }else if(action.name==='Share to…'){
        await shareScene(scene.id);
        setFeedback('Select an app from your device sharing menu.');
      }else if(action.name==='WhatsApp'){
        await Linking.openURL('whatsapp://send?text='+encodeURIComponent('View this Scene on StudentHood: '+url));
      }else{
        await Clipboard.setStringAsync(url);
        await Linking.openURL(action.scheme);
        setFeedback('Scene link copied. Paste it in '+action.name+' wherever links are supported.');
      }
    }catch(e){setError(e?.message||'Unable to open this app. Use Copy link or Share to….');}
    finally{setBusy('');}
  }
  const choices=[
    {name:'Copy link',icon:'link-2'},
    {name:'Share to…',icon:'share-2'},
    ...apps.map(app=>({...app,icon:app.name==='Instagram'?'instagram':app.name==='TikTok'?'tiktok':'whatsapp'}))
  ];
  return <View style={styles.overlay} accessibilityViewIsModal>
    <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Scene sharing"/>
    <View style={[styles.sheet,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.grip,{backgroundColor:theme.muted}]}/>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text style={[styles.heading,{color:theme.text}]}>Share Scene</Text>
          <Text style={[styles.subtitle,{color:theme.muted}]}>Send to Peeps or share a private-aware link</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sharing" style={[styles.close,{backgroundColor:theme.surface2}]}>
          <Feather name="x" size={20} color={theme.text}/>
        </Pressable>
      </View>
      <View style={[styles.search,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
        <Feather name="search" size={18} color={theme.muted}/>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search Peeps" placeholderTextColor={theme.muted}
          autoCapitalize="none" accessibilityLabel="Search mutual Peeps" style={[styles.searchInput,{color:theme.text}]}/>
        {!!query&&<Pressable onPress={()=>setQuery('')} accessibilityLabel="Clear search"><Feather name="x" size={17} color={theme.muted}/></Pressable>}
      </View>
      <Text style={[styles.label,{color:theme.text}]}>Your Peeps</Text>
      <ScrollView style={styles.peepsScroll} contentContainerStyle={styles.peeps} keyboardShouldPersistTaps="handled">
        {loading?<ActivityIndicator size="small" color={theme.accent}/>:
          filtered.length===0?<Text style={[styles.empty,{color:theme.muted}]}>{query?'No matching Peeps.':'Accepted Peeps will appear here. Direct Scene sharing is available to eligible mutual Peeps.'}</Text>:
          filtered.map(person=><Pressable key={person.id} disabled={!!busy} onPress={()=>deliver(person)}
            accessibilityRole="button" accessibilityLabel={'Send Scene to '+(person.full_name||person.username||'Peep')}
            style={styles.peep}>
            <View style={[styles.avatar,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
              {person.avatar_url?<Image source={{uri:person.avatar_url}} style={styles.avatarImage}/>:
                <Feather name="user" size={23} color={theme.accent}/>}
              {busy===person.id&&<View style={styles.avatarBusy}><ActivityIndicator color="#fff" size="small"/></View>}
            </View>
            <Text numberOfLines={1} style={[styles.peepLabel,{color:theme.text}]}>{person.full_name?.split(' ')[0]||person.username||'Peep'}</Text>
          </Pressable>)}
      </ScrollView>
      <View style={[styles.separator,{backgroundColor:theme.line}]}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
        {choices.map(action=><Pressable key={action.name} disabled={!!busy} onPress={()=>share(action)} accessibilityRole="button"
          accessibilityLabel={action.name==='Share to…'?'Open native sharing menu':action.name}
          style={styles.choice}>
          <View style={[styles.choiceIcon,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
            {busy===action.name?<ActivityIndicator color={theme.accent} size="small"/>:
              action.name==='Instagram'||action.name==='TikTok'||action.name==='WhatsApp'?
                <FontAwesome5 name={action.icon} color={theme.text} size={21}/>:
                <Feather name={action.icon} color={theme.text} size={21}/>}
          </View>
          <Text style={[styles.choiceName,{color:theme.text}]}>{action.name}</Text>
        </Pressable>)}
      </ScrollView>
      {!!feedback&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.accent}]}>{feedback}</Text>}
      {!!error&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.danger}]}>{error}</Text>}
      <Text style={[styles.privacy,{color:theme.muted}]}>Private Scenes remain restricted by StudentHood visibility and age rules. Only installed, region-permitted apps appear above.</Text>
    </View>
  </View>;
}
const styles=StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:110,justifyContent:'flex-end'},
  scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.58)'},
  sheet:{borderWidth:1,borderBottomWidth:0,borderTopLeftRadius:27,borderTopRightRadius:27,paddingHorizontal:18,paddingTop:10,paddingBottom:Platform.OS==='ios'?36:26,maxHeight:'89%'},
  grip:{height:4,width:43,borderRadius:8,opacity:0.48,alignSelf:'center',marginBottom:15},
  header:{flexDirection:'row',alignItems:'center',gap:15,marginBottom:15},
  heading:{fontSize:22,fontWeight:'900'},subtitle:{fontSize:11,marginTop:4},
  close:{width:37,height:37,borderRadius:19,alignItems:'center',justifyContent:'center'},
  search:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderRadius:15,paddingHorizontal:12,marginBottom:17},
  searchInput:{height:45,flex:1,fontSize:14},
  label:{fontSize:13,fontWeight:'800',marginBottom:12},
  peepsScroll:{maxHeight:250,minHeight:94},
  peeps:{flexDirection:'row',flexWrap:'wrap',columnGap:10,rowGap:15,paddingBottom:8,alignItems:'flex-start'},
  peep:{width:71,alignItems:'center',gap:5},
  avatar:{width:59,height:59,borderRadius:30,borderWidth:1,overflow:'hidden',alignItems:'center',justifyContent:'center'},
  avatarImage:{width:'100%',height:'100%'},
  avatarBusy:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,.35)'},
  peepLabel:{fontSize:10,fontWeight:'700',textAlign:'center',width:'100%'},
  empty:{fontSize:11,lineHeight:17,paddingVertical:17,textAlign:'center',width:'100%'},
  separator:{height:1,marginTop:18,marginBottom:13},
  actions:{gap:14,paddingBottom:5},
  choice:{width:71,alignItems:'center',gap:7},
  choiceIcon:{height:52,width:52,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},
  choiceName:{fontSize:10,fontWeight:'700',textAlign:'center'},
  feedback:{fontSize:11,lineHeight:16,marginTop:13,textAlign:'center'},
  privacy:{fontSize:10,lineHeight:15,textAlign:'center',marginTop:15}
});
