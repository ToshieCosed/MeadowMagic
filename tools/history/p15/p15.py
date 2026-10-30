import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'; s=open(F).read()
def R(a,b):
    global s
    n=s.count(a)
    if n!=1: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("  supportBroken(x,y,z); doubleBroken(x,y,z,b);\n","  supportBroken(x,y,z); doubleBroken(x,y,z,b); sfxBlock(b,'break',x,y,z);\n")
R("if(mining.chipT<=0){ mining.chipT=.1; const [x,y,z]=r.hit; chips(x,y,z,b,3,1.8); }","if(mining.chipT<=0){ mining.chipT=.1; const [x,y,z]=r.hit; chips(x,y,z,b,3,1.8); mining.hk=(mining.hk||0)+1; if(mining.hk%2) sfxBlock(b,'hit',x,y,z); }")
R("  burst(m.x,m.y+.8,m.z,[200,40,40],4,2);\n  if(m.hp<=0){","  burst(m.x,m.y+.8,m.z,[200,40,40],4,2); sfxMob(m,m.hp<=0?'death':'hurt');\n  if(m.hp<=0){")
R("const d=MOB[m.type]; m.hurtT=Math.max(0,m.hurtT-dt);","const d=MOB[m.type]; sfxMobTick(m,dt,dist); m.hurtT=Math.max(0,m.hurtT-dt);")
R("a.stuck=true; a.t=0; burst(a.x,a.y,a.z,[200,200,200],3,1.5);","a.stuck=true; a.t=0; burst(a.x,a.y,a.z,[200,200,200],3,1.5); sfx('arrowHit',a.x,a.y,a.z,.8);")
R("orbs.splice(i,1); if(game()) addXP(o.v);","orbs.splice(i,1); if(game()){ addXP(o.v); sfx('orb',null,null,null,.35); }")
R("if(it.starter&&world.get(x,y,z)===B.AIR){ world.set(x,y,z,B.FIRE);","if(it.starter&&world.get(x,y,z)===B.AIR){ world.set(x,y,z,B.FIRE); sfx('ignite',x+.5,y+.5,z+.5,.9);")
R("toast('Ate a slice of cake · +1 heart');","sfx('eat',null,null,null,.6); toast('Ate a slice of cake · +1 heart');")
R("    while(acc>=step&&n<4){ stepPlayer(step); acc-=step; n++; }","    while(acc>=step&&n<4){ stepPlayer(step); sfxPlayerTick(player,step); acc-=step; n++; }")
R("  updateCamera(dt,[player.x,player.y+player.stepOff+1,player.z]);\n  if(flash){","  sfxAmbientTick(dt);\n  updateCamera(dt,[player.x,player.y+player.stepOff+1,player.z]);\n  if(flash){")
R("  if(q.ember){ q.vy-=3*dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; if(q.t<=0)parts.splice(i,1); continue; }",
  "  if(q.ember){ q.vy-=3*dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; if(q.t<=0)parts.splice(i,1); continue; }\n  if(q.drip){ if(q.hang>0){ q.hang-=dt; q.t+=dt; continue; } q.vy-=16*dt; q.y+=q.vy*dt; const db=world.get(Math.floor(q.x),Math.floor(q.y),Math.floor(q.z)); if(db!==0&&(db<0||BLOCKS[db].solid||isW(db)||LAVAID[db])){ dripLand(q,Math.floor(q.y)+1); parts.splice(i,1); } else if(q.t<=0) parts.splice(i,1); continue; }")
R("    if(q.ember) setVL(VL_EMISSIVE); else setVL(sampleLight(q.x,q.y,q.z));","    if(q.ember||q.drip===2) setVL(VL_EMISSIVE); else setVL(sampleLight(q.x,q.y,q.z));")
R('    <button class="ghost" id="skipTime">Skip to night</button>','    <div class="field"><label class="l" for="sfxVol">Sound effects</label><div class="range"><input type="range" id="sfxVol" min="0" max="10" step="1" value="10"><output id="sfxOut">10</output></div></div>\n    <button class="ghost" id="skipTime">Skip to night</button>')
# pack sounds
R("  return {name:file.name.replace(/\\.zip$/i,''),desc:desc.replace(/§./g,''),files,stats:{used,items,skipped,total:nB}}; }",
  "  const snd=await packSoundsFrom(z);\n  return {name:file.name.replace(/\\.zip$/i,''),desc:desc.replace(/§./g,''),files,sounds:snd.sounds,stats:{used,items,skipped,total:nB,sounds:snd.count}}; }")
R("  const nB=Object.keys(blk).length, nI=Object.keys(itm).length; if(!nB&&!nI) throw","  const nB=Object.keys(blk).length, nI=Object.keys(itm).length; if(!nB&&!nI&&![...z.files.keys()].some(n=>/assets\\/minecraft\\/sounds\\/.+\\.ogg$/i.test(n))) throw")
R("function clearPack(){ PACK.on=false;","function clearPack(){ if(typeof applyPackSounds==='function') applyPackSounds(null); PACK.on=false;")
R("  gl.useProgram(prog); gl.uniform1i(U.uPackOn,1); packRefresh(); }","  gl.useProgram(prog); gl.uniform1i(U.uPackOn,1); packRefresh(); applyPackSounds(rec); }")
R("and ${st.items||0} item icons.","and ${st.items||0} item icons${st.sounds?`, plus ${st.sounds} sounds`:''}.")
R("function frame(now){",open(SP+'s15_sfx.js').read()+"\nfunction frame(now){")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok')
s=open(F).read()
a="PACK.on&&st?`Using ${st.used} of its block textures (covering ${st.applied} block shapes and states) and ${st.items||0} item icons${st.sounds?`, plus ${st.sounds} sounds`:''}. ${st.skipped||0} of its ${st.total||0} block textures are for blocks Strata doesn't have, so they were skipped.`:'Import a Minecraft Java resource pack (.zip) for this world. Only textures for blocks and items that exist here are used.'"
b="PACK.on&&st?[st.used?`Using ${st.used} of its block textures (covering ${st.applied} block shapes and states).`:'',st.items?`${st.items} item icons.`:'',st.sounds?`${st.sounds} sounds.`:'',st.skipped?`${st.skipped} of its ${st.total} block textures are for blocks Strata doesn't have, so they were skipped.`:''].filter(Boolean).join(' ')||'Nothing in this pack matched.':'Import a Minecraft Java resource pack (.zip) for this world. Textures and sounds for things that exist here are used; the rest is skipped.'"
assert s.count(a)==1; s=s.replace(a,b); open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok2')
