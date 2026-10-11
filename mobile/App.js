import React,{useCallback,useRef} from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Native Android splash uses the SAME white logo treatment as StartupScreen.
SplashScreen.preventAutoHideAsync().catch(()=>{});
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

  // The native splash and this startup screen share the same white branding.
  // The startup route keeps showing while the correct account safety checks run.
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
    // Hand off as soon as React Native renders the matching white startup.
    // The loading UI remains visible until auth/profile/guardian checks finish.
    SplashScreen.hideAsync().catch(()=>{});
  },[]);
  return <SafeAreaProvider>
    <View style={styles.safe} onLayout={onFirstLayout}>
      <StatusBar barStyle={scheme==='light'?'dark-content':'light-content'} backgroundColor={theme.bg}/>
      <SessionProvider><StudentHood/></SessionProvider>
    </View>
  </SafeAreaProvider>;
}

const styles=StyleSheet.create({safe:{flex:1}});
