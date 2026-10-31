
/* ---------- stage 18: shears, light blocks, squid and glow squid, parrots, breeding for every animal, hearts ---------- */
{ const W=(name,fn)=>{ const o=window[name]; if(typeof o!=='function') throw new Error('no '+name); window[name]=fn(o); };
const use1=s=>{ if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; } invChanged(); };
const bioK=(x,z)=>{ x=Math.floor(x); z=Math.floor(z); const ch=world.chunk(x>>4,z>>4); return ch&&ch.bio?BIO[ch.bio[(z&15)*CS+(x&15)]].k:''; };

/* --- items --- */
NI('INK_SAC','Ink sac'); NI('GLOW_INK','Glow ink sac');
ispr(I.INK_SAC,(P,E)=>{ E(8,10,5,4.5,'#2a2a3a','#14141e'); for(let y=3;y<7;y++) P(8,y,'#3a3a4c'); P(7,6,'#3a3a4c'); P(9,6,'#3a3a4c'); P(6,9,'#4a4a60'); });
ispr(I.GLOW_INK,(P,E)=>{ E(8,10,5,4.5,'#1f8a86','#11605c'); for(let y=3;y<7;y++) P(8,y,'#2aa59f'); P(7,6,'#2aa59f'); P(9,6,'#2aa59f'); for(const [x,y] of [[6,9],[10,11],[8,12],[9,8]]) P(x,y,'#9ff7e8'); });
Object.assign(ITEM_MC,{[I.INK_SAC]:'ink_sac',[I.GLOW_INK]:'glow_ink_sac'});
// shears in every material: pixel icons tinted by the material
for(const m of MATS){ const id=GEN[m.k+':shears']; if(!id) continue; const c=hex(m.col), d=c.map(v=>v*.62|0), l=c.map(v=>Math.min(255,v*1.25+30|0)), hd=m.k==='wood'?hex('#6b4a2c'):hex('#4a3a34');
  ispr(id,(P)=>{ for(let k=0;k<7;k++){ P(6+k,9-k,k<2?d:c); P(7+k,9-k,l); const y=10-Math.round(k*.55); P(8+k,y,l); P(8+k,y+1,k<2?d:c); }
    for(const [x,y] of [[2,11],[3,10],[4,10],[5,11],[5,12],[4,13],[3,13],[2,12],[6,13],[7,12],[8,12],[9,13],[9,14],[8,15],[7,15],[6,14]]) P(x,y,hd); P(7,10,[30,30,30]); });
  if(m.k==='iron') ITEM_MC[id]='shears'; }
Object.assign(MCB,{SEA_LANTERN:'sea_lantern',SHROOMLIGHT:'shroomlight'});
for(let fi=0;fi<4;fi++){ MCB['CARVED_PUMPKIN_'+fi]=['pumpkin_side','pumpkin_top','pumpkin_top']; MCB['JACK_O_LANTERN_'+fi]=['pumpkin_side','pumpkin_top','pumpkin_top']; }

/* --- recipes and hardness --- */
const CORALS=[B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN];
r_(JACK[0],1,['p','t'],{keys:{p:[CARVED[0]],t:[B.TORCH]},cat:'blocks'});
// no guardians needed: sea glass from coral and glass, lit by glow ink (or lumen dust)
r_(B.SEA_LANTERN,1,['gcg','cnc','gcg'],{keys:{g:[B.GLASS],c:CORALS,n:[I.GLOW_INK,I.LUMEN]},cat:'blocks'});
r_(B.SHROOMLIGHT,1,['.m.','mtm','.m.'],{keys:{m:[B.MUSH_R,B.MUSH_BR],t:[B.TORCH,I.GLOW_INK]},cat:'blocks'});
r_(DYE_BY.black.item,1,['i'],{keys:{i:[I.INK_SAC]},cat:'items'});
r_(DYE_BY.cyan.item,1,['i'],{keys:{i:[I.GLOW_INK]},cat:'items'});
spec([...CARVED,...JACK],1.4,'axe'); spec(B.SEA_LANTERN,.5); spec(B.SHROOMLIGHT,.8,'axe');
for(const id of [...CARVED,...JACK]) delete ITEMS[id]?.farm;
MOB.horse.food.push(I.WHEAT,I.CARROT);

