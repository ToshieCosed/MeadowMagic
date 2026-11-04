"""Pressure-plate water relay test (see docs/relay-spec.md): python tools/tests/phase7_relay.py"""
import asyncio,pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':800,'height':500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w10',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'creative',created:1,played:1},null,false); await W(4000); mode='play'; document.getElementById('menu').hidden=true;
          const sim=n=>{ for(let i=0;i<n;i++){ stepDrops(1/30); fluidT=0; stepFluids(1/30); } };
          const x=Math.floor(player.x)+2,z=Math.floor(player.z),y=world.surface(x,z)+1; const PL=PLATE_MATS?0:0;
          const plateId=BLOCKS.findIndex(b=>b&&/Wooden pressure plate/.test(b.name)&&b.plate&&!b.plate.pr);
          const SEC=5, LEN=9; // source + 7 flowing + plate
          const build=(walls,ice)=>{ for(let dy=-1;dy<4;dy++)for(let dx=-3;dx<=LEN*SEC+4;dx++)for(let dz=-6;dz<=6;dz++)world.set(x+dx,y+dy,z+dz,dy<0?B.STONE:0);
            if(ice) for(let dx=0;dx<LEN*SEC;dx++) world.set(x+dx,y-1,z,B.ICE);
            for(let s=0;s<SEC;s++){ const ox=s*LEN; if(walls) for(let dx=0;dx<LEN-1;dx++){ world.set(x+ox+dx,y,z-1,B.STONE); world.set(x+ox+dx,y,z+1,B.STONE); }
              world.set(x+ox+LEN-1,y,z,plateId); world.set(x+ox,y,z,B.WATER); fluidNotify(x+ox,y,z); } sim(300); };
          const run=(label)=>{ drops.length=0; spawnDrop(x+1.5,y+.5,z+.5,I.STICK,1); const q=drops[0]; q.vx=q.vy=q.vz=0; q.age=1; let maxX=q.x, back=0; const trace=[];
            for(let i=0;i<1500;i++){ const px=q.x; sim(1); if(q.x<px) back++; maxX=Math.max(maxX,q.x); if(i%100===0) trace.push((q.x-x).toFixed(0)); }
            L.push(label+': final x '+(q.x-x).toFixed(1)+' of '+(LEN*SEC)+' z '+(q.z-z).toFixed(2)+' y '+(q.y-y).toFixed(2)+' trace '+trace.join(',')); return q; };
          build(true,false); let lv=[]; for(let dx=0;dx<LEN;dx++){ const f=FL[world.get(x+dx,y,z)]; lv.push(f?f.lv:(world.get(x+dx,y,z)===plateId?'P':'-')); } L.push('section 1 levels '+lv.join(','));
          run('A-E,G walls, no ice');
          build(false,false); for(let dz=-4;dz<=4;dz++){ let r=[]; for(let dx=0;dx<=20;dx++){ const f=FL[world.get(x+dx,y,z+dz)]; r.push(f?f.lv:(world.get(x+dx,y,z+dz)===plateId?'P':'.')); } L.push('z'+dz+' '+r.join('')); } run('F no walls, no ice');
          build(true,true); run('walls + ice');
          // H: pause in unloaded chunk keeps velocity
          build(true,false); drops.length=0; spawnDrop(x+1.5,y+.5,z+.5,I.STICK,1); const q=drops[0]; q.age=1; q.vx=3; const cx=Math.floor(q.x)>>4, cz=Math.floor(q.z)>>4; const key=world.key(cx,cz), ch=world.chunks.get(key); world.chunks.delete(key); const pos=[q.x,q.vx]; sim(60); const paused=(q.x===pos[0]&&q.vx===pos[1]); world.chunks.set(key,ch); sim(10); L.push('H paused '+paused+' resumed moved '+(q.x>pos[0]));
          return L; }''')
        print('\n'.join(out)); print('ERRS',errs[:4]); await b.close()
asyncio.run(main())
