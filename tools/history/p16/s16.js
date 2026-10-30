
/* =====================================================================
   STAGE 16: player skins (Minecraft Java layout, both layers, slim arms), Minecraft-style limb animation,
   first-person arm and items, items drawn as extruded pixel sprites (from the resource pack when it has them),
   a throw button, sprint camera bob, and the missing fishing and throw sounds.
   ===================================================================== */
// ---------- small affine matrices (3×4, row major) ----------
const mm=(A,B)=>{ const r=new Array(12); for(let i=0;i<3;i++){ for(let j=0;j<3;j++) r[i*4+j]=A[i*4]*B[j]+A[i*4+1]*B[4+j]+A[i*4+2]*B[8+j]; r[i*4+3]=A[i*4]*B[3]+A[i*4+1]*B[7]+A[i*4+2]*B[11]+A[i*4+3]; } return r; };
const mT=(x,y,z)=>[1,0,0,x,0,1,0,y,0,0,1,z], mS=(a,b,c)=>[a,0,0,0,0,b??a,0,0,0,0,c??a,0];
const mX=a=>{const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,-s,0,0,s,c,0];}, mY=a=>{const c=Math.cos(a),s=Math.sin(a);return [c,0,s,0,0,1,0,0,-s,0,c,0];}, mZ=a=>{const c=Math.cos(a),s=Math.sin(a);return [c,-s,0,0,s,c,0,0,0,0,1,0];};
const mc=(...M)=>M.reduce(mm), ap=(M,x,y,z)=>[M[0]*x+M[1]*y+M[2]*z+M[3],M[4]*x+M[5]*y+M[6]*z+M[7],M[8]*x+M[9]*y+M[10]*z+M[11]];
const DEG=Math.PI/180, PX=.05625;
// ---------- skin texture ----------
const SKIN={cv:document.createElement('canvas'),tex:null,slim:false,custom:false,name:'Default',ver:0};
SKIN.cv.width=SKIN.cv.height=64;
function defaultSkin(){ const g=SKIN.cv.getContext('2d'); g.clearRect(0,0,64,64);
  const R=(x,y,w,h,c)=>{ for(let j=0;j<h;j++) for(let i=0;i<w;i++){ const n=hash2(x+i,y+j,77)*.12-.06; const h2=hex(c).map(v=>Math.max(0,Math.min(255,v*(1+n)|0))); g.fillStyle=`rgb(${h2})`; g.fillRect(x+i,y+j,1,1); } };
  const skin='#e9b68c', hair='#5b3a25', tunic='#2c9a8a', tunicD='#23806f', pants='#34405e', boot='#4b3020', belt='#e0a43c';
  // head
  R(8,0,8,8,hair); R(16,0,8,8,skin); R(0,8,8,8,skin); R(0,8,8,3,hair); R(16,8,8,8,skin); R(16,8,8,3,hair); R(24,8,8,8,hair); R(8,8,8,8,skin); R(8,8,8,2,hair); R(8,10,1,2,hair); R(15,10,1,2,hair);
  R(9,12,2,1,'#f4f4f4'); R(13,12,2,1,'#f4f4f4'); R(10,12,1,1,'#1a1c22'); R(13,12,1,1,'#1a1c22'); R(11,14,2,1,'#b97d63'); R(2,12,1,2,'#d9a27a'); R(21,12,1,2,'#d9a27a');
  // body
  R(20,16,8,4,tunic); R(28,16,8,4,tunic); R(16,20,4,12,tunic); R(20,20,8,12,tunic); R(28,20,4,12,tunic); R(32,20,8,12,tunicD); R(16,27,24,2,belt); R(23,27,2,2,'#c7882a'); R(22,20,4,1,tunicD);
  // arms (sleeve over the upper arm, bare hand)
  for(const [u,v] of [[40,16],[32,48]]){ R(u+4,v,4,4,tunic); R(u+8,v,4,4,skin); R(u,v+4,16,8,tunic); R(u,v+12,16,4,skin); R(u,v+11,16,1,tunicD); }
  // legs
  for(const [u,v] of [[0,16],[16,48]]){ R(u+4,v,4,4,pants); R(u+8,v,4,4,boot); R(u,v+4,16,9,pants); R(u,v+13,16,3,boot); }
  SKIN.slim=false; SKIN.custom=false; SKIN.name='Default'; skinUpload(); }
