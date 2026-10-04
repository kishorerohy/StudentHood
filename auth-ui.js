import {
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset,
  getOAuthUrl,
  saveSession,
  consumeOAuthSessionFromUrl
} from './auth.js?v=20261005-youth-1';

const $=(s)=>document.querySelector(s);
const $$=(s)=>document.querySelectorAll(s);

const ISO_COUNTRIES='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');

function setStatus(el,message,type=''){
  if(!el) return;
  el.textContent=message;
  el.className='auth-status'+(type?' '+type:'');
}

function ageOnDate(dateOfBirth){
  const dob=new Date(dateOfBirth+'T00:00:00');
  if(Number.isNaN(dob.getTime())) return null;
  const now=new Date();
  let age=now.getFullYear()-dob.getFullYear();
  const m=now.getMonth()-dob.getMonth();
  if(m<0||(m===0&&now.getDate()<dob.getDate())) age--;
  return age;
}

function youthSignupDecision(dateOfBirth,countryCode){
  const age=ageOnDate(dateOfBirth);
  const country=String(countryCode||'').toUpperCase();
  if(age===null||age<0) return {allowed:false,message:'Enter a valid date of birth.'};

  if(country==='AU'&&age<16){
    return {allowed:false,message:'StudentHood cannot create an account for users under 16 in Australia under the current social-media age rules.'};
  }

  if(country==='IN'&&age<18){
    return {allowed:false,message:'A verifiable parent or guardian approval is required before StudentHood can create an under-18 account in India. The guardian approval flow must be completed first.'};
  }

  if(country==='US'&&age<13){
    return {allowed:false,message:'Parent or guardian approval is required before StudentHood can create this account.'};
  }

  return {allowed:true,age};
}

function populateSignupCountries(){
  const select=signupForm?.querySelector('select[name="signupCountryCode"]');
  if(!select||select.options.length>1) return;
  const displayNames=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});
  const region=(()=>{try{return new Intl.Locale(navigator.language).region||''}catch{return ''}})();
  const options=ISO_COUNTRIES.map(code=>({code,name:displayNames.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name));
  const frag=document.createDocumentFragment();
  for(const item of options){
    const option=document.createElement('option');
    option.value=item.code;
    option.textContent=item.name;
    if(item.code===region) option.selected=true;
    frag.appendChild(option);
  }
  select.appendChild(frag);
}

function currentSignupSafetyData(){
  const dateOfBirth=signupForm?.querySelector('input[name="dateOfBirth"]')?.value?.trim()||'';
  const countryCode=signupForm?.querySelector('select[name="signupCountryCode"]')?.value?.trim().toUpperCase()||'';
  const timeZone=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}})();
  return {dateOfBirth,countryCode,timeZone};
}

const signupForm=$('#signupForm');
const signupStatus=$('#signupStatus');
const dateOfBirthInput=signupForm?.querySelector('input[name="dateOfBirth"]');

if(dateOfBirthInput){
  dateOfBirthInput.max=new Date().toISOString().slice(0,10);
  dateOfBirthInput.min='1900-01-01';
}
populateSignupCountries();

signupForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=signupForm.querySelector('button[type="submit"]');
  const data=new FormData(signupForm);
  const safety=currentSignupSafetyData();
  const decision=youthSignupDecision(safety.dateOfBirth,safety.countryCode);

  if(!decision.allowed){
    setStatus(signupStatus,decision.message,'error');
    return;
  }

  btn.disabled=true;
  setStatus(signupStatus,'Creating your StudentHood account...');

  try{
    const result=await signUpWithEmail({
      fullName:data.get('fullName'),
      dateOfBirth:safety.dateOfBirth,
      countryCode:safety.countryCode,
      timeZone:safety.timeZone,
      email:data.get('email'),
      password:data.get('password'),
      redirectTo:new URL('index.html?auth=signin&verified=1',location.href).href
    });

    if(result.access_token){
      saveSession(result);
      setStatus(signupStatus,'Account created successfully.','ok');
      location.assign('onboarding.html');
    }else{
      setStatus(signupStatus,'Account created. Check your email to verify your address.','ok');
    }
  }catch(error){
    setStatus(signupStatus,error.message||'Could not create your account.','error');
  }finally{
    btn.disabled=false;
  }
});

const signinForm=$('#signinForm');
const signinStatus=$('#signinStatus');

signinForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=signinForm.querySelector('button[type="submit"]');
  const data=new FormData(signinForm);

  btn.disabled=true;
  setStatus(signinStatus,'Signing you in...');

  try{
    const result=await signInWithEmail({
      email:data.get('email'),
      password:data.get('password')
    });
    saveSession(result);
    setStatus(signinStatus,'Signed in successfully.','ok');
    location.assign('onboarding.html');
  }catch(error){
    setStatus(signinStatus,error.message||'Could not sign you in.','error');
  }finally{
    btn.disabled=false;
  }
});

$('#resetPasswordBtn')?.addEventListener('click',async()=>{
  const email=signinForm?.querySelector('input[name="email"]')?.value?.trim();

  if(!email){
    setStatus(signinStatus,'Enter your email first.','error');
    return;
  }

  const btn=$('#resetPasswordBtn');
  btn.disabled=true;

  try{
    await requestPasswordReset({
      email,
      redirectTo:new URL('index.html?auth=signin&reset=1',location.href).href
    });
    setStatus(signinStatus,'Password reset email sent.','ok');
  }catch(error){
    setStatus(signinStatus,error.message||'Could not send the reset email.','error');
  }finally{
    btn.disabled=false;
  }
});

$$('[data-provider]').forEach(button=>{
  button.addEventListener('click',()=>{
    const provider=button.dataset.provider;
    const isJoin=!!button.closest('#join');
    const status=isJoin?signupStatus:signinStatus;

    if(provider==='google'){
      if(isJoin){
        const safety=currentSignupSafetyData();
        const decision=youthSignupDecision(safety.dateOfBirth,safety.countryCode);
        if(!safety.dateOfBirth||!safety.countryCode){
          setStatus(status,'Add your date of birth and country or region before continuing with Google.','error');
          return;
        }
        if(!decision.allowed){
          setStatus(status,decision.message,'error');
          return;
        }
        sessionStorage.setItem('studenthood_pending_signup_safety',JSON.stringify(safety));
      }

      const redirectTo=new URL('index.html?oauth=1',location.href).href;
      setStatus(status,'Opening Google sign-in...');
      window.location.assign(getOAuthUrl('google',redirectTo));
      return;
    }

    setStatus(status,'Apple sign-in is being connected. Email and Google sign-in are available now.');
  });
});

(async function handleOAuthReturn(){
  const query=new URLSearchParams(location.search);
  const hasOAuthReturn=
    query.get('oauth')==='1' ||
    location.hash.includes('access_token=') ||
    location.hash.includes('error=');

  if(!hasOAuthReturn) return;

  try{
    const session=await consumeOAuthSessionFromUrl();
    if(!session) return;

    const raw=sessionStorage.getItem('studenthood_pending_signup_safety');
    if(raw){
      try{
        const pending=JSON.parse(raw);
        const {initializeSafetyProfile}=await import('./profile.js?v=20261005-youth-1');
        await initializeSafetyProfile(pending);
      }finally{
        sessionStorage.removeItem('studenthood_pending_signup_safety');
      }
    }

    history.replaceState(null,'',location.pathname);
    location.replace('onboarding.html');
  }catch(error){
    document.querySelector('[data-modal="signin"]')?.click();
    setStatus(signinStatus,error.message||'Google sign-in could not be completed.','error');
  }
})();
