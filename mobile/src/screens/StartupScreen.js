import React from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';

// Neutral account-loading and recovery UI: the approved StudentHood logo is
// rendered exactly once by the native Expo splash (mobile/app.json).
// This screen deliberately has NO logo, tagline or second brand animation.
export default function StartupScreen({theme,error,onRetry}){
  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    {error?
      <View style={styles.message}>
        <Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>
        {!!onRetry&&<Text accessibilityRole="button" onPress={onRetry} style={[styles.retry,{color:theme.accent}]}>Retry connection</Text>}
      </View>:
      <View style={styles.loading}>
        <ActivityIndicator color={theme.accent} size="small"/>
        <Text style={[styles.messageText,{color:theme.muted}]}>Opening StudentHood…</Text>
      </View>}
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  loading:{alignItems:'center',gap:12},
  messageText:{fontSize:12},
  message:{width:'100%',maxWidth:390,alignItems:'center',gap:17},
  error:{fontSize:12,textAlign:'center',lineHeight:20},
  retry:{fontSize:13,fontWeight:'800',padding:12}
});
