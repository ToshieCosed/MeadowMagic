F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

BLK9=r'''
/* ---------- stage 9 blocks: the Dusk ---------- */
NB('DUSK_CHALK'); def(B.DUSK_CHALK,'Dusk chalk','#b79ad6','#a98bc9'); pat(B.DUSK_CHALK,PT.SAND,PT.SANDSTONE);
NB('DUSK_CHALK2'); def(B.DUSK_CHALK2,'Pale dusk chalk','#cdb6e6','#bea6da'); pat(B.DUSK_CHALK2,PT.CLAY);
NB('DUSK_DEBRIS'); def(B.DUSK_DEBRIS,'Dusk debris chalk','#9f84bd','#9278b0'); pat(B.DUSK_DEBRIS,PT.GRAVEL);
NB('DUSK_STONE'); def(B.DUSK_STONE,'Dusk stone','#4d3866','#45315d'); pat(B.DUSK_STONE,PT.STONE);
NB('DUSK_ORE'); def(B.DUSK_ORE,'Dusk crystal ore','#4d3866','#45315d',0,{ore:hex('#e7a6ff'),emit:[6,2,9]}); pat(B.DUSK_ORE,PT.STONE);
NB('LUMEN_ORE'); def(B.LUMEN_ORE,'Lumen ore','#4d3866','#45315d',0,{ore:hex('#9ff3ff'),emit:[4,10,12]}); pat(B.LUMEN_ORE,PT.STONE);
NB('DUSK_BRICK'); def(B.DUSK_BRICK,'Dusk bricks','#6e5490','#634a83'); pat(B.DUSK_BRICK,PT.SBRICK);
NB('DUSK_BLOCK'); def(B.DUSK_BLOCK,'Dusk block','#3a2458','#2f1c49',0,{emit:[5,1,8]}); pat(B.DUSK_BLOCK,PT.CHISEL);
NB('PORTAL_X'); def(B.PORTAL_X,'Dusk portal','#b46cff',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[11,5,15],portal:'x',noItem:1});
NB('PORTAL_Z'); def(B.PORTAL_Z,'Dusk portal','#b46cff',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[11,5,15],portal:'z',noItem:1});
NB('SHELF'); def(B.SHELF,'Bookshelf','#c59a5f','#7a4f2a'); pat(B.SHELF,PT.PLANK,PT.WOOL);
NB('COBWEB'); def(B.COBWEB,'Cobweb','#eeeeee',0,0,{solid:false,opaque:false,lightOpaque:0,web:1,replace:false});
NB('DUSK_FUNGUS'); def(B.DUSK_FUNGUS,'Dusk fungus','#c77dff',0,0,{solid:false,opaque:false,plant:true,replace:true,stem:hex('#6a4a8a'),ph:.55,emit:[5,2,8]});
NB('CRYSTAL'); def(B.CRYSTAL,'Dusk crystal cluster','#e7a6ff',0,0,{solid:false,opaque:false,plant:true,replace:true,ph:.5,emit:[8,3,12]});
NB('POCKET'); def(B.POCKET,'Pocket dimension','#2a1840','#4a2f70',0,{emit:[6,3,10],pocket:1}); pat(B.POCKET,PT.CHISEL);
NB('POCKET_WALL'); def(B.POCKET_WALL,'Pocket wall','#3b2a5a','#3b2a5a',0,{emit:[3,2,5],noItem:1}); pat(B.POCKET_WALL,PT.METAL);
NB('POCKET_EXIT'); def(B.POCKET_EXIT,'Pocket exit','#b46cff','#3b2a5a',0,{emit:[10,5,14],noItem:1,pexit:1}); pat(B.POCKET_EXIT,PT.CHISEL);
NB('FIRE'); def(B.FIRE,'Fire','#ff8a1e',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[15,10,4],noItem:1,replace:true,fire:1});
'''
rep("const HOTBAR = [",BLK9+"const HOTBAR = [")
ITEMS9=r'''
NI('DUSK_CRYSTAL','Dusk crystal'); NI('LUMEN','Lumen dust'); NI('FIRE_STARTER','Fire starter',{stack:1,dur:64,starter:1});
NI('TELELINK','Telelink',{stack:1,telelink:1}); NI('TELELINK_LESSER','Lesser telelink',{stack:1,telelink:2}); NI('LORE','Lore book',{stack:1,lore:1});
NI('POCKET_EXPANDER','Pocket expander',{expander:1});
'''
rep("NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});",ITEMS9+"NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});")
RECIPES9=r'''
{ r_(I.DUSK_ORB,1,['P','M'],{keys:{P:[I.DUSK_PEARL]},cat:'travel'});
  r_(B.DUSK_BLOCK,1,['P','O'],{keys:{P:[I.DUSK_PEARL],O:[B.OBSIDIAN]},cat:'blocks'});
  r_(I.FIRE_STARTER,1,['N.','.R'],{keys:{N:[I.NUG_IRON],R:[I.ROCK,B.OBSIDIAN]},cat:'tools'});
  r_(B.DUSK_BRICK,4,['CC','CC'],{keys:{C:[B.DUSK_STONE]},cat:'blocks'});
  r_(B.SHELF,1,['PPP','BBB','PPP'],{keys:{B:[I.BOOK]},cat:'decor'});
  r_(B.POCKET,1,['CDC','OXO','CDC'],{keys:{C:[I.DUSK_CRYSTAL],D:[B.DUSK_BLOCK],O:[B.OBSIDIAN],X:[I.DUSK_ORB]},tier:2,cat:'travel'});
  r_(I.POCKET_EXPANDER,1,['CLC','LXL','CLC'],{keys:{C:[I.DUSK_CRYSTAL],L:[I.LUMEN],X:[I.DUSK_PEARL]},cat:'travel'});
  r_(I.TELELINK_LESSER,1,['CWC','WOW','CLC'],{keys:{C:[I.DUSK_CRYSTAL],W:[I.WARP_INGOT],O:[I.DUSK_ORB],L:[I.LUMEN]},tier:2,cat:'travel'});
  for(const d of DYES) if(d.k==='purple') r_(d.lantern,2,['.N.','NTN','.D.'],{keys:{N:[I.NUG_IRON,I.NUG_SILVER],T:[B.TORCH],D:[I.LUMEN]},cat:'decor'}); }
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES9+"// every wood's logs make its own planks; material keys accept every variant")
rep("const ORE_NAME={2:'stone',","""spec([B.DUSK_CHALK,B.DUSK_CHALK2,B.DUSK_DEBRIS],.35); spec(B.DUSK_STONE,1.6,'pick',1); spec([B.DUSK_ORE,B.LUMEN_ORE],3,'pick',2); spec(B.DUSK_BRICK,2.5,'pick',1);
spec(B.DUSK_BLOCK,12,'pick',8); spec(B.SHELF,1.4,'axe'); spec(B.COBWEB,2,'knife'); spec(B.POCKET,5,'pick',1); spec([B.POCKET_WALL,B.POCKET_EXIT,B.PORTAL_X,B.PORTAL_Z],Infinity);
const ORE_NAME={2:'stone',""")
rep("    case B.ICE: case B.SEAGRASS: return [];","""    case B.ICE: case B.SEAGRASS: case B.FIRE: return [];
    case B.DUSK_ORE: return [[I.DUSK_CRYSTAL,rint(1,2)]]; case B.LUMEN_ORE: return [[I.LUMEN,rint(2,4)]];
    case B.SHELF: return [[I.BOOK,rint(1,3)]]; case B.COBWEB: return tool==='knife'?[[I.STRING,rint(1,2)]]:[];
    case B.CRYSTAL: return [[I.DUSK_CRYSTAL,1]];""")
# cobwebs slow you; fire burns out
rep("  if(world.get(Math.floor(p.x),Math.floor(p.y+.4),Math.floor(p.z))===B.FALL) p.vy-=9*dt;","  if(world.get(Math.floor(p.x),Math.floor(p.y+.4),Math.floor(p.z))===B.FALL) p.vy-=9*dt;\n  if(BLOCKS[Math.max(0,world.get(Math.floor(p.x),Math.floor(p.y+.5),Math.floor(p.z)))]?.web){ p.vx*=.2; p.vz*=.2; p.vy=Math.max(p.vy,-1); p.fallTop=p.y; }")

# ---------- mesher: portal, cobweb, fire ----------
rep("""    if(bd.drawer){ setVLcell(x,y,z);""","""    if(bd.portal){ setVL(VL_EMISSIVE); PAT=PT.FALL; const zx=bd.portal==='x'; const c=[180,108,255];
      if(zx) quadRaw(vbW,[[wx,y,wz+.5],[wx+1,y,wz+.5],[wx+1,y+1,wz+.5],[wx,y+1,wz+.5]],c,1); else quadRaw(vbW,[[wx+.5,y,wz],[wx+.5,y,wz+1],[wx+.5,y+1,wz+1],[wx+.5,y+1,wz]],c,1); continue; }
    if(bd.web){ setVLcell(x,y,z); PAT=0; const c=[235,235,240]; for(const [a,b2,c2,d2] of [[0,0,1,1],[1,0,0,1]]){ quadRaw(vbL,[[wx+a,y,wz+b2],[wx+c2,y,wz+d2],[wx+c2,y+1,wz+d2],[wx+a,y+1,wz+b2]],c,.9); } continue; }
    if(bd.fire){ setVL(VL_EMISSIVE); PAT=0; for(const [a,b2,c2,d2] of [[.1,.1,.9,.9],[.9,.1,.1,.9]]) quadRaw(vbL,[[wx+a,y,wz+b2],[wx+c2,y,wz+d2],[wx+c2,y+.9,wz+d2],[wx+a,y+.9,wz+b2]],[255,140,40],1); continue; }
    if(bd.drawer){ setVLcell(x,y,z);""")

GEN9=r'''
/* ---------- the Dusk: chalk plains and spires over dusk stone, Lost villages, star islands ---------- */
const DUSK_ISL=600, DUSK_VIL=150;
class DuskGen{
  constructor(seed,size,H){ this.seed=seed; this.size=size; this.H=H; this.dusk=true; const N=k=>makeNoise(seed+k*7919); this.nA=N(1); this.nB=N(2); this.nC=N(3); this.nD=N(4); this.b=0; }
  height(x,z){ const a=fbm(this.nA,x*.008,z*.008,3), r=1-Math.abs(this.nB(x*.03,z*.03)), sp=Math.max(0,r-.72)/.28;
    return Math.max(6,Math.min(this.H-30,Math.floor(30+a*9+sp*sp*14+this.nC(x*.06,z*.06)*1.5))); }
  sample(x,z){ return this.height(x,z); } biomeAt(){ return 0; }
  spawnOK(x,z){ return this.height(x,z); }
  village(x,z){ const cx=Math.floor(x/DUSK_VIL), cz=Math.floor(z/DUSK_VIL); for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){ const v=this.villageCell(cx+dx,cz+dz); if(v&&Math.hypot(v.x-x,v.z-z)<42) return v; } return null; }
  villageCell(cx,cz){ if(hash2(cx,cz,this.seed+501)>.42) return null; const x=cx*DUSK_VIL+30+hash2(cx,cz,this.seed+502)*(DUSK_VIL-60)|0, z=cz*DUSK_VIL+30+hash2(cx,cz,this.seed+503)*(DUSK_VIL-60)|0; return {x,z,cx,cz,y:this.height(x,z)}; }
  island(cx,cz){ if(hash2(cx,cz,this.seed+601)>.6) return null; const x=cx*DUSK_ISL+150+hash2(cx,cz,this.seed+602)*(DUSK_ISL-300)|0, z=cz*DUSK_ISL+150+hash2(cx,cz,this.seed+603)*(DUSK_ISL-300)|0;
    return {x,z,R:95+hash2(cx,cz,this.seed+604)*25,rot:hash2(cx,cz,this.seed+605)*6.28,top:this.H-26}; }
  starR(I,x,z){ const a=Math.atan2(z-I.z,x-I.x)+I.rot, k=Math.pow(Math.abs(Math.cos(a*2.5)),1.6); return I.R*(.42+.58*k); }
  fill(ch){
    const {H,size,seed}=this, x0=ch.cx*CS, z0=ch.cz*CS, b=ch.blocks; ch.genTiles=[];
    const idx=(lx,y,lz)=>(y*CS+lz)*CS+lx, set=(lx,y,lz,v)=>{ if(y>0&&y<H&&lx>=0&&lz>=0&&lx<CS&&lz<CS) b[idx(lx,y,lz)]=v; };
    for(let lz=0;lz<CS;lz++)for(let lx=0;lx<CS;lx++){ const wx=x0+lx, wz=z0+lz; if(wx>=size||wz>=size) continue; const h=this.height(wx,wz);
      for(let y=0;y<=h;y++) set(lx,y,lz,y===0?B.BEDROCK:y>h-3?(y===h?(this.nD(wx*.05,wz*.05)>.3?B.DUSK_CHALK2:this.nD(wx*.09,wz*.09)<-.4?B.DUSK_DEBRIS:B.DUSK_CHALK):B.DUSK_CHALK):B.DUSK_STONE);
      const r=hash2(wx,wz,seed+9); if(r<.03) set(lx,h+1,lz,B.DUSK_FUNGUS); else if(r<.036) set(lx,h+1,lz,B.CRYSTAL); }
    const orng=mulberry32((seed^Math.imul(ch.cx+5,73856093)^Math.imul(ch.cz+9,19349663))>>>0);
    for(const [id,y0,y1,nv,sz] of [[B.DUSK_ORE,4,34,9,6],[B.LUMEN_ORE,4,30,6,5],[B.ORE_IRON,4,30,3,4],[B.ORE_GOLD,3,22,2,4],[B.ORE_SILVER,3,26,2,4],[B.ORE_DIAMOND,1,12,.6,3]])
      for(let v=0,nn=Math.floor(nv)+(orng()<nv%1?1:0);v<nn;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=y0+(orng()*(y1-y0)|0); const n=2+(orng()*sz|0);
        for(let k=0;k<n;k++){ if(x>=0&&z>=0&&x<CS&&z<CS&&y>0&&y<H){ const i=idx(x,y,z); if(b[i]===B.DUSK_STONE) b[i]=id; } const r=orng()*6|0; if(r===0)x++; else if(r===1)x--; else if(r===2)z++; else if(r===3)z--; else if(r===4)y++; else y--; } }
    // Lost villages: little brick huts around a lantern-lit square
    const vcx=Math.floor((x0+8)/DUSK_VIL), vcz=Math.floor((z0+8)/DUSK_VIL);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){ const v=this.villageCell(vcx+dx,vcz+dz); if(!v) continue;
      const n=4+(hash2(v.cx,v.cz,seed+504)*4|0);
      for(let k=0;k<=n;k++){ const a=k/n*6.283+hash2(v.cx,v.cz,seed+505), d=k===n?0:16+hash2(k,v.cx,seed+506)*10, hx=Math.round(v.x+Math.cos(a)*d), hz=Math.round(v.z+Math.sin(a)*d), w=k===n?3:3;
        const hy=this.height(hx,hz);
        if(k===n){ for(let qz=-3;qz<=3;qz++)for(let qx=-3;qx<=3;qx++){ set(hx+qx-x0,hy,hz+qz-z0,B.DUSK_BRICK); for(let y=hy+1;y<hy+5;y++) set(hx+qx-x0,y,hz+qz-z0,B.AIR); } set(hx-x0,hy+1,hz-z0,DUSK_LANT); continue; }
        for(let qz=-w;qz<=w;qz++)for(let qx=-w;qx<=w;qx++){ const lx=hx+qx-x0, lz=hz+qz-z0; if(lx<0||lz<0||lx>=CS||lz>=CS) continue;
          for(let y=hy-2;y<=hy;y++) set(lx,y,lz,B.DUSK_BRICK); for(let y=hy+1;y<=hy+5;y++){ const wall=Math.abs(qx)===w||Math.abs(qz)===w;
            const door=qz===w&&qx===0&&y<=hy+2, win=wall&&y===hy+2&&(qx===0||qz===0)&&!door; set(lx,y,lz,y===hy+5?B.DUSK_BRICK:wall&&!door&&!win?B.DUSK_BRICK:B.AIR); }
          if(qx===0&&qz===0) set(lx,hy+4,lz,DUSK_LANT); }
        if(k===0) ch.genVillage={x:v.x,z:v.z}; } }
    // star islands: big star-shaped floating islands crowned with ruined libraries
    const icx=Math.floor((x0+8)/DUSK_ISL), icz=Math.floor((z0+8)/DUSK_ISL);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){ const I=this.island(icx+dx,icz+dz); if(!I) continue; if(Math.abs(I.x-x0-8)>I.R+20||Math.abs(I.z-z0-8)>I.R+20) continue;
      for(let lz=0;lz<CS;lz++)for(let lx=0;lx<CS;lx++){ const wx=x0+lx, wz=z0+lz, d=Math.hypot(wx-I.x,wz-I.z), r=this.starR(I,wx,wz); if(d>r) continue;
        const e=1-d/r, depth=Math.floor(2+e*14+this.nC(wx*.1,wz*.1)*2);
        for(let y=I.top-depth;y<=I.top;y++) set(lx,y,lz,y===I.top?B.DUSK_CHALK2:y>I.top-3?B.DUSK_CHALK:B.DUSK_STONE); }
      // buildings on a grid of plots; the middle one is the great library
      const P=20;
      for(let pz=-6;pz<=6;pz++)for(let px=-6;px<=6;px++){ const bx=I.x+px*P, bz=I.z+pz*P, hb=hash2(bx,bz,seed+701); if(Math.hypot(px,pz)>0&&hb>.8) continue;
        const half=px===0&&pz===0?11:5+(hash2(bx,bz,seed+702)*3|0); if(this.starR(I,bx,bz)<Math.hypot(bx-I.x,bz-I.z)+half+2) continue;
        if(bx+half<x0||bx-half>x0+15||bz+half<z0||bz-half>z0+15) continue;
        const floors=px===0&&pz===0?5:2+(hash2(bx,bz,seed+703)*3|0), FH=5, base=I.top;
        for(let qz=-half;qz<=half;qz++)for(let qx=-half;qx<=half;qx++){ const lx=bx+qx-x0, lz=bz+qz-z0; if(lx<0||lz<0||lx>=CS||lz>=CS) continue; const wall=Math.abs(qx)===half||Math.abs(qz)===half, wx=bx+qx, wz=bz+qz;
          for(let f=0;f<floors;f++){ const fy=base+f*FH;
            set(lx,fy,lz,B.DUSK_BRICK);
            for(let y=fy+1;y<fy+FH;y++){ let v=B.AIR; const ruin=hash2(wx*3+y,wz*5,seed+704)<.12+f*.05;
              if(wall){ const win=(y===fy+2||y===fy+3)&&((qx+qz)&3)===0; v=ruin||win?B.AIR:B.DUSK_BRICK; if(qz===half&&Math.abs(qx)<=1&&f===0&&y<fy+3) v=B.AIR; }
              else if((Math.abs(qx)===half-1||Math.abs(qz)===half-1)&&y<fy+FH-1&&((qx*7+qz*3+f)&3)!==0) v=B.SHELF;
              else if(Math.abs(qx)===half-1&&Math.abs(qz)===half-1&&y===fy+FH-1) v=B.COBWEB;
              else if(hash2(wx,wz*7+y,seed+705)<.015) v=B.COBWEB;
              set(lx,y,lz,v); }
            if(qx===-half+1&&qz===-half+2) for(let y=fy+1;y<=fy+FH;y++) set(lx,y,lz,B.LADDER_S);
            if(qx===-half+1&&qz===-half+2) set(lx,fy,lz,B.AIR);
            if(qx===0&&qz===0) set(lx,fy+FH-1,lz,DUSK_LANT);
            if(qx===2&&qz===1-(f%2)*2&&hash2(bx+f,bz,seed+706)<.85) { set(lx,fy+1,lz,B.CHEST_WOOD); ch.genTiles.push({x:wx,y:fy+1,z:wz,loot:'star',seed:hash2(wx,fy,seed+707)*1e9|0}); } }
          if(!wall||hash2(wx,wz,seed+708)<.5) set(lx,base+floors*FH,lz,B.DUSK_BRICK); } }
    }
  }
}
// an empty void for pocket rooms
class PocketGen{ constructor(seed,size,H){ this.seed=seed; this.size=size; this.H=H; this.pocket=true; } height(){ return 20; } sample(){ return 20; } biomeAt(){ return 0; } spawnOK(){ return 20; } fill(ch){} }
'''
rep("/* ---------- WebGL ---------- */",GEN9+"\n/* ---------- WebGL ---------- */")
rep("    this.gen=meta.gen===2?new Generator2(this.seed,this.size,this.H):new Generator(this.seed,this.size,this.H);",
    "    this.gen=meta.dim==='dusk'?new DuskGen(this.seed,this.size,this.H):meta.dim==='pocket'?new PocketGen(this.seed,this.size,this.H):meta.gen===2?new Generator2(this.seed,this.size,this.H):new Generator(this.seed,this.size,this.H);")
# generated chests become loot tiles the first time the chunk is made (unless edited)
rep("    const e=this.edits.get(this.key(cx,cz)); if(e) for(const [i,v] of e) ch.blocks[i]=v;",
    "    const e=this.edits.get(this.key(cx,cz)); if(e) for(const [i,v] of e) ch.blocks[i]=v;\n    if(ch.genTiles&&this.tiles) for(const t of ch.genTiles){ const k=tileKey(t.x,t.y,t.z); if(!this.tiles.has(k)&&world&&this===world&&this.get(t.x,t.y,t.z)===B.CHEST_WOOD&&!(this.lootDone&&this.lootDone[k])){ this.tiles.set(k,{kind:'chest',x:t.x,y:t.y,z:t.z,s:lootChest(t)}); this.lootDone=this.lootDone||{}; this.lootDone[k]=1; } }")
rep("const HOTBAR = [","let DUSK_LANT=0;\nconst HOTBAR = [")
rep("for(const d of DYES){ d.elev=NB('ELEV_'+d.k);","DUSK_LANT=DYE_BY.purple.lantern;\nfor(const d of DYES){ d.elev=NB('ELEV_'+d.k);")

CODE9=r'''
/* =====================================================================
   STAGE 9: Duskwalkers · dusk orbs · portals · the Dusk · the Lost · star islands · telelinks · pocket dimensions
   ===================================================================== */
