F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

BLK7=r'''
/* ---------- stage 7 blocks: lava & obsidian, flowing fluids, trapdoors, pressure plates, drawers, slime, elevators ---------- */
NB('OBSIDIAN'); def(B.OBSIDIAN,'Obsidian','#2b2140','#251b3a'); pat(B.OBSIDIAN,PT.STONE);
NB('LAVA'); def(B.LAVA,'Lava','#ff8a1e','#f06a18',0,{solid:false,opaque:false,emit:[15,10,4],att:2,lava:1,noItem:1});
const WF=[0], LF=[0];
for(let l=1;l<=7;l++){ const id=NB('WFLOW_'+l); WF[l]=id; def(id,'Flowing water','#3d86c8',0,0,{solid:false,opaque:false,att:1,wl:1,noItem:1,flow:1}); }
for(let l=1;l<=3;l++){ const id=NB('LFLOW_'+l); LF[l]=id; def(id,'Flowing lava','#ff8a1e',0,0,{solid:false,opaque:false,emit:[15,10,4],att:2,lava:1,noItem:1,flow:1}); }
const FL={}; FL[B.WATER]={k:'w',lv:0}; FL[B.LAVA]={k:'l',lv:0}; for(let l=1;l<=7;l++) FL[WF[l]]={k:'w',lv:l}; for(let l=1;l<=3;l++) FL[LF[l]]={k:'l',lv:l};
// trapdoors: id = base + top*8 + facing*2 + open
const TRAP_MATS=[...WOODS.map(w=>({k:w.k,name:w.name,col:'#'+BLOCKS[w.planks].top.map(v=>v.toString(16).padStart(2,'0')).join(''),wood:1})),{k:'iron',name:'Iron',col:'#cdc5ba',metal:1}];
for(const m of TRAP_MATS){ m.trap=_nid; for(const top of [0,1]) for(let fi=0;fi<4;fi++) for(const open of [0,1]){ const id=NB('TRAP_'+m.k+'_'+top+fi+open), f=FACE4[fi];
  def(id,m.name+' trapdoor',m.col,m.col,0,{opaque:false,lightOpaque:0,shape:1,decor:1,trap:{m,top,fi,f,open},drop:m.trap,boxes:[open?doorBox(f):top?[0,.8125,0,1,1,1]:[0,0,0,1,.1875,1]]}); pat(id,m.wood?PT.DOOR:PT.IRONDOOR); } }
// pressure plates: id = base + pressed
const PLATE_MATS=[{k:'wood',name:'Wooden',col:'#c59a5f',p:PT.PLANK},{k:'stone',name:'Stone',col:'#979ca2',p:PT.STONE},{k:'iron',name:'Iron',col:'#cdc5ba',p:PT.METAL}];
for(const m of PLATE_MATS){ m.plate=_nid; for(const pr of [0,1]){ const id=NB('PLATE_'+m.k+pr); def(id,m.name+' pressure plate',m.col,m.col,0,{solid:false,opaque:false,lightOpaque:0,shape:1,decor:1,plate:{m,pr},drop:m.plate,boxes:[[.06,0,.06,.94,pr?.03:.0625,.94]]}); pat(id,m.p); } }
// storage drawers (one item type, huge capacity): id = base + facing
const DRAWER_CAP=8192;
for(const w of WOODS){ const c=BLOCKS[w.planks]; w.drawer=_nid; for(let fi=0;fi<4;fi++){ const id=NB('DRAWER_'+w.k+fi); def(id,w.name+' storage drawer','#000',0,0,{drawer:{fi,f:FACE4[fi]},drop:w.drawer,decor:1}); BLOCKS[id].top=c.top; BLOCKS[id].side=sh3(c.side,.85); BLOCKS[id].bottom=c.side; pat(id,PT.PLANK); } }
// slime: eight colours of jelly, bouncy blocks, cushions and bounce pads
const SLIMES=['green','lime','red','blue','purple','pink','orange','cyan'].map(k=>({k,d:DYE_BY[k]}));
for(const sl of SLIMES){ const c=sl.d.dye, nm=sl.d.name;
  sl.block=NB('SLIME_'+sl.k); def(sl.block,nm+' slime block',c,c,0,{opaque:false,lightOpaque:0,glassy:215,tint:hex(c).map(v=>.55+v/255*.45),bounce:.85,slimeCol:hex(c)}); pat(sl.block,PT.GLASS);
  sl.cushion=NB('CUSHION_'+sl.k); def(sl.cushion,nm+' slime cushion',c,c,0,{opaque:false,lightOpaque:0,shape:1,decor:1,bounce:.7,seat:1,boxes:[[0,0,0,1,.45,1]],rboxes:[[0,0,0,1,.45,1],[.1,.45,.1,.9,.5,.9]]}); pat(sl.cushion,PT.WOOL);
  sl.pad=NB('PAD_'+sl.k); def(sl.pad,nm+' bounce pad',c,c,0,{opaque:false,lightOpaque:0,shape:1,decor:1,pad:1,boxes:[[0,0,0,1,.2,1]],rboxes:[[0,0,0,1,.1,1],[.1,.1,.1,.9,.2,.9]]}); pat(sl.pad,PT.METAL); }
// elevators: wool around a dusk orb, one per colour
for(const d of DYES){ d.elev=NB('ELEV_'+d.k); def(d.elev,d.name+' elevator',d.wool,sh3(hex(d.wool),.85).map(v=>v),0,{elevator:1,decor:1}); BLOCKS[d.elev].side=sh3(hex(d.wool),.85); pat(d.elev,PT.CHISEL); }
'''
rep("// furniture: tables and chairs for every wood","/*FURN*/\n// furniture: tables and chairs for every wood")
# append after furniture loop: find end marker = the closing of BLK (the line before '/*FURN*/' replaced). Insert BLK7 right before the stage-1 'const HOTBAR'
rep("const HOTBAR = [","%s\nconst HOTBAR = ["%BLK7)

