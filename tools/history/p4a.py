F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

BLK=r'''
/* ---------- stage 4 building blocks: bricks, slabs, stairs, doors, gates, fences, furniture, wool, carpets, lanterns ---------- */
PT.CARPET=35;
const DYES=[['white','White','#f4f4f4','#e9ecec'],['orange','Orange','#f07c1c','#f07613'],['magenta','Magenta','#c74ebd','#bd44b3'],['light_blue','Light blue','#3ab3da','#3aafd9'],
  ['yellow','Yellow','#fed83d','#f8c527'],['lime','Lime','#80c71f','#70b919'],['pink','Pink','#f38baa','#ed8dac'],['gray','Gray','#474f52','#3e4447'],
  ['light_gray','Light gray','#9d9d97','#8e8e86'],['cyan','Cyan','#169c9c','#158991'],['purple','Purple','#8932b8','#792aac'],['blue','Blue','#3c44aa','#35399d'],
  ['brown','Brown','#835432','#724728'],['green','Green','#5e7c16','#546d1b'],['red','Red','#b02e26','#a12722'],['black','Black','#1d1d21','#141519']].map(([k,name,dye,wool])=>({k,name,dye,wool}));
const DYE_BY={}; DYES.forEach(d=>DYE_BY[d.k]=d);
// light from a dye colour: normalised to full strength and pushed towards saturation so coloured lanterns read clearly
const vivid=h=>{ const c=hex(h), m=Math.max(...c)||1; return c.map(v=>Math.max(1,Math.round(15*Math.pow(v/m,1.8)))); };
for(const d of DYES){
  d.woolB=NB('WOOL_'+d.k); def(d.woolB,d.name+' wool',d.wool); pat(d.woolB,PT.WOOL); BLOCKS[d.woolB].wool=d.k;
  d.carpet=NB('CARPET_'+d.k); def(d.carpet,d.name+' carpet',d.wool,d.wool,0,{opaque:false,lightOpaque:0,boxes:[[0,0,0,1,.0625,1]],shape:1,decor:1}); pat(d.carpet,PT.CARPET);
  d.lantern=NB('LANTERN_'+d.k); def(d.lantern,d.name+' lantern','#3b3b42','#3b3b42',0,{opaque:false,lightOpaque:0,emit:d.k==='white'?[15,15,14]:d.k==='black'?[6,4,10]:vivid(d.dye),lantern:hex(d.dye),boxes:[[.3,0,.3,.7,.62,.7]],decor:1});
}
BLOCKS[B.TORCH].emit=[13,11,7];
// metals (silver is new: lanterns, bricks and doors)
const METALS=[['tin','Tin','#cfd3d8'],['bronze','Bronze','#c48c4c'],['alu','Aluminium','#dfe5ea'],['gold','Gold','#f2c94a'],['iron','Iron','#cdc5ba'],['steel','Steel','#8e99a6'],
  ['titanium','Titanium','#a3b6cc'],['platinum','Platinum','#e6eef4'],['diamond','Diamond','#62e0dc'],['silver','Silver','#dfe4ec']].map(([k,name,col])=>({k,name,col}));
NB('ORE_SILVER'); oreDef(B.ORE_SILVER,'Silver ore','#eef2f8');
NB('STONE_BRICK'); def(B.STONE_BRICK,'Stone bricks','#8e9197','#868990'); pat(B.STONE_BRICK,PT.SBRICK);
NB('MOSSY_STONE_BRICK'); def(B.MOSSY_STONE_BRICK,'Mossy stone bricks','#878f82','#80887c'); pat(B.MOSSY_STONE_BRICK,PT.MSBRICK);
NB('CHISELED_STONE'); def(B.CHISELED_STONE,'Chiseled stone bricks','#93969c'); pat(B.CHISELED_STONE,PT.CHISEL);
for(const m of METALS){ m.brick=NB('MBRICK_'+m.k); const c=hex(m.col); def(m.brick,m.name+' bricks',m.col,'#'+sh3(c,.9).map(v=>v.toString(16).padStart(2,'0')).join('')); pat(m.brick,PT.METAL); BLOCKS[m.brick].metal=m.k; }
// shaped blocks: geometry is a list of cell-local boxes; collision uses the same list
const SLAB_O={d:[0,0,0,1,.5,1],u:[0,.5,0,1,1,1],n:[0,0,0,1,1,.5],s:[0,0,.5,1,1,1],w:[0,0,0,.5,1,1],e:[.5,0,0,1,1,1]}, SLAB_OPP={d:'u',u:'d',n:'s',s:'n',w:'e',e:'w'};
const SLAB_NORMAL={d:[0,1,0],u:[0,-1,0],n:[0,0,1],s:[0,0,-1],w:[1,0,0],e:[-1,0,0]};   // the open side of each slab
const SHAPE_MATS=[...WOODS.map(w=>({k:w.k,name:w.name,base:w.planks,pat:PT.PLANK,wood:w.k})),
  {k:'stone',name:'Stone',base:B.STONE,pat:PT.STONE},{k:'cobble',name:'Cobblestone',base:B.COBBLE,pat:PT.COBBLE},{k:'mossy',name:'Mossy cobblestone',base:B.MOSSY_COBBLE,pat:PT.MOSSY},
  {k:'sbrick',name:'Stone brick',base:B.STONE_BRICK,pat:PT.SBRICK},{k:'msbrick',name:'Mossy stone brick',base:B.MOSSY_STONE_BRICK,pat:PT.MSBRICK},{k:'brick',name:'Brick',base:B.BRICK,pat:PT.BRICK},
  {k:'sandstone',name:'Sandstone',base:B.SANDSTONE,pat:PT.SANDSTONE},{k:'redsandstone',name:'Red sandstone',base:B.RED_SANDSTONE,pat:PT.SANDSTONE},
  ...METALS.map(m=>({k:m.k,name:m.name+' brick',base:m.brick,pat:PT.METAL}))];
for(const m of SHAPE_MATS){ const bd0=BLOCKS[m.base];
  m.slab={}; for(const o of ['d','u','n','s','w','e']){ const id=NB('SLAB_'+m.k+'_'+o); m.slab[o]=id;
    def(id,m.name+' slab','#'+bd0.top.map(v=>v.toString(16).padStart(2,'0')).join(''),'#'+bd0.side.map(v=>v.toString(16).padStart(2,'0')).join(''),0,{opaque:false,lightOpaque:0,boxes:[SLAB_O[o]],shape:1,slab:{m,o},drop:0}); pat(id,m.pat); }
  m.stairs={}; for(const f of ['n','e','s','w']) for(const u of [0,1]){ const id=NB('STAIRS_'+m.k+'_'+f+u); m.stairs[f+u]=id; const lo=u?.5:0, hi=u?0:.5;
    const q={n:[0,hi,0,1,hi+.5,.5],e:[.5,hi,0,1,hi+.5,1],s:[0,hi,.5,1,hi+.5,1],w:[0,hi,0,.5,hi+.5,1]}[f];
    def(id,m.name+' stairs','#'+bd0.top.map(v=>v.toString(16).padStart(2,'0')).join(''),'#'+bd0.side.map(v=>v.toString(16).padStart(2,'0')).join(''),0,{opaque:false,lightOpaque:0,boxes:[[0,lo,0,1,lo+.5,1],q],shape:1,stairs:{m,f,u}}); pat(id,m.pat); }
  for(const o in m.slab) BLOCKS[m.slab[o]].drop=m.slab.d; for(const k in m.stairs) BLOCKS[m.stairs[k]].drop=m.stairs.n0;
  bd0.shapeMat=m;
}
// doors: 2 tall; id = base + facing*4 + open*2 + top
const DOOR_MATS=[...WOODS.map(w=>({k:w.k,name:w.name,col:'#'+BLOCKS[w.planks].top.map(v=>v.toString(16).padStart(2,'0')).join(''),wood:1})),...METALS.map(m=>({k:m.k,name:m.name,col:m.col,metal:1}))];
const FACE4=['n','e','s','w'], F4V={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
const DOOR_T=.1875;
function doorBox(f){ const t=DOOR_T; return {n:[0,0,0,1,1,t],s:[0,0,1-t,1,1,1],w:[0,0,0,t,1,1],e:[1-t,0,0,1,1,1]}[f]; }
const DOOR_OPEN_SIDE={n:'w',e:'n',s:'e',w:'s'};
for(const m of DOOR_MATS){ m.door=_nid;
  for(let fi=0;fi<4;fi++) for(const open of [0,1]) for(const top of [0,1]){ const id=NB('DOOR_'+m.k+'_'+fi+open+top), f=FACE4[fi];
    def(id,m.name+' door',m.col,m.col,0,{opaque:false,lightOpaque:0,boxes:[doorBox(open?DOOR_OPEN_SIDE[f]:f)],door:{m,f,fi,open,top},drop:m.door,decor:1}); pat(id,m.wood?PT.DOOR:PT.IRONDOOR); } }
// fence gates (woods and iron): id = base + axis*2 + open
const GATE_MATS=[...WOODS.map(w=>({k:w.k,name:w.name,col:'#'+BLOCKS[w.planks].top.map(v=>v.toString(16).padStart(2,'0')).join(''),wood:1})),{k:'iron',name:'Iron',col:'#cdc5ba',metal:1}];
for(const m of GATE_MATS){ m.gate=_nid; for(const ax of [0,1]) for(const open of [0,1]){ const id=NB('GATE_'+m.k+'_'+ax+open);
  def(id,m.name+' gate',m.col,m.col,0,{opaque:false,lightOpaque:0,solid:!open,fence:1,gate:{m,ax,open},boxes:[ax?[.375,0,0,.625,1,1]:[0,0,.375,1,1,.625]],drop:m.gate,decor:1}); pat(id,m.wood?PT.PLANK:PT.NONE); } }
// fences for every wood (oak keeps its original id) and iron bars
const FENCE_OF={oak:B.FENCE}; BLOCKS[B.FENCE].name='Oak fence'; BLOCKS[B.FENCE].top=BLOCKS[B.PLANKS].top; BLOCKS[B.FENCE].side=BLOCKS[B.PLANKS].side;
for(const w of WOODS.slice(1)){ const id=NB('FENCE_'+w.k); FENCE_OF[w.k]=id; def(id,w.name+' fence','#000000',0,0,{opaque:false,fence:1}); BLOCKS[id].top=BLOCKS[w.planks].top; BLOCKS[id].side=BLOCKS[w.planks].side; }
NB('IRON_BARS'); def(B.IRON_BARS,'Iron bars','#b8b2aa','#a49e96',0,{opaque:false,lightOpaque:0,fence:1,bars:1});
// furniture: tables and chairs for every wood
const FURN={};
for(const w of WOODS){ const c='#'+BLOCKS[w.planks].top.map(v=>v.toString(16).padStart(2,'0')).join(''); const tb=NB('TABLE_'+w.k);
  def(tb,w.name+' table',c,c,0,{opaque:false,lightOpaque:0,shape:1,decor:1,boxes:[[0,.8125,0,1,1,1],[.42,0,.42,.58,.8125,.58]],
    rboxes:[[0,.8125,0,1,1,1],[.06,0,.06,.19,.8125,.19],[.81,0,.06,.94,.8125,.19],[.06,0,.81,.19,.8125,.94],[.81,0,.81,.94,.8125,.94]]}); pat(tb,PT.PLANK);
  FURN[w.k]={table:tb,chair:_nid};
  for(let fi=0;fi<4;fi++){ const f=FACE4[fi], id=NB('CHAIR_'+w.k+'_'+fi);
    // the back sits opposite the way the sitter faces
    const back={n:[.12,.56,.8,.88,1.2,.9],s:[.12,.56,.1,.88,1.2,.2],e:[.1,.56,.12,.2,1.2,.88],w:[.8,.56,.12,.9,1.2,.88]}[f];
    def(id,w.name+' chair',c,c,0,{opaque:false,lightOpaque:0,shape:1,decor:1,chair:{fi,f},drop:FURN[w.k].chair,boxes:[[.12,0,.12,.88,.56,.88],back],
      rboxes:[[.12,.46,.12,.88,.56,.88],[.14,0,.14,.24,.46,.24],[.76,0,.14,.86,.46,.24],[.14,0,.76,.24,.46,.86],[.76,0,.76,.86,.46,.86],back]}); pat(id,PT.PLANK); }
}
'''
rep("pat([B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN],PT.CORAL);\n",
    "pat([B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN],PT.CORAL);\n"+BLK)
