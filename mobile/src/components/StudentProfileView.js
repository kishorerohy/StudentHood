import React,{useRef,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Svg,{Defs,LinearGradient,Stop,Rect} from 'react-native-svg';
import CampusPresenceBadge from './CampusPresenceBadge';

// One consistent, real-data profile layout for your own profile and permitted
// student profiles. No fake verification badges or invented social counts.
export default function StudentProfileView({
  theme,student,avatarUrl,scenes=[],sceneCount=null,peepCount=null,
  onBack,onMenu,onEdit,onEditPhoto,actions=null,footer=null,own=false
}){
  const scroll=useRef(null);
  const [openScene,setOpenScene]=useState(null);
  const interests=Array.isArray(student?.interests)?
    student.interests.filter(value=>typeof value==='string'&&value.trim()):[];
  // Cover imagery is its own profile asset; never substitute a student's recent Scene.
  const coverUrl=student?.cover_signed_url||null;
  const handle=student?.username?'@'+student.username:'@student';
  const title=student?.full_name||student?.username||'Student';
  const initial=title[0]?.toUpperCase()||'S';
  const status=student?.campus_presence;
  const peeps=peepCount===null?'—':formatCount(peepCount);
  const posted=sceneCount===null?'—':formatCount(sceneCount);
  return <><ScrollView
    ref={scroll}
    style={[styles.scroll,{backgroundColor:theme.bg}]}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View style={[styles.cover,{backgroundColor:theme.isLight?'#2E383E':'#121C24'}]}>
      {!!coverUrl&&<Image source={{uri:coverUrl}} style={styles.coverImage} resizeMode="cover"/>}
      <View style={styles.coverShade}/>
      <Svg pointerEvents="none" style={styles.coverFade} width="100%" height="115">
        <Defs><LinearGradient id="profile-cover-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.bg} stopOpacity="0"/>
          <Stop offset="1" stopColor={theme.bg} stopOpacity="1"/>
        </LinearGradient></Defs>
        <Rect x="0" y="0" width="100%" height="115" fill="url(#profile-cover-fade)"/>
      </Svg>
      {!coverUrl&&<Feather name="book-open" size={80} color="rgba(255,255,255,0.10)" style={styles.coverPlaceholder}/>}
      <View style={styles.topBar}>
        {!!onBack?<Pressable onPress={onBack} style={styles.topAction} accessibilityRole="button" accessibilityLabel="Back to Scenes">
          <Feather name="arrow-left" size={24} color="#fff"/>
        </Pressable>:<View style={{width:43}}/>}

      </View>
    </View>

    <View style={styles.identity}>
      <Pressable
        disabled={!own||!onEditPhoto}
        onPress={onEditPhoto}
        accessibilityRole={own?'button':undefined}
        accessibilityLabel={own?'Change profile photo':undefined}
        style={[styles.avatarRing,{borderColor:theme.bg,backgroundColor:theme.surface2}]}>
        {avatarUrl?<Image source={{uri:avatarUrl}} style={styles.avatarPhoto}/>:<Text style={[styles.initial,{color:theme.accent}]}>{initial}</Text>}
        {own&&<View style={[styles.camera,{backgroundColor:theme.surface,borderColor:theme.bg}]}>
          <Feather name="camera" color={theme.text} size={14}/>
        </View>}
      </Pressable>
      <Text style={[styles.name,{color:theme.text}]}>{title}</Text>
      <Text style={[styles.handle,{color:theme.muted}]}>{handle}</Text>
      <CampusPresenceBadge status={status} theme={theme}/>
    </View>

    <View style={[styles.stats,{borderBottomColor:theme.line}]}>
      <Stat value={posted} label="Scenes" theme={theme}/>
      <View style={[styles.statDivider,{backgroundColor:theme.line}]}/>
      <Stat value={peeps} label="Peeps" theme={theme}/>
      <View style={[styles.statDivider,{backgroundColor:theme.line}]}/>
      <Stat value="—" label="Crews" theme={theme}/>
    </View>

    <View style={styles.info}>
      {!!student?.bio&&<Text style={[styles.bio,{color:theme.text}]}>{student.bio}</Text>}
      {!!interests.length&&<Text style={[styles.interests,{color:theme.muted}]}>{interests.join('   |   ')}</Text>}
      {!!student?.campus_name&&<Info icon="book-open" value={student.campus_name} theme={theme}/>}
      {!!student?.city&&<Info icon="map-pin" value={student.city} theme={theme}/>}
      {!!student?.website_url&&/^https:\/\//.test(student.website_url)&&
        <Text style={[styles.website,{color:theme.accent}]}>{student.website_url}</Text>}
    </View>

    {own?<View style={styles.actions}>
      <Pressable
        style={[styles.primary,{backgroundColor:theme.surface2,borderColor:theme.line}]}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit profile">
        <Text style={[styles.actionText,{color:theme.text}]}>Edit Profile</Text>
      </Pressable>
      <Pressable
        style={[styles.actionIcon,{backgroundColor:theme.surface2,borderColor:theme.line}]}
        onPress={onEditPhoto}
        accessibilityRole="button"
        accessibilityLabel="Edit profile picture">
        <Feather name="user" size={22} color={theme.text}/>
      </Pressable>
      {!!onMenu&&<Pressable onPress={onMenu} style={[styles.actionIcon,{backgroundColor:theme.surface2,borderColor:theme.line}]} accessibilityRole="button" accessibilityLabel="Profile options">
        <Feather name="more-horizontal" size={22} color={theme.text}/>
      </Pressable>}
    </View>:<View style={styles.actions}>{actions}{!!onMenu&&<Pressable onPress={onMenu} style={[styles.actionIcon,{backgroundColor:theme.surface2,borderColor:theme.line}]} accessibilityRole="button" accessibilityLabel="Profile options"><Feather name="more-horizontal" size={22} color={theme.text}/></Pressable>}</View>}

    {!!footer&&footer}

    <View style={styles.moments} accessibilityLabel="Recent Scenes">
      {scenes.filter(scene=>!!scene.media_signed_url&&scene.media_type==='image').slice(0,4).map(scene=>
        <Pressable key={scene.id} onPress={()=>setOpenScene(scene)} style={styles.moment} accessibilityRole="button" accessibilityLabel="View Scene">
          <View style={[styles.momentRing,{borderColor:theme.muted}]}>
            <Image source={{uri:scene.media_signed_url}} style={styles.momentImage}/>
          </View>
          <Text numberOfLines={1} style={[styles.momentLabel,{color:theme.muted}]}>Scene</Text>
        </Pressable>
      )}
    </View>

    <View style={styles.sceneSection}>
      <Text style={[styles.sceneTitle,{color:theme.text}]}>Scenes</Text>
      {scenes.length===0?
        <Text style={[styles.empty,{color:theme.muted}]}>No visible Scenes yet.</Text>:
        <View style={styles.grid}>
          {scenes.map(scene=><Pressable onPress={()=>setOpenScene(scene)} accessibilityRole="button" key={scene.id} style={[styles.tile,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            {scene.media_type==='image'&&scene.media_signed_url?
              <Image source={{uri:scene.media_signed_url}} style={styles.scenePhoto}/>:
              <View style={styles.fallback}>
                <Feather name={scene.media_type==='video'?'play-circle':'file-text'} size={30} color={theme.accent}/>
              </View>}
            {!!scene.body&&<Text numberOfLines={2} style={[styles.sceneCaption,{color:theme.text}]}>{scene.body}</Text>}
          </Pressable>)}
        </View>}
    </View>
  </ScrollView>
  <Modal visible={!!openScene} animationType="fade" statusBarTranslucent onRequestClose={()=>setOpenScene(null)}>
    <View style={styles.sceneOverlay}>
      <Pressable onPress={()=>setOpenScene(null)} accessibilityRole="button" accessibilityLabel="Close Scene" style={styles.closeScene}>
        <Feather name="x" size={27} color="#fff"/>
      </Pressable>
      {openScene?.media_type==='image'&&openScene?.media_signed_url?
        <Image resizeMode="contain" source={{uri:openScene.media_signed_url}} style={styles.openSceneImage}/>:
        <Feather name={openScene?.media_type==='video'?'play-circle':'file-text'} size={65} color="#fff"/>}
      {!!openScene?.body&&<Text style={styles.openSceneText}>{openScene.body}</Text>}
      {openScene?.media_type==='video'&&<Text style={styles.openSceneText}>Video playback will be enabled when Scenes media playback is available.</Text>}
    </View>
  </Modal></>;
}

function Stat({value,label,theme}){
  return <View style={styles.stat}>
    <Text style={[styles.statNumber,{color:theme.text}]}>{value}</Text>
    <Text style={[styles.statText,{color:theme.muted}]}>{label}</Text>
  </View>;
}
function Info({icon,value,theme}){
  return <View style={styles.infoRow}>
    <Feather name={icon} size={18} color={theme.text}/>
    <Text style={[styles.infoValue,{color:theme.text}]}>{value}</Text>
  </View>;
}
function formatCount(value){
  const n=Math.max(0,Number(value)||0);
  if(n>=1000000)return(n/1000000).toFixed(1).replace('.0','')+'M';
  if(n>=1000)return(n/1000).toFixed(1).replace('.0','')+'K';
  return String(n);
}

const styles=StyleSheet.create({
  scroll:{flex:1},
  content:{paddingBottom:125,maxWidth:790,width:'100%',alignSelf:'center'},
  cover:{height:235,position:'relative',overflow:'hidden'},
  coverImage:{height:'100%',width:'100%'},
  coverShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,10,16,0.28)'},
  coverFade:{position:'absolute',left:0,right:0,bottom:0}, 
  coverPlaceholder:{position:'absolute',alignSelf:'center',top:72},
  topBar:{position:'absolute',left:13,right:13,top:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  topAction:{width:43,height:43,borderRadius:22,backgroundColor:'rgba(5,10,16,0.35)',alignItems:'center',justifyContent:'center'},
  identity:{alignItems:'center',paddingHorizontal:15,marginTop:-59,gap:7,zIndex:2,elevation:2}, 
  avatarRing:{height:130,width:130,borderRadius:65,borderWidth:4,alignItems:'center',justifyContent:'center',overflow:'visible',elevation:10,shadowColor:'#000',shadowOpacity:0.23,shadowOffset:{width:0,height:8},shadowRadius:15}, 
  avatarPhoto:{width:'100%',height:'100%',borderRadius:63},
  initial:{fontSize:48,fontWeight:'800'},
  camera:{position:'absolute',bottom:2,right:1,width:29,height:29,borderRadius:15,borderWidth:2,alignItems:'center',justifyContent:'center'},
  name:{fontSize:27,fontWeight:'800',letterSpacing:-.6,textAlign:'center',marginTop:8},
  handle:{fontSize:14,textAlign:'center',marginBottom:7},
  stats:{flexDirection:'row',paddingHorizontal:22,paddingTop:20,paddingBottom:20,borderBottomWidth:StyleSheet.hairlineWidth,alignItems:'center',justifyContent:'center'},
  stat:{flex:1,alignItems:'center',gap:5},
  statNumber:{fontSize:20,fontWeight:'800'},
  statText:{fontSize:12},
  statDivider:{width:1,height:35},
  info:{paddingHorizontal:25,paddingTop:23,gap:14},
  bio:{fontSize:14,lineHeight:21},
  interests:{fontSize:13,lineHeight:20},
  infoRow:{flexDirection:'row',alignItems:'center',gap:12},
  infoValue:{fontSize:13,flex:1},
  website:{fontSize:12,textDecorationLine:'underline'},
  actions:{paddingHorizontal:20,paddingTop:22,flexDirection:'row',gap:12,alignItems:'center'},
  primary:{flex:1,height:50,borderWidth:1,borderRadius:26,alignItems:'center',justifyContent:'center'},
  actionText:{fontSize:14,fontWeight:'800'},
  actionIcon:{height:50,width:55,borderRadius:25,borderWidth:1,alignItems:'center',justifyContent:'center'},
  moments:{flexDirection:'row',justifyContent:'flex-start',gap:16,paddingHorizontal:25,paddingTop:24,flexWrap:'wrap'},
  moment:{width:65,alignItems:'center',gap:6},
  momentRing:{height:64,width:64,borderWidth:2,borderRadius:32,padding:3},
  momentImage:{height:'100%',width:'100%',borderRadius:29},
  momentLabel:{fontSize:11},
  sceneSection:{paddingHorizontal:20,marginTop:25},
  sceneTitle:{fontSize:19,fontWeight:'800',marginBottom:13},
  empty:{fontSize:12,paddingVertical:16},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  tile:{width:'48%',borderWidth:1,borderRadius:14,overflow:'hidden',minHeight:115},
  scenePhoto:{width:'100%',height:148},
  fallback:{height:110,alignItems:'center',justifyContent:'center'},
  sceneCaption:{padding:8,fontSize:12,lineHeight:17},
  sceneOverlay:{flex:1,backgroundColor:'#090B0D',alignItems:'center',justifyContent:'center',padding:24},
  closeScene:{position:'absolute',top:55,right:19,zIndex:2,padding:10},
  openSceneImage:{height:'74%',width:'100%'},
  openSceneText:{color:'#fff',fontSize:14,lineHeight:21,marginTop:15,textAlign:'center'}
});