const inDusk=()=>world&&world.meta.dim==='dusk', inPocket=()=>world&&world.meta.dim==='pocket';
// ---------- loot ----------
const LORE=[
  {t:'On the Telelink',b:'The old keepers bound a gate of time into a palm-sized lens. It opens a doorway to any place you have marked, and you simply walk through. The true Telelink never tires.'},
  {t:'The lesser link',b:'Lesser copies can be made, though they must rest after each gate. Set it as a 3×3: dusk crystal, warp ingot, dusk crystal / warp ingot, dusk orb, warp ingot / dusk crystal, lumen dust, dusk crystal. It needs a table of stone or better.'},
  {t:'The Lost',b:'They wander the chalk with lanterns, trading with any traveller who brings the metals of the bright world. Monsters will not walk where the Lost keep their lanterns lit.'},
  {t:'Pockets',b:'A dusk crystal frame around a dusk block, sealed with obsidian and an orb, folds a little room into nowhere. Feed a pocket expander inside and the walls step back.'},
  {t:'Walkers',b:'Tall and violet, they hate the sun. Do not meet their eyes at night. When they move they throw an orb ahead of themselves and follow it.'}];
function lootChest(t){ const r=mulberry32(t.seed>>>0), out=new Array(27).fill(null), put=(id,n,x)=>{ const i=r()*27|0; if(!out[i]) out[i]=Object.assign({id,n},x?{x}:{}); };
  const n=4+(r()*6|0); for(let k=0;k<n;k++){ const q=r();
    if(q<.18) put(I.BOOK,1+(r()*3|0)); else if(q<.3) put(I.DUSK_CRYSTAL,2+(r()*5|0)); else if(q<.4) put(I.DUSK_ORB,1+(r()*3|0)); else if(q<.48) put(I.LUMEN,3+(r()*6|0));
    else if(q<.56) put(I.GOLD,2+(r()*4|0)); else if(q<.62) put(I.DIAMOND,1+(r()*2|0)); else if(q<.7) put(I.WARP_INGOT,1+(r()*2|0));
    else if(q<.8){ const ks=Object.keys(ENCH), kk=ks[r()*ks.length|0]; put(I.GRIMOIRE,1,{g:{k:kk,lv:1+(r()*ENCH[kk].max|0)}}); }
    else if(q<.86) put(I.XP_BOOK,1,{xp:40+(r()*160|0)}); else if(q<.95) put(I.LORE,1,{lore:r()*LORE.length|0}); else if(q<.97) put(I.DUSK_PEARL,1+(r()*2|0)); else put(I.TELELINK_LESSER,1); }
  if(r()<.05) put(I.TELELINK,1); if(r()<.35) put(I.LORE,1,{lore:r()<.5?0:1}); return out; }
