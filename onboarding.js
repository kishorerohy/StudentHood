import { getSavedSession } from './auth.js?v=20261005-dob-1';
import { getMyProfile, completeMyProfile } from './profile.js?v=20261005-youth-1';

const form=document.querySelector('#profileForm');
const formView=document.querySelector('#onboardingFormView');
const doneView=document.querySelector('#onboardingDoneView');
const status=document.querySelector('#profileStatus');
const saveBtn=document.querySelector('#saveProfileBtn');
const bio=document.querySelector('#bio');
const bioCount=document.querySelector('#bioCount');
const countrySelect=document.querySelector('#countryCode');
const timeZoneInput=document.querySelector('#timeZone');
const timeZoneDisplay=document.querySelector('#timeZoneDisplay');

const ISO_COUNTRIES='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');

function setStatus(message,type=''){
  status.textContent=message;
  status.className='onboarding-status'+(type?' '+type:'');
}

function showDone(copy){
  formView.hidden=true;
  doneView.hidden=false;
  document.querySelector('#doneCopy').textContent=copy||'Your StudentHood profile is ready.';
}

function populateCountries(selected=''){
  if(!countrySelect) return;
  const displayNames=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});
  const options=ISO_COUNTRIES
    .map(code=>({code,name:displayNames.of(code)||code}))
    .sort((a,b)=>a.name.localeCompare(b.name));
  const frag=document.createDocumentFragment();
  for(const item of options){
    const option=document.createElement('option');
    option.value=item.code;
    option.textContent=item.name;
    if(item.code===selected) option.selected=true;
    frag.appendChild(option);
  }
  countrySelect.appendChild(frag);
}

function deviceRegion(){
  try{
    return new Intl.Locale(navigator.language).region||'';
  }catch{
    return '';
  }
}

function deviceTimeZone(){
  try{
    return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  }catch{
    return 'UTC';
  }
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

    const zone=profile.time_zone||deviceTimeZone();
    timeZoneInput.value=zone;
    timeZoneDisplay.value=zone;

    populateCountries(profile.country_code||deviceRegion());

    document.querySelector('#fullName').value=profile.full_name||session.user?.user_metadata?.full_name||session.user?.user_metadata?.name||'';
    document.querySelector('#username').value=profile.username||'';
    document.querySelector('#dateOfBirth').value=profile.date_of_birth||session.user?.user_metadata?.date_of_birth||'';
    document.querySelector('#dateOfBirth').max=new Date().toISOString().slice(0,10);
    document.querySelector('#dateOfBirth').min='1900-01-01';
    document.querySelector('#city').value=profile.city||'';
    document.querySelector('#campusName').value=profile.campus_name||'';
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
  const dateOfBirth=document.querySelector('#dateOfBirth').value.trim();
  const countryCode=countrySelect.value.trim().toUpperCase();
  const timeZone=timeZoneInput.value.trim();
  const city=document.querySelector('#city').value.trim();
  const campusName=document.querySelector('#campusName').value.trim();
  const bioValue=document.querySelector('#bio').value.trim();
  const interests=document.querySelector('#interests').value
    .split(',')
    .map(v=>v.trim())
    .filter(Boolean);

  if(!/^[a-z0-9_]{3,24}$/.test(username)){
    setStatus('Choose a username with 3 to 24 lowercase letters, numbers or underscores.','error');
    return;
  }

  if(!dateOfBirth){
    setStatus('Add your date of birth so StudentHood can apply the correct safety settings.','error');
    return;
  }

  if(!/^[A-Z]{2}$/.test(countryCode)){
    setStatus('Choose your country or region.','error');
    return;
  }

  if(!timeZone){
    setStatus('We could not detect your time zone. Reload the page and try again.','error');
    return;
  }

  if(interests.length>12){
    setStatus('Choose up to 12 interests.','error');
    return;
  }

  saveBtn.disabled=true;
  setStatus('Saving your profile and safety settings...');

  try{
    const profile=await completeMyProfile({
      fullName,
      username,
      dateOfBirth,
      countryCode,
      timeZone,
      city,
      campusName,
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