function skinUpload(){ if(!SKIN.tex){ SKIN.tex=gl.createTexture(); } gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,SKIN.tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,SKIN.cv); for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.activeTexture(gl.TEXTURE0); SKIN.ver++; }
// a Minecraft Java skin: 64×64 (or old 64×32, converted with mirrored left limbs); slim arms detected from the transparent arm column
function loadSkin(src,name,slimPref){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>{
    if(im.width!==64||(im.height!==64&&im.height!==32)){ rej(new Error('A skin must be a 64×64 or 64×32 PNG')); return; }
    const g=SKIN.cv.getContext('2d'); g.clearRect(0,0,64,64); g.imageSmoothingEnabled=false; g.drawImage(im,0,0);
    if(im.height===32){ const mir=(sx,sy,w,h,dx,dy)=>{ g.save(); g.translate(dx+w,dy); g.scale(-1,1); g.drawImage(im,sx,sy,w,h,0,0,w,h); g.restore(); };
      // left leg / left arm from the right ones, each face mirrored the way the game does it
      for(const [s,d] of [[[0,16],[16,48]],[[40,16],[32,48]]]){ const [u,v]=s, [x,y]=d;
        mir(u+4,v,4,4,x+4,y); mir(u+8,v,4,4,x+8,y); mir(u,v+4,4,12,x+8,y+4); mir(u+4,v+4,4,12,x+4,y+4); mir(u+8,v+4,4,12,x,y+4); mir(u+12,v+4,4,12,x+12,y+4); } }
    const d=g.getImageData(0,0,64,64).data, a=(x,y)=>d[(y*64+x)*4+3];
    SKIN.slim=slimPref==='slim'?true:slimPref==='classic'?false:(a(54,20)===0&&a(55,31)===0&&a(50,16)===0);
    // the base layer is opaque in Minecraft: fill any holes so they don't show through
    const id=g.getImageData(0,0,64,64), D=id.data, base=[[0,0,32,16],[16,16,24,16],[40,16,16,16],[0,16,16,16],[16,48,16,16],[32,48,16,16]];
    for(const [x0,y0,w,h] of base) for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++){ const o=(y*64+x)*4; if(D[o+3]<255&&!(x0===0&&y0===0&&x>=24&&x<32&&y<8)) D[o+3]=255; }
    if(im.height===32) for(let y=32;y<48;y++) for(let x=0;x<64;x++) D[(y*64+x)*4+3]=0;
    g.putImageData(id,0,0); SKIN.custom=true; SKIN.name=name||'Custom skin'; skinUpload(); res(); };
  im.onerror=()=>rej(new Error('That file is not an image')); im.src=src; }); }
// ---------- skin shader: position, uv, shade ----------
const skinProg=gl.createProgram();
gl.attachShader(skinProg,shader(gl.VERTEX_SHADER,`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV; layout(location=2) in float aSh; uniform mat4 uVP; out vec2 vUV; out float vSh; out vec3 vW;
void main(){ vUV=aUV; vSh=aSh; vW=aPos; gl_Position=uVP*vec4(aPos,1.); }`));
gl.attachShader(skinProg,shader(gl.FRAGMENT_SHADER,`#version 300 es
precision highp float; in vec2 vUV; in float vSh; in vec3 vW; uniform sampler2D uTex; uniform vec3 uL; uniform vec3 uFog; uniform vec2 uFocus; uniform vec2 uFogR; uniform float uA; uniform vec3 uHurt; out vec4 o;
void main(){ vec4 t=texture(uTex,vUV); if(t.a<.5) discard; vec3 c=t.rgb*uL*vSh; c=mix(c,uHurt,step(.01,uHurt.r+uHurt.g+uHurt.b)*.45); float f=smoothstep(uFogR.x,uFogR.y,length(vW.xz-uFocus)); o=vec4(mix(c,uFog,f),uA); }`));
gl.linkProgram(skinProg); if(!gl.getProgramParameter(skinProg,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(skinProg));
const SU={}; for(const n of ['uVP','uTex','uL','uFog','uFocus','uFogR','uA','uHurt']) SU[n]=gl.getUniformLocation(skinProg,n);
const skinVAO=gl.createVertexArray(), skinVBO=gl.createBuffer(); gl.bindVertexArray(skinVAO); gl.bindBuffer(gl.ARRAY_BUFFER,skinVBO);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,1,gl.FLOAT,false,24,20); gl.bindVertexArray(null);
const SKV={tp:new Float32Array(6*6*6*16),tpN:0,fp:new Float32Array(6*6*6*4),fpN:0};
// one Minecraft model box: origin (x,y,z) and size in skin pixels, texture offset (u,v), inflated by inf pixels; M maps pixels to world
function skinBox(buf,n,M,x,y,z,w,h,d,u,v,inf){ const x0=x-inf,y0=y-inf,z0=z-inf,x1=x+w+inf,y1=y+h+inf,z1=z+d+inf, e=.02;
  const P=(a,b,c)=>ap(M,a,b,c), Q=(px,py)=>[(px)/64,(py)/64];
  const face=(p,uv,sh)=>{ // p: 4 corners TL,TR,BR,BL ; uv: [u0,v0,u1,v1]
    const [u0,v0,u1,v1]=uv, c=[[u0+e,v0+e],[u1-e,v0+e],[u1-e,v1-e],[u0+e,v1-e]];
    for(const k of [0,1,2,0,2,3]){ const q=p[k], t=Q(...c[k]); buf[n++]=q[0]; buf[n++]=q[1]; buf[n++]=q[2]; buf[n++]=t[0]; buf[n++]=t[1]; buf[n++]=sh; } };
  face([P(x0,y1,z1),P(x1,y1,z1),P(x1,y0,z1),P(x0,y0,z1)],[u+d,v+d,u+d+w,v+d+h],.86);                 // front (+z)
  face([P(x1,y1,z0),P(x0,y1,z0),P(x0,y0,z0),P(x1,y0,z0)],[u+2*d+w,v+d,u+2*d+2*w,v+d+h],.7);          // back
  face([P(x0,y1,z0),P(x0,y1,z1),P(x0,y0,z1),P(x0,y0,z0)],[u,v+d,u+d,v+d+h],.74);                      // right side (-x)
  face([P(x1,y1,z1),P(x1,y1,z0),P(x1,y0,z0),P(x1,y0,z1)],[u+d+w,v+d,u+2*d+w,v+d+h],.74);              // left side (+x)
  face([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],[u+d,v,u+d+w,v+d],1);                        // top
  face([P(x0,y0,z1),P(x1,y0,z1),P(x1,y0,z0),P(x0,y0,z0)],[u+d+w,v,u+d+2*w,v+d],.55);                 // bottom
  return n; }
