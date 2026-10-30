import re,sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'
s=open(F).read()
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
def wrap(header,fname,var):
    """turn `for(const v of LIST){ BODY }` into a named builder so new woods/materials can reuse it"""
    global s
    i=s.index(header); j=i+header.index('{')
    assert s[j]=='{'
    d=0; k=j
    while True:
        c=s[k]
        if c=='{': d+=1
        elif c=='}':
            d-=1
            if d==0: break
        k+=1
    body=s[j+1:k]
    loop=header[:header.index('{')].strip()
    s=s[:i]+'function %s(%s){%s}\n%s %s(%s);'%(fname,var,body,loop,fname,var)+s[k+1:]
blk=lambda n: open(SP+n).read()

# ---- E1 builders
wrap("for(const m of SHAPE_MATS){",'mkShape','m')
wrap("for(const m of DOOR_MATS){ m.door=_nid;",'mkDoor','m')
wrap("for(const m of GATE_MATS){ m.gate=_nid;",'mkGate','m')
wrap("for(const w of WOODS.slice(1)){ const id=NB('FENCE_'+w.k);",'mkFence','w')
wrap("for(const w of WOODS){ const c='#'+BLOCKS[w.planks].top.map(v=>v.toString(16).padStart(2,'0')).join(''); const tb=NB('TABLE_'+w.k);",'mkFurn','w')
wrap("for(const m of TRAP_MATS){ m.trap=_nid;",'mkTrap','m')
wrap("for(const w of WOODS){ const c=BLOCKS[w.planks]; w.drawer=_nid;",'mkDrawer','w')

# ---- E2 new blocks after the last old block
a="NB('FIRE'); def(B.FIRE,'Fire','#ff8a1e',0,0,{solid:false,opaque:false,lightOpaque:0,emit:[15,10,4],noItem:1,replace:true,fire:1});"
R(a,a+'\n'+blk('s14_blocks.js')+'\n'+blk('s14_trees.js'))

# ---- E24 biome extras for new worlds
i=s.index("biome('snowy_peaks'"); j=s.index('\n',i)
s=s[:j+1]+"""{ const T3=(k,extra)=>{ const b=BIO[BI[k]]; if(b) b.trees3=[...(b.trees||[]),...extra]; };
  T3('plains',[['acacia',.0012]]); T3('flower_plains',[['cherry',.004]]); T3('forest',[['giantOak',.0007]]); T3('flower_forest',[['cherry',.014]]); T3('birch_forest',[['giantBirch',.003]]);
  T3('dark_forest',[['paleOak',.004]]); T3('swamp',[['mangrove',.01]]); T3('jungle',[['megaJungle',.006]]); T3('badlands',[['acacia',.0015]]); T3('mountains',[['cherry',.003]]); }
"""+s[j+1:]

# ---- E8 generator
R("for(const [k,d] of bd.trees){ acc+=d; if(r<acc){ kind=k; break; } }","for(const [k,d] of (this.v3&&bd.trees3||bd.trees)){ acc+=d; if(r<acc){ kind=k; break; } }")
R("const big=kind==='megaSpruce'||kind==='megaJungle'||kind==='dark';","const big=BIG_TREES.has(kind);")
R("    switch(kind){\n      case 'oak': case 'birch':","    if(EXTRA_TREE[kind]){ EXTRA_TREE[kind]({L,F,blob,R,lx,y,lz,wx,wz,H,seed,put}); return; }\n    switch(kind){\n      case 'oak': case 'birch':")
R("        for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG_JUNGLE);\n        for(const [dx,dz] of DIRS) if(hash2(wx+dx,wz+dz,seed+73)<.5)",
  "        for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG_JUNGLE);\n        if(this.v3) for(let k=0;k<2;k++) if(R(20+k)<.45){ const fi=(R(22+k)*4)|0, v=F4V[FACE4[fi]]; F(lx-v[0],y+1+((R(24+k)*3)|0),lz-v[1],COCOA[fi*3+((R(26+k)*3)|0)]); }\n        for(const [dx,dz] of DIRS) if(hash2(wx+dx,wz+dz,seed+73)<.5)")
