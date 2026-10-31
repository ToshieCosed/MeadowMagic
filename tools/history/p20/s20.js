
/* =====================================================================
   STAGE 20: capacitor multiblocks · solar panels · coal generator · item distributors (pipes) · hoppers · droppers
   · item filters · backpack and chest upgrades (stack, filter, void) · backpacks placed on the ground
   ===================================================================== */
{ const W=(name,fn)=>{ const o=window[name]; if(typeof o!=='function') throw new Error('no '+name); window[name]=fn(o); };
const X=T19, {tN,tAt,DIR6,OPP,HDIRS,TD,TT,techList,newTech,anySig,ico,TK,fmt}=X;
const ROMAN=['I','II','III','IV','V','VI','VII','VIII'];
const use1=s=>{ if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; } invChanged(); };

/* ---------- items ---------- */
const pix=(k,name,o,fn)=>{ const id=NI(k,name,o); ispr(id,fn); return id; };
pix('MIRROR','Mirror',{},(P)=>{ for(let y=3;y<13;y++) for(let x=3;x<13;x++) P(x,y,x===3||y===3||x===12||y===12?[150,150,160]:(x+y)%5===0?[240,250,255]:[180,210,230]); });
const CELLS=[]; for(let i=0;i<4;i++){ const c=[[60,90,160],[70,110,190],[80,70,170],[40,150,170]][i]; CELLS.push(pix('PV'+(i+1),'Photovoltaic cell '+ROMAN[i],{},(P)=>{ for(let y=2;y<14;y++) for(let x=2;x<14;x++) P(x,y,(x-2)%4===3||(y-2)%4===3?[200,200,210]:c); for(let k=0;k<=i;k++) P(13-k*2,1,[240,200,80]); })); }
pix('FILTER','Item filter',{stack:1,filter:1},(P)=>{ for(let y=2;y<14;y++) for(let x=3;x<13;x++) P(x,y,(x+y)%2?[200,200,190]:[170,170,160]); for(let x=3;x<13;x++){ P(x,2,[120,90,60]); P(x,13,[120,90,60]); } for(const [x,y] of [[6,6],[9,6],[7,9],[8,9]]) P(x,y,[60,160,220]); });
const UPS=[];
const upIcon=(c,mark)=>(P)=>{ for(let y=2;y<14;y++) for(let x=2;x<14;x++) P(x,y,x===2||y===2||x===13||y===13?[70,70,80]:c); mark(P); };
pix('UP_STACK1','Stack upgrade I',{upgrade:'stack',mul:2},upIcon([150,150,160],P=>{ for(let x=5;x<11;x++){ P(x,6,[255,255,255]); P(x,9,[255,255,255]); } }));
pix('UP_STACK2','Stack upgrade II',{upgrade:'stack',mul:4},upIcon([230,190,60],P=>{ for(let x=5;x<11;x++){ P(x,5,[255,255,255]); P(x,8,[255,255,255]); P(x,11,[255,255,255]); } }));
pix('UP_STACK3','Stack upgrade III',{upgrade:'stack',mul:8},upIcon([90,220,220],P=>{ for(let x=5;x<11;x++) for(const y of [4,6,8,10]) P(x,y,[255,255,255]); }));
pix('UP_FILTER','Filter upgrade',{upgrade:'filter',filter:1},upIcon([80,140,200],P=>{ for(let y=5;y<11;y++) P(8,y,[255,255,255]); for(let x=5;x<12;x++) P(x,5,[255,255,255]); }));
pix('UP_VOID','Void upgrade',{upgrade:'void',filter:1},upIcon([40,30,60],P=>{ for(let a=0;a<6.3;a+=.3) P(8+Math.cos(a)*3,8+Math.sin(a)*3,[180,100,255]); P(8,8,[0,0,0]); }));
const STACK_UPS=[I.UP_STACK1,I.UP_STACK2,I.UP_STACK3];
const TECH_IDS20=[I.MIRROR,...CELLS,I.FILTER,...STACK_UPS,I.UP_FILTER,I.UP_VOID];

/* ---------- types ---------- */
const SOLAR=[[1,1000,8],[3,4000,24],[8,16000,64],[20,48000,160],[50,128000,400],[120,320000,960],[280,800000,2240],[640,2000000,5120]];
Object.assign(TT,{capbank:Object.assign(TT.capbank,{cb:1}),capbank2:{cap:250000,rate:500,io:'both',capm:1,cb:1,slots:['charge'],ui:1},capbank3:{cap:1000000,rate:2000,io:'both',capm:1,cb:1,slots:['charge'],ui:1},
  cgen:{cap:20000,rate:40,io:'out',slots:['fuel','charge'],ui:1},pipe:{ui:1,slots:['up','flt','flt','flt','flt','flt','flt']},
  hopper:{ui:1,slots:['s','s','s','s','s','flt']},dropper:{ui:1,slots:['s','s','s','s','s','s','s','s','s','flt'],sigIn:1},bpack:{}});
SOLAR.forEach(([g,c,r],i)=>TT['solar'+(i+1)]={cap:c,rate:r,io:'out',solar:i+1,gen:g,ui:1});

/* ---------- recipes: the solar grind runs through mirrors, four photovoltaic cells and every metal's plates ---------- */
const MI=TECH.MI, CU=MI.copper.wire, PL=ALL_PLANKS, RC=(out,n,pat,keys,o)=>r_(out,n,pat,Object.assign({keys,cat:'tech'},o||{}));
RC(I.MIRROR,2,['GGG','.X.'],{G:[B.GLASS],X:[MI.silver.plate,MI.aluminium.plate,MI.tin.plate]});
RC(CELLS[0],2,['mmm','wDw','ttt'],{m:[I.MIRROR],w:[CU[0]],D:[I.SI_DISC],t:[MI.tin.plate]});
RC(CELLS[1],1,['bcb','wDw','bcb'],{b:[MI.bronze.plate],c:[CELLS[0]],w:[CU[1]],D:[I.SI_DISC]},{tier:4});
RC(CELLS[2],1,['gcg','KXK','gcg'],{g:[MI.gold.plate],c:[CELLS[1]],K:[I.COIL],X:[I.CHIP_BASIC]},{tier:6});
RC(CELLS[3],1,['scs','XKX','scs'],{s:[MI.steel.plate],c:[CELLS[2]],X:[I.CHIP_ADV],K:[I.COIL_HEAVY]},{tier:8});
const SB=TECHB; RC(SB.solar1,1,['mmm','wtw','TTT'],{m:[I.MIRROR],w:[CU[0]],t:[MI.tin.plate],T:[B.STONE,B.COBBLE]});
const TIERUP=[[MI.bronze.plate,CELLS[0],CU[1],4],[MI.aluminium.plate,CELLS[0],I.COIL,5],[MI.gold.plate,CELLS[1],I.COIL,6],[MI.iron.plate,CELLS[1],I.CHIP_BASIC,7],
  [MI.steel.plate,CELLS[2],I.COIL_HEAVY,8],[MI.titanium.plate,CELLS[2],I.CHIP_ADV,9],[MI.platinum.plate,CELLS[3],I.CHIP_ADV,10]];
