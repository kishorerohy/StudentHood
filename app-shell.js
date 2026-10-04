import {getSavedSession,clearSavedSession} from './auth.js?v=20261004-google-oauth';
import {getMyProfile} from './profile.js?v=20261004-1';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const scenes=[
  {name:'Maya Singh',handle:'@maya',meta:'Your campus · 12 min',avatar:'assets/collage1.jpg',image:'assets/feature_hangs.jpg',caption:'Friday night on the quad. The whole campus showed up.'},
  {name:'Arjun Mehta',handle:'@arjun',meta:'Your campus · 34 min',avatar:'assets/profile_face.jpg',image:'assets/hero_group.jpg',caption:'Study crew, coffee, then sunset.'},
  {name:'Priya Nair',handle:'@priya',meta:'Your campus · 1 h',avatar:'assets/collage3.jpg',image:'assets/feature_scenes.jpg',caption:'Golden hour between lectures ✨'}
];

let currentScene=0;
let touchStart={x:0,y:0};
let viewerControlsVisible=true;

function openSheet(id){
  const sheet=document.getElementById(id);
  if(!sheet) return;
  closeSheets();
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden','false');
  $('#sheetBackdrop').hidden=false;
  document.body.style.overflow='hidden';
}
function closeSheets(){
  $$('.app-sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')});
  $('#sheetBackdrop').hidden=true;
  document.body.style.overflow='';
}
$$('[data-panel]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.panel)));
$$('[data-close-sheet]').forEach(b=>b.addEventListener('click',closeSheets));
$('#sheetBackdrop').addEventListener('click',closeSheets);

function showTab(tab){
  $$('.dial-item').forEach(b=>{
    const active=b.dataset.tab===tab;
    b.classList.toggle('active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  const live=tab==='scenes';
  $('.pulse-strip').hidden=!live;
  $('.scene-filters').hidden=!live;
  $('.campus-now').hidden=!live;
  $('#sceneFeed').hidden=!live;
  $('.campus-rail').hidden=!live;
  $('#tabPlaceholder').hidden=live;
  if(live){
    $('#pageTitle').textContent='Scenes';
    document.title='Scenes | StudentHood';
    return;
  }
  const copy={
    hangs:['Hangs','Make plans, join campus meetups and see what is happening nearby.'],
    gigs:['Gigs','Student-friendly opportunities, projects and work, formatted for your locale.'],
    profile:['My Profile','Your identity, Scenes, Hangs, Crews, Gigs, privacy and account settings.']
  };
  const [title,desc]=copy[tab]||['StudentHood',''];
  $('#pageTitle').textContent=title;
  $('#placeholderTitle').textContent=title;
  $('#placeholderCopy').textContent=desc;
  document.title=title+' | StudentHood';
}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
$$('[data-tab-target]').forEach(b=>b.addEventListener('click',()=>{closeSheets();showTab(b.dataset.tabTarget)}));

function applyFilter(filter){
  $$('.filter-chip').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  $$('.scene-post').forEach(post=>{
    post.hidden=!post.dataset.tags.split(' ').includes(filter);
  });
}
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.filter)));
$$('[data-filter-shortcut]').forEach(b=>b.addEventListener('click',()=>{
  applyFilter(b.dataset.filterShortcut);
  $('#sceneFeed').scrollIntoView({behavior:'smooth',block:'start'});
}));

function renderViewer(index){
  currentScene=(index+scenes.length)%scenes.length;
  const scene=scenes[currentScene];
  $('#viewerImage').src=scene.image;
  $('#viewerAvatar').src=scene.avatar;
  $('#viewerName').textContent=scene.name;
  $('#viewerMeta').textContent=scene.meta;
  $('#viewerCaption').textContent=scene.caption;
}
function openViewer(index){
  renderViewer(index);
  $('#sceneViewer').hidden=false;
  document.body.style.overflow='hidden';
}
function closeViewer(){
  $('#sceneViewer').hidden=true;
  document.body.style.overflow='';
}
$$('[data-open-scene]').forEach(b=>b.addEventListener('click',()=>openViewer(Number(b.dataset.openScene))));
$('#viewerClose').addEventListener('click',closeViewer);

function openCreatorProfile(index=currentScene){
  const scene=scenes[index];
  $('#profilePeekAvatar').src=scene.avatar;
  $('#profilePeekName').textContent=scene.name;
  $('#profilePeekHandle').textContent=scene.handle+' · Your campus';
  $('#profilePeek').hidden=false;
  $('#sceneViewer').hidden=true;
}
function backToViewer(){
  $('#profilePeek').hidden=true;
  $('#sceneViewer').hidden=false;
}
$('#profileBack').addEventListener('click',backToViewer);
$$('[data-profile]').forEach((b,i)=>b.addEventListener('click',()=>{openViewer(i%scenes.length);openCreatorProfile(i%scenes.length)}));

function beginGesture(e,scope){
  const p=e.touches?e.touches[0]:e;
  touchStart={x:p.clientX,y:p.clientY,scope};
}
function endGesture(e,scope){
  const p=e.changedTouches?e.changedTouches[0]:e;
  const dx=p.clientX-touchStart.x;
  const dy=p.clientY-touchStart.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<46) return;
  if(scope==='viewer'){
    if(Math.abs(dx)>Math.abs(dy)&&dx<0){openCreatorProfile();return;}
    if(Math.abs(dy)>=Math.abs(dx)&&dy<0){renderViewer(currentScene+1);return;}
    if(Math.abs(dy)>=Math.abs(dx)&&dy>0){renderViewer(currentScene-1);return;}
  }
  if(scope==='profile'&&Math.abs(dx)>Math.abs(dy)&&dx>0){backToViewer();}
}
const viewerStage=$('#viewerStage');
viewerStage.addEventListener('touchstart',e=>beginGesture(e,'viewer'),{passive:true});
viewerStage.addEventListener('touchend',e=>endGesture(e,'viewer'),{passive:true});
$('#profilePeek').addEventListener('touchstart',e=>beginGesture(e,'profile'),{passive:true});
$('#profilePeek').addEventListener('touchend',e=>endGesture(e,'profile'),{passive:true});
viewerStage.addEventListener('click',e=>{
  if(e.target.closest('button'))return;
  viewerControlsVisible=!viewerControlsVisible;
  $$('.viewer-creator,.viewer-copy,.viewer-actions').forEach(el=>el.style.opacity=viewerControlsVisible?'1':'0');
});

