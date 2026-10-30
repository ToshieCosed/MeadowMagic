F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep("  for(const t of world.tiles.values()){\n    if(t.kind==='chest') continue;","  for(const t of world.tiles.values()){\n    if(t.kind!=='furnace') continue;")
# ---------- wolves and slimes ----------
rep("  sheep:{hp:8,","""  wolf:{hp:10,speed:2.4,w:.6,h:.85,food:[I.BONE,I.BEEF,I.PORK,I.CHICKEN,I.CBEEF,I.CPORK,I.CCHICKEN,I.FLESH],drops:()=>[[I.BONE,rint(0,1)]],name:'Wolf'},
  slime:{hp:4,speed:2.2,w:1,h:1,food:[],hostile:1,slime:1,drops:m=>m.size===1?[[SLIMES[m.col||0].jelly,rint(0,2)]]:[],name:'Slime'},
  sheep:{hp:8,""")
rep("function mobBox(m){ const s=m.baby?.55:1, d=MOB[m.type];","function mobBox(m){ const s=m.size?m.size*.5:m.baby?.55:1, d=MOB[m.type];")
rep("  const s=m.baby?.55:1, cf=Math.cos(m.face), sf=Math.sin(m.face), hurt=m.hurtT>.18;","  const s=m.size?m.size*.5:m.baby?.55:1, cf=Math.cos(m.face), sf=Math.sin(m.face), hurt=m.hurtT>.18;")
rep("const types=['cow','cow','pig','pig','chicken','chicken','horse','sheep','sheep','sheep'],","const types=['cow','cow','pig','pig','chicken','chicken','horse','sheep','sheep','sheep','wolf'],")
rep("    spawnMob(Math.random()<.55?'zombie':'skeleton',x+.5,y+1,z+.5,false); return; }",
"""    const ch=world.chunk(x>>4,z>>4), swamp=ch&&ch.bio&&BIO[ch.bio[(z&15)*CS+(x&15)]].k==='swamp', r=Math.random();
    if(r<(swamp?.6:.2)) { spawnMob('slime',x+.5,y+1,z+.5,false); const m=mobs[mobs.length-1]; m.size=[1,2,3][Math.random()*3|0]; m.col=Math.random()*SLIMES.length|0; m.hp=m.size*m.size*2; }
    else spawnMob(Math.random()<.55?'zombie':'skeleton',x+.5,y+1,z+.5,false); return; }""")
# hostile/slime/wolf brains
rep("  if(m.type==='zombie'){\n    if(dist<1.25&&dy<1.6&&m.atkT<=0){",
"""  if(m.type==='slime'){ const r=.35+m.size*.3;
    if(dist<r+.35&&dy<m.size*.5+.8&&m.atkT<=0){ m.atkT=1; hurt(m.size,'Squished by a slime'); const l=dist||1; p.vx+=(p.x-m.x)/l*4; p.vz+=(p.z-m.z)/l*4; }
    return [p.x-m.x,p.z-m.z,m.onGround?0:d.speed*(1+m.size*.15)]; }
  if(m.type==='zombie'){
    if(dist<1.25&&dy<1.6&&m.atkT<=0){""")