TIERUP.forEach(([plate,cell,core,tier],i)=>RC(SB['solar'+(i+2)],1,['XpX','cWc','XpX'],{X:[plate],p:[SB['solar'+(i+1)]],c:[cell],W:[core]},{tier}));
RC(SB.capbank2,1,['gbg','bXb','gbg'],{g:[I.GOLD],b:[SB.capbank],X:[I.CHIP_BASIC]},{tier:6});
RC(SB.capbank3,1,['tbt','bXb','tbt'],{t:[I.TITANIUM],b:[SB.capbank2],X:[I.CHIP_ADV]},{tier:9});
RC(SB.cgen,1,['III','ICI','IKI'],{I:[I.IRON],C:[B.CRUCIBLE],K:[I.COIL_WEAK,I.COIL,I.COIL_HEAVY]});
RC(SB.pipe,6,['XGX'],{X:[MI.tin.plate,MI.copper.plate,MI.bronze.plate],G:[B.GLASS]});
RC(I.FILTER,1,['.w.','pXp','.w.'],{w:[CU[0]],p:[I.PAPER],X:[MI.tin.plate,MI.copper.plate,MI.iron.plate]});
RC(I.UP_STACK1,1,['.X.','XcX','.X.'],{X:[I.IRON],c:[B.CHEST_WOOD]}); RC(I.UP_STACK2,1,['.X.','XuX','.X.'],{X:[I.GOLD],u:[I.UP_STACK1]}); RC(I.UP_STACK3,1,['.X.','XuX','.X.'],{X:[I.DIAMOND],u:[I.UP_STACK2]});
RC(I.UP_FILTER,1,['.X.','XfX','.X.'],{X:[I.IRON],f:[I.FILTER]}); RC(I.UP_VOID,1,['.O.','OfO','.O.'],{O:[B.OBSIDIAN],f:[I.FILTER]});
RC(SB.hopper,1,['I.I','IcI','.I.'],{I:[I.IRON],c:[B.CHEST_WOOD]}); RC(SB.dropper,1,['TTT','T.T','TwT'],{T:[B.COBBLE],w:CU});
spec([SB.capbank2,SB.capbank3,SB.cgen,SB.hopper,SB.dropper,...[1,2,3,4,5,6,7,8].map(i=>SB['solar'+i])],1.6,'pick'); spec(SB.pipe,.5); spec(SB.bpack,.3);
W('itemCat',o=>function(id){ return TECH_IDS20.includes(id)||[SB.capbank2,SB.capbank3,SB.cgen,SB.pipe,SB.hopper,SB.dropper].includes(id)||/^T_solar/.test(BKEY[id]||'')?'tech':o.apply(this,arguments); });

/* ---------- filters ---------- */
const fMatch=(st,id)=>{ const f=st&&st.x&&st.x.flt; if(!f||!f.ids.length) return true; return f.deny?!f.ids.includes(id):f.ids.includes(id); };
const hasList=st=>!!(st&&st.x&&st.x.flt&&st.x.flt.ids.length);

/* ---------- upgrades on chests and backpacks ---------- */
const UPSLOTS={[B.CHEST_WOOD]:1,[B.CHEST_TIN]:2,[B.CHEST_IRON]:3,[B.CHEST_GOLD]:4,[B.CHEST_DIAMOND]:5,[I.PACK]:1,[I.PACK_IRON]:2,[I.PACK_GOLD]:3,[I.PACK_DIAMOND]:4};
const upMul=up=>Math.max(1,...(up||[]).filter(Boolean).map(s=>ITEMS[s.id].mul||1));
const upOf=(up,k)=>(up||[]).filter(s=>s&&ITEMS[s.id].upgrade===k);
const slotLim=(id,mul)=>{ const st=ITEMS[id].stack||MAXSTACK; return st>1?st*mul:st; };

/* ---------- inventories that pipes, hoppers and droppers can reach ---------- */
function invAt(x,y,z){ const t=world.tiles.get(TK(x,y,z)); if(!t) return null; const all=a=>a.map((_,i)=>i);
  if(t.kind==='chest'){ const up=t.up||[]; return {t,slots:t.s,ins:()=>all(t.s),ext:all(t.s),mul:upMul(up),up}; }
  if(t.kind==='furnace') return {t,slots:t.s,ins:id=>SMELT_IN.has(id)?[0]:FUEL[id]?[2]:[],ext:[3,4,5],mul:1,up:[]};
  if(t.kind!=='tech') return null; const k=t.tech.type;
  if(k==='bpack') return {t,slots:t.s,ins:()=>all(t.s),ext:all(t.s),mul:upMul(t.tech.up),up:t.tech.up||[]};
  const D=TD(t); if(!D.slots) return null; const S=t.tech.slots; while(S.length<D.slots.length) S.push(null);
  const ins=id=>D.slots.map((kd,i)=>[kd,i]).filter(([kd])=>kd!=='flt'&&kd!=='up'&&!kd.startsWith('out')&&X.slotOK(t,kd,id)).map(a=>a[1]);
  const ext=D.slots.map((kd,i)=>[kd,i]).filter(([kd])=>kd.startsWith('out')||(k==='hopper'||k==='dropper')&&kd==='s').map(a=>a[1]);
  if(k==='pipe') return null; return {t,slots:S,ins,ext,mul:1,up:[]}; }
