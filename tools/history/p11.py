F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

BLK11=r'''
/* ---------- stage 11 blocks: the Underworld ---------- */
NB('FIRE_CHALK'); def(B.FIRE_CHALK,'Fire chalk','#b8452e','#a83d28'); pat(B.FIRE_CHALK,PT.SAND,PT.SANDSTONE);
NB('FIRE_STONE'); def(B.FIRE_STONE,'Fire stone','#6e2219','#621e16'); pat(B.FIRE_STONE,PT.STONE);
NB('ASH'); def(B.ASH,'White ash','#e6e1dc','#d8d2cc'); pat(B.ASH,PT.SNOW,PT.CLAY);
NB('HELLSAND'); def(B.HELLSAND,'Hellsand','#7a4a34','#6e4230'); pat(B.HELLSAND,PT.GRAVEL);
NB('FIRE_GLASS'); def(B.FIRE_GLASS,'Fire glass','#ffb36a','#ffa65a',0,{opaque:false,tint:[1,.8,.55],glassy:170,emit:[13,8,3]}); pat(B.FIRE_GLASS,PT.GLASS);
for(const d of DYES){ d.fglass=NB('FGLASS_'+d.k); const e=vivid(d.dye).map(v=>Math.max(1,Math.round(v*.8))); def(d.fglass,d.name+' fire glass',d.dye,d.dye,0,{opaque:false,tint:hex(d.dye).map(v=>.35+v/255*.65),glassy:170,emit:d.k==='white'?[12,12,12]:d.k==='black'?[3,2,4]:e}); pat(d.fglass,PT.GLASS); }
NB('UPORTAL_X'); def(B.UPORTAL_X,'Underworld portal','#ff7a2a',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[15,7,2],portal:'x',under:1,noItem:1});
NB('UPORTAL_Z'); def(B.UPORTAL_Z,'Underworld portal','#ff7a2a',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[15,7,2],portal:'z',under:1,noItem:1});
'''
rep("for(const d of DYES){ d.elev=NB('ELEV_'+d.k);",BLK11+"for(const d of DYES){ d.elev=NB('ELEV_'+d.k);")
rep("NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});","NI('DEMON_BONE','Demon bone'); NI('DEMON_EYE','Demon eye');\nNI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});")
# progression: dusk blocks are now smelted from fire glass and a demon eye
rep("  r_(B.DUSK_BLOCK,1,['P','O'],{keys:{P:[I.DUSK_PEARL],O:[B.OBSIDIAN]},cat:'blocks'});","""  r_(I.BONE,3,['X'],{keys:{X:[I.DEMON_BONE]},cat:'items'}); r_(DYE_BY.white.item,4,['a','M'],{keys:{a:[I.DEMON_BONE]},cat:'items'});
  for(const d of DYES) r_(d.fglass,8,['GGG','GdG','GGG'],{keys:{G:[B.FIRE_GLASS],d:[d.item]},cat:'blocks'});""")
rep("{a:[B.COBBLE],out:B.STONE,time:6,tier:1},","{a:[B.COBBLE],out:B.STONE,time:6,tier:1},{a:[B.HELLSAND],out:B.FIRE_GLASS,time:8,tier:1},{a:[B.FIRE_GLASS,...DYES.map(d=>d.fglass)],b:[I.DEMON_EYE],bEvery:1,out:B.DUSK_BLOCK,time:20,tier:2},{a:[B.FIRE_STONE],out:B.FIRE_CHALK,time:4,tier:1},")
rep("const ORE_NAME={2:'stone',","spec([B.FIRE_CHALK,B.ASH],.5,'shovel'); spec(B.HELLSAND,.6,'shovel'); spec(B.FIRE_STONE,1.5,'pick',1); spec([B.FIRE_GLASS,...DYES.map(d=>d.fglass)],.45,'pick');\nconst ORE_NAME={2:'stone',")