/* --- shears: leaves, cobwebs, vines and wool come off fast and drop themselves; sheep give more wool; pumpkins can be carved --- */
W('mineTime0',o=>function(b,tool){ if(tool!=='shears') return o.call(this,b,tool); const bd=b>0&&BLOCKS[b]; if(!bd) return o.call(this,b,null);
  if(bd.leaves) return .05; if(b===B.COBWEB) return .15; if(bd.wool) return .2; if(bd.vine||bd.replace||bd.dbl) return .05;
  const sp=SPEC[b]; return o.call(this,b,sp&&sp.tool==='knife'?'knife':null); });
W('dropsFor',o=>function(b,tool){ if(tool!=='shears'||!(b>0)) return o.call(this,b,tool); const bd=BLOCKS[b];
  if(bd.leaves) return [[ITEMS[b]?b:B.LEAVES,1]]; if(bd.vine) return [[B.VINE_N,1]]; if(b===B.COBWEB) return ITEMS[B.COBWEB]?[[B.COBWEB,1]]:[[I.STRING,2]];
  return o.call(this,b,'knife'); });
W('farmTap',o=>function(x,y,z,b){ const s=held(), it=s&&ITEMS[s.id];
  if(it&&it.tool==='shears'&&b===B.PUMPKIN&&!buildMode){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; }
    const f=face4(), fi=FACE4.indexOf({n:'s',s:'n',e:'w',w:'e'}[f]); world.set(x,y,z,CARVED[fi]); const v=F4V[FACE4[fi]];
    spawnDrop(x+.5+v[0]*.6,y+.5,z+.5+v[1]*.6,I.PUMPKIN_SEEDS,4); useTool(); sfxBlock(B.PUMPKIN,'break',x,y,z,.8); burst(x+.5,y+.6,z+.5,[230,150,50],8,2); return true; }
  return o.apply(this,arguments); });
W('placeSpecial',o=>function(r,id){ const bd=BLOCKS[id]; if(bd&&bd.pface){ const f=face4(), fi=FACE4.indexOf({n:'s',s:'n',e:'w',w:'e'}[f]); return (bd.pface.lit?JACK:CARVED)[fi]; } return o.apply(this,arguments); });

/* --- hearts --- */
window.hearts=function(x,y,z,n){ for(let i=0;i<n;i++) parts.push({x:x+(Math.random()-.5)*.7,y:y+Math.random()*.4,z:z+(Math.random()-.5)*.7,vx:(Math.random()-.5)*.25,vy:.55+Math.random()*.45,vz:(Math.random()-.5)*.25,t:1.1+Math.random()*.6,heart:1,c:[226,36,64],s:.045}); };
W('burst',o=>function(x,y,z,col,n,sp){ if(col&&col[0]===240&&col[1]===120&&col[2]===150) return hearts(x,y,z,Math.max(2,Math.round(n/2))); return o.apply(this,arguments); });
const HEART=['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...'];
window.emitHeart=function(q){ const r=cam.right||[1,0,0], s=q.s*Math.min(1,q.t*2.5); setVL(VL_EMISSIVE);
  for(let row=0;row<6;row++) for(let c=0;c<7;c++){ if(HEART[row][c]!=='X') continue; const u=(c-3)*s, v=(2.5-row)*s, cx=q.x+r[0]*u, cy=q.y+v, cz=q.z+r[2]*u, h=s*.52;
    emitBox(dynVB,[cx-h,cy-h,cz-h],[cx+h,cy+h,cz+h],row===1&&(c===1||c===2)?[255,150,160]:q.c,IDT); } };