// ---------- dimensions: each has its own save record; your inventory and pictures travel with you ----------
const DIMS={dusk:{H:88,name:'The Dusk'},pocket:{H:48,name:'Pocket dimension',size:4096}};
function dimKey(meta){ return 'strata:w:'+meta.id+(meta.dim?':'+meta.dim:''); }
function switchDim(dim,pos,after){
  const cur=world.meta; saveGame(); const base={...cur}; delete base.dim; const meta=dim?{...base,dim,height:DIMS[dim].H,size:DIMS[dim].size||base.size,seedNum:(base.seedNum^(dim==='dusk'?0x5eed:0xbeef))>>>0}:{...base,height:base.height};
  if(!dim){ meta.height=store.get('strata:index')?.find?.(w=>w.id===base.id)?.height||base.baseH||base.height; }
  meta.baseH=cur.baseH||(!cur.dim?cur.height:cur.baseH);
  if(!dim) meta.height=meta.baseH;
  const save=store.get(dimKey(meta))||{};
  Object.assign(save,{inv:inv.slots.map(packS),armor:inv.armor.map(packS),sel:inv.sel,hp:player.hp,xp:player.xp||0,fishLog:player.fishLog||{},arts:world.arts,maps:world.maps.map(m=>({cx:m.cx,cz:m.cz,px:b64(m.px)})),time:world.time,dayLen:world.dayLen,nightLen:world.nightLen});
  if(pos) save.player={x:pos[0],y:pos[1],z:pos[2],face:player.face};
  const keepTL=player.teleCd; startWorld(meta,save,false); player.teleCd=keepTL; world.afterLoad=after||null;
  document.getElementById('loading').hidden=false; mode='loading'; toast(dim?DIMS[dim].name:'The overworld');
}
// where the world record says you were last
function resumeDim(meta,save){ const cur=store.get('strata:w:'+meta.id+':cur'); if(!cur||!cur.dim) return [meta,save];
  const m={...meta,dim:cur.dim,baseH:meta.height,height:DIMS[cur.dim].H,size:DIMS[cur.dim].size||meta.size,seedNum:(meta.seedNum^(cur.dim==='dusk'?0x5eed:0xbeef))>>>0}; const sv=store.get(dimKey(m))||{};
  if(save) Object.assign(sv,{inv:save.inv,armor:save.armor,sel:save.sel,hp:save.hp,xp:save.xp,fishLog:save.fishLog,arts:save.arts,maps:save.maps}); return [m,sv]; }
