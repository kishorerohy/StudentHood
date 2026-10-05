import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  ActivityIndicator,Image,Modal,PanResponder,Platform,Pressable,ScrollView,
  StyleSheet,Text,useWindowDimensions,View
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {DiscoverIcon,DropsIcon,PingIcon} from './icons';
import {getProfileCard} from './api';
import {useSession} from './session';
import ScenesScreen from './screens/ScenesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreateSceneSheet from './components/CreateSceneSheet';

const LOGO_DARK=require('../assets/studenthood-logo.png');
const LOGO_LIGHT=require('../assets/studenthood-logo-light.png');

export default function MainApp({theme}){
  const {profile,safety}=useSession();
  const {width}=useWindowDimensions();
  const isTablet=width>=768;
  const [tab,setTab]=useState('Scenes');
  const [sheet,setSheet]=useState(null);
  const [createOpen,setCreateOpen]=useState(false);
  const [createChooser,setCreateChooser]=useState(false);
  const [profileTarget,setProfileTarget]=useState(null);
  const [reloadKey,setReloadKey]=useState(0);

  function chooseCreate(){
    setCreateChooser(true);
  }

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <Header theme={theme} isTablet={isTablet} onSheet={setSheet}/>

    {tab==='Scenes'&&<ScenesScreen
      theme={theme}
      profile={profile}
      safety={safety}
      reloadKey={reloadKey}
      onOpenProfile={setProfileTarget}
      onOpenCreate={chooseCreate}
    />}
    {tab==='Profile'&&<ProfileScreen theme={theme} profile={profile} safety={safety} onSettings={()=>setSheet('Settings')}/>}
    {tab==='Hangs'&&<Placeholder theme={theme} icon="calendar" title="Hangs" copy="Campus plans and meetups will live here."/>}
    {tab==='Gigs'&&<Placeholder theme={theme} icon="briefcase" title="Gigs" copy="Student opportunities will live here with local currency formatting."/>}

    <BottomDial theme={theme} tab={tab} onTab={setTab} onCreate={chooseCreate} isTablet={isTablet}/>

    <ActionSheet visible={!!sheet} name={sheet} onClose={()=>setSheet(null)} onTab={name=>{setTab(name);setSheet(null)}} theme={theme}/>
    <CreateChooser visible={createChooser} onClose={()=>setCreateChooser(false)} onScene={()=>{setCreateChooser(false);setCreateOpen(true)}} theme={theme}/>
    <CreateSceneSheet visible={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>{setReloadKey(x=>x+1);setTab('Scenes')}} theme={theme}/>
    <CreatorProfile visible={!!profileTarget} userId={profileTarget} onClose={()=>setProfileTarget(null)} theme={theme}/>
  </View>;
}

function Header({theme,isTablet,onSheet}){
  return <View style={[styles.header,{borderBottomColor:theme.line,backgroundColor:theme.bg}]}>
    <Image source={theme.isLight?LOGO_LIGHT:LOGO_DARK} style={[styles.logo,{width:isTablet?168:142}]} resizeMode="contain"/>
    {isTablet&&<View style={[styles.searchGhost,{backgroundColor:theme.surface,borderColor:theme.line}]}><Feather name="search" size={17} color={theme.muted}/><Text style={[styles.searchText,{color:theme.muted}]}>Search people, Hangs, Crews, Gigs...</Text></View>}
    <View style={[styles.topIsland,isTablet&&{backgroundColor:theme.surface,borderColor:theme.line,borderWidth:1}]}>
      <Pressable onPress={()=>onSheet('Discover')} style={styles.topIcon} accessibilityLabel="Discover"><DiscoverIcon color={theme.text}/></Pressable>
      <Pressable onPress={()=>onSheet('Drops')} style={styles.topIcon} accessibilityLabel="Drops"><DropsIcon color={theme.text}/><View style={[styles.dot,{backgroundColor:theme.accent}]}/></Pressable>
      <Pressable onPress={()=>onSheet('Ping')} style={styles.topIcon} accessibilityLabel="Ping"><PingIcon color={theme.text}/><View style={[styles.dot,{backgroundColor:theme.accent}]}/></Pressable>
    </View>
  </View>;
}

