"""Multicolour light + pixel driver + showcase light show. python tools/tests/phase18_lightshow.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p18'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w4',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1; player.x=C+.5; player.y=G; player.z=C+30; await W(7000); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const res={}; const drv=T19.tAt(C,G,C+45), pl=T19.tAt(C,G,C+22); res.have=!!drv&&!!pl; res.lights=T19.techList().filter(t=>t.tech.type==='mlight').length;
 res.offBefore=T19.techList().filter(t=>t.tech.type==='mlight'&&t._rgb).length;
 player.x=C+.5; player.z=C+30; player.y=G; await W(600); res.offNear=T19.techList().filter(t=>t.tech.type==='mlight'&&t._rgb).length;
 player.x=C+.5; player.z=C+22.5; player.y=G; await W(2500); res.plate=pl.tech._pr; res.sig=T19.anySig(drv); res.lit=T19.techList().filter(t=>t.tech.type==='mlight'&&t._rgb).length;
 player.z=C+36; await W(300); cam.zoom=18; await W(1500); res.lit2=T19.techList().filter(t=>t.tech.type==='mlight'&&t._rgb).length;
 return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); await pg.evaluate('()=>{ player.x=world.gen.C+.5; player.z=world.gen.C+22.5; player.y=SHOW_G+1; cam.zoom=30; cam.tyaw=Math.PI; cam.userYaw=Math.PI; cam.yaw=Math.PI; }'); await pg.wait_for_timeout(2200); await pg.screenshot(path=str(OUT/'show1.png'))
        await pg.evaluate('()=>{ const d=T19.tAt(world.gen.C,SHOW_G+1,world.gen.C+45); d.tech.lock=1; }'); await pg.wait_for_timeout(1500); await pg.screenshot(path=str(OUT/'show2.png'))
        await pg.evaluate('()=>{ player.x=world.gen.C+40; }'); await pg.wait_for_timeout(800); r['farLit']=await pg.evaluate("()=>T19.techList().filter(t=>t.tech.type==='mlight'&&t._rgb).length")
        import base64
        for prog in (0,1):
            u=await pg.evaluate('''async(prog)=>{ const d=T19.tAt(world.gen.C,SHOW_G+1,world.gen.C+45); d.tech.lock=prog; player.x=world.gen.C+.5; player.z=world.gen.C+22.5; await new Promise(r=>setTimeout(r,prog?1500:3500)); const s=__v40.ST.get(d); const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d'), im=g.createImageData(32,32); for(let i=0;i<1024;i++){ im.data[i*4]=s.F[i*3]; im.data[i*4+1]=s.F[i*3+1]; im.data[i*4+2]=s.F[i*3+2]; im.data[i*4+3]=255; } g.putImageData(im,0,0); const b=document.createElement('canvas'); b.width=b.height=256; const h=b.getContext('2d'); h.imageSmoothingEnabled=false; h.drawImage(c,0,0,256,256); return b.toDataURL(); }''',prog)
            (OUT/f'prog{prog}.png').write_bytes(base64.b64decode(u.split(',')[1]))
        print(json.dumps(r),errs[:3]); await b.close()
asyncio.run(main())