// ---------- portals ----------
function lightPortalAt(x,y,z){ for(const [dx,dy,dz] of [[0,0,0],[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0]]) if(tryPortal(x+dx,y+dy,z+dz)) return true; return false; }
function tryPortal(x,y,z){ if(world.get(x,y,z)!==B.AIR&&!BLOCKS[world.get(x,y,z)]?.fire) return false;
  for(const ax of ['x','z']){ const seen=new Set(), q=[[x,y,z]], cells=[]; let ok=true;
    while(q.length&&ok){ const [a,b,c]=q.pop(), k=a+','+b+','+c; if(seen.has(k)) continue; seen.add(k); const v=world.get(a,b,c);
      if(v===B.DUSK_BLOCK) continue; if(v!==B.AIR&&!BLOCKS[v]?.fire){ ok=false; break; } cells.push([a,b,c]); if(cells.length>63){ ok=false; break; }
      const n=ax==='x'?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]:[[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]]; for(const [dx,dy,dz] of n) q.push([a+dx,b+dy,c+dz]); }
    if(ok&&cells.length>=2){ for(const c of cells) world.set(...c,ax==='x'?B.PORTAL_X:B.PORTAL_Z); toast('The portal hums open'); burst(x+.5,y+.5,z+.5,[180,108,255],30,3); return true; } }
  return false; }
function portalBroken(x,y,z){ for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){ const q=[[x+dx,y+dy,z+dz]], seen=new Set();
    while(q.length&&seen.size<80){ const [a,b,c]=q.pop(), k=a+','+b+','+c; if(seen.has(k)) continue; seen.add(k); if(!BLOCKS[world.get(a,b,c)]?.portal) continue; world.set(a,b,c,B.AIR); for(const [ex,ey,ez] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) q.push([a+ex,b+ey,c+ez]); } } }
function buildPortalAt(x,y,z){ // a 4×5 dusk block frame with a 2×3 opening, plus a little platform
  for(let dx=-1;dx<=4;dx++)for(let dz=-2;dz<=2;dz++){ world.set(x+dx,y-1,z+dz,B.DUSK_BRICK); for(let dy=0;dy<5;dy++) world.set(x+dx,y+dy,z+dz,B.AIR); }
  for(let dx=0;dx<4;dx++)for(let dy=0;dy<5;dy++){ const edge=dx===0||dx===3||dy===0||dy===4; world.set(x+dx,y+dy,z,edge?B.DUSK_BLOCK:B.PORTAL_X); } }
function findPortalNear(x,y,z){ for(let r=0;r<20;r++) for(let dy=-12;dy<=12;dy++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; if(BLOCKS[world.get(x+dx,y+dy,z+dz)]?.portal) return [x+dx,y+dy,z+dz]; } return null; }
function stepPortal(dt){ const p=player, b=world.get(Math.floor(p.x),Math.floor(p.y+.5),Math.floor(p.z)); p.teleCd=Math.max(0,(p.teleCd||0)-dt);
  if(BLOCKS[b]?.portal&&!p.teleCd){ p.portalT=(p.portalT||0)+dt; p.duskFx=Math.max(p.duskFx||0,p.portalT/1.5); if(p.portalT>1.6){ p.portalT=0; p.teleCd=4; const X=Math.floor(p.x), Z=Math.floor(p.z);
      const toDusk=!inDusk(); switchDim(toDusk?'dusk':null,[X+.5,60,Z+.5],()=>{ const y0=world.gen.height?world.surface(X,Z):30; const f=findPortalNear(X,y0,Z); if(f){ player.x=f[0]+.5; player.y=f[1]; player.z=f[2]+1.5; } else { const y=Math.max(SEA+2,world.surface(X,Z)+1); buildPortalAt(X-1,y,Z); player.x=X+1.5; player.y=y; player.z=Z+1.6; } player.fallTop=player.y; }); } }
  else p.portalT=0; }
// ---------- thrown dusk orbs (player and Duskwalkers) ----------
const thrown=[];
function throwOrb(sx,sy){ const s=held(), o=[player.x,player.y+1.5,player.z], ap=aimPoint(sx,sy), d=[ap[0]-o[0],ap[1]-o[1],ap[2]-o[2]], l=Math.hypot(...d)||1, sp=20;
  thrown.push({x:o[0],y:o[1],z:o[2],vx:d[0]/l*sp,vy:d[1]/l*sp+3,vz:d[2]/l*sp,owner:'player',t:0}); if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } player.swingT=.25; }
