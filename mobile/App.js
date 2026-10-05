import React from 'react';
import {ActivityIndicator,StatusBar,StyleSheet,Text,useColorScheme,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {SessionProvider,useSession} from './src/session';
import {themeForScheme} from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SafetyGate from './src/screens/SafetyGate';
import MainApp from './src/MainApp';

function StudentHood(){
  const scheme=useColorScheme();
  const theme=themeForScheme(scheme);
  const {session,profile,policy,loading,error,isSignedIn}=useSession();

  if(loading){
    return <SafeAreaView style={[styles.center,{backgroundColor:theme.bg}]}>
      <ActivityIndicator color={theme.accent}/>
      <Text style={[styles.loading,{color:theme.muted}]}>Opening StudentHood…</Text>
    </SafeAreaView>;
  }

  if(!isSignedIn){
    return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
      <AuthScreen theme={theme}/>
    </SafeAreaView>;
  }

  const safetyReady=!!(profile?.date_of_birth&&profile?.country_code&&profile?.time_zone);

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

  if(error&&!session){
    return <SafeAreaView style={[styles.center,{backgroundColor:theme.bg}]}>
      <Text style={[styles.error,{color:theme.danger}]}>{error}</Text>
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
