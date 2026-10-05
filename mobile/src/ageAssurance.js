import {NativeModules,Platform} from 'react-native';

/*
  Native contract expected from StudentHoodAgeSignals:
  requestAgeSignal({gates:[13,16,18]}) ->
    {
      status: 'shared' | 'not_shared' | 'verification_required' | 'unavailable',
      ageLower: number | null,
      ageUpper: number | null,
      source: 'self_declared' | 'guardian_declared' | 'platform_assessed' | 'platform_verified' | 'unknown'
    }

  iOS implementation should use Apple's Declared Age Range framework.
  Android implementation should use Google Play Age Signals.
  This JavaScript layer deliberately treats the signal as restrictive evidence only.
*/
const nativeAgeSignals=NativeModules.StudentHoodAgeSignals;

export function platformAgeSignalsAvailable(){
  return !!nativeAgeSignals?.requestAgeSignal && (Platform.OS==='ios'||Platform.OS==='android');
}

function normalizeSource(value){
  const source=String(value||'unknown').toLowerCase();
  if(['self_declared','guardian_declared','platform_assessed','platform_verified'].includes(source)) return source;
  return 'unknown';
}

export async function requestPlatformAgeSignal(){
  if(!platformAgeSignalsAvailable()){
    return {status:'unavailable',provider:Platform.OS==='ios'?'apple':Platform.OS==='android'?'google':'other'};
  }

  const result=await nativeAgeSignals.requestAgeSignal({gates:[13,16,18]});
  const provider=Platform.OS==='ios'?'apple':'google';
  const status=String(result?.status||'unavailable').toLowerCase();

  if(status!=='shared'){
    return {status,provider};
  }

  if(result?.ageLower===null||result?.ageLower===undefined){
    /*
      An absent lower bound is not treated as proof of adulthood.
      StudentHood keeps the user's self-declared age restrictions and
      never upgrades adult privileges from an ambiguous platform result.
    */
    return {status:'not_shared',provider};
  }

  return {
    status:'shared',
    provider,
    ageLower:Number(result.ageLower),
    ageUpper:result.ageUpper===null||result.ageUpper===undefined?null:Number(result.ageUpper),
    source:normalizeSource(result.source)
  };
}
