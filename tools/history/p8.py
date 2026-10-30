F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

# ---------- markup ----------
rep('<span id="armorHud" hidden></span>','<span id="armorHud" hidden></span><span id="xpbar" hidden><i></i><b>0</b></span>')
rep('<canvas id="mapHud" width="96" height="96" hidden aria-label="Map"></canvas>','''<canvas id="mapHud" width="96" height="96" hidden aria-label="Map"></canvas>
<button id="bArrow" class="ghost" hidden aria-label="Switch arrow type"></button>
<div id="fishUI" hidden><div class="fbar"><i id="fZone"></i><b id="fFish">🐟</b></div><div class="fprog"><i id="fProg"></i></div><button class="primary" id="fReel">Hold to reel</button></div>
<div id="viewfinder" hidden><div class="vf"></div><div class="vfbar"><button class="ghost" id="vfClose">Close</button><input type="range" id="vfZoom" min="1" max="4" step=".1" value="1" aria-label="Zoom"><button class="primary" id="vfShot">Take photo</button></div></div>
<section id="gdesk" class="panel" aria-label="Grimoire desk" hidden>
  <header><h2>Grimoire desk</h2><span class="hint" id="gLv"></span><button class="primary" id="gClose">Done</button></header>
  <div class="paintBody" style="display:block"><h3>Write a grimoire <small class="hint">(needs a book and levels)</small></h3><div id="gWrite" class="gl"></div>
  <h3 id="gApplyH">Apply to your held item</h3><div id="gApply" class="gl"></div></div>
</section>
<section id="journal" class="panel" aria-label="Fishing journal" hidden><header><h2>Fishing journal</h2><button class="primary" id="jClose">Done</button></header><div class="paintBody" style="display:block" id="jBody"></div></section>''')
rep("#mapHud{opacity:.88;","""#xpbar{display:flex;align-items:center;gap:6px;width:140px}#xpbar i{flex:1;height:5px;border-radius:3px;background:linear-gradient(90deg,#ff5a5a,#ffd84a,#5ce07a,#4ac8ff,#b06aff);background-size:var(--xp,0%) 100%;background-repeat:no-repeat;background-color:rgba(0,0,0,.45)}#xpbar b{font-size:11px;color:#c8ff7a;min-width:16px}
#bArrow{position:fixed;z-index:4;left:50%;transform:translateX(150px);top:calc(env(safe-area-inset-top,0px) + 10px);width:46px;height:46px;border-radius:10px;padding:4px;background:rgba(24,33,42,.8)}#bArrow img{width:100%;height:100%}
#fishUI{position:fixed;z-index:6;left:50%;bottom:22%;transform:translateX(-50%);width:min(80vw,420px);padding:12px;border-radius:14px;background:rgba(24,33,42,.85);display:flex;flex-direction:column;gap:10px;align-items:stretch}
#fishUI .fbar{position:relative;height:34px;border-radius:8px;background:#1d4f7a;overflow:hidden}#fZone{position:absolute;top:0;bottom:0;width:28%;background:rgba(120,255,140,.45);border-radius:6px}#fFish{position:absolute;top:4px;font-size:20px;transform:translateX(-50%)}
#fishUI .fprog{height:8px;border-radius:4px;background:rgba(0,0,0,.4)}#fProg{display:block;height:100%;border-radius:4px;background:#5ce07a;width:30%}#fReel{padding:14px;font-size:16px;touch-action:none}
#viewfinder{position:fixed;inset:0;z-index:6;pointer-events:none}#viewfinder .vf{position:absolute;inset:8%;border:3px solid rgba(255,255,255,.85);border-radius:10px;box-shadow:0 0 0 100vmax rgba(0,0,0,.35)}
#viewfinder .vfbar{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);display:flex;gap:12px;align-items:center;pointer-events:auto;background:rgba(24,33,42,.8);padding:8px 12px;border-radius:12px}
.gl{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}.gl button{padding:8px 10px;border-radius:9px}
#mapHud{opacity:.88;""")

