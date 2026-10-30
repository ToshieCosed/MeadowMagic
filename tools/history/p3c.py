F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep("const isGlass=b=>b>=B.GLASS&&b<=B.GLASS_B;","const isGlass=b=>b>0&&!!BLOCKS[b].tint&&!BLOCKS[b].wl;\nconst isLiquid=b=>b===B.WATER||b===B.FALL;\nconst sh3=(c,k)=>[Math.min(255,c[0]*k)|0,Math.min(255,c[1]*k)|0,Math.min(255,c[2]*k)|0];")
rep("""    const b=pad[pI(x,y,z)]; if(b===0) continue;
    const bd=BLOCKS[b], wx=x0+x, wz=z0+z;
    const jit=.93+hash2(wx+y*7,wz-y*3,seed)*.12;
    if(bd.plant){ setVLcell(x,y,z); emitPlant(vbL,wx,y,wz,bd,jit); continue; }""",
"""    const b=pad[pI(x,y,z)]; if(b===0) continue;
    const bd=BLOCKS[b], wx=x0+x, wz=z0+z; PAT=0;
    const bio=ch.bio?BIO[ch.bio[z*CS+x]]:null, tc=(bd.btint&&bio)?(bd.btint==='grass'?bio.grass:bd.btint==='lily'?null:bio.foliage):null;
    const jit=.93+hash2(wx+y*7,wz-y*3,seed)*.12;
    if(bd.plant){ setVLcell(x,y,z); emitPlant(vbL,wx,y,wz,bd,jit,tc); continue; }
    if(bd.mush){ setVLcell(x,y,z); const red=b===B.MUSH_R, ox=wx+.5, oz=wz+.5;
      emitBox(vbO,[ox-.06,y,oz-.06],[ox+.06,y+.28,oz+.06],bd.stem,IDT); PAT=red?PT.CAP:PT.NONE;
      if(red) emitBox(vbO,[ox-.17,y+.24,oz-.17],[ox+.17,y+.44,oz+.17],bd.top,IDT); else emitBox(vbO,[ox-.22,y+.24,oz-.22],[ox+.22,y+.33,oz+.22],bd.top,IDT); continue; }
    if(bd.lily){ setVLcell(x,y,z); PAT=PT.LEAF; const h1=hash2(wx,wz,seed+3)*.3;
      quadRaw(vbO,[[wx+.06+h1*.1,y+.02,wz+.08],[wx+.94,y+.02,wz+.06+h1*.1],[wx+.92,y+.02,wz+.94],[wx+.08,y+.02,wz+.9]],bd.top,1); continue; }
    if(bd.vine){ setVLcell(x,y,z); PAT=PT.LEAF; const [dx,dz]=LADDER_DIR[b], c=sh3(tc||bd.top,.88*jit), o=.47;
      const q=dx?[[wx+.5+dx*o,y,wz],[wx+.5+dx*o,y,wz+1],[wx+.5+dx*o,y+1,wz+1],[wx+.5+dx*o,y+1,wz]]:[[wx,y,wz+.5+dz*o],[wx+1,y,wz+.5+dz*o],[wx+1,y+1,wz+.5+dz*o],[wx,y+1,wz+.5+dz*o]];
      quadRaw(vbL,q,c,1); continue; }
    if(bd.cactus){ setVLcell(x,y,z); PAT=PT.CACTUS; emitBox(vbO,[wx+.0625,y,wz+.0625],[wx+.9375,y+1,wz+.9375],bd.side,IDT); PAT=PT.SPECK;
      if(at(x,y+1,z)!==B.CACTUS) quadRaw(vbO,[[wx+.0625,y+1.001,wz+.0625],[wx+.9375,y+1.001,wz+.0625],[wx+.9375,y+1.001,wz+.9375],[wx+.0625,y+1.001,wz+.9375]],bd.top,1); continue; }
    if(b===B.FALL){ PAT=PT.FALL; const c=bio?sh3(bio.water,1.25):[96,160,226];
      for(let f=0;f<6;f++){ const F=FACES[f]; if(F.a===1) continue; const nx=x+F.n[0], nz=z+F.n[2], nb=at(nx,y,nz); if(nb!==B.AIR&&!(BLOCKS[nb].replace&&!BLOCKS[nb].wl)) continue;
        setVLcell(nx,y,nz,200); const lc=VL; for(let k=0;k<4;k++){CLF[k][0]=lc[0];CLF[k][1]=lc[1];CLF[k][2]=lc[2];CLF[k][3]=lc[4];CLF[k][4]=lc[5];CLF[k][5]=lc[6];}
        emitQuad(vbW,F,x,y,z,x0,z0,c,[F.shade,F.shade,F.shade,F.shade],CLF,0,1,0,200,0); }
      continue; }""")