R("    for(let v=0;v<2;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=2+(orng()*6|0);","""    if(this.v3){   // stage 14: stone blobs, a deepslate floor, sugar cane, tall grass, berries, pumpkins and melons
      for(const [id,y0,y1,nv] of [[B.ANDESITE,4,52,2.2],[B.DIORITE,4,52,2],[B.GRANITE,4,52,2],[B.TUFF,2,18,1.2],[B.CALCITE,20,50,.25]])
        for(let v=0,nn=Math.floor(nv)+(orng()<nv%1?1:0);v<nn;v++){ const cx=orng()*CS, cy=y0+orng()*(y1-y0), cz=orng()*CS, r=1.6+orng()*1.8;
          for(let dy=-3;dy<=3;dy++)for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){ if(dx*dx+dy*dy*1.4+dz*dz>r*r) continue; const X=(cx+dx)|0, Y=(cy+dy)|0, Z=(cz+dz)|0; if(X<0||Z<0||X>=CS||Z>=CS||Y<1||Y>=H) continue; const i=idx(X,Y,Z); if(b[i]===B.STONE) b[i]=id; } }
      for(let y=1;y<9;y++) for(let z=0;z<CS;z++) for(let x=0;x<CS;x++){ const i=idx(x,y,z); if(b[i]===B.STONE&&(y<6||hash2(x0+x,z0+z,seed+y)<(9-y)/4)) b[i]=B.DEEPSLATE; }
      for(let lz=0;lz<CS;lz++)for(let lx=0;lx<CS;lx++){ const wx=x0+lx, wz=z0+lz; if(wx>=size||wz>=size) continue; const h=H_(lx,lz); if(h<SEA||h+3>=H) continue;
        const bd=BIO[bm[(lz+M)*E+lx+M]], tp=b[idx(lx,h,lz)], ab=b[idx(lx,h+1,lz)], r=hash2(wx,wz,seed+141);
        if(h===SEA&&ab===B.AIR&&(tp===B.SAND||tp===B.GRASS||tp===B.DIRT)&&r<.14){ let wet=false; for(const [dx,dz] of DIRS){ const n=H_(lx+dx,lz+dz); if(n>=0&&n<SEA) wet=true; }
          if(wet){ const n=1+(hash2(wx,wz,seed+142)*3|0); for(let k=1;k<=n;k++) set(lx,h+k,lz,B.SUGAR_CANE); continue; } }
        if(tp!==B.GRASS&&tp!==B.PODZOL) continue;
        if((ab===B.TALLGRASS||ab===B.FERN)&&r<.2&&b[idx(lx,h+2,lz)]===B.AIR){ const lo=ab===B.FERN?B.FERN_LO:B.TALL_LO; set(lx,h+1,lz,lo); set(lx,h+2,lz,lo+1); continue; }
        if(ab!==B.AIR) continue; const k=bd.k;
        if((k==='taiga'||k==='mega_taiga'||k==='snowy_taiga')&&r<.012) set(lx,h+1,lz,BERRY[3]);
        else if((k==='plains'||k==='taiga'||k==='mega_taiga'||k==='forest')&&r>.9982) set(lx,h+1,lz,B.PUMPKIN);
        else if((k==='jungle'||k==='jungle_edge')&&r>.996) set(lx,h+1,lz,B.MELON); } }
    for(let v=0;v<2;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=2+(orng()*6|0);""")
R("    this.chunks=new Map();\n    this.edits=new Map();","    this.gen.v3=!!meta.mc;\n    this.chunks=new Map();\n    this.edits=new Map();")
R("height:64,gen:2,gameMode:pickedGM,","height:64,gen:2,mc:1,gameMode:pickedGM,")

