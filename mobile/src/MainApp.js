import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {DiscoverIcon,DropsIcon,PingIcon,SceneIcon} from './icons';
import {useSession} from './session';
import ScenesScreen from './screens/ScenesScreen';
import ProfileScreen from './screens/ProfileScreen';
import TopHubScreen from './screens/TopHubScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ProfileMenuScreen from './screens/ProfileMenuScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import CreateOptionsScreen from './screens/CreateOptionsScreen';
import CreateSceneSheet from './components/CreateSceneSheet';
import SlidePage from './components/SlidePage';

const LOGO_DARK=require('../assets/studenthood-logo.png');
const LOGO_LIGHT=require('../assets/studenthood-logo-light.png');

export default function MainApp({theme}){
  const {profile,safety,refreshAccount}=useSession();
  const {width}=useWindowDimensions();
  const isTablet=width>=768;
  const [tab,setTab]=useState('Scenes');
  const [pages,setPages]=useState([]);
  const [reloadKey,setReloadKey]=useState(0);
  const nextPageId=useRef(0);

  const pushPage=useCallback(page=>{
    const key=String(++nextPageId.current);
    setPages(current=>[...current,{...page,key,closing:false}]);
  },[]);

  const goBack=useCallback(()=>{
    setPages(current=>{
      if(!current.length||current[current.length-1].closing)return current;
      return current.map((page,i)=>i===current.length-1?{...page,closing:true}:page);
    });
  },[]);

  const pageExited=useCallback(key=>{
    setPages(current=>current.filter(page=>page.key!==key));
  },[]);

  const selectTab=useCallback(nextTab=>{
    setTab(nextTab);
    setPages([]);
  },[]);

  const afterProfileSaved=useCallback(async()=>{
    await refreshAccount();
    setReloadKey(x=>x+1);
  },[refreshAccount]);

  function showPage(page){
    pushPage(page);
  }

  function makePage(page){
    switch(page.type){
      case 'hub':
        return <TopHubScreen
          kind={page.kind}
          theme={theme}
          profile={profile}
          pingTarget={page.pingTarget||null}
          onBack={goBack}
          onTab={selectTab}
          onOpenProfile={userId=>showPage({type:'student-profile',userId})}
        />;
      case 'student-profile':
        return <UserProfileScreen
          userId={page.userId}
          currentUserId={profile?.id}
          theme={theme}
          onBack={goBack}
          onPing={pingTarget=>showPage({type:'hub',kind:'Ping',pingTarget})}
        />;
      case 'profile-menu':
        return <ProfileMenuScreen
          page={page.section||'menu'}
          theme={theme}
          profile={profile}
          safety={safety}
          onBack={goBack}
          onNavigate={section=>showPage({type:'profile-menu',section})}
          onDrops={()=>showPage({type:'hub',kind:'Drops'})}
        />;
      case 'edit-profile':
        return <EditProfileScreen
          theme={theme}
          profile={profile}
          photoOnly={page.photoOnly}
          onBack={goBack}
          onSaved={afterProfileSaved}
        />;
      case 'create-options':
        return <CreateOptionsScreen
          theme={theme}
          onBack={goBack}
          onScene={()=>showPage({type:'create-scene'})}
          onPulse={()=>selectTab('Pulse')}
          onHang={()=>selectTab('Hangs')}
          onGig={()=>selectTab('Gigs')}
        />;
      case 'create-scene':
        return <CreateSceneSheet
          visible
          theme={theme}
          onClose={goBack}
          onCreated={()=>{setReloadKey(x=>x+1);selectTab('Scenes')}}
        />;
      default:
        return <View style={{flex:1,backgroundColor:theme.bg}}/>;
    }
  }

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <Header theme={theme} isTablet={isTablet} onSheet={kind=>showPage({type:'hub',kind})}/>
    {tab==='Scenes'&&<ScenesScreen
      theme={theme}
      profile={profile}
      safety={safety}
      reloadKey={reloadKey}
      onOpenProfile={userId=>showPage({type:'student-profile',userId})}
      onOpenCreate={()=>showPage({type:'create-options'})}
    />}
    {tab==='Profile'&&<ProfileScreen
      theme={theme}
      profile={profile}
      reloadKey={reloadKey}
      onMenu={()=>showPage({type:'profile-menu',section:'menu'})}
      onEdit={()=>showPage({type:'edit-profile'})}
      onEditPicture={()=>showPage({type:'edit-profile',photoOnly:true})}
    />}
    {tab==='Pulse'&&<Placeholder theme={theme} icon="circle" title="Pulse" copy="Quick campus moments live here. Pulse creation is being wired next."/>}
    {tab==='Hangs'&&<Placeholder theme={theme} icon="calendar" title="Hangs" copy="Campus plans and meetups live here. Hang creation is being wired next."/>}
    {tab==='Gigs'&&<Placeholder theme={theme} icon="briefcase" title="Gigs" copy="Student opportunities live here. Gig creation is being wired next."/>}
    <BottomDial theme={theme} tab={tab} onTab={selectTab} onCreate={()=>showPage({type:'create-options'})} isTablet={isTablet} screenWidth={width}/>

    {pages.map((page,index)=><SlidePage
      key={page.key}
      theme={theme}
      active={index===pages.length-1&&!page.closing}
      closing={page.closing}
      swipeBack={page.type==='student-profile'}
      onBack={goBack}
      onExited={()=>pageExited(page.key)}
    >{makePage(page)}</SlidePage>)}
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

function BottomDial({theme,tab,onTab,onCreate,isTablet,screenWidth}){
  const dialWidth=Math.min(isTablet?520:380,Math.max(0,screenWidth-24));
  const item=(name,icon)=><Pressable key={name} onPress={()=>onTab(name)} style={[styles.dialItem,tab===name&&{backgroundColor:theme.accentSoft}]}>
    {name==='Scenes'
      ?<SceneIcon size={20} color={tab===name?theme.accent:theme.muted}/>
      :<Feather name={icon} size={20} color={tab===name?theme.accent:theme.muted}/>}
    <Text style={[styles.dialLabel,{color:tab===name?theme.accent:theme.muted}]}>{name}</Text>
  </Pressable>;

  return <View style={[styles.dial,{width:dialWidth,backgroundColor:theme.surface,borderColor:theme.line,transform:[{translateX:-dialWidth/2}],...Platform.select({ios:{shadowColor:'#000',shadowOpacity:.17,shadowRadius:20,shadowOffset:{width:0,height:10}},android:{elevation:12}})}]}>
    {item('Scenes','video')}
    {item('Hangs','calendar')}
    <Pressable onPress={onCreate} style={[styles.create,{backgroundColor:theme.accent}]} accessibilityLabel="Create"><Feather name="plus" size={28} color="#fff"/></Pressable>
    {item('Gigs','briefcase')}
    {item('Profile','user')}
  </View>;
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
  dropsIntro:{borderRadius:12,paddingLeft:12,paddingRight:5,paddingVertical:6,marginBottom:8,flexDirection:'row',alignItems:'center',gap:8},
  dropsIntroText:{fontSize:11,lineHeight:16,flex:1},
  dropsRefresh:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:12},
  dropsLoading:{alignItems:'center',justifyContent:'center',padding:28,gap:8},
  dropsList:{maxHeight:450},
  dropActivity:{minHeight:69,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:11,paddingVertical:12},
  dropActivityIcon:{width:42,height:42,borderRadius:14,justifyContent:'center',alignItems:'center'},
  dropActivityTitle:{fontSize:12,lineHeight:18,fontWeight:'700'},
  dropActivityTime:{fontSize:10,marginTop:4},

  sheetRow:{minHeight:60,borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  peepRow:{minHeight:62,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  peepAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  peepAvatarImage:{width:'100%',height:'100%'},
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
