import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
exec(open(SP+'p20.py').read().replace("F='/home/claude/strata.html'; open(F,'w').write(s)","S20=s").replace("print('ok20')",""))
s=S20
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("meta.gen===2?new Generator2(this.seed,this.size,this.H)","meta.gen==='show'?new ShowGen(this.seed,this.size,this.H):meta.gen===2?new Generator2(this.seed,this.size,this.H)")
R('    <div class="sizes" role="radiogroup" aria-label="World depth" id="depths">','''    <div class="sizes" role="radiogroup" aria-label="World type" id="wtypes">
      <button class="size" role="radio" aria-checked="true" data-wtype="normal"><i>Normal</i><b>Generated</b><em>Mountains, caves, oceans</em></button>
      <button class="size" role="radio" aria-checked="false" data-wtype="show"><i>Showcase</i><b>Flat demo</b><em>Every feature, signposted</em></button>
    </div>
    <div class="sizes" role="radiogroup" aria-label="World depth" id="depths">''')
R("let pickedSize=100, pickedGM='survival', pickedDepth='classic';","let pickedSize=100, pickedGM='survival', pickedDepth='classic', pickedType='normal';\ndocument.querySelectorAll('[data-wtype]').forEach(b=>b.addEventListener('click',()=>{pickedType=b.dataset.wtype;document.querySelectorAll('[data-wtype]').forEach(x=>x.setAttribute('aria-checked',x===b));}));")
R("caves:1,gen:2,mc:1,gameMode:pickedGM,created:Date.now(),played:Date.now()};","caves:1,gen:2,mc:1,gameMode:pickedGM,created:Date.now(),played:Date.now()};\n  if(pickedType==='show') Object.assign(meta,{gen:'show',height:128,sea:63,depth:'classic',size:Math.max(1000,pickedSize)});")
R("\nfunction frame(now){",open(SP+'s21.js').read()+"\nfunction frame(now){")
R("v0.20.5</small>","v0.21.0</small>")
F='/home/claude/strata.html'; open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok21')
