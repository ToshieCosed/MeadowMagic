import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
exec(open(SP+'p19.py').read().replace("open(F,'w').write(s)","S19=s").replace("print('ok')",""))
s=S19
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("BLOCKS[B.TORCH].emit=[14,13,9];\n","BLOCKS[B.TORCH].emit=[14,13,9];\n"+open(SP+'s20_blocks.js').read())
R("const left=addItem(q.id,q.n,q.d,q.bag); if(q.sx&&left<q.n)","const left=voidOverflow(q,(q.n=pickupRoute(q))>0?addItem(q.id,q.n,q.d,q.bag):0); if(q.sx&&left<q.n)")
R("    tiles:[...world.tiles.values()].map(t=>({tech:t.tech,","    tiles:[...world.tiles.values()].map(t=>({tech:t.tech,up:t.up,")
R("\nfunction frame(now){",open(SP+'s20.js').read()+"\nfunction frame(now){")
R("v0.19.0</small>","v0.20.3</small>")

# search looks through every item, whatever tab is open; the classic layout gets Tech tabs too
R("(SX.tab==='all'||itemCat(id)===SX.tab)&&(!SX.q||","(SX.q||SX.tab==='all'||itemCat(id)===SX.tab)&&(!SX.q||")
R("(SX.tab==='all'||SX.tab==='can'||r.cat===SX.tab)&&(SX.tab!=='can'||canCraft(r))&&(!SX.q||","(SX.q||SX.tab==='all'||SX.tab==='can'||r.cat===SX.tab)&&(SX.tab!=='can'||canCraft(r))&&(!SX.q||")
R("(catTab==='all'||itemCat(id)===catTab)&&(!q||","(q||catTab==='all'||itemCat(id)===catTab)&&(!q||")
R('<button data-c="travel">Travel</button>','<button data-c="travel">Travel</button><button data-c="tech">Tech</button>')
R('<button data-t="travel">Travel</button>','<button data-t="travel">Travel</button><button data-t="tech">Tech</button>')
R("v0.20.3</small>","v0.20.5</small>")
F='/home/claude/strata.html'; open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok20')