GEN11=r'''
/* ---------- the Underworld: lava seas under a fire-stone ceiling, ash and hellsand shores, flame towers ---------- */
const LAVA_Y=24, TOWER_CELL=180;
class UnderGen{
  constructor(seed,size,H){ this.seed=seed; this.size=size; this.H=H; this.under=true; const N=k=>makeNoise(seed+k*4241); this.nA=N(1); this.nB=N(2); this.nC=N(3); this.nD=N(4); }
  height(x,z){ const a=fbm(this.nA,x*.012,z*.012,3), b=this.nB(x*.05,z*.05); return Math.max(4,Math.min(this.H-16,Math.floor(LAVA_Y-4+a*18+b*3))); }
  ceil(x,z){ return Math.floor(this.H-10+this.nC(x*.04,z*.04)*4); }
  sample(x,z){ return this.height(x,z); } biomeAt(){ return 0; } spawnOK(x,z){ return this.height(x,z); }
  tower(cx,cz){ if(hash2(cx,cz,this.seed+801)>.55) return null; return {x:cx*TOWER_CELL+40+(hash2(cx,cz,this.seed+802)*(TOWER_CELL-80)|0),z:cz*TOWER_CELL+40+(hash2(cx,cz,this.seed+803)*(TOWER_CELL-80)|0),floors:5+(hash2(cx,cz,this.seed+804)*4|0)}; }
  fill(ch){
    const {H,size,seed}=this, x0=ch.cx*CS, z0=ch.cz*CS, b=ch.blocks; ch.genTiles=[];
    const idx=(lx,y,lz)=>(y*CS+lz)*CS+lx, set=(lx,y,lz,v)=>{ if(y>0&&y<H&&lx>=0&&lz>=0&&lx<CS&&lz<CS) b[idx(lx,y,lz)]=v; };
    for(let lz=0;lz<CS;lz++)for(let lx=0;lx<CS;lx++){ const wx=x0+lx, wz=z0+lz; if(wx>=size||wz>=size) continue; const h=this.height(wx,wz), c=this.ceil(wx,wz), n=this.nD(wx*.06,wz*.06);
      b[idx(lx,0,lz)]=B.BEDROCK; b[idx(lx,H-1,lz)]=B.BEDROCK;
      for(let y=1;y<=h;y++) set(lx,y,lz,y>h-3?(y===h?(h>=LAVA_Y?(n>.35?B.ASH:n<-.3?B.HELLSAND:B.FIRE_CHALK):B.HELLSAND):B.FIRE_CHALK):B.FIRE_STONE);
      for(let y=h+1;y<=LAVA_Y;y++) set(lx,y,lz,B.LAVA);
      for(let y=c;y<H-1;y++) set(lx,y,lz,B.FIRE_STONE);
      // stalactites and fire-stone pillars
      const p=this.nB(wx*.11,wz*.11); if(p>.55){ const len=Math.floor((p-.55)*40); for(let y=c-len;y<c;y++) set(lx,y,lz,B.FIRE_STONE); }
      if(p<-.72) for(let y=Math.max(h,LAVA_Y);y<c;y++) set(lx,y,lz,B.FIRE_STONE);
      if(h>=LAVA_Y&&hash2(wx,wz,seed+5)<.006) set(lx,h+1,lz,B.FIRE); }
    const orng=mulberry32((seed^Math.imul(ch.cx+3,73856093)^Math.imul(ch.cz+5,19349663))>>>0);
    for(const [id,y0,y1,nv,sz] of [[B.ORE_GOLD,4,40,5,6],[B.ORE_DIAMOND,4,30,.8,3],[B.ORE_SILVER,4,40,2,4]])
      for(let v=0,nn=Math.floor(nv)+(orng()<nv%1?1:0);v<nn;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=y0+(orng()*(y1-y0)|0); const n=2+(orng()*sz|0);
        for(let k=0;k<n;k++){ if(x>=0&&z>=0&&x<CS&&z<CS&&y>0&&y<H){ const i=idx(x,y,z); if(b[i]===B.FIRE_STONE) b[i]=id; } const r=orng()*6|0; if(r===0)x++; else if(r===1)x--; else if(r===2)z++; else if(r===3)z--; else if(r===4)y++; else y--; } }
    // flame towers: a great obsidian keep with two lesser towers joined by bridges
    const tcx=Math.floor((x0+8)/TOWER_CELL), tcz=Math.floor((z0+8)/TOWER_CELL);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){ const T=this.tower(tcx+dx,tcz+dz); if(!T) continue; if(Math.abs(T.x-x0-8)>60||Math.abs(T.z-z0-8)>60) continue;
      const parts=[{x:T.x,z:T.z,h:9,f:T.floors},{x:T.x+26,z:T.z+4,h:5,f:T.floors-2},{x:T.x-22,z:T.z-14,h:5,f:T.floors-2}], FH=6, base=LAVA_Y-3;
      for(const P of parts){ for(let qz=-P.h;qz<=P.h;qz++)for(let qx=-P.h;qx<=P.h;qx++){ if(Math.abs(qx)+Math.abs(qz)>P.h*1.6) continue; const wx=P.x+qx, wz=P.z+qz, lx=wx-x0, lz=wz-z0; if(lx<0||lz<0||lx>=CS||lz>=CS) continue;
          const wall=Math.abs(qx)===P.h||Math.abs(qz)===P.h||Math.abs(qx)+Math.abs(qz)>=Math.floor(P.h*1.6)-1, top=base+P.f*FH+6;
          for(let y=base;y<=top;y++){ const f=Math.floor((y-base)/FH)-1, fy=(y-base)%FH; let v=B.AIR;
            if(y<base+FH) v=B.OBSIDIAN; else if(fy===0) v=(qx===P.h-2&&qz===0)?B.AIR:B.OBSIDIAN;
            else if(wall){ const win=(fy===2||fy===3)&&((qx+qz)&3)===0; v=win?B.FIRE_GLASS:B.OBSIDIAN; if(f===0&&qz===P.h&&Math.abs(qx)<=1&&fy<4) v=B.AIR; }
            else if(qx===P.h-2&&qz===0) v=B.LADDER_W;
            else if(qx===0&&qz===0&&fy===FH-1) v=B.FIRE_GLASS;
            if(y===top) v=wall?(((qx+qz)&1)?B.OBSIDIAN:B.AIR):B.OBSIDIAN;
            set(lx,y,lz,v);
            if(!wall&&fy===1&&f>=0&&f<P.f&&qx===-2&&qz===2-(f%2)*4&&hash2(P.x+f,P.z,seed+806)<.9){ set(lx,y,lz,B.CHEST_WOOD); ch.genTiles.push({x:wx,y,z:wz,loot:'tower',seed:hash2(wx,y,seed+807)*1e9|0}); } } }
        }
      // bridges at the second floor
      for(const P of parts.slice(1)){ const by=base+FH*2, L=Math.hypot(P.x-T.x,P.z-T.z); for(let t=0;t<=L;t+=.5){ const wx=Math.round(T.x+(P.x-T.x)*t/L), wz=Math.round(T.z+(P.z-T.z)*t/L);
          for(let o=-1;o<=1;o++){ const lx=wx+o-x0, lz=wz-z0; if(lx<0||lz<0||lx>=CS||lz>=CS) continue; const cur=b[idx(lx,by,lz)]; if(cur===B.AIR||cur===B.LAVA) set(lx,by,lz,B.OBSIDIAN); if(Math.abs(o)===1&&b[idx(lx,by+1,lz)]===B.AIR) set(lx,by+1,lz,B.FENCE); } } }
    }
  }
}
'''
rep("// an empty void for pocket rooms",GEN11+"// an empty void for pocket rooms")
rep("    this.gen=meta.dim==='dusk'?new DuskGen(","    this.gen=meta.dim==='under'?new UnderGen(this.seed,this.size,this.H):meta.dim==='dusk'?new DuskGen(")
# dimensions: remember the overworld's size so you always come home to the right world; 8:1 scale for the Underworld
rep("const DIMS={dusk:{H:88,name:'The Dusk'},pocket:{H:48,name:'Pocket dimension',size:4096}};",
    "const DIMS={dusk:{H:88,name:'The Dusk'},pocket:{H:48,name:'Pocket dimension',size:4096},under:{H:64,name:'The Underworld',scale:8}};\nconst dimSize=(dim,base)=>!dim?base:DIMS[dim].size||(DIMS[dim].scale?Math.max(128,Math.ceil(base/DIMS[dim].scale)):base);\nconst dimSeed=(dim,s0)=>(s0^(dim==='dusk'?0x5eed:dim==='under'?0xf17e:0xbeef))>>>0;")
