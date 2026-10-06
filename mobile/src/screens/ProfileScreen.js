import React from 'react';
import {Alert,Image,Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {signOut} from '../auth';
import {LEGAL_URLS} from '../config';

export default function ProfileScreen({theme,profile,safety,onSettings}){
  const initial=(profile?.full_name||profile?.username||'S').slice(0,1).toUpperCase();

  return <ScrollView style={{flex:1}} contentContainerStyle={styles.content}>
    <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.avatar,{backgroundColor:theme.surface2}]}>
        {profile?.avatar_url?<Image source={{uri:profile.avatar_url}} style={styles.avatarImage}/>:<Text style={[styles.initial,{color:theme.accent}]}>{initial}</Text>}
      </View>
      <Text style={[styles.name,{color:theme.text}]}>{profile?.full_name||'Student'}</Text>
      <Text style={[styles.handle,{color:theme.muted}]}>{profile?.username?'@'+profile.username:'Complete your username'}</Text>
      {!!profile?.bio&&<Text style={[styles.bio,{color:theme.muted}]}>{profile.bio}</Text>}
      <View style={styles.metaRow}>
        {!!profile?.campus_name&&<View style={[styles.metaPill,{backgroundColor:theme.surface2}]}><Feather name="book-open" size={13} color={theme.accent}/><Text style={[styles.metaText,{color:theme.text}]}>{profile.campus_name}</Text></View>}
        {!!profile?.city&&<View style={[styles.metaPill,{backgroundColor:theme.surface2}]}><Feather name="map-pin" size={13} color={theme.accent}/><Text style={[styles.metaText,{color:theme.text}]}>{profile.city}</Text></View>}
      </View>
      {safety?.youth_account&&<View style={[styles.teen,{backgroundColor:theme.accentSoft,borderColor:theme.line}]}><Feather name="shield" size={16} color={theme.accent}/><View style={{flex:1}}><Text style={[styles.teenTitle,{color:theme.text}]}>Teen Mode active</Text><Text style={[styles.teenCopy,{color:theme.muted}]}>Private profile, safer recommendations, Peep-only Pings and local quiet hours.</Text></View></View>}
      {safety?.age_conflict&&<View style={[styles.teen,{backgroundColor:theme.surface2,borderColor:theme.line}]}><Feather name="alert-triangle" size={16} color={theme.accent}/><View style={{flex:1}}><Text style={[styles.teenTitle,{color:theme.text}]}>Age information needs review</Text><Text style={[styles.teenCopy,{color:theme.muted}]}>StudentHood is using the younger age category until the conflicting age signals are resolved.</Text></View></View>}
    </View>

    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Text style={[styles.sectionTitle,{color:theme.text}]}>Account</Text>
      <Row icon="edit-3" title="Edit Profile" copy="Name, bio, campus and interests" theme={theme}/>
      <Row icon="settings" title="Settings" copy="Privacy, safety, notifications and account" theme={theme} onPress={onSettings}/>
    </View>

    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Text style={[styles.sectionTitle,{color:theme.text}]}>Age & safety</Text>
      <Row icon="shield" title="Age assurance" copy={safety?.adult_access_verified?'Adult status independently verified':safety?.youth_account?'Teen protections active':'Adult-classified content remains locked until person-level verification'} theme={theme}/>
      <Row icon="clock" title="Platform age signal" copy={profile?.platform_age_status==='shared'?'Age range received from '+(profile?.platform_age_provider||'platform'):profile?.platform_age_status==='verification_required'?'Platform verification required':'No platform age range currently shared'} theme={theme}/>
    </View>

    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Text style={[styles.sectionTitle,{color:theme.text}]}>Legal & safety</Text>
      <Row icon="shield" title="Safety" theme={theme} onPress={()=>Linking.openURL(LEGAL_URLS.safety)}/>
      <Row icon="lock" title="Privacy" theme={theme} onPress={()=>Linking.openURL(LEGAL_URLS.privacy)}/>
      <Row icon="file-text" title="Terms" theme={theme} onPress={()=>Linking.openURL(LEGAL_URLS.terms)}/>
    </View>

    <Pressable onPress={async()=>{try{await signOut()}catch(e){Alert.alert('Could not sign out',e?.message||'Please try again.')}}} style={[styles.signOut,{borderColor:theme.line,backgroundColor:theme.surface}]}>
      <Feather name="log-out" size={17} color={theme.danger}/>
      <Text style={[styles.signOutText,{color:theme.danger}]}>Sign out</Text>
    </Pressable>
  </ScrollView>;
}

function Row({icon,title,copy,theme,onPress}){
  return <Pressable disabled={!onPress} onPress={onPress} style={[styles.row,{borderTopColor:theme.line}]}>
    <View style={[styles.rowIcon,{backgroundColor:theme.surface2}]}><Feather name={icon} size={16} color={theme.accent}/></View>
    <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>{title}</Text>{!!copy&&<Text style={[styles.rowCopy,{color:theme.muted}]}>{copy}</Text>}</View>
    <Feather name="chevron-right" size={17} color={theme.muted}/>
  </Pressable>;
}

const styles=StyleSheet.create({
  content:{padding:14,paddingBottom:120,gap:14,maxWidth:780,width:'100%',alignSelf:'center'},
  hero:{borderWidth:1,borderRadius:22,padding:22,alignItems:'center'},
  avatar:{width:96,height:96,borderRadius:48,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarImage:{width:'100%',height:'100%'},
  initial:{fontSize:36,fontWeight:'900'},
  name:{fontSize:25,fontWeight:'800',letterSpacing:-.6,marginTop:12},
  handle:{fontSize:11,marginTop:4},
  bio:{fontSize:12,lineHeight:18,textAlign:'center',maxWidth:430,marginTop:12},
  metaRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7,marginTop:14},
  metaPill:{flexDirection:'row',alignItems:'center',gap:6,borderRadius:99,paddingHorizontal:10,paddingVertical:7},
  metaText:{fontSize:9,fontWeight:'700'},
  teen:{width:'100%',flexDirection:'row',gap:10,borderWidth:1,borderRadius:15,padding:13,marginTop:16},
  teenTitle:{fontSize:11,fontWeight:'800'},
  teenCopy:{fontSize:9,lineHeight:14,marginTop:2},
  card:{borderWidth:1,borderRadius:20,padding:14},
  sectionTitle:{fontSize:15,fontWeight:'800',marginBottom:6},
  row:{minHeight:60,borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:10},
  rowIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowTitle:{fontSize:11,fontWeight:'800'},
  rowCopy:{fontSize:9,marginTop:3},
  signOut:{height:52,borderWidth:1,borderRadius:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  signOutText:{fontSize:11,fontWeight:'900'}
});
