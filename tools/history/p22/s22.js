/* ---------- stage 22: item and panel size setting, easier touch dragging ---------- */
{ const css=document.createElement('style'); css.textContent=`
:root{--iscale:1}
#sx{--sxs:clamp(24px,calc(min(3.6vw,6.2vh)*var(--iscale)),calc(34px*var(--iscale)))}
.sx-slot img{width:90%;height:90%}.sx-slot .n{font-size:max(9px,calc(var(--sxs)*.3))}
.sx-list{grid-template-columns:repeat(auto-fill,calc(30px*var(--iscale)));grid-auto-rows:calc(30px*var(--iscale))}.sx-list button{width:calc(30px*var(--iscale));height:calc(30px*var(--iscale))}
.sx-tabs button{width:calc(28px*min(var(--iscale),1.4));height:calc(28px*min(var(--iscale),1.4))}
#sxGhost{width:calc(48px*var(--iscale));height:calc(48px*var(--iscale))}
.slot{width:calc(40px*var(--iscale));height:calc(40px*var(--iscale))}.slot img{width:86%;height:86%}
#techUI .tu-slot{width:calc(52px*var(--iscale));height:calc(52px*var(--iscale))}
.rig .islot{width:calc(52px*var(--iscale));height:calc(52px*var(--iscale))}
@media (orientation:portrait){
  .sx-side{width:calc(31vw/sqrt(var(--iscale)))!important}
  #sx{--sxs:clamp(18px,min(calc(34px*var(--iscale)),calc((100vw - 31vw/sqrt(var(--iscale)) - 52px)/9)),calc(48px*var(--iscale)))}
  .sx-list{grid-template-columns:repeat(auto-fill,calc(28px*var(--iscale)));grid-auto-rows:calc(28px*var(--iscale))}.sx-list button{width:calc(28px*var(--iscale));height:calc(28px*var(--iscale))}
  #sxSearch{right:calc(31vw/sqrt(var(--iscale)) + 14px)!important}}
@media (max-width:760px) and (orientation:landscape){.sx-side{width:clamp(120px,calc(100vw - 9*var(--sxs) - 60px),260px)}}`;
  document.body.appendChild(css); }
function setIScale(v){ v=Math.max(.8,Math.min(2,+v||1)); document.documentElement.style.setProperty('--iscale',v); const p=prefsGet(); p.iscale=v; store.set('strata:prefs',p); if(SX) renderSX(); if(typeof renderHotbar==='function') renderHotbar(); }
{ const p=prefsGet(); document.documentElement.style.setProperty('--iscale',p.iscale||1);
  const r=document.getElementById('iScale'), out=document.getElementById('iScaleOut'); if(r){ r.value=Math.round((p.iscale||1)*100); out.textContent=r.value+'%'; r.addEventListener('input',()=>{ out.textContent=r.value+'%'; setIScale(r.value/100); }); } }
// while dragging, the slot under your finger lights up
addEventListener('pointermove',e=>{ if(!sxDrag||!sxDrag.held) return; const t=document.elementFromPoint(e.clientX,e.clientY), s=t&&t.closest&&t.closest('.sx-slot'); document.querySelectorAll('.sx-slot.hot').forEach(x=>{ if(x!==s) x.classList.remove('hot'); }); if(s&&s!==sxDrag.b) s.classList.add('hot'); },{passive:true});
