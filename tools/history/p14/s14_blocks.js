
/* ---------- stage 14: Minecraft parity — more woods, stones, farming. Ids continue after every older block so old saves keep their blocks ---------- */
const hx3=c=>'#'+c.map(v=>Math.max(0,Math.min(255,v|0)).toString(16).padStart(2,'0')).join('');
Object.assign(PT,{STRIPPED:36,SMOOTH:37,POLISHED:38,TILES:39,FURROW:40,RIBS:41,MELON:42,CAKE:43,DEEP:44});
// 16×16 sprites (RGBA, row 0 at the top) for saplings, crops and tall plants. They are baked into the pattern array from id 64 up
const SPR={}, SPRD=[]; let _spr=64;
function spr(name,fn){ const d=new Uint8ClampedArray(1024), id=_spr++;
  const P=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>15||y>15||!c) return; const o=(y*16+x)*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=255; };
  const R=(a,b,k)=>hash2(a*7+id*13,b*11+(k||0)*5,id*101+(k||0));
  fn(P,R); SPR[name]=id; SPRD[id]=d; return id; }
const SAP={oak:['#4f9a2c','#3d7f22','round'],birch:['#7fae55','#669a3f','round'],spruce:['#2f5a36','#24482b','cone'],jungle:['#3aa61e','#2c8616','big'],dark:['#2f6e1e','#245a17','round'],
  acacia:['#7a9a2a','#5f7c1e','flat'],mangrove:['#5a9a2c','#467d22','prop'],cherry:['#f2a6c6','#e07fab','round'],pale:['#a7b0a2','#8c9688','round'],crimson:['#b5242a','#7d1a20','fungus'],warped:['#1f9e98','#147a75','fungus']};
