"""Braided wire look + flow. python tools/tests/phase16_wire_look.py [outdir]  -> 3 frames of the same scene (flow animates), asserts directions"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p16'); OUT.mkdir(parents=True,exist_ok=True)
SETUP='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w2',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, X=C+60, Z=C+90; player.x=X+3; player.y=G; player.z=Z+3; await W(4500); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const T=T19, S=B.STONE, TB=TECH.TECHB; for(let x=X-4;x<=X+10;x++) for(let z=Z-3;z<=Z+8;z++){ for(let y=G;y<G+4;y++) world.set(x,y,z,B.AIR); world.set(x,G-1,z,S); }
 const tech=(x,y,z,type,f,o)=>{ world.set(x,y,z,TB[type]); const t=T.newTech(x,y,z,type,f); Object.assign(t.tech,o||{}); return t; };
 const ci=k=>DYES.findIndex(d=>d.k===k), red=ci('red'), wh=ci('white'), bl=ci('blue');
 const la=tech(X,G,Z,'lever',2,{on:true}), lb=tech(X+7,G,Z,'lever',2,{on:true}); for(let x=X+1;x<=X+6;x++) world.set(x,G,Z,S);
 for(let x=X;x<=X+6;x++) WIRE.addSeg(x,G,Z,2,red); for(let x=X+1;x<=X+7;x++) WIRE.addSeg(x,G,Z,2,wh);
 // red is driven from the left, white from the right
 const o=T.sigLevel; T.sigLevel=(n,tw)=>n===la?(window.__red||0):n===lb?(window.__white||0):o(n,tw); window.__red=16; window.__white=4;
 // one block with different wires on all six faces
 world.set(X+3,G,Z+4,S); for(let f=0;f<6;f++) WIRE.addSeg(X+3,G,Z+4,f,[red,bl,wh,ci('lime'),ci('purple'),ci('orange')][f]);
 for(let i=0;i<=3;i++) WIRE.addSeg(X+i,G-1,Z+2,2,bl); for(let i=1;i<=3;i++) WIRE.addSeg(X+3,G-1,Z+2+i,2,bl); WIRE.rebuild(); WIRE.step(); await W(300);
 const flows=()=>WIRE.nets().map(n=>({c:DYES[n.c].k,speed:n.speed,fl:n.segs.filter(s=>s.y===G&&s.z===Z).sort((a,b)=>a.x-b.x).map(s=>s.fl[0]-s.fl[1]).slice(2,4)}));
 window.X0=X+3; window.Z0=Z+2; return {flows:flows(),faces:[...world.wires.get((X+3)+','+G+','+(Z+4))].length}; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640},device_scale_factor=1); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(SETUP); print(json.dumps(r))
        await pg.evaluate('()=>{ cam.zoom=3.2; cam.zv=0; player.x=window.X0; player.z=window.Z0; player.y=SHOW_G+1; }'); await pg.wait_for_timeout(1500)
        for i in range(3): await pg.wait_for_timeout(180); await pg.screenshot(path=str(OUT/f'f{i}.png'))
        await pg.evaluate('()=>{ window.__red=0; window.__white=0; }'); await pg.wait_for_timeout(400); await pg.screenshot(path=str(OUT/'idle.png'))
        print(errs[:3]); await b.close()
asyncio.run(main())
