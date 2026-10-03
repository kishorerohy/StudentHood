const $=(s)=>document.querySelector(s); const $$=(s)=>document.querySelectorAll(s);
const nav=$('.nav'), toggle=$('.mobile-toggle'); if(toggle) toggle.addEventListener('click',()=>nav.classList.toggle('open'));
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
function openModal(id){$('#'+id)?.classList.add('open')} function closeModal(el){el.closest('.modal')?.classList.remove('open')}
$$('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal)));
$$('.close').forEach(b=>b.addEventListener('click',()=>closeModal(b)));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
$('#waitlistForm')?.addEventListener('submit',e=>{e.preventDefault(); const btn=e.currentTarget.querySelector('button'); btn.textContent='You’re on the list ✓'; btn.disabled=true;});
$('#signinForm')?.addEventListener('submit',e=>{e.preventDefault(); alert('Authentication will be connected in the next build step.');});