function BottomDial({theme,tab,onTab,onCreate,isTablet}){
  const item=(name,icon)=><Pressable key={name} onPress={()=>onTab(name)} style={[styles.dialItem,tab===name&&{backgroundColor:theme.accentSoft}]}>
    <Feather name={icon} size={20} color={tab===name?theme.accent:theme.muted}/>
    <Text style={[styles.dialLabel,{color:tab===name?theme.accent:theme.muted}]}>{name}</Text>
  </Pressable>;

  return <View style={[styles.dial,{width:isTablet?520:380,maxWidth:'94%',backgroundColor:theme.surface,borderColor:theme.line,transform:[{translateX:isTablet?-260:-190}],...Platform.select({ios:{shadowColor:'#000',shadowOpacity:.17,shadowRadius:20,shadowOffset:{width:0,height:10}},android:{elevation:12}})}]}>
    {item('Scenes','play-square')}
    {item('Hangs','calendar')}
    <Pressable onPress={onCreate} style={[styles.create,{backgroundColor:theme.accent}]} accessibilityLabel="Create"><Feather name="plus" size={28} color="#fff"/></Pressable>
    {item('Gigs','briefcase')}
    {item('Profile','user')}
  </View>;
}

function ActionSheet({visible,name,onClose,onTab,theme}){
  if(!name) return null;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={styles.backdrop}/>
    <View style={[styles.sheet,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.grip,{backgroundColor:theme.line}]}/>
      <View style={styles.sheetHead}><Text style={[styles.sheetTitle,{color:theme.text}]}>{name}</Text><Pressable onPress={onClose}><Feather name="x" size={22} color={theme.muted}/></Pressable></View>

      {name==='Discover'&&<View style={styles.discoverGrid}>
        {[['Peeps','users'],['Hangs','calendar'],['Crews','users'],['Gigs','briefcase']].map(([label,icon])=><Pressable key={label} onPress={()=>['Hangs','Gigs'].includes(label)&&onTab(label)} style={[styles.discoverCard,{backgroundColor:theme.surface2,borderColor:theme.line}]}><Feather name={icon} size={20} color={theme.accent}/><Text style={[styles.discoverTitle,{color:theme.text}]}>{label}</Text></Pressable>)}
      </View>}

      {name==='Drops'&&<>
        <Text style={[styles.sheetNote,{backgroundColor:theme.surface2,color:theme.muted}]}>Drops contains non-message activity only. New Pings and Ping requests stay inside Ping.</Text>
        <SheetRow theme={theme} icon="heart" title="Scene activity" copy="Likes, comments and mentions"/>
        <SheetRow theme={theme} icon="users" title="Peeps" copy="Connection activity"/>
        <SheetRow theme={theme} icon="calendar" title="Hangs, Crews & Gigs" copy="Community and opportunity updates"/>
      </>}

      {name==='Ping'&&<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pingTabs}>
          {['All','Peeps','Hang Chats','Crew Chats'].map((label,index)=><View key={label} style={[styles.pingTab,{backgroundColor:index===0?theme.accent:theme.surface2,borderColor:index===0?theme.accent:theme.line}]}><Text style={{fontSize:9,fontWeight:'800',color:index===0?'#fff':theme.muted}}>{label}</Text></View>)}
        </ScrollView>
        <View style={[styles.emptySheet,{backgroundColor:theme.surface2}]}><PingIcon color={theme.accent} size={26}/><Text style={[styles.emptySheetTitle,{color:theme.text}]}>Ping is ready for messaging.</Text><Text style={[styles.emptySheetCopy,{color:theme.muted}]}>Real-time conversations are the next module. Message alerts will not be duplicated into Drops.</Text></View>
      </>}

      {name==='Settings'&&<>
        <SheetRow theme={theme} icon="lock" title="Privacy" copy="Profile visibility and discovery"/>
        <SheetRow theme={theme} icon="shield" title="Safety" copy="Blocks, reports and Teen Mode"/>
        <SheetRow theme={theme} icon="bell" title="Notifications" copy="Drops and app alerts"/>
        <SheetRow theme={theme} icon="key" title="Account & security" copy="Password, sessions and deletion"/>
      </>}
    </View>
  </Modal>;
}

