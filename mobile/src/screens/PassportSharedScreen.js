import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {getSharedPassportCard} from '../passport';

export default function PassportSharedScreen({theme,token,onBack}){
 const [card,setCard]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  getSharedPassportCard(token).then(v=>{if(active)setCard(v)}).catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[token]);
 return <View style={{flex:1,backgroundColor:theme.bg}}>
  <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={{padding:18,alignSelf:'flex-start'}}>
   <Feather name="arrow-left" size={22} color={theme.text}/>
  </Pressable>
  <ScrollView contentContainerStyle={styles.content}>
   <Feather name="award" size={32} color={theme.accent}/>
   {loading?<ActivityIndicator color={theme.accent}/>:
    card?<View style={[styles.card,{borderColor:theme.line,backgroundColor:theme.surface}]}>
      <Text style={{color:theme.text,fontSize:17,fontWeight:'900'}}>{card.title}</Text>
      <Text style={{color:theme.muted,fontSize:12}}>Evidence type: {String(card.assurance||'').replace(/_/g,' ')}</Text>
      <Text style={{color:theme.muted,fontSize:12}}>Recorded {new Date(card.issued_at).toLocaleDateString()}</Text>
      <Text style={{color:theme.muted,fontSize:12}}>Not a formal university qualification. Share access is time-limited and revocable.</Text>
    </View>:
    <Text style={{color:theme.muted}}>This Passport share is expired, revoked, restricted or unavailable.</Text>}
   {!!error&&<Text accessibilityRole="alert" style={{color:theme.danger}}>{error}</Text>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:60,gap:18,maxWidth:700,width:'100%',alignSelf:'center'},
 card:{borderWidth:1,borderRadius:19,padding:19,gap:11}});
