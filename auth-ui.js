import {
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset,
  getOAuthUrl,
  saveSession,
  consumeOAuthSessionFromUrl
} from './auth.js?v=20261005-dob-1';

const $=(s)=>document.querySelector(s);
const $$=(s)=>document.querySelectorAll(s);

function setStatus(el,message,type=''){
  if(!el) return;
  el.textContent=message;
  el.className='auth-status'+(type?' '+type:'');
}

const signupForm=$('#signupForm');
const signupStatus=$('#signupStatus');
const dateOfBirthInput=signupForm?.querySelector('input[name="dateOfBirth"]');
if(dateOfBirthInput){
  dateOfBirthInput.max=new Date().toISOString().slice(0,10);
  dateOfBirthInput.min='1900-01-01';
}

signupForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=signupForm.querySelector('button[type="submit"]');
  const data=new FormData(signupForm);

  btn.disabled=true;
  setStatus(signupStatus,'Creating your StudentHood account...');

  try{
    const result=await signUpWithEmail({
      fullName:data.get('fullName'),
      dateOfBirth:data.get('dateOfBirth'),
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
    const status=button.closest('#join') ? signupStatus : signinStatus;

    if(provider==='google'){
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

    history.replaceState(null,'',location.pathname);
    location.replace('onboarding.html');
  }catch(error){
    document.querySelector('[data-modal="signin"]')?.click();
    setStatus(signinStatus,error.message||'Google sign-in could not be completed.','error');
  }
})();
