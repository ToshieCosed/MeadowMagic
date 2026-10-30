
/* ---------- stage 17: world depth presets and caves ---------- */
const DEPTHS={mini:{height:64,sea:19,ha:1,ma:1,oa:1,name:'Mini'},classic:{height:128,sea:63,ha:1.5,ma:2.1,oa:2,name:'Classic'},full:{height:256,sea:63,ha:2.2,ma:5.6,oa:2.4,name:'Full'}};
// improved Perlin noise in 3D, roughly -1…1
function makeNoise3(seed){ const r=mulberry32(seed), q=[]; for(let i=0;i<256;i++) q[i]=i; for(let i=255;i>0;i--){ const j=(r()*(i+1))|0, t=q[i]; q[i]=q[j]; q[j]=t; }
  const p=new Uint8Array(512); for(let i=0;i<512;i++) p[i]=q[i&255];
  const fade=t=>t*t*t*(t*(t*6-15)+10), L=(a,b,t)=>a+t*(b-a), G=(h,x,y,z)=>{ h&=15; const u=h<8?x:y, v=h<4?y:(h===12||h===14?x:z); return ((h&1)?-u:u)+((h&2)?-v:v); };
  return (x,y,z)=>{ const fx=Math.floor(x), fy=Math.floor(y), fz=Math.floor(z), X=fx&255, Y=fy&255, Z=fz&255; x-=fx; y-=fy; z-=fz; const u=fade(x), v=fade(y), w=fade(z);
    const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z, B2=p[X+1]+Y, BA=p[B2]+Z, BB=p[B2+1]+Z;
    return L(L(L(G(p[AA],x,y,z),G(p[BA],x-1,y,z),u),L(G(p[AB],x,y-1,z),G(p[BB],x-1,y-1,z),u),v),L(L(G(p[AA+1],x,y,z-1),G(p[BA+1],x-1,y,z-1),u),L(G(p[AB+1],x,y-1,z-1),G(p[BB+1],x-1,y-1,z-1),u),v),w); }; }
