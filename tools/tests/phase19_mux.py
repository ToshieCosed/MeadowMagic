"""Insulated cables + multiplexed display. python tools/tests/phase19_mux.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p19'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w5',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1; player.x=C+30; player.y=G; player.z=C+80; await W(6000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const res={}; const L=()=>T19.techList().filter(t=>t.tech.type==='mlight'&&t.tech.mode==='latch'); res.lights=L().length; res.built=window.__v41?1:0;
 res.cables=0; for(let x=C+30;x<C+46;x++) for(let y=G;y<G+14;y++) for(let z=C+40;z<C+100;z++){ const b=world.get(x,y,z); if(b>0&&BLOCKS[b]&&BLOCKS[b].cable!=null) res.cables++; }
 const BX=C+30, BY=G+2; const idxOf=t=>((t.y-BY)/3)*4+(t.x-BX)/3; res.failedRoutes=world.meta.muxshow-1;
 const step=n=>{ for(let i=0;i<n*5;i++){ stepTiles(.05); WIRE.step(); for(const t of L()) __v40.wireRGB(t); } }; step(40); const frames=[]; for(let f=0;f<3;f++){ step(200); frames.push(L().map(t=>t.tech.held?t.tech.held.join(','):'-')); }
 res.sampled=L().filter(t=>t.tech.held).length; res.badBlue=L().filter(t=>t.tech.held&&t.tech.held[2]!==Math.min(255,(16-idxOf(t))*16)).map(idxOf); res.changed=frames[1].filter((v,i)=>v!==frames[2][i]).length; res.distinct=new Set(frames[2]).size; res.missing=L().filter(t=>!t.tech.held).map(idxOf); res.sample=frames[2].slice(0,4);
 res.sel=T19.techList().filter(t=>t.tech.type==='srecv'&&t.tech.op==='EQ').map(t=>t._lv); return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':200,'height':130}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); await pg.set_viewport_size({'width':1000,'height':640}); await pg.evaluate('()=>{ player.x=world.gen.C+34; player.z=world.gen.C+84; player.y=SHOW_G+1; cam.zoom=20; cam.tyaw=Math.PI; cam.userYaw=Math.PI; cam.yaw=Math.PI; }'); await pg.wait_for_timeout(2500); await pg.screenshot(path=str(OUT/'mux.png'))
        print(json.dumps(r),errs[:4],flush=True); await b.close()
asyncio.run(main())