function stepThrown(dt){ for(let i=thrown.length-1;i>=0;i--){ const o=thrown[i]; o.t+=dt; let hit=false;
    for(let k=0;k<4&&!hit;k++){ const h=dt/4; o.vy-=14*h; const nx=o.x+o.vx*h, ny=o.y+o.vy*h, nz=o.z+o.vz*h; if(world.solid(Math.floor(nx),Math.floor(ny),Math.floor(nz))||isW(world.get(Math.floor(nx),Math.floor(ny),Math.floor(nz)))||ny<0) hit=true; else { o.x=nx; o.y=ny; o.z=nz; } }
    if(Math.random()<.6) parts.push({x:o.x,y:o.y,z:o.z,vx:0,vy:.2,vz:0,t:.5,c:[150,80,220],s:.06,smoke:true});
    if(hit||o.t>6){ thrown.splice(i,1); duskPuff(o.x,o.y-.5,o.z);
      if(o.owner==='player'){ teleportPlayer(o.x,o.y,o.z); if(Math.random()<.05) hurt(1,'Torn by the dusk'); }
      else if(o.owner&&!o.owner.dead){ const m=o.owner; let Y=Math.floor(o.y); while(Y<world.H-5&&(world.solid(Math.floor(o.x),Y,Math.floor(o.z))||world.solid(Math.floor(o.x),Y+1,Math.floor(o.z)))) Y++; m.x=o.x; m.y=Y; m.z=o.z; m.vy=0; } } } }
function emitThrown(vb){ setVL(VL_EMISSIVE); for(const o of thrown){ const r=.12; emitBox(vb,[o.x-r,o.y-r,o.z-r],[o.x+r,o.y+r,o.z+r],[176,96,240],IDT); emitBox(vb,[o.x-.06,o.y-.06,o.z-.06],[o.x+.06,o.y+.06,o.z+.06],[240,210,255],IDT); } }
// ---------- Duskwalkers ----------
function walkerTeleport(m){ const a=Math.random()*6.28, d=6+Math.random()*10, tx=m.x+Math.cos(a)*d, tz=m.z+Math.sin(a)*d;
  const o=[m.x,m.y+3.4,m.z], ty=world.surface(Math.floor(tx),Math.floor(tz))+1, v=[tx-o[0],ty-o[1],tz-o[2]], l=Math.hypot(v[0],v[2])||1, t=Math.max(.5,l/12);
  thrown.push({x:o[0],y:o[1],z:o[2],vx:v[0]/t,vy:(v[1]+7*t*t)/t,vz:v[2]/t,owner:m,t:0}); m.throwT=.4; m.tpCd=3+Math.random()*3; }
function stepWalker(m,d,dt,dist){ const p=player; m.tpCd=Math.max(0,(m.tpCd||0)-dt); m.atkT=Math.max(0,(m.atkT||0)-dt); m.throwT=Math.max(0,(m.throwT||0)-dt);
  const L=sampleLight(m.x,m.y+3,m.z), sunny=!inDusk()&&dayInfo().day&&dayInfo().k>.5&&L[0]>200;
  if(sunny&&!m.tpCd){ walkerTeleport(m); return [0,0,0]; }
  // eye contact at night (or anywhere in the Dusk) makes them hunt you
  if(!m.aggro&&dist<26&&surv()&&(inDusk()||!dayInfo().day)){ let look=false;
    if(cam.mode==='fp'){ const f=cam.fwd, v=[m.x-cam.pos[0],m.y+3.7-cam.pos[1],m.z-cam.pos[2]], l=Math.hypot(...v); look=(f[0]*v[0]+f[1]*v[1]+f[2]*v[2])/l>.985; }
    else { const v=[m.x-p.x,m.z-p.z], l=Math.hypot(...v)||1; look=(Math.sin(p.face)*v[0]+Math.cos(p.face)*v[1])/l>.97&&dist<14; }
    if(look){ m.stareT=(m.stareT||0)+dt; if(m.stareT>.6){ m.aggro=40; toast('It saw you…'); } } else m.stareT=0; }
  if(m.aggro>0&&surv()){ m.aggro-=dt; if(dist>18&&!m.tpCd) walkerTeleport(m);
    if(dist<1.6&&Math.abs(p.y-m.y)<3&&m.atkT<=0){ m.atkT=1.1; m.swing=.3; hurt(5,'Torn apart by a Duskwalker'); }
    return dist>1.2?[p.x-m.x,p.z-m.z,d.speed*1.6]:[0,0,0]; }
  return null; }
// ---------- the Lost: peaceful traders ----------
const TRADES=[[[I.IRON,6],[I.DUSK_ORB,1]],[[I.GOLD,4],[I.GRIMOIRE,1,'grim']],[[I.COAL,16],[I.DUSK_PEARL,1]],[[I.DIAMOND,3],[I.WARP_INGOT,2]],[[I.SILVER,6],[I.LORE,1,'lore']],
  [[I.COPPER,12],[I.LUMEN,6]],[[I.TIN,12],[I.DUSK_CRYSTAL,3]],[[I.IRON,10],[I.XP_BOOK,1,'xp']],[[I.GOLD,8],[I.POCKET_EXPANDER,1]],[[I.DIAMOND,8],[I.TELELINK_LESSER,1]],[[I.BRONZE,8],[B.POCKET,1]],[[I.EMERALD_X||I.PLATINUM,4],[I.GLIDER,1]]];
function openTrade(m){ const pool=TRADES.map((t,i)=>i), list=[]; const r=mulberry32((m.seed||(m.seed=Math.random()*1e9|0))>>>0); while(list.length<5){ const i=pool.splice(r()*pool.length|0,1)[0]; list.push(TRADES[i]); }
  mode='ui'; const body=document.getElementById('jBody'); document.querySelector('#journal h2').textContent='The Lost: trades'; body.innerHTML='';
  for(const [[gid,gn],[oid,on,sp]] of list){ const b=document.createElement('button'); b.className=countItem([gid])>=gn||creative()?'primary':'ghost'; b.style.cssText='display:flex;gap:8px;align-items:center;margin:6px 0;padding:8px 12px';
    b.innerHTML=`<img alt="" style="width:26px" src="${iconURL(gid)}"> ${gn} ${ITEMS[gid].name} → <img alt="" style="width:26px" src="${iconURL(oid)}"> ${on} ${ITEMS[oid].name}`;
    b.addEventListener('click',()=>{ if(!creative()){ if(countItem([gid])<gn){ toast('Not enough '+ITEMS[gid].name.toLowerCase()); return; } takeItem([gid],gn); }
      let x=null; if(sp==='grim'){ const ks=Object.keys(ENCH), k=ks[Math.random()*ks.length|0]; x={g:{k,lv:1+(Math.random()*ENCH[k].max|0)}}; } if(sp==='lore') x={lore:Math.random()*LORE.length|0}; if(sp==='xp') x={xp:80};
      const left=addItem(oid,on); if(!left&&x) inv.slots[inv.landed].x=x; else if(left) spawnDrop(player.x,player.y+1,player.z,oid,left); toast('Traded'); burst(m.x,m.y+1.6,m.z,[120,200,255],8,1.5); openTrade(m); }); body.appendChild(b); }
  document.getElementById('journal').hidden=false; }
