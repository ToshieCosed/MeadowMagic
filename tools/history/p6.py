F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

# ---------- markup & styles ----------
rep('<div id="hurtfx"></div><div id="under"></div>','''<div id="hurtfx"></div><div id="under"></div>
<canvas id="mapHud" width="96" height="96" hidden aria-label="Map"></canvas>
<section id="paint" class="panel" aria-label="Paint a picture" hidden>
  <header><h2>Paint</h2><button class="ghost" id="pFill" aria-pressed="false">Fill</button><button class="ghost" id="pClear">Clear</button><button class="ghost" id="pCancel">Cancel</button><button class="primary" id="pDone">Done</button></header>
  <div class="paintBody"><canvas id="pCanvas" width="16" height="16"></canvas><div id="pPal"></div></div>
</section>
<section id="posterUI" class="panel" aria-label="Poster" hidden>
  <header><h2>Poster</h2><button class="ghost" id="poRemove" hidden>Take down</button><button class="ghost" id="poCancel">Cancel</button><button class="primary" id="poPlace">Place</button></header>
  <div class="paintBody"><div class="stack">
    <label class="primary filebtn">Choose image<input type="file" id="poFile" accept="image/*"></label>
    <div class="field"><label class="l" for="poW">Width (blocks)</label><div class="range"><input type="range" id="poW" min="1" max="10" step="1" value="2"><output id="poWo">2</output></div></div>
    <div class="field"><label class="l" for="poH">Height (blocks)</label><div class="range"><input type="range" id="poH" min="1" max="10" step="1" value="2"><output id="poHo">2</output></div></div>
    <p class="hint" id="poHint">Pick a picture from your device.</p></div>
    <img id="poPrev" alt="Poster preview"></div>
</section>''')
rep("#under{position:fixed;","""#mapHud{position:fixed;z-index:3;right:max(10px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 64px);width:112px;height:112px;image-rendering:pixelated;border:3px solid #c9b48a;border-radius:6px;background:#e8dcb8;box-shadow:0 2px 8px rgba(0,0,0,.4)}
#mapHud.big{width:min(70vw,70vh);height:min(70vw,70vh)}
.paintBody{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;justify-content:center;padding:8px;overflow:auto}
#pCanvas{width:min(62vh,78vw,320px);height:min(62vh,78vw,320px);image-rendering:pixelated;background:repeating-conic-gradient(#ccc 0 25%,#eee 0 50%) 0 0/20px 20px;touch-action:none;border-radius:6px}
#pPal{display:grid;grid-template-columns:repeat(4,38px);gap:6px}#pPal button{width:38px;height:38px;border-radius:8px;border:2px solid rgba(255,255,255,.25)}#pPal button[aria-pressed=true]{border-color:#fff;box-shadow:0 0 0 2px #f0b548}
#poPrev{max-width:min(46vw,320px);max-height:46vh;border-radius:6px;background:rgba(0,0,0,.3)}.filebtn{position:relative;display:inline-block;padding:10px 14px;border-radius:10px;cursor:pointer}.filebtn input{position:absolute;inset:0;opacity:0}
#under{position:fixed;""")

