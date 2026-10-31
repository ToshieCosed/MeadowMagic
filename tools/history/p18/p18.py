import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'; s=open(SP+'strata_p17.html').read()
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
# blocks (ids continue after the last stage-14 block)
R("BLOCKS[B.TALLGRASS].name='Short grass';","BLOCKS[B.TALLGRASS].name='Short grass';\n"+open(SP+'s18_blocks.js').read())
R("L(lx+dx,y+th+dy,lz+dz,w.leaves); } }","L(lx+dx,y+th+dy,lz+dz,dy<0&&R(40+((dx*7+dz*13+dy*31)&63))>.86?B.SHROOMLIGHT:w.leaves); } }")
# shears: a new tool type in every material
R("  {k:'hoe',name:'hoe',tool:'hoe',pat:['XX','.S','.S'],dm:.4,cat:'tools'},","  {k:'hoe',name:'hoe',tool:'hoe',pat:['XX','.S','.S'],dm:.4,cat:'tools'},\n  {k:'shears',name:'shears',tool:'shears',pat:['.X','X.'],dm:.3,cat:'tools'},")
R("    if(it.tool==='knife'&&!m.sheared){ m.sheared=true; m.regrow=50+Math.random()*60; spawnDrop(m.x,m.y+1,m.z,DYES[m.wool].woolB,rint(1,3));",
  "    if((it.tool==='knife'||it.tool==='shears')&&!m.sheared){ m.sheared=true; m.regrow=50+Math.random()*60; spawnDrop(m.x,m.y+1,m.z,DYES[m.wool].woolB,rint(it.tool==='shears'?2:1,3));")
# ---- light kept per chunk ----
R("/* ---------- world: chunk store, streaming, edits ---------- */",open(SP+'s18_light.js').read()+"\n/* ---------- world: chunk store, streaming, edits ---------- */")
R("""  const ch=world.chunk(X>>4,Z>>4); if(!ch||!ch.light||Y<0||Y>=(ch.lightH||world.H)){_sl.set(VL_SUN);return _sl;}
  const o=((Y*CS+(Z&15))*CS+(X&15))*4, s=SKYC[ch.light[o]];
  _sl[0]=_sl[1]=_sl[2]=s; _sl[3]=255; _sl[4]=BLKC[ch.light[o+1]]; _sl[5]=BLKC[ch.light[o+2]]; _sl[6]=BLKC[ch.light[o+3]]; return _sl;""",
"""  const ch=world.chunk(X>>4,Z>>4); if(!ch||!ch.lt||Y<0||Y>=ch.lh){_sl.set(VL_SUN);return _sl;}
  const p=ch.lt[(Y*CS+(Z&15))*CS+(X&15)];
  _sl[0]=SKYC[p&15]; _sl[1]=SKYC[p>>4&15]; _sl[2]=SKYC[p>>8&15]; _sl[3]=255; _sl[4]=BLKC[p>>12&15]; _sl[5]=BLKC[p>>16&15]; _sl[6]=BLKC[p>>20&15]; return _sl;""")
R("function skyAt(x,y,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||!ch.light||y<0||y>=(ch.lightH||world.H)) return 15; return ch.light[((y*CS+(z&15))*CS+(x&15))*4]; }",
  "function skyAt(x,y,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||!ch.lt||y<0||y>=ch.lh) return 15; const p=ch.lt[(y*CS+(z&15))*CS+(x&15)]; return Math.max(p&15,p>>4&15,p>>8&15); }")
