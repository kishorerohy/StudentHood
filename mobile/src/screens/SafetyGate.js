import React from 'react';
import {Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {signOut} from '../auth';
import {LEGAL_URLS} from '../config';

const COPY={
  quiet_hours:{
    icon:'moon',
    kicker:'TEEN MODE',
    title:'StudentHood is paused for tonight.',
    body:'Under-18 accounts pause at 7:00 PM in their saved local time zone and reopen at 7:00 AM.',
    note:'Your account, Peeps, Scenes and Pings stay safe while access is paused.'
  },
  guardian_consent_required:{
    icon:'shield',
    kicker:'GUARDIAN APPROVAL',
    title:'A parent or guardian needs to approve this account.',
    body:'Your country or region requires verified guardian permission before StudentHood can activate this account.',
    note:'Your profile is saved. StudentHood will continue after the required verification flow is completed.'
  },
  regional_age_restriction:{
    icon:'lock',
    kicker:'REGIONAL AGE REQUIREMENT',
    title:'StudentHood is not available for this age in your region.',
    body:'Some countries set a higher minimum age for social-media accounts.',
    note:'StudentHood applies the local requirement even when younger users are permitted elsewhere.'
  },
  platform_age_verification_required:{
    icon:'shield',
    kicker:'AGE CHECK REQUIRED',
    title:'Your platform needs an age check.',
    body:'Google Play or the device platform requires age verification before StudentHood can continue in this region.',
    note:'StudentHood will not guess your age or treat an adult Google or Apple account as proof that the current user is an adult.'
  },
  safety_setup_required:{
    icon:'shield',
    kicker:'SAFETY SETUP',
    title:'Finish your safety setup.',
    body:'StudentHood needs your date of birth, country or region and saved time zone before opening the app.',
    note:'These details are used for age-appropriate protections and are not public profile data.'
  }
};

export default function SafetyGate({theme,policy}){
  const item=COPY[policy?.reason]||{
    icon:'shield',kicker:'STUDENTHOOD SAFETY',title:'This account is paused.',
    body:'StudentHood cannot open this account right now.',note:'Visit Safety for more information.'
  };

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.icon,{backgroundColor:theme.accentSoft}]}><Feather name={item.icon} size={29} color={theme.accent}/></View>
      <Text style={[styles.kicker,{color:theme.accent}]}>{item.kicker}</Text>
      <Text style={[styles.title,{color:theme.text}]}>{item.title}</Text>
      <Text style={[styles.body,{color:theme.muted}]}>{item.body}</Text>
      <View style={[styles.note,{backgroundColor:theme.surface2,borderColor:theme.line}]}>
        <Text style={[styles.noteText,{color:theme.muted}]}>{item.note}</Text>
        {policy?.time_zone&&<Text style={[styles.zone,{color:theme.text}]}>Local time zone: {policy.time_zone}</Text>}
      </View>
      <Pressable onPress={()=>Linking.openURL(LEGAL_URLS.safety)} style={[styles.primary,{backgroundColor:theme.accent}]}>
        <Text style={styles.primaryText}>How safety works</Text>
      </Pressable>
      <Pressable onPress={signOut} style={styles.secondary}><Text style={[styles.secondaryText,{color:theme.muted}]}>Sign out</Text></Pressable>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:520,borderWidth:1,borderRadius:28,padding:26,alignItems:'center'},
  icon:{width:68,height:68,borderRadius:34,alignItems:'center',justifyContent:'center',marginBottom:18},
  kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.7},
  title:{fontSize:34,lineHeight:37,fontWeight:'800',letterSpacing:-1.2,textAlign:'center',marginTop:8},
  body:{fontSize:13,lineHeight:20,textAlign:'center',marginTop:13},
  note:{width:'100%',borderWidth:1,borderRadius:16,padding:14,marginTop:20},
  noteText:{fontSize:11,lineHeight:17,textAlign:'center'},
  zone:{fontSize:10,fontWeight:'800',textAlign:'center',marginTop:7},
  primary:{width:'100%',height:50,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:20},
  primaryText:{color:'#fff',fontSize:12,fontWeight:'900'},
  secondary:{padding:12,marginTop:4},
  secondaryText:{fontSize:11,fontWeight:'800'}
});