DECOR=r'''
/* =====================================================================
   STAGE 6: paintings · item frames · maps · posters (flat pictures hung on any face)
   ===================================================================== */
NI('CANVAS','Blank painting',{stack:16,decorItem:1,decor:1}); NI('PAINTING','Painting',{stack:1,decorItem:1,decor:1});
NI('FRAME','Item frame',{decorItem:1,decor:1}); NI('PAPER','Paper'); NI('MAP_EMPTY','Empty map',{decorItem:1}); NI('MAP','Map',{stack:1,decorItem:1});
NI('POSTER','Poster',{stack:16,decorItem:1,decor:1});
const PAINT_PAL=['#00000000',...DYES.map(d=>d.dye),'#ffffff','#000000','#7cc94f','#5aa0e6','#f2d7b0','#c08a5a','#8d5f3a','#ff5a5a','#ffe066','#9b5de5','#38d9c8','#2f4858','#e9ecef','#ff9f1c','#4361ee'];
'''
rep("for(const d of DYES){ ITEMS[d.woolB].decor=1; }","for(const d of DYES){ ITEMS[d.woolB].decor=1; }\n"+DECOR)
rep("const INGOT_COL={[I.SILVER]:'#dfe4ec',","const INGOT_COL={[I.SILVER]:'#dfe4ec',")
RECIPES6=r'''
{ const ANYW=DYES.map(d=>d.woolB);
  r_(I.CANVAS,1,['SSS','SWS','SSS'],{keys:{W:ANYW},cat:'decor'});
  r_(I.PAINTING,2,['BP'],{keys:{B:[I.CANVAS],P:[I.PAINTING]},cat:'decor',copyArt:1});
  r_(I.FRAME,1,['SSS','SES','SSS'],{keys:{E:[I.LEATHER]},cat:'decor'});
  r_(I.PAPER,3,['FFF'],{keys:{F:[I.FIBER]},cat:'items'});
  r_(I.MAP_EMPTY,1,['PPP','PNP','PPP'],{keys:{P:[I.PAPER],N:[I.NUG_IRON]},cat:'items'});
  r_(I.POSTER,1,['SES','SES'],{keys:{E:[I.LEATHER]},cat:'decor'}); }
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES6+"// every wood's logs make its own planks; material keys accept every variant")
# copying paintings keeps the picture
rep("  const left=addItem(rc.out,rc.n,undefined,bag||undefined); const landed=inv.landed; if(left) spawnDrop(player.x,player.y+1,player.z,rc.out,left,undefined,bag||undefined);",
"""  let left=0, landed;
  if(rc.copyArt){ const src=inv.grid.find(g=>g&&g.id===I.PAINTING); for(let k=0;k<rc.n;k++){ if(addItem(I.PAINTING,1)) { toast('Inventory full'); break; } inv.slots[inv.landed].x={art:src&&src.x?src.x.art:0}; if(!k) landed=inv.landed; } }
  else { left=addItem(rc.out,rc.n,undefined,bag||undefined); landed=inv.landed; if(left) spawnDrop(player.x,player.y+1,player.z,rc.out,left,undefined,bag||undefined); }""")
# stacks may carry extra data (painting art, map id) — saved as a 5th field
rep("const packS=s=>s?[s.id,s.n,s.d??null,s.bag?s.bag.map(packS):null]:null;","const packS=s=>s?[s.id,s.n,s.d??null,s.bag?s.bag.map(packS):null,s.x||null]:null;")
rep("const unpackS=a=>a&&ITEMS[a[0]]?Object.assign({id:a[0],n:a[1],d:a[2]??undefined},a[3]?{bag:a[3].map(unpackS)}:{}):null;",
    "const unpackS=a=>a&&ITEMS[a[0]]?Object.assign({id:a[0],n:a[1],d:a[2]??undefined},a[3]?{bag:a[3].map(unpackS)}:{},a[4]?{x:a[4]}:{}):null;")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.tool==='bow'||","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||it.tool==='bow'||")
# save & load
rep("    tiles:[...world.tiles.values()].map(","    decor:world.decor.map(d=>({...d,item:d.item?packS(d.item):null})), arts:world.arts, maps:world.maps.map(m=>({cx:m.cx,cz:m.cz,px:b64(m.px)})),\n    tiles:[...world.tiles.values()].map(")
rep("  world.tiles=new Map(); world.time=","""  world.decor=(save&&save.decor||[]).map(d=>({...d,item:d.item?unpackS(d.item):null})); world.arts=save&&save.arts||[]; world.maps=(save&&save.maps||[]).map(m=>({cx:m.cx,cz:m.cz,px:unb64(m.px),dirty:true}));
  world.tiles=new Map(); world.time=""")
rep("mobs:mobs.map(m=>({type:m.type,x:m.x,y:m.y,z:m.z,hp:m.hp,baby:m.baby,grow:m.grow,saddled:m.saddled,face:m.face})),",
    "mobs:mobs.filter(m=>!MOB[m.type].hostile).map(m=>({type:m.type,x:m.x,y:m.y,z:m.z,hp:m.hp,baby:m.baby,grow:m.grow,saddled:m.saddled,face:m.face,wool:m.wool,sheared:m.sheared})),")

CODE=r'''
/* ---------- stage 6: decor entities ---------- */
const b64=u=>{ let s=''; for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); };
const unb64=t=>{ const s=atob(t), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
const MAP_S=96;
// a picture hangs on face d (unit normal) of the block it was tapped on; u = right, v = up as seen by someone facing it
function faceFrame(hit,prev,w,h){ const d=[prev[0]-hit[0],prev[1]-hit[1],prev[2]-hit[2]]; let u,v;
  if(d[1]===0){ u=[-d[2],0,d[0]]; v=[0,1,0]; }
  else { const a=player.face, f=Math.abs(Math.sin(a))>Math.abs(Math.cos(a))?[Math.sign(Math.sin(a)),0,0]:[0,0,Math.sign(Math.cos(a))]; v=f; u=[-f[2],0,f[0]]; if(d[1]<0) u=u.map(x=>-x); }
  const c=[hit[0]+.5+d[0]*.5+d[0]*.03+u[0]*(w-1)/2+v[0]*(h-1)/2, hit[1]+.5+d[1]*.5+d[1]*.03+u[1]*(w-1)/2+v[1]*(h-1)/2, hit[2]+.5+d[2]*.5+d[2]*.03+u[2]*(w-1)/2+v[2]*(h-1)/2];
  return {c,n:d,u,v,w,h,sup:hit.slice(),cell:prev.slice()}; }
function decorCorners(e,inset){ const k=inset||0, hu=e.w/2-k, hv=e.h/2-k, P=(a,b)=>[e.c[0]+e.u[0]*a+e.v[0]*b,e.c[1]+e.u[1]*a+e.v[1]*b,e.c[2]+e.u[2]*a+e.v[2]*b];
  return [P(-hu,-hv),P(hu,-hv),P(hu,hv),P(-hu,hv)]; }
function pickDecor(sx,sy){ const [o,d]=camRay(sx,sy); let best=null, bt=Infinity;
  for(const e of world.decor){ const dn=d[0]*e.n[0]+d[1]*e.n[1]+d[2]*e.n[2]; if(dn>=0) continue;
    const t=((e.c[0]-o[0])*e.n[0]+(e.c[1]-o[1])*e.n[1]+(e.c[2]-o[2])*e.n[2])/dn; if(t<0||t>=bt) continue;
    const p=[o[0]+d[0]*t-e.c[0],o[1]+d[1]*t-e.c[1],o[2]+d[2]*t-e.c[2]], a=p[0]*e.u[0]+p[1]*e.u[1]+p[2]*e.u[2], b=p[0]*e.v[0]+p[1]*e.v[1]+p[2]*e.v[2];
    if(Math.abs(a)<=e.w/2&&Math.abs(b)<=e.h/2){ bt=t; best=e; } }
  if(!best) return null; const r=pick(sx,sy); if(r){ const c=[r.hit[0]+.5,r.hit[1]+.5,r.hit[2]+.5], tb=(c[0]-o[0])*d[0]+(c[1]-o[1])*d[1]+(c[2]-o[2])*d[2]; if(tb<bt-.9) return null; }
  return best; }
function giveBack(id,x){ if(creative()&&id!==I.PAINTING) return; if(addItem(id,1)) spawnDrop(player.x,player.y+1,player.z,id,1); else if(x) inv.slots[inv.landed].x=x; }
function removeDecor(e,give){ const i=world.decor.indexOf(e); if(i<0) return; world.decor.splice(i,1); world.changed=true;
  if(give){ if(e.kind==='painting') giveBack(I.PAINTING,{art:e.art}); if(e.kind==='frame'){ giveBack(I.FRAME); if(e.item) giveBack(e.item.id,e.item.x); } if(e.kind==='poster') giveBack(I.POSTER); }
  burst(e.c[0],e.c[1],e.c[2],[200,180,140],6,1.5); }
function decorOnBlockBroken(x,y,z){ for(const e of world.decor.slice()) if(e.sup[0]===x&&e.sup[1]===y&&e.sup[2]===z) removeDecor(e,true); }
function decorRoom(f){ return f.w===1&&f.h===1?!world.decor.some(e=>e.cell+''===f.cell+''&&e.n+''===f.n+''):true; }
function tapDecor(sx,sy){
  const e=pickDecor(sx,sy); if(!e) return false; const s=held(), it=s&&ITEMS[s.id];
  if(Math.hypot(e.c[0]-player.x,e.c[2]-player.z)>6){ toast('Too far away'); return true; }
  if(player.crouch){ if(e.kind==='frame'&&e.item){ giveBack(e.item.id,e.item.x); e.item=null; toast('Took the item out'); } else removeDecor(e,true); return true; }
  if(e.kind==='frame'){
    if(!e.item&&s&&!it.decorItem||!e.item&&s&&(s.id===I.MAP)){ e.item={id:s.id,n:1,d:s.d,x:s.x}; if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } toast('Placed in the frame. Tap again to switch display mode'); }
    else if(e.item){ e.mode=e.mode?0:1; toast(e.mode?'Frame hidden: the item floats in place':'Frame shown'); }
    else toast('Hold an item and tap to put it in the frame');
    world.changed=true; return true; }
  if(e.kind==='poster'){ openPoster(null,e); return true; }
  if(e.kind==='painting'){ toast('Crouch and tap to take it down'); return true; }
  return false;
}
function placeDecor(sx,sy,kind,extra){
  const r=pick(sx,sy); if(!r||!r.prev){ toast('Tap the side of a block'); return null; } if(!reachOK(...r.hit)){ toast('Too far away'); return null; }
  const f=faceFrame(r.hit,r.prev,1,1); if(!decorRoom(f)){ toast('Something already hangs there'); return null; }
  const e=Object.assign({kind,mode:0},f,extra||{}); world.decor.push(e); world.changed=true; return e; }
