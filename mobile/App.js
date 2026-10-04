import React, {useMemo, useRef, useState} from 'react';
import {
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import Svg, {Circle, Path} from 'react-native-svg';

const ASSET='https://kishorerohy.github.io/StudentHood/assets/';
const scenes=[
  {id:'1',name:'Maya Singh',meta:'Your campus · 12 min',avatar:ASSET+'collage1.jpg',image:ASSET+'feature_hangs.jpg',tag:'Viral on campus',caption:"Friday night on the quad. Who's here?",likes:'1.2K',comments:'84'},
  {id:'2',name:'Arjun Mehta',meta:'Your campus · 34 min',avatar:ASSET+'profile_face.jpg',image:ASSET+'hero_group.jpg',tag:'Nearby',caption:'Study crew, coffee, then sunset.',likes:'642',comments:'51'},
  {id:'3',name:'Priya Nair',meta:'Your campus · 1 h',avatar:ASSET+'collage3.jpg',image:ASSET+'feature_scenes.jpg',tag:'Trending',caption:'Golden hour between lectures ✨',likes:'842',comments:'61'}
];
const pulses=[
  ['Your Pulse',ASSET+'profile_face.jpg'],['Maya',ASSET+'collage1.jpg'],['Alex',ASSET+'collage2.jpg'],['Priya',ASSET+'collage3.jpg'],['Clubs',ASSET+'feature_crews.jpg'],['Tonight',ASSET+'feature_hangs.jpg']
];

const palettes={
  dark:{bg:'#090B0D',surface:'#121518',surface2:'#1A1E22',text:'#F4F5F6',muted:'#92999F',line:'#282D32',accent:'#F08A72',accentSoft:'#2B1C18',danger:'#FF7373'},
  light:{bg:'#F4F3F0',surface:'#FFFFFF',surface2:'#EEECE8',text:'#171717',muted:'#706E6B',line:'#D9D6D1',accent:'#E8755D',accentSoft:'#F9E3DD',danger:'#C84343'}
};

function DropsIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3.5s5.2 6.2 5.2 10.3A5.2 5.2 0 0 1 12 19a5.2 5.2 0 0 1-5.2-5.2C6.8 9.7 12 3.5 12 3.5Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/><Path d="m16 5.2.5 1.25 1.25.5-1.25.5L16 8.7l-.5-1.25-1.25-.5 1.25-.5L16 5.2Z" fill={color}/></Svg>
}
function PingIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="2" fill={color}/><Path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2M5.7 5.7a8.9 8.9 0 0 0 0 12.6M18.3 5.7a8.9 8.9 0 0 1 0 12.6" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round"/></Svg>
}
function DiscoverIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="1.7"/><Path d="m15.7 8.3-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/></Svg>
}

function App(){
  const scheme=useColorScheme();
  const theme=palettes[scheme==='light'?'light':'dark'];
  const {width}=useWindowDimensions();
  const isTablet=width>=768;
  const [tab,setTab]=useState('Scenes');
  const [filter,setFilter]=useState('For you');
  const [sheet,setSheet]=useState(null);
  const [viewer,setViewer]=useState(null);
  const [profileFromViewer,setProfileFromViewer]=useState(false);

  const styles=useMemo(()=>makeStyles(theme,isTablet),[theme,isTablet]);

  const openLegal=(path)=>Linking.openURL('https://kishorerohy.github.io/StudentHood/'+path);

  return <SafeAreaProvider>
    <StatusBar barStyle={scheme==='light'?'dark-content':'light-content'} backgroundColor={theme.bg}/>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image source={{uri:ASSET+'studenthood-logo.png'}} style={styles.logo} resizeMode="contain"/>
        {isTablet&&<View style={styles.search}><Feather name="search" size={18} color={theme.muted}/><TextInput placeholder="Search people, Hangs, Crews, Gigs..." placeholderTextColor={theme.muted} style={styles.searchInput}/></View>}
        <View style={styles.topIsland}>
          <Pressable style={styles.topIcon} onPress={()=>setSheet('Discover')} accessibilityLabel="Discover"><DiscoverIcon color={theme.text}/></Pressable>
          <Pressable style={styles.topIcon} onPress={()=>setSheet('Drops')} accessibilityLabel="Drops"><DropsIcon color={theme.text}/><View style={styles.dot}/></Pressable>
          <Pressable style={styles.topIcon} onPress={()=>setSheet('Ping')} accessibilityLabel="Ping"><PingIcon color={theme.text}/><View style={styles.dot}/></Pressable>
        </View>
      </View>

      {tab==='Scenes'?<ScenesScreen {...{styles,theme,isTablet,filter,setFilter,setViewer}}/>:
        <Placeholder title={tab} styles={styles} theme={theme}/>}

      <BottomDial {...{styles,theme,tab,setTab,setSheet}}/>

      {!!sheet&&<Sheet name={sheet} styles={styles} theme={theme} close={()=>setSheet(null)} setTab={setTab} openLegal={openLegal}/>}
      {viewer!==null&&!profileFromViewer&&<SceneViewer index={viewer} setIndex={setViewer} onClose={()=>setViewer(null)} onProfile={()=>setProfileFromViewer(true)} styles={styles} theme={theme}/>}
      {viewer!==null&&profileFromViewer&&<CreatorProfile scene={scenes[viewer]} onBack={()=>setProfileFromViewer(false)} styles={styles} theme={theme}/>}
    </SafeAreaView>
  </SafeAreaProvider>
}

