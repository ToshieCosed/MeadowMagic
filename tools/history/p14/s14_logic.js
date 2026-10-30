
/* =====================================================================
   STAGE 14: farming · growth ticks · bone meal · saplings and giant trees
   ===================================================================== */
const isFarmland=b=>b===B.FARMLAND||b===B.FARMLAND_WET;
const airish=b=>b===0||(b>0&&BLOCKS[b].replace&&!isW(b)&&!isLiquid(b));
function takeHeld(s,n){ if(creative()) return; s.n-=n||1; if(s.n<=0) inv.slots[inv.sel]=null; invChanged(); }
function growTreeAt(kind,x,y,z){
  const put=(lx,yy,lz,v,force)=>{ if(yy<1||yy>=world.H) return; const c=world.get(lx,yy,lz); if(c<0) return;
    const free=c===0||BLOCKS[c].replace&&!isW(c)||BLOCKS[c].sapling; if(free||force&&(BLOCKS[c].leaves||BLOCKS[c].wart)) world.set(lx,yy,lz,v); };
  Generator2.prototype.tree.call({seed:(world.seed^(Math.random()*1e9|0))|0,H:world.H,v3:true,_sandAt:()=>true},kind,put,x,y,z,x,z,y-1); }
function growSapling(x,y,z){ const b=world.get(x,y,z), w=WOODS.find(q=>q.sapling===b); if(!w) return false;
  let sq=null; for(const [ox,oz] of [[0,0],[-1,0],[0,-1],[-1,-1]]){ const ax=x+ox, az=z+oz; if([[0,0],[1,0],[0,1],[1,1]].every(([a,c])=>world.get(ax+a,y,az+c)===b)){ sq=[ax,az]; break; } }
  const kind=sq?GIANT_KIND[w.k]:TREE_KIND[w.k]; if(!kind) return false;   // dark and pale oak only grow from four saplings, like Minecraft
  const cells=sq?[[0,0],[1,0],[0,1],[1,1]].map(([a,c])=>[sq[0]+a,sq[1]+c]):[[x,z]], need=sq?9:5;
  if(y+need+3>=world.H) return false;
  for(const [cx,cz] of cells) for(let k=1;k<need;k++){ const v=world.get(cx,y+k,cz); if(!(v===0||v>0&&(BLOCKS[v].replace||BLOCKS[v].leaves))) return false; }
  for(const [cx,cz] of cells) world.set(cx,y,cz,B.AIR);
  growTreeAt(kind,sq?sq[0]:x,y,sq?sq[1]:z); return true; }
function boneMeal(x,y,z){ const b=world.get(x,y,z), bd=b>0&&BLOCKS[b]; if(!bd) return false;
  if(bd.crop){ if(bd.age>=bd.maxAge) return false; world.set(x,y,z,CROPS[bd.crop].ids[Math.min(bd.maxAge,bd.age+rint(2,4))]); return true; }
  if(bd.sapling){ if(Math.random()<.45&&!growSapling(x,y,z)) toast('Not enough room to grow'); return true; }
  if(bd.berry!==undefined){ if(bd.berry>=3) return false; world.set(x,y,z,BERRY[bd.berry+1]); return true; }
  if(bd.cocoa){ if(bd.cocoa.age>=2) return false; world.set(x,y,z,b+1); return true; }
  if(b===B.MUSH_R||b===B.MUSH_BR){ if(Math.random()<.4){ if(world.get(x,y+1,z)===0&&world.get(x,y+5,z)===0){ world.set(x,y,z,B.AIR); growTreeAt(b===B.MUSH_R?'hugeR':'hugeB',x,y,z); } } return true; }
  if(b===B.TALLGRASS||b===B.FERN){ if(world.get(x,y+1,z)!==0) return false; const lo=b===B.FERN?B.FERN_LO:B.TALL_LO; world.set(x,y,z,lo); world.set(x,y+1,z,lo+1); return true; }
  if(bd.cane||b===B.CACTUS){ let top=y; while(world.get(x,top+1,z)===b) top++; let bot=y; while(world.get(x,bot-1,z)===b) bot--; if(top-bot>=2||world.get(x,top+1,z)!==0) return false; growColumn(x,top+1,z,b); return true; }
  if(b===B.GRASS||b===B.MOSS){ let n=0; const fl=[B.FLOWER_R,B.FLOWER_Y,B.FLOWER_B,B.FLOWER_W];
    for(let i=0;i<16;i++){ const gx=x+rint(-3,3), gz=z+rint(-3,3); for(let gy=y+1;gy>=y-1;gy--){ if(world.get(gx,gy,gz)===B.GRASS&&world.get(gx,gy+1,gz)===0){ world.set(gx,gy+1,gz,Math.random()<.85?B.TALLGRASS:fl[rint(0,fl.length-1)]); n++; break; } } }
    return n>0; }
  return false; }
