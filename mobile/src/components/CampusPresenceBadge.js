import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';

// Public-facing badge is deliberately absent for a hidden status.
export default function CampusPresenceBadge({status,theme}){
  if(status!=='on_campus'&&status!=='off_campus') return null;
  const isOn=status==='on_campus';
  const color=isOn?'#5BD5A8':'#F08778';
  return <View style={[styles.badge,{backgroundColor:theme.isLight?'rgba(255,255,255,0.75)':'rgba(24,32,40,0.7)',borderColor:color}]}>
    <Feather name={isOn?'book-open':'home'} size={15} color={color}/>
    <Text style={[styles.label,{color:theme.text}]}>{isOn?'On campus':'Off campus'}</Text>
  </View>;
}

const styles=StyleSheet.create({
  badge:{flexDirection:'row',gap:7,alignItems:'center',alignSelf:'center',borderWidth:1,borderRadius:99,paddingHorizontal:11,paddingVertical:7},
  label:{fontWeight:'800',fontSize:11}
});
