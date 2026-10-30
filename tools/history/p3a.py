import re
F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1: raise SystemExit('MISSING: '+a[:90])
    if cnt==1 and n>1: raise SystemExit('AMBIG(%d): '%n+a[:90])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

# ---------- new blocks ----------
NEW_BLOCKS=r'''
/* ---------- stage 4 blocks: terrain, woods, plants. Ids start at 4096 so they never collide with item ids ---------- */
let _nid=4096; const NB=k=>(B[k]=_nid++);
['COBBLE','MOSSY_COBBLE','GRAVEL','CLAY','PODZOL','MYCELIUM','RED_SAND','SANDSTONE','RED_SANDSTONE','TERRACOTTA','TERRA_O','TERRA_Y','TERRA_R','TERRA_BR','TERRA_W','TERRA_LG',
 'ICE','PACKED_ICE','SNOW_GRASS','CACTUS','DEAD_BUSH','LILY','VINE_N','VINE_E','VINE_S','VINE_W','KELP','SEAGRASS','MUSH_R','MUSH_BR','CAP_R','CAP_BR','MUSH_STEM','FERN',
 'LOG_BIRCH','LOG_SPRUCE','LOG_JUNGLE','LOG_DARK','LEAVES_BIRCH','LEAVES_SPRUCE','LEAVES_JUNGLE','LEAVES_DARK','PLANKS_BIRCH','PLANKS_SPRUCE','PLANKS_JUNGLE','PLANKS_DARK',
 'FALL','CORAL_TUBE','CORAL_BRAIN','CORAL_BUBBLE','CORAL_FIRE','CORAL_HORN','FLOWER_W','FLOWER_P','FLOWER_O','FLOWER_K','FLOWER_L'].forEach(NB);
// texture patterns, drawn procedurally in the fragment shader (16×16 "pixels" per block face)
const PT={NONE:0,GRASS:1,DIRT:2,STONE:3,SAND:4,BARK:5,PLANK:6,BRICK:7,SBRICK:8,COBBLE:9,MOSSY:10,LEAF:11,WOOL:12,BIRCH:13,GRAVEL:14,SNOW:15,METAL:16,TERRA:17,CAP:18,CACTUS:19,
  WATER:20,FALL:21,ICE:22,SPECK:23,GLASS:24,CLAY:25,CORAL:26,SANDSTONE:27,MSBRICK:28,DOOR:29,IRONDOOR:30,RINGS:31,CHISEL:32,LANTERN:33,PAPER:34};
const pat=(ids,t,s,b)=>{for(const id of [].concat(ids)){const bd=BLOCKS[id]; bd.pt=t; bd.ps=s??t; bd.pb=b??s??t;}};
// a more saturated palette for the classics
Object.assign(BLOCKS[B.GRASS],{top:hex('#7cc94f'),side:hex('#8d5f3a'),bottom:hex('#8d5f3a')});
Object.assign(BLOCKS[B.LOG],{top:hex('#c39661'),side:hex('#6e4a2a'),bottom:hex('#c39661')});
Object.assign(BLOCKS[B.LEAVES],{top:hex('#4aa63a'),side:hex('#43993a')});
Object.assign(BLOCKS[B.PLANKS],{top:hex('#c59a5f'),side:hex('#b98d55'),bottom:hex('#b98d55')});
BLOCKS[B.SNOW].side=hex('#9097a0');
def(B.COBBLE,'Cobblestone','#8f9298','#888b91');
def(B.MOSSY_COBBLE,'Mossy cobblestone','#86907f','#7f8879');
def(B.GRAVEL,'Gravel','#8f8783');
def(B.CLAY,'Clay','#a2a7b6');
def(B.PODZOL,'Podzol','#7b5a2b','#8d5f3a','#8d5f3a');
def(B.MYCELIUM,'Mycelium','#8b7a8d','#8d5f3a','#8d5f3a');
def(B.RED_SAND,'Red sand','#c5682d','#bb6229');
def(B.SANDSTONE,'Sandstone','#e0d39c','#d8ca92');
def(B.RED_SANDSTONE,'Red sandstone','#bd5f27','#b45a24');
for(const [k,n,c] of [['TERRACOTTA','Terracotta','#9c5d43'],['TERRA_O','Orange terracotta','#a8572b'],['TERRA_Y','Yellow terracotta','#bb8726'],['TERRA_R','Red terracotta','#913f2f'],
  ['TERRA_BR','Brown terracotta','#523625'],['TERRA_W','White terracotta','#d3b4a3'],['TERRA_LG','Light gray terracotta','#8a6c62']]) def(B[k],n,c);
def(B.ICE,'Ice','#a6ccf7','#9cc2f0',0,{opaque:false,tint:[.78,.88,1],glassy:200,slip:1});
def(B.PACKED_ICE,'Packed ice','#94baee','#8cb2e8',0,{slip:1});
def(B.SNOW_GRASS,'Snowy grass','#f3f7fa','#8d5f3a','#8d5f3a',{lip:1});
def(B.CACTUS,'Cactus','#7bb44e','#5b9a33',0,{opaque:false,boxes:[[.0625,0,.0625,.9375,1,.9375]],cactus:1});
def(B.DEAD_BUSH,'Dead bush','#8f6b3a',0,0,{solid:false,opaque:false,plant:true,replace:true,ph:.6});
def(B.LILY,'Lily pad','#3f8c2a',0,0,{solid:false,opaque:false,replace:true,lily:1,btint:'lily'});
for(const k of ['VINE_N','VINE_E','VINE_S','VINE_W']) def(B[k],'Vines','#4c9c2c',0,0,{solid:false,opaque:false,vine:1,replace:true,btint:'foliage'});
def(B.KELP,'Kelp','#4e8f2b',0,0,{solid:false,opaque:false,plant:true,ph:1,wl:1,att:1,kelp:1});
def(B.SEAGRASS,'Seagrass','#57a238',0,0,{solid:false,opaque:false,plant:true,replace:true,ph:.75,wl:1,att:1});
def(B.MUSH_R,'Red mushroom','#d83b2e',0,0,{solid:false,opaque:false,replace:true,mush:1,stem:hex('#ebdfcc')});
def(B.MUSH_BR,'Brown mushroom','#9c7459',0,0,{solid:false,opaque:false,replace:true,mush:1,stem:hex('#e0d3bf')});
def(B.CAP_R,'Red mushroom block','#cc332a');
def(B.CAP_BR,'Brown mushroom block','#936c53');
def(B.MUSH_STEM,'Mushroom stem','#d9cfbd','#e9e0cf');
def(B.FERN,'Fern','#52a03c',0,0,{solid:false,opaque:false,plant:true,replace:true,ph:.62,btint:'grass',fern:1});
for(const [k,n,c] of [['FLOWER_W','Oxeye daisy','#f6f6ef'],['FLOWER_P','Allium','#b360e2'],['FLOWER_O','Orange tulip','#f08b2b'],['FLOWER_K','Pink tulip','#f4a7ca'],['FLOWER_L','Blue orchid','#3ab7ea']])
  def(B[k],n,c,0,0,{solid:false,opaque:false,plant:true,replace:true,stem:hex('#4e9a36'),ph:.58});
// woods: oak (the original) plus birch, spruce, jungle and dark oak
const WOODS=[
  {k:'oak',name:'Oak',log:B.LOG,leaves:B.LEAVES,planks:B.PLANKS},
  {k:'birch',name:'Birch',log:B.LOG_BIRCH,leaves:B.LEAVES_BIRCH,planks:B.PLANKS_BIRCH,bark:'#e6e2d6',core:'#d6c48c',pl:'#d8c38a',lf:'#80aa56'},
  {k:'spruce',name:'Spruce',log:B.LOG_SPRUCE,leaves:B.LEAVES_SPRUCE,planks:B.PLANKS_SPRUCE,bark:'#4b3420',core:'#8e6a3e',pl:'#7d5733',lf:'#3d6a45'},
  {k:'jungle',name:'Jungle',log:B.LOG_JUNGLE,leaves:B.LEAVES_JUNGLE,planks:B.PLANKS_JUNGLE,bark:'#5d4b1f',core:'#b88d5a',pl:'#b8825a',lf:'#38b020',ftint:1},
  {k:'dark',name:'Dark oak',log:B.LOG_DARK,leaves:B.LEAVES_DARK,planks:B.PLANKS_DARK,bark:'#3d2b18',core:'#6e4f30',pl:'#4d3421',lf:'#3d8a2a',ftint:1}];
for(const w of WOODS.slice(1)){ def(w.log,w.name+' log',w.core,w.bark); def(w.leaves,w.name+' leaves',w.lf,w.lf,0,{lightOpaque:0,att:2,leaves:1,btint:w.ftint?'foliage':null}); def(w.planks,w.name+' planks',w.pl,w.pl); }
BLOCKS[B.LEAVES].leaves=1; BLOCKS[B.LEAVES].btint='foliage';
for(const w of WOODS){ BLOCKS[w.log].log=1; BLOCKS[w.log].wood=w.k; BLOCKS[w.planks].wood=w.k; BLOCKS[w.planks].planks=1; BLOCKS[w.leaves].wood=w.k; }
BLOCKS[B.GRASS].btint='grass'; BLOCKS[B.TALLGRASS].btint='grass';
def(B.FALL,'Waterfall','#5c9fe0',0,0,{solid:false,opaque:false,att:1,wl:2});
for(const [k,n,c] of [['CORAL_TUBE','Tube coral block','#3557da'],['CORAL_BRAIN','Brain coral block','#e66da8'],['CORAL_BUBBLE','Bubble coral block','#a630c4'],['CORAL_FIRE','Fire coral block','#d4352f'],['CORAL_HORN','Horn coral block','#e6d446']]) def(B[k],n,c);
BLOCKS[B.WATER].wl=1;
const isLog=b=>b>0&&!!BLOCKS[b].log, isLeaves=b=>b>0&&!!BLOCKS[b].leaves;
// patterns per face: top, sides, bottom
pat(B.GRASS,PT.GRASS,PT.DIRT); pat([B.DIRT],PT.DIRT); pat([B.STONE,B.ORE_COAL,B.ORE_TIN,B.ORE_COPPER,B.ORE_BAUXITE,B.ORE_GOLD,B.ORE_IRON,B.ORE_TITANIUM,B.ORE_PLATINUM,B.ORE_DIAMOND],PT.STONE);
pat([B.SAND,B.RED_SAND],PT.SAND); pat([B.LOG,B.LOG_SPRUCE,B.LOG_JUNGLE,B.LOG_DARK],PT.RINGS,PT.BARK); pat(B.LOG_BIRCH,PT.RINGS,PT.BIRCH);
pat([B.LEAVES,B.LEAVES_BIRCH,B.LEAVES_SPRUCE,B.LEAVES_JUNGLE,B.LEAVES_DARK],PT.LEAF); pat([B.PLANKS,B.PLANKS_BIRCH,B.PLANKS_SPRUCE,B.PLANKS_JUNGLE,B.PLANKS_DARK],PT.PLANK);
pat(B.BEDROCK,PT.GRAVEL); pat(B.BRICK,PT.BRICK); pat(B.SNOW,PT.SNOW,PT.STONE); pat(B.SNOW_GRASS,PT.SNOW,PT.DIRT); pat([B.GLASS,B.GLASS_R,B.GLASS_Y,B.GLASS_B],PT.GLASS);
pat(B.COBBLE,PT.COBBLE); pat(B.MOSSY_COBBLE,PT.MOSSY); pat(B.GRAVEL,PT.GRAVEL); pat(B.CLAY,PT.CLAY); pat([B.PODZOL,B.MYCELIUM],PT.SPECK,PT.DIRT);
pat([B.SANDSTONE,B.RED_SANDSTONE],PT.SAND,PT.SANDSTONE); pat([B.TERRACOTTA,B.TERRA_O,B.TERRA_Y,B.TERRA_R,B.TERRA_BR,B.TERRA_W,B.TERRA_LG],PT.TERRA);
pat(B.ICE,PT.ICE); pat(B.PACKED_ICE,PT.ICE); pat(B.CACTUS,PT.SPECK,PT.CACTUS); pat([B.CAP_R,B.CAP_BR],PT.CAP); pat(B.MUSH_STEM,PT.CLAY);
pat([B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN],PT.CORAL);
'''
rep("def(B.FLOWER_B,'Cornflower','#4f7ee0',0,0,{solid:false,opaque:false,plant:true,replace:true,stem:hex('#4e9a36'),ph:.6});\n",
    "def(B.FLOWER_B,'Cornflower','#4f7ee0',0,0,{solid:false,opaque:false,plant:true,replace:true,stem:hex('#4e9a36'),ph:.6});\n"+NEW_BLOCKS)

