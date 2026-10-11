import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OVERPASS_URLS=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
const NOMINATIM_URL="https://nominatim.openstreetmap.org/search";
const PRODUCT_URL="https://kishorerohy.github.io/StudentHood/";
const CACHE_MS=7*24*60*60*1000;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const clamp=(n:number,min:number,max:number)=>Math.min(Math.max(n,min),max);
const rad=(n:number)=>n*Math.PI/180;
function distanceMeters(aLat:number,aLon:number,bLat:number,bLon:number){
  const dLat=rad(bLat-aLat),dLon=rad(bLon-aLon);
  return 12742000*Math.asin(Math.sqrt(Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2));
}
const nameKey=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const clean=(value:unknown,max=100)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
function serverClient(){
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)throw new Error("Institution lookup is not configured.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function fetchWithTimeout(url:string,init:RequestInit,timeoutMs:number){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...init,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function geocodeCity(city:string,countryCode:string,client:ReturnType<typeof serverClient>){
  // All StudentHood function instances share a Postgres-based 1.1-second
  // public OSMF Nominatim rate limit. City lookups are explicitly submitted.
  const {data:slot,error}=await client.rpc("studenthood_reserve_nominatim_slot");
  if(error||!slot)throw new Error("City directory is temporarily unavailable.");
  const wait=Math.max(0,Date.parse(String(slot))-Date.now());
  if(!Number.isFinite(wait)||wait>7000)throw new Error("City search is busy. Please retry shortly.");
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  const params=new URLSearchParams({
    city,countrycodes:countryCode.toLowerCase(),format:"jsonv2",addressdetails:"1",limit:"1"
  });
  const response=await fetchWithTimeout(NOMINATIM_URL+"?"+params.toString(),{
    method:"GET",headers:{
      "User-Agent":"StudentHood/0.1.7 ("+PRODUCT_URL+")",
      "Accept-Language":"en","Accept":"application/json"
    }
  },12000);
  if(!response.ok){
    console.warn("institution_search: nominatim_http_"+response.status);
    throw new Error("City directory is temporarily unavailable.");
  }
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows.length)throw new Error("City not found. Check city and country.");
  const place=rows[0],lat=Number(place.lat),lon=Number(place.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error("City location could not be confirmed.");
  const bbox=Array.isArray(place.boundingbox)?place.boundingbox.map(Number):null;
  const dlat=40000/111320,dlon=40000/(111320*Math.max(.25,Math.cos(rad(lat))));
  const south=bbox&&Number.isFinite(bbox[0])?Math.max(bbox[0],lat-dlat):lat-dlat;
  const north=bbox&&Number.isFinite(bbox[1])?Math.min(bbox[1],lat+dlat):lat+dlat;
  const west=bbox&&Number.isFinite(bbox[2])?Math.max(bbox[2],lon-dlon):lon-dlon;
  const east=bbox&&Number.isFinite(bbox[3])?Math.min(bbox[3],lon+dlon):lon+dlon;
  const bounds:[number,number,number,number]=south<north&&west<east?
    [south,west,north,east]:[lat-dlat,lon-dlon,lat+dlat,lon+dlon];
  return {lat,lon,bounds};
}
// Photon is a best-effort fallback for user-initiated city searches during
// Nominatim outages. The public Photon demo has fair-use limits and is NOT a
// substitute for a managed, global campus identity directory.
async function geocodePhoton(city:string,countryCode:string){
  const params=new URLSearchParams({q:city,limit:"20",lang:"en"});
  const response=await fetchWithTimeout("https://photon.komoot.io/api/?"+params.toString(),{
    method:"GET",headers:{
      "User-Agent":"StudentHood/0.1.8 ("+PRODUCT_URL+")",
      "Accept":"application/json"
    }
  },9500);
  if(!response.ok)throw new Error("Fallback city geocoder unavailable.");
  const data=await response.json();
  const features=Array.isArray(data?.features)?data.features:[];
  // Never take the first unverified text hit: a city name can occur in
  // several countries or match a school/business instead of a municipality.
  const match=features.find((feature:Record<string,unknown>)=>{
    const props=(feature.properties||{}) as Record<string,unknown>;
    const type=clean(props.osm_value||props.type,24).toLowerCase();
    return clean(props.countrycode,2).toUpperCase()===countryCode
      &&nameKey(clean(props.name,100))===nameKey(city)
      &&["city","town","municipality","village"].includes(type);
  });
  if(!match)throw new Error("Fallback geocoder did not verify that city.");
  const coords=(match.geometry as {coordinates?:unknown[]}|undefined)?.coordinates;
  const lon=Number(coords?.[0]),lat=Number(coords?.[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)
    throw new Error("Fallback geocoder returned invalid coordinates.");
  const dlat=40000/111320,dlon=40000/(111320*Math.max(.25,Math.cos(rad(lat))));
  return {lat,lon,bounds:[lat-dlat,lon-dlon,lat+dlat,lon+dlon] as [number,number,number,number]};
}
async function locateCity(city:string,countryCode:string,client:ReturnType<typeof serverClient>){
  try{return await geocodeCity(city,countryCode,client)}
  catch(error){
    if(error instanceof Error&&error.message==="City not found. Check city and country.")throw error;
    // No user identifying data or precise location in logs.
    console.warn("institution_search: primary_city_geocoder_failed");
    try{return await geocodePhoton(city,countryCode)}
    catch(_fallback){
      console.warn("institution_search: fallback_city_geocoder_failed");
      throw new Error("City directory is temporarily unavailable.");
    }
  }
}
// Research Organization Registry: open, curated research/education organization
// identifiers and verified city fields. This covers SOME universities/colleges,
// not primary or secondary schools. It does not guess institutions from text.
async function queryRorEducation(city:string,countryCode:string){
  type RorName={value?:string,types?:string[]};
  type RorLocation={geonames_details?:{name?:string,country_code?:string}};
  type RorRecord={id?:string,names?:RorName[],locations?:RorLocation[],types?:string[]};
  const all:Array<{id:string,name:string,type:string,city:string,distance_m:null}>=[];
  let count=0;
  for(let page=1;page<=6;page++){
    const params=new URLSearchParams({
      "query.advanced":'locations.geonames_details.name:"'+city.replace(/"/g,"")+'"',
      "filter":"types:education,locations.geonames_details.country_code:"+countryCode,
      "page":String(page)
    });
    let response:Response;
    try{
      response=await fetchWithTimeout("https://api.ror.org/v2/organizations?"+params.toString(),{
        method:"GET",headers:{
          "Accept":"application/json",
          "User-Agent":"StudentHood/0.1.8 ("+PRODUCT_URL+")"
        }
      },8500);
    }catch{
      console.warn("institution_search: ror_network_failure");
      if(all.length)return all;
      throw new Error("Research directory unavailable.");
    }
    if(!response.ok){
      console.warn("institution_search: ror_http_"+response.status);
      if(all.length)return all;
      throw new Error("Research directory unavailable.");
    }
    let payload:Record<string,unknown>;
    try{payload=await response.json()}catch{throw new Error("Research directory response invalid.")}
    const items=Array.isArray(payload?.items)?payload.items as RorRecord[]:[];
    count=Number(payload?.number_of_results)||0;
    for(const item of items){
      if(!item?.types?.includes("education"))continue;
      const cityMatches=item.locations?.some(location=>{
        const geo=location?.geonames_details;
        return nameKey(clean(geo?.name,90))===nameKey(city)
          &&clean(geo?.country_code,2).toUpperCase()===countryCode;
      });
      if(!cityMatches)continue;
      const official=item.names?.find(n=>n.types?.includes("ror_display"))?.value
        ||item.names?.find(n=>n.types?.includes("label"))?.value
        ||item.names?.find(n=>n.types?.includes("alias"))?.value;
      const name=clean(official,160);
      const id=clean(item.id,100);
      if(!name||!/^https:\/\/ror\.org\/[a-z0-9]{9}$/i.test(id))continue;
      if(all.some(existing=>nameKey(existing.name)===nameKey(name)))continue;
      all.push({
        id:"ror:"+id.split("/").pop(),
        name,
        // ROR describes an organization, not an accredited campus level.
        type:"institution",city,distance_m:null
      });
    }
    if(items.length<20||page*20>=count||all.length>=120)break;
  }
  return all.sort((a,b)=>a.name.localeCompare(b.name));
}
async function cityDirectoryWithFallback(city:string,countryCode:string,client:ReturnType<typeof serverClient>){
  try{
    const location=await locateCity(city,countryCode,client);
    const mapped=await queryOSM(location.lat,location.lon,location.bounds,city);
    if(mapped.length)return {institutions:mapped,source:"osm-city-directory"};
  }catch{
    console.warn("institution_search: mapped_city_directory_failed");
  }
  // If public OSM/geocoders are blocked, query a different authenticated-
  // independent educational registry by city. Strict country/city filtering
  // prevents a search match from adding an institution in the wrong city.
  const educational=await queryRorEducation(city,countryCode);
  if(educational.length)return {institutions:educational,source:"ror-education-directory"};
  throw new Error("Institution directory is temporarily unavailable.");
}
async function queryOSM(lat:number,lon:number,bounds:[number,number,number,number],cityName:string){
  const [s,w,n,e]=bounds.map(x=>Math.round(x*100000)/100000);
  const bbox=[s,w,n,e].join(",");
  // The public map dataset is not an exhaustive register of institutions.
  const query='[out:json][timeout:18];('+
    'nwr["amenity"~"^(school|college|university)$"]["name"]('+bbox+');'+
    'nwr["building"="university"]["name"]('+bbox+');'+
    ');out center tags 450;';
  // Fail over once to a second public endpoint when an Overpass instance
  // is overloaded. Do not poll or fan out: every search is user initiated.
  let data:unknown=null;
  for(const endpoint of OVERPASS_URLS){
    try{
      const response=await fetchWithTimeout(endpoint,{
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent":"StudentHood/0.1.8 ("+PRODUCT_URL+")"
        },
        body:new URLSearchParams({data:query}).toString()
      },18000);
      if(!response.ok)throw new Error("Overpass temporarily unavailable: "+response.status);
      const payload=await response.json();
      if(!Array.isArray(payload?.elements))throw new Error("Invalid Overpass response");
      data=payload;
      break;
    }catch(error){
      // No coordinates, tokens, or student details are logged.
      console.warn("Institution directory provider failed",error instanceof Error?error.name:"provider error");
    }
  }
  if(!data)throw new Error("Institution directory is temporarily unavailable.");
  const result=data as {elements?:unknown[]};
  const elements=Array.isArray(result.elements)?result.elements:[];
  const candidates=elements.map((element:Record<string,unknown>)=>{
    const tags=(element.tags||{}) as Record<string,unknown>;
    const name=clean(tags.name,160);
    const pLat=Number(element.lat??(element.center as Record<string,unknown>|undefined)?.lat);
    const pLon=Number(element.lon??(element.center as Record<string,unknown>|undefined)?.lon);
    const amenity=clean(tags.amenity,30);
    const building=clean(tags.building,30);
    if(!name||!Number.isFinite(pLat)||!Number.isFinite(pLon))return null;
    if(!["school","college","university"].includes(amenity)&&building!=="university")return null;
    return {
      id:"osm:"+clean(element.type,10)+":"+String(element.id),name,
      type:["school","college","university"].includes(amenity)?amenity:"university",
      city:clean(tags["addr:city"]||cityName,90),
      distance_m:Math.round(distanceMeters(lat,lon,pLat,pLon)),
      _lat:pLat,_lon:pLon,_priority:element.type==="relation"?0:element.type==="way"?1:2
    };
  }).filter(Boolean) as Array<{id:string,name:string,type:string,city:string,distance_m:number,_lat:number,_lon:number,_priority:number}>;
  candidates.sort((a,b)=>a.distance_m-b.distance_m||a._priority-b._priority);
  const chosen:typeof candidates=[];
  for(const item of candidates){
    const duplicate=chosen.some(other=>nameKey(other.name)===nameKey(item.name)
      &&distanceMeters(other._lat,other._lon,item._lat,item._lon)<1300);
    if(duplicate)continue;
    chosen.push(item);
    if(chosen.length===200)break;
  }
  return chosen.map(({_lat,_lon,_priority,...item})=>item);
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"authorization, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS"
  }});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  let body:Record<string,unknown>;
  try{body=await req.json()}catch{return json({error:"Invalid request"},400)}
  const city=clean(body.city,90);
  const countryCode=clean(body.countryCode,2).toUpperCase();
  if(city&&(!/^[\p{L}\p{N}\s.'\-()]{2,90}$/u.test(city)||!/^[A-Z]{2}$/.test(countryCode)))
    return json({error:"Enter a valid city and two-letter country code."},400);
  try{
    if(city){
      const client=serverClient();
      const key=countryCode.toLowerCase()+":"+nameKey(city);
      const {data:cached,error:cacheError}=await client.from("institution_city_cache")
        .select("response,refreshed_at").eq("lookup_key",key).maybeSingle();
      if(cacheError)throw new Error("City directory is temporarily unavailable.");
      const age=cached?.refreshed_at?Date.now()-new Date(cached.refreshed_at).getTime():Infinity;
      if(cached?.response&&age<CACHE_MS)return json({...cached.response,source:"cached-city-directory"});
      try{
        const directory=await cityDirectoryWithFallback(city,countryCode,client);
        const response={...directory,city,countryCode};
        // Serving the freshly fetched results does not require cache writes
        // to succeed. A cache write failure should not hide real results.
        await client.from("institution_city_cache").upsert({
          lookup_key:key,response,refreshed_at:new Date().toISOString()
        },{onConflict:"lookup_key"});
        return json(response);
      }catch(e){
        if(cached?.response)return json({...cached.response,source:"stale-city-directory"});
        throw e;
      }
    }
    const lat=Number(body.latitude),lon=Number(body.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90||lon< -180||lon>180)
      return json({error:"Enter a city or permit location to find institutions."},400);
    const radius=clamp(Number(body.radiusMeters)||18000,3000,40000);
    const y=Math.round(lat*1000)/1000,x=Math.round(lon*1000)/1000;
    const dlat=radius/111320,dlon=radius/(111320*Math.max(.25,Math.cos(rad(y))));
    const institutions=await queryOSM(y,x,[y-dlat,x-dlon,y+dlat,x+dlon],"");
    return json({institutions,source:"osm-nearby"});
  }catch(e){
    const msg=e instanceof Error?e.message:"Institution directory unavailable.";
    const permitted=[
      "City not found. Check city and country.",
      "City search is busy. Please retry shortly.",
      "City directory is temporarily unavailable.",
      "Institution directory is temporarily unavailable.",
      "City location could not be confirmed.",
      "Institution lookup is not configured."
    ];
    return json({error:permitted.includes(msg)?msg:"Institution directory is temporarily unavailable."},503);
  }
});
