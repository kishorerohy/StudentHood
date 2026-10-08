import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getAvatarDisplayUrl,getMySceneCount} from '../api';

export default function ProfileScreen({theme,profile,onMenu,onEdit,onEditPicture,reloadKey=0}){
  const [sceneCount,setSceneCount]=useState(null);
  const [avatarUrl,setAvatarUrl]=useState(null);
  useEffect(()=>{
    let alive=true;
    setSceneCount(null);
    getMySceneCount().then(n=>{if(alive)setSceneCount(n)}).catch(()=>{if(alive)setSceneCount(null)});
    return()=>{alive=false};
  },[profile?.id,reloadKey]);
  useEffect(()=>{
    let alive=true;
    getAvatarDisplayUrl(profile?.avatar_url).then(url=>{if(alive)setAvatarUrl(url)}).catch(()=>{if(alive)setAvatarUrl(null)});
    return()=>{alive=false};
  },[profile?.avatar_url,reloadKey]);

  const initial=(profile?.full_name||profile?.username||'S').slice(0,1).toUpperCase();
  const presence=profile?.campus_presence==='on_campus'?'On campus':
    profile?.campus_presence==='off_campus'?'Off campus':'Not shared';
  const identity=profile?.id?profile.id.slice(0,8).toUpperCase():'Unavailable';

  return <ScrollView style={{flex:1,backgroundColor:theme.bg}} contentContainerStyle={styles.content}>
    <View style={styles.topRow}>
      <Text style={[styles.label,{color:theme.text}]}>Profile</Text>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Profile menu" style={[styles.menuButton,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name="menu" size={24} color={theme.text}/>
      </Pressable>
    </View>

    <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Pressable onPress={onEditPicture} accessibilityRole="button" accessibilityLabel="Edit profile photo" style={styles.avatarWrap}>
        <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
          {avatarUrl?<Image source={{uri:avatarUrl}} style={styles.avatarImage}/>:<Text style={[styles.initial,{color:theme.accent}]}>{initial}</Text>}
        </View>
        <View style={[styles.camera,{backgroundColor:theme.accent}]}><Feather name="camera" size={16} color="#fff"/></View>
      </Pressable>
      <Text style={[styles.name,{color:theme.text}]}>{profile?.full_name||'Student'}</Text>
      <Text style={[styles.handle,{color:theme.muted}]}>{profile?.username?'@'+profile.username:'Complete your username'}</Text>
      <Text style={[styles.idText,{color:theme.muted}]}>Student ID · {identity}</Text>
      {!!profile?.bio&&<Text style={[styles.bio,{color:theme.muted}]}>{profile.bio}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={[styles.primary,{backgroundColor:theme.accent}]} accessibilityRole="button">
          <Feather name="edit-3" size={15} color="#fff"/><Text style={styles.primaryText}>Edit profile</Text>
        </Pressable>
        <Pressable onPress={onEditPicture} style={[styles.secondary,{borderColor:theme.line,backgroundColor:theme.surface2}]} accessibilityRole="button">
          <Feather name="camera" size={16} color={theme.text}/><Text style={[styles.secondaryText,{color:theme.text}]}>Edit photo</Text>
        </Pressable>
      </View>
    </View>

    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Text style={[styles.sectionTitle,{color:theme.text}]}>Your campus</Text>
      <InfoLine theme={theme} icon="book-open" label="Institution" value={profile?.campus_name||'Not selected'}/>
      <InfoLine theme={theme} icon="map-pin" label="City / location" value={profile?.city||'Not shared'}/>
      <InfoLine theme={theme} icon="navigation" label="Campus status" value={presence}/>
      <Text style={[styles.note,{color:theme.muted}]}>Campus status is set by you. StudentHood does not track your live location.</Text>
    </View>

    <View style={styles.stats}>
      <View style={[styles.stat,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name="film" size={21} color={theme.accent}/>
        <Text style={[styles.statCount,{color:theme.text}]}>{sceneCount===null?'—':String(sceneCount)}</Text>
        <Text style={[styles.statLabel,{color:theme.muted}]}>Scenes posted</Text>
      </View>
      <View style={[styles.stat,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Feather name="users" size={21} color={theme.accent}/>
        <Text style={[styles.statCount,{color:theme.text,fontSize:14}]}>Coming soon</Text>
        <Text style={[styles.statLabel,{color:theme.muted}]}>Crews joined</Text>
      </View>
    </View>
  </ScrollView>;
}

function InfoLine({theme,icon,label,value}){
  return <View style={[styles.infoLine,{borderTopColor:theme.line}]}>
    <Feather name={icon} size={18} color={theme.accent}/>
    <View style={{flex:1}}>
      <Text style={[styles.infoLabel,{color:theme.muted}]}>{label}</Text>
      <Text style={[styles.infoValue,{color:theme.text}]}>{value}</Text>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  content:{padding:16,paddingBottom:120,gap:14,maxWidth:780,width:'100%',alignSelf:'center'},
  topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  label:{fontSize:25,fontWeight:'900'},
  menuButton:{width:44,height:44,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},
  hero:{borderWidth:1,borderRadius:24,padding:20,alignItems:'center'},
  avatarWrap:{position:'relative',marginBottom:8},
  avatar:{width:106,height:106,borderRadius:53,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarImage:{height:'100%',width:'100%'},
  camera:{position:'absolute',bottom:0,right:0,width:33,height:33,borderRadius:17,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#fff'},
  initial:{fontSize:42,fontWeight:'900'},
  name:{fontSize:25,fontWeight:'900',letterSpacing:-.6,marginTop:10,textAlign:'center'},
  handle:{fontSize:12,marginTop:5},
  idText:{fontSize:10,marginTop:7},
  bio:{fontSize:12,lineHeight:19,textAlign:'center',marginTop:12,maxWidth:460},
  actions:{flexDirection:'row',gap:9,marginTop:20,width:'100%'},
  primary:{flex:1,flexDirection:'row',height:44,alignItems:'center',justifyContent:'center',borderRadius:13,gap:7},
  primaryText:{fontWeight:'800',fontSize:12,color:'#fff'},
  secondary:{flex:1,flexDirection:'row',height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:13,gap:7},
  secondaryText:{fontSize:12,fontWeight:'800'},
  card:{borderWidth:1,borderRadius:22,padding:16},
  sectionTitle:{fontSize:17,fontWeight:'900',marginBottom:7},
  infoLine:{borderTopWidth:StyleSheet.hairlineWidth,minHeight:59,flexDirection:'row',alignItems:'center',gap:12},
  infoLabel:{fontSize:10,marginBottom:3},
  infoValue:{fontSize:12,fontWeight:'800'},
  note:{fontSize:10,lineHeight:15,marginTop:8},
  stats:{flexDirection:'row',gap:12},
  stat:{flex:1,borderWidth:1,borderRadius:20,paddingVertical:22,paddingHorizontal:10,alignItems:'center',minHeight:135},
  statCount:{fontSize:25,fontWeight:'900',marginTop:12},
  statLabel:{fontSize:11,marginTop:5,textAlign:'center'}
});