function SheetRow({theme,icon,title,copy}){
  return <View style={[styles.sheetRow,{borderTopColor:theme.line}]}><View style={[styles.sheetRowIcon,{backgroundColor:theme.surface2}]}><Feather name={icon} size={16} color={theme.accent}/></View><View style={{flex:1}}><Text style={[styles.sheetRowTitle,{color:theme.text}]}>{title}</Text><Text style={[styles.sheetRowCopy,{color:theme.muted}]}>{copy}</Text></View><Feather name="chevron-right" size={17} color={theme.muted}/></View>;
}

function CreateChooser({visible,onClose,onScene,theme}){
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={styles.backdrop}/>
    <View style={[styles.sheet,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.grip,{backgroundColor:theme.line}]}/>
      <View style={styles.sheetHead}><Text style={[styles.sheetTitle,{color:theme.text}]}>Create</Text><Pressable onPress={onClose}><Feather name="x" size={22} color={theme.muted}/></Pressable></View>
      <Pressable onPress={onScene}><CreateRow theme={theme} icon="play-square" title="Post a Scene" copy="Photo, video or post" active/></Pressable>
      <CreateRow theme={theme} icon="circle" title="Add to Pulse" copy="Quick moments are next"/>
      <CreateRow theme={theme} icon="calendar" title="Start a Hang" copy="Meetup creation is next"/>
      <CreateRow theme={theme} icon="briefcase" title="Post a Gig" copy="Opportunity creation is next"/>
    </View>
  </Modal>;
}
function CreateRow({theme,icon,title,copy,active=false}){
  return <View style={[styles.createRow,{borderTopColor:theme.line,opacity:active?1:.55}]}><View style={[styles.createRowIcon,{backgroundColor:theme.accentSoft}]}><Feather name={icon} size={19} color={theme.accent}/></View><View style={{flex:1}}><Text style={[styles.createRowTitle,{color:theme.text}]}>{title}</Text><Text style={[styles.createRowCopy,{color:theme.muted}]}>{copy}</Text></View><Feather name={active?'chevron-right':'clock'} size={17} color={theme.muted}/></View>;
}