// ---------- paintings: a 16×16 pixel editor ----------
let paintSt=null;
function openPaint(){ const a=new Uint8Array(256); paintSt={a,col:1,fill:false}; mode='ui'; mining=null; document.getElementById('paint').hidden=false; buildPal(); drawPaint(); }
function buildPal(){ const el=document.getElementById('pPal'); el.innerHTML=''; PAINT_PAL.forEach((c,i)=>{ const b=document.createElement('button'); b.style.background=i?c:'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/12px 12px'; b.setAttribute('aria-label',i?'Colour '+i:'Eraser'); b.setAttribute('aria-pressed',i===paintSt.col);
  b.addEventListener('click',()=>{ paintSt.col=i; el.querySelectorAll('button').forEach((x,j)=>x.setAttribute('aria-pressed',j===i)); }); el.appendChild(b); }); }
function artCanvas(a,c){ c=c||document.createElement('canvas'); c.width=c.height=16; const g=c.getContext('2d'); g.clearRect(0,0,16,16); for(let i=0;i<256;i++) if(a[i]){ g.fillStyle=PAINT_PAL[a[i]]; g.fillRect(i%16,i/16|0,1,1); } return c; }
function drawPaint(){ artCanvas(paintSt.a,document.getElementById('pCanvas')); }
function paintAt(ev){ const c=document.getElementById('pCanvas'), r=c.getBoundingClientRect(), x=Math.floor((ev.clientX-r.left)/r.width*16), y=Math.floor((ev.clientY-r.top)/r.height*16); if(x<0||y<0||x>15||y>15) return;
  const a=paintSt.a, i=y*16+x;
  if(paintSt.fill){ const from=a[i], to=paintSt.col; if(from===to) return; const q=[i]; while(q.length){ const k=q.pop(); if(a[k]!==from) continue; a[k]=to; const kx=k%16; if(kx>0) q.push(k-1); if(kx<15) q.push(k+1); if(k>=16) q.push(k-16); if(k<240) q.push(k+16); } }
  else a[i]=paintSt.col; drawPaint(); }
{ const c=document.getElementById('pCanvas'); let down=false;
  c.addEventListener('pointerdown',e=>{ down=true; c.setPointerCapture(e.pointerId); paintAt(e); }); c.addEventListener('pointermove',e=>{ if(down&&!paintSt.fill) paintAt(e); }); c.addEventListener('pointerup',()=>down=false);
  document.getElementById('pFill').addEventListener('click',e=>{ paintSt.fill=!paintSt.fill; e.currentTarget.setAttribute('aria-pressed',paintSt.fill); });
  document.getElementById('pClear').addEventListener('click',()=>{ paintSt.a.fill(0); drawPaint(); });
  document.getElementById('pCancel').addEventListener('click',()=>closeUI('paint'));
  document.getElementById('pDone').addEventListener('click',()=>{ const s=held(); if(!s||s.id!==I.CANVAS){ closeUI('paint'); return; }
    const id=world.arts.length; world.arts.push(b64(paintSt.a)); if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; }
    const left=addItem(I.PAINTING,1); if(!left) inv.slots[inv.landed].x={art:id}; invChanged(); world.changed=true; closeUI('paint'); toast('Painting finished. Tap a wall to hang it'); }); }
