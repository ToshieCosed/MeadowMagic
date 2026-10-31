
/* ---------- stage 18: light is kept per chunk and only re-solved where blocks change ----------
   Every chunk stores its own light (sky r,g,b and block r,g,b, 4 bits each, packed in one Uint32 per cell).
   • a new chunk is lit once, in a box that also covers 15 blocks of any lit neighbour, so light flows across chunk seams
   • placing or breaking a block that changes light (opacity, tint, glow) re-solves a box around it: 15 blocks each way,
     and down the column it shades or opens. Light can't travel further than 15, so everything outside the box stays right
   • any other edit (crops, doors, water levels…) reuses the stored light and only re-meshes */
const LT_FULL=0xFFF;
function ltNew(w,ch){ ch.lh=Math.min(w.H,(ch.top||w.H)+16); ch.lt=new Uint32Array(CS*CS*ch.lh); }
function ltGrow(ch,need,H){ const nh=Math.min(H,need); if(nh<=ch.lh) return; const a=new Uint32Array(CS*CS*nh); a.set(ch.lt); a.fill(LT_FULL,CS*CS*ch.lh); ch.lt=a; ch.lh=nh; }
const lightDiff=(a,b)=>LOPQ[a]!==LOPQ[b]||LATT[a]!==LATT[b]||TINT[a]!==TINT[b]||EMIT[a]!==EMIT[b]||LAVAID[a]!==LAVAID[b];
let RLS=null; const RL_STATS={boxes:0,cells:0,ms:0};
function rlScratch(n){ if(!RLS||RLS.n<n){ const m=Math.ceil(n*1.3); RLS={n:m,id:new Uint16Array(m),fx:new Uint8Array(m),a:[0,1,2,3,4,5].map(()=>new Uint8Array(m)),q:new Int32Array(m*2)}; } return RLS; }
function rlFlood(R,G,Bc,dec,DX,DZ,DY,id,fx,q,qt,QN){
  const DXZ=DX*DZ; let qh=0;
  while(qh!==qt){ const i=q[qh]; qh++; if(qh===QN) qh=0;
    const r=R[i],g=G[i],b=Bc[i]; if(r<=dec&&g<=dec&&b<=dec) continue;
    const x=i%DX, t=(i-x)/DX, z=t%DZ, y=(t-z)/DZ;
    for(let k=0;k<6;k++){ let j;
      if(k===0){ if(x===DX-1) continue; j=i+1; } else if(k===1){ if(x===0) continue; j=i-1; }
      else if(k===2){ if(z===DZ-1) continue; j=i+DX; } else if(k===3){ if(z===0) continue; j=i-DX; }
      else if(k===4){ if(y===DY-1) continue; j=i+DXZ; } else { if(y===0) continue; j=i-DXZ; }
      if(fx[j]) continue; const bid=id[j]; if(LOPQ[bid]) continue;
      const d=dec+LATT[bid]; let nr=r-d, ng=g-d, nb=b-d; const tn=TINT[bid]; if(tn){ nr=nr*tn[0]|0; ng=ng*tn[1]|0; nb=nb*tn[2]|0; }
      let ch=false; if(nr>R[j]){ R[j]=nr; ch=true; } if(ng>G[j]){ G[j]=ng; ch=true; } if(nb>Bc[j]){ Bc[j]=nb; ch=true; }
      if(ch){ q[qt]=j; qt++; if(qt===QN) qt=0; } } } }
function markMeshAround(w,ch,lx,lz){ ch.dirty=true;
  const ox=lx===0?-1:lx===CS-1?1:0, oz=lz===0?-1:lz===CS-1?1:0; if(!ox&&!oz) return;
  for(const [a,b] of [[ox,0],[0,oz],[ox,oz]]) if(a||b){ const n=w.chunk(ch.cx+a,ch.cz+b); if(n) n.dirty=true; } }