// ---------- items as extruded pixel sprites ----------
const SPRITE_CACHE=new Map();
function itemPixels(id){ if(SPRITE_CACHE.has(id)) return SPRITE_CACHE.get(id); let px=null;
  try{ const it=ITEMS[id]; let src=null, w=16;
    const nm=typeof ITEM_MC!=='undefined'&&ITEM_MC[id]; if(PACK&&PACK.on&&nm&&PACK.img['i/'+nm]){ src=PACK.img['i/'+nm]; w=src.width; }
    const bd=it&&it.block&&BLOCKS[it.block];
    if(!src&&PACK&&PACK.on&&bd&&PACK.has[it.block]&&(PACK.x[it.block]||bd.spr)){ const s=PACK.spec[it.block]; src=PACK.img['b/'+s.s]; w=src&&src.width; }
    const c=document.createElement('canvas'); c.width=c.height=16; const g=c.getContext('2d',{willReadFrequently:true});
    if(src){ g.imageSmoothingEnabled=false; g.drawImage(src,0,0,w,w,0,0,16,16); }
    else if(ICON_SPR[id]) g.putImageData(new ImageData(new Uint8ClampedArray(ICON_SPR[id]),16,16),0,0);
    else if(bd&&bd.spr) g.putImageData(new ImageData(new Uint8ClampedArray(SPRD[bd.spr]),16,16),0,0);
    else { const ic=itemIconCanvas(id), sd=ic.getContext('2d').getImageData(0,0,60,60).data, out=g.createImageData(16,16);
      for(let cy=0;cy<16;cy++) for(let cx=0;cx<16;cx++){ let r=0,gg=0,bb=0,w=0,mx=0; for(let y=Math.floor(cy*3.75);y<Math.ceil((cy+1)*3.75);y++) for(let x=Math.floor(cx*3.75);x<Math.ceil((cx+1)*3.75);x++){ const o=(y*60+x)*4, a=sd[o+3]; if(a>mx) mx=a; if(a>60){ r+=sd[o]*a; gg+=sd[o+1]*a; bb+=sd[o+2]*a; w+=a; } }
        const o=(cy*16+cx)*4; if(mx>150&&w){ out.data[o]=r/w; out.data[o+1]=gg/w; out.data[o+2]=bb/w; out.data[o+3]=255; } }
      g.putImageData(out,0,0); }
    const d=g.getImageData(0,0,16,16).data; px=[];
    for(let y=0;y<16;y++){ let run=null; for(let x=0;x<=16;x++){ const o=(y*16+x)*4, on=x<16&&d[o+3]>110, col=on?[d[o]&248,d[o+1]&248,d[o+2]&248]:null;
        if(run&&(!on||col+''!==run.c+'')){ px.push([run.x,y,x-run.x,run.c]); run=null; } if(on&&!run) run={x,c:col}; } } }
  catch(e){ px=[]; }
  SPRITE_CACHE.set(id,px); return px; }
