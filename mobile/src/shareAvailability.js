import {Linking} from 'react-native';
import {getLocales} from 'expo-localization';

// Explicit, narrowly documented region restrictions. This is not a claim to
// enumerate every country's constantly changing availability rules.
// App-install and URL-handler checks are the second gate for every destination.
const REGION_RESTRICTIONS={
  TikTok:new Set(['IN','CN']),
  WhatsApp:new Set(['CN'])
};
const SCHEMES={
  Instagram:['instagram://app'],
  TikTok:['snssdk1233://','tiktok://'],
  WhatsApp:['whatsapp://send?text=StudentHood']
};

export function shareRegion(profileCountry){
  let deviceRegion='';
  try{deviceRegion=String(getLocales()?.[0]?.regionCode||'').toUpperCase()}catch{}
  // Device region is a locale setting, not GPS or guaranteed physical position.
  // Stored profile country is used only when the device has no valid region.
  if(/^[A-Z]{2}$/.test(deviceRegion))return deviceRegion;
  const fallback=String(profileCountry||'').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(fallback)?fallback:null;
}

export function regionAllowsShareApp(name,region){
  return !REGION_RESTRICTIONS[name]?.has(String(region||'').toUpperCase());
}

export async function availableShareApps(profileCountry,canOpen=Linking.canOpenURL){
  const region=shareRegion(profileCountry);
  const checks=await Promise.all(['Instagram','TikTok','WhatsApp'].map(async name=>{
    if(!regionAllowsShareApp(name,region))return null;
    for(const scheme of SCHEMES[name]){
      try{
        if(await canOpen(scheme))return {name,scheme};
      }catch{
        // Missing OS package visibility or unsupported scheme: fail closed.
      }
    }
    return null;
  }));
  return checks.filter(Boolean);
}

export function shareLabel(region){
  return region?'Apps available for device region '+region:'Available installed apps';
}
