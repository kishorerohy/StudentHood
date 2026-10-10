import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Image,Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {supabase} from '../supabase';

// Private, opt-in review surface. All queue/review/media requests are guarded
// by backend reviewer role, independent adult assurance and storage RLS.
export default function SceneModerationScreen({theme,onBack}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const reload=useCallback(()=>setRefresh(value=>value+1),[]);
  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');
    (async()=>{
      try{
        const {data,error}=await supabase.rpc('studenthood_scene_moderation_queue',{p_limit:40});
        if(error)throw error;
        const result=await Promise.all((data||[]).map(async item=>{
          if(!item.media_url)return {...item,mediaSignedUrl:null};
          const {data:signed}=await supabase.storage.from('scene-media')
            .createSignedUrl(item.media_url,900);
          return {...item,mediaSignedUrl:signed?.signedUrl||null};
        }));
        if(live)setItems(result);
      }catch(e){if(live){setError(e?.message||'Unable to load moderation queue.');setItems([]);}}
      finally{if(live)setLoading(false);}
    })();
    return()=>{live=false};
  },[refresh]);
  function decide(item,decision){
    const label=decision==='approved'?'Approve':decision==='limited'?'Limit':'Remove';
    Alert.alert(label+' Scene?', 'Confirm you reviewed the actual Scene content and its age suitability.',[
      {text:'Cancel',style:'cancel'},
      {text:label,onPress:async()=>{
        if(busy)return;
        setBusy(item.id);setError('');
        try{
          const {error}=await supabase.rpc('studenthood_review_scene',{
            p_scene_id:item.id,p_decision:decision
          });
          if(error)throw error;
          reload();
        }catch(e){setError(e?.message||'Unable to record moderation decision.');}
        finally{setBusy('');}
      }}
    ]);
  }
  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to profile menu" onPress={onBack} style={styles.back}>
        <Feather name="arrow-left" size={22} color={theme.text}/>
      </Pressable>
      <Text style={[styles.heading,{color:theme.text}]}>Scene review</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh moderation queue" onPress={reload} style={styles.back}>
        <Feather name="refresh-cw" size={19} color={theme.accent}/>
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      <Text style={[styles.note,{color:theme.muted}]}>Only authorized adult reviewers can approve Scenes. Review age suitability and content before a decision. Nothing is auto-published.</Text>
      {!!error&&<Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>}
      {loading?<ActivityIndicator color={theme.accent}/>:
        !items.length?<Text style={[styles.note,{color:theme.muted}]}>No pending Scenes or no permitted items.</Text>:
        items.map(item=><View key={item.id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.timestamp,{color:theme.muted}]}>{new Date(item.created_at).toLocaleString()} · {item.content_class} · {item.media_type}</Text>
          {item.media_type==='image'&&item.mediaSignedUrl&&<Image source={{uri:item.mediaSignedUrl}} style={styles.media} resizeMode="contain"/>}
          {item.media_type==='video'&&<Pressable
            onPress={()=>item.mediaSignedUrl?Linking.openURL(item.mediaSignedUrl).catch(()=>setError('Could not open video for review.')):setError('Video is unavailable for review.')}
            accessibilityRole="button" accessibilityLabel="Open video for manual review"
            style={[styles.video,{backgroundColor:theme.surface2}]}>
            <Feather name="play-circle" size={31} color={theme.accent}/>
            <Text style={{color:theme.text,fontWeight:'800'}}>Open original video for review</Text>
          </Pressable>}
          {!!item.body&&<Text style={[styles.body,{color:theme.text}]}>{item.body}</Text>}
          {item.media_url&&!item.mediaSignedUrl&&<Text style={[styles.error,{color:theme.danger}]}>Media is unavailable. Do not approve until it can be reviewed.</Text>}
          <View style={styles.actions}>
            {[
              {name:'Approve',decision:'approved'},
              {name:'Limit',decision:'limited'},
              {name:'Remove',decision:'removed'}
            ].map(action=><Pressable key={action.name}
              disabled={!!busy||!!item.media_url&&!item.mediaSignedUrl}
              onPress={()=>decide(item,action.decision)}
              accessibilityRole="button" accessibilityLabel={action.name+' reviewed Scene'}
              style={[styles.action,{backgroundColor:action.name==='Approve'?theme.accent:theme.surface2,borderColor:theme.line}]}>
              <Text style={{fontSize:11,fontWeight:'800',color:action.name==='Approve'?'#fff':theme.text}}>{action.name}</Text>
            </Pressable>)}
          </View>
        </View>)}
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:64,paddingHorizontal:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1},
  back:{width:42,height:42,alignItems:'center',justifyContent:'center'},
  heading:{fontSize:20,fontWeight:'900'},
  list:{padding:16,paddingBottom:60,gap:16},
  note:{fontSize:12,lineHeight:19},
  error:{fontSize:12,lineHeight:18},
  card:{borderWidth:1,borderRadius:17,padding:16,gap:12},
  timestamp:{fontSize:11},
  media:{height:240,width:'100%'},
  video:{height:130,alignItems:'center',justifyContent:'center',gap:12,borderRadius:13},
  body:{fontSize:14,lineHeight:21},
  actions:{flexDirection:'row',gap:8},
  action:{flex:1,minHeight:40,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'}
});
