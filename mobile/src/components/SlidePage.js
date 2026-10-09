import React,{useEffect,useMemo,useRef} from 'react';
import {Animated,BackHandler,Dimensions,PanResponder,StyleSheet,View} from 'react-native';

export default function SlidePage({active=true,closing=false,swipeBack=false,onBack,onExited,children,theme}){
  const width=Dimensions.get('window').width;
  const slide=useRef(new Animated.Value(width)).current;
  const exiting=useRef(false);

  useEffect(()=>{
    Animated.timing(slide,{toValue:0,duration:260,useNativeDriver:true}).start();
  },[slide]);

  useEffect(()=>{
    if(!closing||exiting.current) return;
    exiting.current=true;
    Animated.timing(slide,{toValue:width,duration:230,useNativeDriver:true})
      .start(({finished})=>{if(finished)onExited?.()});
  },[closing,onExited,slide,width]);

  useEffect(()=>{
    if(!active) return;
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{onBack?.();return true});
    return()=>sub.remove();
  },[active,onBack]);

  const swipeResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,gesture)=>swipeBack&&active&&!closing&&gesture.dx>65&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.3,
    onPanResponderRelease:(_,gesture)=>{if(gesture.dx>90)onBack?.()},
    onPanResponderTerminationRequest:()=>true
  }),[swipeBack,active,closing,onBack]);

  return <Animated.View style={[styles.page,{backgroundColor:theme.bg,transform:[{translateX:slide}]}]} pointerEvents={active?'auto':'none'} {...(swipeBack?swipeResponder.panHandlers:{})}>
    <View style={styles.body}>{children}</View>
  </Animated.View>;
}

const styles=StyleSheet.create({
  page:{...StyleSheet.absoluteFillObject,zIndex:20},
  body:{flex:1}
});
