import React,{useCallback,useRef} from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Android's mandatory native launch surface is intentionally plain white.
// Only StartupScreen renders the approved StudentHood logo and tagline.
SplashScreen.preventAutoHideAsync().catch(()=>{});
SplashScreen.setOptions({fade:false,duration:0});
import {StatusBar,StyleSheet,useColorScheme,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {SessionProvider,useSession} from './src/session';
import {themeForScheme} from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import StartupScreen from './src/screens/StartupScreen';
import SafetyGate from './src/screens/SafetyGate';
import MainApp from './src/MainApp';

function StudentHood(){
  const scheme=useColorScheme();
  const theme=themeForScheme(scheme);
  const {session,profile,policy,loading,error,isSignedIn,resolvedUserId,refreshAccount}=useSession();

  // The platform's plain-white launch surface hands off once to this ONLY
  // branded startup view while account and guardian checks finish.
  // No premature onboarding or unsafe account switching.
  if(loading||(isSignedIn&&resolvedUserId!==session?.user?.id)){
    return <SafeAreaView style={[styles.safe,{backgroundColor:'#FFFFFF'}]}>
      <StartupScreen theme={theme} error={!loading?error:null} onRetry={()=>refreshAccount().catch(()=>{})}/>
    </SafeAreaView>;
  }

  if(!isSignedIn){
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
      <AuthScreen theme={theme}/>
    </SafeAreaView>;
  }

  const safetyReady=!!(profile?.date_of_birth&&profile?.country_code&&profile?.time_zone);
  if(error){
    return <SafeAreaView style={[styles.safe,{backgroundColor:'#FFFFFF'}]}>
      <StartupScreen theme={theme} error={error} onRetry={()=>refreshAccount().catch(()=>{})}/>
    </SafeAreaView>;
  }

  if(safetyReady&&policy&&!policy.app_access){
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
      <SafetyGate theme={theme} policy={policy}/>
    </SafeAreaView>;
  }

  if(!profile||!profile.onboarding_completed||!safetyReady){
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
      <OnboardingScreen theme={theme}/>
    </SafeAreaView>;
  }

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]} edges={['top','left','right']}>
    <MainApp theme={theme}/>
  </SafeAreaView>;
}

export default function App(){
  const scheme=useColorScheme();
  const theme=themeForScheme(scheme);
  const splashDismissed=useRef(false);
  const onFirstLayout=useCallback(()=>{
    if(splashDismissed.current)return;
    splashDismissed.current=true;
    // Wait for a paint frame after React lays out the branded startup or
    // the resolved route; never reveal a second native logo page.
    requestAnimationFrame(()=>{
      SplashScreen.hideAsync().catch(()=>{});
    });
  },[]);
  return <SafeAreaProvider>
    <View style={styles.safe} onLayout={onFirstLayout}>
      <StatusBar barStyle={scheme==='light'?'dark-content':'light-content'} backgroundColor={theme.bg}/>
      <SessionProvider><StudentHood/></SessionProvider>
    </View>
  </SafeAreaProvider>;
}

const styles=StyleSheet.create({safe:{flex:1}});
