import React,{useMemo,useState} from 'react';
import {FlatList,Modal,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as Localization from 'expo-localization';
import {Feather} from '@expo/vector-icons';
import {countryName,countryOptions} from '../countries';

export default function CountryPicker({theme,value,onChange,disabled=false}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const locale=Localization.getLocales?.()[0]?.languageTag||'en';
  const options=useMemo(()=>countryOptions(locale),[locale]);
  const filtered=options.filter(item=>{
    const q=query.trim().toLowerCase();
    return !q||item.name.toLowerCase().includes(q)||item.code.toLowerCase().includes(q);
  });
  const label=value?countryName(value,locale):'Country or region';

  return <>
    <Pressable disabled={disabled} onPress={()=>setOpen(true)} style={[styles.field,{backgroundColor:theme.surface2,borderColor:theme.line,opacity:disabled?0.8:1}]}>
      <Feather name="globe" size={18} color={theme.muted}/>
      <Text style={[styles.fieldText,{color:value?theme.text:theme.muted}]}>{label}</Text>
      <Feather name={disabled?'lock':'chevron-down'} size={17} color={theme.muted}/>
    </Pressable>

    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setOpen(false)}>
      <View style={[styles.modal,{backgroundColor:theme.bg}]}>
        <View style={styles.top}>
          <Text style={[styles.title,{color:theme.text}]}>Country or region</Text>
          <Pressable onPress={()=>setOpen(false)}><Feather name="x" size={24} color={theme.text}/></Pressable>
        </View>
        <View style={[styles.search,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="search" size={17} color={theme.muted}/>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search countries" placeholderTextColor={theme.muted} style={[styles.searchInput,{color:theme.text}]}/>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item=>item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({item})=><Pressable onPress={()=>{onChange(item.code);setOpen(false);setQuery('')}} style={[styles.row,{borderBottomColor:theme.line}]}>
            <Text style={[styles.name,{color:theme.text}]}>{item.name}</Text>
            <Text style={[styles.code,{color:theme.muted}]}>{item.code}</Text>
          </Pressable>}
        />
      </View>
    </Modal>
  </>;
}

const styles=StyleSheet.create({
  field:{height:52,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,marginTop:10},
  fieldText:{flex:1,fontSize:14},
  modal:{flex:1,paddingTop:18,paddingHorizontal:16},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  title:{fontSize:24,fontWeight:'800'},
  search:{height:48,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,marginBottom:8},
  searchInput:{flex:1},
  row:{height:52,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  name:{fontSize:14,fontWeight:'600'},
  code:{fontSize:11,fontWeight:'700'}
});
