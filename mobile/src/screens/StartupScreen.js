import React from 'react';
import {ActivityIndicator,Image,StyleSheet,Text,View} from 'react-native';

const LOGO_DARK=require('../../assets/studenthood-logo.png');
const LOGO_LIGHT=require('../../assets/studenthood-logo-light.png');

// The approved branding is the first rendered app surface while Supabase
// restores the session, profile and age/guardian policy. No invented user data.
export default function StartupScreen({theme,error,onRetry}){
  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={styles.center}>
      <Image source={theme.isLight?LOGO_LIGHT:LOGO_DARK} style={styles.logo} resizeMode="contain"/>
      <Text style={[styles.tagline,{color:theme.muted}]}>YOUR CAMPUS. YOUR PEOPLE.</Text>
      {error?
        <View style={styles.message}>
          <Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>
          {!!onRetry&&<Text accessibilityRole="button" onPress={onRetry} style={[styles.retry,{color:theme.accent}]}>Retry connection</Text>}
        </View>:
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} size="small"/>
          <Text style={[styles.messageText,{color:theme.muted}]}>Opening StudentHood…</Text>
        </View>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  center:{width:'100%',maxWidth:390,alignItems:'center'},
  logo:{width:250,height:76},
  tagline:{fontSize:10,fontWeight:'800',letterSpacing:2.3,marginTop:12},
  loading:{alignItems:'center',gap:12,marginTop:46},
  messageText:{fontSize:12},
  message:{width:'100%',alignItems:'center',gap:17,marginTop:38},
  error:{fontSize:12,textAlign:'center',lineHeight:20},
  retry:{fontSize:13,fontWeight:'800',padding:12}
});
