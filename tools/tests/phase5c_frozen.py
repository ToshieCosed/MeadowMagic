"""Headless smoke test for the frozen staff: python tools/tests/phase5c_frozen.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w8',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'survival',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const x=Math.floor(player.x)+3,z=Math.floor(player.z),y=world.surface(x,z)+1; for(let dy=0;dy<8;dy++)for(let dx=-4;dx<=24;dx++)for(let dz=-8;dz<=8;dz++)world.set(x+dx,y+dy,z+dz,0); for(let dx=-4;dx<=24;dx++)for(let dz=-8;dz<=8;dz++)world.set(x+dx,y-1,z+dz,B.STONE);
          world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron); const t=world.tiles.get(tileKey(x,y+1,z)); t.tech.w=1; t.tech.items[I.ARCANE_ESS]=10; await W(4500);
          t.tech.items[I.STICK]=1; t.tech.items[I.FROST_ESS]=50; await W(5000); const q=drops.find(d=>ITEMS[d.id].staff); L.push('crafted '+(q&&ITEMS[q.id].name));
          world.set(x,y+1,z,0); world.set(x,y,z,0);
          const setMode=m=>{ inv.slots[0].x={m}; };
          // lake: 9x9 water, 4 deep, in a stone basin at x+8..
          for(let dx=6;dx<=14;dx++)for(let dz=-5;dz<=5;dz++){ for(let dy=-1;dy>=-5;dy--) world.set(x+dx,y+dy,z+dz,B.STONE); for(let dy=-1;dy>=-4;dy--) world.set(x+dx,y+dy,z+dz,B.WATER); }
          player.x=x+.5; player.z=z+.5; player.y=y; inv.slots[0]=mkStack(STAFFS.frost,1); inv.sel=0; setMode('freeze');
          const wc=()=>{let n=0,i=0;for(let dx=6;dx<=14;dx++)for(let dz=-5;dz<=5;dz++)for(let dy=-1;dy>=-4;dy--){ const bb=world.get(x+dx,y+dy,z+dz); if(bb===B.WATER) n++; if(bb===B.ICE) i++; } return [n,i];};
          L.push('before water/ice '+wc()); aimPoint=()=>[x+10.5,y-1+.9,z+.5]; await W(1500); useHeld(400,250); await W(4500); L.push('after water/ice '+wc()+' deep ice at -4: '+world.get(x+10,y-4,z));
          // ice bolt
          for(let dx=6;dx<=14;dx++)for(let dz=-5;dz<=5;dz++)for(let dy=-1;dy>=-4;dy--) world.set(x+dx,y+dy,z+dz,B.STONE);
          setMode('ice'); mobs.length=0; spawnMob('zombie',x+8.5,y,z+.5,false); const zb=mobs[0], hp0=zb.hp; aimPoint=()=>[x+8.5,y+.9,z+.5]; await W(1500); useHeld(400,250); await W(4000); L.push('ice bolt hp '+hp0+'->'+zb.hp+' frostT '+(zb.frostT||0).toFixed(1));
          // frost blocks
          mobs.length=0; setMode('frost'); const sp=toScreen(x+3.5,y-.5,z+.5); aimPoint=()=>[x+3.5,y,z+.5]; await W(1500); useHeld(sp[0],sp[1]); await W(500); let fb=0; for(let dx=0;dx<8;dx++)for(let dy=0;dy<3;dy++)for(let dz=-2;dz<3;dz++) if(world.get(x+dx,y+dy,z+dz)===P2B.frostb) fb++; L.push('frost blocks '+fb);
          // slide with slope: ramp of steps
          for(let dx=0;dx<20;dx++)for(let dz=-8;dz<=8;dz++)for(let dy=0;dy<8;dy++) world.set(x+dx,y+dy,z+dz,0);
          for(let dx=3;dx<20;dx++){ const h=Math.max(0,Math.floor((dx-3)/3)); for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<h;dy++) world.set(x+dx,y+dy,z+dz,B.STONE); }
          setMode('slide'); player.x=x+.5; player.z=z+.5; player.y=y; aimPoint=()=>[x+15.5,y,z+.5]; await W(1500); useHeld(400,250); await W(600);
          const sl=[]; for(let dx=0;dx<20;dx++) for(let dy=0;dy<8;dy++) if(world.get(x+dx,y+dy,z+.5|0)===P2B.slideb) sl.push(dx+':'+dy); L.push('slides '+sl.length+' '+sl.slice(0,18).join(' '));
          // slip: player speed on slide flat vs normal
          mobs.length=0; const sx0=x+3, sy0=y; player.x=x+1.5; player.z=z+.5; player.y=y;
          // unsummon
          const bef=sl.length; const sp3=toScreen(x+4.5,y+.1,z+.5); const r=pick(sp3[0],sp3[1]); L.push('pick '+(r&&world.get(...r.hit)));
          player.x=x+2.5; L.push('fm '+FROZ.fm()+' conn '+FROZ.connected(x+4,y,z).length); FROZ.poof(x+4,y+1,z); await W(300); const sl2=[]; for(let dx=0;dx<20;dx++) for(let dy=0;dy<8;dy++) if(world.get(x+dx,y+dy,z)===P2B.slideb) sl2.push(1); L.push('unsummon '+bef+'->'+sl2.length);
          // block-like persistence: ids are plain block ids
          L.push('ids '+P2B.frostb+' '+P2B.slideb+' '+BLOCKS[P2B.slideb].name);
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