ITEMS7=r'''
NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'}); NI('BUCKET_WATER','Water bucket',{stack:1,bucket:'w'}); NI('BUCKET_LAVA','Lava bucket',{stack:1,bucket:'l'});
NI('GLIDER','Hang glider',{stack:1,glider:1}); NI('DUSK_ORB','Dusk orb',{stack:16}); NI('DUSK_PEARL','Dusk pearl');
for(const sl of SLIMES){ sl.jelly=NI('JELLY_'+sl.k.toUpperCase(),sl.d.name+' slime jelly',{jelly:sl.d.dye}); }
for(const m of TRAP_MATS) for(let i=1;i<16;i++) delete ITEMS[m.trap+i];
for(const m of PLATE_MATS) delete ITEMS[m.plate+1];
for(const w of WOODS) for(let i=1;i<4;i++) delete ITEMS[w.drawer+i];
'''
rep("NI('POSTER','Poster',{stack:16,decorItem:1,decor:1});","NI('POSTER','Poster',{stack:16,decorItem:1,decor:1});\n"+ITEMS7)
RECIPES7=r'''
{ r_(I.BUCKET,1,['X.X','.X.'],{keys:{X:[I.IRON]},tier:2,cat:'items'});
  r_(I.GLIDER,1,['EEE','S.S'],{keys:{E:[I.LEATHER]},cat:'travel'});
  for(const m of TRAP_MATS) r_(m.trap,2,['XXX','XXX'],{keys:{X:m.wood?[WOODS.find(w=>w.k===m.k).planks]:[I.IRON]},tier:m.metal?2:0,cat:'decor'});
  r_(PLATE_MATS[0].plate,1,['XX'],{keys:{X:ALL_PLANKS},cat:'decor'}); r_(PLATE_MATS[1].plate,1,['XX'],{keys:{X:[B.STONE]},cat:'decor'}); r_(PLATE_MATS[2].plate,1,['XX'],{keys:{X:[I.IRON]},tier:2,cat:'decor'});
  for(const w of WOODS) r_(w.drawer,1,['PPP','.O.','PPP'],{keys:{P:[w.planks],O:[B.CHEST_WOOD]},cat:'storage'});
  for(const sl of SLIMES){ r_(sl.block,1,['JJJ','JJJ','JJJ'],{keys:{J:[sl.jelly]},cat:'decor'}); r_(sl.jelly,9,['X'],{keys:{X:[sl.block]},cat:'items'});
    r_(sl.cushion,2,['JJJ','WWW'],{keys:{J:[sl.jelly],W:DYES.map(d=>d.woolB)},cat:'decor'}); r_(sl.pad,2,['JJJ','XXX'],{keys:{J:[sl.jelly],X:[I.IRON]},tier:2,cat:'decor'}); }
  for(const d of DYES) r_(d.elev,1,['WWW','WOW','WWW'],{keys:{W:[d.woolB],O:[I.DUSK_ORB]},cat:'travel'});
  r_(B.OBSIDIAN,1,['X'],{keys:{X:[I.BUCKET_LAVA]},cat:'blocks',hidden:1}); RECIPES.pop(); }
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES7+"// every wood's logs make its own planks; material keys accept every variant")
rep("const ORE_NAME={2:'stone',","""spec(B.OBSIDIAN,14,'pick',8); for(const m of TRAP_MATS) for(let i=0;i<16;i++) spec(m.trap+i,m.wood?1.8:4,m.wood?'axe':'pick',m.wood?0:1);
for(const m of PLATE_MATS) for(let i=0;i<2;i++) spec(m.plate+i,1,m.k==='wood'?'axe':'pick',m.k==='wood'?0:1);
for(const w of WOODS) for(let i=0;i<4;i++) spec(w.drawer+i,2.4,'axe');
for(const sl of SLIMES){ spec([sl.block,sl.cushion,sl.pad],.3); } for(const d of DYES) spec(d.elev,.8);
const ORE_NAME={2:'stone',""")
rep("for(const w of WOODS){ FUEL[FENCE_OF[w.k]]=6;","for(const sl of SLIMES) FUEL[sl.jelly]=120; FUEL[I.BUCKET_LAVA]=1000;\nfor(const w of WOODS){ FUEL[FENCE_OF[w.k]]=6;")
rep("{a:[B.COBBLE],out:B.STONE,time:6,tier:1},","{a:[B.COBBLE],out:B.STONE,time:6,tier:1},{a:[I.BUCKET_LAVA],out:B.OBSIDIAN,time:20,tier:2},")

# ---------- mesher ----------
rep("""    if(bd.shape&&!bd.door){""","""    if(bd.drawer){ setVLcell(x,y,z); PAT=PT.PLANK; emitBox(vbO,[wx,y,wz],[wx+1,y+1,wz+1],bd.side,IDT); const [fx,fz]=F4V[bd.drawer.f], t=.06, P=(a0,b0,a1,b1,dn)=>{ const C=(a,b,d)=>fx?[wx+.5+fx*(.5+d),y+b,wz+a]:[wx+a,y+b,wz+.5+fz*(.5+d)]; const p0=C(a0,b0,0), p1=C(a1,b1,dn); return [[Math.min(p0[0],p1[0]),p0[1],Math.min(p0[2],p1[2])],[Math.max(p0[0],p1[0]),p1[1],Math.max(p0[2],p1[2])]]; };
      for(const q of [P(.06,.06,.94,.12,t),P(.06,.88,.94,.94,t),P(.06,.06,.12,.94,t),P(.88,.06,.94,.94,t)]) emitBox(vbO,q[0],q[1],bd.top,IDT); PAT=0; { const q=P(.44,.74,.56,.8,.08); emitBox(vbO,q[0],q[1],[60,52,40],IDT); } continue; }
    if(bd.elevator){ setVLcell(x,y,z); PAT=PT.WOOL; emitBox(vbO,[wx,y,wz],[wx+1,y+1,wz+1],bd.side,IDT); PAT=0; setVL(VL_EMISSIVE); emitBox(vbO,[wx+.35,y+1,wz+.35],[wx+.65,y+1.01,wz+.65],[170,90,230],IDT); continue; }
    if(bd.shape&&!bd.door){""")
rep("""    if(b===B.WATER||isGlass(b)){
      const water=b===B.WATER;""","""    if(FL[b]&&b!==B.WATER){ const f=FL[b], lava=f.k==='l', c=lava?[255,120,30]:bio?sh3(bio.water,1.1):[63,130,220], ht=lava?(f.lv?(4-f.lv)/4*.8:.86):(8-f.lv)/8*.86, falling=FL[at(x,y+1,z)]&&FL[at(x,y+1,z)].k===f.k, h2=falling?1:ht;
      PAT=lava?PT.COBBLE:PT.WATER; const vb=lava?vbO:vbW, alpha=lava?255:185;
      for(let fi=0;fi<6;fi++){ const F=FACES[fi], nx=x+F.n[0], ny=y+F.n[1], nz=z+F.n[2], nb=at(nx,ny,nz); if(ny<0) continue;
        if(F.a===1){ if(F.s===0) { if(nb!==B.AIR) continue; } else if(falling||FL[nb]&&FL[nb].k===f.k) continue; } else if(nb!==B.AIR&&!(nb>0&&BLOCKS[nb].replace&&!BLOCKS[nb].wl)&&!(FL[nb]&&FL[nb].k===f.k&&FL[nb].lv>f.lv)) continue;
        if(lava) setVL(VL_EMISSIVE); else setVLcell(nx,ny,nz,alpha); const lc=VL; for(let k=0;k<4;k++){CLF[k][0]=lc[0];CLF[k][1]=lc[1];CLF[k][2]=lc[2];CLF[k][3]=lc[4];CLF[k][4]=lc[5];CLF[k][5]=lc[6];}
        emitQuad(vb,F,x,y,z,x0,z0,lava?sh3(c,.85+.15*F.shade):c,[F.shade,F.shade,F.shade,F.shade],CLF,0,F.a!==1?h2:1,0,alpha,F.a===1&&F.s===1?h2-1:0); }
      continue; }
    if(b===B.WATER||isGlass(b)){
      const water=b===B.WATER;""")

CODE7=r'''
/* =====================================================================
   STAGE 7: fluids · buckets · activation sensors · drawers · glider · wolves · slimes · elevators
   ===================================================================== */
