
// tree shapes added in stage 14; Generator2.tree hands them its helpers. g = {L,F,blob,R,lx,y,lz,wx,wz,H,seed,put}
const WOOD_BY=k=>WOODS.find(w=>w.k===k);
const EXTRA_TREE={
  acacia(g,giant){ const w=WOOD_BY('acacia'), {L,F,R,lx,y,lz,H}=g; const th=(giant?7:5)+((R(8)*2)|0); if(y+th+4>=H) return;
    const sz=giant?2:1, trunk=(x,z,yy)=>{ for(let a=0;a<sz;a++)for(let c=0;c<sz;c++) L(x+a,yy,z+c,w.log); };
    const flat=(cx,cy,cz,r)=>{ for(let dz=-r;dz<=r+sz-1;dz++)for(let dx=-r;dx<=r+sz-1;dx++){ const ex=dx<0?-dx:Math.max(0,dx-sz+1), ez=dz<0?-dz:Math.max(0,dz-sz+1); if(ex+ez>r+1||ex===r&&ez===r) continue; F(cx+dx,cy,cz+dz,w.leaves); }
      for(let dz=-1;dz<=sz;dz++)for(let dx=-1;dx<=sz;dx++) F(cx+dx,cy+1,cz+dz,w.leaves); };
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]], d=dirs[(R(9)*4)|0]; let x=lx, z=lz; const bend=2+((R(10)*2)|0);
    for(let k=0;k<th;k++){ if(k>=bend&&k<th-1){ x+=d[0]; z+=d[1]; } trunk(x,z,y+k); } flat(x,y+th-1,z,giant?3:2);
    if(R(11)<.6||giant){ const e=dirs[(R(12)*4)|0]; if(e!==d){ let bx=lx, bz=lz; for(let k=bend;k<bend+3;k++){ bx+=e[0]; bz+=e[1]; trunk(bx,bz,y+k); } flat(bx,y+bend+2,bz,giant?2:1); } } },
  mangrove(g,giant){ const w=WOOD_BY('mangrove'), {L,F,blob,R,lx,y,lz,H}=g; const th=(giant?9:5)+((R(8)*3)|0), sz=giant?2:1; if(y+th+4>=H) return;
    for(let k=0;k<th;k++) for(let a=0;a<sz;a++)for(let c=0;c<sz;c++) L(lx+a,y+k+1,lz+c,w.log);
    for(const [dx,dz] of [[-1,0],[sz,0],[0,-1],[0,sz],[-1,-1],[sz,sz]]) { if(R(dx*3+dz+20)<.35) continue; L(lx+dx,y+1,lz+dz,w.log); L(lx+dx,y,lz+dz,w.log); }
    blob(lx,y+th+1,lz,giant?4:3,2,w.leaves,.3); },
  cherry(g,giant){ const w=WOOD_BY('cherry'), {L,blob,R,lx,y,lz,H}=g; const th=(giant?6:4)+((R(8)*2)|0), sz=giant?2:1; if(y+th+6>=H) return;
    for(let k=0;k<th;k++) for(let a=0;a<sz;a++)for(let c=0;c<sz;c++) L(lx+a,y+k,lz+c,w.log);
    const arms=giant?[[1,0],[-1,0],[0,1],[0,-1]]:(R(9)<.5?[[1,0],[-1,0]]:[[0,1],[0,-1]]);
    for(const [dx,dz] of arms){ let x=lx+(dx>0?sz-1:0), z=lz+(dz>0?sz-1:0), yy=y+th-1; const n=giant?4:3; for(let k=0;k<n;k++){ x+=dx; z+=dz; if(k>0) yy++; L(x,yy,z,w.log); } blob(x,yy+1,z,giant?4:3,2,w.leaves,.25); } },
  paleOak(g){ const w=WOOD_BY('pale'), {L,F,R,lx,y,lz,H}=g; const th=6+((R(8)*3)|0); if(y+th+3>=H) return;
    for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,w.log);
    for(let dy=-1;dy<=1;dy++){ const r=dy===1?2:3; for(let dz=-r;dz<=r+1;dz++)for(let dx=-r;dx<=r+1;dx++){ const ex=dx<=0?-dx:dx-1, ez=dz<=0?-dz:dz-1; if(ex*ex+ez*ez>r*r+1||ex===r&&ez===r) continue; F(lx+dx,y+th+dy,lz+dz,w.leaves); } } },
  giantOak(g){ const {L,blob,R,lx,y,lz,H}=g; const th=10+((R(8)*5)|0); if(y+th+6>=H) return;
    for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,B.LOG);
    blob(lx,y+th,lz,5,3,B.LEAVES,.45);
    for(const [dx,dz,hh] of [[4,0,.6],[-3,1,.7],[1,-4,.55],[0,4,.75]]){ const by=y+Math.floor(th*hh); for(let k=1;k<=3;k++) L(lx+Math.round(dx*k/4),by+(k>>1),lz+Math.round(dz*k/4),B.LOG); blob(lx+dx,by+2,lz+dz,3,2,B.LEAVES,.4); } },
  giantBirch(g){ const w=WOOD_BY('birch'), {L,blob,R,lx,y,lz,H}=g; const th=12+((R(8)*5)|0); if(y+th+4>=H) return;
    for(let k=0;k<th;k++) for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]) L(lx+a,y+k,lz+c,w.log);
    for(let k=0;k<4;k++) blob(lx,y+th-6+k*2,lz,4-(k>>1),2,w.leaves,.4); },
  fungus(g,giant,k){ const w=WOOD_BY(k), {L,F,R,lx,y,lz,H}=g; const th=(giant?9:4)+((R(8)*(giant?4:3))|0), sz=giant?2:1, r=giant?4:2; if(y+th+3>=H) return;
    for(let i=0;i<th;i++) for(let a=0;a<sz;a++)for(let c=0;c<sz;c++) L(lx+a,y+i,lz+c,w.log);
    for(let dy=-2;dy<=1;dy++) for(let dz=-r;dz<=r+sz-1;dz++)for(let dx=-r;dx<=r+sz-1;dx++){ const ex=dx<0?-dx:Math.max(0,dx-sz+1), ez=dz<0?-dz:Math.max(0,dz-sz+1), rr=dy===1?r-1:r;
      if(ex*ex+ez*ez>rr*rr+.5) continue; if(dy<0&&Math.max(ex,ez)<rr-.5) continue; L(lx+dx,y+th+dy,lz+dz,w.leaves); } }
};
EXTRA_TREE.giantAcacia=g=>EXTRA_TREE.acacia(g,1); EXTRA_TREE.giantMangrove=g=>EXTRA_TREE.mangrove(g,1); EXTRA_TREE.giantCherry=g=>EXTRA_TREE.cherry(g,1);
EXTRA_TREE.crimsonF=g=>EXTRA_TREE.fungus(g,0,'crimson'); EXTRA_TREE.warpedF=g=>EXTRA_TREE.fungus(g,0,'warped');
EXTRA_TREE.giantCrimson=g=>EXTRA_TREE.fungus(g,1,'crimson'); EXTRA_TREE.giantWarped=g=>EXTRA_TREE.fungus(g,1,'warped');
const BIG_TREES=new Set(['megaSpruce','megaJungle','dark','paleOak','giantOak','giantBirch','giantAcacia','giantMangrove','giantCherry','giantCrimson','giantWarped']);
const TREE_KIND={oak:'oak',birch:'birch',spruce:'spruce',jungle:'jungle',acacia:'acacia',mangrove:'mangrove',cherry:'cherry',crimson:'crimsonF',warped:'warpedF'};
const GIANT_KIND={oak:'giantOak',birch:'giantBirch',spruce:'megaSpruce',jungle:'megaJungle',dark:'dark',pale:'paleOak',acacia:'giantAcacia',mangrove:'giantMangrove',cherry:'giantCherry',crimson:'giantCrimson',warped:'giantWarped'};