function closeUI(id){ document.getElementById(id).hidden=true; if(mode==='ui'){ mode='play'; last=performance.now(); } renderHotbar(); }
// ---------- posters: an image from the device, any size, on any face ----------
let posterSt=null;
function openPoster(r,e){ posterSt={r,e,img:e?e.img:null}; mode='ui'; mining=null; const W=document.getElementById('poW'), H=document.getElementById('poH');
  W.value=e?e.w:2; H.value=e?e.h:2; document.getElementById('poWo').textContent=W.value; document.getElementById('poHo').textContent=H.value;
  document.getElementById('poPrev').src=e?e.img:''; document.getElementById('poRemove').hidden=!e; document.getElementById('poPlace').textContent=e?'Update':'Place';
  document.getElementById('poHint').textContent=e?'Resize it or pick a new picture.':'Pick a picture from your device.'; document.getElementById('posterUI').hidden=false; }
{ const W=document.getElementById('poW'), H=document.getElementById('poH');
  W.addEventListener('input',()=>document.getElementById('poWo').textContent=W.value); H.addEventListener('input',()=>document.getElementById('poHo').textContent=H.value);
  document.getElementById('poFile').addEventListener('change',ev=>{ const f=ev.target.files[0]; if(!f) return; const url=URL.createObjectURL(f), im=new Image();
    im.onload=()=>{ const k=Math.min(1,512/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.max(1,im.width*k|0); c.height=Math.max(1,im.height*k|0); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      posterSt.img=c.toDataURL('image/jpeg',.82); document.getElementById('poPrev').src=posterSt.img; URL.revokeObjectURL(url);
      const ar=im.width/im.height; if(!posterSt.e){ const w=+W.value; H.value=Math.max(1,Math.min(10,Math.round(w/ar))); document.getElementById('poHo').textContent=H.value; } };
    im.src=url; ev.target.value=''; });
  document.getElementById('poCancel').addEventListener('click',()=>closeUI('posterUI'));
  document.getElementById('poRemove').addEventListener('click',()=>{ removeDecor(posterSt.e,true); closeUI('posterUI'); });
  document.getElementById('poPlace').addEventListener('click',()=>{ const st=posterSt; if(!st.img){ toast('Choose an image first'); return; } const w=+W.value, h=+H.value;
    if(st.e){ const f=faceFrame(st.e.sup,st.e.cell,w,h); Object.assign(st.e,f,{img:st.img,tex:null}); }
    else { const f=faceFrame(st.r.hit,st.r.prev,w,h); world.decor.push(Object.assign({kind:'poster',img:st.img},f)); const s=held(); if(s&&s.id===I.POSTER&&!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } }
    world.changed=true; closeUI('posterUI'); }); }
// ---------- maps: drawn from the terrain as you explore with one in hand ----------
function newMap(){ const m={cx:Math.floor(player.x/MAP_S)*MAP_S,cz:Math.floor(player.z/MAP_S)*MAP_S,px:new Uint8Array(MAP_S*MAP_S*4),dirty:true}; world.maps.push(m); return world.maps.length-1; }
function mapColor(x,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||ch.dirty&&!ch.mesh) return null; let y=world.H-1, b=0; for(;y>0;y--){ b=world.get(x,y,z); if(b>0&&!(BLOCKS[b].replace&&!BLOCKS[b].wl)&&b!==B.TORCH) break; }
  const bd=BLOCKS[b]||BLOCKS[B.STONE], bio=ch.bio?BIO[ch.bio[(z&15)*CS+(x&15)]]:null; let c=bd.top;
  if(b===B.WATER){ let dp=0; while(dp<8&&isW(world.get(x,y-dp-1,z))) dp++; c=sh3(bio?bio.water:[63,118,228],1.15-dp*.06); return c; }
  if(bd.btint&&bio) c=bd.btint==='grass'?bio.grass:bio.foliage;
  const n=world.surface(x,z-1); return sh3(c,n>y?.82:n<y?1.1:.96); }