// ---------- flowing water and lava (sources stay put; flows spread from changes) ----------
const fluidQ=new Map(); let fluidT=0, lavaTurn=0;
function fluidNotify(x,y,z){ for(const [dx,dy,dz] of [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){ const b=world.get(x+dx,y+dy,z+dz); if(FL[b]) fluidQ.set((x+dx)+','+(y+dy)+','+(z+dz),[x+dx,y+dy,z+dz]); } }
const canFlow=b=>b===B.AIR||(b>0&&BLOCKS[b].replace&&!BLOCKS[b].wl&&!FL[b]);
function hiss(x,y,z){ for(let i=0;i<6;i++) parts.push({x:x+Math.random(),y:y+.9,z:z+Math.random(),vx:(Math.random()-.5)*.6,vy:1.4+Math.random(),vz:(Math.random()-.5)*.6,t:1.2,c:[210,210,215],s:.08,smoke:true}); }
function putFluid(x,y,z,k,lv){ const cur=world.get(x,y,z), cf=FL[cur];
  if(cf&&cf.k!==k){ if(k==='w') world.set(x,y,z,cf.lv===0?B.OBSIDIAN:B.COBBLE); else world.set(x,y,z,B.STONE); hiss(x,y,z); return; }
  if(cf&&cf.lv<=lv) return; if(!cf&&!canFlow(cur)) return;
  if(cur>0&&BLOCKS[cur].replace) for(const [id,n] of dropsFor(cur,null)) spawnDrop(x+.5,y+.5,z+.5,id,n);
  world.set(x,y,z,lv===0?(k==='w'?B.WATER:B.LAVA):(k==='w'?WF:LF)[lv]); }
function fluidUpdate(x,y,z){
  const b=world.get(x,y,z), f=FL[b]; if(!f) return; const max=f.k==='w'?7:3;
  if(f.k==='l') for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]]){ const n=FL[world.get(x+dx,y+dy,z+dz)]; if(n&&n.k==='w'){ world.set(x,y,z,f.lv===0?B.OBSIDIAN:B.COBBLE); hiss(x,y,z); return; } }
  if(f.lv>0){ const up=FL[world.get(x,y+1,z)]; let best=99; if(up&&up.k===f.k) best=0;
    for(const [dx,dz] of DIRS){ const n=FL[world.get(x+dx,y,z+dz)]; if(n&&n.k===f.k) best=Math.min(best,n.lv); }
    const want=best+1; if(want>max){ world.set(x,y,z,B.AIR); return; } if(want!==f.lv){ world.set(x,y,z,(f.k==='w'?WF:LF)[want]); return; } }
  const below=world.get(x,y-1,z), bf=FL[below];
  if(canFlow(below)||bf&&bf.k!==f.k){ putFluid(x,y-1,z,f.k,1); return; }
  if(bf&&bf.k===f.k) return;
  if(f.lv<max) for(const [dx,dz] of DIRS){ const nb=world.get(x+dx,y,z+dz), nf=FL[nb]; if(canFlow(nb)||nf&&(nf.k!==f.k||nf.lv>f.lv+1)) putFluid(x+dx,y,z+dz,f.k,f.lv+1); }
}
function stepFluids(dt){ fluidT-=dt; if(fluidT>0||!fluidQ.size) return; fluidT=.25; lavaTurn=(lavaTurn+1)%4;
  const batch=[...fluidQ.entries()].slice(0,400); for(const [k,p] of batch){ const f=FL[world.get(...p)]; if(f&&f.k==='l'&&lavaTurn) continue; fluidQ.delete(k); fluidUpdate(...p); } }