# ---- E4 shaders
R("layout(location=3) in vec4 aBlk;","layout(location=3) in vec4 aBlk; layout(location=4) in uint aBid;")
R("out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; out vec3 vV; out float vS; flat out int vP;","out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; out vec3 vV; out float vS; flat out int vP; flat out uint vBid;")
R("vP=int(aBlk.a*255.+.5);","vP=int(aBlk.a*255.+.5); vBid=aBid;")
R("in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; in vec3 vV; in float vS; flat in int vP;","in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; in vec3 vV; in float vS; flat in int vP; flat in uint vBid;\nuniform highp sampler2DArray uPack; uniform highp usampler2D uSlot; uniform int uPackOn;")
R("  if(vP>0&&vP<20||vP>21){\n    bool top=abs(nrm.y)>.5;","""  bool pk=false;
  if(uPackOn>0&&vBid>0u){ int s=int(vBid); ivec2 c=ivec2(s&127,(s>>7)*2); uvec4 A=texelFetch(uSlot,c,0);
    bool tp=nrm.y>.5, bt=nrm.y<-.5; uint lay=tp?A.y:bt?A.z:A.x;
    if(lay>0u){ uvec4 Fm=texelFetch(uSlot,c+ivec2(0,1),0); uint fr=tp?Fm.y:bt?Fm.z:Fm.x; uint fl=(A.w>>(tp?4u:bt?8u:0u))&15u;
      vec2 uv=(tp||bt)?vW.xz:(abs(nrm.x)>abs(nrm.z)+.01?vec2(vW.z,-vW.y):vec2(vW.x,-vW.y));
      float Ly=float(lay)-1.; if(fr>1u) Ly+=mod(floor(uTime*20./max(1.,float(Fm.w))),float(fr));
      vec4 t=textureGrad(uPack,vec3(fract(uv),Ly),dFdx(uv),dFdy(uv));
      if(t.a<.5&&(fl&2u)==0u){ if((fl&4u)!=0u) t.rgb*=.55; else discard; }
      alb=(fl&1u)!=0u?t.rgb*vAlb*((fl&4u)!=0u?1.65:(fl&2u)!=0u?1.0:1.2):t.rgb*vS; pk=true; } }
  if(pk){}
  else if(vP>=64){ vec2 uv=vec2(abs(nrm.x)>abs(nrm.z)+.01?vW.z:vW.x,vW.y); vec4 t=texelFetch(uPat,ivec3(int(fract(uv.x)*16.),15-min(15,int(fract(uv.y)*16.)),vP*4),0); if(t.a<.5) discard; alb=t.rgb*vAlb*1.12; }
  else if(vP>0&&vP<20||vP>21){
    bool top=abs(nrm.y)>.5;""")

# ---- E3 patterns
R("const NPAT=40, NVAR=4;","const NPAT=128, NVAR=4;")
R("  for(let id=1;id<NPAT;id++) for(let v=0;v<NVAR;v++){\n","  for(let id=1;id<NPAT;id++) for(let v=0;v<NVAR;v++){\n    if(id>=64){ const sd=SPRD[id]; if(sd) data.set(sd,(id*NVAR+v)*1024); continue; }\n")
a="        case 35: { m=.92+.1*r; if(py%5===0||(px+(py/5|0)*3)%7===0) m*=.8; break; }"
R(a,a+"""
        case 36: { m=.9+.08*R(px,py>>3,13)+.04*r; if((px+((py>>2)%2))%4===0) m*=.86; break; }   // stripped log grain
        case 37: { m=.97+.04*r; if(px===0||py===0||px===15||py===15) m=.84; break; }                // smooth stone
        case 38: { m=.95+.05*r; if(px===0||py===0) m=1.1; else if(px===15||py===15) m=.8; break; }  // polished stone
        case 39: { m=.9+.12*R(px>>3,py>>3,14)+.04*r; if(px%8===0||py%8===0) m=.62; break; }          // tiles
        case 40: { m=.86+.18*r; if(py%4===0) m*=.68; break; }                                         // farmland furrows
        case 41: { m=.93+.08*r; if(px%4===0) m*=.76; else if(px%4===1) m*=1.06; break; }               // pumpkin ribs
        case 42: { m=.92+.08*r; if((px+(py>>2))%5<2) m*=.72; break; }                                 // melon stripes
        case 43: { m=.95+.05*r; if(py<4){ a=1; pc=3; } break; }                                        // cake
        case 44: { m=.84+.14*R(px>>2,py,15)+.06*r; if(py%3===0) m*=.86; break; }                       // deepslate""")

# ---- E5 vertex format
R("const STRIDE=24;","const STRIDE=28;")
R("  gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.UNSIGNED_BYTE,true,STRIDE,20);\n","  gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.UNSIGNED_BYTE,true,STRIDE,20);\n  gl.enableVertexAttribArray(4);gl.vertexAttribIPointer(4,1,gl.UNSIGNED_SHORT,STRIDE,24);\n")
R("let PAT=0;   // texture pattern for the vertices being written (see PT)","let PAT=0, CB=0;   // texture pattern and block id (for resource packs) of the vertices being written")
R("this.f=new Float32Array(nb);this.u=new Uint8Array(nb);}","this.f=new Float32Array(nb);this.u=new Uint8Array(nb);this.s=new Uint16Array(nb);}")
R("v(x,y,z,r,g,b,l){const o=this.n*6;","v(x,y,z,r,g,b,l){const o=this.n*7;")
R("u[ob+8]=VL[4];u[ob+9]=VL[5];u[ob+10]=VL[6];u[ob+11]=PAT;this.n++;}","u[ob+8]=VL[4];u[ob+9]=VL[5];u[ob+10]=VL[6];u[ob+11]=PAT;this.s[o*2+12]=CB;this.n++;}")

