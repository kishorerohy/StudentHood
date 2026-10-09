import React,{useState} from 'react';
import {ActivityIndicator,Linking,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Feather,FontAwesome5} from '@expo/vector-icons';
import {sceneShareUrl,shareScene} from '../scenes';

// StudentHood owns the order of this transparent panel. The native chooser
// cannot be rearranged to place specific third-party apps first.
// Instagram/TikTok receive a copied permalink; no post is made on the user's
// behalf. The full native chooser remains available under More apps.
export default function SceneSharePanel({scene,theme,onClose}){
  const [busy,setBusy]=useState(null);
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');

  if(!scene)return null;
  const url=sceneShareUrl(scene.id);

  async function social(destination){
    if(busy)return;
    setBusy(destination);
    setFeedback('');
    setError('');
    try{
      if(destination==='WhatsApp'){
        const text='View this Scene on StudentHood: '+url;
        // Try installed WhatsApp first. If it is unavailable, let the browser
        // hand off via the official universal HTTPS URL.
        try{
          await Linking.openURL('whatsapp://send?text='+encodeURIComponent(text));
        }catch{
          await Linking.openURL('https://api.whatsapp.com/send?text='+encodeURIComponent(text));
        }
        setFeedback('WhatsApp opened with the Scene link. You choose whether to send it.');
      }else if(destination==='Instagram'||destination==='TikTok'){
        await Clipboard.setStringAsync(url);
        setFeedback('Scene link copied. Paste it in '+destination+' wherever links are supported.');
        // Neither app offers a universal direct API for posting arbitrary URLs.
        // Never claim that an image, video, or link was posted automatically.
        if(destination==='Instagram'){
          try{await Linking.openURL('instagram://app')}
          catch{await Linking.openURL('https://www.instagram.com/')}
        }else{
          await Linking.openURL('https://www.tiktok.com/');
        }
      }else if(destination==='Copy link'){
        await Clipboard.setStringAsync(url);
        setFeedback('Scene link copied to clipboard.');
      }else if(destination==='More apps'){
        await shareScene(scene.id);
        setFeedback('Choose an app in your device sharing menu.');
      }
    }catch(e){
      setError(e?.message||'Unable to open sharing. Please try More apps or Copy link.');
    }finally{setBusy(null);}
  }

  const choices=[
    {name:'Instagram',icon:'instagram',brand:true,label:'Copy link & open Instagram'},
    {name:'TikTok',icon:'tiktok',brand:true,label:'Copy link & open TikTok'},
    {name:'WhatsApp',icon:'whatsapp',brand:true,label:'Open WhatsApp with link'},
    {name:'More apps',icon:'share-2',label:'Device sharing options'}
  ];

  return <View style={styles.overlay} accessibilityViewIsModal>
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close share options"/>
    <View style={[styles.sheet,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.grip,{backgroundColor:theme.muted}]}/>
      <View style={styles.heading}>
        <View style={{flex:1}}>
          <Text style={[styles.title,{color:theme.text}]}>Share Scene</Text>
          <Text style={[styles.subtitle,{color:theme.muted}]}>Share a link, not private Scene media.</Text>
        </View>
        <Pressable style={[styles.close,{backgroundColor:theme.surface2}]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sharing">
          <Feather name="x" size={19} color={theme.text}/>
        </Pressable>
      </View>
      <View style={styles.priority}>
        {choices.map((item,index)=><Pressable
          key={item.name} disabled={busy!==null}
          accessibilityRole="button" accessibilityLabel={item.label}
          onPress={()=>social(item.name)}
          style={[styles.choice,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
          <View style={[styles.iconWrap,{backgroundColor:theme.isLight?'#FFFFFF':'rgba(255,255,255,0.07)'}]}>
            {busy===item.name?<ActivityIndicator size="small" color={theme.accent}/>:
              item.brand?<FontAwesome5 name={item.icon} size={22} color={theme.text}/>:<Feather name={item.icon} size={22} color={theme.text}/>}
          </View>
          <Text style={[styles.choiceLabel,{color:theme.text}]}>{item.name}</Text>
          {index<2&&<Text style={[styles.helper,{color:theme.muted}]}>Link</Text>}
        </Pressable>)}
      </View>
      <Pressable onPress={()=>social('Copy link')} disabled={busy!==null}
        accessibilityRole="button" accessibilityLabel="Copy Scene link"
        style={[styles.copy,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
        <Feather name="link-2" size={17} color={theme.accent}/>
        <Text style={[styles.copyText,{color:theme.text}]}>Copy Scene link</Text>
        <Feather name="copy" size={16} color={theme.muted}/>
      </Pressable>
      {!!feedback&&<Text accessibilityRole="alert" style={[styles.result,{color:theme.muted}]}>{feedback}</Text>}
      {!!error&&<Text accessibilityRole="alert" style={[styles.result,{color:theme.danger}]}>{error}</Text>}
      <Text style={[styles.privacy,{color:theme.muted}]}>Only permitted StudentHood accounts can view a restricted Scene. Instagram and TikTok require you to paste the copied link manually.</Text>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:99,justifyContent:'flex-end'},
  backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.55)'},
  sheet:{borderWidth:1,borderBottomWidth:0,borderTopLeftRadius:27,borderTopRightRadius:27,padding:16,paddingBottom:Platform.OS==='ios'?36:24},
  grip:{height:4,width:43,borderRadius:99,opacity:0.55,alignSelf:'center',marginBottom:18},
  heading:{flexDirection:'row',alignItems:'center',gap:13,marginBottom:18},
  title:{fontWeight:'900',fontSize:21},
  subtitle:{fontSize:11,marginTop:5},
  close:{height:34,width:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  priority:{flexDirection:'row',gap:7,justifyContent:'space-between'},
  choice:{flex:1,alignItems:'center',gap:7,paddingVertical:12,borderRadius:15,borderWidth:1,minWidth:0},
  iconWrap:{height:42,width:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  choiceLabel:{fontSize:10,fontWeight:'800',textAlign:'center'},
  helper:{fontSize:9},
  copy:{flexDirection:'row',gap:9,alignItems:'center',borderRadius:15,borderWidth:1,minHeight:48,paddingHorizontal:14,marginTop:15},
  copyText:{flex:1,fontWeight:'800',fontSize:12},
  result:{fontSize:11,lineHeight:16,marginTop:12,textAlign:'center'},
  privacy:{fontSize:10,lineHeight:16,marginTop:15,textAlign:'center'}
});