function stepMaps(dt){ const s=held(); const hud=document.getElementById('mapHud'); const on=mode==='play'&&s&&s.id===I.MAP&&s.x&&world.maps[s.x.map];
  hud.hidden=!on; if(!on) return; const m=world.maps[s.x.map];
  const px=Math.floor(player.x), pz=Math.floor(player.z); let n=0;
  for(let k=0;k<500&&n<260;k++){ const a=Math.random()*6.283, r=Math.sqrt(Math.random())*30, x=px+Math.round(Math.cos(a)*r), z=pz+Math.round(Math.sin(a)*r), mx=x-m.cx, mz=z-m.cz;
    if(mx<0||mz<0||mx>=MAP_S||mz>=MAP_S||x<0||z<0||x>=world.size||z>=world.size) continue; const i=(mz*MAP_S+mx)*4; if(m.px[i+3]&&Math.random()<.85) continue;
    const c=mapColor(x,z); if(!c) continue; m.px[i]=c[0]; m.px[i+1]=c[1]; m.px[i+2]=c[2]; m.px[i+3]=255; n++; m.dirty=true; }
  m.hudT=(m.hudT||0)-dt; if(m.hudT<=0){ m.hudT=.25; drawMapTo(hud,m,true); } }
function drawMapTo(c,m,marker){ const g=c.getContext('2d'); const im=g.createImageData(MAP_S,MAP_S);
  for(let i=0;i<MAP_S*MAP_S;i++){ const o=i*4; if(m.px[o+3]){ im.data[o]=m.px[o]; im.data[o+1]=m.px[o+1]; im.data[o+2]=m.px[o+2]; } else { im.data[o]=232; im.data[o+1]=220; im.data[o+2]=184; } im.data[o+3]=255; }
  g.putImageData(im,0,0);
  if(marker){ const x=player.x-m.cx, z=player.z-m.cz; if(x>=0&&z>=0&&x<MAP_S&&z<MAP_S){ g.save(); g.translate(x,z); g.rotate(-player.face+Math.PI); g.fillStyle='#fff'; g.strokeStyle='#222'; g.lineWidth=1; g.beginPath(); g.moveTo(0,-4); g.lineTo(3,3); g.lineTo(0,1.5); g.lineTo(-3,3); g.closePath(); g.fill(); g.stroke(); g.restore(); } } }