# ---- E6 mesher
R("    const bd=BLOCKS[b], wx=x0+x, wz=z0+z; PAT=0;\n","    const bd=BLOCKS[b], wx=x0+x, wz=z0+z; PAT=0; CB=b;\n")
R("    if(bd.plant){ setVLcell(x,y,z); emitPlant(vbL,wx,y,wz,bd,jit,tc); continue; }","""    if(PACK.on&&PACK.x[b]||bd.spr){ setVLcell(x,y,z); emitSprite(vbL,wx,y,wz,b,bd,tc||(bio&&bio.grass)); continue; }
    if(bd.cocoa){ setVLcell(x,y,z); const c=bd.cocoa, s2=[4,6,8][c.age]/16, h2=[5,7,9][c.age]/16, v=F4V[c.f], off=.5-s2/2-.0625, cx=wx+.5+v[0]*off, cz=wz+.5+v[1]*off; PAT=PT.CLAY;
      emitBox(vbO,[cx-s2/2,y+.75-h2,cz-s2/2],[cx+s2/2,y+.75,cz+s2/2],[[106,138,42],[160,110,50],[138,74,32]][c.age],IDT); continue; }
    if(bd.cake!==undefined){ setVLcell(x,y,z); const xa=wx+(1+bd.cake*2)/16; PAT=PT.CLAY; emitBox(vbO,[xa,y,wz+.0625],[wx+.9375,y+.375,wz+.9375],[200,150,96],IDT); emitBox(vbO,[xa,y+.375,wz+.0625],[wx+.9375,y+.5,wz+.9375],[246,242,236],IDT); continue; }
    if(bd.plant){ setVLcell(x,y,z); emitPlant(vbL,wx,y,wz,bd,jit,tc); continue; }""")
R("      if(bd.ore){ // ore specks on each visible face","      if(bd.ore&&!(PACK.on&&PACK.has[b])){ // ore specks on each visible face")
R("function quadRaw(vb,q,col,shade){","""function emitSprite(vb,x,y,z,b,bd,tg){ const pk=PACK.on&&PACK.has[b]; PAT=pk?0:(bd.spr|0);
  const c=(bd.btint||pk&&PACK.tint[b])?(bd.stem?[150,196,80]:tg||[121,192,90]):[255,255,255], e=.003, lo=190, hi=255; vb.need(8);
  for(const [ax,az,bx,bz] of [[x+e,z+e,x+1-e,z+1-e],[x+1-e,z+e,x+e,z+1-e]]){ vb.v(ax,y+e,az,c[0],c[1],c[2],lo); vb.v(bx,y+e,bz,c[0],c[1],c[2],lo); vb.v(bx,y+1-e,bz,c[0],c[1],c[2],hi); vb.v(ax,y+1-e,az,c[0],c[1],c[2],hi); } }
function quadRaw(vb,q,col,shade){""")
# ---- E7 other meshes carry no block id
R("function buildDynamic(){ PAT=0;","function buildDynamic(){ PAT=0; CB=0;")
R("function buildCracks(){ crVB.n=0; PAT=0;","function buildCracks(){ crVB.n=0; PAT=0; CB=0;")
R("function buildViewModel(){ PAT=0;","function buildViewModel(){ PAT=0; CB=0;")
R("  lnVB.n=0; PAT=0;","  lnVB.n=0; PAT=0; CB=0;")