rep("  const cur=world.meta; saveGame(); const base={...cur}; delete base.dim; const meta=dim?{...base,dim,height:DIMS[dim].H,size:DIMS[dim].size||base.size,seedNum:(base.seedNum^(dim==='dusk'?0x5eed:0xbeef))>>>0}:{...base,height:base.height};",
    "  const cur=world.meta; saveGame(); const base={...cur}; delete base.dim; base.baseSize=cur.baseSize||cur.size; base.baseSeed=cur.baseSeed??cur.seedNum; const meta=dim?{...base,dim,height:DIMS[dim].H,size:dimSize(dim,base.baseSize),seedNum:dimSeed(dim,base.baseSeed)}:{...base,height:base.height,size:base.baseSize,seedNum:base.baseSeed};")
rep("  const m={...meta,dim:cur.dim,baseH:meta.height,height:DIMS[cur.dim].H,size:DIMS[cur.dim].size||meta.size,seedNum:(meta.seedNum^(cur.dim==='dusk'?0x5eed:0xbeef))>>>0};",
    "  const m={...meta,dim:cur.dim,baseH:meta.height,baseSize:meta.size,baseSeed:meta.seedNum,height:DIMS[cur.dim].H,size:dimSize(cur.dim,meta.size),seedNum:dimSeed(cur.dim,meta.seedNum)};")
# portals: obsidian frames lead to the Underworld, dusk block frames to the Dusk
rep("function tryPortal(x,y,z){ if(world.get(x,y,z)!==B.AIR&&!BLOCKS[world.get(x,y,z)]?.fire) return false;\n  for(const ax of ['x','z']){ const seen=new Set(), q=[[x,y,z]], cells=[]; let ok=true;",
    "function tryPortal(x,y,z){ if(world.get(x,y,z)!==B.AIR&&!BLOCKS[world.get(x,y,z)]?.fire) return false;\n  for(const ax of ['x','z']){ const seen=new Set(), q=[[x,y,z]], cells=[]; let ok=true, frame=0;")
