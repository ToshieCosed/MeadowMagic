"""Coloured wires + bundles. python tools/tests/phase15_wires.py [outdir]  (asserts signal, T-junction max, RF fair split, persistence)"""
import asyncio,pathlib,sys,os,json,base64
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p15'); OUT.mkdir(parents=True,exist_ok=True)
JS='''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'w1',name:'w',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
 const C=world.gen.C, G=SHOW_G+1, X=C+60, Z=C+90; player.x=X; player.y=G+1; player.z=Z-6; await W(4500); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
 const T=T19, TB=TECH.TECHB||{}, res={}; const S=B.STONE;
 for(let x=X-8;x<=X+10;x++) for(let z=Z-2;z<=Z+14;z++){ for(let y=G;y<G+5;y++) world.set(x,y,z,B.AIR); world.set(x,G-1,z,S); }
 const tech=(x,y,z,type,f,o)=>{ world.set(x,y,z,TECHB[type]); const t=T.newTech(x,y,z,type,f); Object.assign(t.tech,o||{}); return t; };
 const red=DYES.findIndex(d=>d.k==='red'), grn=DYES.findIndex(d=>d.k==='green'), blu=DYES.findIndex(d=>d.k==='blue');
 const seg=(x,y,z,f,c)=>WIRE.addSeg(x,y,z,f,c);
 // 1. lever -> red wire along stone -> bundle -> piston
 const lev=tech(X,G,Z,'lever',2,{on:true}); for(let i=1;i<=3;i++){ world.set(X+i,G,Z,S); }
 for(let i=0;i<=3;i++) seg(X+i,G,Z,2,red);
 for(let i=4;i<=6;i++) world.set(X+i,G,Z,BUNDLE_ID);
 const pis=tech(X+7,G,Z,'piston',2,{e:100}); await W(900);
 res.pistonSig=WIRE.inLevel(pis,1); res.pistonConn=WIRE.conn(pis,1); res.nets=WIRE.nets().length;
 lev.tech.on=false; await W(700); res.pistonOff=WIRE.inLevel(pis,1);
 // 2. T junction: 2 on the left, 7 on the right -> 7 out of the bundle
 const L1=tech(X-2,G,Z+4,'lever',2,{on:true}), L2=tech(X+2,G,Z+4,'lever',2,{on:true});
 for(let x=X-1;x<=X+1;x++) world.set(x,G,Z+4,S); world.set(X,G,Z+3,S); world.set(X,G,Z+2,S); world.set(X,G,Z+1,BUNDLE_ID);
 for(let x=X-2;x<=X+2;x++) seg(x,G,Z+4,2,red); seg(X,G,Z+3,2,red); seg(X,G,Z+2,2,red);
 const lamp=tech(X+1,G,Z+1,'lamp_red',4,{e:0});
 const orig=T.sigLevel; T.sigLevel=(n,tw)=>n===L1?2:n===L2?7:orig(n,tw);
 WIRE.rebuild(); WIRE.step(); res.tjunction=WIRE.inLevel(lamp,1); res.tjunctionMax=Math.max(...WIRE.nets().map(n=>n.b1)); T.sigLevel=orig;
 // 3. RF: two solars + capbank + lamp share one bundle (green channel)
 for(let x=X;x<=X+2;x++) world.set(x,G,Z+8,BUNDLE_ID);
 const s1=tech(X-1,G,Z+8,'solar1',4,{e:500}), s2=tech(X+3,G,Z+8,'solar1',4,{e:500}), cb=tech(X+1,G,Z+9,'capbank',4,{e:0}), lp=tech(X+1,G,Z+7,'lamp_red',4,{e:0});
 world.set(X+1,G+1,Z+8,S); seg(X+1,G+1,Z+8,0,grn); WIRE.rebuild(); await W(1200);
 res.rf={lamp:lp.tech.e,cap:cb.tech.e,s1:s1.tech.e,s2:s2.tech.e};
 const n=WIRE.nets().find(n=>n.c===grn); res.netRF=n&&n.rf;
 // 4. persistence + cleanup
 const save=JSON.stringify([...world.wires.entries()]); res.saved=save.length>10;
 world.set(X+1,G+1,Z+8,B.AIR); await W(1300); res.cleaned=!world.wires.has((X+1)+','+(G+1)+','+(Z+8));
 player.x=X+3; player.z=Z-5; player.y=G+3; cam.mode&&0; await W(600); return res; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+(e.stack or '')[:600])); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS.replace('BUNDLE_ID','B.BUNDLE').replace('TECHB.','TECH.TECHB.').replace('TECHB[','TECH.TECHB['))
        await pg.screenshot(path=str(OUT/'wires.png'))
        print(json.dumps(r)); print('errors',errs[:5])
        ok=r['pistonSig']>0 and r['pistonConn'] and r['pistonOff']==0 and r['tjunction']==7 and r['rf']['lamp']>0 and r['rf']['cap']>0 and r['rf']['s1']<500 and r['rf']['s2']<500 and r['cleaned'] and not errs
        print('PASS' if ok else 'FAIL'); await b.close(); sys.exit(0 if ok else 1)
asyncio.run(main())
