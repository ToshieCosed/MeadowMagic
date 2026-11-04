"""Headless smoke test (playwright + Chrome): python tools/tests/phase5a_staffs.py. Slow under software GL; waits are long on purpose."""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w6',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'survival',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=0;dy<5;dy++)for(let dx=-3;dx<=6;dx++)for(let dz=-3;dz<=3;dz++)world.set(x+dx,y+dy,z+dz,0); for(let dx=-3;dx<=6;dx++)for(let dz=-3;dz<=3;dz++)world.set(x+dx,y-1,z+dz,B.STONE);
          world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron); const t=world.tiles.get(tileKey(x,y+1,z)); t.tech.w=1; t.tech.items[I.ARCANE_ESS]=10; await W(4500); L.push('activated '+t.tech.act);
          t.tech.items[I.STICK]=1; t.tech.items[I.BURN_ESS]=50; await W(5000); let q=drops.find(d=>ITEMS[d.id].staff); L.push('crafted '+(q&&ITEMS[q.id].name)+' items left '+JSON.stringify(t.tech.items));
          world.set(x,y+1,z,0); world.set(x,y,z,0); // arcane staff light
          player.x=x+0.5-4; player.z=z+.5; player.y=y; const tx=x+4, ty=y;
          inv.slots[0]=mkStack(STAFFS.arcane,1); inv.sel=0; world.set(tx+1,ty,z,B.STONE); const sc=toScreen(tx+1,ty+.5,z+.5); aimPoint=()=>[tx+1.5,ty+.5,z+.5]; 
          L.push('btn hidden '+document.getElementById('bStaff').hidden); await W(400); L.push('btn after '+document.getElementById('bStaff').hidden+' '+document.getElementById('bStaff').innerText);
          useHeld(sc[0],sc[1]); await W(1500); let lights=0; for(let dx=-6;dx<=8;dx++)for(let dz=-3;dz<=3;dz++)for(let dy=-1;dy<4;dy++) if(BLOCKS[world.get(x+dx,y+dy,z+dz)]&&BLOCKS[world.get(x+dx,y+dy,z+dz)].mlight!==undefined) lights++; L.push('mage lights '+lights);
          // mode toggle
          player.crouch=true; useHeld(10,10); player.crouch=false; L.push('mode '+inv.slots[0].x.m);
          // flame staff smelt iron
          inv.slots[1]=mkStack(STAFFS.flame,1); inv.sel=1; inv.slots[1].x={m:'smelt'}; world.set(tx+1,ty,z,B.ORE_IRON); world.set(tx+1,ty,z+2,B.ORE_TITANIUM); drops.length=0;
          let s2=toScreen(tx+1,ty+.5,z+.5); aimPoint=()=>[tx+1.5,ty+.5,z+.5]; await W(1500); useHeld(s2[0],s2[1]); await W(4000); L.push('iron drop '+drops.map(d=>ITEMS[d.id].name+':'+d.n).join(',')+' block '+BLOCKS[world.get(tx+1,ty,z)].name);
          // titanium needs upgrade
          player.z=z+2.5; let s3=toScreen(tx+1,ty+.5,z+2.5); aimPoint=()=>[tx+1.5,ty+.5,z+2.5]; await W(1500); drops.length=0; useHeld(s3[0],s3[1]); await W(4000); L.push('ti '+BLOCKS[world.get(tx+1,ty,z+2)].name+' drops '+drops.length);
          // crucible heat
          world.set(tx+1,ty,z,B.SMELTER); const tl=getTile(tx+1,ty,z); player.z=z+.5; inv.slots[1].x={m:'bolt'}; s2=toScreen(tx+1,ty+.5,z+.5); aimPoint=()=>[tx+1.5,ty+.5,z+.5]; await W(1500); useHeld(s2[0],s2[1]); await W(4000); L.push('smelter burn '+tl.burn);
          // flame hurts mob
          mobs.length=0; spawnMob('cow',tx-1,ty,z+.5,false); const cow=mobs[0]; const hp0=cow.hp; s2=toScreen(tx-1,ty+.7,z+.5); aimPoint=()=>[tx-1,ty+.9,z+.5]; cow.x=tx+2.5; await W(1500); useHeld(s2[0],s2[1]); await W(4000); L.push('cow hp '+hp0+'->'+cow.hp);
          // remove a light by mining
          world.set(tx,ty,z,MLB[0]); const sp=toScreen(tx+.5,ty+.5,z+.5); const r=pick(sp[0],sp[1]); L.push('pick light '+(r?JSON.stringify(r.hit):'none')+' mineTime '+mineTime(MLB[0],null));
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