rep("""    if(b===B.FENCE){ setVLcell(x,y,z); const c=bd.top;""","""    if(b===B.FENCE){ setVLcell(x,y,z); const c=bd.top; PAT=PT.PLANK;""")
rep("""    if(bd.chest){ setVLcell(x,y,z); const c=bd.side,""","""    if(bd.chest){ setVLcell(x,y,z); if(b===B.CHEST_WOOD) PAT=PT.PLANK; const c=bd.side,""")
rep("""      const water=b===B.WATER; let alpha=water?185:b===B.GLASS?80:150, c=bd.top;
      if(water){ let dep=0; while(dep<7&&at(x,y-1-dep,z)===B.WATER) dep++; const k=dep/7;
        c=[64-40*k|0,168-98*k|0,216-76*k|0]; alpha=150+dep*12;""","""      const water=b===B.WATER; let alpha=water?185:bd.glassy||(b===B.GLASS?80:150), c=bd.top; PAT=water?PT.WATER:bd.pt|0;
      if(water){ let dep=0; while(dep<7&&isW(at(x,y-1-dep,z))) dep++; const k=dep/7, wc=bio?bio.water:[63,130,220];
        c=[wc[0]*(1.12-.62*k)|0,wc[1]*(1.22-.6*k)|0,wc[2]*(1.02-.42*k)|0]; alpha=150+dep*12;""")
rep("""        if(water){ if(F.a===1){ if(F.s===0||!surf) continue; } else if(nb!==B.AIR) continue; }""",
    """        if(water){ if(F.a===1){ if(F.s===0||!surf) continue; } else if(nb!==B.AIR&&!(BLOCKS[nb].replace&&!BLOCKS[nb].wl)) continue; }""")
rep("""    const out=b===B.LEAVES?vbL:vbO;""","""    const out=bd.leaves?vbL:vbO;""")
rep("""      let col=F.kind==='top'?bd.top:F.kind==='bottom'?bd.bottom:bd.side;
      if((b===B.GRASS||b===B.SNOW||bd.table)&&F.kind==='side'){
        const lip=bd.table?.72:.78;
        emitQuad(vbO,F,x,y,z,x0,z0,col,L,CL4,0,lip,flip?1:0);
        const g=b===B.GRASS?[bd.top[0]*.86|0,bd.top[1]*.86|0,bd.top[2]*.86|0]:bd.top;
        emitQuad(vbO,F,x,y,z,x0,z0,g,L,CL4,lip,1,flip?1:0);
      } else emitQuad(out,F,x,y,z,x0,z0,col,L,CL4,0,1,flip?1:0);""","""      let col=F.kind==='top'?(tc||bd.top):F.kind==='bottom'?bd.bottom:(tc&&b!==B.GRASS?sh3(tc,.9):bd.side);
      PAT=(F.kind==='top'?bd.pt:F.kind==='bottom'?bd.pb:bd.ps)|0;
      if((b===B.GRASS||b===B.SNOW||b===B.SNOW_GRASS||bd.table)&&F.kind==='side'){
        const lip=bd.table?.72:.78;
        emitQuad(vbO,F,x,y,z,x0,z0,col,L,CL4,0,lip,flip?1:0);
        const g=b===B.GRASS?sh3(tc||bd.top,.86):bd.top; PAT=bd.pt|0;
        emitQuad(vbO,F,x,y,z,x0,z0,g,L,CL4,lip,1,flip?1:0);
      } else emitQuad(out,F,x,y,z,x0,z0,col,L,CL4,0,1,flip?1:0);""")
