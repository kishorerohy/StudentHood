import React,{useEffect} from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native branded splash visible until the initial authenticated route is ready.
SplashScreen.preventAutoHideAsync().catch(()=>{});
import {ActivityIndicator,StatusBar,StyleSheet,Text,useColorScheme,View} from 'react-native';
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

  useEffect(()=>{
    if(!loading&&(!isSignedIn||resolvedUserId===session?.user?.id)){
      SplashScreen.hideAsync().catch(()=>{});
    }
  },[loading,isSignedIn,resolvedUserId,session?.user?.id]);

  // Keep the approved logo on screen until this specific signed-in account's
  // profile AND age/guardian access checks finish. No premature onboarding.
  if(loading||(isSignedIn&&resolvedUserId!==session?.user?.id)){
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
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
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
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
  return <SafeAreaProvider>
    <StatusBar barStyle={scheme==='light'?'dark-content':'light-content'} backgroundColor={theme.bg}/>
    <SessionProvider><StudentHood/></SessionProvider>
  </SafeAreaProvider>;
}

const styles=StyleSheet.create({
  safe:{flex:1},
  center:{flex:1,alignItems:'center',justifyContent:'center',gap:10,padding:24},
  loading:{fontSize:11},
  error:{fontSize:12,textAlign:'center'}
});