rep("  const target=surv()&&(dist<(m.aggro>0?32:18));","  const target=surv()&&(dist<(m.aggro>0?32:18));\n  if(m.type==='slime'&&m.onGround){ m.hopT=(m.hopT||0)-dt; if(m.hopT<=0&&(target||Math.random()<.02)){ m.hopT=.9+Math.random()*.6; m.vy=5+m.size; m.onGround=false; } }")
# slimes don't burn in daylight
rep("  if(dayInfo().day&&dayInfo().k>.6&&L[0]>200){","  if(m.type!=='slime'&&dayInfo().day&&dayInfo().k>.6&&L[0]>200){")
# slimes split when they die; wolves remember who hit what
rep("  if(m.hp<=0){ m.dead=true; if(player.mount===m) dismount();","  if(m.hp<=0){ m.dead=true; if(player.mount===m) dismount();\n    if(m.type==='slime'&&m.size>1) for(let k=0;k<2+(Math.random()*2|0);k++){ spawnMob('slime',m.x+(Math.random()-.5),m.y+.2,m.z+(Math.random()-.5),false); const c=mobs[mobs.length-1]; c.size=m.size-1; c.col=m.col; c.hp=c.size*c.size*2; c.aggro=10; }")
rep("    const hv=d.hostile?stepHostile(m,d,dt,dist):null;","    const hv=d.hostile?stepHostile(m,d,dt,dist):m.type==='wolf'?stepWolf(m,d,dt,dist):null;")
rep("function stepMobSpawning(dt){","""function stepWolf(m,d,dt,dist){ const p=player; m.atkT=Math.max(0,(m.atkT||0)-dt);
  if(!m.tame){ if(m.aggro>0){ m.aggro-=dt; if(dist<1.2&&m.atkT<=0){ m.atkT=1; hurt(2,'Bitten by a wolf'); } return [p.x-m.x,p.z-m.z,d.speed*1.3]; } return null; }
  if(m.sit) return [0,0,0];
  if(dist>26){ m.x=p.x+(Math.random()-.5)*2; m.z=p.z+(Math.random()-.5)*2; m.y=p.y+.2; m.vy=0; return [0,0,0]; }
  let tg=m.target&&!m.target.dead&&Math.hypot(m.target.x-p.x,m.target.z-p.z)<20?m.target:null;
  if(!tg){ let bd=11; for(const o of mobs) if(MOB[o.type].hostile&&!o.dead){ const q=Math.hypot(o.x-p.x,o.z-p.z); if(q<bd){ bd=q; tg=o; } } m.target=tg; }
  if(tg){ const q=Math.hypot(tg.x-m.x,tg.z-m.z); if(q<1.3&&m.atkT<=0){ m.atkT=.8; hitMob(tg,4,m.x,m.z); tg.aggro=0; } return q>1?[tg.x-m.x,tg.z-m.z,d.speed*1.4]:[0,0,0]; }
  return dist>3.2?[p.x-m.x,p.z-m.z,d.speed*(dist>8?1.6:1)]:[0,0,0]; }
function stepMobSpawning(dt){""")
# player hits make wolves join in; hitting a wild wolf angers it
rep("  player.atkCd=w.cd; player.swingT=.25; player.face=Math.atan2(m.x-player.x,m.z-player.z);","  player.atkCd=w.cd; player.swingT=.25; player.face=Math.atan2(m.x-player.x,m.z-player.z);\n  for(const o of mobs) if(o.type==='wolf'&&o.tame&&o!==m) o.target=m; if(m.type==='wolf'&&!m.tame) m.aggro=20;")
# taming & sitting
rep("  if(m.type==='sheep'&&near&&!m.baby&&it){","""  if(m.type==='wolf'&&near){
    if(!m.tame&&it&&s.id===I.BONE){ if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } if(Math.random()<.4||creative()){ m.tame=true; m.hp=20; toast('Tamed! Tap it to make it sit or follow'); burst(m.x,m.y+1,m.z,[240,120,150],12,2); } else { toast('The wolf is not sure yet…'); burst(m.x,m.y+1,m.z,[120,120,120],5,1.5); } return true; }
    if(m.tame&&it&&d.food.includes(s.id)&&s.id!==I.BONE&&m.hp<20){ m.hp=Math.min(20,m.hp+6); s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); burst(m.x,m.y+1,m.z,[240,120,150],6,1.5); return true; }
    if(m.tame&&!(it&&it.weapon)){ m.sit=!m.sit; toast(m.sit?'Sit':'Following you'); return true; } }
  if(m.type==='sheep'&&near&&!m.baby&&it){""")
