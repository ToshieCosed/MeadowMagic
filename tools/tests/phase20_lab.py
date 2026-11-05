"""Gate lab: a 4-bit counter of NAND-gate T flip-flops. python tools/tests/phase20_lab.py"""
import asyncio,pathlib,os,json
from playwright.async_api import async_playwright
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w8',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1; player.x=C-120; player.y=G; player.z=C+62; await W(15000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const L=__v42.last, T=L.tiles, res={gates:Object.keys(T).length, tiles:T19.techList().length}; const step=n=>{ for(let i=0;i<n;i++){ stepTiles(.05); } };
 const q=()=>[0,1,2,3].map(b=>T['t'+b+'sq'].tech.type==='gate'&&T['t'+b+'sq']._so?1:0); const val=()=>{ const a=q(); return a[0]+2*a[1]+4*a[2]+8*a[3]; };
 step(60); res.afterReset=val(); T.RN.tech.on=true; const seq=[]; let last=-1; for(let i=0;i<24*2*20;i++){ step(1); const v=val(); if(v!==last){ seq.push(v); last=v; } } res.seq=seq; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); print(json.dumps(r),flush=True); print(errs[:4],flush=True); await b.close()
asyncio.run(main())
