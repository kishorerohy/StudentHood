import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {SceneIcon} from '../icons';

export default function CreateOptionsScreen({theme,onBack,onScene,onPulse,onHang,onGig}){
 const options=[
  {name:'Post a Scene',icon:'scene',copy:'Share a photo, video or post',onPress:onScene},
  {name:'Add to Pulse',icon:'circle',copy:'Quick campus moments',onPress:onPulse},
  {name:'Start a Hang',icon:'calendar',copy:'Campus meetups',onPress:onHang},
  {name:'Post a Gig',icon:'briefcase',copy:'Student opportunities',onPress:onGig}
 ];
 return <View style={[styles.root,{backgroundColor:theme.bg}]}>
  <View style={[styles.header,{borderBottomColor:theme.line}]}>
   <Pressable onPress={onBack} accessibilityLabel="Back" style={styles.back}><Feather name="arrow-left" size={22} color={theme.text}/></Pressable>
   <Text style={[styles.title,{color:theme.text}]}>Create</Text>
   <View style={{width:42}}/>
  </View>
  <ScrollView contentContainerStyle={styles.content}>
   <Text style={[styles.intro,{color:theme.muted}]}>What would you like to share with your campus?</Text>
   {options.map(option=><Pressable key={option.name} onPress={option.onPress} accessibilityRole="button" style={[styles.row,{backgroundColor:theme.surface,borderColor:theme.line}]}>
    <View style={[styles.icon,{backgroundColor:theme.accentSoft}]}>
     {option.icon==='scene'?<SceneIcon color={theme.accent} size={23}/>:<Feather name={option.icon} size={23} color={theme.accent}/>}
    </View>
    <View style={{flex:1}}><Text style={[styles.name,{color:theme.text}]}>{option.name}</Text><Text style={[styles.copy,{color:theme.muted}]}>{option.copy}</Text></View>
    <Feather name="chevron-right" size={20} color={theme.muted}/>
   </Pressable>)}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},
 header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 back:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 title:{fontSize:21,fontWeight:'900'},
 content:{padding:18,paddingBottom:70,width:'100%',maxWidth:800,alignSelf:'center',gap:12},
 intro:{fontSize:12,lineHeight:18,marginBottom:8},
 row:{minHeight:81,borderWidth:1,borderRadius:17,alignItems:'center',flexDirection:'row',padding:14,gap:14},
 icon:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'},
 name:{fontSize:14,fontWeight:'900'},
 copy:{fontSize:11,marginTop:6,lineHeight:16}
});