// try to put a stack in; returns how many are left. dry=true only counts
function invInsert(I0,st,dry){ let n=st.n; const id=st.id;
  for(const v of upOf(I0.up,'void')) if(hasList(v)&&fMatch(v,id)) return 0;
  const fu=upOf(I0.up,'filter'); if(fu.length&&!fu.some(f=>fMatch(f,id))) return n;
  const lim=slotLim(id,I0.mul), idx=I0.ins(id), S=I0.slots;
  for(const i of idx){ const s=S[i]; if(s&&s.id===id&&!s.bag&&!s.x&&!st.x&&s.n<lim&&(ITEMS[id].stack||1)>1){ const k=Math.min(n,lim-s.n); if(!dry) s.n+=k; n-=k; if(!n) return 0; } }
  for(const i of idx){ if(!S[i]){ const k=Math.min(n,lim); if(!dry) S[i]={id,n:k,d:st.d,x:st.x,bag:st.bag}; n-=k; if(!n) return 0; if(dry) break; } }
  if(n&&upOf(I0.up,'void').some(v=>!hasList(v))) return 0;   // a void upgrade with no list voids the overflow
  return n; }
function invExtract(I0,flt,max){ for(const i of I0.ext){ const s=I0.slots[i]; if(!s||(flt&&!fMatch(flt,s.id))) continue; const n=Math.min(max,s.n); const out={id:s.id,n,d:s.d,x:s.x,bag:s.bag}; s.n-=n; if(!s.n) I0.slots[i]=null; return out; } return null; }
function invPeek(I0,flt){ for(const i of I0.ext){ const s=I0.slots[i]; if(s&&(!flt||fMatch(flt,s.id))) return s; } return null; }
const posOf=(t,d)=>[t.x+DIR6[d][0],t.y+DIR6[d][1],t.z+DIR6[d][2]];

/* ---------- item distributors: pick up and deposit faces, filters, stack upgrade, stacks split at forks ---------- */
const isPipe=t=>t&&t.tech.type==='pipe';
const fmode=(t,d)=>(t.tech.fm||[])[d]||'off';
const PKT=[];
function pipeRoute(src,id,st,excl){ // breadth-first over pipes; returns destinations [{pipe,d,path}] and the tree
  const prev=new Map([[src,null]]), q=[src], dests=[];
  while(q.length){ const p=q.shift();
    for(let d=0;d<6;d++){ const n=tN(p,d);
      if(isPipe(n)){ if(!prev.has(n)){ prev.set(n,p); q.push(n); } continue; }
      if(fmode(p,d)!=='out') continue; const pos=posOf(p,d); if(excl&&pos.join()===excl) continue; const I0=invAt(...pos); if(!I0) continue;
      const fl=p.tech.slots&&p.tech.slots[1+d]; if(fl&&!fMatch(fl,id)) continue; if(invInsert(I0,{...st,n:1},true)>0) continue; dests.push({p,d}); } }
  for(const D of dests){ const path=[]; for(let c=D.p;c;c=prev.get(c)) path.unshift(c); D.path=path; }
  return dests; }
// share n items between branches at every fork of the route tree
function splitAtForks(src,dests,n){ const kids=new Map(), here=new Map(); for(const D of dests){ (here.get(D.p)||here.set(D.p,[]).get(D.p)).push(D); for(let i=0;i+1<D.path.length;i++){ const a=D.path[i], b=D.path[i+1]; if(!kids.has(a)) kids.set(a,new Set()); kids.get(a).add(b); } }
  const out=new Map(); const go=(node,k)=>{ const br=[...(here.get(node)||[]).map(D=>({D})),...[...(kids.get(node)||[])].map(c=>({c}))]; if(!br.length||k<=0) return;
    br.forEach((b,i)=>{ const share=Math.floor(k/br.length)+(i<k%br.length?1:0); if(!share) return; if(b.D) out.set(b.D,(out.get(b.D)||0)+share); else go(b.c,share); }); };
  go(src,n); return out; }
function stepPipes(dt,list){ for(const p of list){ if(!isPipe(p)) continue; const T=p.tech, up=T.slots&&T.slots[0], fast=up&&ITEMS[up.id].upgrade==='stack';
    T.cd=(T.cd||0)-dt; if(T.cd>0) continue; T.cd=fast?.25:.5;
    for(let d=0;d<6;d++){ if(fmode(p,d)!=='in') continue; const pos=posOf(p,d), I0=invAt(...pos); if(!I0) continue; const fl=T.slots&&T.slots[1+d];
      const peek=invPeek(I0,fl); if(!peek) continue; const dests=pipeRoute(p,peek.id,peek,pos.join()); if(!dests.length) continue;
      const want=fast?Math.min(peek.n,slotLim(peek.id,ITEMS[up.id].mul||1)):1, st=invExtract(I0,fl,want); if(!st) continue;
      const parts=splitAtForks(p,dests,st.n); for(const [D,k] of parts) PKT.push({id:st.id,n:k,d:st.d,x:st.x,bag:st.bag,path:D.path,face:D.d,t:0,sp:fast?6:3,from:pos}); } } }
function stepPackets(dt){ for(let i=PKT.length-1;i>=0;i--){ const k=PKT[i]; k.t+=dt*k.sp; if(k.t<k.path.length) continue; PKT.splice(i,1); deliver(k); } }
function deliver(k){ const last=k.path[k.path.length-1]; if(!world.tiles.has(TK(last.x,last.y,last.z))){ spawnDrop(last.x+.5,last.y+.5,last.z+.5,k.id,k.n,k.d,k.bag); return; }
  const I0=invAt(...posOf(last,k.face)); let left=I0?invInsert(I0,k):k.n;
  if(left>0){ const ds=pipeRoute(last,k.id,k,k.from.join()); for(const D of ds){ const I1=invAt(...posOf(D.p,D.d)); if(!I1) continue; left=invInsert(I1,{...k,n:left}); if(!left) break; } }
  if(left>0){ spawnDrop(last.x+.5,last.y+1,last.z+.5,k.id,left,k.d,k.bag); if(k.x) drops[drops.length-1].sx=k.x; } }
W('saveGame',o=>function(){ while(PKT.length){ const k=PKT.pop(); deliver(k); } return o.apply(this,arguments); });

