import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {addSceneComment,fetchSceneComments} from '../scenes';
import {supabase} from '../supabase';

// Shown as a full-height in-app conversation panel. Reads/writes are subject to
// Supabase RLS; pending comments are visible only to their own authors.
export default function SceneCommentsPanel({scene,theme,onClose,onSent}){
  const [rows,setRows]=useState([]);
  const [text,setText]=useState('');
  const [myId,setMyId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState('');

  const load=useCallback(async()=>{
    if(!scene?.id)return;
    setLoading(true);
    setError('');
    try{
      const [result,account]=await Promise.all([fetchSceneComments(scene.id),supabase.auth.getUser()]);
      setRows(result||[]);
      setMyId(account?.data?.user?.id||null);
    }catch(e){
      setError(e?.message||'Could not load comments.');
    }finally{setLoading(false)}
  },[scene?.id]);
  useEffect(()=>{setText('');setFeedback('');load()},[load]);

  async function send(){
    const body=text.trim();
    if(sending||!body)return;
    if(body.length>1000){setError('Comments can be up to 1,000 characters.');return;}
    setSending(true);
    setFeedback('');
    setError('');
    try{
      const saved=await addSceneComment(scene.id,body);
      if(!saved?.id)throw new Error('Unable to confirm the saved comment.');
      setText('');
      // A newly submitted comment may need moderation before everyone sees it.
      setFeedback(saved.moderation_status==='approved'
        ?'Comment posted.'
        :'Comment saved. It will be visible to others after moderation.');
      await load();
      onSent?.(scene.id,saved);
    }catch(e){setError(e?.message||'Could not add your comment.');}
    finally{setSending(false);}
  }

  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close comments" style={[styles.close,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name="arrow-left" color={theme.text} size={21}/>
      </Pressable>
      <View style={styles.titleArea}>
        <Text style={[styles.title,{color:theme.text}]}>Comments</Text>
        <Text style={[styles.subtitle,{color:theme.muted}]} numberOfLines={1}>Scene by {scene?.author_name||scene?.author_username||'Student'}</Text>
      </View>
      <Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Refresh comments" style={styles.refresh}>
        <Feather name="refresh-cw" size={18} color={theme.muted}/>
      </Pressable>
    </View>
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
      {loading?<View style={styles.state}><ActivityIndicator color={theme.accent}/><Text style={[styles.small,{color:theme.muted}]}>Loading comments…</Text></View>:
        rows.length===0?<View style={styles.state}>
          <Feather name="message-circle" size={32} color={theme.accent}/>
          <Text style={[styles.emptyTitle,{color:theme.text}]}>Start the conversation</Text>
          <Text style={[styles.small,{color:theme.muted}]}>Be the first to comment on this Scene.</Text>
        </View>:
        rows.map(item=>{
          const mine=item.user_id===myId;
          const pending=!['approved','limited'].includes(item.moderation_status);
          return <View key={item.id} style={[styles.comment,{borderColor:theme.line,backgroundColor:theme.surface}]}>
            <View style={[styles.initial,{backgroundColor:theme.surface2}]}><Feather name="user" size={17} color={theme.muted}/></View>
            <View style={{flex:1,gap:5}}>
              <View style={styles.metaLine}>
                <Text style={[styles.author,{color:theme.text}]}>{mine?'You':'Student'}</Text>
                {!!pending&&<Text style={[styles.pending,{color:theme.accent}]}>Pending review</Text>}
                <Text style={[styles.time,{color:theme.muted}]}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.body,{color:theme.text}]}>{item.body}</Text>
            </View>
          </View>;
        })}
      {!!error&&<Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>}
      {!!feedback&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.muted}]}>{feedback}</Text>}
    </ScrollView>
    <View style={[styles.composer,{backgroundColor:theme.bg,borderTopColor:theme.line}]}>
      <TextInput
        value={text} onChangeText={setText} placeholder="Add a comment…"
        placeholderTextColor={theme.muted} multiline maxLength={1000}
        accessibilityLabel="Write a Scene comment"
        style={[styles.input,{color:theme.text,backgroundColor:theme.surface,borderColor:theme.line}]}/>
      <Pressable onPress={send} disabled={sending||!text.trim()} accessibilityRole="button"
        accessibilityLabel="Post comment" accessibilityState={{disabled:sending||!text.trim()}}
        style={[styles.send,{backgroundColor:theme.accent,opacity:sending||!text.trim()?0.45:1}]}>
        {sending?<ActivityIndicator color="#fff" size="small"/>:<Feather name="arrow-up" color="#fff" size={22}/>}
      </Pressable>
    </View>
    <Text style={[styles.hint,{color:theme.muted}]}>Comments follow StudentHood moderation and age restrictions.</Text>
  </KeyboardAvoidingView>;
}
const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:72,flexDirection:'row',alignItems:'center',paddingHorizontal:15,gap:12,borderBottomWidth:StyleSheet.hairlineWidth},
  close:{height:43,width:43,borderWidth:1,borderRadius:14,alignItems:'center',justifyContent:'center'},
  titleArea:{flex:1},
  title:{fontSize:20,fontWeight:'900'},
  subtitle:{fontSize:11,marginTop:4},
  refresh:{padding:12},
  list:{flex:1},
  listContent:{padding:16,paddingBottom:35,gap:11},
  state:{minHeight:180,alignItems:'center',justifyContent:'center',gap:12},
  emptyTitle:{fontSize:17,fontWeight:'800'},
  small:{fontSize:12,textAlign:'center'},
  comment:{flexDirection:'row',alignItems:'flex-start',gap:10,borderWidth:1,borderRadius:18,padding:13},
  initial:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  metaLine:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
  author:{fontSize:12,fontWeight:'800'},
  pending:{fontSize:10,fontWeight:'700'},
  time:{fontSize:10,marginLeft:'auto'},
  body:{fontSize:13,lineHeight:20},
  error:{fontSize:12,lineHeight:18},
  feedback:{fontSize:12,lineHeight:18},
  composer:{minHeight:75,padding:12,flexDirection:'row',gap:9,alignItems:'flex-end',borderTopWidth:StyleSheet.hairlineWidth},
  input:{flex:1,maxHeight:120,minHeight:49,borderWidth:1,borderRadius:18,paddingHorizontal:14,paddingVertical:11,fontSize:14},
  send:{height:49,width:49,borderRadius:17,alignItems:'center',justifyContent:'center'},
  hint:{fontSize:10,textAlign:'center',paddingBottom:12}
});
