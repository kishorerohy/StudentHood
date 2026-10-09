// Expo config plugin: allow safe installed-app checks for prioritized Scene
// sharing without requesting broad QUERY_ALL_PACKAGES permission.
const {withAndroidManifest}=require('expo/config-plugins');

const schemes=['instagram','snssdk1233','tiktok','whatsapp'];
function withSocialShareQueries(config){
  return withAndroidManifest(config,result=>{
    const manifest=result.modResults.manifest;
    const entry=(manifest.queries||[])[0]||{};
    entry.intent=entry.intent||[];
    for(const scheme of schemes){
      const has=entry.intent.some(item=>(item.data||[]).some(d=>d.$?.['android:scheme']===scheme));
      if(!has){
        entry.intent.push({
          action:[{$:{'android:name':'android.intent.action.VIEW'}}],
          data:[{$:{'android:scheme':scheme}}]
        });
      }
    }
    manifest.queries=[entry,...(manifest.queries||[]).slice(1)];
    return result;
  });
}
module.exports=withSocialShareQueries;