# lookup tables sized for the new id range; water-like table
rep("const LOPQ=new Uint8Array(4096), LATT=new Uint8Array(4096), TINT=[], EMIT=[];",
    "const LOPQ=new Uint8Array(8192), LATT=new Uint8Array(8192), TINT=[], EMIT=[], WATERY=new Uint8Array(8192);")
rep("if(bd.tint)TINT[bd.id]=bd.tint; if(bd.emit)EMIT[bd.id]=bd.emit; }",
    "if(bd.tint)TINT[bd.id]=bd.tint; if(bd.emit)EMIT[bd.id]=bd.emit; if(bd.wl)WATERY[bd.id]=1; }\nconst isW=b=>b>0&&WATERY[b]===1;")

# ---------- pattern id travels in the 4th byte of block light ----------
rep("u[ob+4]=VL[0];u[ob+5]=VL[1];u[ob+6]=VL[2];u[ob+7]=VL[3];u[ob+8]=VL[4];u[ob+9]=VL[5];u[ob+10]=VL[6];u[ob+11]=0;this.n++;}",
    "u[ob+4]=VL[0];u[ob+5]=VL[1];u[ob+6]=VL[2];u[ob+7]=VL[3];u[ob+8]=VL[4];u[ob+9]=VL[5];u[ob+10]=VL[6];u[ob+11]=PAT;this.n++;}")
