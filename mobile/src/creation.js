import {supabase} from './supabase';

const TYPES={
  Pulse:{table:'pulse_entries',owner:'author_id'},
  Hangs:{table:'hangs',owner:'creator_id'},
  Crews:{table:'crews',owner:'creator_id'},
  Gigs:{table:'gigs',owner:'creator_id'}
};
const CATEGORIES={
  Hangs:['Social','Study','Sports','Culture','Other'],
  Crews:['Study','Arts','Tech','Sports','Other'],
  Gigs:['Part-time','Internship','Campus','Remote','Other']
};

function requireText(value,name,min,max){
  const text=String(value||'').trim();
  if(text.length<min||text.length>max)throw new Error(name+' must be '+min+'–'+max+' characters.');
  return text;
}

function validate(kind,values,asset){
  const visibility=String(values.visibility||'campus');
  if(kind==='Pulse'){
    const body=String(values.body||'').trim();
    if(body.length>500)throw new Error('Pulse text is limited to 500 characters.');
    if(!body&&!asset?.uri)throw new Error('Add a moment, photo or video.');
    if(!['peeps','campus'].includes(visibility))throw new Error('Choose your Pulse audience.');
    return {body:body||null,visibility};
  }
  if(kind==='Hangs'){
    const date=new Date(values.startsAt);
    const now=Date.now();
    if(!Number.isFinite(date.getTime())||date.getTime()<=now||date.getTime()>=now+366*86400000)
      throw new Error('Choose a Hang time in the next 12 months.');
    const capacityText=String(values.capacity||'').trim();
    const capacity=capacityText?Number(capacityText):null;
    if(capacity!==null&&(!Number.isInteger(capacity)||capacity<2||capacity>1000))
      throw new Error('Capacity must be between 2 and 1,000.');
    if(!['campus','peeps'].includes(visibility))throw new Error('Choose who can see this Hang.');
    if(!CATEGORIES.Hangs.includes(values.category))throw new Error('Choose a Hang category.');
    return {
      title:requireText(values.title,'Hang title',3,100),
      description:requireText(values.description,'Description',10,2000),
      category:values.category,starts_at:date.toISOString(),
      location_hint:requireText(values.locationHint,'Meeting place',3,120),
      capacity,visibility
    };
  }
  if(kind==='Crews'){
    if(!CATEGORIES.Crews.includes(values.category))throw new Error('Choose a Crew category.');
    if(!['campus','invite_only'].includes(visibility))throw new Error('Choose Crew visibility.');
    return {
      name:requireText(values.name,'Crew name',3,80),
      description:requireText(values.description,'Description',10,1500),
      category:values.category,visibility
    };
  }
  if(kind==='Gigs'){
    if(!CATEGORIES.Gigs.includes(values.category))throw new Error('Choose a Gig category.');
    const pay=String(values.payAmount||'').trim();
    if(!/^\d+(\.\d{1,2})?$/.test(pay)||Number(pay)<=0||Number(pay)>99999999)
      throw new Error('Enter a valid positive pay amount, up to two decimal places.');
    const currency=String(values.payCurrency||'').trim().toUpperCase();
    if(!/^[A-Z]{3}$/.test(currency))throw new Error('Enter an ISO currency code, such as GBP or INR.');
    if(!['hour','day','project'].includes(values.payUnit))throw new Error('Choose the pay period.');
    return {
      title:requireText(values.title,'Gig title',3,100),
      employer_name:requireText(values.employerName,'Employer',2,120),
      description:requireText(values.description,'Description',20,2500),
      location_hint:requireText(values.locationHint,'Work location',2,120),
      category:values.category,
      pay_amount:Number(pay),pay_currency:currency,pay_unit:values.payUnit
    };
  }
  throw new Error('Unknown creation type.');
}

export async function submitStudentCreation(kind,values={},asset=null){
  const type=TYPES[kind];
  if(!type)throw new Error('Unknown creation type.');
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError)throw authError;
  if(!user)throw new Error('Sign in to create.');
  const {data:policy,error:policyError}=await supabase.rpc('studenthood_access_policy');
  if(policyError)throw policyError;
  if(policy?.app_access!==true)throw new Error('Creating is restricted by your account or current safety settings.');
  if(kind==='Gigs'&&Number(policy.conservative_age||0)<18)
    throw new Error('Gig submissions require an adult account.');
  const input=validate(kind,values,asset);
  let uploadedPath=null;
  let attemptedInsert=false;
  try{
    if(kind==='Pulse'&&asset?.uri){
      const mime=asset.mimeType||'';
      const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'};
      const ext=extensions[mime];
      if(!ext)throw new Error('Pulse accepts JPG, PNG, WebP, or MP4.');
      const bytes=await (await fetch(asset.uri)).arrayBuffer();
      if(bytes.byteLength>50*1024*1024)throw new Error('Pulse media must be under 50 MB.');
      uploadedPath=user.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+ext;
      const {error}=await supabase.storage.from('pulse-media')
        .upload(uploadedPath,bytes,{contentType:mime,upsert:false});
      if(error)throw error;
      input.media_path=uploadedPath;
      input.media_type=mime==='video/mp4'?'video':'image';
    }
    const payload={...input,[type.owner]:user.id,moderation_status:'pending'};
    // Campus is assigned by the server from the user's existing profile.
    attemptedInsert=true;
    const {data,error}=await supabase.from(type.table)
      .insert(payload)
      .select('id,moderation_status,created_at').single();
    if(error)throw error;
    if(!data?.id||data.moderation_status!=='pending')
      throw new Error('Submission could not be verified.');
    const {data:confirmed,error:confirmError}=await supabase.from(type.table)
      .select('id,moderation_status,created_at')
      .eq('id',data.id).eq(type.owner,user.id).maybeSingle();
    if(confirmError||!confirmed?.id||confirmed.moderation_status!=='pending')
      throw new Error('Submission was received but could not be verified; please check My submissions before retrying.');
    return confirmed;
  }catch(e){
    // A failed network request may still have created the row. Remove orphaned
    // media only if submission was never attempted; preserve media otherwise
    // so that an uncertain result cannot break an already-saved Pulse.
    if(uploadedPath&&!attemptedInsert){
      await supabase.storage.from('pulse-media').remove([uploadedPath]).catch(()=>{});
    }
    throw e;
  }
}

export async function getMyStudentSubmissions(kind,{limit=20}={}){
  const type=TYPES[kind];
  if(!type)return [];
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError)throw authError;
  if(!user)return [];
  const {data,error}=await supabase.from(type.table)
    .select('*').eq(type.owner,user.id)
    .order('created_at',{ascending:false}).limit(Math.min(Math.max(limit,1),40));
  if(error)throw error;
  return data||[];
}