function ScenesScreen({styles,theme,isTablet,filter,setFilter,setViewer}){
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.intro}><View><Text style={styles.kicker}>YOUR CAMPUS, RIGHT NOW</Text><Text style={styles.h1}>Scenes</Text></View><Pressable style={styles.campus}><Feather name="map-pin" size={15} color={theme.accent}/><Text style={styles.campusText}>Your campus</Text></Pressable></View>

    <View style={styles.card}>
      <View style={styles.sectionHead}><Text style={styles.h2}>Pulse</Text><Text style={styles.link}>See all</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pulseRow}>
        {pulses.map(([name,img],i)=><Pressable key={name} style={styles.pulse}><View style={[styles.pulseRing,i===0&&styles.pulseAdd]}>{i===0?<Feather name="plus" size={22} color={theme.accent}/>:<Image source={{uri:img}} style={styles.pulseImg}/>}</View><Text numberOfLines={1} style={styles.pulseName}>{name}</Text></Pressable>)}
      </ScrollView>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {['For you','Viral','Nearby','Campus','Live now'].map(v=><Pressable key={v} onPress={()=>setFilter(v)} style={[styles.chip,filter===v&&styles.chipActive]}><Text style={[styles.chipText,filter===v&&styles.chipActiveText]}>{v}</Text></Pressable>)}
    </ScrollView>

    <View style={styles.card}>
      <View style={styles.sectionHead}><View><Text style={styles.live}>● LIVE</Text><Text style={styles.h2}>Happening around campus</Text></View><Text style={styles.link}>Explore</Text></View>
      <ScrollView horizontal={!isTablet} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nowRow}>
        {[
          ['Viral on campus','What everyone is talking about',ASSET+'feature_hangs.jpg'],
          ['Near you','Scenes close to you',ASSET+'hero_group.jpg'],
          ['Live now','Campus moments happening now',ASSET+'collage3.jpg']
        ].map(([t,s,img])=><Pressable key={t} style={styles.now}><Image source={{uri:img}} style={styles.nowImg}/><View style={styles.nowCopy}><Text style={styles.nowTitle}>{t}</Text><Text style={styles.small}>{s}</Text></View></Pressable>)}
      </ScrollView>
    </View>

    <View style={[styles.feed,isTablet&&styles.feedTablet]}>
      <View style={styles.feedMain}>
        {scenes.map((scene,i)=><SceneCard key={scene.id} scene={scene} onOpen={()=>setViewer(i)} styles={styles} theme={theme}/>)}
      </View>
      {isTablet&&<View style={styles.rail}>
        <View style={styles.card}><Text style={styles.h2}>Trending on campus</Text>{scenes.map((s,i)=><View key={s.id} style={styles.trend}><Text style={styles.rank}>{i+1}</Text><Image source={{uri:s.image}} style={styles.trendImg}/><View style={{flex:1}}><Text style={styles.trendTitle}>{s.tag}</Text><Text style={styles.small}>{s.likes} likes</Text></View></View>)}</View>
        <View style={styles.card}><Text style={styles.h2}>Tonight</Text><Text style={styles.trendTitle}>Sunset meetup</Text><Text style={styles.small}>6:00 PM · Main lawn</Text><Pressable style={styles.outlineButton}><Text style={styles.outlineButtonText}>I'm in</Text></Pressable></View>
      </View>}
    </View>
  </ScrollView>
}