const isFlatItem=id=>{ const it=ITEMS[id]; if(!it) return false; if(!it.block) return true; const bd=BLOCKS[it.block]; return !!(bd&&(bd.spr||bd.plant||bd.sapling||bd.mush||bd.vine||bd.lily||LADDER_DIR[it.block]||it.block===B.TORCH||it.block===B.RAIL||it.block===B.ROPE||bd.door||bd.web||it.block===B.SUGAR_CANE)); };
// draws an item in model space 0..1 (16 px), centred like a Minecraft item model, through M
function emitItem(vb,id,M){ if(isFlatItem(id)){ const T=(x,y,z)=>ap(M,x,y,z), t=1/16;
    for(const [x,y,w,c] of itemPixels(id)) emitBox(vb,[x*t,(15-y)*t,7.5*t],[(x+w)*t,(16-y)*t,8.5*t],c,T); return; }
  const bd=BLOCKS[ITEMS[id].block]; emitBox(vb,[0,0,0],[1,1,1],bd.side,(x,y,z)=>ap(M,x,y,z)); emitBox(vb,[-.004,.999,-.004],[1.004,1.004,1.004],bd.top,(x,y,z)=>ap(M,x,y,z)); }
// Minecraft item display transforms (translation in pixels, rotation in degrees, scale)
const DISP={hand:{tp:[[0,4,.5],[0,-90,55],.85],fp:[[1.13,3.2,1.13],[0,-90,25],.68]},flat:{tp:[[0,3,1],[0,0,0],.55],fp:[[1.13,3.2,1.13],[0,-90,25],.68]},block:{tp:[[0,2.5,0],[75,45,0],.375],fp:[[0,0,0],[0,45,0],.4]}};
const dispOf=id=>{ const it=ITEMS[id]; if(!isFlatItem(id)) return DISP.block; return it&&(it.type||it.tool||it.weapon||it.rod||id===I.STICK)?DISP.hand:DISP.flat; };
const dispM=(d)=>mc(mT(d[0][0]/16,d[0][1]/16,d[0][2]/16),mX(d[1][0]*DEG),mY(d[1][1]*DEG),mZ(d[1][2]*DEG),mS(d[2]),mT(-.5,-.5,-.5));
// ---------- the player: Minecraft limb animation ----------
const PL={eqT:1,eqId:-1,amt:0,swing:0,sw0:0};
function playerSwing(){ const p=player, now=performance.now()/1000;
  if(mining&&mining.target&&!creative()) return (now*3.3)%1;
  if(p.swingT>0) return 1-p.swingT/.25; return 0; }
