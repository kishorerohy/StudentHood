import React,{useRef} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import CampusPresenceBadge from './CampusPresenceBadge';

// One consistent, real-data profile layout for your own profile and permitted
// student profiles. No fake verification badges or invented social counts.
export default function StudentProfileView({
  theme,student,avatarUrl,scenes=[],sceneCount=null,peepCount=null,
  onBack,onMenu,onEdit,onEditPhoto,actions=null,footer=null,own=false
}){
  const scroll=useRef(null);
  const interests=Array.isArray(student?.interests)?
    student.interests.filter(value=>typeof value==='string'&&value.trim()):[];
  const photoScene=scenes.find(item=>item.media_type==='image'&&item.media_signed_url);
  const coverUrl=student?.cover_signed_url||photoScene?.media_signed_url||null;
  const handle=student?.username?'@'+student.username:'@student';
  const title=student?.full_name||student?.username||'Student';
  const initial=title[0]?.toUpperCase()||'S';
  const status=student?.campus_presence;
  const peeps=peepCount===null?'—':formatCount(peepCount);
  const posted=sceneCount===null?'—':formatCount(sceneCount);
  return <ScrollView
    ref={scroll}
    style={[styles.scroll,{backgroundColor:theme.bg}]}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View style={[styles.cover,{backgroundColor:theme.isLight?'#2E383E':'#121C24'}]}>
      {!!coverUrl&&<Image source={{uri:coverUrl}} style={styles.coverImage} resizeMode="cover"/>}
      <View style={styles.coverShade}/>
      {!coverUrl&&<Feather name="book-open" size={80} color="rgba(255,255,255,0.10)" style={styles.coverPlaceholder}/>}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.topAction} accessibilityRole="button" accessibilityLabel="Back to Scenes">
          <Feather name="arrow-left" size={24} color="#fff"/>
        </Pressable>
        {!!onMenu&&<Pressable onPress={onMenu} style={styles.topAction} accessibilityRole="button" accessibilityLabel="Profile options">
          <Feather name="more-horizontal" size={25} color="#fff"/>
        </Pressable>}
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
    </View>:actions}

    {!!footer&&footer}

    <View style={styles.moments} accessibilityLabel="Recent Scenes">
      {scenes.filter(scene=>!!scene.media_signed_url&&scene.media_type==='image').slice(0,4).map(scene=>
        <Pressable key={scene.id} onPress={()=>scroll.current?.scrollToEnd({animated:true})} style={styles.moment} accessibilityRole="button" accessibilityLabel="View recent Scenes">
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
          {scenes.map(scene=><View key={scene.id} style={[styles.tile,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            {scene.media_type==='image'&&scene.media_signed_url?
              <Image source={{uri:scene.media_signed_url}} style={styles.scenePhoto}/>:
              <View style={styles.fallback}>
                <Feather name={scene.media_type==='video'?'play-circle':'file-text'} size={30} color={theme.accent}/>
              </View>}
            {!!scene.body&&<Text numberOfLines={2} style={[styles.sceneCaption,{color:theme.text}]}>{scene.body}</Text>}
          </View>)}
        </View>}
    </View>
  </ScrollView>;
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
  coverShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,10,16,0.45)'},
  coverPlaceholder:{position:'absolute',alignSelf:'center',top:72},
  topBar:{position:'absolute',left:13,right:13,top:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  topAction:{width:43,height:43,borderRadius:22,backgroundColor:'rgba(5,10,16,0.35)',alignItems:'center',justifyContent:'center'},
  identity:{alignItems:'center',paddingHorizontal:15,marginTop:-59,gap:7},
  avatarRing:{height:130,width:130,borderRadius:65,borderWidth:4,alignItems:'center',justifyContent:'center',overflow:'visible'},
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
  sceneCaption:{padding:8,fontSize:12,lineHeight:17}
});
