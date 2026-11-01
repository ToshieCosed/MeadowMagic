import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
_src=open(SP+'p21.py').read(); _a="F='/home/claude/strata.html'; open(F,'w').write(s)"; _k=_src.rfind(_a); exec(_src[:_k]+"S21=s"+_src[_k+len(_a):].replace("print('ok21')",""))
s=S21
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("      if(tgt&&tgt!==b&&tgt.sxArr){ sxDrop(tgt.sxArr,tgt.sxI,tgt.sxOpts); }","      if(tgt&&tgt!==b&&tgt.sxArr){ sxDrop(tgt.sxArr,tgt.sxI,tgt.sxOpts); if(d.from&&inv.cursor&&!arr[i]){ arr[i]=inv.cursor; inv.cursor=null; invChanged(); } }")
# drag starts as soon as your finger moves off a full slot (no waiting for the hold), and a drop that misses goes back
R("else if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>12){ clearTimeout(d.timer); sxDrag=null; } });",
  "else if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>9){ clearTimeout(d.timer); if(!inv.cursor&&arr[i]&&!(opts&&opts.output)){ clickSlot(arr,i,true); d.held=true; d.from=true; showGhost(e.clientX,e.clientY); try{ navigator.vibrate&&navigator.vibrate(8); }catch(_){} b.innerHTML=''; sxHoldText(); } else sxDrag=null; } });")
R("d.held=true; showGhost(e.clientX,e.clientY); try{ navigator.vibrate&&navigator.vibrate(12); }catch(_){} b.innerHTML=''; sxHoldText(); } },280);",
  "d.held=true; d.from=true; showGhost(e.clientX,e.clientY); try{ navigator.vibrate&&navigator.vibrate(12); }catch(_){} b.innerHTML=''; sxHoldText(); } },220);")
R("      else if((side&&creative()||t&&t.closest&&t.closest('.sx-trash'))&&inv.cursor){ inv.cursor=null; toast('Deleted'); }\n      renderSX(); return; }",
  "      else if((side&&creative()||t&&t.closest&&t.closest('.sx-trash'))&&inv.cursor){ inv.cursor=null; toast('Deleted'); }\n      else if(d.from&&inv.cursor&&!arr[i]){ arr[i]=inv.cursor; inv.cursor=null; invChanged(); }\n      document.querySelectorAll('.sx-slot.hot').forEach(x=>x.classList.remove('hot')); renderSX(); return; }")
R('''    <div class="field"><label class="l" for="sfxVol">Sound effects</label>''','''    <div class="field"><label class="l" for="iScale">Item &amp; panel size</label><div class="range"><input type="range" id="iScale" min="80" max="200" step="10" value="100"><output id="iScaleOut">100%</output></div></div>
    <div class="field"><label class="l" for="sfxVol">Sound effects</label>''')
R("\nfunction frame(now){",open(SP+'s22.js').read()+"\nfunction frame(now){")
R("v0.21.0</small>","v0.21.1</small>")
F='/home/claude/strata.html'; open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok22')
