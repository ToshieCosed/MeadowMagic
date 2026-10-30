import sys,re
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'; s=open(F).read()
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
# drop data bug
R("if(q.x&&left<q.n) inv.slots[inv.landed].x=q.x;","if(q.sx&&left<q.n) inv.slots[inv.landed].x=q.sx;")
n=s.count("drops[drops.length-1].x="); s=s.replace("drops[drops.length-1].x=","drops[drops.length-1].sx="); print('data fixes',n)
# player body now drawn with the skin
R("const showBody=cam.mode!=='fp', EB=","const showBody=false, EB=")
R("const ar=game()?emitArmor({},mk,crouchS):{}, legB=","buildPlayerSkin(); const ar={}, legB=")
R("    gl.drawElements(gl.TRIANGLES,(dyn.n>>2)*6,gl.UNSIGNED_INT,0); }\n  if(typeof drawTextured==='function') drawTextured();","    gl.drawElements(gl.TRIANGLES,(dyn.n>>2)*6,gl.UNSIGNED_INT,0); }\n  drawPlayerSkin(showPlayer);\n  if(typeof drawTextured==='function') drawTextured();")
R("  if(vmMesh.n){ gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniform2f(U.uFogR,1e5,1e5); gl.uniform1f(U.uClouds,0); gl.bindVertexArray(vmMesh.vao); gl.drawElements(gl.TRIANGLES,(vmMesh.n>>2)*6,gl.UNSIGNED_INT,0); }",
  "  if(vmMesh.n||SKV.fpN){ gl.clear(gl.DEPTH_BUFFER_BIT); gl.uniform2f(U.uFogR,1e5,1e5); gl.uniform1f(U.uClouds,0); if(vmMesh.n){ gl.bindVertexArray(vmMesh.vao); gl.drawElements(gl.TRIANGLES,(vmMesh.n>>2)*6,gl.UNSIGNED_INT,0); } drawFPArm(); }")
# dropped items as sprites
R("    for(const [mn,mx,col] of itemBoxes(q.id)) emitBox(dynVB,mn,mx,col,(x,y,z)=>[q.x+(x*ca+z*sa)*k,by+y*k,q.z+(-x*sa+z*ca)*k]); }",
  "    emitItem(dynVB,q.id,mc(mT(q.x,by,q.z),mY(q.spin),mS(isFlatItem(q.id)?.5:.28),mT(-.5,0,-.5))); }")
# arrows: bigger, and leave from the eye in first person
R("    seg(0,.045,C3.stone); for(const t of [.12,.22,.32,.42]) seg(t,.025,C3.wood); seg(.54,.045,C3.string); }",
  "    seg(0,.06,C3.stone); for(let t=.08;t<.62;t+=.06) seg(t,.03,C3.wood); seg(.6,.055,C3.string); seg(.67,.05,C3.string); }")
R("  const o=[player.x,player.y+(player.crouch?1.15:1.45),player.z];\n  const ap=aimPoint(sx,sy)","  const o=cam.mode==='fp'?[cam.pos[0]+cam.right[0]*.18,cam.pos[1]-.1,cam.pos[2]+cam.right[2]*.18]:[player.x,player.y+(player.crouch?1.15:1.45),player.z];\n  const ap=aimPoint(sx,sy)")
# first-person camera bob (a hint, mostly when sprinting)
R("    const eye=[p.x,p.y+p.stepOff+(p.crouch?1.22:1.6),p.z], dir=[Math.sin(a)*cb,Math.sin(b),Math.cos(a)*cb];",
  "    const eye=[p.x,p.y+p.stepOff+(p.crouch?1.22:1.6),p.z], dir=[Math.sin(a)*cb,Math.sin(b),Math.cos(a)*cb];\n    { const k=(p.onGround&&!p.inWater&&!p.mount?Math.min(1,(p.speed||0)/7):0)*(p.sprinting?1:.4); cam.bobK=lerp(cam.bobK||0,k,.12); const ph=p.phase||0, bk=cam.bobK;\n      eye[0]+=-Math.cos(a)*Math.sin(ph)*.03*bk; eye[2]+=Math.sin(a)*Math.sin(ph)*.03*bk; eye[1]+=-Math.abs(Math.cos(ph))*.055*bk; }")