ITEMS8=r'''
// ---------- stage 8 items: books, XP books, grimoires, fishing, special arrows, warp bow, camera ----------
NI('BOOK','Book'); NI('XP_BOOK','Book of experience',{stack:1,xpbook:1}); NI('GRIMOIRE','Grimoire',{stack:1,grimoire:1});
NI('ROD','Fishing rod',{stack:1,rod:1,dur:150}); NI('JOURNAL','Fishing journal',{stack:1,journal:1});
NI('COD','Raw cod',{food:2,fish:1}); NI('SALMON','Raw salmon',{food:2,fish:1}); NI('TROPICAL','Tropical fish',{food:1,fish:1}); NI('PUFFER','Pufferfish',{food:1,fish:1});
NI('CCOD','Cooked cod',{food:6}); NI('CSALMON','Cooked salmon',{food:7});
NI('WARP_INGOT','Warp ingot'); NI('WARP_BOW','Warp bow',{stack:1,tool:'bow',dur:2400,tier:10,warp:1});
const WARP_ARROWS=[['TORCH','Torch arrow','torch','#ffcf5a'],['FIRE','Fire arrow','fire','#ff6a1e'],['ICE','Ice arrow','ice','#9be3ff'],['TP','Teleport arrow','tp','#b06aff'],['SWAP','Swap arrow','swap','#4ad6b8']].map(([k,n,kind,col])=>({id:NI('ARROW_'+k,n,{arrow:true,special:kind,dmg:2,col:hex(col)}),kind,col}));
NI('CAMERA','Camera',{stack:1,camera:1}); NI('PHOTO','Photo',{stack:1,decorItem:1,photo:1}); NI('GRIM_DESK_I','Grimoire desk');
'''
rep("NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});",ITEMS8+"NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});")
rep("for(const d of DYES){ d.elev=NB('ELEV_'+d.k);","NB('GRIM_DESK'); def(B.GRIM_DESK,'Grimoire desk','#6a2fa0','#2b2140',0,{emit:[8,3,12],decor:1}); pat(B.GRIM_DESK,PT.CHISEL);\nfor(const d of DYES){ d.elev=NB('ELEV_'+d.k);")
rep("NI('GRIM_DESK_I','Grimoire desk');","")
RECIPES8=r'''
{ r_(I.BOOK,1,['PPP','.E.'],{keys:{P:[I.PAPER],E:[I.LEATHER]},cat:'items'});
  r_(I.XP_BOOK,1,['.G.','GBG','.G.'],{keys:{G:[I.GOLD],B:[I.BOOK]},tier:2,cat:'items'});
  r_(B.GRIM_DESK,1,['.B.','DOD','OOO'],{keys:{B:[I.BOOK],D:[I.DIAMOND],O:[B.OBSIDIAN]},tier:2,cat:'decor'});
  r_(I.ROD,1,['..S','.SF','S.F'],{keys:{F:[I.STRING]},cat:'tools'}); r_(I.JOURNAL,1,['B','F'],{keys:{B:[I.BOOK],F:[I.COD,I.SALMON,I.TROPICAL,I.PUFFER]},cat:'items'});
  r_(I.WARP_INGOT,2,['GDG'],{keys:{G:[I.GOLD],D:[I.DUSK_PEARL]},tier:2,cat:'items'});
  r_(I.WARP_BOW,1,['.WF','D.F','.WF'],{keys:{W:[I.WARP_INGOT],D:[I.DUSK_ORB],F:[I.STRING]},tier:2,cat:'weapons'});
  const AR=[I.ARROW,I.SARROW,...MATS.map(m=>GEN[m.k+':arrow']).filter(Boolean)];
  const add=[[B.TORCH],[I.COAL,I.CHARCOAL],[B.ICE,B.PACKED_ICE,B.SNOW],[I.DUSK_PEARL],[I.DUSK_ORB]];
  WARP_ARROWS.forEach((w,i)=>r_(w.id,4,['.X.','AAA','.A.'],{keys:{X:add[i],A:AR},cat:'weapons'}));
  r_(I.CAMERA,1,['III','IGI'],{keys:{I:[I.IRON],G:[B.GLASS]},tier:2,cat:'items'}); }
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES8+"// every wood's logs make its own planks; material keys accept every variant")
rep("{a:[B.COBBLE],out:B.STONE,time:6,tier:1},","{a:[B.COBBLE],out:B.STONE,time:6,tier:1},{a:[I.COD],out:I.CCOD,time:5,tier:1},{a:[I.SALMON],out:I.CSALMON,time:5,tier:1},")
rep("const ORE_NAME={2:'stone',","spec(B.GRIM_DESK,6,'pick',1);\nconst ORE_NAME={2:'stone',")

CODE8=r'''
/* =====================================================================
   STAGE 8: XP & rainbow orbs · books of experience · grimoires · fishing · warp bow & special arrows · camera
   ===================================================================== */
const XPL=20;   // every level costs the same
const lvOf=()=>Math.floor((player.xp||0)/XPL);
const ENCH={speedy:{name:'Speedy',max:3,on:['weapon','tool','bow']},infinity:{name:'Infinity',max:1,on:['bow']},repulse:{name:'Repulse',max:3,on:['weapon','bow']},
  shadow:{name:'Shadow',max:1,on:['weapon','bow']},flames:{name:'Flames',max:3,on:['weapon','bow']},understanding:{name:'Understanding',max:3,on:['weapon','tool','bow','armor']},
  range:{name:'Range',max:5,on:['weapon','tool']},armor:{name:'Armor+',max:5,on:['armor']},scatter:{name:'Scattershot',max:3,on:['bow']}};
const ROMAN=['','I','II','III','IV','V'];
const ench=(s,k)=>s&&s.x&&s.x.ench&&s.x.ench[k]||0;
const enchKind=it=>!it?null:it.armor!==undefined?'armor':it.tool==='bow'?'bow':(it.weapon||it.throwing||it.type==='knife'||it.type==='sword')?'weapon':it.tool||it.hook||it.rod?'tool':null;
const enchText=s=>s&&s.x&&s.x.ench?Object.entries(s.x.ench).map(([k,v])=>ENCH[k].name+(ENCH[k].max>1?' '+ROMAN[v]:'')).join(', '):'';
// ---------- orbs ----------
const orbs=[];
function giveXP(n,x,y,z){ while(n>0){ const v=Math.min(n,1+(Math.random()*4|0)); n-=v; orbs.push({x,y,z,vx:(Math.random()-.5)*3,vy:2+Math.random()*2,vz:(Math.random()-.5)*3,v,t:0,h:Math.random()*360}); } }
function addXP(v){ const p=player; // Understanding repairs first, generously
  const items=[inv.slots[inv.sel],...inv.armor,...inv.slots.slice(0,9)].filter(s=>s&&ench(s,'understanding')&&ITEMS[s.id].dur&&s.d<ITEMS[s.id].dur);
  for(const s of items){ if(v<=0) break; const lv=ench(s,'understanding'), need=ITEMS[s.id].dur-s.d, per=6*lv, use=Math.min(v,Math.ceil(need/per)); s.d=Math.min(ITEMS[s.id].dur,s.d+use*per); v-=use; invChanged(); }
  const before=lvOf(); p.xp=(p.xp||0)+Math.max(0,v); if(lvOf()>before){ toast('Level '+lvOf()); burst(p.x,p.y+1.8,p.z,[200,255,120],10,2); } hudDirty=true; }