// re-solve light in world box [X0..X1]×[Y0..Y1]×[Z0..Z1]; cells just outside it are kept and act as light sources
function relight(w,X0,X1,Z0,Z1,Y0,Y1){
  X0=Math.max(0,X0); Z0=Math.max(0,Z0); X1=Math.min(w.size-1,X1); Z1=Math.min(w.size-1,Z1); Y0=Math.max(0,Y0); Y1=Math.min(w.H-1,Y1);
  if(X0>X1||Z0>Z1||Y0>Y1) return; const t0=performance.now();
  const H=w.H, DX=X1-X0+3, DZ=Z1-Z0+3, DY=Y1-Y0+3, DXZ=DX*DZ, N=DXZ*DY, S=rlScratch(N), id=S.id, fx=S.fx, q=S.q, QN=q.length;
  const [SR2,SG2,SB2,BR2,BG2,BB2]=S.a;
  for(let k=0;k<DZ;k++) for(let i=0;i<DX;i++){
    const wx=X0-1+i, wz=Z0-1+k, c0=k*DX+i;
    const ch=(wx<0||wz<0||wx>=w.size||wz>=w.size)?null:w.chunk(wx>>4,wz>>4), lt=ch&&ch.lt;
    if(!lt){ for(let j=0;j<DY;j++){ const o=c0+j*DXZ; id[o]=0; fx[o]=1; SR2[o]=SG2[o]=SB2[o]=BR2[o]=BG2[o]=BB2[o]=0; } continue; }
    const edge=i===0||k===0||i===DX-1||k===DZ-1, bl=ch.blocks, top=Math.min(H,ch.top||H), cb=(wz&15)*CS+(wx&15);
    let r=15,g=15,b=15;
    if(!edge) for(let y=top-1;y>Y1;y--){ const bid=bl[y*256+cb]; if(LOPQ[bid]){ r=g=b=0; break; }
      const a=LATT[bid]; if(a){ r=r>a?r-a:0; g=g>a?g-a:0; b=b>a?b-a:0; } const tn=TINT[bid]; if(tn){ r=r*tn[0]|0; g=g*tn[1]|0; b=b*tn[2]|0; } }
    for(let j=DY-1;j>=0;j--){ const y=Y0-1+j, o=c0+j*DXZ;
      if(y<0){ id[o]=0; fx[o]=1; SR2[o]=SG2[o]=SB2[o]=BR2[o]=BG2[o]=BB2[o]=0; continue; }
      if(y>=H){ id[o]=0; fx[o]=1; SR2[o]=SG2[o]=SB2[o]=15; BR2[o]=BG2[o]=BB2[o]=0; continue; }
      const bid=y<top?bl[y*256+cb]:0; id[o]=bid;
      if(edge||j===0||j===DY-1){ fx[o]=1; const p=y>=ch.lh?LT_FULL:lt[y*256+cb];
        SR2[o]=p&15; SG2[o]=p>>4&15; SB2[o]=p>>8&15; BR2[o]=p>>12&15; BG2[o]=p>>16&15; BB2[o]=p>>20&15; continue; }
      fx[o]=0;
      if(LOPQ[bid]) r=g=b=0; else { const a=LATT[bid]; if(a){ r=r>a?r-a:0; g=g>a?g-a:0; b=b>a?b-a:0; } const tn=TINT[bid]; if(tn){ r=r*tn[0]|0; g=g*tn[1]|0; b=b*tn[2]|0; } }
      SR2[o]=r; SG2[o]=g; SB2[o]=b;
      let e=EMIT[bid]; if(e&&LAVAID[bid]&&y+1<top&&LAVAID[bl[(y+1)*256+cb]]) e=null;
      if(e){ BR2[o]=e[0]; BG2[o]=e[1]; BB2[o]=e[2]; } else BR2[o]=BG2[o]=BB2[o]=0; } }
  // sky: open-air cells surrounded by open air can't brighten anything, so they don't need to spread
  let qt=0; const full=n=>LOPQ[id[n]]||(SR2[n]===15&&SG2[n]===15&&SB2[n]===15);
  for(let o=0;o<N;o++){ const r=SR2[o],g=SG2[o],b=SB2[o]; if(!(r|g|b)) continue;
    if(!fx[o]&&r===15&&g===15&&b===15&&full(o-1)&&full(o+1)&&full(o-DX)&&full(o+DX)&&full(o-DXZ)) continue;
    q[qt++]=o; }
  rlFlood(SR2,SG2,SB2,1,DX,DZ,DY,id,fx,q,qt,QN);
  qt=0; for(let o=0;o<N;o++) if(BR2[o]|BG2[o]|BB2[o]) q[qt++]=o;
  rlFlood(BR2,BG2,BB2,1,DX,DZ,DY,id,fx,q,qt,QN);
  // write back, marking the chunks (and the neighbours that share a changed border) for re-meshing
  for(let k=1;k<DZ-1;k++) for(let i=1;i<DX-1;i++){ const wx=X0-1+i, wz=Z0-1+k, ch=w.chunk(wx>>4,wz>>4); if(!ch||!ch.lt) continue;
    const cb=(wz&15)*CS+(wx&15); let changed=false;
    for(let j=1;j<DY-1;j++){ const o=(j*DZ+k)*DX+i, y=Y0-1+j, p=SR2[o]|SG2[o]<<4|SB2[o]<<8|BR2[o]<<12|BG2[o]<<16|BB2[o]<<20;
      if(y>=ch.lh){ if(p===LT_FULL) continue; ltGrow(ch,y+8,H); }
      const ix=y*256+cb; if(ch.lt[ix]!==p){ ch.lt[ix]=p; changed=true; } }
    if(changed) markMeshAround(w,ch,wx&15,wz&15); }
  RL_STATS.boxes++; RL_STATS.cells+=N; RL_STATS.ms+=performance.now()-t0;
}
// first light for a freshly generated chunk: solve it alone, with the light at its neighbours' edges as sources,
// then let its own edge light spread outwards into the neighbours (only cells that actually get brighter are touched)
function lightChunk(w,ch){ ltNew(w,ch); const x0=ch.cx*CS, z0=ch.cz*CS; let top=ch.top||0;
  for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const n=w.chunk(ch.cx+a,ch.cz+b); if(n&&n.lt) top=Math.max(top,n.top||0); }
  const Y1=Math.min(w.H-1,top+15); relight(w,x0,x0+15,z0,z0+15,0,Y1);
  const sd=[]; for(let y=0;y<=Y1;y++) for(let k=0;k<CS;k++){ sd.push(x0+k,y,z0, x0+k,y,z0+15, x0,y,z0+k, x0+15,y,z0+k); } ltSpread(w,sd); }
