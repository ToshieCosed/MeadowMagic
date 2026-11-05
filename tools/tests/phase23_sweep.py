"""Writer + RAM + wall run together: every RAM row should hold (column XOR sweep XOR row-count) and the wall should mirror the RAM. python tools/tests/phase23_sweep.py"""
import asyncio,pathlib,os,json
from playwright.async_api import async_playwright
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'wC',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, X0=C-32; player.x=C; player.y=G; player.z=C+112; await W(25000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const R=__v42.ram, res={tiles:T19.techList().length}; const lights=T19.techList().filter(t=>t.tech.type==='mlight'&&t.tech.mode==='pal'); res.lights=lights.length;
 const t0=performance.now(); const step=n=>{ for(let i=0;i<n;i++){ stepTiles(.05); WIRE.step(); for(const t of lights) __v40.wireRGB(t); } };
 step(40); res.stepMs=Math.round((performance.now()-t0)/40); step(700);
 const snaps=[]; for(let s=0;s<3;s++){ const g=[]; for(let r=0;r<R.NR;r++){ g.push(R.cells[r].map(t=>t._lv||0)); } snaps.push(g); step(97); }
 const g=snaps[0]; let rowsConst=0, offs=[]; for(let r=0;r<R.NR;r++){ const x=g[r].map((v,c)=>v^(c&15)); const same=x.every(v=>v===x[0]); if(same) rowsConst++; offs.push(same?x[0]:-1); } res.rowsConst=rowsConst; res.offs=offs; res.distinct=new Set(g.flat()).size; res.changed=JSON.stringify(snaps[0])!==JSON.stringify(snaps[2]);
 const DC=DYES.map(d=>hex(d.dye)); const eq=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]; let m=0; for(const t of lights){ const i=t.x-X0, r=t.y-(G+5), v=R.cells[r>>1][i>>1]._lv||0; const e=v>0?DC[(v-1)%16]:[0,0,0]; if(eq(t.tech.held,e)) m++; } res.wallMatch=+(m/lights.length).toFixed(3);
 return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); print(json.dumps(r),flush=True); print(errs[:4],flush=True); await pg.set_viewport_size({'width':1000,'height':640}); await pg.evaluate('()=>{ player.x=world.gen.C; player.z=world.gen.C+112; player.y=SHOW_G+1; cam.zoom=44; cam.tyaw=0; cam.userYaw=0; }'); await pg.wait_for_timeout(2500); await pg.screenshot(path='/tmp/p23.png'); await b.close()
asyncio.run(main())