function stepOrbs(dt){ const p=player; for(let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; o.t+=dt; o.h=(o.h+dt*240)%360;
    const dx=p.x-o.x, dy=p.y+.8-o.y, dz=p.z-o.z, d=Math.hypot(dx,dy,dz);
    if(o.t>.4&&d<7){ const k=Math.min(1,(9-d)*dt*1.4); o.vx+=dx/d*k*14; o.vy+=dy/d*k*14; o.vz+=dz/d*k*14; o.vx*=.9; o.vy*=.9; o.vz*=.9; }
    else { o.vy-=12*dt; o.vx*=Math.exp(-2*dt); o.vz*=Math.exp(-2*dt); }
    const ny=o.y+o.vy*dt; if(world.solid(Math.floor(o.x),Math.floor(ny-.08),Math.floor(o.z))&&o.vy<0){ o.vy=0; } else o.y=ny; o.x+=o.vx*dt; o.z+=o.vz*dt;
    if(d<.9&&o.t>.3){ orbs.splice(i,1); if(game()) addXP(o.v); continue; } if(o.t>300) orbs.splice(i,1); }
  // Understanding also mends slowly on its own
  p.mendT=(p.mendT||0)-dt; if(p.mendT<=0){ p.mendT=6; for(const s of [...inv.slots,...inv.armor]) if(s&&ench(s,'understanding')&&ITEMS[s.id].dur&&s.d<ITEMS[s.id].dur){ s.d=Math.min(ITEMS[s.id].dur,s.d+ench(s,'understanding')); invChanged(); } } }
function hsl(h){ const f=n=>{ const k=(n+h/30)%12; return 255*(.55-.45*Math.max(-1,Math.min(k-3,9-k,1))); }; return [f(0)|0,f(8)|0,f(4)|0]; }
function emitOrbs(vb){ setVL(VL_EMISSIVE); for(const o of orbs){ const r=.05+o.v*.018, b=Math.sin(o.t*5)*.03; emitBox(vb,[o.x-r,o.y-r+b,o.z-r],[o.x+r,o.y+r+b,o.z+r],hsl(o.h),IDT); } }
// ---------- enchantment effects on hits ----------
function applyHitEnch(m,e){ if(!e||m.dead) return;
  if(e.repulse){ const dx=m.x-player.x, dz=m.z-player.z, l=Math.hypot(dx,dz)||1; mobMove(m,dx/l*e.repulse*9,dz/l*e.repulse*9,.15,false); m.vy=4+e.repulse*2; }
  if(e.flames){ m.fireT=4; m.fireLv=e.flames; }
  if(e.shadow){ m.shadowT=8; } }
function stepMobDots(m,dt){
  if(m.fireT>0){ m.fireT-=dt; m.fireTick=(m.fireTick||0)-dt; if(m.fireTick<=0){ m.fireTick=1; hitMob(m,m.fireLv||1,m.x,m.z); } if(Math.random()<dt*16) parts.push({x:m.x+(Math.random()-.5)*.5,y:m.y+Math.random()*1.5,z:m.z+(Math.random()-.5)*.5,vx:0,vy:1.4,vz:0,t:.4,c:[255,150,40],s:.06,ember:true}); }
  if(m.shadowT>0){ m.shadowT-=dt; const L=sampleLight(m.x,m.y+1,m.z); if(Math.max(L[0]*(SUNV[0]||1),L[4],L[5],L[6])<110){ m.shTick=(m.shTick||0)-dt; if(m.shTick<=0){ m.shTick=1; hitMob(m,2,m.x,m.z); } if(Math.random()<dt*10) parts.push({x:m.x+(Math.random()-.5)*.6,y:m.y+Math.random()*1.5,z:m.z+(Math.random()-.5)*.6,vx:0,vy:.6,vz:0,t:.8,c:[40,20,60],s:.08,smoke:true}); } }
  if(m.frozen>0) m.frozen-=dt; }
// ---------- books of experience ----------
function useXPBook(){ const s=held(); s.x=s.x||{xp:0};
  if(player.crouch){ if(!s.x.xp){ toast('The book is empty'); return; } addXP(s.x.xp); toast(`Withdrew ${s.x.xp} XP`); s.x.xp=0; }
  else { const v=player.xp||0; if(!v){ toast('You have no XP to store. Crouch-tap to withdraw'); return; } s.x.xp+=v; player.xp=0; hudDirty=true; toast(`Stored ${v} XP · ${s.x.xp} in the book`); }
  invChanged(); }
// ---------- grimoire desk ----------
function openDesk(){ mode='ui'; mining=null; document.getElementById('gdesk').hidden=false; renderDesk(); }
function renderDesk(){ const lv=lvOf(); document.getElementById('gLv').textContent=`Level ${lv} · ${countItem([I.BOOK])} books`;
  const W=document.getElementById('gWrite'); W.innerHTML='';
  for(const k in ENCH) for(let l=1;l<=ENCH[k].max;l++){ const cost=l*3, b=document.createElement('button'); b.className='ghost'; b.textContent=`${ENCH[k].name}${ENCH[k].max>1?' '+ROMAN[l]:''} · ${cost} lv`;
    b.disabled=lv<cost&&!creative(); b.addEventListener('click',()=>{ if(!creative()){ if(!countItem([I.BOOK])){ toast('You need a book'); return; } takeItem([I.BOOK],1); player.xp-=cost*XPL; hudDirty=true; }
      const left=addItem(I.GRIMOIRE,1); if(!left) inv.slots[inv.landed].x={g:{k,lv:l}}; toast('Wrote a grimoire: '+ENCH[k].name+' '+ROMAN[l]); renderDesk(); }); W.appendChild(b); }
  const s=held(), kind=enchKind(s&&ITEMS[s.id]); const A=document.getElementById('gApply'); A.innerHTML='';
  document.getElementById('gApplyH').textContent=s?`Apply to ${ITEMS[s.id].name}${enchText(s)?' ('+enchText(s)+')':''}`:'Hold an item in your hand to apply grimoires';
  inv.slots.forEach((g,i)=>{ if(!g||g.id!==I.GRIMOIRE||!g.x||!g.x.g) return; const e=ENCH[g.x.g.k], ok=kind&&e.on.includes(kind);
    const b=document.createElement('button'); b.className=ok?'primary':'ghost'; b.disabled=!ok; b.textContent=`${e.name} ${e.max>1?ROMAN[g.x.g.lv]:''}`;
    b.addEventListener('click',()=>{ s.x=s.x||{}; s.x.ench=s.x.ench||{}; s.x.ench[g.x.g.k]=Math.max(s.x.ench[g.x.g.k]||0,g.x.g.lv); inv.slots[i]=null; invChanged(); renderHotbar(); toast(`${ITEMS[s.id].name}: ${enchText(s)}`); burst(player.x,player.y+1.4,player.z,[176,106,255],16,2.5); renderDesk(); }); A.appendChild(b); }); }