# fishing sounds
R("wait:4+Math.random()*10}; player.swingT=.25; }","wait:4+Math.random()*10}; player.swingT=.25; sfx('cast',null,null,null,.7); }")
R("  if(bobber){ if(bobber.state==='bite'){ startFishGame(); } else { toast('Reeled in'); bobber=null; } return; }","  if(bobber){ if(bobber.state==='bite'){ sfx('reel',null,null,null,.6); startFishGame(); } else { sfx('reel',null,null,null,.5); toast('Reeled in'); bobber=null; } player.swingT=.25; return; }")
R("if(k>=1){ b.state='wait'; b.t=0;","if(k>=1){ b.state='wait'; b.t=0; sfx('splashS',b.x,b.y,b.z,.55,24);")
R("b.state='bite'; b.t=0; toast(","b.state='bite'; b.t=0; sfx('plop',b.x,b.y,b.z,.9,28); toast(")
R("  g.zv+=(g.hold?2.6:-2.2)*dt;","  if(g.hold&&(g.rc=(g.rc||0)-dt)<=0){ g.rc=.07; sfx('ratchet',null,null,null,.35); }\n  g.zv+=(g.hold?2.6:-2.2)*dt;")
R("if(ok) catchFish(); else toast('It escaped');","if(ok){ sfx('splash',null,null,null,.6); catchFish(); } else { sfx('splashS',null,null,null,.4); toast('It escaped'); }")
# throw sounds
for f in ['function throwBoomerang(sx,sy){','function fireHook(sx,sy){']: R(f,f+" sfx('throw',null,null,null,.6);")
R("function throwOrb(sx,sy){","function throwOrb(sx,sy){ sfx('throw',null,null,null,.6);")
# hud throw button
R('    <button id="bCrouch" aria-label="Crouch">','    <button id="bThrow" aria-label="Throw item (hold for the stack)"><svg viewBox="0 0 24 24"><path d="M5 19L18 6M10 6h8v8"/></svg><span>Throw</span></button>\n    <button id="bCrouch" aria-label="Crouch">')
R("#bCrouch{right:calc(var(--btn)*0.2);bottom:calc(var(--btn)*1.6);width:var(--btn);height:var(--btn)}","#bCrouch{right:calc(var(--btn)*0.2);bottom:calc(var(--btn)*1.6);width:var(--btn);height:var(--btn)}\n#bThrow{right:calc(var(--btn)*0.3);bottom:calc(var(--btn)*2.75);width:calc(var(--btn)*.8);height:calc(var(--btn)*.8)}")
# pause menu: skin
R('    <div class="field packbox">','''    <div class="field"><label class="l">Player skin</label>
      <div class="packrow"><b id="skinName">Default skin</b><button class="ghost" id="skinImport">Import skin .png</button><button class="ghost" id="skinReset" hidden>Default</button></div>
      <div class="packrow" style="margin-top:6px"><label for="skinArms" style="font-size:13px;color:var(--muted)">Arms</label><select id="skinArms" style="background:#1d2530;color:#fff;border:1px solid #445;border-radius:8px;padding:6px"><option value="auto">Detect from skin</option><option value="classic">Classic (4 px)</option><option value="slim">Slim (3 px)</option></select></div>
      <input type="file" id="skinFile" accept="image/png" hidden></div>
    <div class="field packbox">''')
R("function frame(now){",open(SP+'s16.js').read()+"\nwindow.buildViewModel=buildViewModel2;\n{ const o=window.placeSurv; window.placeSurv=function(){ const f0=flash, r=o.apply(this,arguments); if(flash&&flash!==f0) player.swingT=.25; return r; }; const m0=window.mineBlock; window.mineBlock=function(){ if(!(player.swingT>0)) player.swingT=.25; return m0.apply(this,arguments); }; }\nskinUI();\nfunction frame(now){")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok')