rep("function setVL(a){VL.set(a);}","function setVL(a){VL.set(a);}\nlet PAT=0;   // texture pattern for the vertices being written (see PT)")

# vertex shader
rep("out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; out vec3 vV;\nvoid main(){",
    "out vec3 vAlb; out vec3 vSky; out vec3 vBlk; out float vA; out vec3 vW; out vec3 vV; out float vS; flat out int vP;\nvoid main(){")
rep("vAlb=aCol.rgb*aCol.a; vSky=aSky.rgb*uSun;","vAlb=aCol.rgb*aCol.a; vS=aCol.a; vP=int(aBlk.a*255.+.5); vSky=aSky.rgb*uSun;")
# fragment shader
rep("in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; in vec3 vV;\nuniform vec3 uPV;",
    "in vec3 vAlb; in vec3 vSky; in vec3 vBlk; in float vA; in vec3 vW; in vec3 vV; in float vS; flat in int vP;\nuniform vec3 uPV;")
TEX=r'''
float hp(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
// procedural 16×16 block textures: returns a brightness multiplier in m and an overlay colour (rgb, amount)
vec4 texel(int id, vec3 w, vec3 n, out float m){
  m=1.; vec4 mx=vec4(0.);
  bool top=abs(n.y)>.5; vec2 uv=top?w.xz:abs(n.x)>.5?vec2(w.z,w.y):vec2(w.x,w.y);
  vec3 cl=floor(w-n*.02); vec2 f=fract(uv), px=floor(f*16.); vec2 cs=cl.xz*31.7+vec2(cl.y*17.3,cl.y*5.1);
  float r=hp(px+cs+float(id)*7.13);
  if(id==1){ m=.84+.3*r; if(hp(floor(px/2.)+cs*1.3)>.88) m*=1.12; }
  else if(id==2){ m=.82+.26*r; if(hp(floor(px/2.)+cs+3.)>.84) m*=.76; }
  else if(id==3){ float r2=hp(floor(px/4.)+cs+9.); m=.86+.16*r+.16*(r2-.5); if(hp(floor(px/2.)+cs*2.)>.93) m*=.82; }
  else if(id==4){ m=.92+.13*r; }
  else if(id==5){ if(top){ float d=max(abs(px.x-7.5),abs(px.y-7.5)); m=d>6.?.55:mod(floor(d),3.)<1.?.82:1.; }
    else { float c=hp(vec2(px.x,cl.x*3.+cl.z*7.)); float seg=hp(vec2(px.x,floor((px.y+c*16.)/5.))+cs); m=.72+.28*c+.12*seg; if(mod(px.x+floor(c*3.),4.)<1.) m*=.8; } }
  else if(id==31){ float d=max(abs(px.x-7.5),abs(px.y-7.5)); m=d>6.?.6:mod(floor(d),3.)<1.?.84:1.02; m*=.95+.08*r; }
  else if(id==6){ float row=floor(px.y/4.); float off=floor(hp(vec2(row,cl.y+cl.x*3.+cl.z*5.))*2.)*8.;
    m=.93+.1*hp(vec2(floor(px.x/4.),px.y)+cs); if(mod(px.y,4.)>2.5) m=.7; else if(mod(px.x+off,16.)<1.) m=.76; }
  else if(id==7){ float row=floor(px.y/4.), off=mod(row,2.)*4.;
    if(mod(px.y,4.)<1.||mod(px.x+off,8.)<1.) mx=vec4(.82,.8,.76,.9); else m=.86+.18*hp(vec2(floor((px.x+off)/8.),row)+cs)+.06*r; }
  else if(id==8||id==28){ float row=floor(px.y/8.), off=mod(row,2.)*8.;
    if(mod(px.y,8.)<1.||mod(px.x+off,16.)<1.) m=.6; else { m=.9+.1*r; if(mod(px.y,8.)>6.) m*=.88; else if(mod(px.y,8.)<2.) m*=1.08; }
    if(id==28&&hp(floor(px/2.)+cs+5.)>.62) mx=vec4(.35,.56,.24,.7); }
  else if(id==9||id==10||id==22&&false){ vec2 q=px/4.5; vec2 iq=floor(q); float d1=9.,d2=9.; vec2 best=vec2(0.);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 c=iq+vec2(i,j); vec2 p=c+vec2(hp(c+cs),hp(c+cs+7.))*.8+.1; float d=length(q-p); if(d<d1){d2=d1;d1=d;best=c;} else if(d<d2) d2=d; }
    m=(d2-d1)<.18?.58:.8+.3*hp(best+cs+2.); m*=.95+.08*r;
    if(id==10&&hp(best+cs+11.)>.45) mx=vec4(.33,.55,.22,(d2-d1)<.18?.4:.75); }
  else if(id==11){ m=.78+.36*r; if(hp(px*1.7+cs+4.)>.82) m*=.62; }
  else if(id==12){ m=.9+.07*mod(px.x+px.y,2.)+.07*r; }
  else if(id==13){ if(top){ float d=max(abs(px.x-7.5),abs(px.y-7.5)); m=d>6.?.9:mod(floor(d),3.)<1.?.84:1.; }
    else { m=.95+.07*r; float dsh=hp(vec2(floor(px.x/3.)+cl.x*5.+cl.z*3.,px.y+cl.y*16.)); if(dsh>.9) m=.24; else if(dsh>.84) m=.62; } }
  else if(id==14){ m=.62+.6*hp(floor(px/2.)+cs); }
  else if(id==15){ m=.95+.07*r; }
  else if(id==16){ vec2 p=mod(px,8.); m=.95+.06*r; if(p.x<1.||p.y>6.) m=1.2; else if(p.x>6.||p.y<1.) m=.74; if(abs(px.x-px.y-4.)<1.5) m*=1.08; }
  else if(id==17){ m=.94+.08*r; }
  else if(id==18){ m=.94+.08*r; if(hp(floor(px/3.)+cs+1.)>.8) mx=vec4(.96,.94,.9,1.); }
  else if(id==19){ m=.92+.1*r; if(mod(px.x,4.)<1.) m*=.76; if(hp(px+cs+6.)>.94) mx=vec4(.95,.93,.72,1.); }
  else if(id==22){ m=.94+.08*r; if(abs(px.x-px.y+floor(hp(cs)*8.)-4.)<.6) m*=1.18; }
  else if(id==23){ m=.8+.36*r; if(hp(floor(px/2.)+cs*1.7)>.8) m*=.75; }
  else if(id==24){ if(px.x<1.||px.y<1.||px.x>14.||px.y>14.) m=1.3; else if(abs(px.x-px.y)<1.&&px.x>3.&&px.x<9.) m=1.25; }
  else if(id==25){ m=.93+.08*r; }
  else if(id==26){ m=.72+.42*hp(floor(px/2.)+cs); }
  else if(id==27){ m=.93+.05*r+(mod(floor(px.y/4.),2.)<1.?.04:-.03); if(mod(px.y,4.)<1.) m*=.92; }
  else if(id==29){ vec2 p=px; m=.94+.08*hp(vec2(floor(px.x/2.),px.y)+cs); if(p.x<2.||p.x>13.||(p.y<2.&&!top)) m*=.78; else if(!top&&((p.x>3.&&p.x<12.)&&(mod(p.y,8.)>2.&&mod(p.y,8.)<7.))) m*=.86; }
  else if(id==30){ m=.92+.08*r; if(px.x<1.||px.x>14.) m=.7; if(hp(floor(px/4.)+cs)>.7&&mod(px.x,4.)==1.&&mod(px.y,4.)==1.) m=1.3; if(mod(px.y,8.)<1.) m*=.82; }
  else if(id==32){ vec2 p=abs(px-7.5); float d=max(p.x,p.y); m=d>6.?.7:d>5.?1.12:d<2.?.82:.96+.05*r; }
  else if(id==33){ m=.9+.15*r; }
  else if(id==34){ m=.96+.04*r; }
  // fade the detail out where a texel is smaller than a screen pixel (far iso zoom) to avoid shimmer
  float fw=max(length(dFdx(uv)),length(dFdy(uv)))*16.; float k=1.-smoothstep(.7,1.8,fw);
  m=mix(1.,m,k); mx.a*=k; return mx;
}
'''
rep("float cloudAt(vec2 p){", TEX+"float cloudAt(vec2 p){")
rep("""  vec3 L=min(vSky*sh+vBlk+vec3(uAmb),vec3(1.2));
  vec3 c=vAlb*L;
  float a=uAlpha*vA;
  if(uMode==2){""","""  vec3 L=min(vSky*sh+vBlk+vec3(uAmb),vec3(1.2));
  vec3 alb=vAlb;
  vec3 nrm=normalize(cross(dFdx(vW),dFdy(vW)));
  if(vP>0&&vP<20||vP>21){ float m; vec4 mx=texel(vP,vW,nrm,m); alb=mix(alb*m,mx.rgb*vS,mx.a); }
  else if(vP==20&&abs(nrm.y)>.5){ vec2 q=floor(vW.xz*16.)/16.; float w1=sin(q.x*2.1+uTime*1.6+sin(q.y*1.7+uTime*.9)*1.4), w2=sin(q.y*2.6-uTime*1.3+cos(q.x*1.1-uTime*.7)*1.2);
    alb*=.9+.09*w1+.07*w2; }
  else if(vP==21){ float col=floor(fract(abs(nrm.x)>.5?vW.z:vW.x)*16.); float st=hp(vec2(col,floor(vW.y*6.+uTime*9.+hp(vec2(col,3.))*6.)));
    alb*=.82+.4*step(.55,st); }
  vec3 c=alb*L;
  float a=uAlpha*vA;
  if(uMode==2){""")
open(F,'w').write(s)
print('ok')