/* ---------- hoppers and droppers ---------- */
function stepHopper(t,dt){ const T=t.tech; T.cd=(T.cd||0)-dt; if(T.cd>0) return; T.cd=.4; const fl=T.slots[5], me=invAt(t.x,t.y,t.z);
  const above=invAt(t.x,t.y+1,t.z); if(above){ const s=invPeek(above,fl); if(s&&invInsert(me,{...s,n:1},true)===0){ const g=invExtract(above,fl,1); if(g) invInsert(me,g); } }
  else for(let i=drops.length-1;i>=0;i--){ const q=drops[i]; if(Math.abs(q.x-t.x-.5)<.7&&Math.abs(q.z-t.z-.5)<.7&&q.y>t.y+.5&&q.y<t.y+1.8&&(!fl||fMatch(fl,q.id))){ const left=invInsert(me,{id:q.id,n:q.n,d:q.d,x:q.sx,bag:q.bag}); if(left<q.n){ if(!left) drops.splice(i,1); else q.n=left; break; } } }
  const tgt=invAt(...posOf(t,T.f)); if(!tgt) return; for(let i=0;i<5;i++){ const s=T.slots[i]; if(!s) continue; if(invInsert(tgt,{...s,n:1},true)===0){ invInsert(tgt,{...s,n:1}); s.n--; if(!s.n) T.slots[i]=null; break; } } }
function stepDropper(t){ const T=t.tech, on=anySig(t,T.f); if(on&&!T.was){ const fl=T.slots[9], i=T.slots.findIndex((s,k)=>k<9&&s&&(!fl||fMatch(fl,s.id)));
    if(i>=0){ const s=T.slots[i], tgt=invAt(...posOf(t,T.f)), one={...s,n:1}; let done=false; if(tgt) done=invInsert(tgt,one)===0;
      if(!tgt){ const d=DIR6[T.f]; spawnDrop(t.x+.5+d[0]*.7,t.y+.5+d[1]*.7,t.z+.5+d[2]*.7,s.id,1,s.d,s.bag); const q=drops[drops.length-1]; if(q){ q.vx=d[0]*4; q.vy=d[1]*4+1; q.vz=d[2]*4; if(s.x) q.sx=s.x; } done=true; }
      if(done){ s.n--; if(!s.n) T.slots[i]=null; sfx('click',t.x+.5,t.y+.5,t.z+.5,.4); } } }
  T.was=on; }

/* ---------- energy: capacitor multiblocks, solar arrays, the coal generator ---------- */
function groups(list,ok,same){ const seen=new Set(), out=[]; for(const t of list){ if(!ok(t)||seen.has(t)) continue; const g=[], q=[t]; seen.add(t);
    while(q.length){ const a=q.pop(); g.push(a); for(let d=0;d<6;d++){ const n=tN(a,d); if(n&&ok(n)&&!seen.has(n)&&same(a,n)){ seen.add(n); q.push(n); } } } out.push(g); } return out; }
const pool=g=>{ let e=0,c=0; for(const t of g){ e+=t.tech.e; c+=TD(t).cap; } for(const t of g){ t.tech.e=e*TD(t).cap/c; t._grp20=g; } };
let solarK=1;
window.techTick20=function(list,dt){
  // capacitor banks of one tier join into one bank: shared charge, shared settings
  for(const g of groups(list,t=>TD(t).cb,(a,b)=>a.tech.type===b.tech.type)) pool(g);
  // solar panels touching each other share their charge, then each panel powers what it touches
  const di=dayInfo(); solarK=di.day?Math.max(0,Math.min(1,di.k)):0;
  for(const t of list){ const D=TD(t); if(!D.solar) continue; const sky=skyAt(t.x,t.y+1,t.z), g=D.gen*solarK*Math.max(0,(sky-3)/12), add=Math.min(D.cap-t.tech.e,g); t.tech.e+=add; t._gen=(t._gen||0)+add; t._sun=sky>=15&&solarK>.2; }
  for(const g of groups(list,t=>TD(t).solar,()=>true)) pool(g);
  for(const t of list){ if(t.tech.type!=='cgen') continue; const T=t.tech, s=T.slots; if((T.burn||0)<=0&&T.e<TD(t).cap-200&&s[0]&&FUEL[s[0].id]){ T.burn=T.burnMax=FUEL[s[0].id]; s[0].n--; if(!s[0].n) s[0]=null; }
    if(T.burn>0){ T.burn-=dt; const g=Math.min(TD(t).cap-T.e,10); T.e+=g; t._gen=(t._gen||0)+g; } }
  stepPipes(dt,list); stepPackets(dt);
  for(const t of list){ const k=t.tech.type; if(k==='hopper') stepHopper(t,dt); else if(k==='dropper') stepDropper(t); } };

/* ---------- placing: facing for hoppers and droppers; backpacks set down with crouch ---------- */
W('afterPlace',o=>function(x,y,z,id,s){ o.apply(this,arguments); const bd=BLOCKS[id]; if(!bd||!bd.tech) return; const t=tAt(x,y,z); if(!t) return; const k=bd.tech;
  if(k==='hopper'){ const away=t.tech.f; t.tech.f=away===2||away===3?3:OPP[away]; }   // pointing down, or into the block it was placed against
  if(k==='pipe'){ t.tech.fm=[0,1,2,3,4,5].map(d=>{ const n=tN(t,d); if(n&&isPipe(n)) return 'off'; return invAt(...posOf(t,d))?'out':'off'; }); }
  if(TD(t).cb||TD(t).solar){ const n=[0,1,2,3,4,5].map(d=>tN(t,d)).find(n=>n&&n.tech.type===k); if(n&&n.tech.io) t.tech.io=n.tech.io; } });
W('useHeld',o=>function(sx,sy){ const s=held(), it=s&&ITEMS[s.id];
  if(it&&it.bag&&player.crouch&&mode==='play'){ const r=pick(sx,sy); if(r&&r.prev&&reachOK(...r.prev)&&world.get(...r.prev)===B.AIR&&world.solid(r.prev[0],r.prev[1]-1,r.prev[2])){ const [x,y,z]=r.prev;
      world.set(x,y,z,SB.bpack); const t=newTech(x,y,z,'bpack',OPP[[5,0,4,1][['n','e','s','w'].indexOf(face4())]]); t.s=s.bag||new Array(it.bag).fill(null); t.tech.item=s.id; t.tech.up=(s.x&&s.x.up)||[];
      inv.slots[inv.sel]=null; invChanged(); toast('Backpack set down · tap to open, break to pick it up with everything inside'); return true; } }
  if(it&&it.filter&&mode==='play'){ openFilter(s); return true; }
  if(it&&it.upgrade==='stack'){ toast(`Stack upgrade ×${it.mul}: put it in a chest, backpack or item distributor`); return true; }
  return o.apply(this,arguments); });