// lava hurts and sets you alight
function stepLava(dt){ const p=player, b0=world.get(Math.floor(p.x),Math.floor(p.y+.2),Math.floor(p.z)), b1=world.get(Math.floor(p.x),Math.floor(p.y+1.2),Math.floor(p.z));
  if(BLOCKS[b0]?.lava||BLOCKS[b1]?.lava){ p.fireT=5; p.lavaHit=(p.lavaHit||0)-dt; if(p.lavaHit<=0){ p.lavaHit=.5; hurt(4,'Burned in lava'); } p.vy=Math.max(p.vy,-1.5); }
  if(p.fireT>0){ p.fireT-=dt; if(p.inWater) p.fireT=0; p.fireHit=(p.fireHit||0)-dt; if(p.fireHit<=0){ p.fireHit=1; hurt(1,'Burned to death'); }
    if(Math.random()<dt*20) parts.push({x:p.x+(Math.random()-.5)*.5,y:p.y+Math.random()*1.7,z:p.z+(Math.random()-.5)*.5,vx:0,vy:1.6,vz:0,t:.45,c:[255,150,40],s:.07,ember:true}); }
  for(const m of mobs){ const b=world.get(Math.floor(m.x),Math.floor(m.y+.2),Math.floor(m.z)); if(BLOCKS[b]?.lava){ m.lavaT=(m.lavaT||0)-dt; if(m.lavaT<=0){ m.lavaT=.5; hitMob(m,4,m.x,m.z); } } } }