/* --- pumpkin faces: drawn on the front of the block, glowing for jack o'lanterns --- */
const PFACE=[[3,9,6,11],[4,11,5,12],[10,9,13,11],[11,11,12,12],[7,7,9,8],[3,4,13,5],[3,5,5,6],[6,5,10,6],[11,5,13,6]];
window.emitPFace=function(vb,F,x,y,z,x0,z0,lit,CLs){
  if(lit) setVL(VL_EMISSIVE); else { VL[0]=(CLs[0][0]+CLs[2][0])>>1;VL[1]=(CLs[0][1]+CLs[2][1])>>1;VL[2]=(CLs[0][2]+CLs[2][2])>>1;VL[3]=255;VL[4]=(CLs[0][3]+CLs[2][3])>>1;VL[5]=(CLs[0][4]+CLs[2][4])>>1;VL[6]=(CLs[0][5]+CLs[2][5])>>1; }
  const flip=(F.a===0&&F.s===0)||(F.a===2&&F.s===1); PAT=0;
  for(const [a,b,c,d] of PFACE){ const q=[]; for(const [du,dv] of [[0,0],[1,0],[1,1],[0,1]]){ const p=[x,y,z]; p[F.a]+=F.s+(F.s?.004:-.004);
      let u=(du?c:a)/16; if(flip) u=1-u; p[F.u]+=u; p[F.v]+=(dv?d:b)/16; q.push([p[0]+x0,p[1],p[2]+z0]); }
    quadRaw(vb,q,lit?[255,204,84]:[58,32,10],1); } };

/* --- creatures --- */
const PARROT_COLS=[[200,42,32],[48,86,206],[104,180,36],[58,186,204],[172,172,172]];
Object.assign(MOB,{
  squid:{hp:10,speed:2.1,w:.8,h:.85,food:[B.KELP,I.DRIED_KELP],swim:1,drops:()=>[[I.INK_SAC,rint(1,3)]],name:'Squid'},
  glow_squid:{hp:10,speed:1.9,w:.8,h:.85,food:[B.KELP,I.DRIED_KELP],swim:1,glow:1,drops:()=>[[I.GLOW_INK,rint(1,3)]],name:'Glow squid'},
  parrot:{hp:6,speed:3,w:.5,h:.85,food:[I.SEEDS,I.BEET_SEEDS,I.MELON_SEEDS,I.PUMPKIN_SEEDS],drops:()=>[[I.FEATHER,rint(1,2)]],name:'Parrot',tamable:1},
});
MOB.wolf.tamable=1;
// two animals in love find each other; returns the mate to head for, or null
function loveStep(m){ if(!(m.love>0)||m.baby) return null;
  const mate=mobs.find(o=>o!==m&&o.type===m.type&&o.love>0&&!o.baby&&Math.hypot(o.x-m.x,o.y-m.y,o.z-m.z)<12); if(!mate) return null;
  if(Math.hypot(mate.x-m.x,mate.y-m.y,mate.z-m.z)<1.3){ m.love=mate.love=0; m.breedCd=mate.breedCd=120;
    spawnMob(m.type,(m.x+mate.x)/2,m.y,(m.z+mate.z)/2,true); const c=mobs[mobs.length-1]; c.col=Math.random()<.5?m.col:mate.col; if(m.tame&&mate.tame){ c.tame=true; c.sit=false; }
    hearts(m.x,m.y+.8,m.z,6); return null; }
  return mate; }