W('breakBlock',o=>function(x,y,z,tool){ const t=tAt(x,y,z), b=world.get(x,y,z), bp=t&&t.tech.type==='bpack'?{id:t.tech.item,bag:t.s,up:t.tech.up}:null, ch=world.tiles.get(TK(x,y,z)), chUp=ch&&ch.kind==='chest'?ch.up:null;
  const ok=o.apply(this,arguments); if(!ok) return ok;
  if(bp){ spawnDrop(x+.5,y+.5,z+.5,bp.id,1,undefined,bp.bag); if(bp.up&&bp.up.length) drops[drops.length-1].sx={up:bp.up}; }
  if(chUp&&!creative()) for(const s of chUp) if(s) spawnDrop(x+.5,y+.5,z+.5,s.id,1,undefined,undefined); return ok; });
// opening placed backpacks, installing upgrades by tapping with them
W('tryInteract',o=>function(sx,sy){ const r=pick(sx,sy); if(!r) return o.apply(this,arguments); const [x,y,z]=r.hit, tl=world.tiles.get(TK(x,y,z)), s=held(), it=s&&ITEMS[s.id];
  if(tl&&(tl.kind==='chest'||(tl.kind==='tech'&&tl.tech.type==='bpack'))&&!(player.crouch&&buildMode)){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; }
    const tgt=upTarget(tl); if(it&&it.upgrade){ if(tgt.up.filter(Boolean).length>=tgt.max){ toast(`No free upgrade slot (${tgt.max} on this ${tgt.name})`); return true; } tgt.up.push({id:s.id,n:1,x:s.x}); use1(s); toast(ITEMS[s.id].name+' installed'); return true; }
    if(tl.kind==='tech'){ openStore(tl.s,ITEMS[tl.tech.item].name,TK(x,y,z)); return true; } }
  return o.apply(this,arguments); });
function upTarget(tl){ if(tl.kind==='chest'){ tl.up=tl.up||[]; return {up:tl.up,max:UPSLOTS[world.get(tl.x,tl.y,tl.z)]||1,name:'chest'}; } tl.tech.up=tl.tech.up||[]; return {up:tl.tech.up,max:UPSLOTS[tl.tech.item]||1,name:'backpack'}; }
// carried backpacks: filter upgrades pull matching pickups in, void upgrades destroy them
window.pickupRoute=function(q){ let n=q.n; for(const s of inv.slots){ if(!s||!s.bag||!s.x||!s.x.up||!n) continue; const up=s.x.up;
    if(upOf(up,'void').some(v=>hasList(v)&&fMatch(v,q.id))) return 0;
    if(upOf(up,'filter').some(f=>hasList(f)&&fMatch(f,q.id))){ const I0={slots:s.bag,ins:()=>s.bag.map((_,i)=>i),mul:upMul(up),up:[]}; n=invInsert(I0,{id:q.id,n,d:q.d,x:q.sx,bag:q.bag}); } }
  return n; };
window.voidOverflow=function(q,left){ if(left>0&&inv.slots.some(s=>s&&s.bag&&s.x&&s.x.up&&upOf(s.x.up,'void').some(v=>!hasList(v)))) return 0; return left; };

/* ---------- upgrades and filter panels ---------- */
const UP=document.createElement('button'); UP.textContent='Upgrades'; Object.assign(UP.style,{position:'fixed',top:'10px',left:'50%',transform:'translateX(-50%)',zIndex:60,padding:'8px 16px',borderRadius:'10px',background:'#f0b548',color:'#222',fontWeight:'700',display:'none',border:'0'}); document.body.appendChild(UP);
let upCtx=null;
W('openStore',o=>function(arr,title,key){ o.apply(this,arguments); upCtx=null;
  const tl=key&&world.tiles.get(key); if(tl&&(tl.kind==='chest'||(tl.kind==='tech'&&tl.tech.type==='bpack'))) upCtx=upTarget(tl);
  else { const s=held(); if(s&&s.bag&&arr===s.bag){ s.x=s.x||{}; s.x.up=s.x.up||[]; upCtx={up:s.x.up,max:UPSLOTS[s.id]||1,name:'backpack'}; } }
  UP.style.display=upCtx?'block':'none'; });
