F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b):
    global s
    n=s.count(a)
    if n!=1: raise SystemExit('COUNT %d: '%n+a[:90])
    s=s.replace(a,b,1)

GEN2=r'''
/* ---------- biomes (temperature × humidity, plus continents, rivers and mountains) ---------- */
const BIO=[], BI={};
function biome(k,name,o){ const b=Object.assign({k,name,grass:'#7cc94f',foliage:'#52b032',water:'#3f76e4',top:B.GRASS,fill:B.DIRT,trees:null,plants:null},o||{});
  for(const c of ['grass','foliage','water']) b[c]=hex(b[c]); b.id=BIO.length; BIO.push(b); BI[k]=b.id; return b; }
biome('ocean','Ocean',{grass:'#8eb971',sea:1,kelp:.22});
biome('deep_ocean','Deep Ocean',{grass:'#8eb971',water:'#3a6ce0',sea:1,kelp:.3});
biome('warm_ocean','Warm Ocean',{grass:'#8eb971',water:'#3fd3ee',sea:1,coral:1});
biome('lukewarm_ocean','Lukewarm Ocean',{grass:'#8eb971',water:'#45adf2',sea:1,kelp:.08});
biome('cold_ocean','Cold Ocean',{grass:'#8eb971',water:'#3d57d6',sea:1,kelp:.2});
biome('frozen_ocean','Frozen Ocean',{grass:'#80b497',water:'#3938c9',sea:1,ice:1});
biome('beach','Beach',{grass:'#91c45a',top:B.SAND,fill:B.SAND});
biome('snowy_beach','Snowy Beach',{grass:'#80b497',water:'#3d57d6',top:B.SAND,fill:B.SAND});
biome('stone_shore','Stone Shore',{grass:'#8ab689',top:B.STONE,fill:B.STONE});
biome('river','River',{grass:'#7cc94f',sea:1,river:1});
biome('frozen_river','Frozen River',{grass:'#80b497',water:'#3938c9',sea:1,river:1,ice:1});
biome('plains','Plains',{grass:'#8cd055',foliage:'#62c034',trees:[['oak',.003],['bigoak',.0006]],plants:{grass:.2,flower:.035}});
biome('flower_plains','Sunflower Plains',{grass:'#8cd055',foliage:'#62c034',trees:[['oak',.002]],plants:{grass:.14,flower:.12}});
biome('forest','Forest',{grass:'#7cc94f',foliage:'#52b032',trees:[['oak',.045],['birch',.012],['bigoak',.004]],plants:{grass:.09,flower:.01,mush:.004}});
biome('flower_forest','Flower Forest',{grass:'#7cc94f',foliage:'#52b032',trees:[['oak',.025],['birch',.01]],plants:{grass:.05,flower:.3,allFlowers:1}});
biome('birch_forest','Birch Forest',{grass:'#88c065',foliage:'#6bae42',trees:[['birch',.055]],plants:{grass:.1,flower:.015}});
biome('dark_forest','Dark Forest',{grass:'#5a8c36',foliage:'#4a8a26',trees:[['dark',.05],['hugeR',.003],['hugeB',.003],['oak',.01]],plants:{grass:.05,mush:.03}});
biome('taiga','Taiga',{grass:'#86b783',foliage:'#68a464',trees:[['spruce',.05]],plants:{grass:.05,fern:.08,mush:.008}});
biome('mega_taiga','Giant Tree Taiga',{grass:'#86b87f',foliage:'#68a55f',trees:[['megaSpruce',.012],['spruce',.03],['boulder',.003]],plants:{fern:.12,mush:.02,dead:.004},podzol:1});
biome('snowy_tundra','Snowy Tundra',{grass:'#80b497',foliage:'#60a17b',top:B.SNOW_GRASS,trees:[['spruce',.002]],snow:1});
biome('snowy_taiga','Snowy Taiga',{grass:'#80b497',foliage:'#60a17b',top:B.SNOW_GRASS,trees:[['spruce',.045]],plants:{fern:.03},snow:1});
biome('ice_spikes','Ice Spikes',{grass:'#80b497',foliage:'#60a17b',top:B.SNOW_GRASS,trees:[['spike',.012]],snow:1});
biome('jungle','Jungle',{grass:'#5fd23a',foliage:'#33c00c',trees:[['jungle',.07],['megaJungle',.006],['bush',.05]],plants:{grass:.22,fern:.1}});
biome('jungle_edge','Jungle Edge',{grass:'#68cc40',foliage:'#3fbb14',trees:[['jungle',.015],['bush',.03],['oak',.006]],plants:{grass:.2,fern:.05}});
biome('desert','Desert',{grass:'#bfb755',foliage:'#aea42a',top:B.SAND,fill:B.SAND,under:B.SANDSTONE,trees:[['cactus',.008]],plants:{dead:.012}});
biome('badlands','Badlands',{grass:'#90814d',foliage:'#9e814d',top:B.RED_SAND,fill:B.RED_SAND,mesa:1,trees:[['cactus',.002]],plants:{dead:.015}});
biome('swamp','Swamp',{grass:'#6a7a39',foliage:'#5f7a2c',water:'#617b64',trees:[['swampOak',.018]],plants:{grass:.08,orchid:.02,mush:.01},lily:.1});
biome('mushroom_fields','Mushroom Fields',{grass:'#55c93f',foliage:'#2bbb0f',top:B.MYCELIUM,trees:[['hugeR',.006],['hugeB',.006]],plants:{mush:.03}});
biome('mountains','Mountains',{grass:'#8ab689',foliage:'#6da36b',trees:[['oak',.004],['spruce',.006],['boulder',.0015]],plants:{grass:.06,flower:.004},mountain:1});
biome('wooded_mountains','Wooded Mountains',{grass:'#8ab689',foliage:'#6da36b',trees:[['spruce',.04],['oak',.006]],plants:{grass:.05,fern:.04},mountain:1});
biome('gravelly_mountains','Gravelly Mountains',{grass:'#8ab689',foliage:'#6da36b',trees:[['spruce',.004]],plants:{grass:.03},mountain:1,gravel:1});
biome('snowy_peaks','Snowy Mountains',{grass:'#80b497',foliage:'#60a17b',top:B.SNOW,fill:B.STONE,trees:[['spruce',.003]],snow:1,mountain:1,peak:1});
const FLOWERS_COMMON=[B.FLOWER_R,B.FLOWER_Y,B.FLOWER_B,B.FLOWER_W,B.FLOWER_O,B.FLOWER_K];
const FLOWERS_ALL=[...FLOWERS_COMMON,B.FLOWER_P,B.FLOWER_L];
const VINE_OF={'0,-1':B.VINE_N,'1,0':B.VINE_E,'0,1':B.VINE_S,'-1,0':B.VINE_W};
const BANDS=[B.TERRACOTTA,B.TERRA_O,B.TERRA_O,B.TERRA_Y,B.TERRACOTTA,B.TERRA_BR,B.TERRA_O,B.TERRA_R,B.TERRA_W,B.TERRACOTTA,B.TERRA_LG,B.TERRA_O,B.TERRA_Y,B.TERRA_R,B.TERRACOTTA,B.TERRA_W];

class Generator2{
  constructor(seed,size,H){
    this.seed=seed; this.size=size; this.H=H; this.v2=true;
    const N=k=>makeNoise(seed+k*1013);
    this.nC=N(1);this.nH=N(2);this.nM=N(3);this.nR=N(4);this.nRv=N(5);this.nT=N(6);this.nU=N(7);this.nV=N(8);this.nF=N(9);this.nE=N(10);this.nW=N(11);this.nX=N(12);
    this.b=0; this.river=false;
  }
  // terrain height of one column; also leaves the biome in this.b
  sample(x,z){
    const S=this.size;
    let c=fbm(this.nC,x*.0017+.31,z*.0017-.77,3)*1.5+.16;
    const e=Math.min(x,z,S-1-x,S-1-z), er=Math.max(10,Math.min(150,S*.12)), ed=1-sat(e/er);
    c-=1.1*ed*ed;                                                          // the world is ringed by ocean
    if(S<=300) c+=.5*(1-sat(Math.hypot(x-S/2,z-S/2)/(S*.42)));            // small worlds: one island
    const hills=fbm(this.nH,x*.011,z*.011,3), det=this.nH(x*.055+11,z*.055-7);
    const mm=sat((fbm(this.nM,x*.0042+5,z*.0042-3,2)-.05)/.3);           // mountain ranges
    const T0=fbm(this.nT,x*.0021,z*.0021,2)*1.3, M=fbm(this.nU,x*.0024+40,z*.0024-40,2)*1.3, vr=this.nV(x*.006,z*.006);
    let h;
    if(c<0){ const d=sat(-c/.45); h=SEA-1.5-d*12+det*.8+hills*1.6; }
    else {
      const land=sat(c/.22), rg=mm>0?1-Math.abs(fbm(this.nR,x*.012,z*.012,3)):0;
      h=SEA+1+land*(2.5+hills*5+Math.max(0,hills)*4+det*1.2)+mm*land*(rg*rg*25+hills*4);
      const m=sat((this.nE(x*.0065,z*.0065)+.1)/.25)*(1-mm)*land;          // terraced cliffs to climb
      if(m>0){ const st=5, t=h/st, fl=Math.floor(t), fr=t-fl, ter=(fl+(fr>.72?1:fr/.72*.25))*st; h+=(ter-h)*m; }
    }
    let T=T0-Math.max(0,h-SEA-10)*.035;
    // swamps flatten to the waterline; badlands rise into stepped plateaus
    let sw=0, bad=0;
    if(c>.04&&T>-.15&&T<.42){ sw=sat((M-.42)/.12)*sat((c-.04)/.12)*(1-mm); if(sw>0) h+=(SEA+(det>.3?1:det<-.25?-1:0)+.3-h)*sw; }
    if(T>=.42&&M<-.12&&vr>.28&&c>.06){ bad=sat((vr-.28)/.14)*sat((-.12-M)/.12)*sat((c-.06)/.1); if(bad>0){ const pl=Math.max(0,fbm(this.nX,x*.018,z*.018,2)+.25)*26; h+=bad*Math.floor(pl/4)*4; } }
    // rivers carve valleys through the land
    let river=false;
    if(c>.02){ const rv=Math.abs(fbm(this.nRv,x*.0032+3,z*.0032+9,2)), rw=.02+.012*(1-mm), vw=.06+mm*.05;
      if(rv<rw){ river=true; h=SEA-1.6-(1-rv/rw)*1.6; }
      else if(rv<rw+vw&&h>SEA+.6){ const t=(rv-rw)/vw, s2=t*t*(3-2*t); h=SEA+.6+(h-SEA-.6)*s2; } }
    const hi=Math.max(3,Math.min(this.H-6,Math.floor(h)));
    let b;
    if(river) b=T<-.45?BI.frozen_river:BI.river;
    else if(hi<SEA&&c<.04) b=T<-.45?BI.frozen_ocean:T<-.15?BI.cold_ocean:T>.55?BI.warm_ocean:T>.28?BI.lukewarm_ocean:hi<SEA-8?BI.deep_ocean:BI.ocean;
    else if(sw>.5) b=BI.swamp;
    else if(this.nW(x*.01,z*.01)>.62&&c<.35&&c>.04) b=BI.mushroom_fields;
    else if(hi<=SEA+1&&c<.1) b=T<-.45?BI.snowy_beach:mm>.3?BI.stone_shore:BI.beach;
    else if(mm>.4&&hi>SEA+12) b=hi>SEA+25||T<-.5?BI.snowy_peaks:T<-.1?BI.wooded_mountains:vr>.35?BI.gravelly_mountains:BI.mountains;
    else if(bad>.5) b=BI.badlands;
    else if(T<-.45) b=M>0?BI.snowy_taiga:vr>.5?BI.ice_spikes:BI.snowy_tundra;
    else if(T<-.15) b=M>.25?BI.mega_taiga:BI.taiga;
    else if(T<.42) b=M<-.38?(vr>.45?BI.flower_plains:BI.plains):M<-.05?(vr>.5?BI.flower_forest:BI.forest):M<.2?(vr<-.3?BI.forest:BI.birch_forest):BI.dark_forest;
    else b=M<-.12?BI.desert:M<.22?BI.plains:M<.36?BI.jungle_edge:BI.jungle;
    this.b=b; this.river=river; this.T=T; return hi;
  }
  height(x,z){ return this.sample(x,z); }
  biomeAt(x,z){ this.sample(x,z); return this.b; }
  spawnOK(x,z){ const h=this.sample(x,z), bd=BIO[this.b]; return h>SEA+1&&h<SEA+16&&!bd.sea&&!bd.mountain?h:0; }
  fill(ch){
    const {H,size,seed}=this, x0=ch.cx*CS, z0=ch.cz*CS, M=5, E=CS+2*M, b=ch.blocks;
    const hm=new Int16Array(E*E), bm=new Uint8Array(E*E);
    for(let j=0;j<E;j++)for(let i=0;i<E;i++){ const wx=x0+i-M, wz=z0+j-M;
      if(wx<0||wz<0||wx>=size||wz>=size){ hm[j*E+i]=-1; continue; } hm[j*E+i]=this.sample(wx,wz); bm[j*E+i]=this.b; }
    ch.bio=new Uint8Array(CS*CS); ch.falls=[];
    const idx=(lx,y,lz)=>(y*CS+lz)*CS+lx;
    const set=(lx,y,lz,v)=>{ if(y>0&&y<H) b[idx(lx,y,lz)]=v; };
    const inC=(lx,lz)=>lx>=0&&lz>=0&&lx<CS&&lz<CS&&x0+lx<size&&z0+lz<size;
    const put=(lx,y,lz,v,force)=>{ if(!inC(lx,lz)||y<1||y>=H) return; const k=idx(lx,y,lz), cur=b[k]; if(force||cur===B.AIR||BLOCKS[cur].replace&&!BLOCKS[cur].wl) b[k]=v; };
    const H_=(i,j)=>hm[(j+M)*E+i+M];
    for(let lz=0;lz<CS;lz++)for(let lx=0;lx<CS;lx++){
      const wx=x0+lx, wz=z0+lz; if(wx>=size||wz>=size) continue;
      const h=H_(lx,lz), bi=bm[(lz+M)*E+lx+M], bd=BIO[bi]; ch.bio[lz*CS+lx]=bi;
      let slope=0; for(const [dx,dz] of DIRS){ const n=H_(lx+dx,lz+dz); if(n>=0) slope=Math.max(slope,Math.abs(n-h)); }
      const r1=hash2(wx,wz,seed+3), dd=3+(r1<.5?0:1), under=h<SEA;
      let top=bd.top, fill=bd.fill;
      if(under){ const fl=this.nF(wx*.05,wz*.05);
        top=fill=bd.k==='warm_ocean'||bd.k==='lukewarm_ocean'?B.SAND:bd.k==='deep_ocean'||bd.k==='cold_ocean'||bd.k==='frozen_ocean'?(fl>.2?B.SAND:B.GRAVEL):fl>.35?B.GRAVEL:B.SAND;
        if((bd.river||bi===BI.swamp)&&hash2(wx,wz,seed+41)<.18) top=B.CLAY; if(bi===BI.swamp) top=fill=B.DIRT; }
      else if(bd.mountain){ if(bd.peak){ top=slope>=3?B.STONE:B.SNOW; fill=B.STONE; if(this.nF(wx*.08,wz*.08)>.45) top=B.PACKED_ICE; }
        else if(bd.gravel&&this.nF(wx*.06,wz*.06)>-.1){ top=fill=B.GRAVEL; }
        else if(slope>=3||h>SEA+22){ top=fill=B.STONE; } }
      else if(bd.podzol&&this.nF(wx*.07,wz*.07)>-.05) top=B.PODZOL;
      else if(slope>=4&&top===B.GRASS&&h>SEA+6&&hash2(wx,wz,seed+9)<.7) top=B.STONE, fill=B.STONE;
      for(let y=0;y<=h;y++){
        let v;
        if(y===0) v=B.BEDROCK;
        else if(bd.mesa&&y>SEA-3) v=(y===h&&slope<2)?B.RED_SAND:BANDS[(y+((this.nX(wx*.02,wz*.02)*3)|0)+32)%BANDS.length];
        else if(y===h) v=top;
        else if(y>h-dd) v=fill;
        else if(bd.under&&y>h-dd-4) v=bd.under;
        else if(fill===B.SAND&&y>h-dd-2) v=B.SANDSTONE;
        else v=B.STONE;
        set(lx,y,lz,v);
      }
      for(let y=h+1;y<=SEA;y++) set(lx,y,lz,B.WATER);
      if(under&&bd.ice&&this.nF(wx*.09,wz*.09)>-.35) set(lx,SEA,lz,B.ICE);
      // under water: kelp forests, seagrass, coral reefs, lily pads
      if(under){ const dep=SEA-h, r=hash2(wx,wz,seed+51), cl=this.nF(wx*.04+7,wz*.04-3);
        if(bd.kelp&&dep>=4&&cl>-.1&&r<bd.kelp*2){ const kh=Math.max(1,Math.floor((dep-1)*(.45+hash2(wx,wz,seed+52)*.5))); for(let y=h+1;y<=h+kh&&y<SEA;y++) set(lx,y,lz,B.KELP); }
        else if(bd.coral&&r<.22&&cl>-.3){ const cs=[B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN][(hash2(wx,wz,seed+53)*5)|0]; set(lx,h+1,lz,cs); if(dep>3&&r<.08) set(lx,h+2,lz,cs); }
        else if(dep>=1&&r<.28&&!bd.ice) set(lx,h+1,lz,B.SEAGRASS);
        if(bd.k==='swamp'||bi===BI.swamp){}
      }
      if(bi===BI.swamp&&h<SEA&&SEA-h<=2&&hash2(wx,wz,seed+55)<.12) set(lx,SEA+1,lz,B.LILY);
      // ground cover
      if(!under&&h+1<H){ const P=bd.plants, r=hash2(wx,wz,seed+99), mead=Math.max(0,this.nF(wx*.02,wz*.02)), tp=b[idx(lx,h,lz)];
        if(P&&(tp===B.GRASS||tp===B.PODZOL||tp===B.MYCELIUM||tp===B.SAND||tp===B.RED_SAND||tp===B.SNOW_GRASS)){
          let acc=0; const fh=hash2(wx,wz,seed+98);
          const pick=(p,v)=>{ if(!p) return false; acc+=p*(.6+mead); if(r<acc){ set(lx,h+1,lz,v); return true; } return false; };
          if(tp===B.SAND||tp===B.RED_SAND){ pick(P.dead,B.DEAD_BUSH); }
          else pick(P.flower,(P.allFlowers?FLOWERS_ALL:FLOWERS_COMMON)[(fh*(P.allFlowers?8:6))|0])||pick(P.orchid,B.FLOWER_L)||pick(P.mush,fh<.5?B.MUSH_R:B.MUSH_BR)||pick(P.fern,B.FERN)||pick(P.dead,B.DEAD_BUSH)||(tp!==B.MYCELIUM&&tp!==B.SNOW_GRASS&&pick(P.grass,B.TALLGRASS));
        }
        // loose rocks lying on the surface (tap to pick up)
        if(b[idx(lx,h+1,lz)]===B.AIR){ const pr=hash2(wx,wz,seed+77);
          if(pr<(tp===B.STONE||tp===B.GRAVEL?.035:tp===B.SAND?.02:.012)) set(lx,h+1,lz,B.PEBBLE); }
      }
    }
    // ore veins: random walks through stone, rarer and deeper for harder ores [ore, min y, max y, veins per chunk, size]
    const orng=mulberry32((seed^Math.imul(ch.cx+7,73856093)^Math.imul(ch.cz+13,19349663))>>>0);
    for(const [id,y0,y1,nv,sz] of [[B.ORE_COAL,5,44,8,6],[B.ORE_TIN,4,34,6,5],[B.ORE_COPPER,4,34,6,5],[B.ORE_BAUXITE,3,28,3.5,5],[B.ORE_GOLD,2,22,2,4],
        [B.ORE_IRON,2,30,4,5],[B.ORE_TITANIUM,1,16,1.2,4],[B.ORE_PLATINUM,1,12,.7,3],[B.ORE_DIAMOND,1,9,.35,3]])
      for(let v=0,nn=Math.floor(nv)+(orng()<nv%1?1:0);v<nn;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=y0+(orng()*(y1-y0)|0); const n=2+(orng()*sz|0);
        for(let k=0;k<n;k++){ if(x>=0&&z>=0&&x<CS&&z<CS&&y>0&&y<H){ const i=idx(x,y,z); if(b[i]===B.STONE) b[i]=id; }
          const r=orng()*6|0; if(r===0)x++; else if(r===1)x--; else if(r===2)z++; else if(r===3)z--; else if(r===4)y++; else y--; } }
    // waterfalls: a spring in a cliff face spills down the drop into a pool
    for(let j=1;j<E-1;j++)for(let i=1;i<E-1;i++){
      const h=hm[j*E+i]; if(h<SEA+4) continue; const wx=x0+i-M, wz=z0+j-M;
      if(hash2(wx,wz,seed+61)>.012) continue;
      for(const [dx,dz] of DIRS){ const n=hm[(j+dz)*E+i+dx]; if(n<SEA||n>h-4) continue;
        if(BIO[bm[j*E+i]].peak) break;
        const lx=i-M, lz=j-M, fx=lx+dx, fz=lz+dz, top=h-1;
        // keep the spring enclosed by rock on its other sides
        if(inC(lx,lz)){ set(lx,top,lz,B.WATER); set(lx,top-1,lz,B.STONE); }
        if(inC(fx,fz)){ for(let y=top;y>n;y--) set(fx,y,fz,B.FALL); set(fx,n,fz,B.WATER); set(fx,n-1,fz,B.STONE); ch.falls.push([fx+x0,n,fz+z0]); }
        break; }
    }
    // trees, boulders, huge mushrooms, cacti and ice spikes: anything rooted within 5 blocks may reach into this chunk
    for(let j=1;j<E-1;j++)for(let i=1;i<E-1;i++){
      const h=hm[j*E+i], bd=BIO[bm[j*E+i]]; if(!bd.trees||h<SEA) continue;
      const wx=x0+i-M, wz=z0+j-M, r=hash2(wx,wz,seed+7);
      let kind=null, acc=0; for(const [k,d] of bd.trees){ acc+=d; if(r<acc){ kind=k; break; } }
      if(!kind) continue;
      if(h===SEA&&kind!=='swampOak') continue;
      const big=kind==='megaSpruce'||kind==='megaJungle'||kind==='dark';
      if(Math.abs(hm[j*E+i-1]-h)>1||Math.abs(hm[j*E+i+1]-h)>1||Math.abs(hm[(j-1)*E+i]-h)>1||Math.abs(hm[(j+1)*E+i]-h)>1) continue;
      if(big&&(Math.abs(hm[(j+1)*E+i+1]-h)>1)) continue;
      this.tree(kind,put,i-M,h+1,j-M,wx,wz,h);
    }
  }
  tree(kind,put,lx,y,lz,wx,wz,h){
    const seed=this.seed, R=k=>hash2(wx,wz,seed+k), H=this.H;
    const L=(x,yy,z,v)=>put(x,yy,z,v,true), F=(x,yy,z,v)=>put(x,yy,z,v,false);
    const blob=(cx,cy,cz,rx,ry,v,trim)=>{ for(let dy=-ry;dy<=ry;dy++)for(let dz=-rx;dz<=rx;dz++)for(let dx=-rx;dx<=rx;dx++){
      const d=(dx*dx+dz*dz)/(rx*rx+.01)+(dy*dy)/(ry*ry+.01); if(d>1.05) continue; if(trim&&d>.7&&hash2(wx+dx*7,wz+dz*5,seed+dy+31)<trim) continue; F(cx+dx,cy+dy,cz+dz,v); } };
    const vine=(x,yy,z,dx,dz,len)=>{ const id=VINE_OF[(-dx)+','+(-dz)]; for(let k=0;k<len;k++) F(x+dx,yy-k,z+dz,id); };
    const oakCanopy=(th,leaf,wide)=>{ for(let dy=th-2;dy<=th+1;dy++){ const r=dy<=th-1?(wide||2):1;
        for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
          if(Math.abs(dx)===r&&Math.abs(dz)===r&&hash2(wx+dx,wz+dz,seed+dy)<.6) continue;
          if(dy===th+1&&Math.abs(dx)+Math.abs(dz)>1) continue; F(lx+dx,y-1+dy,lz+dz,leaf); } } };
    switch(kind){
      case 'oak': case 'birch': { const th=(kind==='birch'?5:4)+((R(8)*3)|0); if(y+th+2>=H) return;
        oakCanopy(th,kind==='birch'?B.LEAVES_BIRCH:B.LEAVES); for(let k=0;k<th;k++) L(lx,y+k,lz,kind==='birch'?B.LOG_BIRCH:B.LOG); return; }
      case 'bigoak': { const th=6+((R(8)*3)|0); if(y+th+4>=H) return; for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG);
        blob(lx,y+th,lz,3,2,B.LEAVES,.5); for(const [dx,dz] of [[2,0],[-2,1],[0,-2]]){ L(lx+dx/2|0,y+th-2,lz+dz/2|0,B.LOG); blob(lx+dx,y+th-1,lz+dz,2,1,B.LEAVES,.4); } return; }
      case 'swampOak': { const th=4+((R(8)*2)|0); if(y+th+2>=H) return; oakCanopy(th,B.LEAVES,3); for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG);
        for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==3) continue; if(hash2(wx+dx,wz+dz,seed+71)<.45) vine(lx+dx-Math.sign(dx)*(Math.abs(dx)===3?1:0),y+th-3,lz+dz-Math.sign(dz)*(Math.abs(dz)===3?1:0),Math.abs(dx)===3?Math.sign(dx):0,Math.abs(dx)===3?0:Math.sign(dz),1+((hash2(wx+dx,wz+dz,seed+72)*4)|0)); }
        return; }
      case 'spruce': { const th=6+((R(8)*4)|0); if(y+th+2>=H) return;
        let rr=0; for(let dy=th+1;dy>=2;dy--){ const r=dy===th+1?0:dy===th?1:((th-dy)%2===0?Math.min(2,1+((th-dy)>>2)):Math.min(1,rr)); rr=r;
          for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){ if(r>0&&Math.abs(dx)===r&&Math.abs(dz)===r) continue; F(lx+dx,y-1+dy,lz+dz,B.LEAVES_SPRUCE); } }
        for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG_SPRUCE); return; }
      case 'megaSpruce': { const th=13+((R(8)*8)|0); if(y+th+2>=H) return;
        for(let dy=Math.floor(th*.45);dy<=th+1;dy++){ const t=(th+1-dy)/(th*.55), r=dy===th+1?1:Math.max(1,Math.round(t*3.4+((th-dy)%3===0?.6:0)));
          for(let dz=-r;dz<=r+1;dz++)for(let dx=-r;dx<=r+1;dx++){ const ex=dx<=0?-dx:dx-1, ez=dz<=0?-dz:dz-1; if(ex*ex+ez*ez>r*r+.5) continue; F(lx+dx,y-1+dy,lz+dz,B.LEAVES_SPRUCE); } }
        for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,B.LOG_SPRUCE);
        for(let dz=-2;dz<=3;dz++)for(let dx=-2;dx<=3;dx++) if(hash2(wx+dx,wz+dz,seed+81)<.6) put(lx+dx,y-1,lz+dz,B.PODZOL,false);
        return; }
      case 'jungle': { const th=6+((R(8)*5)|0); if(y+th+3>=H) return;
        blob(lx,y+th,lz,2,1,B.LEAVES_JUNGLE,.3); F(lx,y+th+1,lz,B.LEAVES_JUNGLE);
        for(let k=0;k<th;k++) L(lx,y+k,lz,B.LOG_JUNGLE);
        for(const [dx,dz] of DIRS) if(hash2(wx+dx,wz+dz,seed+73)<.5) vine(lx,y+th-2,lz,dx,dz,th-2-((hash2(wx,wz+dz,seed+74)*3)|0));
        for(const [dx,dz] of DIRS) if(hash2(wx-dx,wz-dz,seed+75)<.6) vine(lx+dx*2,y+th-1,lz+dz*2,dx,dz,2+((hash2(wx+dx,wz,seed+76)*4)|0));
        return; }
      case 'megaJungle': { const th=14+((R(8)*8)|0); if(y+th+4>=H) return;
        for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,B.LOG_JUNGLE);
        blob(lx,y+th,lz,4,2,B.LEAVES_JUNGLE,.35);
        for(const [dx,dz,hh] of [[3,0,.6],[-3,1,.72],[1,-3,.5],[0,3,.8]]){ const by=y+Math.floor(th*hh); L(lx+Math.sign(dx),by,lz+Math.sign(dz),B.LOG_JUNGLE); L(lx+dx-Math.sign(dx),by+1,lz+dz-Math.sign(dz),B.LOG_JUNGLE); blob(lx+dx,by+2,lz+dz,2,1,B.LEAVES_JUNGLE,.3); }
        for(const [dx,dz] of [[-1,0],[2,0],[0,-1],[0,2]]) for(let k=0;k<2;k++){ const ox=dx<0?0:dx>1?1:k, oz=dz<0?0:dz>1?1:k; if(dx&&dz) continue;
          vine(lx+(dx?(dx<0?0:1):k),y+th-1,lz+(dz?(dz<0?0:1):k),dx?Math.sign(dx):0,dz?Math.sign(dz):0,th-3-((hash2(wx+k,wz+dx+dz,seed+77)*5)|0)); }
        return; }
      case 'dark': { const th=5+((R(8)*3)|0); if(y+th+3>=H) return;
        for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,B.LOG_DARK);
        for(let dy=-1;dy<=1;dy++){ const r=dy===1?2:3; for(let dz=-r;dz<=r+1;dz++)for(let dx=-r;dx<=r+1;dx++){ const ex=dx<=0?-dx:dx-1, ez=dz<=0?-dz:dz-1;
          if(ex*ex+ez*ez>r*r+1) continue; if(ex===r&&ez===r) continue; F(lx+dx,y+th+dy,lz+dz,B.LEAVES_DARK); } }
        return; }
      case 'bush': { L(lx,y,lz,B.LOG_JUNGLE); blob(lx,y+1,lz,2,1,B.LEAVES_JUNGLE,.35); blob(lx,y,lz,1,0,B.LEAVES_JUNGLE,0); return; }
      case 'hugeR': case 'hugeB': { const th=4+((R(8)*3)|0); if(y+th+2>=H) return;
        for(let k=0;k<th;k++) L(lx,y+k,lz,B.MUSH_STEM);
        if(kind==='hugeB'){ for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){ if(Math.abs(dx)===3&&Math.abs(dz)===3) continue; L(lx+dx,y+th,lz+dz,B.CAP_BR); } }
        else { for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++) L(lx+dx,y+th,lz+dz,B.CAP_R);
          for(let dy=-3;dy<=-1;dy++) for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==2||Math.abs(dx)===2&&Math.abs(dz)===2) continue; L(lx+dx,y+th+dy,lz+dz,B.CAP_R); } }
        return; }
      case 'cactus': { if(!this._sandAt(put,lx,y-1,lz)) return; const n=1+((R(8)*3)|0); for(let k=0;k<n;k++) put(lx,y+k,lz,B.CACTUS,false); return; }
      case 'spike': { const th=4+((R(8)*(R(9)<.15?14:6))|0), w=th>9?2:1; if(y+th+1>=H) return;
        for(let k=0;k<th;k++){ const r=Math.max(0,Math.round(w*(1-k/th)+.2)); for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){ if(r>0&&Math.abs(dx)+Math.abs(dz)>r) continue; L(lx+dx,y-1+k,lz+dz,B.PACKED_ICE); } }
        return; }
      case 'boulder': { const r=1+((R(8)*2)|0), v=R(9)<.65?B.MOSSY_COBBLE:B.COBBLE;
        for(let dy=-1;dy<=r;dy++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){ if(dx*dx+dy*dy+dz*dz>r*r+.6) continue; L(lx+dx,y+dy,lz+dz,hash2(wx+dx,wz+dz,seed+dy+90)<.5?B.MOSSY_COBBLE:v); }
        return; }
    }
  }
  _sandAt(put,lx,y,lz){ return true; }
}
'''
rep("/* ---------- WebGL ---------- */", GEN2+"\n/* ---------- WebGL ---------- */")
# DIRS must exist before Generator2 uses it at runtime (it is a top-level const); check
rep("    this.gen=new Generator(this.seed,this.size,this.H);",
    "    this.gen=meta.gen===2?new Generator2(this.seed,this.size,this.H):new Generator(this.seed,this.size,this.H);")
