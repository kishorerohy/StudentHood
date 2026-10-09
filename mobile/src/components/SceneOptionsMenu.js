import React,{useState} from 'react';
import {ActivityIndicator,Alert,Dimensions,Pressable,StyleSheet,Text,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Feather} from '@expo/vector-icons';
import {REPORT_REASONS,deleteOwnScene,reportScene,sceneShareUrl,shareScene} from '../scenes';

// Compact, anchored menu; each control does real work. Reports use the existing
// safety support_requests pipeline, not an unimplemented reporting endpoint.
export default function SceneOptionsMenu({scene,anchor,theme,currentUserId,onClose,onProfile,onHide,onDeleted}){
  const [reporting,setReporting]=useState(false);
  const [busy,setBusy]=useState('');
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  if(!scene)return null;
  const screen=Dimensions.get('screen');
  const width=Math.min(285,screen.width-24);
  const top=Math.max(10,Math.min(screen.height-445,Number(anchor?.y||65)+Number(anchor?.height||38)));
  const left=Math.max(12,Math.min(screen.width-width-12,Number(anchor?.x||screen.width-55)+Number(anchor?.width||35)-width));
  const owned=!!currentUserId&&scene.author_id===currentUserId;

  async function choose(name){
    if(busy)return;
    setError('');
    setFeedback('');
    if(name==='profile'){onClose();onProfile?.(scene.author_id);return;}
    if(name==='hide'){await onHide?.(scene.id);onClose();return;}
    if(name==='delete'){
      Alert.alert('Delete Scene?','This removes your Scene from StudentHood and cannot be undone.',[
        {text:'Cancel',style:'cancel'},
        {text:'Delete',style:'destructive',onPress:()=>remove()}
      ]);
      return;
    }
    setBusy(name);
    try{
      if(name==='copy'){
        await Clipboard.setStringAsync(sceneShareUrl(scene.id));
        setFeedback('Scene link copied.');
      }else if(name==='share'){
        await shareScene(scene.id);
        onClose();
      }
    }catch(e){setError(e?.message||'Could not complete this action.')}
    finally{setBusy('');}
  }
  async function remove(){
    setBusy('delete');
    setError('');
    try{
      await deleteOwnScene(scene.id);
      onDeleted?.(scene.id);
      onClose();
    }catch(e){setError(e?.message||'Could not delete your Scene.');}
    finally{setBusy('');}
  }
  async function sendReport(reason){
    setBusy('report');
    setError('');
    try{
      await reportScene(scene.id,reason);
      setReporting(false);
      setFeedback('Report submitted to StudentHood safety for review.');
    }catch(e){setError(e?.message||'Could not submit report.');}
    finally{setBusy('');}
  }

  const actions=reporting?REPORT_REASONS.map(x=>({label:x,key:x,icon:'flag'})):
    [
      {label:'View creator profile',key:'profile',icon:'user'},
      {label:'Share Scene',key:'share',icon:'share-2'},
      {label:'Copy Scene link',key:'copy',icon:'link-2'},
      {label:'Hide this Scene',key:'hide',icon:'eye-off'},
      ...(!owned?[{label:'Report Scene',key:'report',icon:'flag'}]:[{label:'Delete my Scene',key:'delete',icon:'trash-2'}])
    ];
  return <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
    <Pressable style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.18)'}]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Scene menu"/>
    <View style={[styles.panel,{top,left,width,borderColor:theme.line,backgroundColor:theme.surface}]}>
      <View style={styles.header}>
        <Text style={[styles.heading,{color:theme.text}]}>{reporting?'Why report this Scene?':'Scene options'}</Text>
        <Pressable onPress={reporting?()=>setReporting(false):onClose} accessibilityRole="button" accessibilityLabel={reporting?'Back to options':'Close options'}><Feather name={reporting?'arrow-left':'x'} size={19} color={theme.muted}/></Pressable>
      </View>
      {actions.map(action=><Pressable
        key={action.key} disabled={!!busy} accessibilityRole="button" accessibilityLabel={action.label}
        onPress={()=>reporting?sendReport(action.key):action.key==='report'?setReporting(true):choose(action.key)}
        style={[styles.row,{borderBottomColor:theme.line}]}>
        <Feather name={action.icon} size={17} color={action.key==='delete'?theme.danger:theme.text}/>
        <Text style={[styles.label,{color:action.key==='delete'?theme.danger:theme.text}]}>{action.label}</Text>
        {busy===action.key||busy==='report'&&reporting?<ActivityIndicator color={theme.accent} size="small"/>:<Feather name="chevron-right" size={14} color={theme.muted}/>}
      </Pressable>)}
      {!!feedback&&<Text accessibilityRole="alert" style={[styles.message,{color:theme.accent}]}>{feedback}</Text>}
      {!!error&&<Text accessibilityRole="alert" style={[styles.message,{color:theme.danger}]}>{error}</Text>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  panel:{position:'absolute',borderWidth:1,borderRadius:20,padding:12,
    shadowColor:'#000',shadowOpacity:.25,shadowRadius:18,elevation:16},
  header:{height:37,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8},
  heading:{fontSize:14,fontWeight:'900'},
  row:{flexDirection:'row',minHeight:46,alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:9},
  label:{fontSize:12,fontWeight:'700',flex:1},
  message:{padding:11,fontSize:11,lineHeight:17}
});