// Caves in the spirit of 1.16 carvers plus 1.18 noise caves, kept underground: big "cheese" caverns (more of them deeper down),
// long "spaghetti" tunnels, thin "noodle" passages, the odd ravine, flooded caverns (aquifers) and lava lakes near the bottom.
// The surface stays as it was except for occasional cave mouths, and nothing is carved close under oceans or rivers.
function carveCaves(g,ch,b,H,x0,z0,hAt,size){
  if(!g.c3){ const s=g.seed; g.c3={ch:makeNoise3(s+301),ch2:makeNoise3(s+311),sa:makeNoise3(s+302),sb:makeNoise3(s+303),na:makeNoise3(s+304),nb:makeNoise3(s+305),m:makeNoise3(s+306)}; g.cEnt=makeNoise(s+307); g.cRav=makeNoise(s+308); g.cRavM=makeNoise(s+309); g.cAq=makeNoise(s+310); }
  const N=g.c3, S=SEA, idx=(x,y,z)=>(y*CS+z)*CS+x;
  let top=0; for(let z=0;z<CS;z++) for(let x=0;x<CS;x++) top=Math.max(top,hAt(x,z)); top=Math.min(H-2,top);
  const NY=(top>>2)+2, lat=new Float32Array(5*5*NY);
  const lavaY=Math.max(3,Math.round(S*.16)), deepK=S*.75;
  for(let k=0;k<NY;k++) for(let j=0;j<5;j++) for(let i=0;i<5;i++){ const x=x0+i*4, y=k*4, z=z0+j*4;
    const deep=sat((deepK-y)/deepK);
    const cheese=(N.ch(x*.016,y*.03,z*.016)*.7+N.ch2(x*.045,y*.07,z*.045)*.3)-(.34-.16*deep);
    const a=N.sa(x*.011,y*.021,z*.011), c=N.sb(x*.011,y*.021,z*.011), rad=.066+.025*N.m(x*.008,y*.012,z*.008);
    const spag=(rad-Math.sqrt(a*a+c*c))*5;
    const na=N.na(x*.03,y*.045,z*.03), nb=N.nb(x*.03,y*.045,z*.03), nood=(.035-Math.sqrt(na*na+nb*nb))*4;
    lat[(k*5+j)*5+i]=Math.max(cheese,spag,nood); }
  const LV=(i,j,k)=>lat[(k*5+j)*5+i];
  for(let z=0;z<CS;z++) for(let x=0;x<CS;x++){ const wx=x0+x, wz=z0+z; if(wx>=size||wz>=size) continue; const h=hAt(x,z);
    // keep well clear of seas, lakes and rivers nearby, and of the surface unless this is a cave mouth
    let hmin=h; for(let dz=-2;dz<=2;dz++) for(let dx=-2;dx<=2;dx++){ const n=hAt(x+dx,z+dz); if(n>=0&&n<hmin) hmin=n; }
    const wet=hmin<S, mouth=!wet&&g.cEnt(wx*.018,wz*.018)>.6, roof=wet?hmin-7:mouth?h+1:h-5;
    // lakes: each 48×48 region either holds a flat water table, a lava lake at the bottom, or neither; stone walls separate neighbours below their levels
    const RS=48, rx=Math.floor(wx/RS), rz=Math.floor(wz/RS), mx=wx-rx*RS, mz=wz-rz*RS;
    const wl=(a,c)=>hash2(a,c,g.seed+77)<.3?Math.floor(S*.2+hash2(a,c,g.seed+78)*S*.22):-1, ll=(a,c)=>hash2(a,c,g.seed+79)<.45?lavaY:-1;
    const aq=wl(rx,rz), lv=ll(rx,rz); let wall=-1;
    if(mx<2||mx>RS-3||mz<2||mz>RS-3){ const nx=rx+(mx<2?-1:mx>RS-3?1:0), nz=rz+(mz<2?-1:mz>RS-3?1:0);
      for(const [a,c] of [[nx,rz],[rx,nz],[nx,nz]]) if(a!==rx||c!==rz){ const o=Math.max(wl(a,c),ll(a,c)); if(o!==Math.max(aq,lv)) wall=Math.max(wall,o,aq,lv); } }
    // ravines: a narrow 2D crack, deepest in the middle
    const rv=Math.abs(g.cRav(wx*.0045,wz*.0045)), rm=g.cRavM(wx*.003+17,wz*.003-5), ravW=rm>.45&&!wet?.014:0, ravD=Math.round((18+rm*30)*(g.ky>1?1.6:1));
    const ix=x>>2, fx=(x&3)/4, iz=z>>2, fz=(z&3)/4, ymax=Math.min(ravW?Math.max(h,roof):roof,top);
    for(let y=2;y<=ymax;y++){ const ik=y>>2, fy=(y&3)/4;
      const c00=LV(ix,iz,ik)+(LV(ix+1,iz,ik)-LV(ix,iz,ik))*fx, c10=LV(ix,iz+1,ik)+(LV(ix+1,iz+1,ik)-LV(ix,iz+1,ik))*fx;
      const c01=LV(ix,iz,ik+1)+(LV(ix+1,iz,ik+1)-LV(ix,iz,ik+1))*fx, c11=LV(ix,iz+1,ik+1)+(LV(ix+1,iz+1,ik+1)-LV(ix,iz+1,ik+1))*fx;
      let c=(c00+(c10-c00)*fz)+((c01+(c11-c01)*fz)-(c00+(c10-c00)*fz))*fy;
      if(y<5) c-=(5-y)*.08;                                         // the floor of the world stays mostly solid
      let cut=c>0&&y<=roof;
      if(!cut&&ravW&&y>h-ravD&&y<=h){ const t=(h-y)/ravD; cut=rv<ravW*(1-t*t)*(1+.4*(y>h-3)); }
      if(!cut||y<=wall) continue; const i=idx(x,y,z), cur=b[i]; if(cur===B.BEDROCK||cur===B.WATER||cur===0&&y>h) continue;
      b[i]=y<=lv?B.LAVA:(y<=aq&&y<h-6)?B.WATER:B.AIR;
      if(y===h){ const up=idx(x,y+1,z); if(y+1<H&&b[up]&&BLOCKS[b[up]].replace) b[up]=B.AIR; } }
  } }