for(const k in SAP){ const [l1,l2,shape]=SAP[k], a=hex(l1), b=hex(l2), stem=hex(k==='crimson'||k==='warped'?'#e3d4ad':'#6b4a2c');
  spr('sap_'+k,(P,R)=>{
    if(shape==='fungus'){ for(let y=8;y<16;y++){ P(7,y,stem); P(8,y,stem); } for(let y=3;y<10;y++) for(let x=2;x<14;x++){ const dx=(x-7.5)/6, dy=(y-9)/6; if(dx*dx+dy*dy<1&&y<9) P(x,y,R(x,y)>.75?b:a); } return; }
    if(shape==='prop'){ for(let y=0;y<4;y++) P(8,y,stem); for(let y=3;y<15;y++){ P(7,y,a); P(8,y,y>11?b:a); } for(let y=1;y<5;y++) for(let x=4;x<12;x++) if(R(x,y)>.5) P(x,y,a); return; }
    for(let y=10;y<16;y++){ P(7,y,stem); P(8,y,stem); }
    for(let y=0;y<12;y++) for(let x=1;x<15;x++){ const dx=x-7.5, dy=y-5.5; let ins;
      if(shape==='cone') ins=Math.abs(dx)<(y+1)*.55&&y<11; else if(shape==='flat') ins=(dy*dy)/5+(dx*dx)/40<1&&y>2; else if(shape==='big') ins=(dx*dx)/40+(dy*dy)/26<1; else ins=(dx*dx)/26+(dy*dy)/22<1;
      if(ins&&R(x,y)>.16) P(x,y,R(x+3,y)>.62?b:a); } }); }
{ const G1=hex('#4a9a2a'), G2=hex('#3a7e20'), GOLD=hex('#d8b24a'), GOLD2=hex('#b08a2a');
  for(let s=0;s<8;s++) spr('wheat'+s,(P,R)=>{ const h=2+Math.round(s*1.7), col=s<5?G1:s<7?hex('#a6b03e'):GOLD, dk=s<5?G2:s<7?hex('#8a922e'):GOLD2;
    for(const x0 of [1,4,7,10,13]){ const x=x0+(R(x0,s)>.5?1:0), hh=Math.max(1,h-(R(x0,1)*2|0)); for(let k=0;k<hh;k++) P(x,15-k,k%3===2?dk:col); if(hh>3){ P(x-1,15-hh+2,col); P(x+1,15-hh+3,col); }
      if(s===7) for(let k=0;k<3;k++){ P(x,15-hh-k,GOLD2); P(x+(k%2?1:-1),16-hh-k,GOLD); } } });
  const veg=(name,top)=>{ for(let s=0;s<4;s++) spr(name+s,(P,R)=>{ const h=2+s*2; for(const x0 of [2,7,12]){ const x=x0+(R(x0,s)>.5?1:0);
      for(let k=0;k<h;k++){ P(x,15-k,k%2?G2:G1); if(k>1&&k%2===0){ P(x-1,15-k,G1); P(x+1,14-k,G1); } }
      if(s===3) top(P,x); } }); };
  veg('carrots',(P,x)=>{ const o=hex('#e8821e'); P(x,15,o); P(x+1,15,o); P(x,14,hex('#f09a30')); });
  veg('potatoes',(P,x)=>{ P(x-1,15,hex('#c9a35a')); P(x,15,hex('#b88f48')); P(x+1,14,hex('#d8b46a')); });
  veg('beetroots',(P,x)=>{ const r=hex('#a0202e'); P(x,15,hex('#8a1a2a')); P(x+1,15,r); P(x,14,r); P(x,12,r); });
  for(let s=0;s<4;s++) spr('stem'+s,(P)=>{ const h=3+s*3, c=s<3?hex('#6aa03a'):hex('#9aa03a'); for(let k=0;k<h;k++){ P(7+(k%4===2?1:0),15-k,c); if(k%3===1) P(8+(k%2),15-k,c); } });
  spr('stem_att',(P)=>{ const c=hex('#8a7a3a'); for(let k=0;k<8;k++) P(7,15-k,c); for(let x=7;x<16;x++) P(x,8-((x-7)>>2),c); });
  for(let s=0;s<4;s++) spr('berry'+s,(P,R)=>{ const r=3+s*1.4; for(let y=0;y<16;y++)for(let x=0;x<16;x++){ const dx=(x-7.5)/(r+1), dy=(y-(15-r))/r; if(dx*dx+dy*dy<1&&R(x,y)>.2) P(x,y,R(x,y,2)>.6?hex('#2d5a2a'):hex('#3f7a35')); }
    if(s>=2) for(let i=0;i<(s===2?4:9);i++){ const x=3+(R(i,1)*10|0), y=15-(R(i,2)*r*1.6|0)-1; P(x,y,s===2?hex('#9fbf3a'):hex('#c8202a')); } });
  spr('cane',(P)=>{ const a=hex('#9ad46a'), b=hex('#6aa848'), c=hex('#86c25a'); for(const x of [3,8,12]) for(let y=0;y<16;y++){ const seg=(y+x)%5===0; P(x,y,seg?b:a); P(x+1,y,seg?b:c); } P(5,4,a); P(6,3,a); P(10,9,a); P(11,8,a); });
  const gr=(P,R,top,fern)=>{ for(let x=0;x<16;x++){ if(R(x,0)<.35) continue; const h=top?(R(x,1)*12|0)+2:16;
      for(let k=0;k<h;k++){ const v=185+(R(x,k)*60|0); P(x+(fern&&k%4===3?(x<8?-1:1):0),15-k,[v,v,v]); } } };
  spr('tall_lo',(P,R)=>gr(P,R,0,0)); spr('tall_hi',(P,R)=>gr(P,R,1,0)); spr('fern_lo',(P,R)=>gr(P,R,0,1)); spr('fern_hi',(P,R)=>gr(P,R,1,1)); }