function buildPlayerSkin(){ const p=player; SKV.tpN=0; if(cam.mode==='fp'||!world) return;
  const now=performance.now()/1000, sp=p.speed||0; PL.amt=lerp(PL.amt,Math.min(1,sp/5.4)*(p.onGround||p.climbing?1:.25),.25);
  const ls=p.phase||0, a=PL.amt, hs=game()&&held(), s=playerSwing(), crouch=p.crouch&&!p.swimProne&&!p.sitting;
  const ry=p.y+p.stepOff; p.swimK=p.swimK||0; const sk=p.swimK, bp=sk*1.42+(p.sprinting&&!crouch?.12:0);
  const BASE=mc(mT(p.x,ry,p.z),mY(p.face),mT(0,.9-.62*sk,0),mX(bp),mT(0,-.9,0),mS(PX));
  const part=(piv,xr,yr,zr,off)=>mc(BASE,mT(piv[0]+(off?off[0]:0),piv[1]+(off?off[1]:0),piv[2]+(off?off[2]:0)),mZ(zr||0),mY(yr||0),mX(xr||0),mT(-piv[0],-piv[1],-piv[2]));
  // angles (our space: xr same as Minecraft, yr and zr flipped)
  let rArm=Math.cos(ls+Math.PI)*a*.9, lArm=Math.cos(ls)*a*.9, rLeg=Math.cos(ls)*1.25*a, lLeg=Math.cos(ls+Math.PI)*1.25*a, rArmZ=-(Math.cos(now*1.8)*.05+.05), lArmZ=Math.cos(now*1.8)*.05+.05, rArmY=0, lArmY=0, bodyY=0, headX=0, legY=0;
  rArm+=Math.sin(now*1.34)*.05; lArm-=Math.sin(now*1.34)*.05;
  if(!p.onGround&&!p.inWater&&!p.climbing&&!p.sitting){ rLeg=rLeg*.5+.15; lLeg=lLeg*.5-.25; }
  if(hs&&!p.climbing) rArm=rArm*.5-Math.PI/10;
  if(p.sitting||player.mount){ rLeg=lLeg=-1.41; legY=.314; rArm=lArm=-.628; }
  if(p.climbing||p.onLadder){ const c=Math.sin((p.phase||0)*2); rArm=-2.6+c*.5; lArm=-2.6-c*.5; }
  if(sk>.3){ const c=now*3.2; rArm=-2.7+Math.sin(c)*.9; lArm=-2.7-Math.sin(c)*.9; rLeg=Math.sin(now*7)*.35; lLeg=-rLeg; }
  else if(p.inWater&&!p.onGround){ rArm=-1.1+Math.sin(ls*2+1)*.6; lArm=-1.1-Math.sin(ls*2+1)*.6; }
  if(p.gliding){ rArm=lArm=-2.9; rArmZ=-.4; lArmZ=.4; }
  if(p.eatCd>.3){ rArm=-1.3+Math.abs(Math.sin(now*14))*.15; rArmY=.45; }
  if(bowDraw||p.shotT>0){ rArm=-Math.PI/2; lArm=-Math.PI/2; rArmY=.1; lArmY=-.5; rArmZ=lArmZ=0; }
  if(s>0){ bodyY=-Math.sin(Math.sqrt(s)*Math.PI*2)*.2; let f=1-s; f*=f; f*=f; f=1-f; const f1=Math.sin(f*Math.PI), f2=Math.sin(s*Math.PI)*.7*.75;
    rArm-=f1*1.2+f2; rArmY+=bodyY*2; rArmZ+=Math.sin(s*Math.PI)*.4; lArmY+=bodyY; }
  // crouching: lean forward from the neck, lower the head and arms, push the legs back
  const cb=crouch?.5:0, cy=crouch?-3.2:0, chy=crouch?-4.2:0, clz=crouch?-4:0; if(crouch){ rArm+=.4; lArm+=.4; }
  const SL=SKIN.slim, aw=SL?3:4;
  const body=mc(BASE,mT(0,24+cy,0),mY(bodyY),mX(cb),mT(0,-24,0));
  const head=mc(BASE,mT(0,24+chy,0),mY(bodyY*.5),mX(headX),mT(0,-24,0));
  const rA=part([-5,22,0],rArm,rArmY+bodyY,rArmZ,[0,cy,0]), lA=part([5,22,0],lArm,lArmY+bodyY,lArmZ,[0,cy,0]);
  const rL=part([-2,12,0],rLeg,legY,0,[0,-.2*(crouch?1:0),clz]), lL=part([2,12,0],lLeg,-legY,0,[0,-.2*(crouch?1:0),clz]);
  const B=SKV.tp; let n=0;
  n=skinBox(B,n,head,-4,24,-4,8,8,8,0,0,0); n=skinBox(B,n,head,-4,24,-4,8,8,8,32,0,.5);
  n=skinBox(B,n,body,-4,12,-2,8,12,4,16,16,0); n=skinBox(B,n,body,-4,12,-2,8,12,4,16,32,.25);
  n=skinBox(B,n,rA,-4-aw,12,-2,aw,12,4,40,16,0); n=skinBox(B,n,rA,-4-aw,12,-2,aw,12,4,40,32,.25);
  n=skinBox(B,n,lA,4,12,-2,aw,12,4,32,48,0); n=skinBox(B,n,lA,4,12,-2,aw,12,4,48,48,.25);
  n=skinBox(B,n,rL,-4,0,-2,4,12,4,0,16,0); n=skinBox(B,n,rL,-4,0,-2,4,12,4,0,32,.25);
  n=skinBox(B,n,lL,0,0,-2,4,12,4,16,48,0); n=skinBox(B,n,lL,0,0,-2,4,12,4,0,48,.25);
  SKV.tpN=n/6;
  // armour pieces ride on the same parts
  if(game()){ const A=inv.armor, col=i=>A[i]&&ITEMS[A[i].id].col, ab=(M,mn,mx,c)=>emitBox(dynVB,mn,mx,c,(x,y,z)=>ap(M,x,y,z));
    if(col(0)){ ab(head,[-4.6,23.4,-4.6],[4.6,32.6,4.6],col(0)); }
    if(col(1)){ ab(body,[-4.6,11.6,-2.6],[4.6,24.4,2.6],col(1)); ab(rA,[-4.6-aw,17,-2.6],[-3.4,24.4,2.6],col(1)); ab(lA,[3.4,17,-2.6],[4.6+aw,24.4,2.6],col(1)); }
    if(col(2)){ ab(body,[-4.4,11.6,-2.4],[4.4,14.5,2.4],col(2)); ab(rL,[-4.4,4,-2.4],[.1,12.2,2.4],col(2)); ab(lL,[-.1,4,-2.4],[4.4,12.2,2.4],col(2)); }
    if(col(3)){ ab(rL,[-4.5,-.1,-2.5],[.2,4.4,2.5],col(3)); ab(lL,[-.2,-.1,-2.5],[4.5,4.4,2.5],col(3)); } }
  // the held item, at the right hand (Minecraft third-person display)
  if(hs&&!p.climbing){ const d=dispOf(hs.id), M=mc(rA,mT(-4-aw/2,12.5,0),mS(16),mX(Math.PI/2),mY(Math.PI),mT(1/16,-.125,.1),dispM(d.tp)); setVL(sampleLight(p.x,p.y+1.2,p.z)); emitItem(dynVB,hs.id,mc(mT(0,0,0),M)); }
}
function drawSkinMesh(buf,n,light,alpha,ghost){ if(!n||!SKIN.tex) return;
  gl.useProgram(skinProg); gl.uniformMatrix4fv(SU.uVP,false,cam.vp); gl.uniform1i(SU.uTex,5); gl.uniform3fv(SU.uFog,FOG);
  const fr=world.radius*CS; gl.uniform2f(SU.uFocus,cam.tx??player.x,cam.tz??player.z); gl.uniform2f(SU.uFogR,ghost?1e5:fr-22,ghost?1e5:fr-6);
  const L=light; gl.uniform3f(SU.uL,Math.min(1.15,L[0]/255*SUNV[0]+L[4]/255+.08),Math.min(1.15,L[1]/255*SUNV[1]+L[5]/255+.08),Math.min(1.15,L[2]/255*SUNV[2]+L[6]/255+.08));
  gl.uniform1f(SU.uA,alpha); const hurt=player.hurtT<.3&&player.hurtT>=0; gl.uniform3f(SU.uHurt,hurt?1:0,0,0);
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D,SKIN.tex); gl.activeTexture(gl.TEXTURE0);
  gl.bindVertexArray(skinVAO); gl.bindBuffer(gl.ARRAY_BUFFER,skinVBO); gl.bufferData(gl.ARRAY_BUFFER,buf.subarray(0,n*6),gl.STREAM_DRAW); gl.drawArrays(gl.TRIANGLES,0,n);
  gl.bindVertexArray(null); gl.useProgram(prog); }