// ---------- lore books ----------
function readLore(s){ const L=LORE[(s.x&&s.x.lore)||0]; mode='ui'; document.querySelector('#journal h2').textContent=L.t; document.getElementById('jBody').innerHTML=`<p style="line-height:1.55;max-width:560px">${L.b}</p>`; document.getElementById('journal').hidden=false; }
// ---------- telelinks: mark places, open a time gate, walk through ----------
let gate=null;
function openTelelink(){ const s=held(); s.x=s.x||{locs:[]}; s.x.locs=s.x.locs||[]; mode='ui'; const lesser=ITEMS[s.id].telelink===2;
  document.querySelector('#journal h2').textContent=ITEMS[s.id].name; const body=document.getElementById('jBody'); body.innerHTML='';
  const cd=lesser&&s.x.cdUntil>Date.now()?Math.ceil((s.x.cdUntil-Date.now())/1000):0;
  const save=document.createElement('button'); save.className='primary'; save.textContent='Mark this spot'; save.addEventListener('click',()=>{ const name=(inDusk()?'Dusk ':inPocket()?'Pocket ':'')+Math.floor(player.x)+', '+Math.floor(player.y)+', '+Math.floor(player.z);
    s.x.locs.push({name,dim:world.meta.dim||null,x:player.x,y:player.y,z:player.z}); invChanged(); openTelelink(); }); body.appendChild(save);
  if(cd) body.insertAdjacentHTML('beforeend',`<p class="hint">Recharging · ${cd} s</p>`);
  s.x.locs.forEach((L,i)=>{ const row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;align-items:center;margin:8px 0';
    row.innerHTML=`<span style="flex:1">${L.name}</span>`; const go=document.createElement('button'); go.className='primary'; go.textContent='Open gate'; go.disabled=!!cd;
    go.addEventListener('click',()=>{ closeUI('journal'); const f=player.face; gate={x:player.x+Math.sin(f)*2.2,y:player.y,z:player.z+Math.cos(f)*2.2,face:f,t:0,target:L}; if(lesser){ s.x.cdUntil=Date.now()+60000; invChanged(); } toast('The time gate opens. Walk through it'); });
    const del=document.createElement('button'); del.className='ghost'; del.textContent='Forget'; del.addEventListener('click',()=>{ s.x.locs.splice(i,1); invChanged(); openTelelink(); });
    row.append(go,del); body.appendChild(row); });
  document.getElementById('journal').hidden=false; }
function stepGate(dt){ if(!gate) return; gate.t+=dt; if(gate.t>20){ gate=null; return; } if(gate.t<1.2) return;
  const p=player, dx=p.x-gate.x, dz=p.z-gate.z, n=[Math.sin(gate.face),Math.cos(gate.face)], along=dx*n[0]+dz*n[1], side=Math.abs(-dx*n[1]+dz*n[0]);
  if(Math.abs(along)<.35&&side<.9&&Math.abs(p.y-gate.y)<1.5){ const L=gate.target; gate=null; duskPuff(p.x,p.y,p.z);
    if((L.dim||null)!==(world.meta.dim||null)) switchDim(L.dim,[L.x,L.y,L.z],()=>{ player.x=L.x; player.y=L.y; player.z=L.z; player.fallTop=L.y; duskPuff(L.x,L.y,L.z); });
    else teleportPlayer(L.x,L.y,L.z); } }
function emitGate(vb){ if(!gate) return; const g=gate, k=Math.min(1,g.t/1.2), t=performance.now()/1000, cf=Math.cos(g.face), sf=Math.sin(g.face); setVL(VL_EMISSIVE);
  const R=1.15*k; for(let i=0;i<28;i++){ const a=i/28*6.283+t*1.5, r=R*(1+.06*Math.sin(t*6+i)), lx=Math.cos(a)*r*.75, ly=1.2+Math.sin(a)*r, c=i%2?[120,200,255]:[200,140,255];
    const X=g.x+lx*cf, Z=g.z-lx*sf; emitBox(vb,[X-.07,g.y+ly-.07,Z-.07],[X+.07,g.y+ly+.07,Z+.07],c,IDT); }
  for(let i=0;i<12&&k>.5;i++){ const a=t*3+i*.52, r=R*.6*((i%4)/4+.2), lx=Math.cos(a)*r*.75, ly=1.2+Math.sin(a)*r; const X=g.x+lx*cf, Z=g.z-lx*sf; emitBox(vb,[X-.04,g.y+ly-.04,Z-.04],[X+.04,g.y+ly+.04,Z+.04],[230,220,255],IDT); } }
// ---------- pocket dimensions: a room folded into nowhere, grown with expanders ----------
const POCKET_GAP=96;
function pocketRoom(id,size){ const ox=40+(id%40)*POCKET_GAP, oz=40+Math.floor(id/40)*POCKET_GAP, y=10; return {ox,oz,y,size}; }
function buildPocket(id,size,old){ const R=pocketRoom(id,size), S=size, H=Math.min(S,26);
  if(old){ for(let x=-1;x<=old;x++)for(let z=-1;z<=old;z++)for(let y=-1;y<=Math.min(old,26);y++){ const edge=x<0||z<0||y<0||x>=old||z>=old||y>=Math.min(old,26); if(edge) world.set(R.ox+x,R.y+y,R.oz+z,B.AIR); } }
  for(let x=-1;x<=S;x++)for(let z=-1;z<=S;z++)for(let y=-1;y<=H;y++){ const edge=x<0||z<0||y<0||x>=S||z>=S||y>=H; if(edge) world.set(R.ox+x,R.y+y,R.oz+z,B.POCKET_WALL); }
  world.set(R.ox+1,R.y,R.oz+1,B.POCKET_EXIT); world.set(R.ox+Math.floor(S/2),R.y+H-1,R.oz+Math.floor(S/2),DYE_BY.white.lantern); return R; }
function enterPocket(x,y,z){ const t=getTileGeneric(x,y,z,'pocket'); if(t.id==null){ const n=(store.get('strata:w:'+world.meta.id+':pockets')||0); t.id=n; t.size=8; store.set('strata:w:'+world.meta.id+':pockets',n+1); }
  const back={dim:world.meta.dim||null,x:x+.5,y:y+1,z:z+.5}; const R=pocketRoom(t.id,t.size), id=t.id, size=t.size;
  switchDim('pocket',[R.ox+2.5,R.y,R.oz+2.5],()=>{ world.pocketInfo=world.pocketInfo||{}; const pi=world.pocketInfo[id]||{size:0}; if(pi.size!==size){ buildPocket(id,size,pi.size||0); pi.size=size; } pi.back=back; world.pocketInfo[id]=pi; player.pocketId=id; player.x=R.ox+2.5; player.y=R.y; player.z=R.oz+2.5; player.fallTop=player.y; }); }
function getTileGeneric(x,y,z,kind){ const k=tileKey(x,y,z); let t=world.tiles.get(k); if(!t){ t={kind,x,y,z,s:[]}; world.tiles.set(k,t); } return t; }
function exitPocket(){ const pi=world.pocketInfo&&world.pocketInfo[player.pocketId]; const back=pi&&pi.back; if(!back){ switchDim(null,null); return; } switchDim(back.dim,[back.x,back.y,back.z],()=>{ player.x=back.x; player.y=back.y; player.z=back.z; player.fallTop=back.y; }); }
function useExpander(){ if(!inPocket()){ toast('Use it inside a pocket dimension'); return; } const id=player.pocketId, pi=world.pocketInfo&&world.pocketInfo[id]; if(!pi){ toast('This room has no anchor'); return; }
  if(pi.size>=48){ toast('This pocket is as big as it gets'); return; } const ns=pi.size+8; buildPocket(id,ns,pi.size); pi.size=ns; pi.grow=ns; const s=held(); if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } toast(`The walls step back · ${ns}×${ns}`); }