// increase-only flood straight on the chunk stores, from a list of seed cells [x,y,z,…]
let SPQ=new Int32Array(1<<18);
function ltSpread(w,sd){ let N=SPQ.length; if(sd.length*2>N){ SPQ=new Int32Array(1<<Math.ceil(Math.log2(sd.length*2))); N=SPQ.length; }
  const Q=SPQ, H=w.H, S=w.size; let qh=0, qt=0; for(let i=0;i<sd.length;i++) Q[qt++]=sd[i];
  let cc=null, ccx=-1, ccz=-1; const chunkAt=(x,z)=>{ const cx=x>>4, cz=z>>4; if(cx!==ccx||cz!==ccz){ ccx=cx; ccz=cz; cc=w.chunk(cx,cz); } return cc; };
  const get=(c,x,y,z)=>y>=c.lh?LT_FULL:c.lt[(y*CS+(z&15))*CS+(x&15)];
  while(qh!==qt){ const x=Q[qh], y=Q[qh+1], z=Q[qh+2]; qh+=3; if(qh>=N) qh=0;
    const c0=chunkAt(x,z); if(!c0||!c0.lt) continue; const p=get(c0,x,y,z);
    const sr=p&15, sg=p>>4&15, sb=p>>8&15, br=p>>12&15, bg=p>>16&15, bb=p>>20&15; if(sr<2&&sg<2&&sb<2&&br<2&&bg<2&&bb<2) continue;
    for(let k=0;k<6;k++){ const nx=x+(k===0?1:k===1?-1:0), ny=y+(k===4?1:k===5?-1:0), nz=z+(k===2?1:k===3?-1:0);
      if(nx<0||nz<0||nx>=S||nz>=S||ny<0||ny>=H) continue; const c=chunkAt(nx,nz); if(!c||!c.lt) continue;
      const bid=ny<(c.top||H)?c.blocks[(ny*CS+(nz&15))*CS+(nx&15)]:0; if(LOPQ[bid]) continue;
      const d=1+LATT[bid], tn=TINT[bid]; let r1=sr-d, g1=sg-d, b1=sb-d, r2=br-d, g2=bg-d, b2=bb-d;
      if(tn){ r1=r1*tn[0]|0; g1=g1*tn[1]|0; b1=b1*tn[2]|0; r2=r2*tn[0]|0; g2=g2*tn[1]|0; b2=b2*tn[2]|0; }
      const q=get(c,nx,ny,nz); let qr=q&15, qg=q>>4&15, qb=q>>8&15, pr=q>>12&15, pg=q>>16&15, pb=q>>20&15, ch=false;
      if(r1>qr){ qr=r1; ch=true; } if(g1>qg){ qg=g1; ch=true; } if(b1>qb){ qb=b1; ch=true; } if(r2>pr){ pr=r2; ch=true; } if(g2>pg){ pg=g2; ch=true; } if(b2>pb){ pb=b2; ch=true; }
      if(!ch) continue; if(ny>=c.lh) ltGrow(c,ny+8,H);
      c.lt[(ny*CS+(nz&15))*CS+(nx&15)]=qr|qg<<4|qb<<8|pr<<12|pg<<16|pb<<20; markMeshAround(w,c,nx&15,nz&15);
      Q[qt]=nx; Q[qt+1]=ny; Q[qt+2]=nz; qt+=3; if(qt>=N) qt=0; if(qt===qh) throw new Error('light queue overflow'); } } }