const wetAt=(x,y,z)=>isW(world.get(Math.floor(x),Math.floor(y),Math.floor(z)));
MOB.squid.step=MOB.glow_squid.step=function(m,d,dt,dist){
  const inW=wetAt(m.x,m.y+.45,m.z); m.anim=(m.anim||0)+dt*(m.flee>0?10:3.6); m.moving=false;
  if(!inW){ m.pitch=(m.pitch||0)*.9; mobGravity(m,dt); m.dryT=(m.dryT||0)+dt; if(m.dryT>2){ m.dryT=0; m.noInk=1; hitMob(m,1,m.x,m.z); m.noInk=0; } return; }
  m.dryT=0; m.timer-=dt; const mate=loveStep(m);
  let tx=m.sx||0, ty=m.sy||0, tz=m.sz||0;
  if(m.flee>0){ m.flee-=dt; tx=m.x-player.x; ty=m.y-player.y-.5; tz=m.z-player.z; }
  else if(mate){ tx=mate.x-m.x; ty=mate.y-m.y; tz=mate.z-m.z; }
  else if(m.timer<=0){ m.timer=2+Math.random()*4; const a=Math.random()*6.28; m.sx=tx=Math.cos(a); m.sz=tz=Math.sin(a); m.sy=ty=(Math.random()-.5)*.9; if(Math.random()<.2){ m.sx=m.sy=m.sz=0; tx=ty=tz=0; } }
  const l=Math.hypot(tx,ty,tz)||1, pulse=.35+.65*Math.max(0,Math.sin(m.anim)), sp=d.speed*(m.flee>0?2:1)*pulse*(l>.01?1:0), k=1-Math.exp(-2.5*dt);
  m.vx=(m.vx||0)+(tx/l*sp-(m.vx||0))*k; m.vy=(m.vy||0)+(ty/l*sp-(m.vy||0))*k; m.vz=(m.vz||0)+(tz/l*sp-(m.vz||0))*k;
  for(const [ax,v] of [['x',m.vx],['y',m.vy],['z',m.vz]]){ const o=m[ax]; m[ax]+=v*dt;
    if(!wetAt(m.x,m.y+.45,m.z)||(ax==='y'&&!wetAt(m.x,m.y+.95,m.z)&&v>0)||world.solid(Math.floor(m.x),Math.floor(m.y+.1),Math.floor(m.z))){ m[ax]=o; m['v'+ax]=0; m.timer=0; } }
  const h=Math.hypot(m.vx,m.vz); if(h>.15) m.face=angLerp(m.face,Math.atan2(m.vx,m.vz),1-Math.exp(-4*dt));
  const tp=Math.min(1.3,Math.atan2(h,Math.abs(m.vy)+.4)*1.1); m.pitch=(m.pitch||0)+(tp-(m.pitch||0))*(1-Math.exp(-3*dt));
  if(m.glow&&Math.random()<dt*2) parts.push({x:m.x+(Math.random()-.5)*.6,y:m.y+.4+Math.random()*.5,z:m.z+(Math.random()-.5)*.6,vx:0,vy:.2,vz:0,t:1,c:[120,255,225],s:.03,ember:true});
};
MOB.glow_squid.step=MOB.squid.step;
MOB.parrot.step=function(m,d,dt,dist){ const p=player; m.flap=(m.flap||0)+dt*24; m.moving=false;
  const mate=loveStep(m); let tgt=null;
  if(m.tame&&m.sit&&!mate){ m.fly=false; mobGravity(m,dt); return; }
  if(m.flee>0){ m.flee-=dt; const a=Math.atan2(m.x-p.x,m.z-p.z); tgt=[m.x+Math.sin(a)*4,m.y+2,m.z+Math.cos(a)*4]; }
  else if(mate) tgt=[mate.x,mate.y+.2,mate.z];
  else if(m.tame){ if(dist>24){ m.x=p.x+(Math.random()-.5)*2; m.y=p.y+1.5; m.z=p.z+(Math.random()-.5)*2; m.vy=0; return; }
    if(dist>3.2||(m.fly&&dist>1.8)){ const a=(m.phase||0)+performance.now()/3000; tgt=[p.x+Math.sin(a)*1.4,p.y+1.7,p.z+Math.cos(a)*1.4]; } }
  else { m.timer-=dt; if(m.timer<=0){ m.timer=3+Math.random()*6;
      if(Math.random()<.6){ const x=Math.floor(m.x+(Math.random()*2-1)*8), z=Math.floor(m.z+(Math.random()*2-1)*8); if(world.chunk(x>>4,z>>4)){ m.tx=x+.5; m.tz=z+.5; m.ty=world.surface(x,z)+1; } } else m.tx=null; }
    if(m.tx!=null&&m.ty!=null) tgt=[m.tx,m.ty,m.tz]; }
  if(tgt){ const dx=tgt[0]-m.x, dy=tgt[1]-m.y, dz=tgt[2]-m.z, l=Math.hypot(dx,dy,dz);
    if(l<.5){ if(!m.tame) m.tx=null; }
    else { m.fly=true; const sp=d.speed*(m.tame&&dist>8?1.7:1), st=Math.min(l,sp*dt), nx=m.x+dx/l*st, ny=m.y+dy/l*st+Math.sin(m.flap*.25)*.01, nz=m.z+dz/l*st;
      if(!mobSolid(nx,ny,nz,m)){ m.x=nx; m.y=ny; m.z=nz; } else if(!mobSolid(m.x,m.y+sp*dt,m.z,m)) m.y+=sp*dt; else { m.timer=0; m.tx=null; }
      m.face=angLerp(m.face,Math.atan2(dx,dz),1-Math.exp(-7*dt)); m.vy=0; return; } }
  mobGravity(m,dt); m.fly=!m.onGround; if(m.fly) m.vy=Math.max(m.vy,-2.2);
};
// squid squirt ink when hurt: a cloud, and a shot at whoever hit them that blinds for a few seconds
const INKS=[]; let blindT=0, blindGlow=0, inkFx=null;
function inkCloud(x,y,z,glow,n){ for(let i=0;i<n;i++) parts.push({x:x+(Math.random()-.5)*.5,y:y+(Math.random()-.5)*.5,z:z+(Math.random()-.5)*.5,vx:(Math.random()-.5)*1.4,vy:(Math.random()-.3)*.6,vz:(Math.random()-.5)*1.4,t:1.6+Math.random()*1.2,
  c:glow?[60,220,200]:[16,16,26],s:.12+Math.random()*.1,smoke:!glow,ember:!!glow}); }