# ---- E10 items, hoes
a="for(const sl of SLIMES){ sl.jelly=NI('JELLY_'+sl.k.toUpperCase(),sl.d.name+' slime jelly',{jelly:sl.d.dye}); }"
R(a,a+'\n'+blk('s14_items.js'))
R("  {k:'arrow',name:'arrow',arrow:1,pat:['X','S','F'],n:8,dm:1,cat:'weapons'},\n];","  {k:'arrow',name:'arrow',arrow:1,pat:['X','S','F'],n:8,dm:1,cat:'weapons'},\n  {k:'hoe',name:'hoe',tool:'hoe',pat:['XX','.S','.S'],dm:.4,cat:'tools'},\n];")
# ---- E11 icons
R("function itemIconCanvas(id){\n  const it=ITEMS[id];\n","function itemIconCanvas(id){\n  const it=ITEMS[id];\n  { const pk=packIcon(id); if(pk) return pk; if(ICON_SPR[id]) return sprIcon(ICON_SPR[id]); const bx=it&&it.block&&BLOCKS[it.block]; if(bx&&bx.spr) return sprIcon(SPRD[bx.spr]); }\n")
R("    case 'hookshot': line(14,48,30,32,7,WOOD);","    case 'hoe': line(14,48,40,22,6,WOOD); poly([30,14,46,10,50,16,40,22],H); poly([46,10,50,16,53,13,49,7],HD); break;\n    case 'hookshot': line(14,48,30,32,7,WOOD);")
R("    case 'hookshot': return [[[-.03,0,-.03],[.03,.25,.03],W],[[-.06,.25,-.06],[.06,.36,.06],H]];","    case 'hookshot': return [[[-.03,0,-.03],[.03,.25,.03],W],[[-.06,.25,-.06],[.06,.36,.06],H]];\n    case 'hoe': return [[[-.025,0,-.025],[.025,.62,.025],W],[[-.03,.56,-.03],[.16,.64,.03],H]];")

