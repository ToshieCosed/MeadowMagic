"""Headless smoke test (needs playwright and Chrome). Run: python tools/tests/phase2_cauldron_glass.py"""
import asyncio,pathlib,json,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':800,'height':500})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate('''async()=>{ const meta={id:'wtest',name:'t',seed:'abc',seedNum:seedFrom('abc'),size:100,height:DEPTHS.mini.height,sea:DEPTHS.mini.sea,depth:'mini',caves:1,gen:2,mc:1,gameMode:'creative',created:1,played:1};
          startWorld(meta,null,false); await new Promise(r=>setTimeout(r,4000)); return {mode, ok:!!world, P2B:!!P2B.cauldron, size:world.size}; }''')
        print('start',r)
        out=await pg.evaluate('''async()=>{ const L=[]; const p=player; const x=Math.floor(p.x)+3, z=Math.floor(p.z), y=world.surface(x,z)+1;
          // clear space, build lava floor + cauldron above
          for(let dy=0;dy<4;dy++) for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++) world.set(x+dx,y+dy,z+dz,0);
          world.set(x,y-1,z,B.STONE); world.set(x,y,z,P2B.fire); afterPlace(x,y,z,P2B.fire); world.set(x,y+1,z,P2B.cauldron); afterPlace(x,y+1,z,P2B.cauldron);
          const t=world.tiles.get(tileKey(x,y+1,z)); L.push('tile '+!!t+' '+t.kind);
          t.tech.w=1; t.tech.items[B.SAND]=2; t.tech.items[I.SHADOW_ESS]=1;
          await new Promise(r=>setTimeout(r,4200));
          L.push('after brew items '+JSON.stringify(t.tech.items)+' drops '+drops.map(d=>d.id+':'+d.n).join(','));
          // glass collision
          const g=P2B.wg_shadow; world.set(x+2,y,z+2,g); WGX='player'; const sp=world.solid(x+2,y,z+2); WGX='hostile'; const sh=world.solid(x+2,y,z+2); WGX='item'; const si=world.solid(x+2,y,z+2); WGX='player';
          world.set(x+2,y,z+2,P2B.wg_burn); const b1=[ 'player','hostile','passive','item'].map(c=>{WGX=c;return world.solid(x+2,y,z+2)}); WGX='player';
          world.set(x+2,y,z+2,P2B.wg_life); const b2=['player','hostile','passive','item'].map(c=>{WGX=c;return world.solid(x+2,y,z+2)}); WGX='player';
          world.set(x+2,y,z+2,P2B.wg_frost); const b3=['player','hostile','passive','item'].map(c=>{WGX=c;return world.solid(x+2,y,z+2)}); WGX='player';
          L.push('shadow(player,hostile,item) solid: '+[sp,sh,si]); L.push('burn p/h/pa/i '+b1); L.push('life '+b2); L.push('frost '+b3);
          // light emitted by glass?
          mode='play'; document.getElementById('menu').hidden=true; L.push('mode '+mode); L.push('emit '+JSON.stringify(EMIT[g])+' icon '+(typeof iconFor(g)));
          for(const id of [P2B.fire,P2B.cauldron,g]) L.push(BLOCKS[id].name+' icon '+(!!iconFor(id)));
          const ex=x, ez=z+2; world.set(ex,y,ez,B.STONE); world.set(ex,y+1,ez,P2B.cauldron); afterPlace(ex,y+1,ez,P2B.cauldron); const t2=world.tiles.get(tileKey(ex,y+1,ez)); t2.tech.w=1; t2.tech.col=[150,90,230]; t2.tech.items[I.SHADOW_ESS]=3; t2.tech.items[B.SAND]=2; t2.tech.hot=true;
          world.set(ex-2,y,ez,P2B.wg_life); world.set(ex-2,y+1,ez,P2B.wg_burn); world.set(ex-3,y,ez,P2B.wg_frost);
          return L; }''')
        print('\n'.join(out))
        await pg.wait_for_timeout(2500); await pg.screenshot(path='shot.png')
        print('ERRS',errs[:8])
        await b.close()
asyncio.run(main())
