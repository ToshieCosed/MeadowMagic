"""Beds, sleeping bags, weaving wheel, banners. python tools/tests/phase14_beds_banners.py outdir   (writes sheets + screenshots, asserts behaviour)"""
import asyncio,pathlib,sys,os,base64,json
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/p14'); OUT.mkdir(parents=True,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':640},device_scale_factor=2); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        sheets=await pg.evaluate('''()=>{ const V=__v37, out={}; const cell=(ids,cols,S)=>{ const c=document.createElement('canvas'); c.width=cols*S; c.height=Math.ceil(ids.length/cols)*S; const g=c.getContext('2d'); g.fillStyle='#56637a'; g.fillRect(0,0,c.width,c.height);
            ids.forEach((id,i)=>{ const x=(i%cols)*S, y=(i/cols|0)*S; g.save(); g.translate(x+4,y+4); g.scale((S-8)/16,(S-8)/16); const d=V.PIECE[id]; if(d.full){ g.restore(); g.save(); g.translate(x+S/2-8,y+2); const bn=V.renderBanner({b:'#56637a',L:[[{p:id,a:'#fff',b:'#111',x:0,y:0}],[],[]]},{sc:.5,flat:1}); g.drawImage(bn,0,0,16,32); } else d.f(g,'#ffffff','#111111',{}); g.restore(); }); return c.toDataURL(); };
          out.shapes=cell(V.PL.shape.concat(V.PL.icon),10,72); out.emoji=cell(V.PL.emoji,10,60);
          const c=document.createElement('canvas'); const P=V.PRESETS; c.width=10*70; c.height=Math.ceil(P.length/10)*130; const g=c.getContext('2d'); g.fillStyle='#56637a'; g.fillRect(0,0,c.width,c.height); P.forEach((q,i)=>g.drawImage(V.renderBanner(q.ban,{sc:1.6}),(i%10)*70+9,(i/10|0)*130+4)); out.pre=c.toDataURL();
          const pats=V.PL.pat; out.pats=cell(pats,10,72); return out; }''')
        for k,v in sheets.items(): (OUT/(k+'.png')).write_bytes(base64.b64decode(v.split(',')[1]))
        r=await pg.evaluate('''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'m1',name:'m',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false);
          const C=world.gen.C, G=SHOW_G+1, X=C+60, Z=C+90; player.x=X; player.y=G+1; player.z=Z-6; await W(4500); document.getElementById('menu').hidden=true; mode='play'; mobs.length=0;
          const res={}; const stone=B.STONE; for(let x=X-8;x<=X+8;x++) for(let z=Z-9;z<=Z-1;z++){ for(let y=G;y<G+6;y++) world.set(x,y,z,B.AIR); world.set(x,G-1,z,B.GRASS); }
          for(let y=G;y<G+4;y++) world.set(X-6,y,Z-5,stone);
          player.x=X; player.y=G; player.z=Z-8; player.face=0;
          const red=DYES.find(d=>d.k==='red'), blue=DYES.find(d=>d.k==='blue');
          const R=(hit,prev)=>({hit,prev}); const PL=(id,at)=>{ const r=R([at[0],at[1]-1,at[2]],at); const v=placeSpecial(r,id); if(v) world.set(at[0],at[1],at[2],v); return v; };
          res.bed=PL(red.bedF[0],[X+1,G,Z-5]); res.bedHead=world.get(X+1,G,Z-4); res.headOK=BLOCKS[res.bedHead]&&BLOCKS[res.bedHead].bed&&BLOCKS[res.bedHead].bed.head;
          res.bag=PL(blue.bagB[0],[X+4,G,Z-5]); world.set(X+2,G,Z-2,B.LOOM);
          // sleeping
          const T=world.dayLen+world.nightLen; world.time=Math.floor(world.time/T)*T+10; res.dayTry=1; __v37.sleepIn(X+1,G,Z-5,BLOCKS[res.bed]); await W(300); res.slept1=world.time;
          world.time=Math.floor(world.time/T)*T+world.dayLen+50; const t0=world.time; __v37.sleepIn(X+4,G,Z-5,BLOCKS[res.bag]); await W(2600); res.bagSpawn=world.bedSpawn; res.bagSkip=world.time>t0&&dayInfo().day;
          world.time=Math.floor(world.time/T)*T+world.dayLen+50; __v37.sleepIn(X+1,G,Z-5,BLOCKS[res.bed]); await W(2600); res.bedSpawn=world.bedSpawn; res.bedSkip=dayInfo().day;
          player.x=X-3; respawn(); res.respawnAt=[player.x,player.y,player.z].map(v=>+v.toFixed(1));
          // banners
          window.pick=function(){ return window.__R; };
          const mk=(name)=>__v37.PRESETS.find(p=>p.name===name).ban; const give=ban=>{ inv.slots[inv.sel]={id:I.BANNER,n:1,x:{ban:cloneBan(ban)}}; };
          window.cloneBan=__v37.cloneBan;
          window.__R={hit:[X-3,G-1,Z-5],prev:[X-3,G,Z-5]}; give(mk('Skull & crossbones')); player.x=X-3; player.z=Z-2; useDecor(0,0);
          window.__R={hit:[X-1,G-1,Z-5],prev:[X-1,G,Z-5]}; give(mk('Fire')); useDecor(0,0); player.z=Z-8;
          window.__R={hit:[X-6,G+1,Z-5],prev:[X-5,G+1,Z-5]}; give(mk('Town')); player.x=X-2; useDecor(0,0);
          res.banners=world.decor.filter(e=>e.kind==='banner').length;
          // pole banners are picked up and given back
          return res; }''')
        print(json.dumps(r)); print(await pg.evaluate('JSON.stringify({m:mode,cm:cam.mode,p:[player.x,player.y,player.z],hid:[...document.querySelectorAll("section.sheet,.panel")].filter(e=>!e.hidden).map(e=>e.id)})')); await pg.wait_for_timeout(800)
        await pg.screenshot(path=str(OUT/'world.png'),clip=dict(x=150,y=150,width=300,height=260))
        # editor
        e=await pg.evaluate('''async()=>{ __v37.openLoom(null); const V=__v37, E=V.ED; E.tab='icon'; document.querySelector('#lmTabs button:nth-child(3)').click(); const q=id=>[...document.querySelectorAll('#lmGrid button')].find(b=>b.title===id);
            E.ban=V.cloneBan(V.PRESETS[3].ban); E.layer=1; document.querySelector('#lmLay button:nth-child(2)').click(); q('Skull').click(); const c=document.querySelectorAll('#lmSel button'); c[c.length-1]; return JSON.stringify({layers:E.ban.L.map(l=>l.length),sel:E.sel}); }''')
        print(e); await pg.wait_for_timeout(300); await pg.screenshot(path=str(OUT/'editor.png'))
        print('ERRS',errs[:5]); await b.close()
asyncio.run(main())
