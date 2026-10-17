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
  const [reports,setReports]=useState([]);
  const [reportBusy,setReportBusy]=useState('');
  const [reportError,setReportError]=useState('');
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
    supabase.rpc('studenthood_content_report_queue',{p_limit:50})
      .then(({data,error})=>{
        if(error)throw error;
        if(live)setReports((data||[]).filter(item=>item.content_kind!=='scene'));
      })
      .catch(e=>{if(live){setReportError(e?.message||'Unable to load other reported content.');setReports([])}});
    return()=>{live=false};
  },[refresh]);
  function decideReported(item,action){
    if(reportBusy||item.summary?.includes('[Pulse media: inspect securely]'))return;
    Alert.alert(action==='remove'?'Remove reported content?':'Keep reported content?',
      'Review the reported content and context before deciding. This action is logged and resolves open reports.',
      [{text:'Cancel',style:'cancel'},{text:action==='remove'?'Remove':'Keep',
      style:action==='remove'?'destructive':'default',onPress:async()=>{
        setReportBusy(item.report_id);setReportError('');
        try{
          const {error}=await supabase.rpc('studenthood_decide_content_report',{
            p_report_id:item.report_id,p_action:action
          });
          if(error)throw error;
          reload();
        }catch(e){setReportError(e?.message||'Could not resolve the report.');}
        finally{setReportBusy('');}
      }}]);
  }
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
      <Text style={[styles.note,{color:theme.muted}]}>Scenes and student creations publish without routine preapproval. Only reported or previously flagged content appears here for adult safety review. Review evidence before restricting a student.</Text>
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
      <Text style={[styles.heading,{color:theme.text,marginTop:15}]}>Other reported creations</Text>
      {!!reportError&&<Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{reportError}</Text>}
      {!reports.length&&<Text style={[styles.note,{color:theme.muted}]}>No other open content reports.</Text>}
      {reports.map(item=><View key={item.report_id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.timestamp,{color:theme.muted}]}>{item.content_kind} · {new Date(item.reported_at).toLocaleString()}</Text>
        <Text style={[styles.body,{color:theme.text}]}>{item.summary||'Content unavailable'}</Text>
        <Text style={[styles.note,{color:theme.muted}]}>Reported for: {item.reason}</Text>
        {item.summary?.includes('[Pulse media: inspect securely]')?
          <Text style={[styles.error,{color:theme.danger}]}>Media must be inspected securely before a decision.</Text>:
          <View style={styles.actions}>
            {['keep','remove'].map(action=><Pressable key={action} disabled={!!reportBusy}
              accessibilityRole="button" onPress={()=>decideReported(item,action)}
              style={[styles.action,{backgroundColor:action==='keep'?theme.accent:theme.surface2,borderColor:theme.line}]}>
              <Text style={{fontWeight:'800',fontSize:11,color:action==='keep'?'#fff':theme.text}}>
                {action==='keep'?'Keep content':'Remove content'}
              </Text>
            </Pressable>)}
          </View>}
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
