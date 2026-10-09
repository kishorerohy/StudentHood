import {supabase} from './supabase';
import {getAvatarDisplayUrl,getProfileCard} from './api';
import {Share} from 'react-native';

const filterMap={
  'For you':'for_you',
  'Viral':'viral',
  'Nearby':'nearby',
  'Campus':'campus',
  'Live now':'live'
};

function extensionForAsset(asset){
  const fileName=String(asset?.fileName||asset?.uri||'').toLowerCase();
  const m=fileName.match(/\.([a-z0-9]+)(?:\?|$)/);
  if(m?.[1]) return m[1]==='jpeg'?'jpg':m[1];
  if(asset?.type==='video') return 'mp4';
  return 'jpg';
}

async function signMedia(scene){
  const author_avatar_url=await getAvatarDisplayUrl(scene?.author_avatar_url);
  const item={...scene,author_avatar_url};
  if(!scene?.media_url) return {...item,media_signed_url:null};
  if(/^https?:\/\//i.test(scene.media_url)) return {...item,media_signed_url:scene.media_url};

  const {data,error}=await supabase.storage.from('scene-media').createSignedUrl(scene.media_url,3600);
  if(error) return {...item,media_signed_url:null};
  return {...item,media_signed_url:data?.signedUrl||null};
}

export async function fetchScenes(filter='For you',limit=20,offset=0){
  const {data,error}=await supabase.rpc('studenthood_scene_feed',{
    p_filter:filterMap[filter]||'for_you',
    p_limit:limit,
    p_offset:offset
  });
  if(error) throw error;
  return Promise.all((data||[]).map(signMedia));
}

export async function toggleSceneLike(sceneId){
  const {data,error}=await supabase.rpc('studenthood_toggle_scene_like',{p_scene_id:sceneId});
  if(error) throw error;
  return data;
}

export async function createScene({body='',asset=null,visibility='campus'}){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('You are not signed in.');

  let mediaPath=null;
  let mediaType='text';

  if(asset?.uri){
    mediaType=asset.type==='video'?'video':'image';
    const ext=extensionForAsset(asset);
    mediaPath=`${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${ext}`;
    const response=await fetch(asset.uri);
    const arrayBuffer=await response.arrayBuffer();
    const contentType=asset.mimeType||(mediaType==='video'?'video/mp4':'image/jpeg');

    const {error:uploadError}=await supabase.storage
      .from('scene-media')
      .upload(mediaPath,arrayBuffer,{contentType,upsert:false});

    if(uploadError) throw uploadError;
  }

  const {data,error}=await supabase
    .from('scenes')
    .insert({
      author_id:user.id,
      body:String(body||'').trim()||null,
      media_url:mediaPath,
      media_type:mediaType,
      visibility
    })
    .select('id,author_id,body,media_url,media_type,visibility,content_class,moderation_status,created_at')
    .single();

  if(error){
    if(mediaPath) await supabase.storage.from('scene-media').remove([mediaPath]);
    throw error;
  }

  return signMedia(data);
}

export async function fetchSceneComments(sceneId){
  const {data,error}=await supabase
    .from('scene_comments')
    .select('id,scene_id,user_id,body,moderation_status,created_at')
    .eq('scene_id',sceneId)
    .order('created_at',{ascending:true});
  if(error) throw error;
  return data||[];
}

export async function addSceneComment(sceneId,body){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) throw userError;
  if(!user) throw new Error('You are not signed in.');

  const {data,error}=await supabase
    .from('scene_comments')
    .insert({scene_id:sceneId,user_id:user.id,body:String(body||'').trim()})
    .select('id,scene_id,user_id,body,moderation_status,created_at')
    .single();
  if(error) throw error;
  return data;
}


const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sceneShareUrl(sceneId){
  if(!UUID.test(String(sceneId||''))) throw new Error('Invalid Scene link.');
  // Landing page carries only a random Scene ID, never profile/media or a
  // signed private-storage URL. Actual viewing always checks signed-in RLS.
  return 'https://kishorerohy.github.io/StudentHood/scene.html?id='+sceneId.toLowerCase();
}

export async function shareScene(sceneId){
  const url=sceneShareUrl(sceneId);
  return Share.share({
    title:'StudentHood Scene',
    message:'View this Scene on StudentHood: '+url,
    url
  });
}

export async function fetchSharedScene(sceneId){
  if(!UUID.test(String(sceneId||''))) throw new Error('This Scene link is invalid.');
  const {data,error}=await supabase.from('scenes')
    .select('id,author_id,campus_name,body,media_url,media_type,visibility,content_class,moderation_status,created_at')
    .eq('id',sceneId).maybeSingle();
  if(error) throw error;
  // RLS must be satisfied for every recipient; do not leak whether a private
  // Scene exists if the viewer is ineligible or logged out.
  if(!data) throw new Error("This Scene isn't available to your account.");
  let author=null;
  try{author=await getProfileCard(data.author_id)}catch{}
  return signMedia({
    ...data,
    author_name:author?.full_name||null,
    author_username:author?.username||null,
    author_campus_name:author?.campus_name||null,
    author_avatar_url:author?.avatar_url||null,
    // Counts are not included in this RLS-scoped single-row request.
    comment_count:null,
    like_count:null
  });
}