function drawPlayerSkin(showPlayer){ if(!SKV.tpN||cam.photoHide) return; const L=sampleLight(player.x,player.y+1.2,player.z), l=Array.from(L);
  if(showPlayer){ gl.enable(gl.BLEND); gl.depthMask(false); gl.depthFunc(gl.GREATER); drawSkinMesh(SKV.tp,SKV.tpN,l,.38,true); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.depthMask(true); }
  drawSkinMesh(SKV.tp,SKV.tpN,l,1,false); }
// ---------- first person: arm and item (Minecraft's hand transforms, with the arm kept visible like Bedrock) ----------
function buildViewModel2(){ PAT=0; CB=0; vmVB.n=0; SKV.fpN=0; if(cam.mode!=='fp'||!game()||cam.photo){ vmMesh.n=0; return; }
  const p=player, s=held(), R=cam.right, Uc=cam.up, F=cam.fwd, P=cam.pos, now=performance.now()/1000;
  // camera space in Minecraft's convention (x right, y up, z towards the viewer)
  const CAM=[R[0],Uc[0],-F[0],P[0], R[1],Uc[1],-F[1],P[1], R[2],Uc[2],-F[2],P[2]];
  const id=s?s.id:0; if(id!==PL.eqId){ PL.eqId=id; PL.eqT=0; } const tnow=performance.now(); PL.eqT=Math.min(1,PL.eqT+Math.min(.1,(tnow-(PL.lt||tnow))/1000)*6); PL.lt=tnow; const eq=(1-PL.eqT);
  const sw=playerSwing(), bob=p.onGround?Math.min(1,(p.speed||0)/6):0, bx=Math.sin(p.phase||0)*.02*bob, by=-Math.abs(Math.cos(p.phase||0))*.03*bob;
  const drawing=!!bowDraw, eating=p.eatCd>.3, kx=Math.min(1,(cam.tanX||1.2)/1.24), ks=.62+.38*kx; PL.ks=ks;
  setVL(sampleLight(P[0],P[1],P[2]));
  // the arm
  const f1=Math.sqrt(sw), f2=-.3*Math.sin(f1*Math.PI), f3=.4*Math.sin(f1*Math.PI*2), f4=-.4*Math.sin(sw*Math.PI), f5=Math.sin(sw*sw*Math.PI), f6=Math.sin(f1*Math.PI);
  let ARM=mc(CAM,mT(bx,by,0),mT(f2+.64,f3-.6-eq*.6,f4-.72),mY(45*DEG),mY(f6*70*DEG),mZ(f5*-20*DEG),mT(-1,3.6,3.5),mZ(120*DEG),mX(200*DEG),mY(-135*DEG),mT(5.6,0,0),mS(1/16));
  if(s){ // with an item: the arm comes in lower, angled so the fist sits under the item
    ARM=mc(CAM,mT(bx,by,0),mT(-.4*Math.sin(f1*Math.PI)+.56*kx,.2*Math.sin(f1*Math.PI*2)-.52-eq*.6,-.2*Math.sin(sw*Math.PI)-.72),mY((45-f5*20)*DEG),mZ(-f6*20*DEG),mX(-f6*80*DEG),mY(-45*DEG));
    if(drawing) ARM=mc(CAM,mT(.28,-.42,-.62),mX(-8*DEG),mY(-6*DEG)); if(eating) ARM=mc(CAM,mT(.12,-.42+Math.abs(Math.sin(now*14))*.04,-.5),mX(-35*DEG),mY(-40*DEG));
    const d=dispOf(id), IM=mc(ARM,mS(ks),dispM(d.fp)); emitItem(vmVB,id,IM);
    const g=d===DISP.block?ap(ARM,0,-.12,.05):d===DISP.hand?ap(IM,.3,.3,.5):ap(IM,.5,.2,.5);
    SKV.fpN=fpArm(CAM,g,[.6,-.74,.12]); }
  else { // empty hand: the fist rises from the lower right and punches forward when swinging
    const pu=Math.sin(f1*Math.PI), g=[.42*kx+f2*.5+bx,-.3+f3*.35-eq*.6+by,-.75+f4*.5-pu*.2];
    SKV.fpN=fpArm(CAM,g,[.62-pu*.2,-.72,.1+pu*.25]); }
  upload(vmMesh,vmVB,gl.STREAM_DRAW); }