// ---- six more woods: every derived block (slabs, stairs, doors, gates, fences, tables, chairs, trapdoors, drawers) comes from the same builders as the first five
WOODS[0].mc='oak'; WOODS[1].mc='birch'; WOODS[2].mc='spruce'; WOODS[3].mc='jungle'; WOODS[4].mc='dark_oak';
const NEW_WOODS=[
  {k:'acacia',name:'Acacia',mc:'acacia',bark:'#676157',core:'#b0603a',pl:'#ad5d32',lf:'#64a024',ftint:1},
  {k:'mangrove',name:'Mangrove',mc:'mangrove',bark:'#54433a',core:'#7a3d36',pl:'#773934',lf:'#5a9a2c',ftint:1},
  {k:'cherry',name:'Cherry',mc:'cherry',bark:'#3a2230',core:'#e4b6ae',pl:'#e2b2aa',lf:'#f0aacb'},
  {k:'pale',name:'Pale oak',mc:'pale_oak',bark:'#5f5752',core:'#e9e0dc',pl:'#e6dad3',lf:'#97a291'},
  {k:'crimson',name:'Crimson',mc:'crimson',bark:'#5d1c20',core:'#7d3a52',pl:'#6a344b',lf:'#8f1b1b',nether:1},
  {k:'warped',name:'Warped',mc:'warped',bark:'#3b2d45',core:'#3a8e8c',pl:'#2b6963',lf:'#178a8c',nether:1}];
for(const w of NEW_WOODS){ const K=w.k.toUpperCase();
  w.log=NB('LOG_'+K); w.leaves=NB('LEAVES_'+K); w.planks=NB('PLANKS_'+K);
  def(w.log,w.name+(w.nether?' stem':' log'),w.core,w.bark); pat(w.log,PT.RINGS,PT.BARK);
  if(w.nether){ def(w.leaves,w.k==='crimson'?'Nether wart block':'Warped wart block',w.lf,w.lf); pat(w.leaves,PT.WOOL); BLOCKS[w.leaves].wart=1; }
  else { def(w.leaves,w.name+' leaves',w.lf,w.lf,0,{lightOpaque:0,att:2,leaves:1,btint:w.ftint?'foliage':null}); pat(w.leaves,PT.LEAF); }
  def(w.planks,w.name+' planks',w.pl,w.pl); pat(w.planks,PT.PLANK);
  BLOCKS[w.log].log=1; BLOCKS[w.log].wood=w.k; BLOCKS[w.planks].wood=w.k; BLOCKS[w.planks].planks=1; BLOCKS[w.leaves].wood=w.k;
  WOODS.push(w);
  const sm={k:w.k,name:w.name,base:w.planks,pat:PT.PLANK,wood:w.k}; SHAPE_MATS.push(sm); mkShape(sm);
  const dm={k:w.k,name:w.name,col:w.pl,wood:1}; DOOR_MATS.push(dm); mkDoor(dm);
  const gm={k:w.k,name:w.name,col:w.pl,wood:1}; GATE_MATS.push(gm); mkGate(gm);
  mkFence(w); mkFurn(w);
  const tm={k:w.k,name:w.name,col:w.pl,wood:1}; TRAP_MATS.push(tm); mkTrap(tm); mkDrawer(w); }
// stripped logs, wood (bark on every face), stripped wood and saplings for all eleven woods
for(const w of WOODS){ const K=w.k.toUpperCase(), L=BLOCKS[w.log], P=BLOCKS[w.planks], stem=!!w.nether, lc=w.name.toLowerCase(), pale=hx3(sh3(P.top,.93));
  w.stripped=NB('STRIPPED_'+K); def(w.stripped,'Stripped '+lc+(stem?' stem':' log'),hx3(L.top),pale); pat(w.stripped,PT.RINGS,PT.STRIPPED);
  w.woodB=NB('WOOD_'+K); def(w.woodB,w.name+(stem?' hyphae':' wood'),hx3(L.side),hx3(L.side)); pat(w.woodB,w.k==='birch'?PT.BIRCH:PT.BARK);
  w.swood=NB('SWOOD_'+K); def(w.swood,'Stripped '+lc+(stem?' hyphae':' wood'),pale,pale); pat(w.swood,PT.STRIPPED);
  for(const id of [w.stripped,w.woodB,w.swood]) Object.assign(BLOCKS[id],{log:1,wood:w.k,logLike:1});
  w.sapling=NB('SAPLING_'+K); def(w.sapling,stem?w.name+' fungus':w.k==='mangrove'?'Mangrove propagule':w.name+' sapling',SAP[w.k][0],0,0,{solid:false,opaque:false,sapling:w.k,spr:SPR['sap_'+w.k],support:1});
  w.stripOf={[w.log]:w.stripped,[w.woodB]:w.swood}; }
