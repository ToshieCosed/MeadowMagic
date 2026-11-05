"""32x32 scan display: slab wiring, row strobes, per-column data. Steps the simulation directly. python tools/tests/phase19_ppu.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p19'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w6',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, N=32, X0=C-48, ZB=C+110; player.x=C; player.y=G; player.z=ZB+20; await W(20000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const res={}; const L=()=>T19.techList().filter(t=>t.tech.type==='mlight'&&t.tech.mode==='latch'); res.lights=L().length; res.built=world.meta.ppu||0; res.wires=[...world.wires.values()].reduce((a,v)=>a+v.length,0); res.nets=0;
 const t0=performance.now(); const step=n=>{ for(let i=0;i<n;i++){ stepTiles(.05); WIRE.step(); for(const t of L()) __v40.wireRGB(t); } };
 step(60); res.stepMs=Math.round((performance.now()-t0)/60); step(260);
 const px=t=>[(t.x-X0-1)/3,(t.z-ZB-1)/3]; const grid=[]; for(let j=0;j<N;j++) grid.push(new Array(N).fill(null)); for(const t of L()){ const [i,j]=px(t); grid[j][i]=t.tech.held||null; }
 res.sampled=grid.flat().filter(v=>v).length; let bad=0, rowsOK=0; const cx=i=>Math.round(i*15/(N-1));
 for(let j=0;j<N;j++){ const row=grid[j]; if(row.some(v=>!v)) continue; const s1=row[N-1][0]/16, s2=row[N-1][1]/16, s3=row[0][2]/16; let b=0; for(let i=0;i<N;i++){ const h=row[i]; if(h[0]/16!==(cx(i)&s1)||h[1]/16!==(cx(i)&s2)||h[2]/16!==((15-cx(i))&s3)) b++; } bad+=b; rowsOK++; }
 res.rowsChecked=rowsOK; res.badPixels=bad; res.distinct=new Set(grid.flat().map(v=>v?v.join(','):'-')).size; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); print(json.dumps(r),flush=True); await pg.set_viewport_size({'width':1000,'height':640}); await pg.evaluate('()=>{ player.x=world.gen.C; player.z=world.gen.C+100; player.y=SHOW_G+1; cam.zoom=40; cam.tyaw=0; cam.userYaw=0; cam.yaw=0; }'); await pg.wait_for_timeout(3000); await pg.screenshot(path=str(OUT/'ppu.png'),timeout=90000)
        print(errs[:4],flush=True); await b.close()
asyncio.run(main())