# new worlds and the title preview use the new generator and a taller world
rep("const meta={id:'preview',name:'Preview',seedNum:seedFrom('strata'),size:100,height:50};",
    "const meta={id:'preview',name:'Preview',seedNum:seedFrom('strata'),size:100,height:56,gen:2};")
rep("size:pickedSize,height:50,gameMode:pickedGM,","size:pickedSize,height:64,gen:2,gameMode:pickedGM,")
# spawn: land, not ocean or mountain
rep("""    const h=g.height(x,z); if(h>SEA+1&&h<33) return [x+.5,h+1,z+.5];}
  return [cx+.5,g.height(cx,cz)+1,cz+.5];""","""    if(g.v2){ const h=g.spawnOK(x,z); if(h) return [x+.5,h+1,z+.5]; continue; }
    const h=g.height(x,z); if(h>SEA+1&&h<33) return [x+.5,h+1,z+.5];}
  if(g.v2) for(let r=200;r<Math.min(3000,world.size);r+=8)for(let a=0;a<16;a++){ const x=Math.max(2,Math.min(world.size-3,cx+Math.round(Math.cos(a*Math.PI/8)*r))),z=Math.max(2,Math.min(world.size-3,cz+Math.round(Math.sin(a*Math.PI/8)*r)));
    const h=g.spawnOK(x,z); if(h) return [x+.5,h+1,z+.5]; }
  return [cx+.5,Math.max(SEA+1,g.height(cx,cz))+1,cz+.5];""")
open(F,'w').write(s)
print('ok')
