"""Headless test: water currents, ice friction, drop-seeking flow, low hoppers: python tools/tests/phase6_currents.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w9',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'creative',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const sim=n=>{ for(let i=0;i<n;i++){ stepDrops(1/30); fluidT=0; stepFluids(1/30); } }; const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=-1;dy<8;dy++)for(let dx=-4;dx<=30;dx++)for(let dz=-6;dz<=6;dz++)world.set(x+dx,y+dy,z+dz,dy<0?B.STONE:0);
          player.x=x-3; player.z=z+5; player.y=y;
          // channel along +x with walls, water source at x+0; ice floor from x+8
          for(let dx=0;dx<=22;dx++){ world.set(x+dx,y,z-1,B.STONE); world.set(x+dx,y,z+1,B.STONE); }
          for(let dx=8;dx<=22;dx++) world.set(x+dx,y-1,z,dx<14?B.ICE:B.PACKED_ICE);
          world.set(x,y,z,B.WATER); fluidNotify(x,y,z); sim(200);
          let w=[]; for(let dx=0;dx<=12;dx++) w.push(FL[world.get(x+dx,y,z)]?FL[world.get(x+dx,y,z)].lv:'-'); L.push('levels '+w.join(','));
          // item in stream
          drops.length=0; spawnDrop(x+1.5,y+.5,z+.5,I.STICK,1); const q=drops[0]; q.vx=q.vy=q.vz=0; q.age=1; const x0=q.x; sim(120); L.push('item moved '+(q.x-x0).toFixed(1)+' vx '+q.vx.toFixed(2)+' y '+q.y.toFixed(2));
          // item on ice: kick and measure distance vs stone
          drops.length=0; spawnDrop(x+9.5,y+.2,z+.5,I.STICK,1); const qi=drops[0]; qi.age=1; qi.vx=4; qi.vy=0; qi.vz=0; const xi=qi.x; sim(150); const di=qi.x-xi;
          spawnDrop(x-3.5,y+.2,z+3.5,I.STICK,1); const qs=drops[drops.length-1]; qs.age=1; qs.vx=4; qs.vy=0; qs.vz=0; const xs=qs.x; sim(150); L.push('slide dist ice '+di.toFixed(1)+' vs stone '+(qs.x-xs).toFixed(1));
          // drop-seeking: source with a hole 3 away
          for(let dx=0;dx<=8;dx++)for(let dz=-6;dz<=-3;dz++){ for(let dy=0;dy<3;dy++) world.set(x+dx,y+dy,z+dz,0); world.set(x+dx,y-1,z+dz,B.STONE); } world.set(x+6,y-1,z-4,B.AIR); world.set(x+6,y-2,z-4,B.STONE);
          world.set(x+3,y,z-4,B.WATER); fluidNotify(x+3,y,z-4); sim(200); let row=[]; for(let dx=0;dx<=8;dx++) row.push(FL[world.get(x+dx,y,z-4)]?FL[world.get(x+dx,y,z-4)].lv:'-'); let col=[]; for(let dz=-6;dz<=-3;dz++) col.push(FL[world.get(x+3,y,z+dz)]?FL[world.get(x+3,y,z+dz)].lv:'-'); L.push('toward hole row '+row.join(',')+' | col '+col.join(','));
          // low hopper catches items sliding against its side
          const HB=BLOCKS.findIndex(b=>b&&b.name==='Hopper'); const hx=x+20; world.set(hx,y,z-1,0); world.set(hx,y,z+1,0); for(let dx=8;dx<=22;dx++) world.set(x+dx,y-1,z,B.ICE);
          world.set(hx+2,y,z,HB); afterPlace(hx+2,y,z,HB); const ht=world.tiles.get(tileKey(hx+2,y,z)); ht.tech.low=true; ht.tech.f=3; world.set(x+8,y,z-1,0);
          drops.length=0; spawnDrop(hx-2.5,y+.2,z+.5,I.STICK,1); const qh=drops[0]; qh.age=1; qh.vx=6; qh.vy=0; qh.vz=0; sim(150); await W(4000); L.push('item at '+(qh.x-x).toFixed(2)+','+qh.y.toFixed(2)+','+(qh.z-z).toFixed(2)+' hopper cell '+(hx+2-x)+','+y+' ht '+!!ht+' pos '+ht.x+','+ht.y); L.push('hopper got '+JSON.stringify(ht.tech.slots.filter(Boolean).map(s=>ITEMS[s.id].name+':'+s.n))+' drops left '+drops.length);
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