rep("      if(v===B.DUSK_BLOCK) continue; if(v!==B.AIR&&!BLOCKS[v]?.fire){ ok=false; break; }",
    "      if(v===B.DUSK_BLOCK||v===B.OBSIDIAN){ if(frame&&frame!==v){ ok=false; break; } frame=v; continue; } if(v!==B.AIR&&!BLOCKS[v]?.fire){ ok=false; break; }")
rep("    if(ok&&cells.length>=2){ for(const c of cells) world.set(...c,ax==='x'?B.PORTAL_X:B.PORTAL_Z); toast('The portal hums open'); burst(x+.5,y+.5,z+.5,[180,108,255],30,3); return true; } }",
    "    if(ok&&cells.length>=2&&frame){ const U=frame===B.OBSIDIAN; for(const c of cells) world.set(...c,U?(ax==='x'?B.UPORTAL_X:B.UPORTAL_Z):(ax==='x'?B.PORTAL_X:B.PORTAL_Z)); toast(U?'The portal roars to life':'The portal hums open'); burst(x+.5,y+.5,z+.5,U?[255,130,40]:[180,108,255],30,3); return true; } }")
rep("function buildPortalAt(x,y,z){ // a 4×5 dusk block frame with a 2×3 opening, plus a little platform\n  for(let dx=-1;dx<=4;dx++)for(let dz=-2;dz<=2;dz++){ world.set(x+dx,y-1,z+dz,B.DUSK_BRICK); for(let dy=0;dy<5;dy++) world.set(x+dx,y+dy,z+dz,B.AIR); }\n  for(let dx=0;dx<4;dx++)for(let dy=0;dy<5;dy++){ const edge=dx===0||dx===3||dy===0||dy===4; world.set(x+dx,y+dy,z,edge?B.DUSK_BLOCK:B.PORTAL_X); } }",
    "function buildPortalAt(x,y,z,under){ // a 4×5 frame with a 2×3 opening, plus a little platform\n  for(let dx=-1;dx<=4;dx++)for(let dz=-2;dz<=2;dz++){ world.set(x+dx,y-1,z+dz,under?B.OBSIDIAN:B.DUSK_BRICK); for(let dy=0;dy<5;dy++) world.set(x+dx,y+dy,z+dz,B.AIR); }\n  for(let dx=0;dx<4;dx++)for(let dy=0;dy<5;dy++){ const edge=dx===0||dx===3||dy===0||dy===4; world.set(x+dx,y+dy,z,edge?(under?B.OBSIDIAN:B.DUSK_BLOCK):(under?B.UPORTAL_X:B.PORTAL_X)); } }")
rep("function findPortalNear(x,y,z){ for(let r=0;r<20;r++) for(let dy=-12;dy<=12;dy++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; if(BLOCKS[world.get(x+dx,y+dy,z+dz)]?.portal) return [x+dx,y+dy,z+dz]; } return null; }",
    "function findPortalNear(x,y,z,under){ for(let r=0;r<20;r++) for(let dy=-14;dy<=14;dy++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; const bd=BLOCKS[world.get(x+dx,y+dy,z+dz)]; if(bd?.portal&&!!bd.under===!!under) return [x+dx,y+dy,z+dz]; } return null; }\n// a standing spot in a cave-like dimension: solid floor with two free blocks above, not in lava\nfunction floorNear(x,y,z){ for(let r=0;r<12;r++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; for(let dy=0;dy<20;dy++) for(const yy of [y+dy,y-dy]){ const X=x+dx, Z=z+dz; if(world.solid(X,yy-1,Z)&&!BLOCKS[world.get(X,yy-1,Z)]?.lava&&world.get(X,yy,Z)===B.AIR&&world.get(X,yy+1,Z)===B.AIR) return [X,yy,Z]; } } return null; }")
rep("""      const toDusk=!inDusk(); switchDim(toDusk?'dusk':null,[X+.5,60,Z+.5],()=>{ const y0=world.gen.height?world.surface(X,Z):30; const f=findPortalNear(X,y0,Z); if(f){ player.x=f[0]+.5; player.y=f[1]; player.z=f[2]+1.5; } else { const y=Math.max(SEA+2,world.surface(X,Z)+1); buildPortalAt(X-1,y,Z); player.x=X+1.5; player.y=y; player.z=Z+1.6; } player.fallTop=player.y; }); } }""",
"""      const U=!!BLOCKS[b].under, here=world.meta.dim||null, to=U?(here==='under'?null:'under'):(here==='dusk'?null:'dusk');
      const k=to==='under'?1/8:here==='under'?8:1, TX=Math.floor(X*k), TZ=Math.floor(Z*k);
      switchDim(to,[TX+.5,40,TZ+.5],()=>{ const X2=Math.max(3,Math.min(world.size-6,TX)), Z2=Math.max(3,Math.min(world.size-6,TZ)); const cave=world.gen.under;
        const y0=cave?LAVA_Y+4:world.surface(X2,Z2); const f=findPortalNear(X2,y0,Z2,U);
        if(f){ player.x=f[0]+.5; player.y=f[1]; player.z=f[2]+1.5; }
        else { let y; if(cave){ const fl=floorNear(X2,LAVA_Y+3,Z2); y=fl?fl[1]:LAVA_Y+3; } else y=Math.max(SEA+2,world.surface(X2,Z2)+1);
          buildPortalAt(X2-1,y,Z2,U); player.x=X2+1.5; player.y=y; player.z=Z2+1.6; }
        player.fallTop=player.y; }); } }""")