W('closeStore',o=>function(){ UP.style.display='none'; return o.apply(this,arguments); });
const FP=document.createElement('section'); FP.className='panel'; FP.hidden=true; FP.id='flt20'; FP.innerHTML='<header><h2 id="f20T">Upgrades</h2><button class="primary" id="f20C">Done</button></header><div class="invBody" id="f20B" style="display:flex;flex-direction:column;gap:10px;overflow:auto"></div>'; document.body.appendChild(FP);
let fpMode=null, fpBack=null;
const closeFP=()=>{ FP.hidden=true; const b=fpBack; fpMode=null; fpBack=null; if(b) b(); else if(mode==='flt'){ mode='play'; last=performance.now(); } };
document.getElementById('f20C').onclick=closeFP;
UP.onclick=()=>{ const ctx=upCtx; fpBack=()=>{ FP.hidden=true; }; openUpgrades(ctx); };
function openUpgrades(ctx){ fpMode={up:ctx}; FP.hidden=false; renderFP(); }
function openFilter(st,back){ st.x=st.x||{}; st.x.flt=st.x.flt||{ids:[],deny:false}; fpMode={flt:st,q:''}; fpBack=back||null; if(!back){ mining=null; mode='flt'; } FP.hidden=false; renderFP(); }
function renderFP(){ const B2=document.getElementById('f20B'); if(!fpMode) return;
  if(fpMode.up){ const c=fpMode.up; document.getElementById('f20T').textContent=`Upgrades · ${c.up.filter(Boolean).length}/${c.max} slots`;
    B2.innerHTML=`<div class="tu-lab" style="text-align:left">Tap the ${c.name} while holding an upgrade to install it. Stack upgrades multiply how much each slot holds when items are fed in by distributors, hoppers and pickups. Filter upgrades decide what goes in; on a carried backpack they pull matching pickups straight in. Void upgrades destroy their listed items, or the overflow when their list is empty.</div>`+
      c.up.map((s,i)=>s?`<div class="tu-row" style="gap:10px"><img src="${ico(s.id)}" style="width:36px;height:36px;image-rendering:pixelated"> <b>${ITEMS[s.id].name}</b> ${ITEMS[s.id].filter?`<button class="tu-b" data-ef="${i}">Edit list (${s.x&&s.x.flt?s.x.flt.ids.length:0})</button>`:''}<button class="tu-b" data-rm="${i}">Remove</button></div>`:'').join('');
    B2.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ const s=c.up.splice(+b.dataset.rm,1)[0]; const left=addItem(s.id,1); if(!left&&s.x) inv.slots[inv.landed].x=s.x; invChanged(); renderFP(); });
    B2.querySelectorAll('[data-ef]').forEach(b=>b.onclick=()=>{ const s=c.up[+b.dataset.ef]; openFilter(s,()=>openUpgrades(c)); }); return; }
  const st=fpMode.flt, f=st.x.flt; document.getElementById('f20T').textContent=ITEMS[st.id].name+' · item list';
  const q=fpMode.q.toLowerCase(), list=Object.keys(ITEMS).map(Number).filter(id=>!ITEMS[id].noShow&&ITEMS[id].name&&(!q||ITEMS[id].name.toLowerCase().includes(q))).slice(0,72);
  B2.innerHTML=`<div class="tu-row"><button class="tu-b" data-al aria-pressed="${!f.deny}">Allow listed</button><button class="tu-b" data-dn aria-pressed="${!!f.deny}">Block listed</button><span class="tu-lab">${f.ids.length}/18 items · tap one to remove it</span></div>
    <div class="tu-row">${f.ids.map(id=>`<button class="tu-slot" data-rmid="${id}" title="${ITEMS[id].name}"><img src="${ico(id)}"></button>`).join('')||'<span class="tu-lab">Nothing listed yet</span>'}</div>
    <input id="f20Q" placeholder="Search items to add…" value="${fpMode.q.replace(/"/g,'')}" style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:inherit">
    <div class="tu-row">${list.map(id=>`<button class="tu-slot" data-add="${id}" title="${ITEMS[id].name}"><img src="${ico(id)}"></button>`).join('')}</div>`;
  B2.querySelector('[data-al]').onclick=()=>{ f.deny=false; renderFP(); }; B2.querySelector('[data-dn]').onclick=()=>{ f.deny=true; renderFP(); };
  B2.querySelectorAll('[data-rmid]').forEach(b=>b.onclick=()=>{ f.ids=f.ids.filter(i=>i!==+b.dataset.rmid); renderFP(); });
  B2.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ const id=+b.dataset.add; if(!f.ids.includes(id)&&f.ids.length<18) f.ids.push(id); renderFP(); });
  const inp=B2.querySelector('#f20Q'); inp.oninput=()=>{ fpMode.q=inp.value; const p=inp.selectionStart; renderFP(); const n=document.getElementById('f20Q'); n.focus(); n.setSelectionRange(p,p); }; }
W('slotLabel',o=>function(s){ let r=o.apply(this,arguments); if(s&&s.x&&s.x.flt&&s.x.flt.ids.length) r+=` · ${s.x.flt.deny?'blocks':'allows'} ${s.x.flt.ids.map(i=>ITEMS[i].name).slice(0,3).join(', ')}${s.x.flt.ids.length>3?'…':''}`; if(s&&s.x&&s.x.up&&s.x.up.length) r+=` · upgrades: ${s.x.up.map(u=>ITEMS[u.id].name).join(', ')}`; return r; });

/* ---------- machine panels ---------- */
const FN=['east','west','up','down','south','north'];
window.body20=function(t){ const T=t.tech, k=T.type, D=TD(t);
  if(D.cb){ const g=t._grp20||[t]; let e=0,c=0; for(const q of g){ e+=q.tech.e; c+=TD(q).cap; } const f=c?e/c:0, n=Math.round(f*20);
    return `<div class="tu-box tu-rf"><b>${g.length>1?`Multiblock · ${g.length} banks`:'Single bank'}</b><div class="tu-bars">${Array.from({length:20},(_,i)=>`<b class="${i<n?'on':''}"></b>`).join('')}</div>${fmt(e)} / ${fmt(c)} RF (${Math.round(f*100)}%)<br>In: +${g.reduce((a,q)=>a+(q._inR||0),0).toFixed(1)} RF/s · Out: −${g.reduce((a,q)=>a+(q._outR||0),0).toFixed(1)} RF/s · Loss: 0.0 % · Max ${fmt(D.rate*g.length*20)} RF/s
      <div class="tu-cap" style="margin-top:6px">${[2,1,0].map(r=>`<span class="${f>(r+.5)/3-.17?'on':''}">====</span>`).join('<br>')}</div></div>
      <div class="tu-box"><b>Input / output</b> (whole multiblock)<div class="tu-row" style="margin-top:6px">${['both','in','out'].map(m=>`<button class="tu-b" data-io="${m}" aria-pressed="${(T.io||'both')===m}">${m==='both'?'Input and output':m==='in'?'Input only':'Output only'}</button>`).join('')}</div></div>`+slotsRowX(t); }
  if(D.solar){ const g=t._grp20||[t]; let e=0,c=0,gen=0; for(const q of g){ e+=q.tech.e; c+=TD(q).cap; gen+=TD(q).gen; }
    return `<div class="tu-box tu-rf"><b>${BLOCKS[world.get(t.x,t.y,t.z)].name}</b> · ${g.length} connected panel${g.length>1?'s':''}<br>Peak ${D.gen} RF/t here · array peak ${fmt(gen)} RF/t<br>Now: ${t._sun?'in full sun':'shaded or dark'} · ${(D.gen*solarK*Math.max(0,(skyAt(t.x,t.y+1,t.z)-3)/12)).toFixed(1)} RF/t
      <div class="tu-bars">${Array.from({length:20},(_,i)=>`<b class="${i<Math.round(e/c*20)?'on':''}"></b>`).join('')}</div>${fmt(e)} / ${fmt(c)} RF · Out: −${g.reduce((a,q)=>a+(q._outR||0),0).toFixed(1)} RF/s · Loss: 0.0 %</div>`; }
  if(k==='pipe'){ const rows=[0,1,2,3,4,5].map(d=>{ const pos=posOf(t,d), n=tN(t,d); if(isPipe(n)) return `<div class="tu-rf">${FN[d]}: connected to another distributor</div>`; const I0=invAt(...pos); if(!I0) return '';
      const nm=BLOCKS[world.get(...pos)]?.name||'inventory', fl=T.slots[1+d];
      return `<div class="tu-box"><b>${FN[d]} · ${nm}</b><div class="tu-row" style="margin-top:6px">${['off','in','out'].map(m=>`<button class="tu-b" data-fm="${d}:${m}" aria-pressed="${fmode(t,d)===m}">${m==='off'?'Off':m==='in'?'Pick up':'Deposit'}</button>`).join('')}
        <button class="tu-slot" data-ts="${1+d}">${fl?`<img src="${ico(fl.id)}">`:''}</button><span class="tu-lab">Filter${fl&&fl.x&&fl.x.flt?` · ${fl.x.flt.deny?'blocks':'allows'} ${fl.x.flt.ids.length}`:''}</span></div></div>`; }).join('');
    return `<div class="tu-lab" style="text-align:left">Distributors join up with each other. On each side touching a chest, backpack, hopper or machine, choose Pick up or Deposit, and add a filter if you like. Items flow from pick-up sides to deposit sides, and a load is shared evenly at every fork. A stack upgrade moves whole stacks, twice as fast.</div>${rows||'<div class="tu-lab">Nothing beside it yet</div>'}
      <div class="tu-row"><button class="tu-slot" data-ts="0">${T.slots[0]?`<img src="${ico(T.slots[0].id)}">`:''}</button><span class="tu-lab">Upgrade slot (stack upgrade)</span></div>`; }
  if(k==='hopper'||k==='dropper') return `<div class="tu-lab" style="text-align:left">${k==='hopper'?`Pulls from the inventory above (or catches items dropped on it) and passes them ${t.tech.f===3?'down':'sideways'} into what it points at.`:'Gives out one item each time it gets a signal: into an inventory in front of it, or out into the world.'} The filter slot limits which items it handles.</div>`+slotsRowX(t);
  if(k==='cgen') return `<div class="tu-box">${T.burn>0?`Burning · ${Math.ceil(T.burn)}s left · 10 RF/t`:'Idle · put coal, charcoal or wood in the fuel slot'}<div class="tu-bar" style="margin-top:6px"><b style="width:${T.burnMax?T.burn/T.burnMax*100:0}%"></b></div></div>`+X.rfBox(t)+X.slotsRow(t);
  return null; };