# ---- E12 recipes, smelting, fuel, mining
a="for(const w of WOODS.slice().reverse()) RECIPES.unshift({out:w.planks,n:4,pat:['L'],keys:{L:[w.log]},cat:'blocks'});"
R(a,a+"""
// stage 14 recipes
ITEMS[I.SEEDS].name='Wheat seeds'; ITEMS[I.SEEDS].plants='wheat';
for(const w of WOODS){ RECIPES.push({out:w.planks,n:4,pat:['L'],keys:{L:[w.stripped,w.woodB,w.swood]},cat:'blocks'}); r_(w.woodB,3,['xx','xx'],{keys:{x:[w.log]},cat:'blocks'}); r_(w.swood,3,['xx','xx'],{keys:{x:[w.stripped]},cat:'blocks'}); }
ALL_LOGS.push(...WOODS.flatMap(w=>[w.stripped,w.woodB,w.swood]));
r_(I.BREAD,1,['xxx'],{keys:{x:[I.WHEAT]},cat:'items'}); r_(I.SUGAR,1,['x'],{keys:{x:[B.SUGAR_CANE]},cat:'items'});
r_(CAKE[0],1,['mmm','sgs','xxx'],{keys:{m:[I.MILK],s:[I.SUGAR],g:[I.EGG],x:[I.WHEAT]},cat:'items'});
r_(I.COOKIE,8,['xkx'],{keys:{x:[I.WHEAT],k:[I.COCOA_BEANS]},cat:'items'}); r_(I.PUMPKIN_PIE,1,['usg'],{keys:{u:[B.PUMPKIN],s:[I.SUGAR],g:[I.EGG]},cat:'items'});
r_(I.MUSH_STEW,1,['qv','o.'],{keys:{q:[B.MUSH_R],v:[B.MUSH_BR],o:[I.BOWL]},cat:'items'}); r_(I.BEET_SOUP,1,['zzz','zzz','.o.'],{keys:{z:[I.BEETROOT],o:[I.BOWL]},cat:'items'});
r_(B.MELON,1,['nnn','nnn','nnn'],{keys:{n:[I.MELON_SLICE]},cat:'blocks'}); r_(I.MELON_SEEDS,1,['n'],{keys:{n:[I.MELON_SLICE]},cat:'items'}); r_(I.PUMPKIN_SEEDS,4,['u'],{keys:{u:[B.PUMPKIN]},cat:'items'});
r_(I.BONE_MEAL,3,['y'],{keys:{y:[I.BONE]},cat:'items'}); r_(DYE_BY.white.item,1,['y'],{keys:{y:[I.BONE_MEAL]},cat:'items'});
for(const [a,b,c] of [[B.ANDESITE,B.POLISHED_ANDESITE,B.ANDESITE_BRICKS],[B.DIORITE,B.POLISHED_DIORITE,B.DIORITE_BRICKS],[B.GRANITE,B.POLISHED_GRANITE,B.GRANITE_BRICKS],[B.TUFF,B.POLISHED_TUFF,B.TUFF_BRICKS],[B.COBBLED_DEEPSLATE,B.POLISHED_DEEPSLATE,B.DEEPSLATE_BRICKS]]){
  r_(b,4,['xx','xx'],{keys:{x:[a]},cat:'blocks'}); r_(c,4,['xx','xx'],{keys:{x:[b]},cat:'blocks'}); }
r_(B.DEEPSLATE_TILES,4,['xx','xx'],{keys:{x:[B.DEEPSLATE_BRICKS]},cat:'blocks'}); r_(B.SMOOTH_STONE_BRICKS,4,['xx','xx'],{keys:{x:[B.SMOOTH_STONE]},cat:'blocks'});
r_(B.ANDESITE,2,['dc'],{keys:{d:[B.DIORITE],c:[B.COBBLE]},cat:'blocks'}); r_(B.DIORITE,2,['ck','kc'],{keys:{c:[B.COBBLE],k:[B.CALCITE]},cat:'blocks'}); r_(B.GRANITE,1,['dk'],{keys:{d:[B.DIORITE],k:[B.CALCITE]},cat:'blocks'});""")
R("const SMELT_IN=new Set(","""SMELTS[0].a.push(...WOODS.filter(w=>!w.nether).flatMap(w=>[w.log,w.stripped,w.woodB,w.swood]).filter(id=>!SMELTS[0].a.includes(id)));
SMELTS.push({a:[B.STONE],out:B.SMOOTH_STONE,time:6,tier:1},{a:[I.POTATO],out:I.BAKED_POTATO,time:5,tier:1},{a:[B.KELP],out:I.DRIED_KELP,time:4,tier:1},{a:[B.COBBLED_DEEPSLATE],out:B.DEEPSLATE,time:6,tier:1},{a:[B.CACTUS],out:DYE_BY.green.item,time:5,tier:1});
const SMELT_IN=new Set(""")
R("for(const m of SHAPE_MATS){ const sp=SPEC[m.base]||{h:2};","""for(const w of WOODS){ spec([w.log,w.stripped,w.woodB,w.swood],3.2,'axe'); spec(w.planks,2.6,'axe'); spec(w.leaves,w.nether?1:.4,'axe'); spec(w.sapling,.05); }
for(const s of STONES) spec(s.id,s.k==='CALCITE'?1.2:s.k.includes('DEEPSLATE')?4.5:3,'pick',1);
spec([B.FARMLAND,B.FARMLAND_WET],.9,'shovel'); spec([B.MELON,B.PUMPKIN],1.4,'axe'); spec(CAKE,.5); spec([...BERRY,...COCOA,B.SUGAR_CANE,B.TALL_LO,B.TALL_HI,B.FERN_LO,B.FERN_HI],.05);
for(const k in CROPS){ spec(CROPS[k].ids,.05); if(CROPS[k].att) spec(CROPS[k].att,.05); }
for(const m of SHAPE_MATS){ const sp=SPEC[m.base]||{h:2};""")
a="for(const id in ITEMS){ const it=ITEMS[id]; if(it.mat==='wood') FUEL[id]=10; if(it.amat==='wood') FUEL[id]=12; }"
R(a,a+"\nfor(const w of WOODS){ if(w.nether) continue; FUEL[w.log]=FUEL[w.log]||30; FUEL[w.planks]=FUEL[w.planks]||15; for(const id of [w.stripped,w.woodB,w.swood]) FUEL[id]=30; FUEL[w.sapling]=5; } FUEL[I.DRIED_KELP]=4;")
R("  if(a.includes(B.STONE)&&!a.includes(B.COBBLE)&&!r.oneWood) r.keys[k]=[...a,B.COBBLE,B.MOSSY_COBBLE];","  if(a.includes(B.STONE)&&!a.includes(B.COBBLE)&&!r.oneWood) r.keys[k]=[...a,B.COBBLE,B.MOSSY_COBBLE,B.COBBLED_DEEPSLATE];")

