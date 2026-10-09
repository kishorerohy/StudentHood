import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Animated,Dimensions,Linking,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Feather,FontAwesome5} from '@expo/vector-icons';
import Svg,{Path} from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import {sceneShareUrl,shareScene} from '../scenes';
import {availableShareApps} from '../shareAvailability';

const PANEL_W=246;
const PANEL_H=280;
const ARC_POINTS=[
  {x:159,y:35},
  {x:91,y:79},
  {x:60,y:140},
  {x:93,y:199},
  {x:163,y:226}
];
const POINT_MAP={2:[1,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4]};

export default function SceneShareRadial({scene,theme,anchor,profileCountry,onClose}){
  const {width:screenWidth}=useWindowDimensions();
  const screenHeight=Dimensions.get('screen').height;
  const [apps,setApps]=useState([]);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const animation=useRef(new Animated.Value(0)).current;
  const mounted=useRef(true);

  useEffect(()=>{
    mounted.current=true;
    Animated.spring(animation,{toValue:1,useNativeDriver:true,damping:17,stiffness:170}).start();
    availableShareApps(profileCountry).then(found=>{
      if(mounted.current)setApps(found);
    }).catch(()=>{if(mounted.current)setApps([])})
      .finally(()=>{if(mounted.current)setChecking(false)});
    return()=>{mounted.current=false};
  },[profileCountry,animation]);

  const centerX=Number(anchor?.x||screenWidth-38)+Number(anchor?.width||44)/2;
  const centerY=Number(anchor?.y||screenHeight-175)+Number(anchor?.height||44)/2;
  const openRight=centerX<screenWidth*0.48;
  const left=Math.max(5,Math.min(screenWidth-PANEL_W-5,centerX-(openRight?21:PANEL_W-21)));
  const top=Math.max(8,Math.min(screenHeight-PANEL_H-8,centerY-PANEL_H+16));
  const items=useMemo(()=>[
    ...apps.map(app=>({name:app.name,scheme:app.scheme,
      brand:true,icon:app.name==='Instagram'?'instagram':app.name==='TikTok'?'tiktok':'whatsapp'})),
    {name:'Copy link',icon:'link-2'},
    {name:'More apps',icon:'more-horizontal'}
  ],[apps]);
  const indexes=POINT_MAP[items.length]||POINT_MAP[5];

  async function select(item){
    if(busy)return;
    setBusy(item.name);
    setMessage('');
    setError('');
    try{
      const url=sceneShareUrl(scene.id);
      if(item.name==='Copy link'){
        await Clipboard.setStringAsync(url);
        setMessage('Scene link copied.');
      }else if(item.name==='More apps'){
        await shareScene(scene.id);
        dismiss();
      }else if(item.name==='WhatsApp'){
        await Linking.openURL('whatsapp://send?text='+encodeURIComponent('View this Scene on StudentHood: '+url));
        onClose();
      }else{
        await Clipboard.setStringAsync(url);
        try{
          await Linking.openURL(item.scheme);
          dismiss();
        }catch{
          setMessage('Link copied. '+item.name+' could not be opened. Try More apps.');
        }
      }
    }catch(e){
      setError(e?.message||'Unable to share. Try Copy link or More apps.');
    }finally{
      if(mounted.current)setBusy('');
    }
  }

  function dismiss(){
    Animated.timing(animation,{toValue:0,duration:150,useNativeDriver:true}).start(()=>onClose?.());
  }

  const scale=animation.interpolate({inputRange:[0,1],outputRange:[0.65,1]});
  const opacity=animation.interpolate({inputRange:[0,1],outputRange:[0,1]});
  return <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
    <Pressable style={[StyleSheet.absoluteFill,{backgroundColor:theme.isLight?'rgba(8,16,24,0.12)':'rgba(1,3,7,0.30)'}]}
      onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close Scene sharing"/>
    <Animated.View style={[styles.fan,{
      left,top,
      opacity,transformOrigin:openRight?'left bottom':'right bottom',
      transform:[{scale}]
    }]}>
      <Svg width={PANEL_W} height={PANEL_H} style={[StyleSheet.absoluteFill,openRight&&{transform:[{scaleX:-1}]}]}>
        <Path
          d="M 234 10 C 125 9 8 64 8 137 C 8 214 126 274 234 275 Z"
          fill={theme.isLight?'rgba(246,248,251,0.90)':'rgba(16,22,32,0.88)'}
          stroke={theme.isLight?'rgba(81,107,138,0.45)':'rgba(127,181,242,0.57)'}
          strokeWidth="1.4"/>
      </Svg>
      {checking?<View style={styles.loading}>
        <ActivityIndicator color={theme.accent}/>
        <Text style={[styles.loadingText,{color:theme.text}]}>Finding share apps…</Text>
      </View>:
        items.map((item,index)=>{
          const p=ARC_POINTS[indexes[index]];
          const x=openRight?PANEL_W-p.x:p.x;
          return <Pressable
            key={item.name}
            accessibilityRole="button"
            accessibilityLabel={item.name==='More apps'?'Open device sharing options':item.name==='Copy link'?'Copy Scene link':'Share Scene with '+item.name}
            disabled={!!busy}
            onPress={()=>select(item)}
            style={[styles.appButton,{left:x-43,top:p.y-24}]}>
            <View style={[styles.appIcon,{
              backgroundColor:theme.isLight?'rgba(255,255,255,0.95)':'rgba(29,40,52,0.92)',
              borderColor:theme.isLight?'rgba(132,140,149,0.42)':'rgba(167,194,216,0.42)'
            }]}>
              {busy===item.name?<ActivityIndicator size="small" color={theme.accent}/>:
                item.brand?<FontAwesome5 name={item.icon} size={20} color={theme.text}/>:
                  <Feather name={item.icon} size={21} color={theme.text}/>}
            </View>
            <Text style={[styles.appText,{color:theme.text}]} numberOfLines={1}>{item.name}</Text>
          </Pressable>;
        })}
      {!!message&&<View style={[styles.toast,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <Text style={[styles.toastText,{color:theme.text}]}>{message}</Text>
      </View>}
      {!!error&&<View style={[styles.toast,{backgroundColor:theme.surface,borderColor:theme.danger}]}>
        <Text style={[styles.toastText,{color:theme.danger}]}>{error}</Text>
      </View>}
    </Animated.View>
    <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Collapse Scene sharing"
      style={[styles.hub,{left:Math.max(0,Math.min(screenWidth-48,centerX-24)),top:Math.max(0,centerY-24),
        borderColor:theme.accent,backgroundColor:theme.isLight?'rgba(245,245,245,0.98)':'rgba(20,28,39,0.98)'}]}>
      <Feather name="x" color={theme.text} size={22}/>
    </Pressable>
  </View>;
}
const styles=StyleSheet.create({
  fan:{position:'absolute',height:PANEL_H,width:PANEL_W},
  appButton:{position:'absolute',width:86,height:68,alignItems:'center',justifyContent:'flex-start',gap:4},
  appIcon:{width:43,height:43,borderRadius:22,borderWidth:1,alignItems:'center',justifyContent:'center'},
  appText:{fontSize:10,fontWeight:'800',textAlign:'center',textShadowColor:'rgba(0,0,0,0.10)',textShadowRadius:2},
  loading:{position:'absolute',top:115,left:60,alignItems:'center',gap:8},
  loadingText:{fontSize:11,fontWeight:'700'},
  hub:{position:'absolute',width:48,height:48,borderRadius:24,borderWidth:2,alignItems:'center',justifyContent:'center'},
  toast:{position:'absolute',left:24,right:10,bottom:28,borderRadius:12,borderWidth:1,padding:9},
  toastText:{fontSize:10,textAlign:'center'}
});