document.getElementById('mapHud').addEventListener('click',e=>e.currentTarget.classList.toggle('big'));
// held decor items act on a tap
function useDecor(sx,sy){ const s=held(); if(!s) return false;
  if(s.id===I.CANVAS){ openPaint(); return true; }
  if(s.id===I.PAINTING){ if(placeDecor(sx,sy,'painting',{art:s.x?s.x.art:0})&&!creative()){ inv.slots[inv.sel]=null; invChanged(); } return true; }
  if(s.id===I.FRAME){ if(placeDecor(sx,sy,'frame',{item:null})&&!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } return true; }
  if(s.id===I.POSTER){ const r=pick(sx,sy); if(!r||!r.prev){ toast('Tap a wall, floor or ceiling'); return true; } if(!reachOK(...r.hit)){ toast('Too far away'); return true; } openPoster(r,null); return true; }
  if(s.id===I.MAP_EMPTY){ const id=newMap(); if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; } const left=addItem(I.MAP,1); if(!left){ inv.slots[inv.landed].x={map:id}; } invChanged(); toast('A new map. Hold it while you explore to fill it in'); return true; }
  if(s.id===I.MAP){ document.getElementById('mapHud').classList.toggle('big'); return true; }
  return false; }
// ---------- drawing: wooden borders and floating items go in the dynamic mesh; pictures use a textured pass ----------
function emitDecor(vb){
  for(const e of world.decor){ if(Math.hypot(e.c[0]-player.x,e.c[2]-player.z)>60) continue; setVL(sampleLight(e.cell[0]+.5,e.cell[1]+.5,e.cell[2]+.5));
    const n=e.n, frameB=(t,col)=>{ const hu=e.w/2, hv=e.h/2; const B=(a0,b0,a1,b1)=>{ const P=(a,b,dn)=>[e.c[0]+e.u[0]*a+e.v[0]*b+n[0]*dn,e.c[1]+e.u[1]*a+e.v[1]*b+n[1]*dn,e.c[2]+e.u[2]*a+e.v[2]*b+n[2]*dn];
        const p0=P(a0,b0,-.03), p1=P(a1,b1,.03); emitBox(vb,[Math.min(p0[0],p1[0]),Math.min(p0[1],p1[1]),Math.min(p0[2],p1[2])],[Math.max(p0[0],p1[0]),Math.max(p0[1],p1[1]),Math.max(p0[2],p1[2])],col,IDT); };
      B(-hu,-hv,hu,-hv+t); B(-hu,hv-t,hu,hv); B(-hu,-hv,-hu+t,hv); B(hu-t,-hv,hu,hv); };
    if(e.kind==='painting') frameB(.07,[120,82,48]);
    if(e.kind==='frame'&&!(e.mode&&e.item)) frameB(.1,[150,108,64]);
    if(e.kind==='frame'&&e.item&&e.mode&&e.item.id!==I.MAP){ const t=performance.now()/1000, ca=Math.cos(t*1.2), sa=Math.sin(t*1.2), cx=e.c[0]+n[0]*.32, cy=e.c[1]+n[1]*.32-.1+Math.sin(t*2)*.04, cz=e.c[2]+n[2]*.32;
      for(const [mn,mx,col] of itemBoxes(e.item.id)) emitBox(vb,mn,mx,col,(x,y,z)=>[cx+(x*ca+z*sa)*1.4,cy+y*1.4,cz+(-x*sa+z*ca)*1.4]); } } }
