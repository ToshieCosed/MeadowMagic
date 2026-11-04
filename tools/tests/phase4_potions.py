"""Headless smoke test (playwright + Chrome): python tools/tests/phase4_potions.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w4',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'survival',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=0;dy<4;dy++)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)world.set(x+dx,y+dy,z+dz,0);
          world.set(x,y-1,z,B.STONE); world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron);
          const t=world.tiles.get(tileKey(x,y+1,z)); t.tech.w=1; const I1=I.GLASS_BOTTLE; L.push('bottle '+ITEMS[I1].name+' recipe '+RECIPES.some(r=>r.out===I1));
          t.tech.items[I1]=1; t.tech.items[I.FROST_ESS]=1; await W(4500); let q=drops.find(d=>ITEMS[d.id].be); L.push('bottled '+(q&&ITEMS[q.id].name)); drops.length=0;
          t.tech.items[q.id]=1; t.tech.items[I.SUGAR]=6; await W(4500); q=drops.find(d=>ITEMS[d.id].potion); L.push('potion '+(q&&ITEMS[q.id].name)+' sx '+JSON.stringify(q&&q.sx));
          inv.slots[inv.sel]=Object.assign(mkStack(q.id,1),{x:q.sx}); inv.sel=inv.sel; const pb=player.hp; drinkPotion(held()); await W(500); L.push('buff '+buff('frost')+' col '+document.getElementById('buffs').children.length+' txt '+document.getElementById('buffs').innerText.trim());
          L.push('resist frost '+essResist('frost')); player.y=y+8; // ice under feet
          const wx=Math.floor(player.x), wz=Math.floor(player.z), sy=world.surface(wx,wz); world.set(wx,sy,wz,B.WATER); player.y=sy+1; await W(800); L.push('under feet '+BLOCKS[world.get(wx,sy,wz)].name);
          drinkPotion; inv.slots[inv.sel]=Object.assign(mkStack(I.POT_arcane||ITEMS.length,1),{}); 
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
