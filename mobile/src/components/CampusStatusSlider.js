import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {setCampusPresence} from '../api';

const HEIGHT=52;
const OPTIONS=[
  {value:'off_campus',label:'Off campus',icon:'home',color:'#F08778'},
  {value:'on_campus',label:'On campus',icon:'book-open',color:'#5BD5A8'},
  {value:'not_shared',label:'Not shared',icon:'eye-off',color:'#A9B4C2'}
];
const normalize=value=>OPTIONS.some(option=>option.value===value)?value:'not_shared';

export default function CampusStatusSlider({theme,profile,onSaved}){
  const [expanded,setExpanded]=useState(false);
  const [selected,setSelected]=useState(normalize(profile?.campus_presence));
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const wheel=useRef(null);
  const current=OPTIONS.find(option=>option.value===selected)||OPTIONS[2];

  useEffect(()=>{setSelected(normalize(profile?.campus_presence))},[profile?.campus_presence]);
  useEffect(()=>{
    if(!expanded) return;
    const timer=setTimeout(()=>{
      const index=OPTIONS.findIndex(option=>option.value===selected);
      wheel.current?.scrollTo({y:index*HEIGHT,animated:false});
    },40);
    return()=>clearTimeout(timer);
  },[expanded]);

  async function choose(value){
    if(saving||value===selected){setExpanded(false);return;}
    const previous=selected;
    setSaving(true);
    setError('');
    setSelected(value);
    setExpanded(false);
    try{
      await setCampusPresence(value);
      await onSaved?.();
    }catch(e){
      setSelected(previous);
      setError(e?.message||'Could not save campus status.');
    }finally{
      setSaving(false);
    }
  }

  function settle(event){
    const offset=Math.max(0,event.nativeEvent.contentOffset.y);
    const index=Math.max(0,Math.min(OPTIONS.length-1,Math.round(offset/HEIGHT)));
    const value=OPTIONS[index].value;
    if(value!==selected) choose(value);
  }

  return <View pointerEvents="box-none" style={styles.anchor}>
    {!!error&&<Text accessibilityRole="alert" style={[styles.error,{color:theme.danger,backgroundColor:theme.surface}]}>{error}</Text>}
    {expanded&&<View style={[styles.wheel,{backgroundColor:theme.isLight?'rgba(250,250,250,0.77)':'rgba(22,27,33,0.65)',borderColor:theme.isLight?'rgba(60,69,76,0.23)':'rgba(226,235,244,0.32)'}]}>
      <Feather name="chevron-up" size={14} color={theme.muted} style={styles.arrow}/>
      <ScrollView
        ref={wheel}
        style={styles.choices}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={event=>{if(Math.abs(event.nativeEvent.velocity?.y||0)<0.08)settle(event)}}
      >
        {OPTIONS.map((option,index)=><Pressable
          key={option.value}
          onPress={()=>choose(option.value)}
          accessibilityRole="button"
          accessibilityState={{selected:selected===option.value}}
          accessibilityLabel={'Set campus status to '+option.label}
          style={[styles.choice,selected===option.value&&{backgroundColor:theme.isLight?'rgba(225,232,237,0.82)':'rgba(80,96,106,0.35)',borderColor:option.color}]}>
          <Feather name={option.icon} color={option.color} size={21}/>
          <Text style={[styles.choiceText,{color:theme.text}]}>{option.label}</Text>
        </Pressable>)}
      </ScrollView>
      <Feather name="chevron-down" size={14} color={theme.muted} style={styles.arrow}/>
      <Text style={[styles.wheelHint,{color:theme.muted}]}>Scroll to select</Text>
    </View>}
    <Pressable
      onPress={()=>{if(!saving){setError('');setExpanded(value=>!value)}}}
      accessibilityRole="button"
      accessibilityLabel={'Campus status: '+current.label+'. '+(expanded?'Close selector':'Open vertical selector')}
      accessibilityState={{expanded,disabled:saving}}
      disabled={saving}
      style={[styles.chip,{backgroundColor:theme.isLight?'rgba(255,255,255,0.76)':'rgba(24,32,40,0.67)',borderColor:current.color}]}>
      {saving?<ActivityIndicator size="small" color={current.color}/>:<Feather name={current.icon} size={18} color={current.color}/>}
      <Text style={[styles.chipText,{color:theme.text}]}>{saving?'Saving…':current.label}</Text>
      <Feather name={expanded?'chevron-down':'chevron-up'} size={14} color={theme.text}/>
    </Pressable>
  </View>;
}
const styles=StyleSheet.create({
  anchor:{position:'absolute',left:16,bottom:90,zIndex:9,alignItems:'flex-start'},
  chip:{height:38,borderWidth:1,borderRadius:99,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7},
  chipText:{fontSize:11,fontWeight:'800'},
  wheel:{width:136,borderWidth:1,borderRadius:23,padding:6,marginBottom:8,alignItems:'stretch',overflow:'hidden'},
  choices:{height:HEIGHT*3},
  scrollContent:{paddingVertical:HEIGHT},
  arrow:{alignSelf:'center'},
  choice:{height:HEIGHT,borderWidth:1,borderColor:'transparent',borderRadius:14,alignItems:'center',justifyContent:'center',gap:3},
  choiceText:{fontSize:10,fontWeight:'800'},
  wheelHint:{textAlign:'center',fontSize:9,marginTop:3},
  error:{fontSize:10,maxWidth:190,borderRadius:11,overflow:'hidden',padding:8,marginBottom:8}
});