W('hitMob',o=>function(m,dmg,fx,fz){ const r=o.apply(this,arguments); const d=MOB[m.type];
  if(d&&d.swim&&!m.noInk){ const glow=!!d.glow; inkCloud(m.x,m.y+.5,m.z,glow,16); sfx('splashS',m.x,m.y+.5,m.z,.6);
    const dx=player.x-m.x, dy=player.y+1.1-(m.y+.5), dz=player.z-m.z, l=Math.hypot(dx,dy,dz)||1;
    if(l<10&&!m.dead) INKS.push({x:m.x,y:m.y+.5,z:m.z,vx:dx/l*11,vy:dy/l*11,vz:dz/l*11,t:0,glow}); }
  return r; });
function stepInk(dt){
  for(let i=INKS.length-1;i>=0;i--){ const k=INKS[i]; k.t+=dt; k.x+=k.vx*dt; k.y+=k.vy*dt; k.z+=k.vz*dt;
    parts.push({x:k.x,y:k.y,z:k.z,vx:0,vy:.1,vz:0,t:.7,c:k.glow?[90,240,215]:[14,14,22],s:.09,smoke:!k.glow,ember:k.glow});
    const hitP=Math.hypot(k.x-player.x,k.z-player.z)<.6&&k.y>player.y&&k.y<player.y+ph()+.1;
    if(hitP){ blindT=k.glow?3:5; blindGlow=k.glow?1:0; inkCloud(k.x,k.y,k.z,k.glow,10); toast(k.glow?'Dazzled by glow ink!':'Blinded by ink!'); INKS.splice(i,1); continue; }
    if(k.t>2||world.solid(Math.floor(k.x),Math.floor(k.y),Math.floor(k.z))){ inkCloud(k.x,k.y,k.z,k.glow,6); INKS.splice(i,1); } }
  blindT=Math.max(0,blindT-dt);
  if(!inkFx){ inkFx=document.createElement('div'); Object.assign(inkFx.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'4',opacity:'0',transition:'opacity .25s'}); document.body.appendChild(inkFx); }
  const op=Math.min(1,blindT/1.2); if(+inkFx.style.opacity!==op){ inkFx.style.opacity=op.toFixed(2);
    inkFx.style.background=blindGlow?'radial-gradient(circle at 50% 50%,rgba(150,255,235,.35) 0%,rgba(20,90,85,.92) 55%)':'radial-gradient(circle at 50% 50%,rgba(0,0,0,.5) 0%,rgba(4,4,10,.97) 50%)'; } }