const texProg=gl.createProgram();
gl.attachShader(texProg,shader(gl.VERTEX_SHADER,`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV; uniform mat4 uVP; out vec2 vUV; out vec3 vW;
void main(){ vUV=aUV; vW=aPos; gl_Position=uVP*vec4(aPos,1.); }`));
gl.attachShader(texProg,shader(gl.FRAGMENT_SHADER,`#version 300 es
precision highp float; in vec2 vUV; in vec3 vW; uniform sampler2D uTex; uniform vec3 uL; uniform vec3 uFog; uniform vec2 uFocus; uniform vec2 uFogR; out vec4 o;
void main(){ vec4 t=texture(uTex,vUV); if(t.a<.1) discard; float f=smoothstep(uFogR.x,uFogR.y,length(vW.xz-uFocus)); o=vec4(mix(t.rgb*uL,uFog,f),1.); }`));
gl.linkProgram(texProg); if(!gl.getProgramParameter(texProg,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(texProg));
const TU={}; for(const n of ['uVP','uTex','uL','uFog','uFocus','uFogR']) TU[n]=gl.getUniformLocation(texProg,n);
const texVAO=gl.createVertexArray(), texVBO=gl.createBuffer(); gl.bindVertexArray(texVAO); gl.bindBuffer(gl.ARRAY_BUFFER,texVBO); gl.bufferData(gl.ARRAY_BUFFER,80,gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12); gl.bindVertexArray(null);
const texCache=new Map();
function glTex(src,smooth){ const t=gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src); const f=smooth?gl.LINEAR:gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0); return t; }
function texFor(e){ // the picture for a decor entity, or null
  if(e.kind==='painting'){ const k='art'+e.art; if(!texCache.has(k)){ const a=world.arts[e.art]; texCache.set(k,glTex(artCanvas(a?unb64(a):new Uint8Array(256)),false)); } return texCache.get(k); }
  if(e.kind==='poster'){ if(!e.tex){ e.tex='loading'; const im=new Image(); im.onload=()=>{ e.tex=glTex(im,true); }; im.src=e.img; } return e.tex==='loading'?null:e.tex; }
  if(e.kind==='frame'&&e.item){ if(e.item.id===I.MAP&&e.item.x){ const m=world.maps[e.item.x.map]; if(!m) return null; const k='map'+e.item.x.map;
      if(!m.canvas){ m.canvas=document.createElement('canvas'); m.canvas.width=m.canvas.height=MAP_S; }
      if(m.dirty||!texCache.has(k)){ m.dirty=false; drawMapTo(m.canvas,m,false); if(texCache.has(k)) gl.deleteTexture(texCache.get(k)); texCache.set(k,glTex(m.canvas,false)); } return texCache.get(k); }
    if(e.mode) return null; const k='icon'+e.item.id; if(!texCache.has(k)) texCache.set(k,glTex(itemIconCanvas(e.item.id),true)); return texCache.get(k); }
  return null; }