rep("const inDusk=()=>world&&world.meta.dim==='dusk', inPocket=()=>world&&world.meta.dim==='pocket';","const inDusk=()=>world&&world.meta.dim==='dusk', inPocket=()=>world&&world.meta.dim==='pocket', inUnder=()=>world&&world.meta.dim==='under';")
# sky & fog for the Underworld
rep("  if(world&&world.meta.dim==='dusk'){","  if(world&&world.meta.dim==='under'){ sun[0]=.55; sun[1]=.25; sun[2]=.15; sky[0]=.3; sky[1]=.07; sky[2]=.03; gl.uniform1f(U.uAmb,.2); } else if(world&&world.meta.dim==='dusk'){")
rep("else if(world.meta.dim==='dusk') gl.uniform2f(U.uFogR,14,fr-10);","else if(world.meta.dim==='dusk') gl.uniform2f(U.uFogR,14,fr-10); else if(world.meta.dim==='under') gl.uniform2f(U.uFogR,8,fr-16);")
rep("function clockText(){ const d=dayInfo(); if(d.still) return inDusk()?'The Dusk · timeless':'Pocket dimension';","function clockText(){ const d=dayInfo(); if(d.still) return inDusk()?'The Dusk · timeless':inUnder()?'The Underworld':'Pocket dimension';")
rep("  if(inDusk()&&Math.random()<dt*25) parts.push(","  if(inUnder()&&Math.random()<dt*30) parts.push({x:p.x+(Math.random()-.5)*24,y:p.y+Math.random()*6-2,z:p.z+(Math.random()-.5)*24,vx:(Math.random()-.5)*.4,vy:.5+Math.random(),vz:(Math.random()-.5)*.4,t:2.5,c:[255,120+Math.random()*80|0,40],s:.05,ember:true});\n  if(inDusk()&&Math.random()<dt*25) parts.push(")
# ---------- mobs: spiders, bats, fire demons, lava slimes ----------
rep("  sheep:{hp:8,","""  spider:{hp:16,speed:2.7,w:1.3,h:.85,food:[],hostile:1,drops:()=>[[I.STRING,rint(0,2)]],name:'Spider'},
  bat:{hp:3,speed:3,w:.5,h:.5,food:[],drops:()=>[],name:'Bat',fly:1},
  demon:{hp:30,speed:2.4,w:.7,h:2.2,food:[],hostile:1,fireproof:1,drops:()=>[[I.DEMON_BONE,rint(0,2)],[I.DEMON_EYE,Math.random()<.35?1:0]],name:'Fire demon'},
  sheep:{hp:8,""")
# lava slimes are orange slimes that ignore lava
rep("  for(const m of mobs){ const b=world.get(Math.floor(m.x),Math.floor(m.y+.2),Math.floor(m.z)); if(BLOCKS[b]?.lava){","  for(const m of mobs){ if(MOB[m.type].fireproof||m.magma) continue; const b=world.get(Math.floor(m.x),Math.floor(m.y+.2),Math.floor(m.z)); if(BLOCKS[b]?.lava){")
rep("  if(m.type==='slime'){ const r=.35+m.size*.3;","  if(m.type==='slime'&&m.magma&&m.atkT<=0&&dist<.6+m.size*.4){ player.fireT=Math.max(player.fireT||0,2); }\n  if(m.type==='slime'){ const r=.35+m.size*.3;")
rep("  if(m.type==='zombie'){\n    if(dist<1.25&&dy<1.6&&m.atkT<=0){","""  if(m.type==='spider'){ const night=!dayInfo().day||inUnder(); if(!night&&!(m.aggro>0)) return null;
    if(dist<1.4&&dy<1.4&&m.atkT<=0){ m.atkT=1; hurt(2,'Bitten by a spider'); const l=dist||1; p.vx+=(p.x-m.x)/l*5; p.vz+=(p.z-m.z)/l*5; }
    if(m.blocked&&m.onGround!==undefined) m.vy=Math.max(m.vy,3.6);   // spiders climb walls
    return dist>1.1?[p.x-m.x,p.z-m.z,d.speed]:[0,0,0]; }
  if(m.type==='demon'){ m.shootT=(m.shootT??2)-dt;
    if(m.weapon==='staff'){ if(m.shootT<=0&&dist<18){ m.shootT=2.2+Math.random(); const o=[m.x,m.y+1.6,m.z], t=[p.x,p.y+1,p.z], v=[t[0]-o[0],t[1]-o[1],t[2]-o[2]], l=Math.hypot(...v)||1, sp=16;
        arrows.push({id:I.SARROW,dmg:4,hostile:true,fireball:true,x:o[0]+v[0]/l*.8,y:o[1],z:o[2]+v[2]/l*.8,vx:v[0]/l*sp,vy:v[1]/l*sp+l*.08,vz:v[2]/l*sp,stuck:false,t:0,noPick:true}); m.draw=.4; }
      if(dist>12) return [p.x-m.x,p.z-m.z,d.speed]; if(dist<6) return [m.x-p.x,m.z-p.z,d.speed*.8]; return [0,0,0]; }
    const dmg=m.weapon==='sword'?6:4, cd=m.weapon==='knife'?.6:1.1;
    if(dist<1.4&&dy<1.8&&m.atkT<=0){ m.atkT=cd; m.swing=.3; hurt(dmg,'Slain by a fire demon'); if(Math.random()<.4) player.fireT=Math.max(player.fireT||0,3); const l=dist||1; p.vx+=(p.x-m.x)/l*5; p.vz+=(p.z-m.z)/l*5; }
    return dist>1.1?[p.x-m.x,p.z-m.z,d.speed*(m.weapon==='knife'?1.25:1)]:[0,0,0]; }
  if(m.type==='zombie'){
    if(dist<1.25&&dy<1.6&&m.atkT<=0){""")