function CreatorProfile({visible,userId,onClose,theme}){
  const [card,setCard]=useState(null);
  const [loading,setLoading]=useState(false);
  const start=useRef(0);
  useEffect(()=>{
    let live=true;
    if(!visible||!userId) return;
    setLoading(true);
    getProfileCard(userId).then(data=>{if(live)setCard(data)}).catch(()=>{if(live)setCard(null)}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[visible,userId]);

  const pan=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:(_,g)=>{start.current=g.x0},
    onPanResponderRelease:(_,g)=>{if(g.moveX-start.current>55)onClose()}
  }),[onClose]);

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={[styles.profileModal,{backgroundColor:theme.bg}]} {...pan.panHandlers}>
      <Pressable onPress={onClose} style={[styles.profileBack,{backgroundColor:theme.surface}]}><Feather name="arrow-left" size={21} color={theme.text}/></Pressable>
      {loading?<ActivityIndicator color={theme.accent}/>:card?<View style={[styles.profileCard,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <View style={[styles.profileAvatar,{backgroundColor:theme.surface2}]}>{card.avatar_url?<Image source={{uri:card.avatar_url}} style={{width:'100%',height:'100%',borderRadius:60}}/>:<Feather name="user" size={38} color={theme.accent}/>}</View>
        <Text style={[styles.profileName,{color:theme.text}]}>{card.full_name||card.username||'Student'}</Text>
        {!!card.username&&<Text style={[styles.profileHandle,{color:theme.muted}]}>@{card.username}</Text>}
        {!!card.bio&&<Text style={[styles.profileBio,{color:theme.muted}]}>{card.bio}</Text>}
        <View style={styles.profileMeta}>{!!card.campus_name&&<Text style={[styles.profileMetaText,{color:theme.text}]}>{card.campus_name}</Text>}{!!card.city&&<Text style={[styles.profileMetaText,{color:theme.muted}]}>{card.city}</Text>}</View>
        <Pressable disabled={!card.can_ping} style={[styles.profileAction,{backgroundColor:card.can_ping?theme.accent:theme.surface2}]}><Text style={{color:card.can_ping?'#fff':theme.muted,fontWeight:'900',fontSize:11}}>{card.can_ping?'Ping':'Ping available to Peeps'}</Text></Pressable>
        <Text style={[styles.swipeHint,{color:theme.muted}]}>Swipe right to return to the Scene</Text>
      </View>:<Text style={[styles.unavailable,{color:theme.muted}]}>This profile is not available to you.</Text>}
    </View>
  </Modal>;
}

function Placeholder({theme,icon,title,copy}){
  return <View style={styles.placeholder}><View style={[styles.placeholderIcon,{backgroundColor:theme.accentSoft}]}><Feather name={icon} size={28} color={theme.accent}/></View><Text style={[styles.placeholderTitle,{color:theme.text}]}>{title}</Text><Text style={[styles.placeholderCopy,{color:theme.muted}]}>{copy}</Text></View>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12},
  logo:{height:38},
  searchGhost:{height:42,maxWidth:540,flex:1,borderWidth:1,borderRadius:16,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,marginHorizontal:'auto'},
  searchText:{fontSize:11},
  topIsland:{marginLeft:'auto',flexDirection:'row',gap:1,borderRadius:17,padding:3},
  topIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderRadius:12},
  dot:{position:'absolute',width:6,height:6,borderRadius:3,right:5,top:5},
  dial:{position:'absolute',left:'50%',bottom:10,height:68,borderWidth:1,borderRadius:24,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:6},
  dialItem:{width:64,height:54,borderRadius:16,alignItems:'center',justifyContent:'center',gap:3},
  dialLabel:{fontSize:9,fontWeight:'800'},
  create:{width:54,height:54,borderRadius:27,alignItems:'center',justifyContent:'center'},
  backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.42)'},
  sheet:{position:'absolute',left:0,right:0,bottom:0,borderWidth:1,borderBottomWidth:0,borderTopLeftRadius:27,borderTopRightRadius:27,padding:16,paddingBottom:32,maxHeight:'82%'},
  grip:{width:42,height:5,borderRadius:3,alignSelf:'center',marginBottom:12},
  sheetHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  sheetTitle:{fontSize:22,fontWeight:'800'},
  discoverGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  discoverCard:{width:'48%',minHeight:86,borderWidth:1,borderRadius:16,padding:14,gap:10},
  discoverTitle:{fontSize:12,fontWeight:'800'},
  sheetNote:{fontSize:10,lineHeight:15,padding:11,borderRadius:12,marginBottom:6},
  sheetRow:{minHeight:60,borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  sheetRowIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},
  sheetRowTitle:{fontSize:11,fontWeight:'800'},
  sheetRowCopy:{fontSize:9,marginTop:3},
  pingTabs:{gap:6,paddingVertical:10},
  pingTab:{borderWidth:1,borderRadius:99,paddingHorizontal:10,paddingVertical:7},
  emptySheet:{borderRadius:16,padding:18,alignItems:'center',marginTop:5},
  emptySheetTitle:{fontSize:12,fontWeight:'800',marginTop:8},
  emptySheetCopy:{fontSize:10,lineHeight:15,textAlign:'center',marginTop:4},
  createRow:{minHeight:66,borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  createRowIcon:{width:40,height:40,borderRadius:13,alignItems:'center',justifyContent:'center'},
  createRowTitle:{fontSize:12,fontWeight:'800'},
  createRowCopy:{fontSize:9,marginTop:3},
  profileModal:{flex:1,alignItems:'center',justifyContent:'center',padding:20},
  profileBack:{position:'absolute',left:18,top:54,width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  profileCard:{width:'100%',maxWidth:470,borderWidth:1,borderRadius:26,padding:24,alignItems:'center'},
  profileAvatar:{width:112,height:112,borderRadius:56,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  profileName:{fontSize:27,fontWeight:'800',marginTop:14},
  profileHandle:{fontSize:11,marginTop:4},
  profileBio:{fontSize:12,lineHeight:18,textAlign:'center',marginTop:12,maxWidth:360},
  profileMeta:{alignItems:'center',gap:4,marginTop:14},
  profileMetaText:{fontSize:10,fontWeight:'700'},
  profileAction:{width:'100%',height:48,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:20},
  swipeHint:{fontSize:9,marginTop:13},
  unavailable:{fontSize:12},
  placeholder:{flex:1,alignItems:'center',justifyContent:'center',padding:28},
  placeholderIcon:{width:62,height:62,borderRadius:31,alignItems:'center',justifyContent:'center'},
  placeholderTitle:{fontSize:27,fontWeight:'800',marginTop:13},
  placeholderCopy:{fontSize:11,lineHeight:17,textAlign:'center',maxWidth:360,marginTop:5}
});