rep("""      if(bd.ore){ // ore specks on each visible face
        VL[0]""","""      if(bd.ore){ // ore specks on each visible face
        PAT=0; VL[0]""")
rep("""function emitPlant(vb,x,y,z,bd,jit){
  const h=bd.ph, a=.18, b=.82, top=bd.top, stem=bd.stem||top;""","""function emitPlant(vb,x,y,z,bd,jit,col){
  const h=bd.ph, a=.18, b=.82, top=col||bd.top, stem=bd.stem||top;""")

# ---------- physics: water-likes ----------
rep("p.inWater=world.get(Math.floor(p.x),Math.floor(p.y+.6),Math.floor(p.z))===B.WATER;","p.inWater=isW(world.get(Math.floor(p.x),Math.floor(p.y+.6),Math.floor(p.z)));\n  if(world.get(Math.floor(p.x),Math.floor(p.y+.4),Math.floor(p.z))===B.FALL) p.vy-=9*dt;   // waterfalls push you down")
rep("p.headUnder=world.get(Math.floor(p.x),Math.floor(p.y+(p.swimProne?.45:1.55)),Math.floor(p.z))===B.WATER;","p.headUnder=isW(world.get(Math.floor(p.x),Math.floor(p.y+(p.swimProne?.45:1.55)),Math.floor(p.z)));")
rep("      if(b>0&&b!==B.WATER){\n        const v=xform(cam.view,x+.5,y+.5,z+.5);\n        const cut=!cam.persp&&(b===B.LEAVES||BLOCKS[b].plant)",
    "      if(b>0&&!isLiquid(b)){\n        const v=xform(cam.view,x+.5,y+.5,z+.5);\n        const cut=!cam.persp&&(BLOCKS[b].leaves||BLOCKS[b].plant||BLOCKS[b].vine)")
rep("if(cur<0||(cur>0&&!BLOCKS[cur].replace&&cur!==B.WATER)) return;","if(cur<0||(cur>0&&!BLOCKS[cur].replace&&!isW(cur))) return;",cnt=2)
rep("const b=world.get(x,y,z); if(b<=0||b===B.BEDROCK||b===B.WATER) return false;\n  if(!world.set(x,y,z,B.AIR)) return false;",
    "const b=world.get(x,y,z); if(b<=0||b===B.BEDROCK||isLiquid(b)) return false;\n  if(!world.set(x,y,z,BLOCKS[b].wl?B.WATER:B.AIR)) return false;")
rep("if(c>0&&c!==B.WATER&&!INTERACTIVE(c)","if(c>0&&!isLiquid(c)&&!INTERACTIVE(c)")
rep("const b=world.get(x,y-1-k,z); if(b===B.WATER) return false;","const b=world.get(x,y-1-k,z); if(isW(b)) return false;")
rep("const onWater=world.get(Math.floor(b.x),wy,Math.floor(b.z))===B.WATER;","const onWater=isW(world.get(Math.floor(b.x),wy,Math.floor(b.z)));")
rep("const ok=(x,z)=>world.get(Math.floor(x),wy,Math.floor(z))===B.WATER&&","const ok=(x,z)=>isW(world.get(Math.floor(x),wy,Math.floor(z)))&&")
rep("const b=world.get(x,y,z); if(b===B.WATER) return [x,y,z];","const b=world.get(x,y,z); if(isW(b)) return [x,y,z];")
rep("const eyeIn=cam.mode==='fp'?world.get(Math.floor(cam.pos[0]),Math.floor(cam.pos[1]),Math.floor(cam.pos[2]))===B.WATER:p.headUnder;",
    "const eyeIn=cam.mode==='fp'?isW(world.get(Math.floor(cam.pos[0]),Math.floor(cam.pos[1]),Math.floor(cam.pos[2]))):p.headUnder;")