# spiders and demons don't burn in daylight
rep("  if(m.type!=='slime'&&!inDusk()&&dayInfo().day&&dayInfo().k>.6&&L[0]>200){","  if(m.type!=='slime'&&m.type!=='spider'&&!MOB[m.type].fireproof&&!world.meta.dim&&dayInfo().day&&dayInfo().k>.6&&L[0]>200){")
# remember when a mob ran into a wall (spider climbing)
rep("    if(l>.01&&(safeAhead(m,gx,gz)||hv&&","    m.blocked=false;\n    if(l>.01&&(safeAhead(m,gx,gz)||hv&&")
rep("const vx=gx/l*sp, vz=gz/l*sp; if(mobMove(m,vx,vz,dt,true)) m.timer=0;","const vx=gx/l*sp, vz=gz/l*sp; if(mobMove(m,vx,vz,dt,m.type!=='spider')){ m.timer=0; m.blocked=true; }")
# bats flutter about instead of walking
rep("    stepMobDots(m,dt); if(m.dead) continue; if(m.frozen>0) sp*=.25;","""    stepMobDots(m,dt); if(m.dead) continue; if(m.frozen>0) sp*=.25;
    if(d.fly){ m.timer-=dt; if(m.timer<=0||Math.hypot(m.tx-m.x,m.tz-m.z)<.5){ m.timer=1+Math.random()*2; m.tx=m.x+(Math.random()-.5)*8; m.tz=m.z+(Math.random()-.5)*8; m.ty=m.y+(Math.random()-.5)*3; }
      const gx2=m.tx-m.x, gz2=m.tz-m.z, gy=(m.ty??m.y)-m.y, l2=Math.hypot(gx2,gz2,gy)||1, nx=m.x+gx2/l2*d.speed*dt, ny=m.y+gy/l2*d.speed*dt+Math.sin(performance.now()/90+m.phase)*.02, nz=m.z+gz2/l2*d.speed*dt;
      if(!world.solid(Math.floor(nx),Math.floor(ny),Math.floor(nz))&&!world.solid(Math.floor(nx),Math.floor(ny+.5),Math.floor(nz))){ m.x=nx; m.y=ny; m.z=nz; } else m.timer=0;
      m.face=Math.atan2(gx2,gz2); m.phase+=dt*30; continue; }""")
# spawning: spiders, bats, the Underworld's own creatures
rep("    else spawnMob(Math.random()<.55?'zombie':'skeleton',x+.5,y+1,z+.5,false); return; }",
    "    else { const q=Math.random(); spawnMob(q<.42?'zombie':q<.78?'skeleton':'spider',x+.5,y+1,z+.5,false); if(Math.random()<.25) spawnMob('bat',x+.5,y+2.5,z+.5,false); } return; }")
rep("  if(inPocket()) return; const n=mobs.filter(m=>MOB[m.type].hostile).length,","""  if(inPocket()) return;
  if(inUnder()){ const n=mobs.filter(m=>MOB[m.type].hostile).length; if(n>=14) return;
    for(let k=0;k<8;k++){ const a=Math.random()*6.28, d=14+Math.random()*22; let x=Math.floor(player.x+Math.cos(a)*d), z=Math.floor(player.z+Math.sin(a)*d);
      if(x<2||z<2||x>=world.size-2||z>=world.size-2||!world.chunk(x>>4,z>>4)) continue; const f=floorNear(x,Math.floor(player.y),z); if(!f) continue;
      const nearTower=(()=>{ const g=world.gen, T=g.tower(Math.floor(x/TOWER_CELL),Math.floor(z/TOWER_CELL)); return T&&Math.hypot(T.x-x,T.z-z)<40; })();
      if(Math.random()<(nearTower?.75:.5)){ spawnMob('demon',f[0]+.5,f[1],f[2]+.5,false); const m=mobs[mobs.length-1]; m.weapon=['staff','knife','sword'][Math.random()*3|0]; }
      else { spawnMob('slime',f[0]+.5,f[1],f[2]+.5,false); const m=mobs[mobs.length-1]; m.size=[1,2,3][Math.random()*3|0]; m.col=SLIMES.findIndex(q=>q.k==='orange'); m.magma=1; m.hp=m.size*m.size*3; }
      return; } return; }
  const n=mobs.filter(m=>MOB[m.type].hostile).length,""")
