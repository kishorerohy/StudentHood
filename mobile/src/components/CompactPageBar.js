import React from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {Feather} from '@expo/vector-icons';

// Shared heading-free chrome for StudentHood pages. Page identities remain
// available to screen readers via action labels; no large repeated page title.
export default function CompactPageBar({
  theme,onBack,backLabel='Back',children,border=true,
  width=980
}){
  return <View style={[styles.bar,{
    borderBottomColor:border?theme.line:'transparent',
    borderBottomWidth:border?StyleSheet.hairlineWidth:0
  }]}>
    {onBack&&<Pressable accessibilityRole="button" accessibilityLabel={backLabel}
      onPress={onBack} hitSlop={8}
      style={[styles.back,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <Feather name="arrow-left" size={21} color={theme.text}/>
    </Pressable>}
    <View style={styles.spacer}/>
    {children}
  </View>;
}
const styles=StyleSheet.create({
  bar:{minHeight:55,flexDirection:'row',alignItems:'center',gap:9,
    paddingHorizontal:14,width:'100%',maxWidth:980,alignSelf:'center'},
  back:{height:43,width:43,borderRadius:14,borderWidth:1,
    alignItems:'center',justifyContent:'center'},
  spacer:{flex:1}
});