// ---- stones: andesite, diorite, granite, tuff, calcite, deepslate and smooth stone, with polished and brick forms
const STONES=[];
const stone=(k,name,col,pt)=>{ const id=NB(k); def(id,name,col,hx3(sh3(hex(col),.95))); pat(id,pt); STONES.push({k,id,name}); return id; };
stone('ANDESITE','Andesite','#8a8b8c',PT.SPECK); stone('POLISHED_ANDESITE','Polished andesite','#8f9192',PT.POLISHED); stone('ANDESITE_BRICKS','Andesite bricks','#86888a',PT.SBRICK);
stone('DIORITE','Diorite','#c4c3c4',PT.SPECK); stone('POLISHED_DIORITE','Polished diorite','#c9c8ca',PT.POLISHED); stone('DIORITE_BRICKS','Diorite bricks','#bdbcbe',PT.SBRICK);
stone('GRANITE','Granite','#986a58',PT.SPECK); stone('POLISHED_GRANITE','Polished granite','#9c6c5a',PT.POLISHED); stone('GRANITE_BRICKS','Granite bricks','#926454',PT.SBRICK);
stone('TUFF','Tuff','#6d6e66',PT.STONE); stone('POLISHED_TUFF','Polished tuff','#646860',PT.POLISHED); stone('TUFF_BRICKS','Tuff bricks','#636659',PT.SBRICK);
stone('CALCITE','Calcite','#dcdcd8',PT.CLAY);
stone('DEEPSLATE','Deepslate','#55555b',PT.DEEP); stone('COBBLED_DEEPSLATE','Cobbled deepslate','#4f4f53',PT.COBBLE); stone('POLISHED_DEEPSLATE','Polished deepslate','#4a4a4e',PT.POLISHED);
stone('DEEPSLATE_BRICKS','Deepslate bricks','#47474b',PT.SBRICK); stone('DEEPSLATE_TILES','Deepslate tiles','#3c3c40',PT.TILES);
stone('SMOOTH_STONE','Smooth stone','#a2a3a4',PT.SMOOTH); stone('SMOOTH_STONE_BRICKS','Smooth stone bricks','#9c9d9f',PT.SBRICK);
for(const s of STONES) if(s.k!=='DEEPSLATE'&&s.k!=='CALCITE'){ const m={k:s.k.toLowerCase(),name:s.name.replace(/ bricks$/,' brick').replace(/ tiles$/,' tile'),base:s.id,pat:BLOCKS[s.id].ps}; SHAPE_MATS.push(m); mkShape(m); }
// ---- farming
NB('FARMLAND'); def(B.FARMLAND,'Farmland','#8a5a34','#8b5e3c','#8b5e3c',{farmland:1,drop:B.DIRT}); pat(B.FARMLAND,PT.FURROW,PT.DIRT);
NB('FARMLAND_WET'); def(B.FARMLAND_WET,'Farmland','#4f3320','#8b5e3c','#8b5e3c',{farmland:2,drop:B.DIRT,noItem:1}); pat(B.FARMLAND_WET,PT.FURROW,PT.DIRT);
const CROPS={};
const crop=(k,name,n,pre)=>{ const ids=[]; for(let s=0;s<n;s++){ const id=NB(k.toUpperCase()+'_'+s); def(id,name,'#4a9a2a',0,0,{solid:false,opaque:false,noItem:1,crop:k,age:s,maxAge:n-1,spr:SPR[pre+s],support:1}); ids.push(id); } CROPS[k]={ids}; return ids; };
crop('wheat','Wheat crops',8,'wheat'); crop('carrots','Carrots',4,'carrots'); crop('potatoes','Potatoes',4,'potatoes'); crop('beetroots','Beetroots',4,'beetroots');
for(const k of ['melon','pumpkin']){ const ids=[], nm=k==='melon'?'Melon':'Pumpkin';
  for(let s=0;s<4;s++){ const id=NB(k.toUpperCase()+'_STEM_'+s); def(id,nm+' stem','#6aa03a',0,0,{solid:false,opaque:false,noItem:1,crop:k+'_stem',age:s,maxAge:3,spr:SPR['stem'+s],support:1,stem:k}); ids.push(id); }
  const att=NB(k.toUpperCase()+'_STEM_ATT'); def(att,'Attached '+k+' stem','#8a7a3a',0,0,{solid:false,opaque:false,noItem:1,spr:SPR.stem_att,support:1,stem:k,attached:1}); CROPS[k+'_stem']={ids,att}; }
