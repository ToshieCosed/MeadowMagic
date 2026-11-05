"""64x64 palette display: column/row bundle isolators, scan counter, per-column picture blocks. Steps the simulation directly. python tools/tests/phase19_ppu.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p19'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w7',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, N=64, X0=C-32, ZB=C+110; player.x=C; player.y=G; player.z=ZB+10; await W(20000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const res={}; const L=()=>T19.techList().filter(t=>t.tech.type==='mlight'&&t.tech.mode==='pal'); const lights=L(); res.lights=lights.length; res.built=world.meta.ppu||0; res.tiles=T19.techList().length;
 const t0=performance.now(); const step=n=>{ for(let i=0;i<n;i++){ stepTiles(.05); WIRE.step(); for(const t of lights) __v40.wireRGB(t); } };
 step(40); res.stepMs=Math.round((performance.now()-t0)/40); step(520);
 const grid=[]; for(let r=0;r<N;r++) grid.push(new Array(N).fill(undefined)); for(const t of lights) grid[t.z-ZB][t.x-X0]=t.tech.held||null;
 res.sampled=grid.flat().filter(v=>v).length; const DC=DYES.map(d=>hex(d.dye)); const pal=v=>v>0?DC[(v-1)%16]:[0,0,0]; const eq=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
 let rowsOK=0, rowsBad=0; for(let r=0;r<N;r++){ if(grid[r].some(v=>!v)) continue; let ok=false; for(let s1=0;s1<16&&!ok;s1++) for(let s2=0;s2<16&&!ok;s2++){ let good=true; for(let i=0;i<N&&good;i++){ const cx=(i>>2)&15; if(!eq(grid[r][i],pal((cx&s2)^s1))) good=false; } if(good) ok=true; } if(ok) rowsOK++; else rowsBad++; }
 res.rowsOK=rowsOK; res.rowsBad=rowsBad; res.distinct=new Set(grid.flat().map(v=>v?v.join(','):'-')).size; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); print(json.dumps(r),flush=True); await pg.set_viewport_size({'width':1000,'height':640}); await pg.evaluate('()=>{ player.x=world.gen.C; player.z=world.gen.C+112; player.y=SHOW_G+1; cam.zoom=44; cam.tyaw=0; cam.userYaw=0; cam.yaw=0; }'); await pg.wait_for_timeout(3000); await pg.screenshot(path=str(OUT/'ppu.png'),timeout=90000)
        print(errs[:4],flush=True); await b.close()
asyncio.run(main())
