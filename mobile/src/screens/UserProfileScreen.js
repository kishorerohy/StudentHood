import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getAvatarDisplayUrl,getProfileCard} from '../api';

export default function UserProfileScreen({userId,theme,onBack}){
 const [card,setCard]=useState(null);
 const [loading,setLoading]=useState(true);
 const [avatar,setAvatar]=useState(null);
 useEffect(()=>{
  let live=true;
  setLoading(true);
  getProfileCard(userId).then(async result=>{
   if(!live)return;
   setCard(result);
   const image=await getAvatarDisplayUrl(result?.avatar_url);
   if(live)setAvatar(image);
  }).catch(()=>{if(live)setCard(null)}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[userId]);
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <View style={[styles.header,{borderBottomColor:theme.line}]}>
   <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={22} color={theme.text}/></Pressable>
   <Text style={[styles.headerTitle,{color:theme.text}]}>Student profile</Text>
   <View style={{width:42}}/>
  </View>
  <ScrollView contentContainerStyle={styles.content}>
   {loading?<ActivityIndicator color={theme.accent} style={{marginTop:80}}/>:
    !card?<Text style={[styles.unavailable,{color:theme.muted}]}>This profile isn't available to you.</Text>:
    <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
     <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
      {avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<Feather name="user" size={45} color={theme.accent}/>}
     </View>
     <Text style={[styles.name,{color:theme.text}]}>{card.full_name||card.username||'Student'}</Text>
     {!!card.username&&<Text style={[styles.handle,{color:theme.muted}]}>@{card.username}</Text>}
     {!!card.bio&&<Text style={[styles.bio,{color:theme.muted}]}>{card.bio}</Text>}
     {!!card.campus_name&&<View style={styles.info}><Feather name="book-open" color={theme.accent} size={16}/><Text style={[styles.infoText,{color:theme.text}]}>{card.campus_name}</Text></View>}
     {!!card.city&&<View style={styles.info}><Feather name="map-pin" color={theme.accent} size={16}/><Text style={[styles.infoText,{color:theme.text}]}>{card.city}</Text></View>}
     <View style={[styles.pingState,{backgroundColor:theme.surface2}]}>
      <Feather name="message-circle" size={17} color={theme.muted}/>
      <Text style={[styles.pingCopy,{color:theme.muted}]}>{card.can_ping?'Ping messaging is coming soon.':'Ping is available according to Peep and safety permissions.'}</Text>
     </View>
    </View>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},
 header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
 back:{height:42,width:42,alignItems:'center',justifyContent:'center'},
 headerTitle:{fontSize:19,fontWeight:'800'},
 content:{padding:18,paddingBottom:60,maxWidth:800,width:'100%',alignSelf:'center'},
 hero:{borderWidth:1,borderRadius:22,padding:22,alignItems:'center'},
 avatar:{width:108,height:108,borderRadius:54,overflow:'hidden',alignItems:'center',justifyContent:'center'},
 avatarImage:{width:'100%',height:'100%'},
 name:{fontSize:25,fontWeight:'900',marginTop:15,textAlign:'center'},
 handle:{fontSize:12,marginTop:6},
 bio:{fontSize:13,marginTop:13,textAlign:'center',lineHeight:19},
 info:{marginTop:13,flexDirection:'row',alignItems:'center',gap:9},
 infoText:{fontSize:12,fontWeight:'700'},
 pingState:{width:'100%',marginTop:25,padding:15,borderRadius:15,flexDirection:'row',alignItems:'center',gap:12},
 pingCopy:{fontSize:11,lineHeight:17,flex:1},
 unavailable:{marginTop:80,textAlign:'center',fontSize:13}
});