// spawning: squid in open water, glow squid in dark underground water, parrots in jungles
let wSpawnT=6, pSpawnT=10;
function stepSpawn18(dt){ if(!world||world.preview||world.meta.dim||mode!=='play') return;
  wSpawnT-=dt; if(wSpawnT<=0){ wSpawnT=8;
    const sq=mobs.filter(m=>m.type==='squid'&&Math.hypot(m.x-player.x,m.z-player.z)<64).length, gs=mobs.filter(m=>m.type==='glow_squid'&&Math.hypot(m.x-player.x,m.z-player.z)<48).length;
    if(sq<7) for(let k=0;k<6;k++){ const a=Math.random()*6.28, dd=14+Math.random()*30, x=Math.floor(player.x+Math.cos(a)*dd), z=Math.floor(player.z+Math.sin(a)*dd);
      if(x<1||z<1||x>=world.size-1||z>=world.size-1||!world.chunk(x>>4,z>>4)) continue; let dep=0; while(dep<40&&isW(world.get(x,SEA-1-dep,z))) dep++; if(dep<4) continue;
      const y=SEA-2-(Math.random()*(dep-3)|0), n=rint(1,Math.min(4,7-sq)); for(let i=0;i<n;i++){ spawnMob('squid',x+.5+(Math.random()-.5),y,z+.5+(Math.random()-.5),Math.random()<.15); } break; }
    if(gs<4) for(let k=0;k<10;k++){ const a=Math.random()*6.28, dd=10+Math.random()*24, x=Math.floor(player.x+Math.cos(a)*dd), z=Math.floor(player.z+Math.sin(a)*dd), y=Math.floor(player.y+(Math.random()-.5)*32);
      if(y<3||y>SEA-8||x<1||z<1||x>=world.size-1||z>=world.size-1||!world.chunk(x>>4,z>>4)) continue;
      if(!isW(world.get(x,y,z))||!isW(world.get(x,y+1,z))||skyAt(x,y,z)>0) continue; spawnMob('glow_squid',x+.5,y,z+.5,false); break; } }
  pSpawnT-=dt; if(pSpawnT<=0){ pSpawnT=18;
    if(mobs.filter(m=>m.type==='parrot'&&!m.tame&&Math.hypot(m.x-player.x,m.z-player.z)<64).length<5) for(let k=0;k<6;k++){ const a=Math.random()*6.28, dd=16+Math.random()*26, cx=player.x+Math.cos(a)*dd, cz=player.z+Math.sin(a)*dd;
      if(!/jungle/.test(bioK(cx,cz))) continue; const p=grassSpot(cx,cz,4); if(!p) continue; const n=rint(1,2), col=PARROT_COLS[Math.random()*PARROT_COLS.length|0];
      for(let i=0;i<n;i++){ spawnMob('parrot',p[0],p[1]+Math.random()*3,p[2],false); const m=mobs[mobs.length-1]; m.col=Math.random()<.7?col:PARROT_COLS[Math.random()*PARROT_COLS.length|0]; } break; } } }
function stepLiking(dt){ const s=held();
  for(const m of mobs){ const d=MOB[m.type]; if(!d.tamable&&!d.swim&&d.hostile) continue; const dist=Math.hypot(m.x-player.x,m.y-player.y,m.z-player.z);
    if(m.love>0&&Math.random()<dt*1.2) hearts(m.x,m.y+mobBox(m).h+.1,m.z,1);
    else if(d.tamable&&m.tame&&dist<3&&Math.random()<dt*.06) hearts(m.x,m.y+mobBox(m).h+.1,m.z,1);
    else if(d.tamable&&!m.tame&&s&&dist<6&&(m.type==='wolf'?s.id===I.BONE:d.food.includes(s.id))&&Math.random()<dt*.15) hearts(m.x,m.y+mobBox(m).h+.1,m.z,1); }
  for(let i=mobs.length-1;i>=0;i--){ const m=mobs[i]; if(MOB[m.type].swim&&Math.hypot(m.x-player.x,m.z-player.z)>100) mobs.splice(i,1); } }
