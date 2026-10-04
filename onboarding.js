import { getSavedSession } from './auth.js?v=20261004-google-oauth';
import { getMyProfile, completeMyProfile } from './profile.js?v=20261004-1';

const form=document.querySelector('#profileForm');
const formView=document.querySelector('#onboardingFormView');
const doneView=document.querySelector('#onboardingDoneView');
const status=document.querySelector('#profileStatus');
const saveBtn=document.querySelector('#saveProfileBtn');
const bio=document.querySelector('#bio');
const bioCount=document.querySelector('#bioCount');

function setStatus(message,type=''){
  status.textContent=message;
  status.className='onboarding-status'+(type?' '+type:'');
}

function showDone(copy){
  formView.hidden=true;
  doneView.hidden=false;
  document.querySelector('#doneCopy').textContent=copy||'Your StudentHood profile is ready.';
}

bio?.addEventListener('input',()=>{
  bioCount.textContent=String(bio.value.length);
});

(async function init(){
  const session=getSavedSession();
  if(!session?.access_token||!session?.user?.id){
    location.replace('index.html?auth=signin');
    return;
  }

  try{
    const profile=await getMyProfile();
    if(!profile){
      setStatus('We could not find your StudentHood profile. Please log in again.','error');
      return;
    }

    if(profile.onboarding_completed){
      location.replace('app.html');
      return;
    }

    document.querySelector('#fullName').value=profile.full_name||session.user?.user_metadata?.full_name||session.user?.user_metadata?.name||'';
    document.querySelector('#username').value=profile.username||'';
    document.querySelector('#city').value=profile.city||'';
    document.querySelector('#bio').value=profile.bio||'';
    bioCount.textContent=String((profile.bio||'').length);
    document.querySelector('#interests').value=(profile.interests||[]).join(', ');
  }catch(error){
    setStatus(error.message||'Could not load your profile.','error');
  }
})();

form?.addEventListener('submit',async event=>{
  event.preventDefault();

  const fullName=document.querySelector('#fullName').value.trim();
  const username=document.querySelector('#username').value.trim().toLowerCase();
  const city=document.querySelector('#city').value.trim();
  const bioValue=document.querySelector('#bio').value.trim();
  const interests=document.querySelector('#interests').value
    .split(',')
    .map(v=>v.trim())
    .filter(Boolean);

  if(!/^[a-z0-9_]{3,24}$/.test(username)){
    setStatus('Choose a username with 3 to 24 lowercase letters, numbers or underscores.','error');
    return;
  }

  if(interests.length>12){
    setStatus('Choose up to 12 interests.','error');
    return;
  }

  saveBtn.disabled=true;
  setStatus('Saving your profile...');

  try{
    const profile=await completeMyProfile({
      fullName,
      username,
      city,
      bio:bioValue,
      interests
    });

    if(!profile?.onboarding_completed){
      throw new Error('Your profile could not be completed.');
    }

    setStatus('Profile saved.','ok');
    showDone(`Welcome, ${profile.full_name||'you'}. Your StudentHood profile is ready.`);
  }catch(error){
    const message=String(error.message||'Could not save your profile.');
    if(message.toLowerCase().includes('duplicate')||message.toLowerCase().includes('unique')){
      setStatus('That username is already taken. Try another one.','error');
    }else{
      setStatus(message,'error');
    }
  }finally{
    saveBtn.disabled=false;
  }
});