// queue a light update for a changed block. A change that can only brighten (mining, a torch going down) re-solves just
// that column and spreads outwards; anything that can darken re-solves a box around it. Updates in one frame are merged
const emitGE=(a,b)=>!b||(a&&a[0]>=b[0]&&a[1]>=b[1]&&a[2]>=b[2]);
function lightQueue(w,x,y,z,ch,old,v){ const bl=ch.blocks, cb=(z&15)*CS+(x&15), top=Math.min(w.H,ch.top||w.H);
  let roof=false; for(let yy=y+1;yy<top;yy++) if(LOPQ[bl[yy*256+cb]]){ roof=true; break; }
  let lo=y; if(!roof){ lo=y-1; while(lo>0&&!LOPQ[bl[lo*256+cb]]) lo--; }
  if(old!==undefined&&LOPQ[v]<=LOPQ[old]&&LATT[v]<=LATT[old]&&!TINT[v]&&emitGE(EMIT[v],EMIT[old])&&!LAVAID[v]&&!LAVAID[old]){ (w.rlInc||(w.rlInc=[])).push([x,z,Math.min(y,lo+1),y]); return; }
  (w.rlq||(w.rlq=[])).push([x-15,x+15,z-15,z+15,Math.min(y,lo+1)-15,y+15]); }
function lightFlush(w){ const Q=w.rlq; if(!Q||!Q.length) return lightFlushInc(w); w.rlq=[];
  const out=[]; for(const b of Q){ let m=b, merged=true;
    while(merged){ merged=false; for(let i=0;i<out.length;i++){ const o=out[i];
      if(m[0]<=o[1]+1&&o[0]<=m[1]+1&&m[2]<=o[3]+1&&o[2]<=m[3]+1&&m[4]<=o[5]+1&&o[4]<=m[5]+1){ m=[Math.min(m[0],o[0]),Math.max(m[1],o[1]),Math.min(m[2],o[2]),Math.max(m[3],o[3]),Math.min(m[4],o[4]),Math.max(m[5],o[5])]; out.splice(i,1); merged=true; break; } } }
    out.push(m); }
  for(const b of out) relight(w,...b); lightFlushInc(w); }
function lightFlushInc(w){ const Q=w.rlInc; if(!Q||!Q.length) return; w.rlInc=[];
  for(const [x,z,y0,y1] of Q){ relight(w,x,x,z,z,y0,y1); const sd=[]; for(let y=y0;y<=y1;y++) sd.push(x,y,z); ltSpread(w,sd); } }

// copy stored light around a chunk into the mesher's arrays (one block of apron is all smooth lighting reads)
function fillLight(w,ch,LH){ const x0=ch.cx*CS, z0=ch.cz*CS, PP2=PP*PP;
  for(let z=-1;z<=CS;z++) for(let x=-1;x<=CS;x++){ const wx=x0+x, wz=z0+z;
    const c=(wx<0||wz<0||wx>=w.size||wz>=w.size)?null:(x>=0&&x<CS&&z>=0&&z<CS)?ch:w.chunk(wx>>4,wz>>4);
    const lt=c&&c.lt, lh=lt?c.lh:0, cb=(wz&15)*CS+(wx&15), base=(z+LM)*PP+(x+LM);
    for(let y=0;y<LH;y++){ const i=y*PP2+base, p=lt&&y<lh?lt[y*256+cb]:LT_FULL;
      SR[i]=p&15; SG[i]=p>>4&15; SBL[i]=p>>8&15; BR[i]=p>>12&15; BG[i]=p>>16&15; BBL[i]=p>>20&15; } } }