function SceneCard({scene,onOpen,styles,theme}){
  return <View style={styles.sceneCard}>
    <View style={styles.sceneHead}><View style={styles.creator}><Image source={{uri:scene.avatar}} style={styles.avatar}/><View><Text style={styles.creatorName}>{scene.name}</Text><Text style={styles.small}>{scene.meta}</Text></View></View><Feather name="more-horizontal" size={20} color={theme.muted}/></View>
    <Pressable onPress={onOpen} style={styles.mediaWrap}><Image source={{uri:scene.image}} style={styles.media}/><Text style={styles.badge}>{scene.tag}</Text><Text style={styles.mediaTitle}>{scene.caption}</Text></Pressable>
    <Text style={styles.caption}>{scene.caption}</Text>
    <View style={styles.actions}><Text>♡ {scene.likes}</Text><Text>◯ {scene.comments}</Text><Text>↗ Share Scene</Text><Text style={{marginLeft:'auto'}}>⌑</Text></View>
  </View>
}

function BottomDial({styles,theme,tab,setTab,setSheet}){
  const item=(name,icon)=><Pressable key={name} onPress={()=>setTab(name)} style={[styles.dialItem,tab===name&&styles.dialItemActive]}><Feather name={icon} size={20} color={tab===name?theme.accent:theme.muted}/><Text style={[styles.dialLabel,tab===name&&{color:theme.accent}]}>{name}</Text></Pressable>;
  return <View style={styles.dial}>{item('Scenes','play-square')}{item('Hangs','calendar')}<Pressable onPress={()=>setSheet('Create')} style={styles.create}><Feather name="plus" size={28} color="#fff"/></Pressable>{item('Gigs','briefcase')}{item('Profile','user')}</View>
}

function Placeholder({title,styles,theme}){
  return <View style={styles.placeholder}><Feather name={title==='Hangs'?'calendar':title==='Gigs'?'briefcase':'user'} size={42} color={theme.accent}/><Text style={styles.placeholderTitle}>{title}</Text><Text style={styles.placeholderCopy}>This area will use the same StudentHood system and platform-adaptive UI.</Text></View>
}

function Sheet({name,styles,theme,close,setTab,openLegal}){
  const go=(tab)=>{setTab(tab);close()};
  return <View style={styles.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={close}/><View style={styles.sheet}><View style={styles.grip}/><View style={styles.sheetHead}><Text style={styles.sheetTitle}>{name}</Text><Pressable onPress={close}><Feather name="x" size={22} color={theme.muted}/></Pressable></View>
    {name==='Discover'&&<View style={styles.grid}>{[['Peeps','users'],['Hangs','calendar'],['Crews','users'],['Gigs','briefcase']].map(([t,ic])=><Pressable key={t} style={styles.gridItem} onPress={()=>['Hangs','Gigs'].includes(t)?go(t):null}><Feather name={ic} size={20} color={theme.accent}/><Text style={styles.gridTitle}>{t}</Text></Pressable>)}</View>}
    {name==='Drops'&&<><Text style={styles.sheetNote}>Non-message activity only. Message alerts stay in Ping.</Text><SheetRow title="Maya liked your Scene" subtitle="2 min ago" styles={styles}/><SheetRow title="Alex added you as a Peep" subtitle="1 h ago" styles={styles}/></>}
    {name==='Ping'&&<><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pingTabs}>{['All','Peeps','Hang Chats','Crew Chats'].map((x,i)=><Text key={x} style={[styles.pingTab,i===0&&styles.pingTabActive]}>{x}</Text>)}</ScrollView><SheetRow title="Alex" subtitle="Are you coming to the library?" styles={styles}/><SheetRow title="Maya" subtitle="Sent a Scene" styles={styles}/></>}
    {name==='Create'&&<><SheetRow title="Post a Scene" subtitle="Photo, video or post" styles={styles}/><SheetRow title="Add to Pulse" subtitle="A quick moment" styles={styles}/><Pressable onPress={()=>go('Hangs')}><SheetRow title="Start a Hang" subtitle="Make a plan" styles={styles}/></Pressable><Pressable onPress={()=>go('Gigs')}><SheetRow title="Post a Gig" subtitle="Share an opportunity" styles={styles}/></Pressable></>}
    <View style={styles.legalLinks}><Pressable onPress={()=>openLegal('safety.html')}><Text style={styles.legalText}>Safety</Text></Pressable><Pressable onPress={()=>openLegal('privacy.html')}><Text style={styles.legalText}>Privacy</Text></Pressable><Pressable onPress={()=>openLegal('terms.html')}><Text style={styles.legalText}>Terms</Text></Pressable></View>
  </View></View>
}
function SheetRow({title,subtitle,styles}){return <View style={styles.sheetRow}><View><Text style={styles.rowTitle}>{title}</Text><Text style={styles.small}>{subtitle}</Text></View><Feather name="chevron-right" size={18} color="#8C9298"/></View>}

