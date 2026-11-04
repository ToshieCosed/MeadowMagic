"""Item gallery + inventory speed check: python tools/tests/phase9_gallery.py [shot-prefix]"""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':900,'height':560}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'wg',name:'show',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(3000); mode='play'; document.getElementById('menu').hidden=true;
          const g=GALLERY, C=world.gen.C; L.push('floors '+g.floors.map(f=>f.title+' '+f.part+'/'+f.parts+':'+f.n).join(' | '));
          const fr=world.decor.filter(d=>d.kind==='frame'&&d.gal), sg=world.decor.filter(d=>d.kind==='sign'&&d.gal); L.push('frames '+fr.length+' signs '+sg.length+' items '+Object.keys(ITEMS).length);
          const ids=new Set(fr.map(f=>f.item.id)); L.push('distinct items framed '+ids.size);
          L.push('magic: '+g.floors.length);
          // go to ground floor, check walls/air
          const X0=g.X0,Z0=g.Z0,S0=g.S0; window.__tp=(x,y,z)=>{ player.x=x; player.y=y; player.z=z; player.vy=0; };
          __tp(X0+31.5,S0+2,Z0+14.5); await W(7000);
          L.push('door cells '+[world.get(X0+29,S0+1,Z0+14),world.get(X0+29,S0+2,Z0+15),world.get(X0+29,S0+4,Z0+15)].join(',')+' floor '+world.get(X0+10,S0,Z0+6)+' air '+world.get(X0+10,S0+1,Z0+6)+' shelf '+world.get(X0+10,S0+1,Z0+4)+' ladder '+world.get(X0+1,S0+1,Z0+2)+','+world.get(X0+1,S0+5,Z0+2)+','+world.get(X0+1,S0+6,Z0+2)+' hole '+world.get(X0+1,S0+5,Z0+3)+' slab '+world.get(X0+5,S0+5,Z0+3));
          // walk inside and time a frame batch
          __tp(X0+14.5,S0+1.1,Z0+14.5); await W(4000);
          const t0=performance.now(); let n=0; for(let i=0;i<20;i++){ await new Promise(r=>requestAnimationFrame(r)); n++; } L.push('avg frame ms inside '+((performance.now()-t0)/n).toFixed(0));
          // inventory open timing (survival-like cold cache)
          for(const k in iconCache) delete iconCache[k]; const t1=performance.now(); openInv(); L.push('openInv cold ms '+(performance.now()-t1).toFixed(0)); closeInv&&closeInv();
          return L; }''')
        print('\n'.join(out)); print('ERRS',[e for e in errs if 'WebGL' not in e and 'GPU' not in e][:5])
        if len(sys.argv)>1:
            for k,(dx,dy,dz,yaw) in enumerate([(14.5,1.1,14.5,0)]):
                await pg.evaluate(f'''()=>{{ const g=GALLERY; player.x=g.X0+{dx}; player.y=g.S0+{dy}; player.z=g.Z0+{dz}; player.face={yaw}; }}'''); await pg.wait_for_timeout(5000); await pg.screenshot(path=sys.argv[1]+str(k)+'.png')
        await b.close()
asyncio.run(main())