# models
rep("  else if(m.type==='sheep'){","""  else if(m.type==='wolf'){ const g=[178,174,168], dk=[120,116,110], sit=m.sit?.35:0;
    legs([-.12,.12],[-.3,.3],.38,.05,g); box([-.17,.38-sit*.3,-.38],[.17,.66,.32],g); box([-.2,.46,.1],[.2,.76,.34],g); box([-.13,.52,.32],[.13,.8,.56],g); box([-.06,.52,.56],[.06,.64,.68],dk);
    box([-.12,.8,.36],[-.04,.9,.44],dk); box([.04,.8,.36],[.12,.9,.44],dk); box([-.09,.68,.555],[-.04,.72,.565],MC.black); box([.04,.68,.555],[.09,.72,.565],MC.black);
    box([-.04,.5-sit*.3,-.62],[.04,.58,-.38],g,T(.58,-.38,m.tame?.6:-.2)); if(m.tame) box([-.205,.62,.18],[.205,.68,.3],[200,40,40]); }
  else if(m.type==='slime'){ const c=hex(SLIMES[m.col||0].d.dye), sq=m.onGround?.06:-.04;
    box([-.5,0,-.5],[.5,.95+sq,.5],c); box([-.3,.15,-.3],[.3,.65,.3],sh3(c,.6)); box([-.3,.55,.5],[-.12,.72,.52],MC.black); box([.12,.55,.5],[.3,.72,.52],MC.black); box([-.08,.3,.5],[.08,.36,.52],MC.black); }
  else if(m.type==='sheep'){""")
# drawer fronts show their item; glider wing over the player
rep("let SUNV=[1,1,1];","""let SUNV=[1,1,1];
function drawerQuads(){ const out=[]; for(const t of world.tiles.values()){ if(t.kind!=='drawer'||!t.id||Math.hypot(t.x-player.x,t.z-player.z)>40) continue; const b=world.get(t.x,t.y,t.z); if(!(b>0&&BLOCKS[b].drawer)) continue;
    const [fx,fz]=F4V[BLOCKS[b].drawer.f], n=[fx,0,fz]; out.push({kind:'icon',id:t.id,c:[t.x+.5+fx*.53,t.y+.48,t.z+.5+fz*.53],n,u:[-fz,0,fx],v:[0,1,0],w:.62,h:.62,cell:[t.x+fx,t.y,t.z+fz]}); } return out; }""")
rep("  if(!world.decor||!world.decor.length) return; let used=false;\n  for(const e of world.decor){","  const list=[...(world.decor||[]),...drawerQuads()]; if(!list.length) return; let used=false;\n  for(const e of list){")
rep("    if(e.mode) return null; const k='icon'+e.item.id;","    if(e.mode) return null; const k='icon'+e.item.id;")
rep("function texFor(e){ // the picture for a decor entity, or null","function texFor(e){ // the picture for a decor entity, or null\n  if(e.kind==='icon'){ const k='icon'+e.id; if(!texCache.has(k)) texCache.set(k,glTex(itemIconCanvas(e.id),true)); return texCache.get(k); }")
rep("    const ins=e.kind==='frame'&&!e.mode?","    const ins=e.kind==='icon'?0:e.kind==='frame'&&!e.mode?")
rep("  // head, hair, eyes\n  EB(","  if(p.gliding){ const W=[200,60,60]; emitBox(dynVB,[-1.3,2.15,-.5],[1.3,2.22,.45],W,T0); emitBox(dynVB,[-.04,1.7,-.05],[.04,2.15,.05],[90,60,40],T0); emitBox(dynVB,[-.6,1.6,.1],[.6,1.66,.16],[90,60,40],T0); }\n  // head, hair, eyes\n  EB(")
# glider pose: arms up
rep("  if(bowDraw) armA=-1.55;","  if(bowDraw) armA=-1.55; if(p.gliding) armA=-2.9;")
# lava pools in the new generator (surface pools in hot/dry biomes, pockets near bedrock)
rep("    // waterfalls: a spring in a cliff face spills down the drop into a pool","""    for(let v=0;v<2;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=2+(orng()*6|0); for(let k=0;k<7;k++){ if(x>=0&&z>=0&&x<CS&&z<CS){ const i=idx(x,y,z); if(b[i]===B.STONE&&y<H) b[i]=B.LAVA; } const r=orng()*4|0; if(r===0)x++; else if(r===1)x--; else if(r===2)z++; else z--; } }
    { const bi=bm[(8+M)*E+8+M], k=BIO[bi].k, h=hm[(8+M)*E+8+M]; if((k==='desert'||k==='badlands'||k==='mountains'||k==='gravelly_mountains')&&hash2(ch.cx,ch.cz,seed+66)<.08&&h>SEA+1){
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){ const lx=8+dx, lz=8+dz, hh=hm[(lz+M)*E+lx+M]; if(Math.abs(hh-h)>1) continue; const edge=dx*dx+dz*dz>3; set(lx,h,lz,edge?B.STONE:B.LAVA); set(lx,h-1,lz,B.STONE); if(!edge) for(let y=h+1;y<h+4;y++) set(lx,y,lz,B.AIR); } } }
    // waterfalls: a spring in a cliff face spills down the drop into a pool""")
