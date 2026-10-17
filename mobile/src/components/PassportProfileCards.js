import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getExperienceFlags} from '../experiences';
import {getVisiblePassportCards} from '../passport';

export default function PassportProfileCards({profileId,theme}){
 const [cards,setCards]=useState([]);
 useEffect(()=>{
  if(!profileId)return;
  let active=true;
  (async()=>{
   const flags=await getExperienceFlags();
   if(!flags.passport)return;
   const rows=await getVisiblePassportCards(profileId);
   if(active)setCards(rows);
  })().catch(()=>{if(active)setCards([])});
  return()=>{active=false};
 },[profileId]);
 if(!cards.length)return null;
 return <View style={styles.wrap} accessibilityLabel="Opt-in verified activity cards">
  {cards.map(card=><View key={card.id} style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
   <Feather name="award" color={theme.accent} size={19}/>
   <View style={{flex:1}}>
    <Text style={[styles.title,{color:theme.text}]}>{card.title}</Text>
    <Text style={[styles.description,{color:theme.muted}]}>{String(card.assurance||'').replace(/_/g,' ')} · {new Date(card.issued_at).toLocaleDateString()}</Text>
   </View>
  </View>)}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{paddingHorizontal:18,gap:8,paddingVertical:8},
 card:{padding:12,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:9},
 title:{fontSize:12,fontWeight:'900'},description:{fontSize:10,lineHeight:16}
});