// the forearm: fist at g (camera space, Minecraft axes), the arm running back along d towards the shoulder
function fpArm(CAM,g,d){ const l=Math.hypot(...d), Y=d.map(v=>v/l); let X=[Y[1]*0-Y[2]*1, Y[2]*0-Y[0]*0, Y[0]*1-Y[1]*0]; const xl=Math.hypot(...X)||1; X=X.map(v=>v/xl);
  const Z=[X[1]*Y[2]-X[2]*Y[1], X[2]*Y[0]-X[0]*Y[2], X[0]*Y[1]-X[1]*Y[0]], q=PL.ks||1, k=q/16, O=[g[0]+Y[0]*.75*q,g[1]+Y[1]*.75*q,g[2]+Y[2]*.75*q];
  const M=mc(CAM,[X[0]*k,Y[0]*k,Z[0]*k,O[0], X[1]*k,Y[1]*k,Z[1]*k,O[1], X[2]*k,Y[2]*k,Z[2]*k,O[2]]), aw=SKIN.slim?3:4;
  return skinBox(SKV.fp,skinBox(SKV.fp,0,M,-aw/2,-12,-2,aw,12,4,40,16,0),M,-aw/2,-12,-2,aw,12,4,40,32,.25)/6; }
function drawFPArm(){ if(!SKV.fpN||cam.mode!=='fp') return; const L=Array.from(sampleLight(cam.pos[0],cam.pos[1],cam.pos[2])); gl.enable(gl.DEPTH_TEST); drawSkinMesh(SKV.fp,SKV.fpN,L,1,true); }
// ---------- throwing the held item (tap: one, hold: the stack), spammable like Minecraft ----------
function dropHeld(all){ if(!game()||mode!=='play') return; const s=held(); if(!s) return; const n=all?s.n:1, it=ITEMS[s.id];
  const dir=cam.mode==='fp'?cam.fwd:[Math.sin(player.face),.12,Math.cos(player.face)], o=[player.x+dir[0]*.4,player.y+(player.crouch?1.1:1.35),player.z+dir[2]*.4];
  drops.push({x:o[0],y:o[1],z:o[2],vx:dir[0]*6+(Math.random()-.5)*.4,vy:dir[1]*6+2.4,vz:dir[2]*6+(Math.random()-.5)*.4,id:s.id,n,d:s.d,bag:s.bag,sx:s.x,age:-1.4,spin:player.face});
  if(!creative()||true){ s.n-=n; if(s.n<=0) inv.slots[inv.sel]=null; invChanged(); }
  player.swingT=.25; sfx('throw',null,null,null,.45); }
{ const b=document.getElementById('bThrow'); let t=null, held2=false;
  if(b){ b.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); try{ b.setPointerCapture(e.pointerId); }catch(_){} held2=false; dropHeld(false); clearTimeout(t); t=setTimeout(()=>{ held2=true; dropHeld(true); try{ navigator.vibrate&&navigator.vibrate(15); }catch(_){} },450); });
    const end=e=>{ clearTimeout(t); }; b.addEventListener('pointerup',end); b.addEventListener('pointercancel',end); b.addEventListener('contextmenu',e=>e.preventDefault()); } }
