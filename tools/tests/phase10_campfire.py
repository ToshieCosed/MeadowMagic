"""Campfire check: python tools/tests/phase10_campfire.py shot.png <world.time> <wait ms>  (e.g. 800 5000 for night)"""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':900,'height':560}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(pathlib.Path('/home/claude/meadowmagic/release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate('''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'wc',name:'show',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(3000); mode='play'; document.getElementById('menu').hidden=true;
          const C=world.gen.C, X=C-110+36, Z=C-15+8, G=SHOW_G+1; player.x=X+4; player.y=G+1; player.z=Z+6; player.vy=0; await W(9000);
          const L=[]; L.push('blocks '+[0,3,6,9,12].map(i=>BLOCKS[world.get(X,G,Z+i)].name+':'+world.get(X,G,Z+i)).join(' ')+' tiles '+[...world.tiles.values()].filter(t=>t.kind==='camp').length);
          L.push('item '+ITEMS[P2B.camp].name+' recipes '+RECIPES.filter(r=>r.out===P2B.camp).length);
          // dye test through the public path
          world.time=%s; await W(%s); L.push('CL '+__camp.CL.length);
          return L; }''' % (sys.argv[2],sys.argv[3]))
        print(r, errs[:4]); await pg.screenshot(path=sys.argv[1]); await b.close()
asyncio.run(main())
