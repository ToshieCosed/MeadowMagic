"""Headless smoke test for illusioner staff + shadow blocks: python tools/tests/phase5b_illusioner.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w7',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'survival',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=0;dy<6;dy++)for(let dx=-4;dx<=14;dx++)for(let dz=-4;dz<=4;dz++)world.set(x+dx,y+dy,z+dz,0); for(let dx=-4;dx<=14;dx++)for(let dz=-4;dz<=4;dz++)world.set(x+dx,y-1,z+dz,B.STONE);
          // craft
          world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron); const t=world.tiles.get(tileKey(x,y+1,z)); t.tech.w=1; t.tech.items[I.ARCANE_ESS]=10; await W(4500);
          t.tech.items[I.STICK]=1; t.tech.items[I.SHADOW_ESS]=50; await W(5000); const q=drops.find(d=>ITEMS[d.id].staff); L.push('crafted '+(q&&ITEMS[q.id].name));
          world.set(x,y+1,z,0); world.set(x,y,z,0);
          player.x=x+.5-3; player.z=z+.5; player.y=y; inv.slots[0]=mkStack(STAFFS.illusion,1); inv.sel=0; inv.slots[0].x={m:'teleport'};
          // teleport
          const x0=player.x; aimPoint=()=>[x0+8,y,z+.5]; useHeld(400,250); await W(500); L.push('blink dx '+(player.x-x0).toFixed(1));
          // blocks mode
          player.x=x+.5-3; player.z=z+.5; player.y=y; player.crouch=true; for(let i=0;i<3;i++){ player.crouch=true; useHeld(10,10); player.crouch=false; await W(1500);} L.push('mode '+JSON.stringify(inv.slots[0].x));
          for(let i=0;i<4;i++) world.set(x+4,y+i,z,B.STONE); world.set(x+5,y,z,B.STONE);
          const cnt=()=>{let n=0;for(let dx=-4;dx<=14;dx++)for(let dy=0;dy<6;dy++)for(let dz=-4;dz<=4;dz++) if(world.get(x+dx,y+dy,z+dz)===P2B.shadowb) n++; return n;};
          world.set(x+6,y,z,P2B.shadowb); world.set(x+7,y,z,P2B.shadowb); world.set(x+7,y+1,z,P2B.shadowb); L.push('shadow count '+cnt());
          // mob damage
          mobs.length=0; spawnMob('cow',x+6.5,y,z+.5,false); const cow=mobs[0], h0=cow.hp; await W(3000); L.push('cow hp '+h0+'->'+cow.hp);
          // fill with held block
          const bi=Number(Object.keys(ITEMS).find(k=>ITEMS[k].block===B.STONE)); inv.slots[1]=mkStack(bi,10); inv.sel=1; player.x=x+3.5; player.z=z+.5; const sp=toScreen(x+7.5,y+.5,z+.5); const n0=inv.slots[1].n; tryInteract(sp[0],sp[1]); await W(500); L.push('after fill shadow '+cnt()+' stack '+n0+'->'+(inv.slots[1]&&inv.slots[1].n));
          for(let i=0;i<4;i++) world.set(x+4,y+i,z,0); world.set(x+5,y,z,0); player.y=y;
          // unsummon
          world.set(x+6,y,z,P2B.shadowb); world.set(x+8,y,z,P2B.shadowb); world.set(x+8,y+1,z,P2B.shadowb); const before=cnt(); inv.sel=0; player.x=x+2.5; player.z=z+.5; const sp2=toScreen(x+8.5,y+.5,z+.5); const r=pick(sp2[0],sp2[1]); L.push('pick '+(r&&JSON.stringify(r.hit))+' mineTime '+mineTime(P2B.shadowb,null)); window.__x=0; 
          // simulate hold via pointerdown
          document.dispatchEvent(new PointerEvent('pointerdown',{clientX:sp2[0],clientY:sp2[1],bubbles:true})); await W(2800); L.push('unsummon '+before+'->'+cnt()+' illu mode '+staffMode0(inv.slots[0])+' held '+ITEMS[held().id].staff);
          // blind bolt
          for(let dx=0;dx<=9;dx++)for(let dy=0;dy<3;dy++) world.set(x+dx,y+dy,z,0); inv.slots[0].x={m:'shadow'}; mobs.length=0; spawnMob('zombie',x+6.5,y,z+.5,false); const zb=mobs[0]; zb.x=x+6.5; player.x=x+.5-3; player.z=z+.5; const sz=toScreen(x+6.5,y+.9,z+.5); aimPoint=()=>[x+6.5,y+.9,z+.5]; await W(1500); useHeld(sz[0],sz[1]); await W(300); L.push('pb '+ILLU.pb.length+' pos '+player.x.toFixed(1)+','+player.y.toFixed(1)); await W(3700); L.push('blindT '+zb.blindT+' alive '+mobs.includes(zb)+' pos '+zb.x.toFixed(1)+','+zb.y.toFixed(1)+','+zb.z.toFixed(1)+' hp '+zb.hp);
          // decoy lures zombie
          mobs.length=0; inv.slots[0].x={m:'decoy'}; spawnMob('zombie',x+12.5,y,z+3.5,false); const z2=mobs[0]; z2.blindT=0; player.x=x-3; player.z=z+.5; const dxp=x+1.5; aimPoint=()=>[dxp,y,z-3.5]; await W(1500); useHeld(400,250); const d0=Math.hypot(z2.x-dxp,z2.z-(z-3.5)); await W(5000); L.push('decoy dist '+d0.toFixed(1)+'->'+Math.hypot(z2.x-dxp,z2.z-(z-3.5)).toFixed(1));
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