document.getElementById('gClose').addEventListener('click',()=>closeUI('gdesk'));
// ---------- fishing ----------
let bobber=null, fishGame=null;
const FISH_LOOT=[[60,[[I.COD,50],[I.SALMON,25],[I.TROPICAL,13],[I.PUFFER,12]]],[15,[[I.STICK,20],[I.STRING,20],[I.BONE,20],[I.LEATHER,15],[B.KELP,15],[I.BOWL,10]]],
  [25,[[I.IRON,22],[I.GOLD,18],[I.DIAMOND,5],['grim',8],['xpbook',6],[I.SADDLE,8],[I.DUSK_PEARL,7],[I.NUG_SILVER,14],[I.GLIDER,3],[I.MAP_EMPTY,9]]]];
const pickW=list=>{ let t=list.reduce((a,b)=>a+b[0]?a+(b[1]??b[0]):a,0), tot=list.reduce((a,b)=>a+(typeof b[1]==='number'?b[1]:b[0]),0), r=Math.random()*tot; for(const e of list){ const w=typeof e[1]==='number'?e[1]:e[0]; if((r-=w)<0) return e; } return list[0]; };
function castRod(sx,sy){ const s=held();
  if(bobber){ if(bobber.state==='bite'){ startFishGame(); } else { toast('Reeled in'); bobber=null; } return; }
  const w=pickWater(sx,sy); if(!w||Math.hypot(w[0]+.5-player.x,w[2]+.5-player.z)>14){ toast('Cast into water'); return; }
  bobber={x:player.x,y:player.y+1.4,z:player.z,tx:w[0]+.5,ty:w[1]+.9,tz:w[2]+.5,state:'fly',t:0,wait:4+Math.random()*10}; player.swingT=.25; }
function stepBobber(dt){ const b=bobber; if(!b) return; const s=held(); if(!s||!ITEMS[s.id].rod||Math.hypot(b.x-player.x,b.z-player.z)>20){ bobber=null; return; }
  b.t+=dt;
  if(b.state==='fly'){ const k=Math.min(1,b.t/.6); b.x=player.x+(b.tx-player.x)*k; b.z=player.z+(b.tz-player.z)*k; b.y=(player.y+1.4)+(b.ty-player.y-1.4)*k+Math.sin(k*Math.PI)*1.5; if(k>=1){ b.state='wait'; b.t=0; for(let i=0;i<6;i++) parts.push({x:b.x,y:b.y,z:b.z,vx:(Math.random()-.5)*2,vy:2,vz:(Math.random()-.5)*2,t:.5,c:[200,230,255],s:.05}); } }
  else if(b.state==='wait'){ b.y=b.ty+Math.sin(b.t*2.5)*.03; if(b.t>b.wait){ b.state='bite'; b.t=0; toast('Something is biting! Tap to reel'); } }
  else if(b.state==='bite'){ b.y=b.ty-.18; if(Math.random()<dt*20) parts.push({x:b.x+(Math.random()-.5)*.4,y:b.ty,z:b.z+(Math.random()-.5)*.4,vx:(Math.random()-.5),vy:1.5,vz:(Math.random()-.5),t:.4,c:[220,240,255],s:.05}); if(b.t>1.8){ b.state='wait'; b.t=0; b.wait=3+Math.random()*8; toast('It got away'); } } }
function startFishGame(){ bobber.state='game'; fishGame={f:.5,fv:0,z:.36,zv:0,p:.3,hold:false,diff:.6+Math.random()*.8}; document.getElementById('fishUI').hidden=false; }
function stepFishGame(dt){ const g=fishGame; if(!g) return;
  g.fv+=(Math.random()-.5)*dt*9*g.diff; g.fv*=.96; g.f=Math.max(.02,Math.min(.98,g.f+g.fv*dt)); if(g.f<=.02||g.f>=.98) g.fv*=-1;
  g.zv+=(g.hold?2.6:-2.2)*dt; g.zv*=.94; g.z=Math.max(0,Math.min(.72,g.z+g.zv*dt)); if(g.z<=0||g.z>=.72) g.zv*=-.3;
  const inZ=g.f>g.z&&g.f<g.z+.28; g.p+=(inZ?.32:-.22)*dt;
  document.getElementById('fZone').style.left=(g.z*100)+'%'; document.getElementById('fFish').style.left=(g.f*100)+'%'; document.getElementById('fProg').style.width=Math.max(0,g.p*100)+'%';
  if(g.p>=1||g.p<=0){ const ok=g.p>=1; fishGame=null; document.getElementById('fishUI').hidden=true; if(ok) catchFish(); else toast('It escaped'); bobber=null; } }