# sh3 must exist before block defs use it
rep("const isGlass=b=>b>0&&!!BLOCKS[b].tint&&!BLOCKS[b].wl;\nconst isLiquid=b=>b===B.WATER||b===B.FALL;\nconst sh3=(c,k)=>[Math.min(255,c[0]*k)|0,Math.min(255,c[1]*k)|0,Math.min(255,c[2]*k)|0];",
    "const isGlass=b=>b>0&&!!BLOCKS[b].tint&&!BLOCKS[b].wl;\nconst isLiquid=b=>b===B.WATER||b===B.FALL;")
rep("let _nid=4096; const NB=k=>(B[k]=_nid++);","let _nid=4096; const NB=k=>(B[k]=_nid++);\nconst sh3=(c,k)=>[Math.min(255,c[0]*k)|0,Math.min(255,c[1]*k)|0,Math.min(255,c[2]*k)|0];")

# ---------- mesher: generic shapes, fences of every wood, iron bars, gates, doors, lanterns ----------
rep("""    if(b===B.FENCE){ setVLcell(x,y,z); const c=bd.top; PAT=PT.PLANK; emitBox(vbO,[wx+.38,y,wz+.38],[wx+.62,y+1,wz+.62],c,IDT);
      for(const [dx,dz] of DIRS){ const nb=at(x+dx,y,z+dz); if(nb!==B.FENCE&&!BLOCKS[nb].opaque) continue;""",
"""    if(bd.shape&&!bd.door){ setVLcell(x,y,z); PAT=bd.ps|0; const c=bd.side;
      for(const q of bd.rboxes||bd.boxes) emitBox(vbO,[wx+q[0],y+q[1],wz+q[2]],[wx+q[3],y+q[4],wz+q[5]],q===bd.boxes[0]&&bd.slab?bd.top:c,IDT); continue; }
    if(bd.door){ setVLcell(x,y,z); PAT=bd.ps|0; const q=bd.boxes[0], c=bd.side; emitBox(vbO,[wx+q[0],y+q[1],wz+q[2]],[wx+q[3],y+q[4],wz+q[5]],c,IDT); PAT=0;
      if(!bd.door.top){ const th=q[3]-q[0]<.5, hx=th?(q[0]<.1?q[3]:q[0]):.8, hz=th?.2:(q[2]<.1?q[5]:q[2]);
        const hb=th?[[hx-(q[0]<.1?0:.06),y+.85,wz+.15],[hx+(q[0]<.1?.06:0),y+.97,wz+.25]]:[[wx+.75,y+.85,hz-(q[2]<.1?0:.06)],[wx+.85,y+.97,hz+(q[2]<.1?.06:0)]];
        if(th){ hb[0][0]+=wx; hb[1][0]+=wx; } else { hb[0][2]+=wz; hb[1][2]+=wz; }
        emitBox(vbO,hb[0],hb[1],bd.door.m.wood?[60,52,40]:[70,74,80],IDT); }
      continue; }
    if(bd.lantern){ setVLcell(x,y,z); const hang=at(x,y-1,z)===B.AIR&&at(x,y+1,z)>0&&BLOCKS[at(x,y+1,z)].solid, oy=hang?.3:0, d=[50,50,56];
      emitBox(vbO,[wx+.3,y+oy,wz+.3],[wx+.7,y+oy+.08,wz+.7],d,IDT); emitBox(vbO,[wx+.33,y+oy+.46,wz+.33],[wx+.67,y+oy+.54,wz+.67],d,IDT); emitBox(vbO,[wx+.42,y+oy+.54,wz+.42],[wx+.58,y+oy+.62,wz+.58],d,IDT);
      for(const [a,c2] of [[.3,.3],[.62,.3],[.3,.62],[.62,.62]]) emitBox(vbO,[wx+a,y+oy+.08,wz+c2],[wx+a+.08,y+oy+.46,wz+c2+.08],d,IDT);
      if(hang) emitBox(vbO,[wx+.47,y+oy+.62,wz+.47],[wx+.53,y+1,wz+.53],[90,90,96],IDT);
      setVL(VL_EMISSIVE); emitBox(vbO,[wx+.34,y+oy+.08,wz+.34],[wx+.66,y+oy+.46,wz+.66],bd.lantern.map(v=>Math.min(255,v*.6+110|0)),IDT); continue; }
    if(bd.gate){ setVLcell(x,y,z); const c=bd.top, g=bd.gate, iron=g.m.metal; PAT=bd.ps|0;
      const P=(u0,y0,v0,u1,y1,v1)=>g.ax?emitBox(vbO,[wx+v0,y+y0,wz+u0],[wx+v1,y+y1,wz+u1],c,IDT):emitBox(vbO,[wx+u0,y+y0,wz+v0],[wx+u1,y+y1,wz+v1],c,IDT);
      P(0,0,.42,.14,1,.58); P(.86,0,.42,1,1,.58);
      if(!g.open){ for(const h of [.3,.72]) P(.14,h,.44,.86,h+.14,.56); for(const u of iron?[.28,.42,.58,.72]:[.44]) P(u,.3,.45,u+(iron?.04:.12),.86,.55); }
      else for(const [u0,u1] of [[0,.14],[.86,1]]) for(const h of [.3,.72]) P(u0+.02,h,.58,u1-.02,h+.14,.98);
      continue; }
    if(bd.bars){ setVLcell(x,y,z); const c=bd.top; emitBox(vbO,[wx+.44,y,wz+.44],[wx+.56,y+1,wz+.56],c,IDT);
      for(const [dx,dz] of DIRS){ const nb=at(x+dx,y,z+dz); if(!(nb>0&&(BLOCKS[nb].fence||BLOCKS[nb].opaque))) continue;
        const a=[dx<0?wx:dx>0?wx+.56:wx+.46, dz<0?wz:dz>0?wz+.56:wz+.46], e=[dx<0?wx+.44:dx>0?wx+1:wx+.54, dz<0?wz+.44:dz>0?wz+1:wz+.54];
        emitBox(vbO,[a[0],y,a[1]],[e[0],y+1,e[1]],sh3(c,.92),IDT); }
      continue; }
    if(bd.fence){ setVLcell(x,y,z); const c=bd.top; PAT=PT.PLANK; emitBox(vbO,[wx+.38,y,wz+.38],[wx+.62,y+1,wz+.62],c,IDT);
      for(const [dx,dz] of DIRS){ const nb=at(x+dx,y,z+dz); if(!(nb>0&&(BLOCKS[nb].fence||BLOCKS[nb].opaque))) continue;""")
rep("""        for(const h of [.32,.7]) emitBox(vbO,[a[0],y+h,a[1]],[e[0],y+h+.13,e[1]],[150,108,64],IDT); }""",
    """        for(const h of [.32,.7]) emitBox(vbO,[a[0],y+h,a[1]],[e[0],y+h+.13,e[1]],sh3(c,.86),IDT); }""")
open(F,'w').write(s)
print('ok')
