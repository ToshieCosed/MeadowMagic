import sys
SP='/tmp/claude-0/-home-claude/e7a74ccc-fd27-5102-8793-4bba792e7d12/scratchpad/'
F='/home/claude/strata.html'; s=open(F).read()
def RG(a,b):
    global s
    i=s.index('class Generator2{'); j=s.index('\nclass ',i+10); seg=s[i:j]
    if seg.count(a)!=1: sys.exit('gen anchor x%d: %r'%(seg.count(a),a[:80]))
    s=s[:i]+seg.replace(a,b)+s[j:]
def R(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit('anchor x%d: %r'%(n,a[:90]))
    s=s.replace(a,b)
R("const SEA = 19;","let SEA = 19;   // sea level of the current overworld (19 in Mini worlds, 63 in Classic and Full)")
# generator: scale per preset
R("    this.b=0; this.river=false;\n  }","    this.b=0; this.river=false; this.ha=1; this.ma=1; this.oa=1; this.ky=1; this.caves=false;\n  }")
R("h=SEA-1.5-d*12+det*.8+hills*1.6; }","h=SEA-(1.5+d*12-det*.8-hills*1.6)*this.oa; }")
R("h=SEA+1+land*(2.5+hills*5+Math.max(0,hills)*4+det*1.2)+mm*land*(rg*rg*25+hills*4);","h=SEA+1+land*(2.5+hills*5+Math.max(0,hills)*4+det*1.2)*this.ha+mm*land*(rg*rg*25+hills*4)*this.ma;")
R("let T=T0-Math.max(0,h-SEA-10)*.035;","let T=T0-Math.max(0,(h-SEA)/this.ma-10)*.035;")
R("h+=bad*Math.floor(pl/4)*4;","h+=bad*Math.floor(pl*this.ha/4)*4;")
R("hi<SEA-8?BI.deep_ocean","hi<SEA-8*this.oa?BI.deep_ocean")
R("else if(mm>.4&&hi>SEA+12) b=hi>SEA+25||","else if(mm>.4&&hi>SEA+12*this.ma) b=hi>SEA+25*this.ma||")
R("return h>SEA+1&&h<SEA+16&&!bd.sea","return h>SEA+1&&h<SEA+16*this.ha&&!bd.sea")
R("else if(slope>=3||h>SEA+22){ top=fill=B.STONE; } }","else if(slope>=3*this.ha||h>SEA+22*this.ma){ top=fill=B.STONE; } }")
R("else if(slope>=4&&top===B.GRASS&&h>SEA+6&&","else if(slope>=4*this.ha&&top===B.GRASS&&h>SEA+6*this.ha&&")
R("        if(y===0) v=B.BEDROCK;\n        else if(bd.mesa","        if(y===0||this.ky>1&&y<4&&hash2(wx*3+y,wz*7-y,seed+y)<(4-y)/4.5) v=B.BEDROCK;\n        else if(bd.mesa")
RG("for(let v=0,nn=Math.floor(nv)+(orng()<nv%1?1:0);v<nn;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=y0+(orng()*(y1-y0)|0);",
  "for(let v=0,nv2=nv*this.ky,nn=Math.floor(nv2)+(orng()<nv2%1?1:0);v<nn;v++){ let x=orng()*CS|0, z=orng()*CS|0, y=Math.floor((y0+orng()*(y1-y0))*this.ky);")
RG("let x=orng()*CS|0, z=orng()*CS|0, y=2+(orng()*6|0);","let x=orng()*CS|0, z=orng()*CS|0, y=Math.floor((2+orng()*6)*this.ky);")
R("const cx=orng()*CS, cy=y0+orng()*(y1-y0), cz=orng()*CS,","const cx=orng()*CS, cy=(y0+orng()*(y1-y0))*this.ky, cz=orng()*CS,")
R("      for(let y=1;y<9;y++) for(let z=0;z<CS;z++) for(let x=0;x<CS;x++){ const i=idx(x,y,z); if(b[i]===B.STONE&&(y<6||hash2(x0+x,z0+z,seed+y)<(9-y)/4)) b[i]=B.DEEPSLATE; }",
  "      const DL=Math.round(9+(this.ky-1)*5); for(let y=1;y<DL;y++) for(let z=0;z<CS;z++) for(let x=0;x<CS;x++){ const i=idx(x,y,z); if(b[i]===B.STONE&&(y<DL-3||hash2(x0+x,z0+z,seed+y)<(DL-y)/4)) b[i]=B.DEEPSLATE; }")
RG("    // ore veins: random walks through stone","    if(this.caves) carveCaves(this,ch,b,H,x0,z0,H_,size);\n    // ore veins: random walks through stone")
R("    this.gen.v3=!!meta.mc;","    this.gen.v3=!!meta.mc; if(!meta.dim) SEA=meta.sea||19; else SEA=19;\n    if(this.gen.v2&&!meta.dim){ const D=DEPTHS[meta.depth]||DEPTHS.mini; Object.assign(this.gen,{ha:D.ha,ma:D.ma,oa:D.oa,ky:SEA/19,caves:!!meta.caves}); }")
R("if(h>SEA+1&&h<33) return [x+.5,h+1,z+.5];}","if(h>SEA+1&&h<SEA+14*(g.ha||1)) return [x+.5,h+1,z+.5];}")
# clouds
s=s.replace("gl.uniform1f(U.uCloudY,world.H+16);","gl.uniform1f(U.uCloudY,cloudH());").replace("const cy=world.H+16, R=fr*1.6;","const cy=cloudH(), R=fr*1.6;")
# chunk top: light and mesh only up to the tallest block around
R("    this.chunks.set(this.key(cx,cz),ch); return ch;\n  }","    { const bl=ch.blocks, L=CS*CS; let y=this.H-1; for(;y>0;y--){ let any=false; for(let i=y*L,e=i+L;i<e;i++) if(bl[i]){ any=true; break; } if(any) break; } ch.top=y+1; }\n    this.chunks.set(this.key(cx,cz),ch); return ch;\n  }")
R("    const i=(y*CS+(z&15))*CS+(x&15); ch.blocks[i]=v;","    const i=(y*CS+(z&15))*CS+(x&15); ch.blocks[i]=v; if(v&&y+1>(ch.top||0)) ch.top=y+1;")
R("function meshChunk(world,ch){\n  const H=world.H, N=PP*PP*H;","function meshChunk(world,ch){\n  const H=world.H, N=PP*PP*H;\n  let LH=0; for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const n=world.chunk(ch.cx+dx,ch.cz+dz); LH=Math.max(LH,n?(n.top??H):0); } LH=Math.min(H,LH+2); LHg=LH;")
R("  solveLight(H);\n  // keep this chunk's light","  solveLight(LH);\n  // keep this chunk's light")
R("  if(!ch.light) ch.light=new Uint8Array(CS*CS*H*4);\n  for(let y=0;y<H;y++)for(let z=0;z<CS;z++)","  if(!ch.light||ch.lightH!==LH){ ch.light=new Uint8Array(CS*CS*LH*4); ch.lightH=LH; }\n  for(let y=0;y<LH;y++)for(let z=0;z<CS;z++)")
R("  const at=(x,y,z)=>(y<0||y>=H)?0:pad[pI(x,y,z)];\n  const op=(x,y,z)=>{if(y<0)return true;if(y>=H)return false;","  const at=(x,y,z)=>(y<0||y>=LH)?0:pad[pI(x,y,z)];\n  const op=(x,y,z)=>{if(y<0)return true;if(y>=LH)return false;")
R("  for(let y=0;y<H;y++)for(let z=0;z<CS;z++)for(let x=0;x<CS;x++){\n    const b=pad[pI(x,y,z)]; if(b===0) continue;","  for(let y=0;y<LH;y++)for(let z=0;z<CS;z++)for(let x=0;x<CS;x++){\n    const b=pad[pI(x,y,z)]; if(b===0) continue;")
R("let pad=null, SR,SG,SBL,BR,BG,BBL,LQ, qh=0, qt=0;","let pad=null, SR,SG,SBL,BR,BG,BBL,LQ, qh=0, qt=0, LHg=64; const LOWC=new Int16Array(PP*PP);")
R("else if(k===4){if(y===world.H-1)continue;j=i+PP2;}","else if(k===4){if(y>=LHg-1)continue;j=i+PP2;}")
R("""function solveLight(H){
  const N=PP*PP*H; SR.fill(0);SG.fill(0);SBL.fill(0);BR.fill(0);BG.fill(0);BBL.fill(0); qh=qt=0;
  for(let z=0;z<PP;z++)for(let x=0;x<PP;x++){ let r=15,g=15,b=15;
    for(let y=H-1;y>=0;y--){ const i=(y*PP+z)*PP+x, id=pad[i]; if(LOPQ[id]) break;
      const a=LATT[id]; if(a){r=Math.max(0,r-a);g=Math.max(0,g-a);b=Math.max(0,b-a);} const tn=TINT[id]; if(tn){r=r*tn[0]|0;g=g*tn[1]|0;b=b*tn[2]|0;}
      SR[i]=r;SG[i]=g;SBL[i]=b; if(r|g|b) lqPush(i); } }""","""function solveLight(H){
  const N=PP*PP*H; SR.fill(0,0,N);SG.fill(0,0,N);SBL.fill(0,0,N);BR.fill(0,0,N);BG.fill(0,0,N);BBL.fill(0,0,N); qh=qt=0;
  for(let z=0;z<PP;z++)for(let x=0;x<PP;x++){ let r=15,g=15,b=15, y=H-1;
    for(;y>=0;y--){ const i=(y*PP+z)*PP+x, id=pad[i]; if(LOPQ[id]) break;
      const a=LATT[id]; if(a){r=Math.max(0,r-a);g=Math.max(0,g-a);b=Math.max(0,b-a);} const tn=TINT[id]; if(tn){r=r*tn[0]|0;g=g*tn[1]|0;b=b*tn[2]|0;}
      SR[i]=r;SG[i]=g;SBL[i]=b; } LOWC[z*PP+x]=y+1; }
  // only sky cells that can still spread sideways (a neighbouring column is shaded at that height) or are dimmed need the flood
  for(let z=0;z<PP;z++)for(let x=0;x<PP;x++){ const lo=LOWC[z*PP+x]; let mx=0; if(x>0) mx=Math.max(mx,LOWC[z*PP+x-1]); if(x<PP-1) mx=Math.max(mx,LOWC[z*PP+x+1]); if(z>0) mx=Math.max(mx,LOWC[(z-1)*PP+x]); if(z<PP-1) mx=Math.max(mx,LOWC[(z+1)*PP+x]);
    for(let y=lo;y<H;y++){ const i=(y*PP+z)*PP+x; const full=SR[i]===15&&SG[i]===15&&SBL[i]===15; if(y>=mx&&full) break; if(SR[i]|SG[i]|SBL[i]) lqPush(i); } }""")
R("  if(y>=world.H){o[0]=o[1]=o[2]=255;o[3]=o[4]=o[5]=0;return true;} if(y<0) return false;","  if(y>=LHg){o[0]=o[1]=o[2]=255;o[3]=o[4]=o[5]=0;return true;} if(y<0) return false;")
R("  const ch=world.chunk(X>>4,Z>>4); if(!ch||!ch.light||Y<0){_sl.set(VL_SUN);return _sl;}","  const ch=world.chunk(X>>4,Z>>4); if(!ch||!ch.light||Y<0||Y>=(ch.lightH||world.H)){_sl.set(VL_SUN);return _sl;}")
R("function skyAt(x,y,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||!ch.light||y<0||y>=world.H) return 15;","function skyAt(x,y,z){ const ch=world.chunk(x>>4,z>>4); if(!ch||!ch.light||y<0||y>=(ch.lightH||world.H)) return 15;")
# new world menu
R('''    <p class="note">50 blocks deep.''','''    <div class="sizes" role="radiogroup" aria-label="World depth" id="depths">
      <button class="size" role="radio" aria-checked="false" data-depth="mini"><i>Mini</i><b>64 tall</b><em>Sea level 19</em></button>
      <button class="size" role="radio" aria-checked="true" data-depth="classic"><i>Classic</i><b>128 tall</b><em>Surface at 64</em></button>
      <button class="size" role="radio" aria-checked="false" data-depth="full"><i>Full world</i><b>256 tall</b><em>Big mountains</em></button>
    </div>
    <p class="note">Caves, caverns, ravines and underground lakes in every new world.''')
R("let pickedSize=100, pickedGM='survival';","let pickedSize=100, pickedGM='survival', pickedDepth='classic';\ndocument.querySelectorAll('[data-depth]').forEach(b=>b.addEventListener('click',()=>{pickedDepth=b.dataset.depth;document.querySelectorAll('[data-depth]').forEach(x=>x.setAttribute('aria-checked',x===b));}));")
R("size:pickedSize,height:64,gen:2,mc:1,gameMode:pickedGM,","size:pickedSize,height:DEPTHS[pickedDepth].height,sea:DEPTHS[pickedDepth].sea,depth:pickedDepth,caves:1,gen:2,mc:1,gameMode:pickedGM,")
# stage code goes in before the generator
R("class Generator2{",open(SP+'s17.js').read()+"\nconst cloudH=()=>Math.min(world.H+16,SEA+130);\nclass Generator2{")
R("gl.uniform1f(U.uAmb,.12); } else gl.uniform1f(U.uAmb,.03);","gl.uniform1f(U.uAmb,.12); } else gl.uniform1f(U.uAmb,window.__amb??.05);")
open(F,'w').write(s)
i=s.index('<script>'); j=s.rindex('</script>'); open(SP+'check.js','w').write(s[i+8:j]); print('ok')
