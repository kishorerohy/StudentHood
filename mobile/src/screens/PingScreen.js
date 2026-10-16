import React,{useCallback,useEffect,useState} from 'react';
import {
  ActivityIndicator,Image,Keyboard,KeyboardAvoidingView,Platform,
  Pressable,ScrollView,StyleSheet,Text,TextInput,View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {
  decidePingRequest,getCampusPeeps,getPingMessages,getPingSceneInbox,
  getPingThreads,getSceneSharingPeeps,sendPingText
} from '../api';

const TABS=['All','Peeps','Requests','Hang Chats','Crew Chats'];

function ProfileIcon({uri,theme,size=44}){
  return <View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',
    backgroundColor:theme.surface2,alignItems:'center',justifyContent:'center'}}>
    {uri?<Image source={{uri}} style={{width:size,height:size}}/>:
      <Feather name="user" size={Math.floor(size/2)} color={theme.accent}/>}
  </View>;
}

export default function PingScreen({theme,profile,onBack,onOpenProfile,onOpenScene,pingTarget=null}){
  const [tab,setTab]=useState('All');
  const [mode,setMode]=useState('list');
  const [selected,setSelected]=useState(null);
  const [target,setTarget]=useState(null);
  const [composeQuery,setComposeQuery]=useState('');
  const [contacts,setContacts]=useState([]);
  const [contactsLoading,setContactsLoading]=useState(false);
  const [threads,setThreads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [messages,setMessages]=useState([]);
  const [messagesLoading,setMessagesLoading]=useState(false);
  const [messageText,setMessageText]=useState('');
  const [working,setWorking]=useState(false);
  const [sceneShares,setSceneShares]=useState([]);
  const [sceneSharesError,setSceneSharesError]=useState('');

  const refreshThreads=useCallback(async(silent=false)=>{
    if(!silent)setLoading(true);
    try{
      const rows=await getPingThreads({limit:80});
      setThreads(rows);
      // Refresh a currently open conversation when the other student accepts.
      setSelected(current=>current?(rows.find(item=>item.id===current.id)||current):current);
      setError('');
      return rows;
    }catch(e){
      if(!silent)setError(e?.message||'Could not load your Pings.');
      return null;
    }finally{if(!silent)setLoading(false)}
  },[]);

  const refreshMessages=useCallback(async(id,silent=false)=>{
    if(!id)return;
    if(!silent)setMessagesLoading(true);
    try{
      const rows=await getPingMessages(id,{limit:150});
      setMessages(rows);
      if(!silent)setError('');
    }catch(e){if(!silent)setError(e?.message||'Could not load messages.');}
    finally{if(!silent)setMessagesLoading(false)}
  },[]);

  useEffect(()=>{
    refreshThreads();
    const interval=setInterval(()=>refreshThreads(true),12000);
    return()=>clearInterval(interval);
  },[refreshThreads]);

  useEffect(()=>{
    if(!selected?.id||mode!=='thread')return;
    refreshMessages(selected.id);
    const interval=setInterval(()=>refreshMessages(selected.id,true),10000);
    return()=>clearInterval(interval);
  },[selected?.id,mode,refreshMessages]);

  useEffect(()=>{
    if(!pingTarget?.id)return;
    setTarget({id:pingTarget.id,full_name:pingTarget.full_name,
      username:pingTarget.username,avatar_url:null});
    setComposeQuery('');setMessageText('');setMode('compose');
  },[pingTarget?.id]);

  useEffect(()=>{
    let active=true;
    getPingSceneInbox({limit:40}).then(items=>{if(active)setSceneShares(items)})
      .catch(e=>{if(active)setSceneSharesError(e?.message||'Could not retrieve shared Scenes.')});
    return()=>{active=false};
  },[]);

  async function showComposer(){
    Keyboard.dismiss();setMode('compose');setTarget(null);setComposeQuery('');
    setMessageText('');setError('');setNotice('');
    setContactsLoading(true);
    try{
      const settled=await Promise.allSettled([
        getSceneSharingPeeps({limit:80}),getCampusPeeps({limit:150})
      ]);
      const pool=settled.flatMap(row=>row.status==='fulfilled'?(row.value||[]):[]);
      if(settled.every(row=>row.status==='rejected')){
        setError('Unable to load permitted students. You can also open Ping from a student profile.');
      }
      const seen=new Set();
      setContacts(pool.filter(person=>{
        if(!person?.id||person.id===profile?.id||seen.has(person.id))return false;
        seen.add(person.id);return true;
      }));
    }catch(e){setError(e?.message||'Unable to load permitted students.');}
    finally{setContactsLoading(false)}
  }

  function openThread(item){
    Keyboard.dismiss();
    setSelected(item);setMode('thread');setMessageText('');
    setError('');setNotice('');setMessages([]);
  }

  async function send(){
    const recipient=mode==='thread'?selected?.other_user_id:target?.id;
    const text=messageText.trim();
    if(!recipient||!text||working)return;
    setWorking(true);setError('');setNotice('');
    try{
      const result=await sendPingText(recipient,text);
      setMessageText('');Keyboard.dismiss();
      const rows=await refreshThreads(true);
      const found=rows?.find(t=>t.id===result.thread_id);
      setSelected(found||{
        id:result.thread_id,other_user_id:recipient,
        other_name:target?.full_name||selected?.other_name||'Student',
        other_username:target?.username||selected?.other_username||'',
        status:result.status,incoming_request:false
      });
      setMode('thread');
      if(result.is_request)setNotice('Ping request sent. Wait for this student to accept before sending more.');
      await refreshMessages(result.thread_id);
    }catch(e){setError(e?.message||'This Ping could not be sent.');}
    finally{setWorking(false)}
  }

  async function decide(item,action){
    if(working)return;
    setWorking(true);setError('');setNotice('');
    try{
      const result=await decidePingRequest(item.id,action);
      const rows=await refreshThreads(true);
      if(result.status==='declined'){
        if(selected?.id===item.id){setMode('list');setSelected(null);}
      }else if(selected?.id===item.id){
        setSelected(rows?.find(t=>t.id===item.id)||{...item,status:'active',incoming_request:false});
      }
      setNotice(action==='accept'?'Ping request accepted. You can now reply.':'Ping request declined.');
    }catch(e){setError(e?.message||'Unable to respond to this Ping request.');}
    finally{setWorking(false)}
  }

  const visible=threads.filter(t=>{
    if(tab==='Peeps')return t.status==='active'&&t.is_peep;
    if(tab==='Requests')return t.status==='pending';
    if(tab==='All')return true;
    return false;
  });
  const filteredContacts=contacts.filter(person=>{
    const q=composeQuery.trim().toLowerCase();
    return !q||String(person.full_name||'').toLowerCase().includes(q)
      ||String(person.username||'').toLowerCase().includes(q);
  });

  function back(){
    if(mode==='list')onBack?.();
    else {Keyboard.dismiss();setMode('list');setSelected(null);setTarget(null);setError('');setNotice('');refreshThreads(true);}
  }

  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]}
    behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back"
        onPress={back} style={[styles.iconButton,{backgroundColor:theme.surface}]}>
        <Feather name="arrow-left" size={21} color={theme.text}/>
      </Pressable>
      <View style={{flex:1}}>
        <Text style={[styles.eyebrow,{color:theme.accent}]}>STUDENTHOOD</Text>
        <Text style={[styles.heading,{color:theme.text}]}>
          {mode==='list'?'Ping':mode==='compose'?'Compose Ping':selected?.other_name||'Conversation'}
        </Text>
      </View>
      {mode==='list'?<>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh Ping inbox"
          onPress={()=>refreshThreads(false)} style={[styles.iconButton,{backgroundColor:theme.surface}]}>
          <Feather name="refresh-cw" size={20} color={theme.text}/>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Compose Ping"
          onPress={showComposer} style={[styles.iconButton,{backgroundColor:theme.accentSoft}]}>
          <Feather name="edit-3" size={21} color={theme.accent}/>
        </Pressable>
      </>:null}
    </View>

    {!!error&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.danger}]}>{error}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.accent}]}>{notice}</Text>}

    {mode==='list'&&<>
      <Text style={[styles.helper,{color:theme.muted}]}>Conversations and private message requests.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs} keyboardShouldPersistTaps="handled">
        {TABS.map(name=><Pressable key={name} accessibilityRole="button"
          accessibilityState={{selected:tab===name}} onPress={()=>setTab(name)}
          style={[styles.pill,{backgroundColor:tab===name?theme.accent:theme.surface,
            borderColor:tab===name?theme.accent:theme.line}]}>
          <Text style={{fontSize:12,fontWeight:'700',color:tab===name?'#fff':theme.text}}>{name}</Text>
        </Pressable>)}
      </ScrollView>
      <ScrollView style={{flex:1}} contentContainerStyle={styles.list}>
        {loading?<ActivityIndicator color={theme.accent} style={{marginTop:40}}/>:
          (tab==='Hang Chats'||tab==='Crew Chats')?
            <Text style={[styles.empty,{color:theme.muted}]}>
              {tab==='Hang Chats'?'Hang':'Crew'} conversations aren't available yet.
            </Text>:
          visible.length===0?<View style={styles.emptyArea}>
            <Feather name="message-circle" color={theme.accent} size={42}/>
            <Text style={[styles.empty,{color:theme.muted}]}>
              {tab==='Requests'?'No pending Ping requests.':'No conversations yet. Tap Compose Ping to begin.'}
            </Text>
          </View>:
          visible.map(item=><View key={item.id}
            style={[styles.threadCard,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            <Pressable accessibilityRole="button" onPress={()=>openThread(item)}
              accessibilityLabel={'Open conversation with '+(item.other_name||item.other_username||'student')}
              style={styles.threadRow}>
              <ProfileIcon uri={item.other_avatar_url} theme={theme}/>
              <View style={{flex:1}}>
                <Text style={[styles.name,{color:theme.text}]} numberOfLines={1}>{item.other_name||item.other_username||'Student'}</Text>
                <Text numberOfLines={2} style={[styles.preview,{color:theme.muted}]}>
                  {item.incoming_request?'Ping request received':item.status==='pending'?'Ping request sent':item.last_message||'Open conversation'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.muted}/>
            </Pressable>
            {item.incoming_request&&<View style={styles.decisionRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Accept Ping message request"
                disabled={working} onPress={()=>decide(item,'accept')}
                style={[styles.decision,{backgroundColor:theme.accent}]}>
                <Text style={styles.buttonLabel}>Accept</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Decline Ping message request"
                disabled={working} onPress={()=>decide(item,'decline')}
                style={[styles.decision,{backgroundColor:theme.surface2,borderColor:theme.line,borderWidth:1}]}>
                <Text style={{fontWeight:'700',color:theme.text}}>Decline</Text>
              </Pressable>
            </View>}
          </View>)}
        {(tab==='All'||tab==='Peeps')&&sceneShares.length>0&&<View style={styles.sceneSection}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>Scenes shared in Ping</Text>
          {sceneShares.map(item=><Pressable key={item.id} onPress={()=>onOpenScene?.(item.scene_id)}
            style={[styles.sceneRow,{borderColor:theme.line}]} accessibilityRole="button">
            <Feather name="image" color={theme.accent} size={18}/>
            <Text style={{color:theme.text,flex:1}} numberOfLines={1}>
              {item.sender_name||item.sender_username||'Your Peep'} shared a Scene
            </Text>
            <Feather name="chevron-right" color={theme.muted}/>
          </Pressable>)}
        </View>}
        {!!sceneSharesError&&(tab==='All'||tab==='Peeps')&&<Text style={{color:theme.muted,fontSize:11}}>{sceneSharesError}</Text>}
      </ScrollView>
    </>}

    {mode==='compose'&&<>
      <Text style={[styles.helper,{color:theme.muted}]}>
        Choose an eligible student. Your first message may need their approval.
      </Text>
      {!target&&<View style={{flex:1}}>
        <View style={[styles.searchBox,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="search" size={19} color={theme.muted}/>
          <TextInput value={composeQuery} onChangeText={setComposeQuery}
            placeholder="Search permitted students" placeholderTextColor={theme.muted}
            style={[styles.searchInput,{color:theme.text}]}/>
        </View>
        {contactsLoading?<ActivityIndicator color={theme.accent} style={{marginTop:24}}/>:
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
            {filteredContacts.map(person=><Pressable key={person.id} accessibilityRole="button"
              onPress={()=>{setTarget(person);setError('');Keyboard.dismiss()}}
              style={[styles.contactRow,{borderBottomColor:theme.line}]}>
              <ProfileIcon uri={person.avatar_url} theme={theme}/>
              <View style={{flex:1}}>
                <Text style={[styles.name,{color:theme.text}]}>{person.full_name||person.username||'Student'}</Text>
                {!!person.username&&<Text style={[styles.preview,{color:theme.muted}]}>@{person.username}</Text>}
              </View>
              <Feather name="chevron-right" size={18} color={theme.muted}/>
            </Pressable>)}
            {!filteredContacts.length&&<Text style={[styles.empty,{color:theme.muted}]}>
              No permitted students matched. You can also open Ping from a student's profile.
            </Text>}
          </ScrollView>}
      </View>}
      {!!target&&<>
        <Pressable accessibilityRole="button" onPress={()=>{setTarget(null);setMessageText('')}}
          style={[styles.recipient,{borderColor:theme.line,backgroundColor:theme.surface}]}>
          <ProfileIcon uri={target.avatar_url} theme={theme} size={38}/>
          <Text style={[styles.name,{color:theme.text,flex:1}]} numberOfLines={1}>
            {target.full_name||target.username||'Student'}
          </Text>
          <Feather name="x" size={20} color={theme.muted}/>
        </Pressable>
        <View style={{flex:1}}/>
      </>}
      {!!target&&<View style={[styles.composer,{borderTopColor:theme.line}]}>
        <TextInput multiline value={messageText} onChangeText={setMessageText}
          accessibilityLabel="Compose Ping message" maxLength={1500}
          placeholder="Write a Ping…" placeholderTextColor={theme.muted}
          style={[styles.messageInput,{color:theme.text,backgroundColor:theme.surface,borderColor:theme.line}]}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Send Ping"
          disabled={working||!messageText.trim()}
          onPress={send} style={[styles.send,{backgroundColor:theme.accent,opacity:working||!messageText.trim()?0.45:1}]}>
          {working?<ActivityIndicator size="small" color="#fff"/>:<Feather name="send" color="#fff" size={19}/>}
        </Pressable>
      </View>}
    </>}

    {mode==='thread'&&selected&&<>
      <Pressable onPress={()=>onOpenProfile?.(selected.other_user_id)}
        accessibilityRole="button" accessibilityLabel="View recipient profile"
        style={[styles.recipient,{borderColor:theme.line,backgroundColor:theme.surface}]}>
        <ProfileIcon uri={selected.other_avatar_url} theme={theme} size={36}/>
        <Text style={[styles.name,{color:theme.text,flex:1}]} numberOfLines={1}>
          {selected.other_name||selected.other_username||'Student'}
        </Text>
        <Feather name="user" color={theme.muted} size={17}/>
      </Pressable>
      <ScrollView style={{flex:1}} keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list,{justifyContent:'flex-end',flexGrow:1}]}>
        {messagesLoading?<ActivityIndicator color={theme.accent}/>:
          messages.map(msg=><View key={msg.id}
            style={[styles.bubble,{alignSelf:msg.sender_id===profile?.id?'flex-end':'flex-start',
              backgroundColor:msg.sender_id===profile?.id?theme.accentSoft:theme.surface,borderColor:theme.line}]}>
            <Text style={{color:theme.text,fontSize:14,lineHeight:20}}>{msg.body}</Text>
          </View>)}
        {!messagesLoading&&!messages.length&&<Text style={[styles.empty,{color:theme.muted}]}>No messages yet.</Text>}
      </ScrollView>
      {selected.incoming_request&&<View style={styles.decisionRow}>
        <Pressable onPress={()=>decide(selected,'accept')} disabled={working} style={[styles.decision,{backgroundColor:theme.accent}]}>
          <Text style={styles.buttonLabel}>Accept Ping request</Text>
        </Pressable>
        <Pressable onPress={()=>decide(selected,'decline')} disabled={working}
          style={[styles.decision,{backgroundColor:theme.surface2,borderWidth:1,borderColor:theme.line}]}>
          <Text style={{color:theme.text,fontWeight:'700'}}>Decline</Text>
        </Pressable>
      </View>}
      {selected.status==='pending'&&!selected.incoming_request?
        <Text style={[styles.helper,{color:theme.muted}]}>Waiting for the student to accept your Ping request.</Text>:
        selected.status==='active'&&<View style={[styles.composer,{borderTopColor:theme.line}]}>
          <TextInput value={messageText} onChangeText={setMessageText}
            accessibilityLabel="Write Ping reply" maxLength={1500} multiline
            placeholder="Write a Ping…" placeholderTextColor={theme.muted}
            style={[styles.messageInput,{backgroundColor:theme.surface,borderColor:theme.line,color:theme.text}]}/>
          <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send Ping reply"
            disabled={!messageText.trim()||working}
            style={[styles.send,{backgroundColor:theme.accent,opacity:!messageText.trim()||working?0.45:1}]}>
            {working?<ActivityIndicator color="#fff" size="small"/>:<Feather name="send" color="#fff" size={19}/>}
          </Pressable>
        </View>}
    </>}
  </KeyboardAvoidingView>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{minHeight:72,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:15,
    flexDirection:'row',alignItems:'center',gap:12},
  iconButton:{width:41,height:41,borderRadius:15,alignItems:'center',justifyContent:'center'},
  eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:1.6},
  heading:{fontSize:27,fontWeight:'900'},
  helper:{fontSize:12,lineHeight:19,marginHorizontal:17,marginVertical:12},
  feedback:{fontSize:12,marginHorizontal:16,marginTop:9},
  tabs:{paddingHorizontal:16,paddingBottom:12,gap:8},
  pill:{borderWidth:1,borderRadius:23,paddingHorizontal:15,height:35,
    alignItems:'center',justifyContent:'center'},
  list:{paddingHorizontal:16,paddingTop:10,paddingBottom:32,gap:9},
  threadCard:{borderWidth:1,borderRadius:16,padding:12},
  threadRow:{flexDirection:'row',alignItems:'center',gap:13,minHeight:57},
  contactRow:{flexDirection:'row',gap:13,minHeight:68,alignItems:'center',
    paddingVertical:9,borderBottomWidth:StyleSheet.hairlineWidth},
  name:{fontWeight:'800',fontSize:14},
  preview:{fontSize:11,marginTop:4,lineHeight:16},
  decisionRow:{flexDirection:'row',gap:10,marginHorizontal:15,marginVertical:9},
  decision:{flex:1,minHeight:41,borderRadius:17,alignItems:'center',justifyContent:'center'},
  buttonLabel:{fontWeight:'800',color:'#fff',fontSize:12},
  emptyArea:{alignItems:'center',gap:15,marginTop:44,padding:25},
  empty:{fontSize:12,lineHeight:20,textAlign:'center',marginTop:17},
  sceneSection:{marginTop:23,gap:9},
  sectionTitle:{fontWeight:'800',fontSize:15,marginBottom:8},
  sceneRow:{borderWidth:1,borderRadius:14,minHeight:55,padding:13,
    flexDirection:'row',alignItems:'center',gap:10},
  searchBox:{minHeight:50,marginHorizontal:16,marginVertical:10,borderWidth:1,
    borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12},
  searchInput:{flex:1,minHeight:48,fontSize:14},
  recipient:{marginHorizontal:16,marginTop:11,borderWidth:1,padding:10,borderRadius:16,
    flexDirection:'row',alignItems:'center',gap:11,minHeight:55},
  composer:{flexDirection:'row',alignItems:'flex-end',paddingHorizontal:12,
    paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,gap:9},
  messageInput:{flex:1,minHeight:44,maxHeight:115,borderWidth:1,borderRadius:17,
    paddingHorizontal:13,paddingVertical:10,fontSize:14},
  send:{width:46,height:46,borderRadius:23,alignItems:'center',justifyContent:'center'},
  bubble:{maxWidth:'87%',minWidth:65,borderRadius:17,borderWidth:1,
    paddingHorizontal:12,paddingVertical:10,marginVertical:3}
});
