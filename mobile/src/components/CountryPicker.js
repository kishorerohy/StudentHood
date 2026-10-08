import React,{useMemo,useState} from 'react';
import {FlatList,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as Localization from 'expo-localization';
import {Feather} from '@expo/vector-icons';
import {countryName,countryOptions} from '../countries';

export default function CountryPicker({theme,value,onOpen,disabled=false}){
 const locale=Localization.getLocales?.()[0]?.languageTag||'en';
 const label=value?countryName(value,locale):'Country or region';
 return <Pressable disabled={disabled} onPress={onOpen} accessibilityRole="button"
  style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line,opacity:disabled?.8:1}]}>
  <Feather name="globe" size={18} color={theme.muted}/>
  <Text style={[styles.fieldText,{color:value?theme.text:theme.muted}]}>{label}</Text>
  <Feather name={disabled?'lock':'chevron-right'} size={17} color={theme.muted}/>
 </Pressable>;
}

export function CountryPickerPage({theme,onBack,onSelect}){
 const [query,setQuery]=useState('');
 const locale=Localization.getLocales?.()[0]?.languageTag||'en';
 const options=useMemo(()=>countryOptions(locale),[locale]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return options.filter(item=>!q||item.name.toLowerCase().includes(q)||item.code.toLowerCase().includes(q));
 },[options,query]);

 return <View style={[styles.page,{backgroundColor:theme.bg}]}>
  <View style={[styles.top,{borderBottomColor:theme.line}]}>
   <Pressable onPress={onBack} accessibilityLabel="Back" style={styles.back}>
    <Feather name="arrow-left" size={23} color={theme.text}/>
   </Pressable>
   <Text style={[styles.title,{color:theme.text}]}>Country or region</Text>
   <View style={{width:42}}/>
  </View>
  <View style={[styles.search,{backgroundColor:theme.surface,borderColor:theme.line}]}>
   <Feather name="search" size={18} color={theme.muted}/>
   <TextInput value={query} onChangeText={setQuery} placeholder="Search countries" placeholderTextColor={theme.muted} style={[styles.searchInput,{color:theme.text}]}/>
  </View>
  <View style={styles.listHeader}>
   <Text style={[styles.listHeaderText,{color:theme.muted}]}>Country or region</Text>
   <Text style={[styles.listHeaderText,{color:theme.muted}]}>Code</Text>
  </View>
  <FlatList data={filtered} keyExtractor={item=>item.code}
   keyboardShouldPersistTaps="handled"
   keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
   showsVerticalScrollIndicator={false}
   contentContainerStyle={styles.listContent}
   renderItem={({item})=><Pressable onPress={()=>onSelect(item.code)}
    accessibilityRole="button" style={[styles.row,{borderBottomColor:theme.line}]}>
    <Text numberOfLines={1} style={[styles.name,{color:theme.text}]}>{item.name}</Text>
    <Text style={[styles.code,{color:theme.muted}]}>{item.code}</Text>
   </Pressable>}/>
 </View>;
}

const styles=StyleSheet.create({
 field:{height:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
 fieldText:{flex:1,fontSize:14},
 page:{flex:1},
 top:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
 back:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 title:{fontSize:20,fontWeight:'900'},
 search:{height:48,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:13,margin:16,marginBottom:7},
 searchInput:{flex:1},
 listHeader:{height:30,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
 listHeaderText:{fontSize:10,fontWeight:'800',letterSpacing:.5,textTransform:'uppercase'},
 listContent:{paddingHorizontal:17,paddingBottom:20},
 row:{height:54,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16},
 name:{flex:1,fontSize:14,fontWeight:'600'},
 code:{width:34,textAlign:'right',fontSize:11,fontWeight:'800'}
});