function SceneViewer({index,setIndex,onClose,onProfile,styles,theme}){
  const start=useRef({x:0,y:0}).current;
  const pan=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:(_,g)=>{start.x=g.x0;start.y=g.y0},
    onPanResponderRelease:(_,g)=>{
      const dx=g.moveX-start.x,dy=g.moveY-start.y;
      if(Math.max(Math.abs(dx),Math.abs(dy))<45)return;
      if(Math.abs(dx)>Math.abs(dy)&&dx<0){onProfile();return}
      if(Math.abs(dy)>=Math.abs(dx))setIndex((index+(dy<0?1:-1)+scenes.length)%scenes.length);
    }
  }),[index]);
  const s=scenes[index];
  return <View style={styles.viewer} {...pan.panHandlers}><Image source={{uri:s.image}} style={StyleSheet.absoluteFillObject} resizeMode="cover"/><View style={styles.viewerShade}/><Pressable onPress={onClose} style={styles.viewerClose}><Feather name="x" size={24} color="#fff"/></Pressable><View style={styles.viewerBottom}><View style={styles.creator}><Image source={{uri:s.avatar}} style={styles.avatar}/><View><Text style={styles.viewerName}>{s.name}</Text><Text style={styles.viewerSmall}>{s.meta}</Text></View></View><Text style={styles.viewerCaption}>{s.caption}</Text><Text style={styles.viewerHint}>Swipe left for profile · Swipe up for next Scene</Text></View></View>
}
function CreatorProfile({scene,onBack,styles,theme}){
  const start=useRef(0);
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onPanResponderGrant:(_,g)=>{start.current=g.x0},onPanResponderRelease:(_,g)=>{if(g.moveX-start.current>55)onBack()}}),[]);
  return <View style={styles.profilePeek} {...pan.panHandlers}><Pressable style={styles.profileBack} onPress={onBack}><Feather name="arrow-left" size={22} color={theme.text}/></Pressable><Image source={{uri:scene.avatar}} style={styles.profileAvatar}/><Text style={styles.profileName}>{scene.name}</Text><Text style={styles.profileMeta}>Your campus</Text><Text style={styles.profileBio}>Student · Creator · Always finding the next good place.</Text><View style={styles.profileStats}><Text>482{"\n"}Peeps</Text><Text>36{"\n"}Scenes</Text><Text>8{"\n"}Crews</Text></View><Pressable style={styles.primary}><Text style={styles.primaryText}>Add Peep</Text></Pressable><Text style={styles.profileHint}>Swipe right to return to the Scene</Text></View>
}

