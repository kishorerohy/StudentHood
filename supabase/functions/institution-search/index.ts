import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_RADIUS = 25000;
const DEFAULT_RADIUS = 18000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}
function clamp(value:number,min:number,max:number){return Math.min(Math.max(value,min),max)}
function rad(value:number){return value*Math.PI/180}
function distanceMeters(aLat:number,aLon:number,bLat:number,bLon:number){
  const earth=6371000;
  const dLat=rad(bLat-aLat),dLon=rad(bLon-aLon);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;
  return 2*earth*Math.asin(Math.sqrt(x));
}
function normalizedName(value:string){
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  let body:Record<string,unknown>;
  try{body=await req.json()}catch{return json({error:"Invalid request"},400)}
  const rawLat=Number(body.latitude),rawLon=Number(body.longitude),rawRadius=Number(body.radiusMeters??DEFAULT_RADIUS);
  if(!Number.isFinite(rawLat)||!Number.isFinite(rawLon)||rawLat< -90||rawLat>90||rawLon< -180||rawLon>180){
    return json({error:"Invalid location"},400);
  }
  const radius=clamp(Number.isFinite(rawRadius)?rawRadius:DEFAULT_RADIUS,3000,MAX_RADIUS);
  const latitude=Math.round(rawLat*1000)/1000,longitude=Math.round(rawLon*1000)/1000;
  const query=`[out:json][timeout:12];
(
  nwr(around:${Math.round(radius)},${latitude},${longitude})["amenity"~"^(school|college|university)$"]["name"];
);
out center tags 120;`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),14000);
  try{
    const response=await fetch(OVERPASS_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent":"StudentHood/0.1.5 (+https://kishorerohy.github.io/StudentHood/)",
        "Referer":"https://kishorerohy.github.io/StudentHood/"
      },
      body:new URLSearchParams({data:query}).toString(),
      signal:controller.signal
    });
    if(!response.ok) return json({error:"Institution directory is temporarily unavailable"},503);
    const data=await response.json();
    const source=Array.isArray(data?.elements)?data.elements:[];
    const candidates=source.map((element:any)=>{
      const lat=Number(element?.lat??element?.center?.lat),lon=Number(element?.lon??element?.center?.lon);
      const name=String(element?.tags?.name??"").trim(),amenity=String(element?.tags?.amenity??"").trim().toLowerCase();
      if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||!["school","college","university"].includes(amenity)) return null;
      return {
        id:`osm:${element.type}:${element.id}`,name,type:amenity,
        city:String(element?.tags?.["addr:city"]??"").trim()||null,
        suburb:String(element?.tags?.["addr:suburb"]??"").trim()||null,
        postcode:String(element?.tags?.["addr:postcode"]??"").trim()||null,
        distance_m:Math.round(distanceMeters(latitude,longitude,lat,lon)),
        lat,lon,rank:element.type==="relation"?0:element.type==="way"?1:2
      };
    }).filter(Boolean).sort((a:any,b:any)=>a.distance_m-b.distance_m||a.rank-b.rank);
    const chosen:any[]=[];
    for(const item of candidates){
      const key=normalizedName(item.name);
      const duplicate=chosen.find(existing=>normalizedName(existing.name)===key&&distanceMeters(existing.lat,existing.lon,item.lat,item.lon)<1500);
      if(duplicate) continue;
      chosen.push(item);
      if(chosen.length>=80) break;
    }
    return json({institutions:chosen.map(({lat,lon,rank,...item})=>item)});
  }catch{
    return json({error:"Institution directory is temporarily unavailable"},503);
  }finally{clearTimeout(timer)}
});