// the shared panel pieces from stage 19 are private; small copies here
function slotsRowX(t){ const D=TD(t); if(!D.slots) return ''; const N={s:'Storage',up:'Upgrade',flt:'Filter',fuel:'Fuel',charge:'Charge'}; return `<div class="tu-row">${D.slots.map((k,i)=>{ const s=t.tech.slots[i]; return `<div><button class="tu-slot" data-ts="${i}">${s?`<img src="${ico(s.id)}"><i>${s.n>1?s.n:''}</i>`:''}</button><div class="tu-lab">${N[k]||k}</div></div>`; }).join('')}</div>`; }
function hotbarX(){ return `<div class="tu-lab" style="text-align:left">Your hotbar · pick an item, then tap an empty slot. Tap a full slot to take it.</div><div class="tu-row">${inv.slots.slice(0,9).map((s,i)=>`<button class="tu-slot ${i===inv.sel?'sel':''}" data-hb="${i}">${s?`<img src="${ico(s.id)}"><i>${s.n>1?s.n:''}</i>`:''}</button>`).join('')}</div>`; }
window.bind20=function(t,B2){ B2.querySelectorAll('[data-io]').forEach(b=>b.onclick=()=>{ for(const q of t._grp20||[t]) q.tech.io=b.dataset.io==='both'?undefined:b.dataset.io; X.renderTech(true); });
  B2.querySelectorAll('[data-fm]').forEach(b=>b.onclick=()=>{ const [d,m]=b.dataset.fm.split(':'); t.tech.fm=t.tech.fm||[]; t.tech.fm[+d]=m; X.markMesh(t); X.renderTech(true); }); };
window.tap20=function(t,s,it){ return false; };

/* ---------- drawing ---------- */
const frameEdges=(ID,same,c,e)=>{ for(const ax of [0,1,2]) for(const s1 of [0,1]) for(const s2 of [0,1]){ const a1=(ax+1)%3, a2=(ax+2)%3, n1=[0,0,0], n2=[0,0,0]; n1[a1]=s1?1:-1; n2[a2]=s2?1:-1;
    const nb1=same(...n1), nb2=same(...n2), diag=same(n1[0]+n2[0],n1[1]+n2[1],n1[2]+n2[2]); if(nb1&&nb2&&diag) continue; if(nb1!==nb2) continue;
    const lo=[0,0,0], hi=[1,1,1]; lo[a1]=s1?1-e:0; hi[a1]=s1?1:e; lo[a2]=s2?1-e:0; hi[a2]=s2?1:e; ID(lo,hi,c); } };
