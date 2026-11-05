"""Frame RAM built from tile rings: write every row, read every row back. python tools/tests/phase21_ram.py"""
import asyncio,pathlib,os,json
from playwright.async_api import async_playwright
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w9',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1; player.x=C+50; player.y=G; player.z=C+60; await W(20000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const R=__v42.ram, ct=R.ctl, res={tiles:T19.techList().length}; const step=n=>{ for(let i=0;i<n;i++) stepTiles(.05); }; const t0=performance.now(); step(30); res.stepMs=Math.round((performance.now()-t0)/30);
 const val=(r,c)=>1+((r*7+c*3+r*c)%16);
 for(let r=0;r<R.NR;r++){ for(let c=0;c<R.NC;c++) ct.data[c].tech.pl=val(r,c); ct.raw[r].tech.on=true; step(14); ct.raw[r].tech.on=false; step(14); }
 for(let c=0;c<R.NC;c++) ct.data[c].tech.pl=0; step(10);
 let bad=0, ok=0, first=null; for(let r=0;r<R.NR;r++){ ct.rs[r].tech.on=true; step(10); for(let c=0;c<R.NC;c++){ const v=ct.probe[c]._rx; if(v===val(r,c)) ok++; else { bad++; if(!first) first=[r,c,v,val(r,c)]; } } ct.rs[r].tech.on=false; step(10); }
 res.ok=ok; res.bad=bad; res.first=first; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); print(json.dumps(r),flush=True); print(errs[:4],flush=True); await b.close()
asyncio.run(main())