// buckets
function useBucket(sx,sy){ const s=held(), it=ITEMS[s.id];
  if(it.bucket==='empty'){ const [o,d]=camRay(sx,sy); for(let t=0;t<8;t+=.1){ const x=Math.floor(o[0]+d[0]*t), y=Math.floor(o[1]+d[1]*t), z=Math.floor(o[2]+d[2]*t), b=world.get(x,y,z);
      if(b===B.WATER||b===B.LAVA){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } world.set(x,y,z,B.AIR); const nid=b===B.WATER?I.BUCKET_WATER:I.BUCKET_LAVA;
        if(s.n<=1) inv.slots[inv.sel]={id:nid,n:1}; else { s.n--; if(addItem(nid,1)) spawnDrop(player.x,player.y+1,player.z,nid,1); } invChanged(); renderHotbar(); return true; }
      if(b>0&&BLOCKS[b].solid) break; }
    toast('Tap a water or lava source'); return true; }
  const r=pick(sx,sy); if(!r||!r.prev){ toast('Tap a block to pour it against'); return true; } const [x,y,z]=r.prev; if(!reachOK(x,y,z)) { toast('Too far away'); return true; }
  const cur=world.get(x,y,z); if(!(canFlow(cur)||FL[cur])){ return true; }
  putFluid(x,y,z,it.bucket,0); if(world.get(x,y,z)!==(it.bucket==='w'?B.WATER:B.LAVA)&&!FL[cur]) world.set(x,y,z,it.bucket==='w'?B.WATER:B.LAVA);
  if(!creative()) inv.slots[inv.sel]={id:I.BUCKET,n:1}; invChanged(); renderHotbar(); return true; }
