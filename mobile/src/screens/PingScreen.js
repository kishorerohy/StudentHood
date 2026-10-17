import React,{useCallback,useEffect,useState} from 'react';
import {
  ActivityIndicator,Alert,Image,Keyboard,KeyboardAvoidingView,Platform,
  Pressable,ScrollView,StyleSheet,Text,TextInput,View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import CompactPageBar from '../components/CompactPageBar';
import {
  decidePingRequest,getCampusPeeps,getPingMessages,getPingSceneInbox,
  getPingThreads,getSceneSharingPeeps,sendPingText,
  getPingBlockStatus,setPingBlock,searchPingHistory,getPingHistoryPage
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
  const [blockedByMe,setBlockedByMe]=useState(null);
  const [interactionAvailable,setInteractionAvailable]=useState(null);
  const [blockBusy,setBlockBusy]=useState(false);
  const [history,setHistory]=useState([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyMore,setHistoryMore]=useState(false);
  const [historyBusy,setHistoryBusy]=useState(false);
  const [chatQuery,setChatQuery]=useState('');
  const [searchResults,setSearchResults]=useState([]);
  const [searchLoading,setSearchLoading]=useState(false);
  const [searchMore,setSearchMore]=useState(false);
  const [searchBusy,setSearchBusy]=useState(false);

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
    if(!selected?.other_user_id)return;
    let live=true;
    setBlockedByMe(null);setInteractionAvailable(null);
    getPingBlockStatus(selected.other_user_id)
      .then(result=>{if(live){setBlockedByMe(result.blocked_by_me);setInteractionAvailable(result.interaction_available)}})
      .catch(()=>{if(live){setBlockedByMe(null);setInteractionAvailable(null)}});
    return()=>{live=false};
  },[selected?.other_user_id,mode==='settings']);

  useEffect(()=>{
    if(mode!=='search'||!selected?.id)return;
    const needle=chatQuery.trim();
    if(needle.length<2){setSearchResults([]);setSearchLoading(false);setSearchMore(false);return;}
    let live=true;
    setSearchLoading(true);
    const delayed=setTimeout(()=>{
      searchPingHistory(selected.id,needle,{limit:40,offset:0})
        .then(rows=>{if(live){setSearchResults(rows);setSearchMore(rows.length===40);setError('')}})
        .catch(e=>{if(live){setSearchResults([]);setError(e?.message||'Unable to search this conversation.')}})
        .finally(()=>{if(live)setSearchLoading(false)});
    },300);
    return()=>{live=false;clearTimeout(delayed)};
  },[mode,selected?.id,chatQuery]);

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
    setBlockedByMe(null);setInteractionAvailable(null);
    setHistory([]);setChatQuery('');setSearchResults([]);
    setSelected(item);setMode('thread');setMessageText('');
    setError('');setNotice('');setMessages([]);
  }

  async function loadHistory(older=false){
    if(!selected?.id||historyBusy)return;
    if(!older){setHistoryLoading(true);setHistory([])}
    else setHistoryBusy(true);
    try{
      const cursor=older?history[0]:null;
      const rows=await getPingHistoryPage(selected.id,{limit:60,before:cursor});
      if(older)setHistory(current=>{
        const seen=new Set(current.map(message=>message.id));
        return [...rows.filter(message=>!seen.has(message.id)),...current];
      });
      else setHistory(rows);
      setHistoryMore(rows.length===60);
      setError('');
    }catch(e){setError(e?.message||'Cannot load conversation history.')}
    finally{setHistoryLoading(false);setHistoryBusy(false)}
  }

  async function loadMoreSearch(){
    if(searchBusy||!selected?.id||chatQuery.trim().length<2)return;
    setSearchBusy(true);
    try{
      const results=await searchPingHistory(selected.id,chatQuery.trim(),{
        limit:40,offset:searchResults.length
      });
      setSearchResults(current=>{
        const seen=new Set(current.map(x=>x.id));
        return [...current,...results.filter(x=>!seen.has(x.id))];
      });
      setSearchMore(results.length===40);
    }catch(e){setError(e?.message||'Cannot load more search matches.')}
    finally{setSearchBusy(false)}
  }

  function openSettings(){
    if(!selected?.other_user_id)return;
    Keyboard.dismiss();setMode('settings');setNotice('');setError('');
  }
  function confirmBlock(){
    if(!selected?.other_user_id||blockedByMe===null||blockBusy)return;
    const block=!blockedByMe;
    Alert.alert(block?'Block this student?':'Unblock this student?',
      block
        ?'Blocking prevents new Pings, Peep requests, Scene sharing and profile discovery between both accounts. Existing messages stay in each participant’s conversation history. Unblocking restores any existing Peep relationship.'
        :'Unblocking lets permitted interactions resume. Existing account privacy and age restrictions still apply.',
      [{text:'Cancel',style:'cancel'},
       {text:block?'Block student':'Unblock student',style:block?'destructive':'default',onPress:async()=>{
         setBlockBusy(true);setError('');
         try{
           const next=await setPingBlock(selected.other_user_id,block);
           setBlockedByMe(next.blocked_by_me);
           setInteractionAvailable(next.interaction_available);
           setNotice(next.blocked_by_me?'Student blocked. New interactions are disabled.':'Student unblocked.');
           await refreshThreads(true);
         }catch(e){setError(e?.message||'Could not update block settings.')}
         finally{setBlockBusy(false)}
       }}]);
  }

  useEffect(()=>{
    if(mode==='history'&&selected?.id)loadHistory(false);
  },[mode,selected?.id]);

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
    else if(['settings','search','history'].includes(mode)){
      Keyboard.dismiss();
      setMode(mode==='settings'?'thread':'settings');
      setError('');setNotice('');
    }
    else {Keyboard.dismiss();setMode('list');setSelected(null);setTarget(null);setError('');setNotice('');refreshThreads(true);}
  }

  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]}
    behavior={Platform.OS==='ios'?'padding':'height'}>
    <CompactPageBar theme={theme} onBack={back} backLabel="Back">
      {mode==='thread'&&selected?
        <Pressable onPress={openSettings} accessibilityRole="button"
          accessibilityLabel={'Open Ping settings for '+(selected.other_name||selected.other_username||'student')}
          style={styles.headerRecipient}>
          <ProfileIcon uri={selected.other_avatar_url} theme={theme} size={40}/>
          <View style={{flex:1}}>
            <Text numberOfLines={1} style={[styles.headerName,{color:theme.text}]}>
              {selected.other_name||selected.other_username||'Student'}
            </Text>
            {!!selected.other_username&&<Text style={{fontSize:11,color:theme.muted}}>@{selected.other_username}</Text>}
          </View>
          <Feather name="chevron-right" size={21} color={theme.accent}/>
        </Pressable>:
        <View accessible accessibilityLabel={
          mode==='list'?'Ping inbox':mode==='compose'?'Compose Ping':
          mode==='settings'?'Ping settings':mode==='search'?'Search chat':
          mode==='history'?'Conversation history':'Ping'
        } style={{flex:1}}/>}
      {mode==='list'&&<>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh Ping inbox"
          onPress={()=>refreshThreads(false)} style={[styles.iconButton,{backgroundColor:theme.surface}]}>
          <Feather name="refresh-cw" size={20} color={theme.text}/>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Compose Ping"
          onPress={showComposer} style={[styles.iconButton,{backgroundColor:theme.accentSoft}]}>
          <Feather name="edit-3" size={21} color={theme.accent}/>
        </Pressable>
      </>}
    </CompactPageBar>

    {!!error&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.danger}]}>{error}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={[styles.feedback,{color:theme.accent}]}>{notice}</Text>}

    {mode==='list'&&<>
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
      {interactionAvailable===false&&<Text style={[styles.helper,{color:theme.muted}]}>{blockedByMe?'You blocked this student. Open Ping settings to unblock.':'This conversation is currently unavailable.'} Your existing history remains available.</Text>}
      {selected.incoming_request&&interactionAvailable===true&&<View style={styles.decisionRow}>
        <Pressable onPress={()=>decide(selected,'accept')} disabled={working} style={[styles.decision,{backgroundColor:theme.accent}]}>
          <Text style={styles.buttonLabel}>Accept Ping request</Text>
        </Pressable>
        <Pressable onPress={()=>decide(selected,'decline')} disabled={working}
          style={[styles.decision,{backgroundColor:theme.surface2,borderWidth:1,borderColor:theme.line}]}>
          <Text style={{color:theme.text,fontWeight:'700'}}>Decline</Text>
        </Pressable>
      </View>}
      {selected.status==='pending'&&!selected.incoming_request&&interactionAvailable===true?
        <Text style={[styles.helper,{color:theme.muted}]}>Waiting for the student to accept your Ping request.</Text>:
        selected.status==='active'&&interactionAvailable===true&&<View style={[styles.composer,{borderTopColor:theme.line}]}>
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
      {interactionAvailable===null&&<Text style={[styles.helper,{color:theme.muted}]}>Checking conversation permissions…</Text>}
    </>}

    {mode==='settings'&&selected&&<ScrollView style={{flex:1}}
      contentContainerStyle={styles.settingsContent}>
      <View style={[styles.settingsPerson,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <ProfileIcon uri={selected.other_avatar_url} theme={theme} size={75}/>
        <Text style={[styles.settingsTitle,{color:theme.text}]}>{selected.other_name||selected.other_username||'Student'}</Text>
        {!!selected.other_username&&<Text style={{color:theme.muted}}>@{selected.other_username}</Text>}
        {blockedByMe===true&&<Text style={[styles.settingsHint,{color:theme.danger}]}>Blocked</Text>}
      </View>
      {[
        {title:'Conversation history',detail:'Read earlier Pings and load older messages',icon:'clock',
          action:()=>setMode('history')},
        {title:'Search in chat',detail:'Find messages in this conversation',icon:'search',
          action:()=>{setChatQuery('');setSearchResults([]);setMode('search')}},
        {title:'View profile',detail:'Open this student’s permitted StudentHood profile',icon:'user',
          action:()=>onOpenProfile?.(selected.other_user_id)}
      ].map(item=><Pressable key={item.title} accessibilityRole="button"
        accessibilityLabel={item.title} onPress={item.action}
        style={[styles.settingsRow,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name={item.icon} color={theme.accent} size={21}/>
        <View style={{flex:1}}>
          <Text style={[styles.name,{color:theme.text}]}>{item.title}</Text>
          <Text style={[styles.preview,{color:theme.muted}]}>{item.detail}</Text>
        </View>
        <Feather name="chevron-right" color={theme.muted} size={19}/>
      </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel={blockedByMe?'Unblock student':'Block student'}
        accessibilityState={{disabled:blockBusy||blockedByMe===null}}
        disabled={blockBusy||blockedByMe===null} onPress={confirmBlock}
        style={[styles.settingsRow,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name={blockedByMe?'user-check':'slash'} size={21} color={theme.danger}/>
        <View style={{flex:1}}>
          <Text style={[styles.name,{color:theme.danger}]}>{blockedByMe?'Unblock student':'Block student'}</Text>
          <Text style={[styles.preview,{color:theme.muted}]}>Controls interactions across StudentHood and both devices</Text>
        </View>
        {blockBusy?<ActivityIndicator color={theme.accent}/>:<Feather name="chevron-right" size={19} color={theme.muted}/>}
      </Pressable>
      <Text style={[styles.settingsHint,{color:theme.muted}]}>Blocking is account-wide, not just for this conversation. Your existing messages remain in history. Reports are handled separately through StudentHood safety.</Text>
    </ScrollView>}

    {mode==='search'&&selected&&<>
      <View style={[styles.searchBox,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name="search" size={19} color={theme.muted}/>
        <TextInput value={chatQuery} onChangeText={setChatQuery} autoFocus
          accessibilityLabel="Search this conversation" placeholder="Search messages…"
          placeholderTextColor={theme.muted} style={[styles.searchInput,{color:theme.text}]}/>
        {!!chatQuery&&<Pressable onPress={()=>setChatQuery('')} accessibilityLabel="Clear search">
          <Feather name="x" color={theme.muted} size={17}/>
        </Pressable>}
      </View>
      <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.settingsContent}>
        {chatQuery.trim().length<2&&<Text style={{color:theme.muted}}>Enter at least two characters to search this chat.</Text>}
        {searchLoading&&<ActivityIndicator color={theme.accent}/>}
        {!searchLoading&&chatQuery.trim().length>=2&&searchResults.length===0&&
          <Text style={{color:theme.muted}}>No matching messages found.</Text>}
        {searchResults.map(message=><View key={message.id}
          style={[styles.historyRow,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.historyMeta,{color:theme.muted}]}>
            {message.sender_id===profile?.id?'You':selected.other_name||'Student'} · {new Date(message.created_at).toLocaleString()}
          </Text>
          <Text selectable style={{color:theme.text,lineHeight:21}}>{message.body}</Text>
        </View>)}
        {searchMore&&<Pressable accessibilityRole="button" disabled={searchBusy} onPress={loadMoreSearch}
          style={[styles.loadMore,{backgroundColor:theme.surface2}]}>
          <Text style={{color:theme.text,fontWeight:'800'}}>{searchBusy?'Loading…':'Load more matches'}</Text>
        </Pressable>}
      </ScrollView>
    </>}

    {mode==='history'&&selected&&<ScrollView style={{flex:1}}
      contentContainerStyle={styles.settingsContent}>
      <Text style={[styles.settingsHint,{color:theme.muted}]}>
        All retained messages for this conversation, newest pages first. Only participants can read this history.
      </Text>
      {historyLoading&&<ActivityIndicator color={theme.accent}/>}
      {historyMore&&<Pressable accessibilityRole="button" disabled={historyBusy} onPress={()=>loadHistory(true)}
        style={[styles.loadMore,{backgroundColor:theme.surface2}]}>
        <Text style={{color:theme.text,fontWeight:'800'}}>{historyBusy?'Loading…':'Load older messages'}</Text>
      </Pressable>}
      {!historyLoading&&!history.length&&<Text style={{color:theme.muted}}>No conversation history yet.</Text>}
      {history.map(message=><View key={message.id}
        style={[styles.historyRow,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.historyMeta,{color:theme.muted}]}>
          {message.sender_id===profile?.id?'You':selected.other_name||'Student'} · {new Date(message.created_at).toLocaleString()}
        </Text>
        <Text selectable style={{color:theme.text,lineHeight:21}}>{message.body}</Text>
      </View>)}
    </ScrollView>}
  </KeyboardAvoidingView>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{minHeight:72,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:15,
    flexDirection:'row',alignItems:'center',gap:12},
  iconButton:{width:41,height:41,borderRadius:15,alignItems:'center',justifyContent:'center'},
  eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:1.6},
  heading:{fontSize:24,fontWeight:'900',flexShrink:1},
  headerRecipient:{flex:1,minHeight:63,flexDirection:'row',alignItems:'center',gap:11},
  headerName:{fontSize:17,fontWeight:'900',flexShrink:1},
  settingsContent:{paddingHorizontal:16,paddingTop:15,paddingBottom:52,gap:11},
  settingsPerson:{borderWidth:1,borderRadius:20,alignItems:'center',paddingVertical:24,paddingHorizontal:18,gap:8,marginBottom:4},
  settingsTitle:{fontSize:20,fontWeight:'900',textAlign:'center'},
  settingsRow:{borderWidth:1,borderRadius:17,flexDirection:'row',alignItems:'center',gap:13,minHeight:71,paddingHorizontal:15,paddingVertical:9},
  settingsHint:{fontSize:12,lineHeight:20,marginVertical:10},
  historyRow:{borderWidth:1,borderRadius:15,padding:14,gap:7},
  historyMeta:{fontSize:11,fontWeight:'700'},
  loadMore:{alignItems:'center',justifyContent:'center',minHeight:44,borderRadius:14,padding:10},
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
