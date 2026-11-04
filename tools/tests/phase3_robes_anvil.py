"""Headless smoke test (needs playwright and Chrome). Run: python tools/tests/phase3_robes_anvil.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; startWorld({id:'w3',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'survival',created:1,played:1},null,false); await new Promise(r=>setTimeout(r,4000)); mode='play'; document.getElementById('menu').hidden=true;
          const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=0;dy<4;dy++)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)world.set(x+dx,y+dy,z+dz,0);
          world.set(x,y-1,z,B.STONE); world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron);
          const t=world.tiles.get(tileKey(x,y+1,z)); const boots=2000+1*4+3; L.push('leather boots '+ITEMS[boots].name); t.tech.w=1; t.tech.items[boots]=1; t.tech.items[I.FROST_ESS]=1;
          await new Promise(r=>setTimeout(r,4500)); const q=drops.find(d=>ITEMS[d.id]&&ITEMS[d.id].ess); L.push('drop '+(q&&ITEMS[q.id].name)+' ess '+(q&&ITEMS[q.id].ess));
          const rid=q.id; inv.armor[3]=mkStack(rid,1); L.push('resist frost '+essResist('frost').toFixed(2)+' burn '+essResist('burn').toFixed(2));
          p0=player.hp; hurt(10,'Frozen by an ice mage'); L.push('hp loss '+(p0-player.hp)); player.hp=p0;
          // anvil lining
          inv.armor[3]=null; const dia=ARMATS.findIndex(m=>m.k==='diamond'); const dboots=2000+dia*4+3; inv.slots[0]=mkStack(dboots,1); inv.slots[1]=mkStack(rid,1);
          world.set(x+1,y,z,P2B.anvil); anvilUI(); L.push('anvil ui '+document.getElementById('anvilUI').innerText.slice(0,80).replace(/\\n/g,'|'));
          const btn=[...document.querySelectorAll('#anvilUI button')].find(b=>/Line/.test(b.textContent)); L.push('btn '+(btn&&btn.textContent)); btn.click();
          L.push('lined '+JSON.stringify(inv.slots[0].x)+' slot1 '+JSON.stringify(inv.slots[1])+' tip '+enchText(inv.slots[0]));
          inv.armor[3]=inv.slots[0]; L.push('resist frost now '+essResist('frost').toFixed(2));
          L.push('icon '+(!!itemIconCanvas(rid))+' anvil icon '+(!!iconFor(P2B.anvil)));
          return L; }''')
        print('\n'.join(out)); await pg.wait_for_timeout(500); print('ERRS',[e for e in errs][:5]); await b.close()
asyncio.run(main())
