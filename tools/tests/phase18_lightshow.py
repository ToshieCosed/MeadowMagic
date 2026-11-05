"""All-wire display in the showcase: levels flow clocks -> sbcast -> wireless -> srecv -> single-colour bundles -> multicolour lights. python tools/tests/phase18_lightshow.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p18'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w4',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1; player.x=C+.5; player.y=G; player.z=C+18; await W(8000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const res={}; const L=()=>T19.techList().filter(t=>t.tech.type==='mlight'); res.lights=L().length; res.wires=world.wires?[...world.wires.values()].reduce((a,v)=>a+v.length,0):0;
 await W(3000); const snap=()=>L().map(t=>t._rgb?t._rgb.map(v=>v|0).join(','):'-'); const a=snap(); res.lit=a.filter(v=>v!=='-').length; res.distinct=new Set(a).size; await W(1500); const b=snap(); res.changed=a.filter((v,i)=>v!==b[i]).length;
 const ph=T19.techList().filter(t=>t.tech.type==='wterm'&&t.tech.role==='tx'&&t.tech.ch>=50).map(t=>t._lv); res.phases=ph; const ch=T19.techList().filter(t=>t.tech.type==='wterm'&&t.tech.role==='tx'&&t.tech.ch<50).map(t=>t._lv).slice(0,6); res.chan=ch;
 const s0=T19.techList().find(t=>t.tech.type==='srecv'); res.srecv={lv:s0._lv,inp:s0._in,res:s0._res}; res.ticks=0; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); await pg.evaluate('()=>{ player.x=world.gen.C+2; player.z=world.gen.C+16; player.y=SHOW_G+1; cam.zoom=24; cam.tyaw=Math.PI; cam.userYaw=Math.PI; cam.yaw=Math.PI; }'); await pg.wait_for_timeout(2500); await pg.screenshot(path=str(OUT/'wall.png'))
        print(json.dumps(r),errs[:3]); await b.close()
asyncio.run(main())
