
/* =====================================================================
   STAGE 21: Showcase worlds — a flat world with biome strips in the wild and a signposted tour of the game's features
   around spawn. New worlds can be made from it as a template (World type: Showcase).
   ===================================================================== */
const SHOW_G=64;   // grass level; the tour is built on top of it
class ShowGen{
  constructor(seed,size,H){ this.seed=seed; this.size=size; this.H=H; this.show=true; this.C=Math.floor(size/2); }
  height(){ return SHOW_G; } sample(){ return SHOW_G; } spawnOK(){ return SHOW_G; } village(){ return null; }
  bio(x,z){ const dx=x-this.C, dz=z-this.C; if(Math.max(Math.abs(dx),Math.abs(dz))<72) return 'plains';
    const a=(Math.atan2(dz,dx)/Math.PI+1)/2, r=Math.hypot(dx,dz)+hash2(x>>3,z>>3,this.seed)*12;
    const ring=['flower_plains','forest','birch_forest','dark_forest','taiga','snowy_taiga','snowy_tundra','desert','badlands','jungle','swamp','mushroom_fields','cherry'];
    const k=ring[Math.floor(a*12+(r>220?.5:0))%12]; return k; }
  biomeAt(x,z){ return BI[this.bio(x,z)]??BI.plains; }
  fill(ch){ const x0=ch.cx*CS, z0=ch.cz*CS, b=ch.blocks, G=SHOW_G, I=(x,y,z)=>(y*CS+z)*CS+x; ch.bio=new Uint8Array(CS*CS); ch.falls=[];
    const W=k=>WOODS.find(w=>w.k===k)||WOODS[0];
    for(let z=0;z<CS;z++) for(let x=0;x<CS;x++){ const wx=x0+x, wz=z0+z; if(wx>=this.size||wz>=this.size) continue; const k=this.bio(wx,wz); ch.bio[z*CS+x]=BI[k]??BI.plains;
      const sand=k==='desert', mesa=k==='badlands', snow=k==='snowy_tundra'||k==='snowy_taiga', mush=k==='mushroom_fields';
      b[I(x,0,z)]=B.BEDROCK; for(let y=1;y<G-4;y++) b[I(x,y,z)]=B.STONE;
      for(let y=G-4;y<G;y++) b[I(x,y,z)]=sand?B.SANDSTONE:mesa?(y%2?B.TERRA_O:B.TERRACOTTA):B.DIRT;
      b[I(x,G,z)]=sand?B.SAND:mesa?B.RED_SAND:snow?B.SNOW_GRASS:mush?B.MYCELIUM:k==='taiga'||k==='dark_forest'?B.PODZOL:B.GRASS;
      // the wild: trees and plants kept inside the chunk so every chunk stands on its own
      if(k==='plains') continue; const r=hash2(wx,wz,this.seed+11), r2=hash2(wx,wz,this.seed+12);
      const inside=x>=3&&x<=12&&z>=3&&z<=12;
      if(sand){ if(r<.012) for(let h=1;h<=1+(r2*3|0);h++) b[I(x,G+h,z)]=B.CACTUS; else if(r<.03) b[I(x,G+1,z)]=B.DEAD_BUSH; continue; }
      if(mesa){ if(r<.01) b[I(x,G+1,z)]=B.DEAD_BUSH; continue; }
      if(mush){ if(r<.04) b[I(x,G+1,z)]=r2<.5?B.MUSH_R:B.MUSH_BR; continue; }
      const tp={forest:['oak',.02],birch_forest:['birch',.025],dark_forest:['dark',.035],taiga:['spruce',.025],snowy_taiga:['spruce',.02],jungle:['jungle',.04],swamp:['oak',.012],cherry:['cherry',.02],flower_plains:['oak',.004],snowy_tundra:['spruce',.002]}[k];
      if(tp&&inside&&r<tp[1]){ const w=W(tp[0]), th=4+(r2*3|0)+(k==='jungle'?2:0);
        for(let h=1;h<=th;h++) b[I(x,G+h,z)]=w.log;
        for(let dy=th-2;dy<=th+1;dy++){ const rad=dy>th-1?1:2; for(let dz=-rad;dz<=rad;dz++) for(let dx=-rad;dx<=rad;dx++){ if(Math.abs(dx)===2&&Math.abs(dz)===2) continue; const i=I(x+dx,G+dy,z+dz); if(!b[i]) b[i]=w.leaves; } }
        if(k==='jungle'&&r2<.5){ const c=COCOA[(1)*3+2]; if(c&&!b[I(x,G+2,z+1)]) b[I(x,G+2,z+1)]=COCOA[3+2]; } continue; }
      if(r<.12&&!b[I(x,G+1,z)]){ const fl=[B.TALLGRASS,B.TALLGRASS,B.FLOWER_R,B.FLOWER_Y,B.FLOWER_B,B.FLOWER_W,B.FLOWER_P,B.FERN].filter(Boolean); b[I(x,G+1,z)]=k==='flower_plains'||r2<.3?fl[(r2*fl.length)|0]:B.TALLGRASS; }
      if(k==='swamp'&&r<.05&&r2<.5){ b[I(x,G,z)]=B.WATER; if(r2<.2) b[I(x,G+1,z)]=B.LILY; } } }
}
window.ShowGen=ShowGen;