// a new cane or cactus block; a cactus breaks off if anything stands beside the spot it grows into (fences work, like Minecraft)
function growColumn(x,y,z,b){
  if(b===B.CACTUS) for(const [dx,dz] of DIRS){ const n=world.get(x+dx,y,z+dz); if(n!==0&&!(n>0&&BLOCKS[n].replace)){ spawnDrop(x+.5,y+.5,z+.5,B.CACTUS,1); return; } }
  world.set(x,y,z,b); }
/* ---------- random ticks: about four blocks per 16×16×16 section per tick, twenty ticks a second, within four chunks of the player ---------- */
const TICK=[];
let growAcc=0;
function stepGrowth(dt){ if(!world||world.preview) return; growAcc+=dt; let n=Math.min(3,Math.floor(growAcc/.05)); if(!n) return; growAcc-=n*.05;
  const pcx=Math.floor(player.x)>>4, pcz=Math.floor(player.z)>>4, per=Math.max(4,(world.H>>4)*4), R=4;
  while(n--) for(let cz=pcz-R;cz<=pcz+R;cz++) for(let cx=pcx-R;cx<=pcx+R;cx++){ const ch=world.chunk(cx,cz); if(!ch) continue; const bl=ch.blocks, L=bl.length;
    for(let k=0;k<per;k++){ const i=(Math.random()*L)|0, b=bl[i]; if(b&&TICK[b]){ const lx=i&15, lz=(i>>4)&15, y=(i>>8); TICK[b](cx*CS+lx,y,cz*CS+lz,b); } } } }
function skyAt(x,y,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||!ch.light||y<0||y>=world.H) return 15; return ch.light[((y*CS+(z&15))*CS+(x&15))*4]; }
function waterNear(x,y,z){ for(let dy=0;dy<=1;dy++) for(let dz=-4;dz<=4;dz++) for(let dx=-4;dx<=4;dx++) if(isW(world.get(x+dx,y+dy,z+dz))) return true; return false; }
for(const k of ['wheat','carrots','potatoes','beetroots','melon_stem','pumpkin_stem']) for(const id of CROPS[k].ids) TICK[id]=(x,y,z,b)=>{ const bd=BLOCKS[b], fb=world.get(x,y-1,z);
  if(!isFarmland(fb)){ breakBlock(x,y,z,null); return; }
  const p=fb===B.FARMLAND_WET?.5:.2;
  if(bd.age<bd.maxAge){ if(Math.random()<p) world.set(x,y,z,b+1); return; }
  if(bd.stem&&Math.random()<p*.6){ const fruit=bd.stem==='melon'?B.MELON:B.PUMPKIN; for(const [dx,dz] of DIRS) if(world.get(x+dx,y,z+dz)===fruit) return;
    const [dx,dz]=DIRS[rint(0,3)], g=world.get(x+dx,y-1,z+dz); if(world.get(x+dx,y,z+dz)===0&&[B.DIRT,B.GRASS,B.FARMLAND,B.FARMLAND_WET,B.PODZOL].includes(g)){ world.set(x+dx,y,z+dz,fruit); world.set(x,y,z,CROPS[bd.crop].att); } } };