function catchFish(){ const cat=pickW(FISH_LOOT.map(([w,l])=>[w,l])), [_,list]=[0,cat[1]], e=pickW(list.map(x=>[0,x[1],x[0]]).map(x=>[x[2],x[1]])); let id=e[0], x=null;
  if(id==='grim'){ const ks=Object.keys(ENCH), k=ks[Math.random()*ks.length|0]; id=I.GRIMOIRE; x={g:{k,lv:1+(Math.random()*ENCH[k].max|0)}}; }
  if(id==='xpbook'){ id=I.XP_BOOK; x={xp:20+(Math.random()*80|0)}; }
  const left=addItem(id,1); if(!left&&x) inv.slots[inv.landed].x=x; else if(left) spawnDrop(player.x,player.y+1,player.z,id,1);
  player.fishLog=player.fishLog||{}; player.fishLog[id]=(player.fishLog[id]||0)+1; giveXP(1+(Math.random()*6|0),player.x,player.y+1,player.z); useTool();
  toast('Caught: '+ITEMS[id].name+(x&&x.g?' ('+ENCH[x.g.k].name+' '+ROMAN[x.g.lv]+')':'')); }
{ const b=document.getElementById('fReel'); const on=e=>{ e.preventDefault(); if(fishGame) fishGame.hold=true; }, off=()=>{ if(fishGame) fishGame.hold=false; };
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointerleave',off); b.addEventListener('pointercancel',off); }
function openJournal(){ const L=player.fishLog||{}; const ks=Object.keys(L); mode='ui'; document.getElementById('jBody').innerHTML=ks.length?ks.map(k=>`<p>${ITEMS[k]?ITEMS[k].name:k}: <b>${L[k]}</b></p>`).join(''):'<p class="hint">Nothing caught yet.</p>'; document.getElementById('journal').hidden=false; }
document.getElementById('jClose').addEventListener('click',()=>closeUI('journal'));
// ---------- warp bow arrow switching ----------
function syncArrowBtn(){ const s=held(), b=document.getElementById('bArrow'); const on=mode==='play'&&s&&ITEMS[s.id].warp; b.hidden=!on; if(!on) return;
  const w=WARP_ARROWS[player.warpSel||0]; if(b.dataset.k!==String(player.warpSel||0)){ b.dataset.k=String(player.warpSel||0); b.innerHTML=`<img alt="" src="${iconURL(w.id)}">`; } b.title=ITEMS[w.id].name+' ×'+countItem([w.id]); }
document.getElementById('bArrow').addEventListener('click',()=>{ player.warpSel=((player.warpSel||0)+1)%WARP_ARROWS.length; const w=WARP_ARROWS[player.warpSel]; toast(ITEMS[w.id].name+' · '+countItem([w.id])+' left'); syncArrowBtn(); });
function arrowImpact(a,px,py,pz,mob){ const k=a.kind; if(!k) return;
  if(mob){ if(k==='fire'){ mob.fireT=6; mob.fireLv=2; } if(k==='ice'){ mob.frozen=6; } if(k==='swap'){ const o=[player.x,player.y,player.z]; player.x=mob.x; player.y=mob.y; player.z=mob.z; mob.x=o[0]; mob.y=o[1]; mob.z=o[2]; duskPuff(player.x,player.y,player.z); } if(k==='tp'){ teleportPlayer(mob.x,mob.y,mob.z); } return; }
  const X=Math.floor(px), Y=Math.floor(py), Z=Math.floor(pz);
  if(k==='torch'&&(world.get(X,Y,Z)===B.AIR||isW(world.get(X,Y,Z))===false&&BLOCKS[world.get(X,Y,Z)]?.replace)) world.set(X,Y,Z,B.TORCH);
  if(k==='fire'){ for(let i=0;i<10;i++) parts.push({x:px,y:py,z:pz,vx:(Math.random()-.5)*2,vy:Math.random()*2,vz:(Math.random()-.5)*2,t:.6,c:[255,140,40],s:.07,ember:true}); if(typeof lightPortalAt==='function') lightPortalAt(X,Y,Z); }
  if(k==='ice') for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=1;dy++){ if(dx*dx+dz*dz>5) continue; const b=world.get(X+dx,Y+dy,Z+dz); if(b===B.WATER&&!isW(world.get(X+dx,Y+dy+1,Z+dz))) world.set(X+dx,Y+dy,Z+dz,B.ICE); if(BLOCKS[b]?.lava) world.set(X+dx,Y+dy,Z+dz,b===B.LAVA?B.OBSIDIAN:B.COBBLE); }
  if(k==='tp') teleportPlayer(px,py,pz); }
function duskPuff(x,y,z){ for(let i=0;i<30;i++) parts.push({x:x+(Math.random()-.5)*.8,y:y+Math.random()*1.8,z:z+(Math.random()-.5)*.8,vx:(Math.random()-.5)*1.5,vy:Math.random()*1.2,vz:(Math.random()-.5)*1.5,t:1+Math.random(),c:[90,40,130],s:.1+Math.random()*.06,smoke:true}); player.duskFx=1.2; }
function teleportPlayer(x,y,z){ duskPuff(player.x,player.y,player.z); let Y=Math.floor(y); for(let k=0;k<6&&(world.solid(Math.floor(x),Y,Math.floor(z))||world.solid(Math.floor(x),Y+1,Math.floor(z)));k++) Y++;
  player.x=x; player.y=Y; player.z=z; player.vx=player.vy=player.vz=0; player.fallTop=Y; duskPuff(x,Y,z); if(player.mount) dismount(); }
// ---------- camera: viewfinder and photos you can hang like posters ----------
let photoReq=null;
function openCamera(){ if(cam.mode!=='fp') toggleEye(); document.getElementById('viewfinder').hidden=false; cam.photo=true; }
function closeCamera(){ document.getElementById('viewfinder').hidden=true; cam.photo=false; cam.photoZoom=1; document.getElementById('vfZoom').value=1; }
document.getElementById('vfClose').addEventListener('click',closeCamera);
document.getElementById('vfZoom').addEventListener('input',e=>cam.photoZoom=+e.target.value);
document.getElementById('vfShot').addEventListener('click',()=>{ if(!creative()&&!countItem([I.PAPER])){ toast('Each photo needs a piece of paper'); return; }
  photoReq=url=>{ if(!creative()) takeItem([I.PAPER],1); const left=addItem(I.PHOTO,1); if(!left) inv.slots[inv.landed].x={img:url}; invChanged(); toast('Photo taken. Tap a wall with it to hang it'); const f=document.createElement('div'); f.style.cssText='position:fixed;inset:0;background:#fff;z-index:9;pointer-events:none;transition:opacity .4s'; document.body.appendChild(f); requestAnimationFrame(()=>{ f.style.opacity=0; setTimeout(()=>f.remove(),450); }); }; });
function takePhotoNow(){ if(!photoReq) return; const W=canvas.width, H=canvas.height, k=Math.min(1,640/W), c=document.createElement('canvas'); c.width=W*k|0; c.height=H*k|0;
  const sx=W*.08, sy=H*.08; c.width=(W-2*sx)*k|0; c.height=(H-2*sy)*k|0; c.getContext('2d').drawImage(canvas,sx,sy,W-2*sx,H-2*sy,0,0,c.width,c.height); const url=c.toDataURL('image/jpeg',.82); const f=photoReq; photoReq=null; f(url); }