W('stepMobs',o=>function(dt){ o.apply(this,arguments); if(!world||world.preview) return; stepInk(dt); stepSpawn18(dt); stepLiking(dt); });
// taming parrots, dyeing tame parrots, breeding tame wolves and parrots
W('tapEntity',o=>function(sx,sy){ const e=pickEntity(sx,sy);
  if(e&&e.mob){ const m=e.mob, s=held(), it=s&&ITEMS[s.id], d=MOB[m.type], near=Math.hypot(m.x-player.x,m.z-player.z)<3.5&&Math.abs(m.y-player.y)<3;
    if(m.type==='parrot'&&near){
      if(!m.tame&&it&&d.food.includes(s.id)){ use1(s); if(Math.random()<1/3||creative()){ m.tame=true; m.sit=false; m.flee=0; toast('Tamed! Tap it to make it sit or follow · dye changes its colour'); hearts(m.x,m.y+.8,m.z,7); }
        else { toast('The parrot is not sure yet…'); burst(m.x,m.y+.8,m.z,[120,120,120],5,1.5); } return true; }
      if(m.tame&&it&&it.dye){ const k=DYES.findIndex(q=>q.k===it.dye); m.col=hex(DYES[k].wool); use1(s); toast('Dyed the parrot '+DYES[k].name.toLowerCase()); hearts(m.x,m.y+.8,m.z,2); return true; }
      if(m.tame&&it&&d.food.includes(s.id)&&!m.baby){ if(m.breedCd>0) toast('Parrot needs time before breeding again'); else { m.love=30; m.sit=false; toast('Parrot is ready to breed'); } use1(s); hearts(m.x,m.y+.8,m.z,3); return true; }
      if(m.tame&&!(it&&it.weapon)){ m.sit=!m.sit; toast(m.sit?'Sit':'Following you'); hearts(m.x,m.y+.8,m.z,1); return true; } }
    if(m.type==='wolf'&&near&&m.tame&&it&&d.food.includes(s.id)&&s.id!==I.BONE&&m.hp>=20&&!m.baby){
      if(m.breedCd>0) toast('Wolf needs time before breeding again'); else { m.love=30; m.sit=false; toast('Wolf is ready to breed'); } use1(s); hearts(m.x,m.y+.9,m.z,3); return true; }
    if(m.type==='wolf'&&near&&m.tame&&!(it&&(it.weapon||d.food.includes(s.id)))){ hearts(m.x,m.y+.9,m.z,1); } }
  return o.apply(this,arguments); });

/* --- drawing squid and parrots --- */
const rotK=(p,k,a)=>{ const c=Math.cos(a), s=Math.sin(a), d=(k[0]*p[0]+k[1]*p[1]+k[2]*p[2])*(1-c);
  return [p[0]*c+(k[1]*p[2]-k[2]*p[1])*s+k[0]*d, p[1]*c+(k[2]*p[0]-k[0]*p[2])*s+k[1]*d, p[2]*c+(k[0]*p[1]-k[1]*p[0])*s+k[2]*d]; };
function mobT(m,pitch,pc){ const s=m.baby?.55:1, cf=Math.cos(m.face), sf=Math.sin(m.face), cp=Math.cos(pitch), sp=Math.sin(pitch);
  return (lx,ly,lz)=>{ let y=ly-pc, z=lz; const y2=y*cp-z*sp, z2=y*sp+z*cp; y=y2+pc; z=z2; return [m.x+(lx*cf+z*sf)*s, m.y+y*s, m.z+(-lx*sf+z*cf)*s]; }; }
function emitSquid(vb,m){ const g=m.type==='glow_squid', hurt=m.hurtT>.18, C=c=>hurt?[255,c[1]*.45|0,c[2]*.45|0]:c;
  const T=mobT(m,m.pitch||0,.6), body=g?[34,128,136]:[38,58,108], tent=g?[44,150,150]:[50,74,128], belly=g?[60,170,170]:[64,90,150];
  if(g){ VL[4]=Math.max(VL[4],150); VL[5]=Math.max(VL[5],230); VL[6]=Math.max(VL[6],210); }
  emitBox(vb,[-.3,.38,-.3],[.3,1.1,.3],C(body),T); emitBox(vb,[-.26,.34,-.26],[.26,.4,.26],C(belly),T);
  const sv=VL.slice(); if(g) setVL(VL_EMISSIVE);
  for(const sx of [-1,1]) emitBox(vb,[sx*.31-.012,.5,.06],[sx*.31+.012,.6,.16],g?[150,255,240]:[230,230,235],T);
  for(const sx of [-1,1]) emitBox(vb,[sx*.312-.012,.52,.09],[sx*.312+.012,.58,.13],[16,16,20],T);
  if(g) for(const [x,y,z] of [[-.31,.85,-.1],[.31,.75,.12],[.1,1.02,.31],[-.12,.7,-.31],[0,1.11,0]]) emitBox(vb,[x-.04,y-.04,z-.04],[x+.04,y+.04,z+.04],[140,255,230],T);
  VL.set(sv);
  const a=.12+.5*(.5+.5*Math.sin(m.anim||0));
  for(let i=0;i<8;i++){ const th=i*Math.PI/4, k=[-Math.sin(th),0,Math.cos(th)], ax=Math.cos(th)*.2, az=Math.sin(th)*.2, ai=a*(i%2?.85:1);
    const TT=(x,y,z)=>{ const r=rotK([x,y,z],k,ai); return T(r[0]+ax,r[1]+.38,r[2]+az); }; emitBox(vb,[-.04,-.62,-.04],[.04,0,.04],C(tent),TT); } }
