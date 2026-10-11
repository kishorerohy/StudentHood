import React from 'react';
import {ActivityIndicator,Image,StatusBar,StyleSheet,Text,View} from 'react-native';

// This is the user's approved white startup screen. The matching native Expo
// splash uses the same logo/background, so there is no black-to-white flash.
const STARTUP_LOGO=require('../../assets/studenthood-logo-light.png');

export default function StartupScreen({theme,error,onRetry}){
  return <View style={styles.root}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
    <View style={styles.center}>
      <Image source={STARTUP_LOGO} style={styles.logo} resizeMode="contain"/>
      <Text style={styles.tagline}>YOUR CAMPUS. YOUR PEOPLE.</Text>
      {error?
        <View style={styles.message}>
          <Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>
          {!!onRetry&&<Text accessibilityRole="button" onPress={onRetry} style={[styles.retry,{color:theme.accent}]}>Retry connection</Text>}
        </View>:
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} size="small"/>
          <Text style={styles.messageText}>Opening StudentHood…</Text>
        </View>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#FFFFFF'},
  center:{width:'100%',maxWidth:390,alignItems:'center'},
  logo:{width:250,height:76},
  tagline:{fontSize:10,fontWeight:'800',letterSpacing:2.3,marginTop:12,color:'#706E6B'},
  loading:{alignItems:'center',gap:12,marginTop:46},
  messageText:{fontSize:12,color:'#706E6B'},
  message:{width:'100%',alignItems:'center',gap:17,marginTop:38},
  error:{fontSize:12,textAlign:'center',lineHeight:20},
  retry:{fontSize:13,fontWeight:'800',padding:12}
});