NB('MELON'); def(B.MELON,'Melon','#6f9a2a','#5f8f24',0,{fruit:'melon'}); pat(B.MELON,PT.CLAY,PT.MELON);
NB('PUMPKIN'); def(B.PUMPKIN,'Pumpkin','#c47a1c','#d0821e',0,{fruit:'pumpkin'}); pat(B.PUMPKIN,PT.CLAY,PT.RIBS);
NB('SUGAR_CANE'); def(B.SUGAR_CANE,'Sugar cane','#8ec462',0,0,{solid:false,opaque:false,spr:SPR.cane,cane:1,support:1});
const BERRY=[]; for(let s=0;s<4;s++){ const id=NB('BERRY_'+s); def(id,'Sweet berry bush','#3f7a35',0,0,{solid:false,opaque:false,noItem:1,spr:SPR['berry'+s],berry:s,support:1}); BERRY.push(id); }
const COCOA=[]; for(let fi=0;fi<4;fi++) for(let a=0;a<3;a++){ const id=NB('COCOA_'+fi+a); def(id,'Cocoa','#8a5a2a',0,0,{solid:false,opaque:false,noItem:1,cocoa:{f:FACE4[fi],fi,age:a}}); COCOA.push(id); }
const CAKE=[]; for(let k=0;k<7;k++){ const id=NB('CAKE_'+k); def(id,'Cake','#f4f0ea','#c89660',0,{opaque:false,lightOpaque:0,shape:1,decor:1,cake:k,noItem:k>0?1:0,support:1,boxes:[[(1+k*2)/16,0,1/16,15/16,.5,15/16]]}); pat(id,PT.CLAY); CAKE.push(id); }
NB('TALL_LO'); def(B.TALL_LO,'Tall grass','#62ad3f',0,0,{solid:false,opaque:false,replace:true,btint:'grass',spr:SPR.tall_lo,dbl:1,noItem:1});
NB('TALL_HI'); def(B.TALL_HI,'Tall grass','#62ad3f',0,0,{solid:false,opaque:false,replace:true,btint:'grass',spr:SPR.tall_hi,dbl:2,noItem:1});
NB('FERN_LO'); def(B.FERN_LO,'Large fern','#52a03c',0,0,{solid:false,opaque:false,replace:true,btint:'grass',spr:SPR.fern_lo,dbl:1,noItem:1});
NB('FERN_HI'); def(B.FERN_HI,'Large fern','#52a03c',0,0,{solid:false,opaque:false,replace:true,btint:'grass',spr:SPR.fern_hi,dbl:2,noItem:1});
BLOCKS[B.TALLGRASS].name='Short grass';