function emitParrot(vb,m){ const hurt=m.hurtT>.18, C=c=>hurt?[255,c[1]*.45|0,c[2]*.45|0]:c, col=m.col||PARROT_COLS[0], dk=col.map(v=>v*.7|0), lt=col.map(v=>Math.min(255,v*1.2+20|0));
  const sit=m.tame&&m.sit, fl=m.fly, T=mobT(m,fl?.35:0,.3);
  const flap=fl?.25+1.1*Math.abs(Math.sin(m.flap||0)):0;
  if(!fl){ emitBox(vb,[-.07,0,-.01],[-.04,.13,.02],[70,66,62],T); emitBox(vb,[.04,0,-.01],[.07,.13,.02],[70,66,62],T); }
  const y0=sit?-.06:0;
  emitBox(vb,[-.11,.12+y0,-.13],[.11,.42+y0,.1],C(col),T); emitBox(vb,[-.09,.42+y0,-.05],[.09,.6+y0,.12],C(col),T);
  emitBox(vb,[-.025,.58+y0,-.09],[.025,.68+y0,.04],C(lt),T);
  emitBox(vb,[-.03,.47+y0,.12],[.03,.58+y0,.19],[226,168,46],T); emitBox(vb,[-.022,.44+y0,.12],[.022,.49+y0,.16],[150,106,32],T);
  for(const sx of [-1,1]){ emitBox(vb,[sx*.091-.006,.52+y0,.05],[sx*.091+.006,.56+y0,.09],[245,245,240],T); emitBox(vb,[sx*.093-.006,.53+y0,.065],[sx*.093+.006,.55+y0,.085],[18,18,18],T); }
  for(const sx of [-1,1]){ const piv=[sx*.11,.4+y0,0], k=[0,0,1];
    const WT=(x,y,z)=>{ const r=rotK([x-piv[0],y-piv[1],z-piv[2]],k,sx*flap); return T(r[0]+piv[0],r[1]+piv[1],r[2]+piv[2]); };
    emitBox(vb,[sx>0?.11:-.14,.16+y0,-.11],[sx>0?.14:-.11,.4+y0,.08],C(dk),WT); }
  const TT=(x,y,z)=>{ const r=rotK([x,y-.14-y0,z+.12],[1,0,0],fl?-.2:.5); return T(r[0],r[1]+.14+y0,r[2]-.12); };
  emitBox(vb,[-.05,-.04,-.2],[.05,.04,0],C(dk),TT); }
W('emitMob',o=>function(vb,m){ if(m.type==='squid'||m.type==='glow_squid') return emitSquid(vb,m); if(m.type==='parrot') return emitParrot(vb,m); return o.apply(this,arguments); });

/* --- voices --- */
VOICE.squid=(o,t,k)=>{ nz(o,t,k==='hurt'?.25:.45,{type:'lowpass',f:k==='hurt'?900:500,f2:250,v:k==='idle'?.25:.45}); };
VOICE.glow_squid=(o,t,k)=>{ nz(o,t,.4,{type:'lowpass',f:700,f2:300,v:.3}); tn(o,t+.05,.25,{f:rr(900,1200),f2:rr(1300,1600),v:.06}); };
VOICE.parrot=(o,t,k)=>{ for(let i=0;i<(k==='hurt'?2:rint(2,4));i++) tn(o,t+i*.08,.06,{type:'square',f:k==='hurt'?2400:rr(1600,2800),f2:rr(1200,3200),v:.12,lp:4000}); };

/* --- caves: fog and the clear colour darken when the camera is out of the sky's reach, so cracks between faces don't show the bright sky --- */
let caveK=1;
window.__ink=()=>({n:INKS.length,blindT});
window.caveFogK=function(){ if(!world||world.preview||world.meta.dim) return 1;
  const p=cam.persp?cam.pos:[player.x,player.y+1.6,player.z], lv=skyAt(Math.floor(p[0]),Math.floor(p[1]),Math.floor(p[2]));
  const t=Math.max(0,Math.min(1,(lv-2)/7)); caveK+=(t-caveK)*.05; return caveK; };
}