# ---- E13 drops
R("  if(b>0&&BLOCKS[b].leaves&&b!==B.LEAVES) b=B.LEAVES;","""  { const bd=b>0&&BLOCKS[b];
    if(bd&&bd.leaves&&tool!=='knife'&&Math.random()<.06){ const w=WOODS.find(q=>q.leaves===b); if(w) return [[w.sapling,1]]; }
    if(bd&&bd.crop){ const k=bd.crop, done=bd.age>=bd.maxAge;
      if(k==='wheat') return done?[[I.WHEAT,1],[I.SEEDS,rint(1,3)]]:[[I.SEEDS,1]];
      if(k==='carrots') return [[I.CARROT,done?rint(2,4):1]]; if(k==='potatoes') return [[I.POTATO,done?rint(2,4):1]];
      if(k==='beetroots') return done?[[I.BEETROOT,1],[I.BEET_SEEDS,rint(1,3)]]:[[I.BEET_SEEDS,1]];
      if(bd.stem) return Math.random()<(bd.age+1)/5?[[bd.stem==='melon'?I.MELON_SEEDS:I.PUMPKIN_SEEDS,1]]:[]; }
    if(bd&&bd.attached) return [[bd.stem==='melon'?I.MELON_SEEDS:I.PUMPKIN_SEEDS,rint(0,2)]];
    if(b===B.MELON) return [[I.MELON_SLICE,rint(3,7)]];
    if(bd&&bd.berry!==undefined) return [[I.BERRIES,bd.berry>=2?rint(1,3):1]];
    if(bd&&bd.cocoa) return [[I.COCOA_BEANS,bd.cocoa.age>=2?rint(2,3):1]];
    if(bd&&bd.cake!==undefined) return [];
    if(bd&&bd.dbl) return Math.random()<.12?[[I.SEEDS,1]]:[];
    if(b===B.DEEPSLATE) return tool==='pick'?[[B.COBBLED_DEEPSLATE,1]]:[]; }
  if(b>0&&BLOCKS[b].leaves&&b!==B.LEAVES) b=B.LEAVES;""")
# ---- E14 break hooks
R("  chips(x,y,z,b,14,3);\n  const up=world.get(x,y+1,z); if(up>0&&BLOCKS[up].replace)","  chips(x,y,z,b,14,3);\n  supportBroken(x,y,z); doubleBroken(x,y,z,b);\n  const up=world.get(x,y+1,z); if(up>0&&BLOCKS[up].replace)")
# ---- E15 placement rules
R("  if(id===B.CACTUS&&![B.SAND,B.RED_SAND,B.CACTUS].includes(world.get(x,y-1,z))){","""  if(bd&&bd.sapling){ const g=world.get(x,y-1,z), nether=bd.sapling==='crimson'||bd.sapling==='warped';
    const ok=[B.GRASS,B.DIRT,B.PODZOL,B.MYCELIUM,B.FARMLAND,B.FARMLAND_WET,B.SNOW_GRASS].includes(g)||nether&&[B.HELLSAND,B.FIRE_CHALK,B.ASH].includes(g)||bd.sapling==='mangrove'&&[B.CLAY,B.SAND].includes(g);
    if(!ok){ toast(nether?'Fungus grows on dirt or Underworld ground':'Saplings need grass or dirt'); return 0; } }
  if(id===B.SUGAR_CANE&&world.get(x,y-1,z)!==B.SUGAR_CANE){ const g=world.get(x,y-1,z);
    if(![B.GRASS,B.DIRT,B.SAND,B.RED_SAND,B.PODZOL].includes(g)||!DIRS.some(([dx,dz])=>isW(world.get(x+dx,y-1,z+dz))||world.get(x+dx,y-1,z+dz)===B.ICE)){ toast('Sugar cane needs water right beside the block it grows on'); return 0; } }
  if(bd&&bd.cake!==undefined){ const g=world.get(x,y-1,z); if(!(g>0&&BLOCKS[g].solid)){ toast('Set the cake on something solid'); return 0; } }
  if(id===B.CACTUS&&![B.SAND,B.RED_SAND,B.CACTUS].includes(world.get(x,y-1,z))){""")
