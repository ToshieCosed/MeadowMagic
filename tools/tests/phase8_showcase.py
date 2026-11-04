"""Showcase magic & physics district check: python tools/tests/phase8_showcase.py [shot.png]"""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':620}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'ws',name:'show',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'survival',created:1,played:1},null,false); await W(5000); mode='play'; document.getElementById('menu').hidden=true;
          const C=world.gen.C, G=SHOW_G+1, MD=MAGICDISTRICT; L.push('registry cages '+MD.CAGES.length+' feeds '+MD.FEEDS.length+' sources '+MD.SRCS.length);
          const signs=world.decor.filter(d=>d.kind==='sign'&&d.c[0]>C+60); L.push('signs in district '+signs.length+' longest line '+Math.max(...signs.flatMap(s=>s.text.split('\\n').map(l=>l.length))));
          window.__tp=(x,z)=>{ player.x=x; player.z=z; player.y=G+3; player.vy=0; };
          // walk the district so chunks load and runtimes fire
          for(const dx of [75,95,115,135,155,175,195]){ __tp(C+dx,C-6); await W(2500); }
          const mc=mobs.filter(m=>m.cage||true).map(m=>m.type); const zoo=MD.CAGES.filter(c=>mobs.some(m=>m.type===c.type&&m.x>=c.x0&&m.x<=c.x1&&m.z>=c.z0&&m.z<=c.z1)).length; L.push('cages occupied '+zoo+'/'+MD.CAGES.length);
          for(const dx of [75,100,125,150,175,195]){ __tp(C+dx,C+8); await W(2500); }
          L.push('fire tiles '+[...world.tiles.values()].filter(t=>t.kind==='p2').length+' hoppers '+[...world.tiles.values()].filter(t=>t.kind==='tech'&&t.tech.type==='hopper').map(t=>t.tech.low?'low':'normal').join(','));
          // run the physics for a while
          const sim=n=>{ for(let i=0;i<n;i++){ stepDrops(1/30); fluidT=0; stepFluids(1/30); } };
          __tp(C+120,C+8); await W(6000); sim(600);
          const relayFeed=5; await W(1500); sim(400);
          const rs=drops.filter(q=>q.feed===relayFeed); L.push('relay items '+rs.length+' x '+rs.map(q=>(q.x-C).toFixed(1)).join(','));
          const lanes=[0,1,2,3,4].map(i=>[i]); await W(1000); sim(300); L.push('lane items '+drops.filter(q=>lanes.some(([i])=>q.feed===i)).map(q=>q.feed+':'+(q.x-C).toFixed(0)).join(' '));
          // dedicated relay trace
          { const f=MD.FEEDS[5]; __tp(f.x+12,f.z+4); await W(7000); drops.length=0; spawnDrop(f.x,f.y,f.z,I.STICK,1); const q=drops[0]; q.age=1; q.vx=q.vy=q.vz=0; const tr=[]; for(let i=0;i<9;i++){ sim(100); tr.push((q.x-f.x).toFixed(1)+'@'+q.y.toFixed(1)); } L.push('relay trace '+tr.join(' ')+' alive '+drops.includes(q)); const pr=[]; for(let dx=14;dx<=21;dx++){ const X=Math.floor(f.x)+dx, Z=Math.floor(f.z); pr.push(dx+':'+(BLOCKS[world.get(X,G,Z)]?BLOCKS[world.get(X,G,Z)].name.slice(0,8):world.get(X,G,Z))+(world.solid(X,G,Z)?'S':'')+(FL[world.get(X,G,Z)]?FL[world.get(X,G,Z)].lv:'')); } L.push('cells '+pr.join(' ')+' item '+q.x.toFixed(2)+' vx '+q.vx.toFixed(2)+' fx '+JSON.stringify(flowAt(Math.floor(q.x),Math.floor(q.y),Math.floor(q.z)))); }
          // hoppers
          __tp(MD.FEEDS[6].x+6,MD.FEEDS[6].z+4); await W(6000); for(let i=0;i<8;i++){ await W(2500); sim(200); } 
          L.push('feeds '+MD.FEEDS.map((f,i)=>i+':vx'+f.vx+' n'+drops.filter(q=>q.feed===i).length+' '+drops.filter(q=>q.feed===i).map(q=>(q.x-f.x).toFixed(1)+','+q.y.toFixed(1)).join('/')).join(' | '));
          const hs=[...world.tiles.values()].filter(t=>t.kind==='tech'&&t.tech.type==='hopper'&&t.x>C+60); L.push('district hoppers '+hs.map(h=>h.x-C+':'+(h.tech.low?'low':'norm')+' got '+h.tech.slots.filter(Boolean).length).join(' ')+' | chests '+[...world.tiles.values()].filter(t=>t.kind==='chest'&&t.x>C+165&&t.z>C).map(t=>t.s.filter(Boolean).length).join(','));
          const rowLv=[]; const rx=C+68+18*3+1; for(let dx=0;dx<10;dx++){ const f=FL[world.get(rx+dx,G,C+7)]; rowLv.push(f?f.lv:'-'); } L.push('relay section levels '+rowLv.join(','));
          // cauldron ready
          const cd=[...world.tiles.values()].find(t=>t.kind==='p2'&&t.tech.type==='cauldron'); L.push('cauldron water '+(cd&&cd.tech.w));
          __tp(C+75,C-6); return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4])
        if len(sys.argv)>1: await pg.wait_for_timeout(3000); await pg.screenshot(path=sys.argv[1])
        await b.close()
asyncio.run(main())