for(const k of ['melon_stem','pumpkin_stem']){ const c=CROPS[k]; TICK[c.att]=(x,y,z)=>{ const fruit=k==='melon_stem'?B.MELON:B.PUMPKIN; if(!DIRS.some(([dx,dz])=>world.get(x+dx,y,z+dz)===fruit)) world.set(x,y,z,c.ids[3]); }; }
TICK[B.FARMLAND]=TICK[B.FARMLAND_WET]=(x,y,z,b)=>{ const wet=waterNear(x,y,z); if(wet){ if(b!==B.FARMLAND_WET) world.set(x,y,z,B.FARMLAND_WET); return; }
  if(b===B.FARMLAND_WET){ world.set(x,y,z,B.FARMLAND); return; } const up=world.get(x,y+1,z); if(!(up>0&&BLOCKS[up].crop)&&Math.random()<.3) world.set(x,y,z,B.DIRT); };
for(const w of WOODS) TICK[w.sapling]=(x,y,z)=>{ if(Math.random()<.12) growSapling(x,y,z); };
TICK[B.SUGAR_CANE]=TICK[B.CACTUS]=(x,y,z,b)=>{ if(world.get(x,y+1,z)!==0||Math.random()>.22) return; let n=1; while(n<3&&world.get(x,y-n,z)===b) n++; if(n>=3) return; growColumn(x,y+1,z,b); };
for(const id of BERRY) TICK[id]=(x,y,z,b)=>{ const s=BLOCKS[b].berry; if(s<3&&Math.random()<.15) world.set(x,y,z,BERRY[s+1]); };
for(const id of COCOA) TICK[id]=(x,y,z,b)=>{ if(BLOCKS[b].cocoa.age<2&&Math.random()<.18) world.set(x,y,z,b+1); };
TICK[B.DIRT]=(x,y,z)=>{ const up=world.get(x,y+1,z); if(!(up===0||up>0&&BLOCKS[up].replace&&!isW(up))||Math.random()>.3) return;
  for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++) if(world.get(x+dx,y+dy,z+dz)===B.GRASS){ world.set(x,y,z,B.GRASS); return; } };
TICK[B.GRASS]=(x,y,z)=>{ const up=world.get(x,y+1,z); if(up>0&&BLOCKS[up].opaque) world.set(x,y,z,B.DIRT); };
TICK[B.MUSH_R]=TICK[B.MUSH_BR]=(x,y,z,b)=>{ if(Math.random()>.05||skyAt(x,y,z)>12) return; let n=0; for(let dy=-1;dy<=1;dy++) for(let dz=-4;dz<=4;dz++) for(let dx=-4;dx<=4;dx++) if(world.get(x+dx,y+dy,z+dz)===b) n++; if(n>=5) return;
  const tx=x+rint(-1,1), ty=y+rint(-1,1), tz=z+rint(-1,1); if(world.get(tx,ty,tz)===0&&world.get(tx,ty-1,tz)>0&&BLOCKS[world.get(tx,ty-1,tz)].opaque&&skyAt(tx,ty,tz)<=12) world.set(tx,ty,tz,b); };
/* ---------- farming taps ---------- */
function farmTap(x,y,z,b){ const bd=b>0&&BLOCKS[b]; if(!bd) return false;
  if(bd.berry>=2){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } spawnDrop(x+.5,y+.6,z+.5,I.BERRIES,bd.berry===3?rint(2,3):rint(1,2)); world.set(x,y,z,BERRY[1]); return true; }
  if(bd.cake!==undefined){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } if(player.hp>=player.maxHp&&!creative()){ toast('You are already at full health'); return true; }
    player.hp=Math.min(player.maxHp,player.hp+2); hudDirty=true; world.set(x,y,z,bd.cake<6?CAKE[bd.cake+1]:B.AIR); toast('Ate a slice of cake · +1 heart'); return true; }
  return false; }