rep("if(b>0&&BLOCKS[b].opaque&&b!==B.LEAVES){hit=true;break;}","if(b>0&&BLOCKS[b].opaque&&!BLOCKS[b].leaves){hit=true;break;}")
# vines climb like ladders
rep("const LADDER_DIR={[B.LADDER_N]:[0,-1],[B.LADDER_E]:[1,0],[B.LADDER_S]:[0,1],[B.LADDER_W]:[-1,0]};",
    "const LADDER_DIR={[B.LADDER_N]:[0,-1],[B.LADDER_E]:[1,0],[B.LADDER_S]:[0,1],[B.LADDER_W]:[-1,0],[B.VINE_N]:[0,-1],[B.VINE_E]:[1,0],[B.VINE_S]:[0,1],[B.VINE_W]:[-1,0]};")

# ---------- trees of every wood fell and decay ----------
rep("""  while(q.length&&logs.length<160){ const [a,b,c]=q.shift(); if(world.get(a,b,c)!==B.LOG) continue; logs.push([a,b,c]);""",
    """  const kind=world.get(x,y,z);
  while(q.length&&logs.length<220){ const [a,b,c]=q.shift(); if(world.get(a,b,c)!==kind) continue; logs.push([a,b,c]);""")
rep("""  for(const [a,b,c] of logs){ world.set(a,b,c,B.AIR); burst(a+.5,b+.5,c+.5,BLOCKS[B.LOG].side,3,2.5); }
  if(!creative()) spawnDrop(x+.5,y+.6,z+.5,B.LOG,logs.length);""","""  for(const [a,b,c] of logs){ world.set(a,b,c,B.AIR); burst(a+.5,b+.5,c+.5,BLOCKS[kind].side,3,2.5); }
  if(!creative()) spawnDrop(x+.5,y+.6,z+.5,kind,logs.length);""")
rep("if(b===B.LOG) scheduleDecay([[x,y,z]]);","if(isLog(b)) scheduleDecay([[x,y,z]]);")
rep("if(seen.has(k)||world.get(x,y,z)!==B.LEAVES) continue; seen.add(k);","if(seen.has(k)||!isLeaves(world.get(x,y,z))) continue; seen.add(k);")
rep("function logNear(x,y,z){for(let dy=-4;dy<=4;dy++)for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++)if(world.get(x+dx,y+dy,z+dz)===B.LOG)return true;return false;}",
    "function logNear(x,y,z){for(let dy=-5;dy<=4;dy++)for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++)if(isLog(world.get(x+dx,y+dy,z+dz)))return true;return false;}")
rep("if(world.get(d.x,d.y,d.z)===B.LEAVES&&!logNear(d.x,d.y,d.z)) breakBlock(d.x,d.y,d.z,null);} }",
    "if(isLeaves(world.get(d.x,d.y,d.z))&&!logNear(d.x,d.y,d.z)){ breakBlock(d.x,d.y,d.z,null); for(const [dx,dz] of DIRS){ let yy=d.y; while(BLOCKS[world.get(d.x+dx,yy,d.z+dz)]?.vine){ world.set(d.x+dx,yy,d.z+dz,B.AIR); yy--; } } } } }")
rep("  else if(b===B.LOG&&tool==='axe') fellTree(x,y,z);","  else if(isLog(b)&&tool==='axe') fellTree(x,y,z);")

# ---------- ambient: waterfall spray ----------
rep("function stepTiles(dt){","""function stepAmbient(dt){
  if(!world||!world.chunks) return; const pcx=Math.floor(player.x)>>4, pcz=Math.floor(player.z)>>4;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){ const ch=world.chunk(pcx+dx,pcz+dz); if(!ch||!ch.falls) continue;
    for(const f of ch.falls){ if(Math.random()>dt*14) continue; if(world.get(f[0],f[1]+1,f[2])!==B.FALL) continue;
      parts.push({x:f[0]+Math.random(),y:f[1]+.95,z:f[2]+Math.random(),vx:(Math.random()-.5)*2.2,vy:1.2+Math.random()*1.6,vz:(Math.random()-.5)*2.2,t:.7+Math.random()*.4,c:[225,238,250],s:.06+Math.random()*.05}); } }
}
function stepTiles(dt){""")
rep("world.time+=dt; stepTiles(dt);","world.time+=dt; stepTiles(dt); stepAmbient(dt);")
open(F,'w').write(s)
print('ok')