$$('[data-post-menu]').forEach(b=>b.addEventListener('click',()=>openSheet('postMenu')));
$$('.post-actions button[aria-label="Like"]').forEach(b=>b.addEventListener('click',()=>{
  const liked=b.dataset.liked==='1';
  b.dataset.liked=liked?'0':'1';
  b.firstChild.textContent=liked?'♡ ':'♥ ';
  b.style.color=liked?'':'var(--accent)';
}));

$('#globalSearch').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();
  $$('.scene-post').forEach(post=>{
    if(!q){post.hidden=false;return;}
    post.hidden=!post.textContent.toLowerCase().includes(q);
  });
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('#profilePeek').hidden){backToViewer();return;}
    if(!$('#sceneViewer').hidden){closeViewer();return;}
    closeSheets();
  }
  if(!$('#sceneViewer').hidden){
    if(e.key==='ArrowUp')renderViewer(currentScene+1);
    if(e.key==='ArrowDown')renderViewer(currentScene-1);
    if(e.key==='ArrowLeft')openCreatorProfile();
  }
});

async function hydrateUser(){
  const session=getSavedSession();
  if(!session?.access_token)return;
  try{
    const profile=await getMyProfile();
    if(profile?.city)$('#campusName').textContent=profile.city;
  }catch{}
}
hydrateUser();
