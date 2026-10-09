import {Linking} from 'react-native';
import {getLocales} from 'expo-localization';

// Explicit, narrowly documented region restrictions. This is not a claim to
// enumerate every country's constantly changing availability rules.
// Reviewed Oct 2026; restrictions may change and this list needs ongoing
// maintenance. App-install and URL-handler checks are a second gate.
const REGION_RESTRICTIONS={
  Instagram:new Set(['CN','RU','IR']),
  TikTok:new Set(['IN','CN','AF','IR','JO','KP','UZ','SO','SN','TJ','KG','GA']),
  WhatsApp:new Set(['CN','RU'])
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
  const profileRegion=String(profileCountry||'').trim().toUpperCase();
  const checks=await Promise.all(['Instagram','TikTok','WhatsApp'].map(async name=>{
    // Both region signals must be acceptable. We must not override a known
    // restriction simply because a student changes phone locale. If both are
    // unknown, only generic copy/native sharing remains available.
    if((!region&&!/^[A-Z]{2}$/.test(profileRegion)) ||
       !regionAllowsShareApp(name,region) ||
       !regionAllowsShareApp(name,profileRegion))return null;
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