R("""  solveLight(LH);
  // keep this chunk's light for sampling by moving things (player, drops)
  if(!ch.light||ch.lightH!==LH){ ch.light=new Uint8Array(CS*CS*LH*4); ch.lightH=LH; }
  for(let y=0;y<LH;y++)for(let z=0;z<CS;z++)for(let x=0;x<CS;x++){ const i=pI(x,y,z), o=((y*CS+z)*CS+x)*4;
    ch.light[o]=Math.max(SR[i],SG[i],SBL[i]); ch.light[o+1]=BR[i]; ch.light[o+2]=BG[i]; ch.light[o+3]=BBL[i]; }
""","""  if(!ch.lt) lightChunk(world,ch);
  fillLight(world,ch,LH);   // stored light, re-solved only when blocks that matter for light change
""")
R("LQ=new Int32Array(N*3); }","}")
R("    const i=(y*CS+(z&15))*CS+(x&15); ch.blocks[i]=v; if(v&&y+1>(ch.top||0)) ch.top=y+1;",
  "    const i=(y*CS+(z&15))*CS+(x&15), old=ch.blocks[i]; ch.blocks[i]=v; if(v&&y+1>(ch.top||0)) ch.top=y+1;\n    if(ch.lt&&old!==v&&lightDiff(old,v)) lightQueue(this,x,y,z,ch,old,v);")
R("      if((dx===-1&&lx>=LM)||(dx===1&&lx<CS-LM)||(dz===-1&&lz>=LM)||(dz===1&&lz<CS-LM))continue;   // light reaches 8 blocks into neighbours",
  "      if((dx===-1&&lx>0)||(dx===1&&lx<CS-1)||(dz===-1&&lz>0)||(dz===1&&lz<CS-1))continue;   // faces and corner shading reach one block into neighbours; light changes mark their own chunks")
R("    this.chunks.set(this.key(cx,cz),ch); return ch;\n  }","    this.chunks.set(this.key(cx,cz),ch); lightChunk(this,ch); return ch;\n  }")
R("    // mesh dirty chunks nearest-first\n","    lightFlush(this);\n    // mesh dirty chunks nearest-first\n")
R("          quadRaw(vbO,q,bd.ore,F.shade); } }","          quadRaw(vbO,q,bd.ore,F.shade); } }\n      if(bd.pface&&f===bd.pface.f) emitPFace(vbO,F,x,y,z,x0,z0,bd.pface.lit,CL4);")
# ---- cave seams: sample textures at the covered sample, not the pixel centre, so MSAA edges don't wrap to the far side of a texture ----
R("out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; out vec3 vV; out float vS; flat out int vP; flat out uint vBid;",
  "out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; centroid out vec3 vWc; out vec3 vV; out float vS; flat out int vP; flat out uint vBid;")
R("vA=aSky.a; vW=p; vV=","vA=aSky.a; vW=p; vWc=p; vV=")
R("in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; in vec3 vV; in float vS; flat in int vP; flat in uint vBid;",
  "in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; centroid in vec3 vWc; in vec3 vV; in float vS; flat in int vP; flat in uint vBid;")
R("      vec2 uv=(tp||bt)?vW.xz:(abs(nrm.x)>abs(nrm.z)+.01?vec2(vW.z,-vW.y):vec2(vW.x,-vW.y));",
  "      vec2 uv0=(tp||bt)?vW.xz:(abs(nrm.x)>abs(nrm.z)+.01?vec2(vW.z,-vW.y):vec2(vW.x,-vW.y)), uv=(tp||bt)?vWc.xz:(abs(nrm.x)>abs(nrm.z)+.01?vec2(vWc.z,-vWc.y):vec2(vWc.x,-vWc.y));")
