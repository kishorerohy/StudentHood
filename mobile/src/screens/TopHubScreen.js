import React,{useEffect,useState} from 'react';
import {
  ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {DiscoverIcon,DropsIcon,PingIcon} from '../icons';
import {getCampusPeeps,getDropsFeed,getPeepConnection,getProfileCard,getPingSceneInbox} from '../api';
import CampusPresenceBadge from '../components/CampusPresenceBadge';
import DiscoverPeoplePanel from '../components/DiscoverPeoplePanel';

const PING_TABS=['All','Peeps','Requests','Hang Chats','Crew Chats'];
const DISCOVER_SECTIONS=[{name:'People',icon:'users',copy:'Meet students from your campus'},{name:'Hangs',icon:'calendar',copy:'Find campus plans'},{name:'Crews',icon:'users',copy:'Discover communities'},{name:'Gigs',icon:'briefcase',copy:'Explore student opportunities'}];
const DROP_FILTERS=['All','Scenes','Peeps'];

export default function TopHubScreen({kind,theme,profile,onBack,onTab,onOpenProfile,onOpenFeature,onOpenScene,pingTarget=null}){
  const [peeps,setPeeps]=useState([]);
  const [peepsLoading,setPeepsLoading]=useState(false);
  const [peepsError,setPeepsError]=useState('');
  const [discoverSection,setDiscoverSection]=useState('People');
  const [peopleQuery,setPeopleQuery]=useState('');
  const [pingTab,setPingTab]=useState('All');
  const [pingCampusPresence,setPingCampusPresence]=useState(null);
  const [drops,setDrops]=useState([]);
  const [dropsLoading,setDropsLoading]=useState(false);
  const [dropsError,setDropsError]=useState('');
  const [dropsRefresh,setDropsRefresh]=useState(0);
  const [dropFilter,setDropFilter]=useState('All');
  const [pingShares,setPingShares]=useState([]);
  const [pingSharesError,setPingSharesError]=useState('');
  const [pingSharesLoading,setPingSharesLoading]=useState(false);
  const [pingRefresh,setPingRefresh]=useState(0);

  useEffect(()=>{
    let live=true;
    if(kind!=='Discover') return;
    setPeepsLoading(true);
    setPeepsError('');
    getCampusPeeps({limit:100}).then(rows=>{
      if(live) setPeeps(rows);
    }).catch(e=>{
      if(live){
        setPeeps([]);
        setPeepsError(e?.message||'Could not load your campus Peeps.');
      }
    }).finally(()=>{if(live) setPeepsLoading(false)});
    return ()=>{live=false};
  },[kind,profile?.id,profile?.campus_name]);

  useEffect(()=>{
    let live=true;
    if(kind!=='Drops') return;
    setDropsLoading(true);
    setDropsError('');
    getDropsFeed({limit:50}).then(rows=>{
      if(live) setDrops(rows);
    }).catch(e=>{
      if(live){
        setDrops([]);
        setDropsError(e?.message||'Could not load your activity.');
      }
    }).finally(()=>{if(live) setDropsLoading(false)});
    return ()=>{live=false};
  },[kind,dropsRefresh]);

  useEffect(()=>{
    let live=true;
    setPingCampusPresence(null);
    if(kind!=='Ping'||!pingTarget?.id) return ()=>{live=false};
    // Recipient's status appears in Ping only for accepted Peeps, never for requests.
    Promise.all([getPeepConnection(pingTarget.id),getProfileCard(pingTarget.id)])
      .then(([connection,card])=>{
        if(live&&connection?.status==='accepted'&&card?.is_peep)
          setPingCampusPresence(card.campus_presence||null);
      }).catch(()=>{});
    return ()=>{live=false};
  },[kind,pingTarget?.id]);

  useEffect(()=>{
    if(kind!=='Ping')return;
    let live=true;
    setPingSharesLoading(true);
    setPingSharesError('');
    getPingSceneInbox({limit:50}).then(rows=>{if(live)setPingShares(rows)}).catch(e=>{
      if(live){setPingShares([]);setPingSharesError(e?.message||'Cannot load shared Scenes.');}
    }).finally(()=>{if(live)setPingSharesLoading(false)});
    return()=>{live=false};
  },[kind,pingRefresh]);

  const visibleDrops=drops.filter(item=>dropFilter==='All'||(dropFilter==='Scenes'&&String(item.activity_type||'').startsWith('scene_'))||(dropFilter==='Peeps'&&String(item.activity_type||'').startsWith('peep_')));
  const visiblePeople=peeps.filter(item=>(item.full_name||'').toLocaleLowerCase().includes(peopleQuery.trim().toLocaleLowerCase())||(item.username||'').toLocaleLowerCase().includes(peopleQuery.trim().toLocaleLowerCase()));

  const icon=kind==='Discover'
    ?<DiscoverIcon color={theme.accent} size={22}/>
    :kind==='Drops'
      ?<DropsIcon color={theme.accent} size={22}/>
      :<PingIcon color={theme.accent} size={22}/>;

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to StudentHood" style={[styles.back,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="arrow-left" color={theme.text} size={20}/>
        </Pressable>
        <View style={styles.pageHeading}>
          <Text style={[styles.eyebrow,{color:theme.accent}]}>STUDENTHOOD</Text>
          <Text style={[styles.title,{color:theme.text}]}>{kind}</Text>
        </View>
        <View style={[styles.titleIcon,{backgroundColor:theme.accentSoft}]}>{icon}</View>
      </View>

      {kind==='Drops'&&<>
        <View style={[styles.intro,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Text style={[styles.introText,{color:theme.muted}]}>Your latest StudentHood activity, all in one place.</Text>
          <Pressable
            onPress={()=>setDropsRefresh(x=>x+1)}
            disabled={dropsLoading}
            accessibilityRole="button"
            accessibilityLabel="Refresh Drops"
            style={styles.refresh}
          >{dropsLoading?<ActivityIndicator size="small" color={theme.accent}/>:<Feather name="refresh-cw" size={19} color={theme.accent}/>}</Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropFilters}>
          {DROP_FILTERS.map(label=><Pressable key={label} onPress={()=>setDropFilter(label)} accessibilityRole="button" accessibilityState={{selected:dropFilter===label}} style={[styles.filterPill,{backgroundColor:dropFilter===label?theme.accent:theme.surface,borderColor:dropFilter===label?theme.accent:theme.line}]}>
            <Text style={[styles.filterLabel,{color:dropFilter===label?'#fff':theme.text}]}>{label}</Text>
          </Pressable>)}
        </ScrollView>
        {dropsError?<EmptyMessage theme={theme} icon="alert-circle" title="Activity unavailable" copy={dropsError}/>:
          dropsLoading&&drops.length===0?<Loading theme={theme} label="Loading your activity…"/>:
          visibleDrops.length===0?<EmptyMessage theme={theme} icon="bell" title="All caught up" copy="No activity in this category yet. Messages and Ping requests remain inside Ping."/>:
          <View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            {visibleDrops.map((activity,index)=><DropRow key={activity.event_key} activity={activity} theme={theme} last={index===visibleDrops.length-1}/>)}
          </View>}
      </>}

      {kind==='Discover'&&<>
        <Text style={[styles.subtitle,{color:theme.muted}]}>Real people and opportunities around your campus, with student privacy respected.</Text>
        <View style={[styles.searchBox,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="search" color={theme.muted} size={18}/>
          <TextInput
            accessibilityLabel="Search campus students"
            placeholder="Search students on your campus"
            placeholderTextColor={theme.muted}
            value={peopleQuery}
            onChangeText={text=>{setPeopleQuery(text);setDiscoverSection('People')}}
            autoCapitalize="none"
            style={[styles.searchInput,{color:theme.text}]}
          />
          {!!peopleQuery&&<Pressable onPress={()=>setPeopleQuery('')} accessibilityLabel="Clear student search">
            <Feather name="x" color={theme.muted} size={18}/>
          </Pressable>}
        </View>
        <View style={styles.grid}>
          {DISCOVER_SECTIONS.map(item=><Pressable
            key={item.name}
            accessibilityRole="button"
            accessibilityState={{selected:discoverSection===item.name}}
            onPress={()=>{setDiscoverSection(item.name);if(item.name!=='People')onOpenFeature?.(item.name)}}
            style={[styles.discoverCard,{backgroundColor:theme.surface,borderColor:discoverSection===item.name?theme.accent:theme.line}]}
          >
            <Feather name={item.icon} size={22} color={theme.accent}/>
            <Text style={[styles.discoverCardName,{color:theme.text}]}>{item.name}</Text>
            <Text style={[styles.discoverCardCopy,{color:theme.muted}]}>{item.copy}</Text>
          </Pressable>)}
        </View>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>People from your campus</Text>
          <Text style={[styles.sectionCaption,{color:theme.muted}]} numberOfLines={1}>{profile?.campus_name||'Your campus'}</Text>
        </View>
        {!peepsError&&!peepsLoading&&visiblePeople.length>0&&<DiscoverPeoplePanel people={visiblePeople} viewer={profile} theme={theme} onOpenProfile={onOpenProfile}/>}
        {peepsError?<EmptyMessage theme={theme} icon="alert-circle" title="Unable to load students" copy={peepsError}/>:
          peepsLoading?<Loading theme={theme} label="Finding permitted campus students…"/>:
          visiblePeople.length===0?<EmptyMessage theme={theme} icon="users" title={peopleQuery?'No matching students':'No students to show yet'} copy={peopleQuery?'Try a different name or username.':'Students from your campus will appear when their privacy settings allow discovery.'}/>:
          <View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            {visiblePeople.map((peep,index)=><Pressable
              key={peep.id}
              accessibilityRole="button"
              accessibilityLabel={'View '+(peep.full_name||peep.username||'student')+' profile'}
              onPress={()=>onOpenProfile?.(peep.id)}
              style={[styles.peepRow,{borderBottomColor:theme.line,borderBottomWidth:index===visiblePeople.length-1?0:StyleSheet.hairlineWidth}]}
            >
              <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
                {peep.avatar_url?<Image source={{uri:peep.avatar_url}} style={styles.avatarImage}/>:<Feather name="user" size={21} color={theme.accent}/>}
              </View>
              <View style={{flex:1}}>
                <Text style={[styles.peepName,{color:theme.text}]}>{peep.full_name||peep.username||'Student'}</Text>
                {!!peep.username&&<Text style={[styles.peepHandle,{color:theme.muted}]}>@{peep.username}</Text>}
              </View>
              <Feather name="chevron-right" color={theme.muted} size={19}/>
            </Pressable>)}
          </View>}
      </>}

      {kind==='Ping'&&<>
        {!!pingTarget?.id&&<View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line,padding:16,marginBottom:12}]}>
          <Text style={[styles.sectionTitle,{color:theme.text}]}>Ping {pingTarget.full_name||pingTarget.username||'this student'}</Text>
          {!!pingTarget.username&&<Text style={[styles.subtitle,{color:theme.muted}]}>@{pingTarget.username}</Text>}
          <CampusPresenceBadge status={pingCampusPresence} theme={theme}/>
          <Text style={[styles.subtitle,{color:theme.muted}]}>Messaging is not available yet. No Ping has been sent.</Text>
        </View>}
        <Text style={[styles.subtitle,{color:theme.muted}]}>Your conversations, together in one place.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pingTabs}>
          {PING_TABS.map(label=><Pressable
            key={label}
            onPress={()=>setPingTab(label)}
            accessibilityRole="button"
            accessibilityState={{selected:pingTab===label}}
            style={[styles.pingTab,{backgroundColor:pingTab===label?theme.accent:theme.surface,borderColor:pingTab===label?theme.accent:theme.line}]}
          >
            <Text style={[styles.pingTabLabel,{color:pingTab===label?'#fff':theme.text}]}>{label}</Text>
          </Pressable>)}
        </ScrollView>
        {(pingTab==='All'||pingTab==='Peeps')&&<View style={styles.pingShareSection}>
          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle,{color:theme.text}]}>Scenes sent to Ping</Text>
            <Pressable onPress={()=>setPingRefresh(v=>v+1)} accessibilityRole="button" accessibilityLabel="Refresh Ping Scene shares" disabled={pingSharesLoading}>
              <Feather name="refresh-cw" size={18} color={theme.accent}/>
            </Pressable>
          </View>
          {pingSharesLoading?<Loading theme={theme} label="Loading shared Scenes…"/>:
           pingSharesError?<Text style={{color:theme.danger,fontSize:12}}>{pingSharesError}</Text>:
           pingShares.length?<View style={[styles.panel,{backgroundColor:theme.surface,borderColor:theme.line}]}>
             {pingShares.map(item=><Pressable key={item.id} onPress={()=>onOpenScene?.(item.scene_id)} accessibilityRole="button" accessibilityLabel="Open shared Scene" style={[styles.peepRow,{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.line}]}>
               <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>{item.sender_avatar_url?<Image source={{uri:item.sender_avatar_url}} style={styles.avatarImage}/>:<Feather name="user" size={22} color={theme.accent}/>}</View>
               <View style={{flex:1}}><Text style={[styles.peepName,{color:theme.text}]}>{item.sender_name||item.sender_username||'Your Peep'} shared a Scene</Text><Text style={[styles.peepHandle,{color:theme.muted}]}>Tap to view if you still have access</Text></View>
               <Feather name="arrow-up-right" size={19} color={theme.accent}/>
             </Pressable>)}
           </View>:<Text style={[styles.emptyCopy,{color:theme.muted,marginBottom:20}]}>Your Peeps haven't shared any Scenes with you yet.</Text>}
        </View>}
        <EmptyMessage
          theme={theme}
          icon="message-circle"
          title={pingTab==='All'?'Your Ping inbox':pingTab}
          copy={pingTab==='Requests'?'Ping requests will appear here when secure messaging and request moderation launch.':'Conversations and message requests will appear here when messaging is available.'}
        />
      </>}
    </ScrollView>
  </View>;
}