function farmUse(sx,sy,s,it){
  const r=pick(sx,sy); if(!r) return false; const [x,y,z]=r.hit, b=world.get(x,y,z), bd=b>0&&BLOCKS[b]; if(!bd) return false;
  const far=()=>{ if(reachOK(x,y,z)) return false; toast('Too far away'); return true; };
  if(it.type==='hoe'){ if(far()) return true; const up=world.get(x,y+1,z);
    if([B.GRASS,B.DIRT,B.PODZOL,B.MYCELIUM].includes(b)&&airish(up)){ if(up) world.set(x,y+1,z,B.AIR); world.set(x,y,z,B.FARMLAND); useTool(); chips(x,y,z,B.DIRT,8,2); return true; }
    toast('Till grass or dirt with open air above'); return true; }
  if(s.id===I.BONE_MEAL){ if(far()) return true; if(boneMeal(x,y,z)){ takeHeld(s); burst(x+.5,y+.8,z+.5,[120,230,110],10,1.6); } else toast('Bone meal does nothing here'); return true; }
  if(it.plants){ if(far()) return true; const k=it.plants, up=world.get(x,y+1,z);
    if(k==='berry'){ if([B.GRASS,B.DIRT,B.PODZOL,B.FARMLAND,B.FARMLAND_WET].includes(b)&&up===0){ world.set(x,y+1,z,BERRY[0]); takeHeld(s); return true; } return false; }
    if(isFarmland(b)&&up===0){ world.set(x,y+1,z,CROPS[k].ids[0]); takeHeld(s); return true; }
    if(!it.food){ toast('Plant it on farmland. Till grass or dirt with a hoe'); return true; } return false; }
  if(s.id===I.COCOA_BEANS){ if(far()) return true; const [px,py,pz]=r.prev||[]; const fi=FACE4.findIndex(f=>F4V[f][0]===x-px&&F4V[f][1]===z-pz);
    if(bd.log&&bd.wood==='jungle'&&r.prev&&py===y&&fi>=0&&world.get(px,py,pz)===0){ world.set(px,py,pz,COCOA[fi*3]); takeHeld(s); return true; }
    toast('Cocoa grows on the side of jungle logs'); return true; }
  if(it.tool==='axe'&&bd.log){ const w=WOODS.find(q=>q.k===bd.wood), to=w&&w.stripOf&&w.stripOf[b]; if(to){ if(far()) return true; world.set(x,y,z,to); useTool(); chips(x,y,z,b,8,2); return true; } }
  if(it.milk){ return false; }
  return false; }
function drinkMilk(s){ player.hp=Math.min(player.maxHp,player.hp+2); player.burn=0; player.frozen=0; hudDirty=true; if(!creative()){ inv.slots[inv.sel]=mkStack(I.BUCKET,1); invChanged(); } toast('Drank the milk'); }
// blocks that need the block under them (or the log beside them, for cocoa) come off when it goes
function supportBroken(x,y,z){
  const up=world.get(x,y+1,z), ub=up>0&&BLOCKS[up];
  if(ub&&(ub.support||ub.dbl===2)&&!ub.replace){ if(ub.cane||up===B.CACTUS){ let yy=y+1; while(world.get(x,yy,z)===up){ world.set(x,yy,z,B.AIR); if(!creative()) spawnDrop(x+.5,yy+.5,z+.5,up,1); yy++; } } else breakBlock(x,y+1,z,null); }
  for(const [dx,dz] of DIRS){ const c=world.get(x+dx,y,z+dz); if(c>0&&BLOCKS[c].cocoa){ const v=F4V[BLOCKS[c].cocoa.f]; if(v[0]===-dx&&v[1]===-dz) breakBlock(x+dx,y,z+dz,null); } } }
function doubleBroken(x,y,z,b){ const d=BLOCKS[b].dbl; if(!d) return; const oy=d===1?y+1:y-1, o=world.get(x,oy,z); if(o>0&&BLOCKS[o].dbl&&BLOCKS[o].dbl!==d) world.set(x,oy,z,B.AIR); }
