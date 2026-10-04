import {
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset,
  getOAuthUrl,
  saveSession
} from './auth.js';

const $=(s)=>document.querySelector(s);
const $$=(s)=>document.querySelectorAll(s);

function setStatus(el,message,type=''){
  if(!el) return;
  el.textContent=message;
  el.className='auth-status'+(type?' '+type:'');
}

const signupForm=$('#signupForm');
const signupStatus=$('#signupStatus');

signupForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=signupForm.querySelector('button[type="submit"]');
  const data=new FormData(signupForm);

  btn.disabled=true;
  setStatus(signupStatus,'Creating your StudentHood account...');

  try{
    const result=await signUpWithEmail({
      fullName:data.get('fullName'),
      email:data.get('email'),
      password:data.get('password'),
      redirectTo:new URL('index.html?auth=signin&verified=1',location.href).href
    });

    if(result.access_token){
      saveSession(result);
      setStatus(signupStatus,'Account created successfully.','ok');
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

    // Do not route into app.html yet. That page remains a temporary,
    // unapproved signed-in UI and stays noindexed.
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

$('[data-provider]').forEach(button=>{
  button.addEventListener('click',()=>{
    const provider=button.dataset.provider;
    const status=button.closest('#join') ? signupStatus : signinStatus;
    const label=provider==='google'?'Google':'Apple';
    setStatus(status,`${label} sign-in is being connected. Email registration and sign-in are available now.`);
  });
});




function ensureAppleFrame(context){
  const frame=document.querySelector(`[data-apple-frame="${context}"]`);
  if(frame && !frame.getAttribute('src')){
    frame.setAttribute('src','apple-auth-button.html?v=1');
  }
}

$$('[data-modal]').forEach(trigger=>{
  trigger.addEventListener('click',()=>{
    const target=trigger.dataset.modal;
    if(target==='join'||target==='signin'){
      setTimeout(()=>ensureAppleFrame(target),0);
    }
  });
});

$$('[data-modal-switch]').forEach(trigger=>{
  trigger.addEventListener('click',()=>{
    const target=trigger.dataset.modalSwitch;
    if(target==='join'||target==='signin'){
      setTimeout(()=>ensureAppleFrame(target),0);
    }
  });
});

const initialAuthTarget=new URLSearchParams(location.search).get('auth');
if(initialAuthTarget==='join'||initialAuthTarget==='signin'){
  setTimeout(()=>ensureAppleFrame(initialAuthTarget),0);
}
