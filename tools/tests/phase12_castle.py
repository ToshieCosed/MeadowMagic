"""Abandoned castle: every landmark must be reachable from the gate (doors count as open). python tools/tests/phase12_castle.py"""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page()
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=(await pg.evaluate('''async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'c1',name:'c',seed:'castle1',seedNum:seedFrom('castle1'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(2000);
          const g=world.gen, s=g._cs, M=s.M||(s.M=__castle.buildCastle(g,s)), {m,yb,yt,W:Wd,G}=M, UN=65535;
          const at=(x,y,z)=>{ if(x<-4||z<-4||x>=61||z>=61||y<yb||y>yt) return UN; return m[((y-yb)*Wd+(z+4))*Wd+(x+4)]; };
          const solid=v=>v!==UN&&v!==0&&!(BLOCKS[v]&&(BLOCKS[v].solid===false||BLOCKS[v].plate||BLOCKS[v].door||BLOCKS[v].torch||BLOCKS[v].wt||BLOCKS[v].spr));
          const pass=v=>v===0||v===UN||(BLOCKS[v]&&(BLOCKS[v].solid===false||BLOCKS[v].plate||BLOCKS[v].door||BLOCKS[v].wt));
          const free=(x,y,z)=>pass(at(x,y,z))&&pass(at(x,y+1,z)); const supported=(x,y,z)=>solid(at(x,y-1,z));
          // BFS from courtyard gate
          const seen=new Set(), q=[[28,G,1]]; seen.add('28,'+G+',1'); let n=0;
          while(q.length&&n<400000){ const [x,y,z]=q.pop(); n++; for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for(const dy of [0,1,-1,-2,-3]){ const X=x+dx,Y=y+dy,Z=z+dz; if(X<-3||Z<-3||X>60||Z>60) continue; const k=X+','+Y+','+Z; if(seen.has(k)) continue; if(!free(X,Y,Z)||!supported(X,Y,Z)) continue;
              if(dy===1&&!pass(at(x,y+2,z))) continue; if(dy<0){ if(!(pass(at(X,Y+2,Z)))) continue; } seen.add(k); q.push([X,Y,Z]); break; } }
          const find=(pred)=>{ let c=0; for(const k of seen){ const [x,y,z]=k.split(',').map(Number); if(pred(x,y,z)) c++; } return c; };
          const out=['reach '+seen.size];
          for(const [nm,x,y,z] of [['sanctum frame side',52,G-9*s.nD,28],['L0 hall',28,G-9,20],['L1 hall',28,G-18,28],['tower0 roof',4,G+30,4],['tower3 roof',52,G+30,52],['keep roof',30,G+20,40],['cathedral',12,G,30],['wallwalk',30,G+10,1]]){ const ok=[0,1,-1].some(dy=>seen.has(x+','+(y+dy)+','+z)); out.push(nm+' '+ok); }
          const lvl=y=>{ let o=[]; for(let z=56;z>=0;z-=1){ let row=''; for(let x=0;x<57;x++){ const v=at(x,y,z), bd=BLOCKS[v]; row+=v===UN?' ':v===0?'.':bd&&bd.door?'D':bd&&bd.plate?'p':v===B.CHEST_WOOD?'C':v===B.IRON_BARS?'b':solid(v)?'#':'+'; } o.push(row); } return o.join('\\n'); };
          
          out.push('tiles '+M.tiles.length+' mobs '+M.mobs.length+' decor '+M.decor.length);
          return out.join('\\n'); }'''))
        print(r); assert 'false' not in r.split('tiles')[0], 'castle landmark unreachable'
        await b.close()
asyncio.run(main())
