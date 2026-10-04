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


const authParam=new URLSearchParams(window.location.search).get('auth');
if(authParam==='join'||authParam==='signin'){
  window.addEventListener('DOMContentLoaded',()=>{
    const trigger=document.querySelector(`[data-modal="${authParam}"]`);
    openModal(authParam,trigger||document.activeElement);
  },{once:true});
}

$$('[data-modal-switch]').forEach(button=>{
  button.addEventListener('click',()=>{
    const current=button.closest('.modal');
    const target=button.dataset.modalSwitch;
    if(current){
      current.classList.remove('open');
      current.setAttribute('aria-hidden','true');
    }
    openModal(target,button);
  });
});
