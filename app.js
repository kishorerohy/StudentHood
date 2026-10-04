const $=(s)=>document.querySelector(s);
const $$=(s)=>document.querySelectorAll(s);

const nav=$('.nav');
const toggle=$('.mobile-toggle');

function setNavOpen(open){
  if(!nav||!toggle) return;
  nav.classList.toggle('open',open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
}

if(toggle){
  toggle.addEventListener('click',()=>setNavOpen(!nav.classList.contains('open')));
}
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>setNavOpen(false)));

let lastFocused=null;

function focusableIn(modal){
  return [...modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(el=>!el.hasAttribute('hidden'));
}

function openModal(id,trigger){
  const modal=$('#'+id);
  if(!modal) return;
  lastFocused=trigger||document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  const targets=focusableIn(modal);
  (modal.querySelector('.close')||targets[0])?.focus();
}

function closeModalElement(modal){
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  if(lastFocused && typeof lastFocused.focus==='function') lastFocused.focus();
  lastFocused=null;
}

function closeModal(el){
  closeModalElement(el.closest('.modal'));
}

$$('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal,b)));
$$('.close').forEach(b=>b.addEventListener('click',()=>closeModal(b)));
$$('.modal').forEach(m=>{
  if(!m.hasAttribute('aria-hidden')) m.setAttribute('aria-hidden','true');
  m.addEventListener('click',e=>{if(e.target===m) closeModalElement(m);});
});

document.addEventListener('keydown',e=>{
  const openModalEl=$('.modal.open');
  if(e.key==='Escape'){
    if(openModalEl){closeModalElement(openModalEl);return;}
    if(nav?.classList.contains('open')) setNavOpen(false);
  }
  if(e.key==='Tab' && openModalEl){
    const items=focusableIn(openModalEl);
    if(!items.length) return;
    const first=items[0], last=items[items.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  }
});

$('#waitlistForm')?.addEventListener('submit',async e=>{
  e.preventDefault();

  const form=e.currentTarget;
  const btn=form.querySelector('button[type="submit"],button');
  const note=form.querySelector('.fine');
  const formData=new FormData(form);

  const name=String(formData.get('name')||'').trim();
  const email=String(formData.get('email')||'').trim().toLowerCase();
  const cityValue=String(formData.get('city')||'').trim();
  const city=cityValue||null;

  if(!name || !email){
    if(note) note.textContent='Please enter your name and email.';
    return;
  }

  const originalText=btn.textContent;
  btn.disabled=true;
  btn.textContent='Joining...';

  try{
    const response=await fetch('https://tkznlyoflopxxnkthjtb.supabase.co/rest/v1/waitlist',{
      method:'POST',
      headers:{
        'apikey':'sb_publishable_DiolULbdNTpIDst11yfc-A_tmNCjCmV',
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify({name,email,city})
    });

    if(response.ok){
      btn.textContent='You’re on the list ✓';
      if(note) note.textContent='Thanks for joining StudentHood. We’ll keep you posted on launch updates.';
      form.querySelectorAll('input').forEach(input=>input.disabled=true);
      return;
    }

    let errorBody={};
    try{ errorBody=await response.json(); }catch{}

    if(response.status===409 || errorBody.code==='23505'){
      btn.textContent='You’re already on the list ✓';
      if(note) note.textContent='That email is already registered for StudentHood launch updates.';
      return;
    }

    throw new Error(errorBody.message||'Waitlist submission failed');
  }catch(error){
    console.error('Waitlist submission error:',error);
    btn.disabled=false;
    btn.textContent=originalText;
    if(note) note.textContent='We couldn’t add you right now. Please try again.';
  }
});

$('#signinForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  alert('Authentication will be connected in the next build step.');
});
