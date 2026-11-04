"""Walls, wall torches, flowers, pots, hanging signs: python tools/tests/phase11_walls_flowers.py shot.png"""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':620}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        out=await pg.evaluate('''async()=>{ const L=[]; const W=ms=>new Promise(r=>setTimeout(r,ms));
          startWorld({id:'w11',name:'show',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(3000); mode='play'; document.getElementById('menu').hidden=true;
          const C=world.gen.C, G=SHOW_G+1, X=C+5, Z=C+25; player.x=X+4; player.y=G+1; player.z=Z-4; await W(7000);
          L.push('walls '+WALL_MATS.length+' e.g. '+WALL_MATS.slice(0,3).map(m=>BLOCKS[m.wall].name).join(', ')+' ... '+BLOCKS[WALL_MATS[WALL_MATS.length-1].wall].name);
          L.push('recipes walls '+RECIPES.filter(r=>WALL_MATS.some(m=>m.wall===r.out)).length+' pot '+RECIPES.filter(r=>r.out===POT).length+' hsign '+RECIPES.filter(r=>r.out===I.HSIGN).length);
          // row of walls
          const mats=[0,1,3,6,12,30]; const S=(x,y,z,b)=>world.set(x,y,z,b);
          for(let i=0;i<14;i++){ const m=WALL_MATS[Math.min(i*5,WALL_MATS.length-1)]; for(let k=0;k<4;k++) S(X+i,G,Z+k*0,m.wall); S(X+i,G,Z,m.wall); }
          for(let k=0;k<3;k++) S(X+3,G,Z+1+k,WALL_MATS[2].wall); S(X+3,G+1,Z,WALL_MATS[2].wall);
          // torches: standing + all 4 wall directions on a stone block
          S(X+2,G,Z+8,B.STONE); S(X+2,G,Z+8,B.STONE); S(X+1,G,Z+8,WT['-1,0']); S(X+3,G,Z+8,WT['1,0']); S(X+2,G,Z+7,WT['0,-1']); S(X+2,G,Z+9,WT['0,1']); S(X+5,G,Z+8,B.TORCH);
          // flowers
          const fl=[B.FLOWER_R,B.FLOWER_AZ,B.TULIP_R,B.TULIP_W,B.LILYV,B.TORCHF,B.FLOWER_P]; fl.forEach((f,i)=>{ S(X+8+i,G-1,Z+6,B.GRASS); S(X+8+i,G,Z+6,f); });
          [B.SUNFLOWER_LO,B.LILAC_LO,B.ROSE_BUSH_LO,B.PEONY_LO].forEach((lo,i)=>{ S(X+8+i*2,G-1,Z+9,B.GRASS); S(X+8+i*2,G,Z+9,lo); S(X+8+i*2,G+1,Z+9,TALL_HI[lo]); });
          // pots
          [B.FLOWER_R,B.TULIP_R,B.LILYV,B.MUSH_R,Object.values(WOODS)[0].sapling].forEach((f,i)=>{ S(X+8+i,G,Z+12,POT_OF[f]); }); S(X+14,G,Z+12,POT);
          // hanging signs
          S(X+2,G+3,Z+14,B.STONE); S(X+3,G+3,Z+14,B.STONE); const e1=__v34.hsignAt([X+2,G+2,Z+14],[X+2,G+3,Z+14]); e1.text='Hangs from\\nthe ceiling'; world.decor.push(e1);
          S(X+6,G,Z+14,B.STONE); S(X+6,G+1,Z+14,B.STONE); const e2=__v34.hsignAt([X+7,G+1,Z+14],[X+6,G+1,Z+14]); e2.text='Wall bracket\\nsign'; world.decor.push(e2);
          player.x=X+8; player.y=G+1; player.z=Z+3; await W(6000);
          L.push('tall hi above lo '+(world.get(X+8,G+1,Z+9)===TALL_HI[B.SUNFLOWER_LO])+' pot plant '+BLOCKS[world.get(X+8,G,Z+12)].pot.plant);
          return L; }''')
        print('\n'.join(out)); print('ERRS',[e for e in errs if 'ERR_TUNNEL' not in e][:5])
        if len(sys.argv)>1: await pg.screenshot(path=sys.argv[1])
        await b.close()
asyncio.run(main())