/* ---------- the tour ---------- */
function buildShowcase(w){ const C=w.gen.C, G=SHOW_G+1, T=TECH.TECHB, X=T19;
  const put=(x,y,z,v)=>{ if(v==null||v===undefined||y<1||y>=w.H) return; const cx=x>>4, cz=z>>4, k=w.key(cx,cz); let e=w.edits.get(k); if(!e){ e=new Map(); w.edits.set(k,e); } e.set((y*CS+(z&15))*CS+(x&15),v); };
  const fill=(x0,y0,z0,x1,y1,z1,v)=>{ for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) for(let z=z0;z<=z1;z++) put(x,y,z,v); };
  const byName=n=>{ const b=BLOCKS.find(q=>q&&q.name===n); return b?b.id:null; };
  const sign=(x,z,n,text,y)=>{ y=y??G; put(x,y,z,0); w.decor.push({kind:'sign',c:[x+.5,y+.95,z+.5],n,u:[n[2],0,-n[0]],v:[0,1,0],w:1,h:.6,sup:[x,y-1,z],cell:[x,y,z],post:1,fixU:1,text,frame:'wood',bg:'planks'}); };
  const tech=(x,y,z,k,f,o)=>{ put(x,y,z,T[k]??k); const t=X.newTech(x,y,z,typeof k==='string'?k:BLOCKS[k].tech,f??4); Object.assign(t.tech,o||{}); return t; };
  const lampAt=(x,y,z,col,f)=>{ const L=TECH.LAMPS[col||'white']; put(x,y,z,L.off); const t=X.newTech(x,y,z,'lamp_'+(col||'white'),f??2); return t; };
  const chest=(x,y,z,id,items)=>{ put(x,y,z,id); const s=new Array(CHEST_SLOTS[id]).fill(null); items.forEach((it,i)=>{ if(it&&ITEMS[it[0]]) s[i]=mkStack(it[0],it[1]||1); }); w.tiles.set(tileKey(x,y,z),{kind:'chest',x,y,z,s}); return s; };
  const N=[0,0,1], S=[0,0,-1];   // signs on the north rows face south (+z) toward the avenue, and the other way round
  const PX=[-60,-45,-30,-15,3,18,33,48];
  // paths: a stone-brick avenue east–west, one north–south, gravel lanes between the rows, lantern posts
  fill(C-63,G-1,C-1,C+63,G-1,C+1,B.STONE_BRICK); fill(C-1,G-1,C-35,C+1,G-1,C+35,B.STONE_BRICK);
  fill(C-63,G-1,C-18,C+63,G-1,C-17,B.GRAVEL); fill(C-63,G-1,C+17,C+63,G-1,C+18,B.GRAVEL);
  const lant=DYES.find(d=>d.k==='white').lantern; for(let x=-60;x<=60;x+=10) for(const z of [-2,2]){ put(C+x,G,C+z,B.FENCE); put(C+x,G+1,C+z,B.FENCE); put(C+x,G+2,C+z,lant); }
  // welcome
  sign(C+3,C+3,S,'WELCOME TO STRATA\nShowcase world\nWalk the avenues:\nevery plot has a sign');
  sign(C-3,C+3,S,'East: farming, animals,\nwater, lights\nWest: trees & stone\nSouth: tech · North: home');
  // wireless receiver from the logic plot lights this lamp
  { tech(C-4,G,C+5,'wbasic',4,{role:'rx',ch:42,e:200}); tech(C-4,G-1,C+5,'capbank',4,{e:40000}); tech(C-4,G-1,C+6,'capbank',4,{e:40000}); lampAt(C-4,G,C+6,'lime'); }

  /* --- north row A --- */
  // A0–A2: arboretum, every wood
  { const ks=WOODS.map(w=>w.k); ks.forEach((k,i)=>{ const wd=WOODS.find(q=>q.k===k), x=C-58+i*4, z=C-(i%2?12:7), th=5+(k==='jungle'?2:0), nether=!!wd.nether;
      for(let h=0;h<th;h++) put(x,G+h,z,wd.log);
      for(let dy=th-2;dy<=th+1;dy++){ const rad=dy>th-1?1:2; for(let dz=-rad;dz<=rad;dz++) for(let dx=-rad;dx<=rad;dx++){ if(Math.abs(dx)===2&&Math.abs(dz)===2||(!dx&&!dz&&dy<th)) continue; put(x+dx,G+dy,z+dz,wd.leaves); } }
      if(nether) for(const [dx,dz] of [[-2,0],[2,0],[0,2]]) put(x+dx,G+th-3,z+dz,B.SHROOMLIGHT);
      put(x+1,G,z+1,wd.sapling); put(x-1,G,z+1,wd.stripped); });
    sign(C-52,C-3,N,'ARBORETUM\nAll 11 woods: logs,\nleaves, saplings and\nstripped logs'); sign(C-38,C-3,N,'Crimson & warped\nfungi grow\nshroomlights.\nBone meal saplings!'); }
  // A3: stone gallery
  { const ks=['ANDESITE','POLISHED_ANDESITE','DIORITE','POLISHED_DIORITE','GRANITE','POLISHED_GRANITE','TUFF','POLISHED_TUFF','TUFF_BRICKS','CALCITE','DEEPSLATE','COBBLED_DEEPSLATE','POLISHED_DEEPSLATE','DEEPSLATE_BRICKS','DEEPSLATE_TILES','SMOOTH_STONE','STONE_BRICK','MOSSY_STONE_BRICK','CHISELED_STONE','BRICK','COBBLE','MOSSY_COBBLE','SANDSTONE','RED_SANDSTONE','OBSIDIAN','ORE_COAL','ORE_TIN','ORE_COPPER','ORE_BAUXITE','ORE_GOLD','ORE_IRON','ORE_TITANIUM','ORE_PLATINUM','ORE_DIAMOND','PACKED_ICE','CLAY'];
    ks.forEach((k,i)=>{ if(!B[k]) return; const x=C+PX[3]+(i%6)*2, z=C-15+Math.floor(i/6)*2; put(x,G,z,B[k]); put(x,G+1,z,B[k]); });
    const sl=BLOCKS.filter(b=>b&&/ (slab|stairs)$/.test(b.name)).filter((b,i,a)=>a.findIndex(q=>q.name===b.name)===i).slice(0,12).map(b=>b.id); sl.forEach((id,i)=>put(C+PX[3]+i,G,C-4,id));
    sign(C+PX[3]+6,C-3,N,'STONE GALLERY\nEvery stone, polished\nand brick form, ores,\nslabs and stairs'); }
  // A4: farm
  { const x0=C+PX[4], z0=C-15; fill(x0,G-1,z0,x0+12,G-1,z0+11,B.FARMLAND_WET); fill(x0+6,G-1,z0,x0+6,G-1,z0+11,B.WATER);
    const crops=['wheat','carrots','potatoes','beetroots']; crops.forEach((k,ci)=>{ const ids=CROPS[k]&&CROPS[k].ids; if(!ids) return; for(let z=z0+ci*3;z<z0+ci*3+2;z++) for(let x=x0;x<x0+6;x++) put(x,G,z,ids[ids.length-1]); });
    for(const [k,fruit,dz] of [['melon',B.MELON,0],['pumpkin',B.PUMPKIN,3]]){ const c=CROPS[k+'_stem']; if(!c) continue; put(x0+8,G,z0+dz,c.att); put(x0+9,G,z0+dz,fruit); put(x0+8,G,z0+dz+1,c.ids[c.ids.length-1]); }
    put(x0+7,G-1,z0+7,B.SAND); for(let h=0;h<3;h++) put(x0+7,G+h,z0+7,B.SUGAR_CANE);
    fill(x0+9,G-1,z0+7,x0+11,G-1,z0+8,B.SAND); for(let h=0;h<3;h++) put(x0+10,G+h,z0+7,B.CACTUS);
    fill(x0+8,G-1,z0+10,x0+12,G-1,z0+11,B.GRASS); for(let i=0;i<3;i++) put(x0+8+i*2,G,z0+10,BERRY[3]);
    const jl=WOODS.find(q=>q.k==='jungle'); for(let h=0;h<4;h++) put(x0+12,G+h,z0+5,jl.log); put(x0+12,G+1,z0+6,COCOA[0*3+2]); put(x0+12,G+2,z0+6,COCOA[0*3+1]);
    sign(x0+6,C-3,N,'FARM\nWheat, carrots, potatoes,\nbeets, melons, pumpkins,\ncane, cactus, cocoa'); }
  // A5: animal pen
  { const x0=C+PX[5], z0=C-15; for(let x=x0;x<=x0+12;x++){ put(x,G,z0,B.FENCE); put(x,G,z0+12,B.FENCE); } for(let z=z0;z<=z0+12;z++){ put(x0,G,z,B.FENCE); put(x0+12,G,z,B.FENCE); }
    put(x0+6,G,z0+12,B.AIR); w.__mobs=[['cow',x0+3,z0+3],['cow',x0+4,z0+4],['pig',x0+8,z0+3],['pig',x0+9,z0+4],['sheep',x0+3,z0+8],['sheep',x0+4,z0+9],['chicken',x0+9,z0+8],['chicken',x0+10,z0+9],['horse',x0+6,z0+6],['wolf',x0+2,z0+10,{tame:true,sit:true}],['parrot',x0+10,z0+10,{tame:true,sit:true,col:[48,86,206]}]];
    sign(x0+6,C-3,N,'ANIMALS\nFeed two to breed them.\nTame wolves with bones,\nparrots with seeds'); }
  // A6: pond
  { const x0=C+PX[6], z0=C-14; fill(x0,G-7,z0,x0+10,G-7,z0+10,B.SAND); fill(x0,G-6,z0,x0+10,G-1,z0+10,B.WATER);
    const cor=[B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN]; for(let i=0;i<10;i++){ const x=x0+(i*7)%11, z=z0+(i*3)%11; put(x,G-6,z,i%3?cor[i%5]:B.KELP); if(i%3===0){ put(x,G-5,z,B.KELP); put(x,G-4,z,B.KELP); } }
    put(x0,G-6,z0,B.SEA_LANTERN); put(x0+10,G-6,z0+10,B.SEA_LANTERN); put(x0+3,G-1,z0+7,B.AIR); put(x0+3,G,z0+7,B.LILY); put(x0+3,G-1,z0+7,B.WATER);
    w.__mobs.push(['squid',x0+4,z0+4,{y:G-4}],['squid',x0+7,z0+6,{y:G-3}],['glow_squid',x0+5,z0+8,{y:G-5}]);
    sign(x0+5,C-3,N,'POND\nSquid & glow squid ink\nwhen hurt. Coral, kelp\nand sea lanterns'); }
  // A7: lighting hut
  { const x0=C+PX[7], z0=C-15; fill(x0,G,z0,x0+12,G+4,z0+10,B.STONE_BRICK); fill(x0+1,G,z0+1,x0+11,G+3,z0+9,B.AIR); fill(x0+4,G,z0+10,x0+8,G+2,z0+10,B.AIR);
    put(x0+2,G,z0+2,B.TORCH); put(x0+4,G,z0+2,JACK[2]); put(x0+6,G,z0+2,B.SEA_LANTERN); put(x0+8,G,z0+2,B.SHROOMLIGHT); put(x0+10,G,z0+2,CARVED[2]);
    ['red','orange','yellow','lime','cyan','blue','purple','pink'].forEach((d,i)=>{ put(x0+2+i,G,z0+5,DYES.find(q=>q.k===d).lantern); });
    for(let i=0;i<5;i++){ tech(x0+2+i*2,G-1,z0+8,'capbank',4,{e:50000}); lampAt(x0+2+i*2,G,z0+8,['white','red','lime','blue','magenta'][i]); }
    sign(x0+6,C-3,N,'LIGHTS\nTorch, jack o\'lantern,\nsea lantern, shroomlight,\nlanterns, RF lamps'); }

  /* --- south row B: tech --- */
  // B0: storage
  { const x0=C+PX[0], z0=C+4, it=TECH.MI;
    chest(x0,G,z0+2,B.CHEST_WOOD,[[GEN['iron:shears']],[GEN['iron:hoe']],[I.BONE_MEAL,64],[I.SEEDS,32],[I.FILTER],[I.UP_STACK1],[I.UP_FILTER],[I.UP_VOID]]);
    chest(x0+2,G,z0+2,B.CHEST_TIN,[[it.copper.rod,16],[it.copper.wire[0],32],[it.copper.wire[1],32],[I.COIL_WEAK,8],[I.COIL,8],[I.COIL_HEAVY,4],[I.CHIP_BASIC,8],[I.CHIP_ADV,4],[I.MAGNET,8],[I.SILICON,16],[I.SI_DISC,4],[I.RADIO,2],[I.LINKER]]);
    chest(x0+4,G,z0+2,B.CHEST_IRON,['lever','gate','sbcast','srecv','wbasic','wterm','piston','spiston','pipe','hopper','dropper','tank1','tap','xpdrain','pole','inducer','receiver','terminal'].map(k=>[T[k],16]));
    chest(x0+6,G,z0+2,B.CHEST_GOLD,[...[1,2,3,4,5,6,7,8].map(i=>[T['solar'+i],4]),[T.capbank,8],[T.capbank2,4],[T.capbank3,2],[T.cgen,2],[T.windmill,2],[T.extr1],[T.extr3],[T.mwcru],[T.spout],[T.stand],[T.sifter],[T.crank],[T.moulder],[T.spress],[T.gpress],[T.wtable]]);
    chest(x0+8,G,z0+2,B.CHEST_DIAMOND,DYES.map(d=>[TECH.LAMPS[d.k].off,16]));
    // distributor: source chest → pipes → fork → two chests; a stack upgrade moves whole stacks
    const src=chest(x0,G,z0+7,B.CHEST_WOOD,[[B.COBBLE,200],[B.DIRT,200],[B.SAND,100]]);
    const p=[[x0+1,z0+7],[x0+2,z0+7],[x0+3,z0+7],[x0+3,z0+6],[x0+3,z0+8]].map(([x,z])=>tech(x,G,z,'pipe',4,{fm:['off','off','off','off','off','off'],slots:[null,null,null,null,null,null,null]}));
    p[0].tech.fm[1]='in'; p[0].tech.slots[0]={id:I.UP_STACK1,n:1}; p[3].tech.fm[5]='out'; p[4].tech.fm[4]='out';
    chest(x0+3,G,z0+5,B.CHEST_WOOD,[]); chest(x0+3,G,z0+9,B.CHEST_WOOD,[]);
    // hopper: chest above feeds the chest beside it
    chest(x0+8,G+1,z0+7,B.CHEST_WOOD,[[B.GRAVEL,64]]); tech(x0+8,G,z0+7,'hopper',0,{slots:[null,null,null,null,null,null]}); chest(x0+9,G,z0+7,B.CHEST_WOOD,[]);
    // a backpack set down with upgrades
    put(x0+11,G,z0+3,T.bpack); const bp=X.newTech(x0+11,G,z0+3,'bpack',5); bp.s=new Array(36).fill(null); bp.s[0]=mkStack(B.COBBLE,50); bp.tech.item=I.PACK_IRON; bp.tech.up=[{id:I.UP_STACK2,n:1},{id:I.UP_FILTER,n:1,x:{flt:{ids:[B.COBBLE],deny:false}}}];
    sign(x0+2,C+3,S,'STORAGE\nTiered chests full of\ntech parts. Iron\nbackpack with upgrades'); sign(x0+8,C+3,S,'DISTRIBUTOR & HOPPER\nPipes split at forks.\nHopper feeds east.'); }
  // B1: foundry and extruder
  { const x0=C+PX[1], z0=C+5; fill(x0,G,z0,x0+2,G,z0,B.STONE_BRICK);
    const cru=tech(x0+1,G+1,z0,'mwcru',4,{slots:[mkStack(I.COAL,32),mkStack(I.COPPER,16)],heat:950});
    const tk=tech(x0,G+1,z0,'tank1',4,{fl:'m_copper',amt:1440}); tech(x0+2,G+1,z0,'spout',0); tech(x0+2,G,z0,'stand',4,{hold:I.STICK});
    put(x0+2,G,z0,T.stand);
    const ex=tech(x0+6,G,z0,'extr1',5,{slots:[mkStack(TECH.MI.copper.rod,16),null,null],shape:'wire',th:2}); tech(x0+7,G,z0,'capbank',4,{e:50000});
    tech(x0+9,G,z0,'extr3',5,{slots:[mkStack(TECH.MI.iron.rod,16),null,null],shape:'plate',th:1}); tech(x0+10,G,z0,'capbank',4,{e:50000});
    sign(x0+1,C+3,S,'FOUNDRY\nHot crucible melts into\nthe tank. Click the\nspout to cast a mold'); sign(x0+8,C+3,S,'EXTRUDERS\nRods → wire, plates,\ngears, tubes. Open one\nand press Begin'); }
  // B2: generation and storage of power, with an RF terminal wall
  { const x0=C+PX[2], z0=C+5;
    tech(x0,G,z0+4,'windmill',5,{e:4000}); X.newTech(x0,G+1,z0+4,'windtop',5); put(x0,G+1,z0+4,T.windtop);
    for(let i=1;i<=8;i++) tech(x0+1+i,G,z0+8,'solar'+i,4,{e:0});
    tech(x0+10,G,z0+8,'capbank',4,{e:20000});
    for(let x=0;x<3;x++) for(let y=0;y<2;y++){ tech(x0+4+x,G+y,z0+1,'capbank2',4,{e:150000}); tech(x0+4+x,G+y,z0,'terminal',5); }
    tech(x0+1,G,z0+4,'cgen',5,{slots:[mkStack(I.COAL,64),null]}); tech(x0+2,G,z0+4,'capbank',4,{e:0});
    sign(x0+1,C+3,S,'POWER\nWindmill, coal generator\nsolar I–VIII, capacitor\nmultiblock + terminal'); }
  // B3: power lines
  { const x0=C+PX[3], z0=C+5; tech(x0,G,z0,'capbank',4,{e:50000}); const ind=tech(x0+1,G,z0,'inducer',4,{e:500});
    const pl=tech(x0+6,G,z0+5,'pole',4); const rc=tech(x0+11,G,z0+9,'receiver',4);
    for(const [dx,dz] of [[12,9],[11,10],[10,9]]) lampAt(x0+dx,G,z0+dz,'yellow');
    w.techLinks=w.techLinks||[]; w.techLinks.push([tileKey(x0+1,G,z0),tileKey(x0+6,G,z0+5),2],[tileKey(x0+6,G,z0+5),tileKey(x0+11,G,z0+9),2]);
    sign(x0+3,C+3,S,'POWER LINES\nInducer → pole →\nreceiver. Tap nodes\nwith a coil to wire'); }
  // B4: logic gates, all powered by a buried capacitor row
  { const x0=C+PX[4], z0=C+6; fill(x0,G-1,z0-1,x0+12,G-1,z0+2,T.capbank); for(let x=x0;x<=x0+12;x++) for(let z=z0-1;z<=z0+2;z++) X.newTech(x,G-1,z,'capbank',4).tech.e=50000;
    [['AND',1,1],['OR',1,0],['XOR',1,0],['NAND',1,1]].forEach(([g,a,b],i)=>{ const gx=x0+1+i*3; tech(gx,G,z0,'gate',4,{g}); tech(gx-1,G,z0,'lever',2,{on:!!a}); tech(gx+1,G,z0,'lever',2,{on:!!b}); lampAt(gx,G,z0+1,'lime'); });
    tech(x0+1,G,z0+4,'gate',4,{g:'NOT'}); tech(x0+1,G,z0+3,'lever',2,{on:false}); lampAt(x0+1,G,z0+5,'red');
    tech(x0+5,G,z0+4,'gate',4,{g:'CLOCK',dl:10}); lampAt(x0+5,G,z0+5,'orange');
    tech(x0+9,G,z0+4,'gate',4,{g:'TFF'}); tech(x0+9,G,z0+3,'lever',2,{on:false}); lampAt(x0+9,G,z0+5,'cyan');
    fill(x0,G-1,z0+3,x0+12,G-1,z0+5,T.capbank); for(let x=x0;x<=x0+12;x++) for(let z=z0+3;z<=z0+5;z++) X.newTech(x,G-1,z,'capbank',4).tech.e=50000;
    sign(x0+6,C+3,S,'LOGIC GATES\nAND OR XOR NAND (row 1)\nNOT, CLOCK, TFF (row 2)\nFlip the levers!'); }
  // B5: signal levels and wireless
  { const x0=C+PX[5], z0=C+6; fill(x0,G-1,z0-1,x0+12,G-1,z0+4,T.capbank); for(let x=x0;x<=x0+12;x++) for(let z=z0-1;z<=z0+4;z++) X.newTech(x,G-1,z,'capbank',4).tech.e=50000;
    tech(x0+1,G,z0,'lever',2,{on:true}); tech(x0+2,G,z0,'sbcast',4,{pl:7}); tech(x0+3,G,z0,'lever',2,{on:true}); tech(x0+4,G,z0,'sbcast',4,{pl:10});
    // both broadcasters send south into a receiver row: 7 and 10 meet in an AND receiver
    tech(x0+2,G,z0+1,'srecv',0,{op:'OR',conv:'level',fo:['out','in','off','off','off','in']}); tech(x0+3,G,z0+1,'srecv',4,{op:'AND',conv:'level',fo:['in','in','off','off','out','off']}); lampAt(x0+3,G,z0+2,'magenta');
    tech(x0+4,G,z0+1,'srecv',1,{op:'PASS',conv:'level',fo:['off','out','off','off','off','in']});
    tech(x0+8,G,z0,'lever',2,{on:true}); tech(x0+9,G,z0,'wbasic',4,{role:'tx',ch:42,e:200});
    tech(x0+11,G,z0+2,'wterm',4,{role:'tx',ch:43,op:'OR',conv:'level',e:200}); tech(x0+10,G,z0+2,'lever',2,{on:true});
    sign(x0+3,C+3,S,'SIGNAL LEVELS 0–16\nBroadcasters send 7, 10\nreceivers AND/OR them.\nOpen them to see values'); sign(x0+9,C+3,S,'WIRELESS\nThis lever lights the\nlamp at spawn on\nchannel 42'); }
  // B6: pistons
  { const x0=C+PX[6], z0=C+6; fill(x0,G-1,z0-1,x0+12,G-1,z0+4,T.capbank); for(let x=x0;x<=x0+12;x++) for(let z=z0-1;z<=z0+4;z++) X.newTech(x,G-1,z,'capbank',4).tech.e=50000;
    tech(x0+1,G,z0,'lever',2,{on:false}); tech(x0+2,G,z0,'piston',0,{e:100}); put(x0+3,G,z0,B.PLANKS); put(x0+4,G,z0,B.BRICK); put(x0+5,G,z0,B.STONE);
    tech(x0+1,G,z0+3,'gate',0,{g:'CLOCK',dl:16}); tech(x0+2,G,z0+3,'spiston',0,{e:100}); put(x0+3,G,z0+3,B.WOOL_lime||DYES.find(d=>d.k==='lime').woolB);
    sign(x0+5,C+3,S,'PISTONS\nFlip the lever to push.\nThe clock drives a\nslimy piston back & forth'); }
  // B7: XP, sifting, silicon
  { const x0=C+PX[7], z0=C+5; fill(x0,G-1,z0,x0+12,G-1,z0+10,T.capbank); for(let x=x0;x<=x0+12;x++) for(let z=z0;z<=z0+10;z++) X.newTech(x,G-1,z,'capbank',4).tech.e=50000;
    tech(x0+1,G,z0+1,'tank2',4,{fl:'xp',amt:6000}); tech(x0+1,G+1,z0+1,'tank2',4,{fl:'xp',amt:6000}); tech(x0+1,G+1,z0+2,'tap',4); put(x0+2,G,z0+2,B.STONE_BRICK); tech(x0+2,G+1,z0+2,'lever',2,{on:false});
    tech(x0+4,G,z0+1,'tank1',4,{}); tech(x0+4,G+1,z0+1,'xpdrain',4);
    tech(x0+7,G,z0+2,'sifter',4,{sand:64}); tech(x0+8,G,z0+2,'crank',2);
    tech(x0+10,G,z0+2,'moulder',5,{slots:[mkStack(I.SILICON,16),null,null]}); tech(x0+11,G,z0+2,'spress',5,{slots:[mkStack(I.SI_DISC,4),mkStack(TECH.MI.copper.wire[0],16),null,null]});
    sign(x0+2,C+3,S,'XP & SILICON\nLever: XP shower tap.\nStand on the drain.\nCrank the sifter'); }

  /* --- north row C: life --- */
  // C0–C1: a house
  { const x0=C+PX[0], z0=C-31, P=B.PLANKS, L=B.LOG; fill(x0,G,z0,x0+10,G+3,z0+8,P); fill(x0+1,G,z0+1,x0+9,G+3,z0+7,B.AIR);
    for(const [x,z] of [[x0,z0],[x0+10,z0],[x0,z0+8],[x0+10,z0+8]]) fill(x,G,z,x,G+3,z,L);
    fill(x0-1,G+4,z0-1,x0+11,G+4,z0+9,byName('Oak slab')||P); fill(x0+3,G+1,z0,x0+4,G+2,z0,B.GLASS); fill(x0+6,G+1,z0,x0+7,G+2,z0,B.GLASS); fill(x0,G+1,z0+3,x0,G+2,z0+5,B.GLASS);
    const dr=byName('Oak door'); if(dr){ put(x0+5,G,z0+8,dr); put(x0+5,G+1,z0+8,dr+1); } else fill(x0+5,G,z0+8,x0+5,G+1,z0+8,B.AIR);
    put(x0+1,G,z0+1,B.TABLE); put(x0+2,G,z0+1,B.CRUCIBLE); chest(x0+3,G,z0+1,B.CHEST_WOOD,[[I.BREAD,16],[I.COOKIE,16],[GEN['iron:sword']],[GEN['iron:pick']]]);
    put(x0+9,G,z0+1,B.SHELF); put(x0+9,G+1,z0+1,B.SHELF); put(x0+8,G,z0+1,B.SHELF); put(x0+1,G,z0+7,B.JUKEBOX); put(x0+9,G,z0+7,B.TANNING);
    for(let x=x0+3;x<=x0+7;x++) for(let z=z0+3;z<=z0+5;z++) put(x,G,z,DYES.find(d=>d.k==='red').carpet); put(x0+5,G+3,z0+4,DYES.find(d=>d.k==='yellow').lantern);
    sign(x0+5,C-19,N,'HOME\nCrafting table, crucible,\nbookshelves, jukebox,\ntanning table, carpet'); }
  // C2–C3: railway
  { const x0=C+PX[2], z0=C-26; for(let x=x0;x<=x0+26;x++) put(x,G,z0,B.RAIL); chest(x0,G,z0-2,B.CHEST_WOOD,[[I.CART_WOOD,2]]);
    sign(x0+3,C-19,N,'RAILWAY\nTake a minecart from\nthe chest and tap a rail.\nPush off to ride'); }
  // C4–C5: mine cutaway, a lit stairway down past the ores
  { const x0=C+PX[4], z0=C-30, ores=[B.ORE_COAL,B.ORE_TIN,B.ORE_COPPER,B.ORE_IRON,B.ORE_GOLD,B.ORE_DIAMOND,B.ORE_TITANIUM,B.ORE_PLATINUM,B.ANDESITE,B.DEEPSLATE];
    for(let k=0;k<24;k++){ const y=G-1-k; fill(x0+k,y,z0,x0+k,y+3,z0+1,B.AIR); if(k%3===0) put(x0+k,y+1,z0+2,B.TORCH); put(x0+k,y+1,z0-1,ores[k%ores.length]); put(x0+k,y+2,z0+2,ores[(k+3)%ores.length]); }
    sign(x0+1,C-19,N,'MINE\nA stairway down past\nthe ores. Caves and\nravines in normal worlds'); }
  // C6–C7: colour wall
  { const x0=C+PX[6], z0=C-28; DYES.forEach((d,i)=>{ put(x0+(i%8)*3,G+Math.floor(i/8)*2,z0,d.woolB); put(x0+(i%8)*3+1,G+Math.floor(i/8)*2,z0,d.fglass); put(x0+(i%8)*3,G+Math.floor(i/8)*2+1,z0,d.woolB); put(x0+(i%8)*3+1,G+Math.floor(i/8)*2+1,z0,d.fglass); });
    sign(x0+6,C-19,N,'COLOURS\n16 wools and stained\nglass. Tinted light\nshines through glass'); }

  // creatures from the plots above
  for(const [k,x,z,o] of w.__mobs||[]){ spawnMob(k,x+.5,(o&&o.y)||G,z+.5,false); Object.assign(mobs[mobs.length-1],o||{}); }
  w.mobsInit=true; delete w.__mobs; X.techDirty();
}
{ const o=window.startWorld; window.startWorld=function(meta,save,preview){ o.apply(this,arguments); if(meta&&meta.gen==='show'&&!save&&!preview){ buildShowcase(world); if(meta.gameMode!=='creative'){ } } }; }