rep("    if(m.type==='slime'&&m.size>1) for(let k=0;k<2+(Math.random()*2|0);k++){ spawnMob('slime',m.x+(Math.random()-.5),m.y+.2,m.z+(Math.random()-.5),false); const c=mobs[mobs.length-1]; c.size=m.size-1; c.col=m.col;",
    "    if(m.type==='slime'&&m.size>1) for(let k=0;k<2+(Math.random()*2|0);k++){ spawnMob('slime',m.x+(Math.random()-.5),m.y+.2,m.z+(Math.random()-.5),false); const c=mobs[mobs.length-1]; c.size=m.size-1; c.col=m.col; c.magma=m.magma;")
# fireballs hit and set you alight; render them as glowing balls
rep("if(a.hostile&&Math.abs(player.x-a.x)<.45&&Math.abs(player.z-a.z)<.45&&a.y>player.y&&a.y<player.y+ph()){ hurt(a.dmg,'Shot by a skeleton');",
    "if(a.hostile&&Math.abs(player.x-a.x)<.45&&Math.abs(player.z-a.z)<.45&&a.y>player.y&&a.y<player.y+ph()){ hurt(a.dmg,a.fireball?'Burned by a fire demon':'Shot by a skeleton'); if(a.fireball) player.fireT=Math.max(player.fireT||0,4);")
rep("  for(const a of arrows){ setVL(sampleLight(a.x,a.y,a.z));","  for(const a of arrows){ if(a.fireball){ if(a.stuck) continue; setVL(VL_EMISSIVE); emitBox(dynVB,[a.x-.16,a.y-.16,a.z-.16],[a.x+.16,a.y+.16,a.z+.16],[255,120,30],IDT); emitBox(dynVB,[a.x-.09,a.y-.09,a.z-.09],[a.x+.09,a.y+.09,a.z+.09],[255,230,140],IDT); if(Math.random()<.5) parts.push({x:a.x,y:a.y,z:a.z,vx:0,vy:.5,vz:0,t:.4,c:[255,150,40],s:.07,ember:true}); continue; }\n    setVL(sampleLight(a.x,a.y,a.z));")
# models
rep("  else if(m.type==='walker'){","""  else if(m.type==='spider'){ const c=[48,40,40], ws=m.moving?Math.sin(m.phase*1.6):0;
    box([-.3,.25,-.55],[.3,.6,.05],c); box([-.36,.2,.05],[.36,.65,.6],[40,32,32]); box([-.22,.35,-.75],[.22,.6,-.5],c);
    box([-.15,.45,-.76],[-.07,.52,-.74],[220,30,30]); box([.07,.45,-.76],[.15,.52,-.74],[220,30,30]);
    for(let i=0;i<4;i++) for(const sd of [-1,1]){ const z=-.45+i*.15, a=(i%2?1:-1)*ws*.4*sd; box([sd>0?.3:-.95,.32,z-.03],[sd>0?.95:-.3,.38,z+.03],c,T(.35,z,a)); box([sd>0?.9:-.96,0,z-.03],[sd>0?.96:-.9,.36,z+.03],c,T(.35,z,a)); } }
  else if(m.type==='bat'){ const c=[60,46,36], f=Math.sin(m.phase)*.9;
    box([-.08,0,-.08],[.08,.22,.08],c); box([-.07,.22,-.07],[.07,.32,.07],c); box([-.05,.27,.07],[-.02,.3,.08],[230,60,60]); box([.02,.27,.07],[.05,.3,.08],[230,60,60]);
    box([-.4,.12,-.05],[-.08,.15,.12],[40,30,26],T(.14,0,f)); box([.08,.12,-.05],[.4,.15,.12],[40,30,26],T(.14,0,-f)); }
  else if(m.type==='demon'){ const sk=[178,40,30], dk=[70,16,12], ws=m.moving?Math.sin(m.phase)*.6:0, arm=m.swing>0?-1.8+Math.sin(m.swing*20)*.5:m.draw>0?-1.5:ws*.6-.3;
    box([-.24,0,-.12],[-.03,.9,.12],dk,T(.9,0,ws)); box([.03,0,-.12],[.24,.9,.12],dk,T(.9,0,-ws)); box([-.3,.9,-.16],[.3,1.65,.16],sk);
    box([-.46,.92,-.09],[-.3,1.6,.09],sk,T(1.55,0,arm)); box([.3,.92,-.09],[.46,1.6,.09],sk,T(1.55,0,ws*-.6));
    box([-.24,1.65,-.24],[.24,2.1,.24],sk); box([-.28,2.0,-.06],[-.2,2.3,.04],[30,24,22]); box([.2,2.0,-.06],[.28,2.3,.04],[30,24,22]);
    setVL(VL_EMISSIVE); box([-.15,1.84,.235],[-.05,1.92,.25],[255,210,60]); box([.05,1.84,.235],[.15,1.92,.25],[255,210,60]); setVL(sampleLight(m.x,m.y+1,m.z));
    const W=m.weapon||'sword', H=T(1.55,0,arm);
    if(W==='staff'){ box([-.41,.3,.0],[-.35,2.0,.06],[60,40,30],H); setVL(VL_EMISSIVE); box([-.45,2.0,-.04],[-.31,2.14,.1],[255,140,40],H); }
    else if(W==='sword'){ box([-.42,.95,.0],[-.34,1.6,.08],[40,40,46],H); box([-.41,.3,.02],[-.35,.95,.06],[200,60,40],H); }
    else box([-.41,.7,.02],[-.35,.95,.06],[200,200,210],H); }
  else if(m.type==='walker'){""")