R("textureGrad(uPack,vec3(fract(uv),Ly),dFdx(uv),dFdy(uv))","textureGrad(uPack,vec3(fract(uv),Ly),dFdx(uv0),dFdy(uv0))")
R("vec2 uv=vec2(abs(nrm.x)>abs(nrm.z)+.01?vW.z:vW.x,vW.y); vec4 t=texelFetch(uPat","vec2 uv=vec2(abs(nrm.x)>abs(nrm.z)+.01?vWc.z:vWc.x,vWc.y); vec4 t=texelFetch(uPat")
R("""    bool top=abs(nrm.y)>.5; vec2 uv=top?vW.xz:abs(nrm.x)>.5?vec2(vW.z,vW.y):vec2(vW.x,vW.y);
    vec3 cl=floor(vW-nrm*.02);""","""    bool top=abs(nrm.y)>.5; vec2 uv=top?vWc.xz:abs(nrm.x)>.5?vec2(vWc.z,vWc.y):vec2(vWc.x,vWc.y), uv0=top?vW.xz:abs(nrm.x)>.5?vec2(vW.z,vW.y):vec2(vW.x,vW.y);
    vec3 cl=floor(vWc-nrm*.02);""")
R("float fw=max(length(dFdx(uv)),length(dFdy(uv)))*16.","float fw=max(length(dFdx(uv0)),length(dFdy(uv0)))*16.")
# ---- cave fog ----
R("  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); SUNV=sun; FOG=sky;","  { const k=caveFogK(); if(k<.999) for(let i=0;i<3;i++) sky[i]*=.06+.94*k; }\n  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); SUNV=sun; FOG=sky;")
# ---- hearts ----
R("  if(q.ember){ q.vy-=3*dt;","  if(q.heart){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; q.vy*=1-dt*.8; if(q.t<=0)parts.splice(i,1); continue; }\n  if(q.ember){ q.vy-=3*dt;")
R("    if(q.ember||q.drip===2) setVL(VL_EMISSIVE);","    if(q.heart){ emitHeart(q); continue; }\n    if(q.ember||q.drip===2) setVL(VL_EMISSIVE);")
# ---- creatures ----
R("    stepMobDots(m,dt); if(m.dead) continue; if(m.frozen>0) sp*=.25;","    stepMobDots(m,dt); if(m.dead) continue; if(m.frozen>0) sp*=.25;\n    if(d.step){ d.step(m,d,dt,dist); continue; }")
R("const near=mobs.filter(m=>!MOB[m.type].hostile&&Math.hypot(","const near=mobs.filter(m=>!MOB[m.type].hostile&&!MOB[m.type].swim&&m.type!=='parrot'&&Math.hypot(")
R("spawnMob(m.type,(m.x+mate.x)/2,m.y,(m.z+mate.z)/2,true); burst(m.x,m.y+1,m.z,[240,120,150],8,2);",
  "spawnMob(m.type,(m.x+mate.x)/2,m.y,(m.z+mate.z)/2,true); { const c=mobs[mobs.length-1]; if(m.tame&&mate.tame) c.tame=true; if(m.type==='sheep') c.wool=Math.random()<.5?m.wool:mate.wool; } burst(m.x,m.y+1,m.z,[240,120,150],8,2);")
R("function stepWolf(m,d,dt,dist){ const p=player; m.atkT=Math.max(0,(m.atkT||0)-dt);","function stepWolf(m,d,dt,dist){ const p=player; m.atkT=Math.max(0,(m.atkT||0)-dt); if(m.tame&&m.love>0&&!m.sit) return null;   // tame wolves in love go looking for a mate")
R("wool:m.wool,sheared:m.sheared,tame:m.tame,sit:m.sit})),","wool:m.wool,sheared:m.sheared,tame:m.tame,sit:m.sit,col:m.col})),")
R("tame:!!m.tame,sit:!!m.sit}); }","tame:!!m.tame,sit:!!m.sit,col:m.col}); }")
R("  rayK+=(target-rayK)*.08; if(rayK<.004&&!disc) return;","  { const n=performance.now(), dt=Math.min(.25,(n-(drawRays.t||n))/1000); drawRays.t=n; rayK+=(target-rayK)*Math.min(1,dt*3); } if(rayK<.004&&!disc) return;")
# ---- stage code ----
R("function frame(now){",open(SP+'s18.js').read()+"\nfunction frame(now){")
R("v0.17.0</small>","v0.18.0</small>")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok')