# icons for new items
rep("    if(id===I.CANVAS){ frm('#8a5a34','#f4efe2'); return c; }","""    if(id===I.CANVAS){ frm('#8a5a34','#f4efe2'); return c; }
    if(it.bucket){ g.fillStyle='#b9b4ac'; g.beginPath(); g.moveTo(12,18); g.lineTo(48,18); g.lineTo(42,52); g.lineTo(18,52); g.closePath(); g.fill(); g.fillStyle=it.bucket==='w'?'#3d86c8':it.bucket==='l'?'#ff7a1a':'#6d6a66'; g.beginPath(); g.ellipse(30,19,17,5,0,0,7); g.fill(); g.strokeStyle='#888'; g.lineWidth=3; g.beginPath(); g.arc(30,18,18,Math.PI,0); g.stroke(); return c; }
    if(it.glider){ g.fillStyle='#c83c3c'; g.beginPath(); g.moveTo(4,26); g.lineTo(30,12); g.lineTo(56,26); g.lineTo(30,22); g.closePath(); g.fill(); g.strokeStyle='#5a3c28'; g.lineWidth=3; g.beginPath(); g.moveTo(30,20); g.lineTo(30,48); g.moveTo(18,44); g.lineTo(42,44); g.stroke(); return c; }
    if(it.jelly){ g.fillStyle=it.jelly; g.globalAlpha=.85; g.beginPath(); g.ellipse(30,34,18,14,0,0,7); g.fill(); g.globalAlpha=1; g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(20,26,6,4); return c; }
    if(id===I.DUSK_ORB||id===I.DUSK_PEARL){ const gr=g.createRadialGradient(26,26,2,30,30,20); gr.addColorStop(0,id===I.DUSK_ORB?'#f3d6ff':'#e7e0ff'); gr.addColorStop(1,id===I.DUSK_ORB?'#7a2fc0':'#3c2a78'); g.fillStyle=gr; g.beginPath(); g.arc(30,30,18,0,7); g.fill(); return c; }""")
rep("  if(it&&(it.dye||it.nugget||id===I.BONE||id===I.FLESH||id===I.SILVER||it.decorItem||id===I.PAPER)){","  if(it&&(it.dye||it.nugget||id===I.BONE||id===I.FLESH||id===I.SILVER||it.decorItem||id===I.PAPER||it.bucket||it.glider||it.jelly||id===I.DUSK_ORB||id===I.DUSK_PEARL)){")
rep("mobs:mobs.filter(m=>!MOB[m.type].hostile).map(m=>({type:m.type,x:m.x,y:m.y,z:m.z,hp:m.hp,baby:m.baby,grow:m.grow,saddled:m.saddled,face:m.face,wool:m.wool,sheared:m.sheared})),",
    "mobs:mobs.filter(m=>!MOB[m.type].hostile).map(m=>({type:m.type,x:m.x,y:m.y,z:m.z,hp:m.hp,baby:m.baby,grow:m.grow,saddled:m.saddled,face:m.face,wool:m.wool,sheared:m.sheared,tame:m.tame,sit:m.sit})),")
open(F,'w').write(s); print('ok')