addEventListener('keydown',e=>{ if(e.code==='KeyQ'&&mode==='play'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA') dropHeld(e.ctrlKey||e.metaKey||e.shiftKey); });
// ---------- sounds that were missing ----------
Object.assign(SND,{
  throw:(o,t)=>{ nz(o,t,.25,{type:'bandpass',f:500,f2:1800,q:1.5,v:.7,a:.05}); },
  cast:(o,t)=>{ nz(o,t,.35,{type:'bandpass',f:700,f2:2600,q:1.2,v:.6,a:.03}); for(let i=0;i<10;i++) nz(o,t+.08+i*.03,.02,{type:'highpass',f:3500,v:.25}); },
  plop:(o,t)=>{ tn(o,t,.12,{f:240,f2:620,v:.6}); nz(o,t,.3,{type:'lowpass',f:1800,f2:400,v:.7}); for(let i=0;i<3;i++) tn(o,t+.1+i*.07,.06,{f:rr(600,900),f2:rr(1200,1600),v:.15}); },
  reel:(o,t)=>{ for(let i=0;i<8;i++){ nz(o,t+i*.045,.02,{f:2600,q:4,v:.4}); } nz(o,t,.4,{type:'bandpass',f:1200,f2:800,q:3,v:.25}); },
  ratchet:(o,t)=>{ nz(o,t,.018,{f:rr(2400,3000),q:5,v:.5}); } });
if(typeof MC_SND!=='undefined') Object.assign(MC_SND,{throw:'random/bow',cast:'random/bow',plop:'random/splash',reel:'random/pop'});
// ---------- skin controls in the pause menu ----------
function skinUI(){ const n=document.getElementById('skinName'); if(!n) return; n.textContent=SKIN.custom?SKIN.name:'Default skin'; document.getElementById('skinReset').hidden=!SKIN.custom; }
{ const f=document.getElementById('skinFile'), sel=document.getElementById('skinArms'), p=prefsGet();
  if(sel) sel.value=p.skinArms||'auto';
  const apply=async(src,name)=>{ try{ await loadSkin(src,name,sel?sel.value:'auto'); skinUI(); return true; }catch(e){ toast(e.message||'That skin could not be used'); return false; } };
  if(p.skin) apply(p.skin,p.skinName).then(ok=>{ if(!ok) defaultSkin(); }); else defaultSkin();
  document.getElementById('skinImport')?.addEventListener('click',()=>{ f.value=''; f.click(); });
  f?.addEventListener('change',()=>{ const file=f.files&&f.files[0]; if(!file) return; const r=new FileReader(); r.onload=async()=>{ if(await apply(r.result,file.name.replace(/\.png$/i,''))){ const q=prefsGet(); q.skin=r.result; q.skinName=SKIN.name; store.set('strata:prefs',q); toast('Skin applied'+(SKIN.slim?' (slim arms)':'')); } }; r.readAsDataURL(file); });
  document.getElementById('skinReset')?.addEventListener('click',()=>{ const q=prefsGet(); delete q.skin; delete q.skinName; store.set('strata:prefs',q); defaultSkin(); skinUI(); });
  sel?.addEventListener('change',()=>{ const q=prefsGet(); q.skinArms=sel.value; store.set('strata:prefs',q); if(q.skin) apply(q.skin,q.skinName); }); }