// ---------- hidden activation sensors: pressure plates power doors, trapdoors and gates next to them ----------
// Sources are named so other mechanisms (remote activation later) can drive the same responders through setPower().
const activation={sources:new Map(), auto:new Set()};
function setPower(src,cells,on){ if(on) activation.sources.set(src,cells); else activation.sources.delete(src); }
const isResponder=b=>b>0&&(BLOCKS[b].door||BLOCKS[b].trap||BLOCKS[b].gate);
const isOpen=b=>BLOCKS[b].door?BLOCKS[b].door.open:BLOCKS[b].trap?BLOCKS[b].trap.open:BLOCKS[b].gate.open;
function setOpen(x,y,z,open){ const b=world.get(x,y,z); if(!isResponder(b)||isOpen(b)===!!open) return;
  if(BLOCKS[b].door) toggleDoor(x,y,z); else world.set(x,y,z,b+(open?1:-1)); }
const plates=new Map();
function stepSensors(dt){
  const occ=[[player.x,player.y,player.z]]; for(const m of mobs) if(Math.abs(m.x-player.x)<40&&Math.abs(m.z-player.z)<40) occ.push([m.x,m.y,m.z]);
  for(const [x,y,z] of occ){ const X=Math.floor(x), Y=Math.floor(y+.05), Z=Math.floor(z), b=world.get(X,Y,Z); if(b>0&&BLOCKS[b].plate){ const k=X+','+Y+','+Z; if(!BLOCKS[b].plate.pr) world.set(X,Y,Z,b+1); plates.set(k,{x:X,y:Y,z:Z,t:.5}); } }
  for(const [k,p] of plates){ p.t-=dt; const b=world.get(p.x,p.y,p.z); if(!(b>0&&BLOCKS[b].plate)){ plates.delete(k); setPower('plate:'+k,null,false); continue; }
    if(p.t<=0){ if(BLOCKS[b].plate.pr) world.set(p.x,p.y,p.z,b-1); plates.delete(k); setPower('plate:'+k,null,false); continue; }
    const cells=[]; for(let dy=-1;dy<=2;dy++)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++) cells.push([p.x+dx,p.y+dy,p.z+dz]); setPower('plate:'+k,cells,true); }
  const want=new Set(); for(const cells of activation.sources.values()) for(const c of cells){ if(isResponder(world.get(...c))) want.add(c+''); }
  for(const k of want){ const c=k.split(',').map(Number); if(!activation.auto.has(k)&&!isOpen(world.get(...c))){ setOpen(...c,true); activation.auto.add(k); } }
  for(const k of [...activation.auto]) if(!want.has(k)){ const c=k.split(',').map(Number); setOpen(...c,false); activation.auto.delete(k); }
}
// ---------- storage drawers ----------
function drawerTile(x,y,z){ const k=tileKey(x,y,z); let t=world.tiles.get(k); if(!t){ t={kind:'drawer',x,y,z,s:[],id:0,n:0}; world.tiles.set(k,t); } return t; }
function tapDrawer(x,y,z){ const t=drawerTile(x,y,z), s=held();
  if(s&&!player.crouch&&(!t.id||t.id===s.id)&&ITEMS[s.id].stack>1){ const k=Math.min(s.n,DRAWER_CAP-t.n); if(k<=0){ toast('Drawer full'); return; } t.id=s.id; t.n+=k; s.n-=k; if(!s.n) inv.slots[inv.sel]=null;
    for(let i=0;i<36&&t.n<DRAWER_CAP;i++){ const o=inv.slots[i]; if(o&&o.id===t.id){ const q=Math.min(o.n,DRAWER_CAP-t.n); t.n+=q; o.n-=q; if(!o.n) inv.slots[i]=null; } }
    invChanged(); renderHotbar(); toast(`${ITEMS[t.id].name}: ${t.n}`); world.changed=true; return; }
  if(!t.id){ toast('Empty drawer. Tap with a stack to fill it'); return; }
  const k=Math.min(t.n,player.crouch?1:ITEMS[t.id].stack), left=addItem(t.id,k); t.n-=k-left; if(!t.n) t.id=0; invChanged(); toast(t.id?`${ITEMS[t.id].name}: ${t.n} left`:'Drawer emptied'); world.changed=true; }
