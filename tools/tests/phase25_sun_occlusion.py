"""The sun's disc/glow must not show through blocks: first-person view facing the sun, open sky vs a stone wall in front.
python tools/tests/phase25_sun_occlusion.py  -> /tmp/sun_open.png, /tmp/sun_wall.png and the mean brightness of the sun area in each"""
import asyncio, pathlib, os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 400}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2] / 'release/strata-standalone.html').as_uri()); await pg.wait_for_function('typeof startWorld==="function"', timeout=90000)
        await pg.evaluate('''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'sun1',name:'s',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(2500); mode='play'; document.getElementById('menu').hidden=true;
          const C=world.gen.C, G=SHOW_G+1; player.x=C+40.5; player.y=G+30; player.z=C+40.5; const Y=G+30; setInterval(()=>{ player.y=Y; player.vy=0; player.x=C+40.5; player.z=C+40.5; },10); await W(8000); world.time=world.dayLen*.12;
          const d=sunDir(); cam.mode='fp'; cam.fpYaw=Math.atan2(d[0],d[2]); cam.fpPitch=Math.asin(d[1]); window.__sd=d; setInterval(()=>{ cam.mode='fp'; cam.fpYaw=Math.atan2(d[0],d[2]); cam.fpPitch=Math.asin(d[1]); },10); }''')
        async def shot(name):
            await pg.wait_for_timeout(6000); await pg.screenshot(path=f'/tmp/{name}.png')
            return await pg.evaluate('''()=>{ const c=document.createElement('canvas'); return 0; }''')
        await shot('sun_open')
        print('placed', await pg.evaluate('''()=>{ const d=window.__sd, x=Math.floor(player.x+d[0]*7), y=Math.floor(player.y+1.6+d[1]*7), z=Math.floor(player.z+d[2]*7); for(let a=-6;a<=6;a++) for(let b=-6;b<=6;b++) for(let c=-6;c<=6;c++) world.set(x+a,y+b,z+c,B.STONE); return [x,y,z,world.get(x,y,z),B.STONE,cam.mode,player.y]; }'''))
        await shot('sun_wall')
        from PIL import Image
        for n in ['sun_open', 'sun_wall']:
            im = Image.open(f'/tmp/{n}.png').convert('L'); w, h = im.size; box = im.crop((w // 2 - 40, h // 2 - 40, w // 2 + 40, h // 2 + 40)); px = list(box.getdata()); print(n, 'centre brightness', round(sum(px) / len(px)), 'max', max(px))
        print('ERRS', errs[:3]); await b.close()
asyncio.run(main())