rep("  else if(m.type==='slime'){ const c=hex(SLIMES[m.col||0].d.dye), sq=m.onGround?.06:-.04;","  else if(m.type==='slime'){ const c=m.magma?[200,60,20]:hex(SLIMES[m.col||0].d.dye), sq=m.onGround?.06:-.04; if(m.magma){ setVL(VL_EMISSIVE); box([-.3,.15,-.3],[.3,.65,.3],[255,170,40]); setVL(sampleLight(m.x,m.y+.5,m.z)); }")
# icons
rep("    if(it.telelink){","    if(id===I.DEMON_BONE){ g.strokeStyle='#5a1a14'; g.lineWidth=7; g.lineCap='round'; g.beginPath(); g.moveTo(16,44); g.lineTo(44,16); g.stroke(); g.fillStyle='#5a1a14'; for(const [x,y] of [[12,42],[18,48],[42,12],[48,18]]){ g.beginPath(); g.arc(x,y,6,0,7); g.fill(); } return c; }\n    if(id===I.DEMON_EYE){ g.fillStyle='#f4e7c8'; g.beginPath(); g.arc(30,30,18,0,7); g.fill(); g.fillStyle='#ff8a1e'; g.beginPath(); g.arc(30,30,10,0,7); g.fill(); g.fillStyle='#200'; g.beginPath(); g.ellipse(30,30,3,8,0,0,7); g.fill(); return c; }\n    if(it.telelink){")
rep("||it.instrument||it.disc||id===I.DISC_BLANK||it.telelink||it.lore||it.expander||it.starter||id===I.DUSK_CRYSTAL","||id===I.DEMON_BONE||id===I.DEMON_EYE||it.instrument||it.disc||id===I.DISC_BLANK||it.telelink||it.lore||it.expander||it.starter||id===I.DUSK_CRYSTAL")
# tower loot
rep("function lootChest(t){ const r=mulberry32(t.seed>>>0), out=new Array(27).fill(null), put=(id,n,x)=>{ const i=r()*27|0; if(!out[i]) out[i]=Object.assign({id,n},x?{x}:{}); };",
    """function lootChest(t){ const r=mulberry32(t.seed>>>0), out=new Array(27).fill(null), put=(id,n,x)=>{ const i=r()*27|0; if(!out[i]) out[i]=Object.assign({id,n},x?{x}:{}); };
  if(t.loot==='tower'){ const n=4+(r()*6|0); for(let k=0;k<n;k++){ const q=r();
      if(q<.2) put(I.GOLD,2+(r()*6|0)); else if(q<.3) put(I.DIAMOND,1+(r()*3|0)); else if(q<.42) put(I.DEMON_BONE,2+(r()*4|0)); else if(q<.5) put(I.DEMON_EYE,1);
      else if(q<.6) put(B.FIRE_GLASS,4+(r()*12|0)); else if(q<.68) put(B.OBSIDIAN,2+(r()*6|0)); else if(q<.78){ const ks=Object.keys(ENCH), kk=ks[r()*ks.length|0]; put(I.GRIMOIRE,1,{g:{k:kk,lv:1+(r()*ENCH[kk].max|0)}}); }
      else if(q<.85) put(I.XP_BOOK,1,{xp:60+(r()*200|0)}); else if(q<.92) put(GEN['steel:sword']||I.IRON,1); else put(I.SADDLE,1); } return out; }""")
# fire starter can now be used on obsidian frames (already via lightPortalAt). Player can be hurt by lava and fire in the Underworld: no change.
open(F,'w').write(s); print('ok')