'''
rep("/* ---------- stage 6: decor entities ---------- */",CODE8+"\n/* ---------- stage 6: decor entities ---------- */")
# frame loop: orbs, fishing, arrow button, capture
rep("if(mode==='play'&&game()){ stepFluids(dt); stepSensors(dt); stepLava(dt); }","if(mode==='play'&&game()){ stepFluids(dt); stepSensors(dt); stepLava(dt); stepOrbs(dt); stepBobber(dt); stepFishGame(dt); } syncArrowBtn();")
rep("  buildDynamic(); buildCracks(); buildViewModel(); draw(focusX,focusZ,cam.mode!=='fp');","  if(cam.photo) vmMesh.n=0; buildDynamic(); buildCracks(); if(!cam.photo) buildViewModel(); else vmMesh.n=0; draw(focusX,focusZ,cam.mode!=='fp'); takePhotoNow();")
rep("const fy=fovFor(1.22,asp)*cam.fovK;","const fy=fovFor(1.22,asp)*cam.fovK/(cam.photoZoom||1);")
# dynamic mesh: orbs, bobber + line
rep("  if(world.decor) emitDecor(dynVB);","""  if(world.decor) emitDecor(dynVB); emitOrbs(dynVB);
  if(bobber){ const b=bobber; setVL(sampleLight(b.x,b.y,b.z)); emitBox(dynVB,[b.x-.06,b.y-.06,b.z-.06],[b.x+.06,b.y+.02,b.z+.06],[230,40,40],IDT); emitBox(dynVB,[b.x-.06,b.y+.02,b.z-.06],[b.x+.06,b.y+.08,b.z+.06],[240,240,240],IDT);
    const ox=p.x+Math.sin(p.face)*.6, oy=p.y+1.9, oz=p.z+Math.cos(p.face)*.6, L=Math.hypot(b.x-ox,b.y-oy,b.z-oz); for(let t=0;t<L;t+=.25){ const k=t/L, sag=Math.sin(k*Math.PI)*.4; emitBox(dynVB,[ox+(b.x-ox)*k-.01,oy+(b.y-oy)*k-sag-.01,oz+(b.z-oz)*k-.01],[ox+(b.x-ox)*k+.01,oy+(b.y-oy)*k-sag+.01,oz+(b.z-oz)*k+.01],[220,220,220],IDT); } }""")
# held item taps
rep("  if(it.bucket) return useBucket(sx,sy);","""  if(it.bucket) return useBucket(sx,sy);
  if(it.rod){ castRod(sx,sy); return true; } if(it.xpbook){ useXPBook(); return true; } if(it.journal){ openJournal(); return true; } if(it.camera){ openCamera(); return true; }
  if(it.grimoire){ const g=s.x&&s.x.g; toast(g?`${ENCH[g.k].name} ${ENCH[g.k].max>1?ROMAN[g.lv]:''}: use a grimoire desk to apply it`:'A blank grimoire'); return true; }""")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||it.bucket||","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||it.bucket||it.rod||it.xpbook||it.journal||it.camera||it.grimoire||")
rep("  if(s.id===I.POSTER){ const r=pick(sx,sy);","  if(s.id===I.PHOTO){ const r=pick(sx,sy); if(!r||!r.prev){ toast('Tap a wall, floor or ceiling'); return true; } openPoster(r,null,s.x&&s.x.img); return true; }\n  if(s.id===I.POSTER){ const r=pick(sx,sy);")
rep("function openPoster(r,e){ posterSt={r,e,img:e?e.img:null};","function openPoster(r,e,preset){ posterSt={r,e,img:e?e.img:preset||null,photo:!!preset};")
rep("  document.getElementById('poPrev').src=e?e.img:'';","  document.getElementById('poPrev').src=e?e.img:preset||'';")
rep("const s=held(); if(s&&s.id===I.POSTER&&!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } }",
    "const s=held(); if(s&&(s.id===I.POSTER||s.id===I.PHOTO)&&!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } }")
# grimoire desk tap
rep("  if(b>0&&BLOCKS[b].drawer){","  if(b===B.GRIM_DESK){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } openDesk(); return true; }\n  if(b>0&&BLOCKS[b].drawer){")
rep("const INTERACTIVE=b=>(b>0&&!!BLOCKS[b].drawer)||","const INTERACTIVE=b=>b===B.GRIM_DESK||(b>0&&!!BLOCKS[b].drawer)||")
# labels show contents
rep("function slotLabel(s){ return s?`${ITEMS[s.id].name}","function slotLabel(s){ return s?`${s.x&&s.x.g?'Grimoire: '+ENCH[s.x.g.k].name+(ENCH[s.x.g.k].max>1?' '+ROMAN[s.x.g.lv]:''):ITEMS[s.id].name}${s.x&&s.x.ench?' ('+enchText(s)+')':''}${s.x&&s.x.xp!=null&&s.id===I.XP_BOOK?' · '+s.x.xp+' XP':''}")
# ---------- enchant effects ----------
rep("function weaponStats(){ const s=held(), it=s&&ITEMS[s.id]; if(!it||!it.dmg||it.arrow) return {dmg:1,cd:.4,reach:2.6,tool:false};\n  return {dmg:it.dmg,cd:it.cd||.5,reach:it.reach||2.8,tool:true}; }",
    "function weaponStats(){ const s=held(), it=s&&ITEMS[s.id]; if(!it||!it.dmg||it.arrow) return {dmg:1,cd:.4,reach:2.6+ench(s,'range'),tool:false};\n  return {dmg:it.dmg,cd:(it.cd||.5)/(1+.25*ench(s,'speedy')),reach:(it.reach||2.8)+ench(s,'range'),tool:true}; }")
rep("  hitMob(m,w.dmg,player.x,player.z); if(w.tool) useTool();\n}","  hitMob(m,w.dmg,player.x,player.z); const hs=held(); if(hs&&hs.x&&hs.x.ench) applyHitEnch(m,hs.x.ench); if(w.tool) useTool();\n}")
rep("function reachOK(x,y,z){return Math.hypot(x+.5-player.x,y+.5-(player.y+1.2),z+.5-player.z)<=6.5;}","function reachOK(x,y,z){return Math.hypot(x+.5-player.x,y+.5-(player.y+1.2),z+.5-player.z)<=6.5+ench(held(),'range');}")
rep("  let t=sp.h/speed;","  let t=sp.h/speed/(1+.35*ench(s,'speedy'));")
rep("const bowPower=()=>bowDraw?Math.min(1,(performance.now()-bowDraw.t0)/900):0;","const bowPower=()=>bowDraw?Math.min(1,(performance.now()-bowDraw.t0)/(900/(1+.35*ench(held(),'speedy')))):0;")
rep("const armorTotal=()=>inv.armor.reduce((a,s)=>a+(s?ITEMS[s.id].def:0),0);","const armorTotal=()=>inv.armor.reduce((a,s)=>a+(s?ITEMS[s.id].def+ench(s,'armor')*2:0),0);")
# shooting: infinity, scattershot, warp arrows, enchant payloads
rep("""  const bestA=inv.slots.filter(s=>s&&ITEMS[s.id].arrow).sort((a,b)=>ITEMS[b.id].dmg-ITEMS[a.id].dmg)[0];
  if(!bestA){ toast('No arrows. Craft some: 2 sticks over a rock'); return; }
  const aid=bestA.id, bowIt=ITEMS[held().id], strong=heldTier()>=2;""","""  const bow=held(), inf=ench(bow,'infinity'), sc=ench(bow,'scatter');
  const bestA=inv.slots.filter(s=>s&&ITEMS[s.id].arrow&&!ITEMS[s.id].special).sort((a,b)=>ITEMS[b.id].dmg-ITEMS[a.id].dmg)[0];
  let aid=null, kind=null; if(ITEMS[bow.id].warp){ const w=WARP_ARROWS[player.warpSel||0]; if(countItem([w.id])||creative()){ aid=w.id; kind=w.kind; } }
  if(!aid) aid=bestA?bestA.id:inf?I.SARROW:null;
  if(!aid){ toast('No arrows. Craft some: 2 sticks over a rock'); return; }
  const bowIt=ITEMS[bow.id], strong=heldTier()>=2;""")
rep("""  arrows.push({id:aid,dmg:ITEMS[aid].dmg*(1+(bowIt.tier||1)*.15)*(.4+.6*power),x:o[0]+d[0]/l*.5,y:o[1]+d[1]/l*.5,z:o[2]+d[2]/l*.5,vx:d[0]/l*sp,vy:d[1]/l*sp+Math.min(4,l*(strong?.08:.12)),vz:d[2]/l*sp,stuck:false,t:0});
  if(!creative()) takeItem([aid],1); useTool();""","""  const n=sc?3*sc:1, e=bow.x&&bow.x.ench||null;
  for(let k=0;k<n;k++){ const sp2=n>1?(k-(n-1)/2)*(.5/n+.05):0, ca=Math.cos(sp2), sa=Math.sin(sp2), dx=(d[0]*ca+d[2]*sa)/l, dz=(-d[0]*sa+d[2]*ca)/l, jy=n>1?(Math.random()-.5)*.06:0;
    arrows.push({id:aid,kind,ench:e,dmg:ITEMS[aid].dmg*(1+(bowIt.tier||1)*.15)*(.4+.6*power),x:o[0]+dx*.5,y:o[1]+d[1]/l*.5,z:o[2]+dz*.5,vx:dx*sp,vy:(d[1]/l+jy)*sp+Math.min(4,l*(strong?.08:.12)),vz:dz*sp,stuck:false,t:0,noPick:n>1&&k>0||inf&&!kind}); }
  if(!creative()&&!(inf&&!kind)) takeItem([aid],1); useTool();""")
rep("    if(!a.hostile) for(const m of mobs){ const {hw,h}=mobBox(m); if(Math.abs(m.x-a.x)<hw+.15&&Math.abs(m.z-a.z)<hw+.15&&a.y>m.y&&a.y<m.y+h){ hitMob(m,a.dmg||2,a.x-a.vx,a.z-a.vz); a.stuck=true; a.t=59; break; } }",
    "    if(!a.hostile) for(const m of mobs){ const {hw,h}=mobBox(m); if(Math.abs(m.x-a.x)<hw+.15&&Math.abs(m.z-a.z)<hw+.15&&a.y>m.y&&a.y<m.y+h){ hitMob(m,a.dmg||2,a.x-a.vx,a.z-a.vz); applyHitEnch(m,a.ench); arrowImpact(a,a.x,a.y,a.z,m); a.stuck=true; a.t=59; if(a.kind) a.gone=true; break; } }\n    if(a.gone){ arrows.splice(i,1); continue; }")
rep("      if(world.solid(Math.floor(nx),Math.floor(ny),Math.floor(nz))&&ny>=0){ a.stuck=true; a.t=0; burst(a.x,a.y,a.z,[200,200,200],3,1.5); break; }",
    "      if(a.kind==='ice'&&isW(world.get(Math.floor(nx),Math.floor(ny),Math.floor(nz)))){ arrowImpact(a,nx,ny,nz,null); a.gone=true; break; }\n      if(world.solid(Math.floor(nx),Math.floor(ny),Math.floor(nz))&&ny>=0){ a.stuck=true; a.t=0; burst(a.x,a.y,a.z,[200,200,200],3,1.5); if(a.kind){ arrowImpact(a,a.x,a.y,a.z,null); a.gone=true; } break; }")
rep("    if(a.stuck){ if(a.hostile){","    if(a.gone){ arrows.splice(i,1); continue; }\n    if(a.stuck){ if(a.noPick){ if(a.t>8) arrows.splice(i,1); continue; } if(a.hostile){")
# mobs: dots, frozen slowdown and tint, XP on death
rep("    if(m.type==='sheep'&&m.sheared){","    stepMobDots(m,dt); if(m.dead) continue; if(m.frozen>0) sp*=.25;\n    if(m.type==='sheep'&&m.sheared){")
rep("  const C=c=>hurt?[255,c[1]*.45|0,c[2]*.45|0]:c;","  const C=c=>hurt?[255,c[1]*.45|0,c[2]*.45|0]:m.frozen>0?[c[0]*.6+60|0,c[1]*.7+70|0,255]:c;")
rep("    if(m.saddled) spawnDrop(m.x,m.y+.6,m.z,I.SADDLE,1);","    if(m.saddled) spawnDrop(m.x,m.y+.6,m.z,I.SADDLE,1); if(!m.baby) giveXP(MOB[m.type].hostile?5+(Math.random()*5|0):1+(Math.random()*3|0),m.x,m.y+.5,m.z);")
rep("  if(!creative()) for(const [id,n] of dropsFor(b,tool)) spawnDrop(x+.5,y+.5,z+.5,id,n);","  if(!creative()){ for(const [id,n] of dropsFor(b,tool)) spawnDrop(x+.5,y+.5,z+.5,id,n); if(BLOCKS[b].ore&&tool==='pick') giveXP(b===B.ORE_DIAMOND?7:b===B.ORE_COAL?1:2+(Math.random()*3|0),x+.5,y+.5,z+.5); }")
# HUD xp bar
rep("  if(hudDirty||invDirty){ hudDirty=false; const s=surv();","  if(hudDirty||invDirty){ { const xb=document.getElementById('xpbar'); xb.hidden=!surv(); xb.querySelector('b').textContent=lvOf(); xb.querySelector('i').style.setProperty('--xp',((player.xp||0)%XPL/XPL*100)+'%'); }\n    hudDirty=false; const s=surv();")
# save xp, fish log
rep("inv:inv.slots.map(packS),sel:inv.sel,hp:player.hp,","inv:inv.slots.map(packS),sel:inv.sel,hp:player.hp,xp:player.xp||0,fishLog:player.fishLog||{},")
# icons
rep("    if(it.bucket){","""    if(it.grimoire||id===I.BOOK||it.xpbook||it.journal){ const col=it.grimoire?'#5a2a8a':it.xpbook?'#2f7a3a':it.journal?'#2a5a8a':'#8a5a34'; g.fillStyle=col; g.fillRect(14,8,32,44); g.fillStyle='#f4efe2'; g.fillRect(42,10,4,40); if(it.grimoire){ g.fillStyle='#d6a4ff'; g.beginPath(); g.arc(29,30,7,0,7); g.fill(); } if(it.xpbook){ g.fillStyle='#c8ff7a'; g.beginPath(); g.arc(29,30,6,0,7); g.fill(); } return c; }
    if(it.rod){ g.strokeStyle='#8a5a34'; g.lineWidth=4; g.beginPath(); g.moveTo(12,52); g.lineTo(46,10); g.stroke(); g.strokeStyle='#ddd'; g.lineWidth=1.5; g.beginPath(); g.moveTo(46,10); g.lineTo(50,40); g.stroke(); g.fillStyle='#e33'; g.fillRect(47,40,6,6); return c; }
    if(it.fish||id===I.CCOD||id===I.CSALMON){ const col={[I.COD]:'#c9a87a',[I.SALMON]:'#e0705a',[I.TROPICAL]:'#ff9a2a',[I.PUFFER]:'#e8d24a',[I.CCOD]:'#a8794a',[I.CSALMON]:'#b8583e'}[id]; g.fillStyle=col; g.beginPath(); g.ellipse(28,30,18,10,0,0,7); g.fill(); g.beginPath(); g.moveTo(44,30); g.lineTo(56,20); g.lineTo(56,40); g.fill(); g.fillStyle='#222'; g.fillRect(16,26,3,3); return c; }
    if(id===I.WARP_INGOT){ g.fillStyle='#b06aff'; g.beginPath(); g.moveTo(10,40);g.lineTo(18,26);g.lineTo(50,26);g.lineTo(54,40); g.fill(); g.fillStyle='#ffd84a'; g.fillRect(20,30,24,3); return c; }
    if(id===I.WARP_BOW){ g.strokeStyle='#b06aff'; g.lineWidth=5; g.beginPath(); g.moveTo(14,12); g.quadraticCurveTo(52,14,48,50); g.stroke(); g.strokeStyle='#ffd84a'; g.lineWidth=1.6; g.beginPath(); g.moveTo(14,12); g.lineTo(48,50); g.stroke(); return c; }
    if(it.special){ g.strokeStyle='#9a6a3c'; g.lineWidth=4; g.beginPath(); g.moveTo(14,46); g.lineTo(44,16); g.stroke(); g.fillStyle='rgb('+it.col.join(',')+')'; g.beginPath(); g.arc(46,14,8,0,7); g.fill(); return c; }
    if(it.camera){ g.fillStyle='#3a3d44'; g.fillRect(8,18,44,30); g.fillStyle='#22252a'; g.fillRect(14,12,12,8); g.fillStyle='#8fd3ff'; g.beginPath(); g.arc(30,33,10,0,7); g.fill(); g.fillStyle='#111'; g.beginPath(); g.arc(30,33,5,0,7); g.fill(); return c; }
    if(it.photo){ g.fillStyle='#f4efe2'; g.fillRect(8,10,44,40); g.fillStyle='#7cc4ff'; g.fillRect(12,14,36,24); g.fillStyle='#5aa040'; g.fillRect(12,30,36,8); return c; }
    if(it.bucket){""")
rep("id===I.DUSK_ORB||id===I.DUSK_PEARL)){","id===I.DUSK_ORB||id===I.DUSK_PEARL||it.grimoire||id===I.BOOK||it.xpbook||it.journal||it.rod||it.fish||id===I.CCOD||id===I.CSALMON||id===I.WARP_INGOT||id===I.WARP_BOW||it.special||it.camera||it.photo)){")
open(F,'w').write(s); print('ok')
