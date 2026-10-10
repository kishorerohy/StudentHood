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
  if(!response.ok)throw new Error("City directory is temporarily unavailable.");
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
        const location=await geocodeCity(city,countryCode,client);
        const institutions=await queryOSM(location.lat,location.lon,location.bounds,city);
        const response={institutions,city,countryCode,source:"osm-city-directory"};
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