function makeStyles(t,isTablet){return StyleSheet.create({
  safe:{flex:1,backgroundColor:t.bg},
  header:{height:isTablet?72:62,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:isTablet?24:14,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:t.line,backgroundColor:t.bg},
  logo:{width:isTablet?170:142,height:40},
  search:{flex:1,maxWidth:580,height:44,borderWidth:1,borderColor:t.line,borderRadius:17,backgroundColor:t.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:9,marginHorizontal:'auto'},
  searchInput:{flex:1,color:t.text,fontSize:13},
  topIsland:{marginLeft:'auto',flexDirection:'row',gap:2,borderWidth:isTablet?1:0,borderColor:t.line,borderRadius:18,padding:isTablet?4:0,backgroundColor:isTablet?t.surface:'transparent'},
  topIcon:{width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center'},
  dot:{position:'absolute',right:5,top:5,width:6,height:6,borderRadius:3,backgroundColor:t.accent},
  scroll:{flex:1},content:{width:'100%',maxWidth:1180,alignSelf:'center',paddingHorizontal:isTablet?24:12,paddingTop:18,paddingBottom:120,gap:14},
  intro:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.7,color:t.accent,marginBottom:5},h1:{fontSize:isTablet?42:34,fontWeight:'800',letterSpacing:-1.4,color:t.text},
  campus:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:t.line,backgroundColor:t.surface,borderRadius:99,paddingVertical:8,paddingHorizontal:11},campusText:{fontSize:11,color:t.muted,maxWidth:130},
  card:{backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:20,padding:15},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},h2:{fontSize:16,fontWeight:'800',color:t.text},link:{fontSize:11,fontWeight:'700',color:t.accent},live:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:t.accent,marginBottom:3},
  pulseRow:{gap:11,paddingTop:13},pulse:{width:58,alignItems:'center',gap:5},pulseRing:{width:52,height:52,borderRadius:26,borderWidth:2,borderColor:t.accent,padding:2,alignItems:'center',justifyContent:'center',backgroundColor:t.surface},pulseAdd:{borderColor:t.line},pulseImg:{width:'100%',height:'100%',borderRadius:25},pulseName:{fontSize:9,color:t.muted,maxWidth:58},
  filters:{gap:7},chip:{borderWidth:1,borderColor:t.line,borderRadius:99,paddingHorizontal:13,paddingVertical:8,backgroundColor:t.surface},chipActive:{backgroundColor:t.accent,borderColor:t.accent},chipText:{fontSize:10,fontWeight:'700',color:t.muted},chipActiveText:{color:'#fff'},
  nowRow:{gap:9,marginTop:12},now:{width:isTablet?'32%':142,borderWidth:1,borderColor:t.line,borderRadius:15,overflow:'hidden',backgroundColor:t.surface2},nowImg:{width:'100%',height:78},nowCopy:{padding:9},nowTitle:{fontSize:11,fontWeight:'800',color:t.text},small:{fontSize:9,color:t.muted,marginTop:3},
  feed:{gap:14},feedTablet:{flexDirection:'row',alignItems:'flex-start'},feedMain:{flex:1,gap:14},rail:{width:300,gap:14},
  sceneCard:{backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:20,overflow:'hidden'},sceneHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:13},creator:{flexDirection:'row',alignItems:'center',gap:9},avatar:{width:40,height:40,borderRadius:20},creatorName:{fontSize:12,fontWeight:'800',color:t.text},mediaWrap:{position:'relative'},media:{width:'100%',height:isTablet?420:420},badge:{position:'absolute',top:12,left:12,color:'#fff',backgroundColor:'rgba(10,10,10,.72)',paddingHorizontal:9,paddingVertical:6,borderRadius:99,fontSize:9,fontWeight:'800',overflow:'hidden'},mediaTitle:{position:'absolute',left:15,right:15,bottom:14,color:'#fff',fontWeight:'800',fontSize:18,textShadowColor:'rgba(0,0,0,.6)',textShadowRadius:10},caption:{paddingHorizontal:14,paddingTop:11,color:t.text,fontSize:12},actions:{flexDirection:'row',gap:18,padding:13,color:t.muted},trend:{flexDirection:'row',gap:8,alignItems:'center',paddingVertical:10,borderTopWidth:StyleSheet.hairlineWidth,borderColor:t.line},rank:{width:18,fontWeight:'800',color:t.muted},trendImg:{width:46,height:40,borderRadius:9},trendTitle:{fontSize:11,fontWeight:'700',color:t.text},outlineButton:{marginTop:14,borderWidth:1,borderColor:t.accent,borderRadius:11,padding:9,alignItems:'center'},outlineButtonText:{fontSize:11,fontWeight:'800',color:t.accent},
  dial:{position:'absolute',left:'50%',bottom:10,transform:[{translateX:isTablet?-260:-190}],width:isTablet?520:380,maxWidth:'94%',height:68,borderRadius:24,borderWidth:1,borderColor:t.line,backgroundColor:t.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:6,...Platform.select({ios:{shadowColor:'#000',shadowOpacity:.18,shadowRadius:20,shadowOffset:{width:0,height:10}},android:{elevation:14}})},dialItem:{width:isTablet?88:62,height:54,borderRadius:16,alignItems:'center',justifyContent:'center',gap:3},dialItemActive:{backgroundColor:t.accentSoft},dialLabel:{fontSize:9,fontWeight:'700',color:t.muted},create:{width:54,height:54,borderRadius:27,backgroundColor:t.accent,alignItems:'center',justifyContent:'center'},
  placeholder:{flex:1,alignItems:'center',justifyContent:'center',padding:30},placeholderTitle:{fontSize:28,fontWeight:'800',color:t.text,marginTop:12},placeholderCopy:{textAlign:'center',color:t.muted,maxWidth:380,marginTop:6},
  sheetOverlay:{...StyleSheet.absoluteFillObject,zIndex:50,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.40)'},sheet:{backgroundColor:t.surface,borderTopLeftRadius:26,borderTopRightRadius:26,padding:18,paddingBottom:34,maxHeight:'82%'},grip:{width:42,height:5,borderRadius:3,backgroundColor:t.line,alignSelf:'center',marginBottom:13},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sheetTitle:{fontSize:22,fontWeight:'800',color:t.text},grid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:14},gridItem:{width:'48%',borderWidth:1,borderColor:t.line,backgroundColor:t.surface2,borderRadius:15,padding:14,gap:8},gridTitle:{fontWeight:'800',color:t.text},sheetNote:{color:t.muted,fontSize:11,backgroundColor:t.surface2,padding:10,borderRadius:11,marginTop:12},sheetRow:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:t.line},rowTitle:{fontSize:12,fontWeight:'700',color:t.text},pingTabs:{gap:6,paddingVertical:12},pingTab:{borderWidth:1,borderColor:t.line,borderRadius:99,paddingHorizontal:10,paddingVertical:7,color:t.muted,fontSize:9},pingTabActive:{color:'#fff',backgroundColor:t.accent,borderColor:t.accent},legalLinks:{flexDirection:'row',gap:16,marginTop:16},legalText:{fontSize:10,fontWeight:'700',color:t.accent},
  viewer:{...StyleSheet.absoluteFillObject,zIndex:80,backgroundColor:'#000'},viewerShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.18)'},viewerClose:{position:'absolute',top:18,left:16,width:42,height:42,borderRadius:21,backgroundColor:'rgba(0,0,0,.42)',alignItems:'center',justifyContent:'center'},viewerBottom:{position:'absolute',left:18,right:18,bottom:40},viewerName:{color:'#fff',fontWeight:'800'},viewerSmall:{color:'rgba(255,255,255,.7)',fontSize:9,marginTop:2},viewerCaption:{color:'#fff',fontSize:16,marginTop:14,maxWidth:'80%'},viewerHint:{color:'rgba(255,255,255,.66)',fontSize:9,marginTop:9},
  profilePeek:{...StyleSheet.absoluteFillObject,zIndex:90,backgroundColor:t.bg,alignItems:'center',justifyContent:'center',padding:24},profileBack:{position:'absolute',top:20,left:18,width:42,height:42,borderRadius:21,backgroundColor:t.surface,alignItems:'center',justifyContent:'center'},profileAvatar:{width:122,height:122,borderRadius:61},profileName:{fontSize:28,fontWeight:'800',color:t.text,marginTop:14},profileMeta:{color:t.muted,marginTop:4},profileBio:{textAlign:'center',color:t.muted,maxWidth:370,marginTop:14},profileStats:{width:'100%',maxWidth:380,flexDirection:'row',justifyContent:'space-around',marginVertical:24},primary:{width:'100%',maxWidth:380,backgroundColor:t.accent,padding:13,borderRadius:14,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'800'},profileHint:{fontSize:9,color:t.muted,marginTop:15}
})}

export default App;
