"""Big terminal screens: no leak, no freeze, flat terminals, rectangle splitting. python tools/tests/phase17_terminals.py [outdir]"""
import asyncio,pathlib,sys,os,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p17'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w3',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, X=C+60, Z=C+90; player.x=X+4; player.y=G; player.z=Z-6; await W(4500); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const TB=TECH.TECHB, T=T19, S=B.STONE; for(let x=X-4;x<=X+30;x++) for(let z=Z-3;z<=Z+6;z++){ for(let y=G;y<G+16;y++) world.set(x,y,z,B.AIR); world.set(x,G-1,z,S); }
 const tech=(x,y,z,type,f,o)=>{ world.set(x,y,z,TB[type]); const t=T.newTech(x,y,z,type,f); Object.assign(t.tech,o||{}); return t; };
 const res={}; let n0=0;
 // grow a 24 x 12 wall of RF terminals one block at a time, drawing between each, like a player building it
 for(let y=0;y<12;y++) for(let x=0;x<24;x++){ tech(X+x,G+y,Z,'terminal',4,{e:50}); if(x%6===0){ await W(40); } }
 res.tex1=__tt.termTex.size;
 // ragged shape: remove a middle block -> several rectangles, none bigger than the real build
 const rm=world.tiles.get(T.TK(X+5,G+4,Z)); world.tiles.delete(T.TK(X+5,G+4,Z)); world.set(X+5,G+4,Z,B.AIR); T.techDirty(); await W(700);
 // flat terminals on a wall
 for(let y=0;y<3;y++) for(let x=0;x<4;x++) tech(X+26+x,G+y,Z+2,'fterm',4,{e:50});
 await W(800); mode='inv'; const t0=performance.now(); for(let i=0;i<20;i++) await W(50); res.invMs=Math.round(performance.now()-t0); mode='play';
 res.groups=__tt.termGroups().map(g=>g.length).sort((a,b)=>b-a).slice(0,6);
 res.fterm=!!TB.fterm; return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS); r['texCount']=await pg.evaluate('()=>__tt.termTex.size'); await pg.screenshot(path=str(OUT/'wall.png')); print(json.dumps(r),errs[:3]); await b.close()
asyncio.run(main())
