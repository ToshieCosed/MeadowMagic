import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'; s=open(SP+'strata_p18.html').read()
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("BLOCKS[B.TORCH].emit=[15,14,10];\n","BLOCKS[B.TORCH].emit=[15,14,10];\n"+open(SP+'s19_blocks.js').read())
R("    if(bd.shape&&!bd.door){ setVLcell(x,y,z);","    if(bd.tech){ setVLcell(x,y,z); techMesh(vbO,vbG,b,bd,wx,y,wz); continue; }\n    if(bd.shape&&!bd.door){ setVLcell(x,y,z);")
R("  smVB.n=0;\n","  techDyn(dynVB,p);\n  smVB.n=0;\n")
R("  drawGate();\n","  drawGate(); drawTerminals();\n")
R("if(mode==='play'||mode==='inv'||mode==='cru'||mode==='store'){ world.time+=dt;","if(mode==='play'||mode==='inv'||mode==='cru'||mode==='store'||mode==='tech'){ world.time+=dt;")
R("tan=nearBlocks(b=>b===B.TANNING?1:0); return stationCache={t:performance.now(),tier,tan};","tan=nearBlocks(b=>b===B.TANNING?1:0), wood=nearBlocks(b=>b===TECHB.wtable?1:0); return stationCache={t:performance.now(),tier,tan,wood};")
R("(!rc.station||s.tan)","(!rc.station||s[rc.station])")
R("['storage','Storage'],['travel','Travel'],['items','Items']];","['storage','Storage'],['travel','Travel'],['tech','Tech'],['items','Items']];")
R("['armor','Armor'],['travel','Travel'],['items','Items']]:","['armor','Armor'],['travel','Travel'],['tech','Tech'],['items','Items']]:")
# save and load
R("    tiles:[...world.tiles.values()].map(t=>({","    techLinks:world.techLinks||[],\n    tiles:[...world.tiles.values()].map(t=>({tech:t.tech,")
R("  if(save&&save.tiles) for(const t of save.tiles){ world.tiles.set(tileKey(t.x,t.y,t.z),{...t,kind:t.kind||'furnace',s:t.s.map(unpackS),smokeT:0}); }",
  "  if(save&&save.tiles) for(const t of save.tiles){ world.tiles.set(tileKey(t.x,t.y,t.z),{...t,kind:t.kind||'furnace',s:t.s.map(unpackS),smokeT:0}); }\n  world.techLinks=save&&save.techLinks||[]; if(window.techAfterLoad) techAfterLoad();")
# chunk loading: wireless terminals keep their chunks; far-away edits there skip lighting until you come near
R("      const dx=ch.cx-pcx, dz=ch.cz-pcz; if(dx*dx+dz*dz>(R+3)*(R+3)){","      const dx=ch.cx-pcx, dz=ch.cz-pcz; if(dx*dx+dz*dz>(R+3)*(R+3)&&!(this.forced&&this.forced.has(k))){")
R("    lightFlush(this);\n    // mesh dirty chunks nearest-first\n","    if(this.forced) for(const k of this.forced) if(!this.chunks.has(k)){ const cx=Math.floor(k/1024), cz=k-cx*1024; if(this.inWorld(cx,cz)) this.generate(cx,cz); }\n    lightFlush(this);\n    // mesh dirty chunks nearest-first\n")
R("      if(ch&&ch.dirty&&this.ready(cx,cz)) meshChunk(this,ch);","      if(ch&&ch.lightStale){ ch.lightStale=false; relight(this,cx*16-15,cx*16+30,cz*16-15,cz*16+30,0,this.H-1); }\n      if(ch&&ch.dirty&&this.ready(cx,cz)) meshChunk(this,ch);")
R("    if(ch.lt&&old!==v&&lightDiff(old,v)) lightQueue(this,x,y,z,ch,old,v);","    if(ch.lt&&old!==v&&lightDiff(old,v)){ if(this.forced&&this.forced.has(this.key(cx,cz))&&typeof player!=='undefined'&&Math.max(Math.abs(cx-(player.x>>4)),Math.abs(cz-(player.z>>4)))>this.radius+1) ch.lightStale=true; else lightQueue(this,x,y,z,ch,old,v); }")
R("function frame(now){",open(SP+'s19.js').read()+"\nfunction frame(now){")
R("v0.18.0</small>","v0.19.0</small>")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok')