function Loading({theme,label}){
  return <View style={styles.loading}>
    <ActivityIndicator size="small" color={theme.accent}/>
    <Text style={[styles.emptyCopy,{color:theme.muted}]}>{label}</Text>
  </View>;
}

function EmptyMessage({theme,icon,title,copy}){
  return <View style={[styles.empty,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <View style={[styles.emptyIcon,{backgroundColor:theme.accentSoft}]}>
      <Feather name={icon} size={25} color={theme.accent}/>
    </View>
    <Text style={[styles.emptyTitle,{color:theme.text}]}>{title}</Text>
    <Text style={[styles.emptyCopy,{color:theme.muted}]}>{copy}</Text>
  </View>;
}

function DropRow({activity,theme,last}){
  const kinds={
    scene_like:{icon:'heart',verb:'liked your Scene'},
    scene_comment:{icon:'message-circle',verb:'commented on your Scene'},
    peep_request:{icon:'user-plus',verb:'sent you a Peep request'},
    peep_accepted:{icon:'check-circle',verb:'accepted your Peep request'}
  };
  const detail=kinds[activity.activity_type]||{icon:'bell',verb:'interacted with you'};
  const ms=Date.now()-new Date(activity.happened_at||0).getTime();
  const min=Math.max(0,Math.floor(ms/60000));
  const time=!Number.isFinite(ms)||ms<0?'':min<1?'Just now':min<60?`${min}m ago`:min<1440?`${Math.floor(min/60)}h ago`:`${Math.floor(min/1440)}d ago`;

  return <View style={[styles.dropRow,{borderBottomColor:theme.line,borderBottomWidth:last?0:StyleSheet.hairlineWidth}]}>
    <View style={[styles.dropIcon,{backgroundColor:theme.accentSoft}]}>
      <Feather name={detail.icon} size={19} color={theme.accent}/>
    </View>
    <View style={{flex:1}}>
      <Text style={[styles.dropTitle,{color:theme.text}]}>{activity.actor_name||'A student'} {detail.verb}</Text>
      {!!time&&<Text style={[styles.dropTime,{color:theme.muted}]}>{time}</Text>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  scroll:{flex:1},
  content:{width:'100%',maxWidth:980,alignSelf:'center',paddingHorizontal:16,paddingTop:16,paddingBottom:36},
  pageHeader:{flexDirection:'row',alignItems:'center',gap:13,marginBottom:18},
  back:{width:44,height:44,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},
  pageHeading:{flex:1},
  eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.4,marginBottom:2},
  title:{fontSize:32,fontWeight:'900',letterSpacing:-.8},
  titleIcon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},
  intro:{borderWidth:1,borderRadius:18,flexDirection:'row',alignItems:'center',gap:8,paddingLeft:14,paddingRight:6,minHeight:60,marginBottom:12},
  introText:{flex:1,fontSize:12,lineHeight:18},
  refresh:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  panel:{borderWidth:1,borderRadius:20,overflow:'hidden'},
  dropRow:{minHeight:76,flexDirection:'row',gap:12,alignItems:'center',padding:14},
  dropIcon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},
  dropTitle:{fontSize:12,lineHeight:19,fontWeight:'700'},
  dropTime:{fontSize:10,marginTop:4},
  subtitle:{fontSize:12,lineHeight:18,marginBottom:16},
  searchBox:{borderWidth:1,borderRadius:16,minHeight:47,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9,marginBottom:14},
  searchInput:{fontSize:12,flex:1,minHeight:44},
  dropFilters:{gap:9,paddingVertical:12},
  filterPill:{borderWidth:1,borderRadius:99,paddingHorizontal:14,minHeight:34,alignItems:'center',justifyContent:'center'},
  filterLabel:{fontWeight:'800',fontSize:11},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:24},
  discoverCard:{width:'48%',minHeight:125,borderWidth:1,borderRadius:18,padding:15,justifyContent:'center'},
  discoverCardName:{fontWeight:'900',fontSize:14,marginTop:11},
  discoverCardCopy:{fontSize:10,lineHeight:14,marginTop:3},
  sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:10},
  sectionTitle:{fontSize:18,fontWeight:'800'},
  sectionCaption:{fontSize:11,maxWidth:'47%'},
  peepRow:{minHeight:72,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14},
  avatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarImage:{width:'100%',height:'100%'},
  peepName:{fontSize:12,fontWeight:'800'},
  peepHandle:{fontSize:10,marginTop:4},
  pingShareSection:{marginBottom:20},
  pingTabs:{gap:8,paddingBottom:16},
  pingTab:{height:36,borderRadius:99,borderWidth:1,paddingHorizontal:14,alignItems:'center',justifyContent:'center'},
  pingTabLabel:{fontSize:11,fontWeight:'800'},
  loading:{alignItems:'center',padding:34,gap:12},
  empty:{borderRadius:22,borderWidth:1,padding:32,alignItems:'center',justifyContent:'center',minHeight:190},
  emptyIcon:{width:52,height:52,borderRadius:26,alignItems:'center',justifyContent:'center'},
  emptyTitle:{fontSize:17,fontWeight:'800',marginTop:14,textAlign:'center'},
  emptyCopy:{fontSize:11,lineHeight:18,textAlign:'center',marginTop:8,maxWidth:360}
});
