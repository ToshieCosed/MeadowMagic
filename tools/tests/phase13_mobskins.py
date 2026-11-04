"""Resource-pack mob skins: builds a fake pack with test entity textures, spawns the mobs and screenshots them. python tools/tests/phase13_mobskins.py out.png"""
import asyncio,pathlib,sys,io,zipfile,base64,os
from PIL import Image,ImageDraw
from playwright.async_api import async_playwright
def tex(w,h,hue):
    im=Image.new('RGBA',(w,h)); px=im.load()
    for y in range(h):
        for x in range(w): px[x,y]=((hue[0]+x*3)%256,(hue[1]+y*5)%256,hue[2],255)
    return im
def regions(name):
    im=Image.new('RGBA',(64,32),(255,0,255,255)); d=ImageDraw.Draw(im)
    def box(u,v,w,h,d_):  # six faces of a vanilla box layout, distinct colours
        C={'top':(255,0,0),'bottom':(0,0,255),'right':(0,200,0),'front':(255,255,0),'left':(0,255,255),'back':(255,128,0)}
        for k,r in {'top':(u+d_,v,w,d_),'bottom':(u+d_+w,v,w,d_),'right':(u,v+d_,d_,h),'front':(u+d_,v+d_,w,h),'left':(u+d_+w,v+d_,d_,h),'back':(u+d_+w+d_,v+d_,w,h)}.items(): d.rectangle((r[0],r[1],r[0]+r[2]-1,r[1]+r[3]-1),fill=C[k]+(255,))
    if name.startswith('cow'): box(18,4,12,18,10); box(0,0,8,8,6); box(0,16,4,12,4)
    if name.startswith('chicken'): box(0,0,4,6,3); box(0,9,6,8,6); box(26,0,3,5,3)
    if name.startswith('pig'): box(28,8,10,16,8); box(0,0,8,8,8); box(0,16,4,6,4)
    return im
def png(im): b=io.BytesIO(); im.save(b,'PNG'); return b.getvalue()
def pack():
    z=io.BytesIO(); f=zipfile.ZipFile(z,'w'); f.writestr('pack.mcmeta','{"pack":{"pack_format":4,"description":"test"}}')
    f.writestr('assets/minecraft/textures/blocks/stone.png',png(tex(16,16,(120,120,120))))
    E='assets/minecraft/textures/entity/'
    for name,(w,h,hue) in {'zombie/zombie.png':(64,64,(40,160,60)),'skeleton/skeleton.png':(64,32,(220,220,210)),'pig/pig.png':(64,32,(240,150,170)),'cow/cow.png':(64,32,(90,60,40)),'sheep/sheep.png':(64,32,(230,200,180)),'sheep/sheep_fur.png':(64,32,(250,250,250)),'chicken.png':(64,32,(255,255,255)),'spider/spider.png':(64,32,(60,50,50)),'wolf/wolf.png':(64,32,(190,190,190)),'slime/slime.png':(64,32,(100,220,90)),'horse/horse_brown.png':(64,64,(120,80,40)),'bat.png':(64,64,(70,50,40)),'squid/squid.png':(64,32,(40,60,130)),'parrot/parrot_red_blue.png':(32,32,(230,40,40)),'enderman/enderman.png':(64,32,(30,20,40)),'villager/villager.png':(64,64,(160,110,80))}.items():
        im=tex(w,h,hue)
        if name.startswith(('zombie','pig','cow','skeleton','sheep/sheep.png','wolf')):
            d=ImageDraw.Draw(im); d.rectangle((8,8,15,15),fill=(255,230,60,255)); d.rectangle((9,11,10,12),fill=(0,0,0,255)); d.rectangle((13,11,14,12),fill=(0,0,0,255))
        if os.environ.get('REGIONS') and name.startswith(os.environ['REGIONS']): im=regions(name)
        rp=os.path.join(os.environ.get('REAL',''),os.path.basename(name)) if os.environ.get('REAL') else ''
        f.writestr(E+name,open(rp,'rb').read() if rp and os.path.exists(rp) else png(im))
    f.close(); return z.getvalue()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1000,'height':620},device_scale_factor=int(os.environ.get('SC','3'))); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto((pathlib.Path(__file__).resolve().parents[2]/'release/strata-standalone.html').as_uri()); await pg.wait_for_timeout(1500)
        r=await pg.evaluate('''async([b64,FACE,TT])=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); startWorld({id:'m1',name:'m',seed:'abc',seedNum:seedFrom('abc'),size:1000,height:128,sea:63,depth:'classic',caves:0,gen:'show',mc:1,gameMode:'creative',created:1,played:1},null,false); await W(2500); mode='play'; document.getElementById('menu').hidden=true;
          const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); const rec=await importPack(new File([bin],'testpack.zip')); await applyPack(rec);
          const C=world.gen.C, G=SHOW_G+1, X=C+60, Z=C+90; player.x=X; player.y=G+1; player.z=Z-6; await W(5000);
          mobs.length=0; if(TT) window.__T=TT.split(','); window.__face=FACE; const T=(window.__T||['zombie','skeleton','pig','cow','sheep','chicken','spider','wolf','slime']); T.forEach((t,i)=>{ spawnMob(t,X-1+(i%5)*3,G,Z-3+(i<5?0:3)); for(const m of mobs) m.face=window.__face; }); await W(3000);
          return JSON.stringify({stats:rec.stats,ent:Object.keys(__ENT)}); }''',[base64.b64encode(pack()).decode(),float(os.environ.get('FACE','3.14159')),os.environ.get('MOBS','')])
        print(r); print('ERRS',[e for e in errs if 'TUNNEL' not in e][:5])
        if len(sys.argv)>1: await pg.screenshot(path=sys.argv[1],clip=dict(zip(['x','y','width','height'],[int(v) for v in os.environ.get('CLIP','400,230,330,200').split(',')])))
        await b.close()
asyncio.run(main())