'''
rep("/* ---------- stage 6: decor entities ---------- */",CODE9+"\n/* ---------- stage 6: decor entities ---------- */")
# pocket block remembers its size: the tile's size grows when you expand from inside (sync on exit through store)
rep("function useExpander(){","function pocketGrowSync(){ /* sizes live in the pocket dimension record (pocketInfo) */ }\nfunction useExpander(){")
rep("const R=pocketRoom(t.id,t.size), id=t.id, size=t.size;","const PI=(store.get('strata:w:'+world.meta.id+':pocket')||{}).pocketInfo||{}; if(PI[t.id]&&PI[t.id].size>t.size) t.size=PI[t.id].size; const R=pocketRoom(t.id,t.size), id=t.id, size=t.size;")
# saves: dimension records, plus where you are; pocket info and loot flags with the world
rep("  store.set('strata:w:'+world.meta.id,{edits:","  store.set('strata:w:'+world.meta.id+':cur',{dim:world.meta.dim||null}); store.set(dimKey(world.meta),{pocketInfo:world.pocketInfo||null,lootDone:world.lootDone||null,baseH:world.meta.baseH,edits:")
rep("  world.tiles=new Map(); world.time=","  world.pocketInfo=save&&save.pocketInfo||{}; world.lootDone=save&&save.lootDone||{};\n  world.tiles=new Map(); world.time=")
rep("    li.querySelector('.play').addEventListener('click',()=>enterPlay(w,store.get('strata:w:'+w.id)));","    li.querySelector('.play').addEventListener('click',()=>{ const [m,sv]=resumeDim(w,store.get('strata:w:'+w.id)); enterPlay(m,sv); });")
rep("  document.getElementById('wname').textContent=meta.name;","  document.getElementById('wname').textContent=meta.name+(meta.dim?' · '+DIMS[meta.dim].name:'');")
# afterLoad hook once chunks are ready
rep("      world.pendingVeh=null; world.pendingMount=null;","      world.pendingVeh=null; world.pendingMount=null; if(world.afterLoad){ const f=world.afterLoad; world.afterLoad=null; f(); }\n      document.getElementById('wname').textContent=world.meta.name+(world.meta.dim?' · '+DIMS[world.meta.dim].name:'');")
# spawn safety in other dimensions
rep("function findSpawn(cx,cz){\n  const g=world.gen;","function findSpawn(cx,cz){\n  const g=world.gen; if(g.dusk||g.pocket) return [cx+.5,(g.pocket?20:g.height(cx,cz)+1),cz+.5];")
# frame: steps
rep("stepOrbs(dt); stepBobber(dt); stepFishGame(dt); }","stepOrbs(dt); stepBobber(dt); stepFishGame(dt); stepPortal(dt); stepThrown(dt); stepGate(dt); stepDuskAmbient(dt); }")
rep("function stepAmbient(dt){","""function stepDuskAmbient(dt){ const p=player; if(p.duskFx>0){ p.duskFx=Math.max(0,p.duskFx-dt*(p.onGround?1.2:.25)); } const el=document.getElementById('under'); if(p.duskFx>0){ el.style.background='radial-gradient(ellipse at center,rgba(60,10,90,.2),rgba(30,0,50,.85))'; el.style.opacity=Math.min(1,p.duskFx); el.dataset.dusk=1; } else if(el.dataset.dusk){ el.dataset.dusk=''; el.style.background=''; }
  if(inDusk()&&Math.random()<dt*25) parts.push({x:p.x+(Math.random()-.5)*24,y:p.y+Math.random()*8,z:p.z+(Math.random()-.5)*24,vx:(Math.random()-.5)*.3,vy:.15,vz:(Math.random()-.5)*.3,t:3,c:[190,120,255],s:.05,ember:true});
  // the Lost appear in their villages
  if(inDusk()&&Math.random()<dt*.5){ const v=world.gen.village(p.x,p.z); if(v&&mobs.filter(m=>m.type==='lost').length<6){ const a=Math.random()*6.28, x=v.x+Math.cos(a)*10, z=v.z+Math.sin(a)*10; spawnMob('lost',x,world.surface(Math.floor(x),Math.floor(z))+1,z); } } }
function stepAmbient(dt){""")
# sky, fog and ambience in the Dusk
rep("  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); SUNV=sun; FOG=sky;","  if(world&&world.meta.dim==='dusk'){ sun[0]=.78; sun[1]=.6; sun[2]=.95; sky[0]=.42; sky[1]=.26; sky[2]=.55; gl.uniform1f(U.uAmb,.16); } else if(world&&world.meta.dim==='pocket'){ sun[0]=sun[1]=sun[2]=.4; sky[0]=.08; sky[1]=.05; sky[2]=.14; gl.uniform1f(U.uAmb,.12); } else gl.uniform1f(U.uAmb,.03);\n  gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]); SUNV=sun; FOG=sky;")
rep("const fr=world.radius*CS; if(under) gl.uniform2f(U.uFogR,6,22); else gl.uniform2f(U.uFogR,fr-22,fr-6);","const fr=world.radius*CS; if(under) gl.uniform2f(U.uFogR,6,22); else if(world.meta.dim==='dusk') gl.uniform2f(U.uFogR,14,fr-10); else gl.uniform2f(U.uFogR,fr-22,fr-6);")
rep("function dayInfo(){\n  if(!world||world.preview) return {k:1,day:true,left:0};","function dayInfo(){\n  if(!world||world.preview) return {k:1,day:true,left:0};\n  if(world.meta.dim) return {k:.8,day:true,left:0,still:1};")
rep("function clockText(){ const d=dayInfo();","function clockText(){ const d=dayInfo(); if(d.still) return inDusk()?'The Dusk · timeless':'Pocket dimension';")
# mobs: Duskwalker and the Lost
rep("  sheep:{hp:8,","""  walker:{hp:40,speed:2.6,w:.6,h:4.1,food:[],hostile:1,drops:()=>[[I.DUSK_PEARL,Math.random()<2/3?1:0]],name:'Duskwalker'},
  lost:{hp:20,speed:1.2,w:.6,h:1.8,food:[],drops:()=>[],name:'Lost'},
  sheep:{hp:8,""")
rep("    const hv=d.hostile?stepHostile(m,d,dt,dist):","    const hv=m.type==='walker'?stepWalker(m,d,dt,dist):d.hostile?stepHostile(m,d,dt,dist):")
rep("  if(m.dead) return; m.hp-=dmg; m.hurtT=.35; if(MOB[m.type].hostile) m.aggro=20; else m.flee=3;",
    "  if(m.dead) return; m.hp-=dmg; m.hurtT=.35; if(m.type==='walker'){ m.aggro=40; if(Math.random()<.3&&!m.tpCd) walkerTeleport(m); } else if(m.type==='lost'){ m.flee=4; } else if(MOB[m.type].hostile) m.aggro=20; else m.flee=3;")
# spawning: walkers at night (rare) and anywhere in the Dusk; nothing hostile near Lost villages or in pockets
rep("  const n=mobs.filter(m=>MOB[m.type].hostile).length, night=!dayInfo().day; if(n>=(night?12:4)) return;",
    "  if(inPocket()) return; const n=mobs.filter(m=>MOB[m.type].hostile).length, night=!dayInfo().day||inDusk(); if(n>=(night?12:4)) return;")
rep("    const L=sampleLight(x+.5,y+1.5,z+.5), dark=Math.max(L[4],L[5],L[6])<60&&(night||L[0]<70);\n    if(!dark) continue;",
    "    if(inDusk()){ if(world.gen.village(x,z)) continue; if(Math.random()<.5){ spawnMob('walker',x+.5,y+1,z+.5,false); return; } continue; }\n    const L=sampleLight(x+.5,y+1.5,z+.5), dark=Math.max(L[4],L[5],L[6])<60&&(night||L[0]<70);\n    if(!dark) continue;\n    if(Math.random()<.07&&night&&!world.solid(x,y+3,z)&&!world.solid(x,y+4,z)){ spawnMob('walker',x+.5,y+1,z+.5,false); return; }")
rep("  if(m.type!=='slime'&&dayInfo().day&&dayInfo().k>.6&&L[0]>200){","  if(m.type!=='slime'&&!inDusk()&&dayInfo().day&&dayInfo().k>.6&&L[0]>200){")
rep("function stepHostileSpawning(dt){\n  hostileT-=dt; if(hostileT>0) return; hostileT=2.5;","function stepHostileSpawning(dt){\n  hostileT-=dt; if(hostileT>0) return; hostileT=2.5; if(inDusk()) for(const m of mobs) if(MOB[m.type].hostile&&world.gen.village(m.x,m.z)) m.dead=true;")
# lost: tap to trade
rep("  if(m.type==='wolf'&&near){","  if(m.type==='lost'&&near){ openTrade(m); return true; }\n  if(m.type==='wolf'&&near){")
# mob models
rep("  else if(m.type==='wolf'){","""  else if(m.type==='walker'){ const c=[34,18,48], g=[200,120,255], ws=m.moving?Math.sin(m.phase*.7)*.6:0, armA=m.aggro>0?-.6:ws*.5, held=m.throwT>0;
    setVL(VL_EMISSIVE); box([-.16,3.78,.21],[-.05,3.84,.23],g); box([.05,3.78,.21],[.16,3.84,.23],g); setVL(sampleLight(m.x,m.y+2,m.z)); VL[4]=Math.max(VL[4],70); VL[5]=Math.max(VL[5],30); VL[6]=Math.max(VL[6],110);
    box([-.17,0,-.06],[-.05,2.3,.06],c,T(2.3,0,ws)); box([.05,0,-.06],[.17,2.3,.06],c,T(2.3,0,-ws)); box([-.24,2.3,-.12],[.24,3.5,.12],c);
    box([-.34,1.25,-.06],[-.24,3.45,.06],c,T(3.4,0,held?-2.6:armA)); box([.24,1.25,-.06],[.34,3.45,.06],c,T(3.4,0,-armA*.8));
    box([-.25,3.5,-.25],[.25,4.0,.25],c); setVL(VL_EMISSIVE); box([-.26,3.5,-.26],[.26,3.53,.26],[110,50,170]); if(held) box([-.4,3.35,.0],[-.2,3.55,.2],[180,100,255]); }
  else if(m.type==='lost'){ const sk=[140,96,200], cl=[86,58,130], ws=m.moving?Math.sin(m.phase)*.6:0;
    box([-.23,0,-.12],[-.02,.76,.12],cl,T(.76,0,ws)); box([.02,0,-.12],[.23,.76,.12],cl,T(.76,0,-ws)); box([-.27,.76,-.15],[.27,1.38,.15],cl); box([-.28,.9,-.16],[.28,.96,.16],[200,170,90]);
    box([-.41,.78,-.08],[-.27,1.36,.08],sk,T(1.3,0,-ws*.8)); box([.27,.78,-.08],[.41,1.36,.08],sk,T(1.3,0,ws*.8)); box([-.23,1.38,-.22],[.23,1.84,.22],sk); box([-.25,1.72,-.24],[.25,1.9,.24],cl);
    setVL(VL_EMISSIVE); box([-.12,1.56,.215],[-.06,1.62,.235],[110,220,255]); box([.06,1.56,.215],[.12,1.62,.235],[110,220,255]); }
  else if(m.type==='wolf'){""")
# tall walker hitbox & lost never despawn
rep("  for(let i=mobs.length-1;i>=0;i--){ const m=mobs[i]; if(MOB[m.type].hostile&&Math.hypot(m.x-player.x,m.z-player.z)>90) mobs.splice(i,1); }","  for(let i=mobs.length-1;i>=0;i--){ const m=mobs[i]; if((MOB[m.type].hostile||m.type==='lost')&&Math.hypot(m.x-player.x,m.z-player.z)>90) mobs.splice(i,1); }")
# dynamic: thrown orbs and gates
rep("  if(world.decor) emitDecor(dynVB); emitOrbs(dynVB);","  if(world.decor) emitDecor(dynVB); emitOrbs(dynVB); emitThrown(dynVB); emitGate(dynVB); setVL(sampleLight(p.x,p.y+1.2,p.z));")
# held items
rep("  if(it.rod){ castRod(sx,sy); return true; }","""  if(s.id===I.DUSK_ORB){ throwOrb(sx,sy); return true; }
  if(it.telelink){ openTelelink(); return true; } if(it.lore){ readLore(s); return true; } if(it.expander){ useExpander(); return true; }
  if(it.starter||s.id===B.TORCH&&!buildMode){ const r=pick(sx,sy); if(r&&r.prev&&reachOK(...r.hit)){ const [x,y,z]=r.prev; if(lightPortalAt(x,y,z)){ useTool(); return true; } if(it.starter&&world.get(x,y,z)===B.AIR){ world.set(x,y,z,B.FIRE); useTool(); return true; } } if(it.starter){ toast('Strike it against a block'); return true; } }
  if(it.rod){ castRod(sx,sy); return true; }""")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.decorItem||it.bucket||","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(s.id===I.DUSK_ORB||it.telelink||it.lore||it.expander||it.starter||it.decorItem||it.bucket||")
# blocks: pocket enter/exit taps, portal breakage
rep("  if(b===B.GRIM_DESK){","  if(b===B.POCKET&&!player.crouch){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } enterPocket(x,y,z); return true; }\n  if(b===B.POCKET_EXIT){ exitPocket(); return true; }\n  if(b===B.GRIM_DESK){")
rep("const INTERACTIVE=b=>b===B.GRIM_DESK||","const INTERACTIVE=b=>b===B.POCKET||b===B.POCKET_EXIT||b===B.GRIM_DESK||")
rep("  if(BLOCKS[b].drawer) spillDrawer(x,y,z);","  if(BLOCKS[b].drawer) spillDrawer(x,y,z);\n  if(b===B.DUSK_BLOCK||BLOCKS[b].portal) portalBroken(x,y,z);")
# fire burns out after a while
rep("function stepFluids(dt){","function stepFire(){ /* fire blocks are short-lived: removed on chunk revisit */ }\nfunction stepFluids(dt){")
# icons
rep("    if(it.camera){","""    if(it.telelink){ const gr=g.createRadialGradient(30,30,4,30,30,22); gr.addColorStop(0,'#e8f6ff'); gr.addColorStop(.5,it.telelink===1?'#7ac8ff':'#b98aff'); gr.addColorStop(1,'#2a1840'); g.fillStyle=gr; g.beginPath(); g.arc(30,30,22,0,7); g.fill(); g.strokeStyle='#ffd84a'; g.lineWidth=3; g.beginPath(); g.arc(30,30,22,0,7); g.stroke(); return c; }
    if(it.lore){ g.fillStyle='#3a2458'; g.fillRect(14,8,32,44); g.fillStyle='#e7a6ff'; g.fillRect(42,10,4,40); g.fillStyle='#ffd84a'; g.fillRect(22,22,14,3); g.fillRect(22,30,14,3); return c; }
    if(it.expander){ g.fillStyle='#4a2f70'; g.fillRect(14,14,32,32); g.strokeStyle='#e7a6ff'; g.lineWidth=3; for(const [a,b2,c2,d2] of [[8,8,18,18],[52,8,42,18],[8,52,18,42],[52,52,42,42]]){ g.beginPath(); g.moveTo(a,b2); g.lineTo(c2,d2); g.stroke(); } return c; }
    if(it.starter){ g.fillStyle='#9aa0a7'; g.beginPath(); g.ellipse(22,34,12,9,0,0,7); g.fill(); g.strokeStyle='#5a5f66'; g.lineWidth=5; g.beginPath(); g.arc(38,26,10,0,4); g.stroke(); g.fillStyle='#ffb43c'; g.beginPath(); g.arc(30,22,4,0,7); g.fill(); return c; }
    if(id===I.DUSK_CRYSTAL||id===I.LUMEN){ g.fillStyle=id===I.LUMEN?'#9ff3ff':'#e7a6ff'; g.beginPath(); g.moveTo(30,6); g.lineTo(44,30); g.lineTo(30,54); g.lineTo(16,30); g.closePath(); g.fill(); g.fillStyle='rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(30,6); g.lineTo(36,30); g.lineTo(30,40); g.fill(); return c; }
    if(it.camera){""")
rep("||it.special||it.camera||it.photo)){","||it.special||it.camera||it.photo||it.telelink||it.lore||it.expander||it.starter||id===I.DUSK_CRYSTAL||id===I.LUMEN)){")
rep("if(it.grimoire){ const g=s.x&&s.x.g;","if(it.grimoire&&s.x&&s.x.g&&false){ const g=s.x&&s.x.g;")
open(F,'w').write(s); print('ok')
