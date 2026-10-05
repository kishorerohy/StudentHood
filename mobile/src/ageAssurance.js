import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';

const nativeAgeSignals=requireOptionalNativeModule('StudentHoodAgeSignals');

/*
  StudentHood never treats Google/Apple login as proof of the physical user's age.

  Native contract:
  requestAgeSignal({gates:[13,16,18]}) ->
  {
    status: 'shared' | 'not_shared' | 'verification_required' | 'unavailable',
    ageLower: number | null,
    ageUpper: number | null,
    source:
      'self_declared' |
      'guardian_declared' |
      'platform_assessed' |
      'platform_verified' |
      'unknown'
  }

  Platform signals can ONLY increase restrictions. They do not set
  adult_access_verified. Independent person-level verification is required
  before StudentHood can unlock content classified as adult.
*/

export function platformAgeSignalsAvailable(){
  return !!nativeAgeSignals?.requestAgeSignal&&(Platform.OS==='ios'||Platform.OS==='android');
}

function providerForPlatform(){
  if(Platform.OS==='ios') return 'apple';
  if(Platform.OS==='android') return 'google';
  return 'other';
}

function normalizeSource(value){
  const source=String(value||'unknown').toLowerCase();
  if(['self_declared','guardian_declared','platform_assessed','platform_verified'].includes(source)) return source;
  return 'unknown';
}

function safeNumber(value){
  if(value===null||value===undefined||value==='') return null;
  const number=Number(value);
  return Number.isFinite(number)?number:null;
}

export async function requestPlatformAgeSignal(){
  const provider=providerForPlatform();

  if(!platformAgeSignalsAvailable()){
    return {status:'unavailable',provider};
  }

  try{
    const result=await nativeAgeSignals.requestAgeSignal({gates:[13,16,18]});
    const status=String(result?.status||'unavailable').toLowerCase();

    if(status!=='shared'){
      return {
        status:['not_shared','verification_required','unavailable'].includes(status)?status:'unavailable',
        provider
      };
    }

    let ageLower=safeNumber(result?.ageLower);
    const ageUpper=safeNumber(result?.ageUpper);

    /*
      Apple's lowest band can have a nil lower bound. With our lowest gate at
      13, nil lowerBound + an upperBound below 13 means "under 13".
      Normalize that privacy-preserving range to lower=0 rather than treating
      it as missing evidence.
    */
    if(ageLower===null&&ageUpper!==null&&ageUpper<13){
      ageLower=0;
    }

    if(ageLower===null){
      return {status:'not_shared',provider};
    }

    return {
      status:'shared',
      provider,
      ageLower,
      ageUpper,
      source:normalizeSource(result?.source)
    };
  }catch{
    return {status:'unavailable',provider};
  }
}