const ITCOL={}; const itemCol=id=>{ if(ITCOL[id]) return ITCOL[id]; let c=[200,200,200]; try{ const cv=itemIconCanvas(id), g=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let r=0,gg=0,b=0,n=0; for(let i=0;i<g.length;i+=16) if(g[i+3]>128){ r+=g[i]; gg+=g[i+1]; b+=g[i+2]; n++; } if(n) c=[r/n|0,gg/n|0,b/n|0]; }catch(e){} return ITCOL[id]=c; };
window.techMesh20=function(vb,vg,b,bd,wx,y,wz,t,k,f,T,ID){ const D=TT[k]||{};
  if(D.cb){ const same=(dx,dy,dz)=>world.get(wx+dx,y+dy,wz+dz)===b; ID([.04,.04,.04],[.96,.96,.96],bd.side); frameEdges(ID,same,k==='capbank3'?[80,200,90]:k==='capbank2'?[200,160,60]:[150,150,156],.08); return true; }
  if(D.solar){ const same=(dx,dy,dz)=>{ const n=world.get(wx+dx,y+dy,wz+dz); return n>0&&BLOCKS[n].tech&&/^solar/.test(BLOCKS[n].tech); }; const fc=bd.side;
    ID([0,0,0],[1,.16,1],[60,60,66]); ID([.06,.16,.06],[.94,.19,.94],[26,40,80]);
    for(const a of [.33,.63]){ ID([a,.19,.06],[a+.04,.2,.94],[150,170,200]); ID([.06,.19,a],[.94,.2,a+.04],[150,170,200]); }
    if(!same(-1,0,0)) ID([0,.16,0],[.06,.21,1],fc); if(!same(1,0,0)) ID([.94,.16,0],[1,.21,1],fc); if(!same(0,0,-1)) ID([0,.16,0],[1,.21,.06],fc); if(!same(0,0,1)) ID([0,.16,.94],[1,.21,1],fc); return true; }
  if(k==='cgen'){ const tr=X.oT(wx,y,wz,f); emitBox(vb,[wx,y,wz],[wx+1,y+1,wz+1],[86,86,92],IDT); emitBox(vb,[.25,.15,.98],[.75,.5,1.01],[30,28,26],tr); emitBox(vb,[.2,.7,.98],[.8,.85,1.01],[200,120,70],tr); return true; }
  if(k==='pipe'){ const c=[150,170,180]; ID([.32,.32,.32],[.68,.68,.68],c);
    for(let d=0;d<6;d++){ const n=t&&tN(t,d), m=t?fmode(t,d):'off', link=(n&&isPipe(n))||m!=='off'; if(!link) continue; const v=DIR6[d], lo=[.36,.36,.36], hi=[.64,.64,.64];
      for(let a=0;a<3;a++){ if(v[a]>0){ lo[a]=.68; hi[a]=1; } if(v[a]<0){ lo[a]=0; hi[a]=.32; } } ID(lo,hi,c);
      if(m!=='off'&&!(n&&isPipe(n))){ const l2=lo.slice(), h2=hi.slice(); for(let a=0;a<3;a++){ if(v[a]>0){ l2[a]=.9; h2[a]=1; } if(v[a]<0){ l2[a]=0; h2[a]=.1; } if(!v[a]){ l2[a]-=.04; h2[a]+=.04; } } ID(l2,h2,m==='in'?[240,150,50]:[70,140,240]); } } return true; }
  if(k==='hopper'){ ID([0,.62,0],[1,1,1],[74,74,80]); ID([.12,.66,.12],[.88,1.001,.88],[40,40,44]); ID([.25,.3,.25],[.75,.62,.75],[74,74,80]);
    const d=t?t.tech.f:3; if(d===3) ID([.38,0,.38],[.62,.3,.62],[74,74,80]); else { const v=DIR6[d], lo=[.38,.3,.38], hi=[.62,.5,.62]; if(v[0]>0){ lo[0]=.75; hi[0]=1; } if(v[0]<0){ lo[0]=0; hi[0]=.25; } if(v[2]>0){ lo[2]=.75; hi[2]=1; } if(v[2]<0){ lo[2]=0; hi[2]=.25; } ID(lo,hi,[74,74,80]); } return true; }
  if(k==='dropper'){ const tr=X.oT(wx,y,wz,f); emitBox(vb,[wx,y,wz],[wx+1,y+1,wz+1],[126,126,128],IDT); emitBox(vb,[.3,.3,.98],[.7,.7,1.01],[40,40,42],tr); emitBox(vb,[.38,.38,.99],[.62,.62,1.02],[20,20,22],tr); return true; }
  if(k==='bpack'){ const tr=X.oT(wx,y,wz,f), id=t&&t.tech.item, c=id===I.PACK_IRON?[190,184,176]:id===I.PACK_GOLD?[230,190,70]:id===I.PACK_DIAMOND?[90,210,210]:[138,90,52];
    emitBox(vb,[.2,0,.3],[.8,.7,.72],c,tr); emitBox(vb,[.25,.05,.72],[.75,.45,.82],shdc(c,.8),tr); emitBox(vb,[.18,.62,.28],[.82,.76,.74],shdc(c,.7),tr); emitBox(vb,[.3,.2,.26],[.36,.68,.3],[60,40,30],tr); emitBox(vb,[.64,.2,.26],[.7,.68,.3],[60,40,30],tr);
    if(t&&t.tech.up&&t.tech.up.length) emitBox(vb,[.42,.5,.82],[.58,.62,.84],[240,200,80],tr); return true; }
  return false; };
const shdc=(c,k)=>c.map(v=>v*k|0);
window.techDyn20=function(vb,t,T,k,lit,now){ const D=TT[k]||{};
  if(D.cb){ const f=T.e/D.cap, same=d=>{ const n=tN(t,d); return n&&n.tech.type===k; };
    for(const fd of HDIRS){ if(same(fd)) continue; const d=DIR6[fd], u=fd===0||fd===1?[0,0,1]:[1,0,0]; for(let r=0;r<3;r++){ const on=f>(r+.5)/3-.17; setVL(on?VL_EMISSIVE:lit); const y0=t.y+.3+r*.14, cx=t.x+.5+d[0]*.501, cz=t.z+.5+d[2]*.501;
      emitBox(vb,[cx-u[0]*.3-Math.abs(d[0])*.01,y0,cz-u[2]*.3-Math.abs(d[2])*.01],[cx+u[0]*.3+Math.abs(d[0])*.01,y0+.07,cz+u[2]*.3+Math.abs(d[2])*.01],on?[70,235,100]:[24,60,34],IDT); } } }
  if(k==='cgen'&&T.burn>0){ setVL(VL_EMISSIVE); const fl=.8+.2*Math.sin(now*9+t.x); emitBox(vb,[0,0,0],[1,1,1],[255*fl|0,120*fl|0,30],(x,y,z)=>X.oT(t.x,t.y,t.z,T.f)(.27+x*.46,.17+y*.3,.985+z*.03)); } };
// items moving through distributors
{ const o=window.techDyn; window.techDyn=function(vb,p){ o(vb,p); if(!PKT.length) return; setVL(VL_SUN);
  for(const k of PKT){ const i=Math.min(k.path.length-1,Math.floor(k.t)), fr=k.t-i, a=k.path[i], b=k.path[Math.min(k.path.length-1,i+1)]; let x=a.x+(b.x-a.x)*fr+.5, y=a.y+(b.y-a.y)*fr+.5, z=a.z+(b.z-a.z)*fr+.5;
    if(i===k.path.length-1){ const v=DIR6[k.face]; x+=v[0]*fr*.5; y+=v[1]*fr*.5; z+=v[2]*fr*.5; } if(Math.abs(x-p.x)>40||Math.abs(z-p.z)>40) continue;
    setVL(sampleLight(x,y,z)); const r=k.n>1?.12:.09; emitBox(vb,[x-r,y-r,z-r],[x+r,y+r,z+r],itemCol(k.id),IDT); } }; }
window.TECH20={invAt,invInsert,invExtract,pipeRoute,splitAtForks,PKT,openFilter,openUpgrades,upTarget,fMatch};
}