# ---- E16-E18 taps
R("  if(it.decorItem) return useDecor(sx,sy);\n  if(it.bucket) return useBucket(sx,sy);","  if(farmUse(sx,sy,s,it)) return true; if(it.milk){ drinkMilk(s); return true; }\n  if(it.decorItem) return useDecor(sx,sy);\n  if(it.bucket) return useBucket(sx,sy);")
R("  const r=pick(sx,sy); if(!r) return false; const [x,y,z]=r.hit, b=world.get(x,y,z);\n  if(b===B.JUKEBOX)","  const r=pick(sx,sy); if(!r) return false; const [x,y,z]=r.hit, b=world.get(x,y,z);\n  if(farmTap(x,y,z,b)) return true;\n  if(b===B.JUKEBOX)")
R("it.upg||s.id===I.SADDLE);};","it.upg||s.id===I.SADDLE||it.plants||it.milk||s.id===I.BONE_MEAL||s.id===I.COCOA_BEANS);};")
R("function tapInstant(sx,sy){ if(tapDecor(sx,sy)||tapEntity(sx,sy)||tryInteract(sx,sy)) return;","function tapInstant(sx,sy){ if(tapDecor(sx,sy)||tapEntity(sx,sy)||tryInteract(sx,sy)) return; { const h=held(), hi=h&&ITEMS[h.id]; if(hi&&(hi.type==='hoe'||hi.tool==='axe')&&farmUse(sx,sy,h,hi)) return; }")
# ---- E19/E20 animals
R("  if(it&&d.food.includes(s.id)&&near){ if(m.baby)","  if(m.type==='cow'&&near&&!m.baby&&it&&s.id===I.BUCKET){ if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; } if(addItem(I.MILK,1)) spawnDrop(player.x,player.y+1,player.z,I.MILK,1); invChanged(); toast('Milked the cow'); return true; }\n  if(it&&d.food.includes(s.id)&&near){ if(m.baby)")
R("    if(m.type==='sheep'&&m.sheared){ m.regrow-=dt;","    if(m.type==='chicken'&&!m.baby){ m.eggT=(m.eggT??(200+Math.random()*300))-dt; if(m.eggT<=0){ m.eggT=300+Math.random()*300; spawnDrop(m.x,m.y+.3,m.z,I.EGG,1); } }\n    if(m.type==='sheep'&&m.sheared){ m.regrow-=dt;")
R("cow:{hp:10,speed:1.3,w:.9,h:1.35,food:[I.FIBER],","cow:{hp:10,speed:1.3,w:.9,h:1.35,food:[I.FIBER,I.WHEAT],")
R("food:[I.PETAL_R,I.PETAL_Y,I.PETAL_B],","food:[I.PETAL_R,I.PETAL_Y,I.PETAL_B,I.CARROT,I.POTATO,I.BEETROOT],")
R("chicken:{hp:4,speed:1.25,w:.45,h:.75,food:[I.SEEDS],","chicken:{hp:4,speed:1.25,w:.45,h:.75,food:[I.SEEDS,I.BEET_SEEDS,I.MELON_SEEDS,I.PUMPKIN_SEEDS],")
R("sheep:{hp:8,speed:1.25,w:.9,h:1.3,food:[I.SEEDS,I.FIBER],","sheep:{hp:8,speed:1.25,w:.9,h:1.3,food:[I.SEEDS,I.FIBER,I.WHEAT],")
# ---- E21/E22
R("if(game()) stepMining(dt); if(surv()){ stepDecay(dt); stepHealth(dt); }","if(game()) stepMining(dt); if(game()) stepGrowth(dt); if(surv()){ stepDecay(dt); stepHealth(dt); }")
R("s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); toast(`Ate ${it.name.toLowerCase()}","s.n--; if(!s.n) inv.slots[inv.sel]=null; if(it.bowl&&addItem(I.BOWL,1)) spawnDrop(player.x,player.y+1,player.z,I.BOWL,1); invChanged(); toast(`Ate ${it.name.toLowerCase()}")
# ---- E23 pause menu, logic, pack
R('    <p class="stats" id="stats"></p>','''    <div class="field packbox"><label class="l">Resource pack</label>
      <div class="packrow"><b id="packName">Default textures</b><button class="ghost" id="packImport">Import .zip</button><button class="ghost" id="packRemove" hidden>Remove</button></div>
      <p id="packInfo"></p><input type="file" id="packFile" accept=".zip,application/zip,application/x-zip-compressed" hidden></div>
    <p class="stats" id="stats"></p>''')
R("#sx{position:fixed;inset:0;","#pause .packrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#pause .packrow b{flex:1;min-width:120px;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#packInfo{font-size:12px;margin:6px 0 0;color:var(--muted);line-height:1.35}\n#sx{position:fixed;inset:0;")
R("  world=new World(meta,save); world.preview=!!preview;","  world=new World(meta,save); world.preview=!!preview; packForWorld(meta,preview);")
R("function frame(now){",blk('s14_logic.js')+'\n'+blk('s14_pack.js').replace('const PACK={','var PACK={')+"\nfunction frame(now){")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>')
open(SP+'check.js','w').write(s[i+8:j])
print('ok',len(s))