let SUNV=[1,1,1];
function drawTextured(){
  if(!world.decor||!world.decor.length) return; let used=false;
  for(const e of world.decor){ if(Math.hypot(e.c[0]-player.x,e.c[2]-player.z)>60) continue; const t=texFor(e); if(!t) continue;
    if(!used){ used=true; gl.useProgram(texProg); gl.uniformMatrix4fv(TU.uVP,false,cam.vp); gl.uniform1i(TU.uTex,1); gl.uniform3fv(TU.uFog,FOG);
      const fr=world.radius*CS; gl.uniform2f(TU.uFocus,cam.tx??player.x,cam.tz??player.z); gl.uniform2f(TU.uFogR,fr-22,fr-6); gl.bindVertexArray(texVAO); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1,-2); }
    const L=sampleLight(e.cell[0]+.5,e.cell[1]+.5,e.cell[2]+.5), sh=[1,1,.9,.6,.85,.75][e.n[1]>0?0:e.n[1]<0?3:e.n[0]>0?1:e.n[0]<0?2:e.n[2]>0?4:5];
    gl.uniform3f(TU.uL,Math.min(1.1,(L[0]/255*SUNV[0]+L[4]/255+.04)*sh),Math.min(1.1,(L[1]/255*SUNV[1]+L[5]/255+.04)*sh),Math.min(1.1,(L[2]/255*SUNV[2]+L[6]/255+.04)*sh));
    const ins=e.kind==='frame'&&!e.mode?(e.item.id===I.MAP?.08:.16):e.kind==='painting'?.07:0, q=decorCorners(e,ins), off=e.kind==='poster'?0:.012, n=e.n;
    const uv=[[0,1],[1,1],[1,0],[0,0]], d=new Float32Array(20); for(let i=0;i<4;i++){ d[i*5]=q[i][0]+n[0]*off; d[i*5+1]=q[i][1]+n[1]*off; d[i*5+2]=q[i][2]+n[2]*off; d[i*5+3]=uv[i][0]; d[i*5+4]=uv[i][1]; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,t); gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER,texVBO); gl.bufferSubData(gl.ARRAY_BUFFER,0,d); gl.drawArrays(gl.TRIANGLE_FAN,0,4); }
  if(used){ gl.disable(gl.POLYGON_OFFSET_FILL); gl.useProgram(prog); gl.bindVertexArray(null); }
}
'''
rep("const cloudVB=new VB(), cloudMesh=makeVAO();","const cloudVB=new VB(), cloudMesh=makeVAO();\n"+CODE)
rep("  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); FOG=sky;","  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); SUNV=sun; FOG=sky;")
# hooks: taps, held items, dynamic mesh, block breaking, per-frame maps
rep("function tapInstant(sx,sy){ if(tapEntity(sx,sy)||tryInteract(sx,sy)) return;","function tapInstant(sx,sy){ if(tapDecor(sx,sy)||tapEntity(sx,sy)||tryInteract(sx,sy)) return; if(ITEMS[held()?.id]?.decorItem&&useDecor(sx,sy)) return;")
rep("function tapWorld(sx,sy,right){","function tapWorld(sx,sy,right){\n  if(!right&&tapDecor(sx,sy)) return;")
rep("function useHeld(sx,sy){ // items that act on a tap instead of mining or building\n  const s=held(), it=s&&ITEMS[s.id]; if(!it) return false;",
    "function useHeld(sx,sy){ // items that act on a tap instead of mining or building\n  const s=held(), it=s&&ITEMS[s.id]; if(!it) return false;\n  if(it.decorItem) return useDecor(sx,sy);")
rep("  for(const m of mobs){ if(Math.hypot(m.x-p.x,m.z-p.z)>56) continue; setVL(sampleLight(m.x,m.y+.6,m.z)); emitMob(dynVB,m); }",
    "  for(const m of mobs){ if(Math.hypot(m.x-p.x,m.z-p.z)>56) continue; setVL(sampleLight(m.x,m.y+.6,m.z)); emitMob(dynVB,m); }\n  if(world.decor) emitDecor(dynVB);")
rep("  if(b===B.ROPE) breakRopeBelow(x,y,z);","  if(b===B.ROPE) breakRopeBelow(x,y,z);\n  if(world.decor.length) decorOnBlockBroken(x,y,z);")
rep("world.time+=dt; stepTiles(dt); stepAmbient(dt);","world.time+=dt; stepTiles(dt); stepAmbient(dt); stepMaps(dt);")
open(F,'w').write(s); print('ok')