function spillDrawer(x,y,z){ const t=world.tiles.get(tileKey(x,y,z)); if(!t) return; let n=t.n; while(n>0){ const k=Math.min(n,ITEMS[t.id]?.stack||999); spawnDrop(x+.5,y+.5,z+.5,t.id,k); n-=k; } world.tiles.delete(tileKey(x,y,z)); }
// ---------- elevators: jump to go up, crouch to go down, to the next elevator in the same column ----------
function elevatorUse(dir){ const p=player, X=Math.floor(p.x), Z=Math.floor(p.z), Y=Math.floor(p.y-.05); if(!BLOCKS[world.get(X,Y,Z)]?.elevator) return false;
  for(let y=Y+dir;y>0&&y<world.H-2;y+=dir){ if(BLOCKS[world.get(X,y,Z)]?.elevator&&!world.solid(X,y+1,Z)&&!world.solid(X,y+2,Z)){ p.y=y+1; p.vy=0; p.fallTop=p.y; burst(p.x,p.y+.5,p.z,[170,90,230],14,2); return true; } }
  return false; }
// ---------- hang glider ----------
function stepGlider(dt){ const p=player, s=held(); const can=s&&ITEMS[s.id].glider&&!p.onGround&&!p.inWater&&!p.climbing&&!p.mount&&!p.crouch;
  if(can&&p.vy<-3) p.gliding=true; if(!can) p.gliding=false;
  if(p.gliding){ const f=input.mag>.1?Math.atan2(input.mx,input.mz):p.face; p.face=angLerp(p.face,f,1-Math.exp(-3*dt)); const sp=8.5;
    p.vx=lerp(p.vx,Math.sin(p.face)*sp,1-Math.exp(-2*dt)); p.vz=lerp(p.vz,Math.cos(p.face)*sp,1-Math.exp(-2*dt)); p.vy=Math.max(p.vy,-1.7); p.fallTop=p.y; } }
