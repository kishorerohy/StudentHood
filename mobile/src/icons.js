import React from 'react';
import Svg,{Circle,Path} from 'react-native-svg';

export function DropsIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3.5s5.2 6.2 5.2 10.3A5.2 5.2 0 0 1 12 19a5.2 5.2 0 0 1-5.2-5.2C6.8 9.7 12 3.5 12 3.5Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
    <Path d="m16 5.2.5 1.25 1.25.5-1.25.5L16 8.7l-.5-1.25-1.25-.5 1.25-.5L16 5.2Z" fill={color}/>
  </Svg>;
}

export function PingIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="2" fill={color}/>
    <Path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2M5.7 5.7a8.9 8.9 0 0 0 0 12.6M18.3 5.7a8.9 8.9 0 0 1 0 12.6" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
  </Svg>;
}

export function DiscoverIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="1.7"/>
    <Path d="m15.7 8.3-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
  </Svg>;
}


export function SceneIcon({color,size=22}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5.5 4.5h13A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1.5-1.5Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
    <Path d="m10 8.7 5 3.3-5 3.3V8.7Z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
  </Svg>;
}