'''
rep("/* ---------- stage 6: decor entities ---------- */",CODE7+"\n/* ---------- stage 6: decor entities ---------- */")
# hooks into the world and the frame loop
rep("    this.changed=true; return true;\n  }","    this.changed=true; if(!this.preview&&typeof fluidNotify==='function') fluidNotify(x,y,z); return true;\n  }")
rep("world.time+=dt; stepTiles(dt); stepAmbient(dt); stepMaps(dt);","world.time+=dt; stepTiles(dt); stepAmbient(dt); stepMaps(dt); if(mode==='play'&&game()){ stepFluids(dt); stepSensors(dt); stepLava(dt); }")
# elevators (jump/crouch) and glider in player physics
rep("  if(input.jumpEdge){p.jumpBuf=.12;}\n  if(input.crouchToggle){ input.crouchToggle=false;",
    "  if(input.jumpEdge&&p.onGround&&elevatorUse(1)){ input.jumpEdge=false; }\n  if(input.jumpEdge){p.jumpBuf=.12;}\n  if(input.crouchToggle&&p.onGround&&!p.crouch&&elevatorUse(-1)){ input.crouchToggle=false; }\n  stepGlider(dt);\n  if(input.crouchToggle){ input.crouchToggle=false;")
rep("  else if(p.dashT<=0) p.vy-=25*dt;\n  p.vy=Math.max(p.vy,-40);","  else if(p.dashT<=0) p.vy-=(p.gliding?6:25)*dt;\n  p.vy=Math.max(p.vy,p.gliding?-1.7:-40);")
# bouncy slime: no fall damage, bounce back up; bounce pads launch you
rep("    if(!wasGround&&!p.inWater){ const fall=p.fallTop-p.y; if(fall>3.4) hurt(Math.floor(fall-3),'You fell too far');",
    "    const under=world.get(Math.floor(p.x),Math.floor(p.y-.05),Math.floor(p.z)), ub=under>0&&BLOCKS[under];\n    if(ub&&ub.pad&&!p.crouch){ p.vy=17; p.onGround=false; p.fallTop=p.y; burst(p.x,p.y,p.z,ub.top,8,2); }\n    else if(ub&&ub.bounce&&!wasGround&&!p.crouch&&p.vyLand<-4){ p.vy=-p.vyLand*ub.bounce; p.onGround=false; p.fallTop=p.y; }\n    if(!wasGround&&!p.inWater&&!(ub&&(ub.bounce||ub.pad))){ const fall=p.fallTop-p.y; if(fall>3.4) hurt(Math.floor(fall-3),'You fell too far');")
rep("  const wasGround=p.onGround; p.onGround=false;\n  moveAxis(1,p.vy*dt);","  const wasGround=p.onGround; p.onGround=false; p.vyLand=p.vy;\n  moveAxis(1,p.vy*dt);")
# taps: drawers, trapdoors, cushions; buckets
rep("  if(b>0&&(BLOCKS[b].door||BLOCKS[b].gate||BLOCKS[b].chair)){","  if(b>0&&BLOCKS[b].drawer){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } tapDrawer(x,y,z); return true; }\n  if(b>0&&BLOCKS[b].trap){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } world.set(x,y,z,b+(BLOCKS[b].trap.open?-1:1)); return true; }\n  if(b>0&&BLOCKS[b].seat&&!buildMode){ mount({kind:'seat',x:x+.5,y:y+.8,z:z+.5,yaw:player.face,cell:[x,y,z]}); return true; }\n  if(b>0&&(BLOCKS[b].door||BLOCKS[b].gate||BLOCKS[b].chair)){")
rep("  if(it.decorItem) return useDecor(sx,sy);","  if(it.decorItem) return useDecor(sx,sy);\n  if(it.bucket) return useBucket(sx,sy);")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||it.bucket||")
# placement orientation for drawers and trapdoors
rep("  if(bd&&bd.gate){ const f=face4();","  if(bd&&bd.drawer){ const f=face4(); return bd.drop+FACE4.indexOf({n:'s',s:'n',e:'w',w:'e'}[f]); }\n  if(bd&&bd.trap){ const f=face4(), top=(y<hy||y===hy&&false)?1:0; return bd.trap.m.trap+top*8+FACE4.indexOf(f)*2; }\n  if(bd&&bd.gate){ const f=face4();")
rep("  if(BLOCKS[b].door){ const oy=BLOCKS[b].door.top?y-1:y+1,","  if(BLOCKS[b].drawer) spillDrawer(x,y,z);\n  if(BLOCKS[b].door){ const oy=BLOCKS[b].door.top?y-1:y+1,")
# drawer save: tiles with kind drawer carry id/n; s:[] so packS map works
rep("tiles:[...world.tiles.values()].map(t=>({kind:t.kind,","tiles:[...world.tiles.values()].map(t=>({id:t.id,n:t.n,kind:t.kind,")
rep("const INTERACTIVE=b=>!!TABLE_TIER[b]||","const INTERACTIVE=b=>(b>0&&!!BLOCKS[b].drawer)||!!TABLE_TIER[b]||")
open(F,'w').write(s); print('ok')
