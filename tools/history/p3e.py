F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep("""  if(id===B.RAIL&&!world.solid(x,y-1,z)){ toast('Rails need solid ground'); return 0; }""",
"""  if(id===B.VINE_N){ const nx=hx-x, nz=hz-z; if(hy!==y||(!nx&&!nz)){ toast('Vines hang on the side of a block'); return 0; } return VINE_OF[nx+','+nz]; }
  if(id===B.KELP||id===B.LILY){ const cur=world.get(x,y,z), below=world.get(x,y-1,z);
    if(id===B.KELP&&!(isW(cur)&&(world.solid(x,y-1,z)||below===B.KELP))){ toast('Kelp grows under water'); return 0; }
    if(id===B.LILY&&below!==B.WATER){ toast('Lily pads float on water'); return 0; } }
  if(id===B.CACTUS&&![B.SAND,B.RED_SAND,B.CACTUS].includes(world.get(x,y-1,z))){ toast('Cactus grows on sand'); return 0; }
  if(id===B.RAIL&&!world.solid(x,y-1,z)){ toast('Rails need solid ground'); return 0; }""")

# HUD: biome name next to the coordinates
rep("coordsEl.textContent=`${Math.floor(p.x)}, ${Math.floor(p.y)}, ${Math.floor(p.z)}${p.climbing?' · climbing':p.crouch?' · crouched':''}`;",
    "coordsEl.textContent=`${Math.floor(p.x)}, ${Math.floor(p.y)}, ${Math.floor(p.z)}${p.climbing?' · climbing':p.crouch?' · crouched':''}${biomeName(p.x,p.z)}`;")
rep("function dayInfo(){","""function biomeName(x,z){ const ch=world&&world.chunk(Math.floor(x)>>4,Math.floor(z)>>4); if(!ch||!ch.bio) return ''; return ' · '+BIO[ch.bio[(Math.floor(z)&15)*CS+(Math.floor(x)&15)]].name; }
function dayInfo(){""")

# sun rays: one additive full-screen pass, strongest at dawn and dusk, dimmed when the camera is out of the sky light
RAYS=r'''
const rayProg=gl.createProgram();
gl.attachShader(rayProg,shader(gl.VERTEX_SHADER,`#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }`));
gl.attachShader(rayProg,shader(gl.FRAGMENT_SHADER,`#version 300 es
precision highp float; uniform vec2 uRes; uniform vec2 uS; uniform float uK; uniform vec3 uC; uniform float uT; uniform float uDisc; uniform vec2 uDir; out vec4 o;
float h(float x){ return fract(sin(x*91.7)*43758.5); }
float vn(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
void main(){
  vec2 p=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y; vec2 d=p-uS; d.x*=asp; float r=length(d);
  float a=atan(d.y,d.x);
  float st=vn(a*18.+uT*.05)*.6+vn(a*41.-uT*.08)*.4; st=pow(st,2.5);
  float shafts=st*exp(-r*1.15)*smoothstep(0.,.08,r);
  float glow=exp(-r*3.)*.55+exp(-r*12.)*.6;
  float disc=uDisc*smoothstep(.034,.026,r)*1.4;
  // in the overhead view the sun is off-screen: draw slanted parallel shafts instead
  if(uDir.x!=0.||uDir.y!=0.){ vec2 q=gl_FragCoord.xy/uRes.y; float u=dot(q,vec2(-uDir.y,uDir.x)); float v=dot(p-.5,uDir);
    float b=vn(u*9.+uT*.03)*.7+vn(u*23.-uT*.05)*.3; shafts=pow(b,3.)*smoothstep(-.9,.6,v)*.8; glow=smoothstep(-.2,.9,v)*.12; disc=0.; }
  o=vec4(uC*uK*(shafts+glow)+uC*disc,1.);
}`));
gl.linkProgram(rayProg); if(!gl.getProgramParameter(rayProg,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(rayProg));
const RU={}; for(const n of ['uRes','uS','uK','uC','uT','uDisc','uDir']) RU[n]=gl.getUniformLocation(rayProg,n);
const rayVAO=gl.createVertexArray();
let rayK=0;
function sunDir(){ if(!world||world.preview) return [.45,.75,.3]; const T=world.dayLen+world.nightLen, t=((world.time%T)+T)%T;
  if(t>=world.dayLen) return null; const a=t/world.dayLen*Math.PI; const v=[Math.cos(a),Math.sin(a),.3], l=Math.hypot(...v); return v.map(c=>c/l); }
function drawRays(di){
  const sd=sunDir(); const pos=cam.persp?cam.pos:[player.x,player.y+1.6,player.z];
  // fade with the sky light where the camera is, so caves and indoors stay dark
  const L=sampleLight(pos[0],pos[1],pos[2]), sky=L[0]/255;
  let target=0, sx=.5, sy=1.2, disc=0, dir=[0,0];
  if(sd&&di.k>.02){
    const dusk=4*di.k*(1-di.k);
    target=(.07+.3*dusk)*Math.min(1,sky*1.3);
    if(cam.persp){ const c=xform(cam.vp,pos[0]+sd[0]*600,pos[1]+sd[1]*600,pos[2]+sd[2]*600);
      if(c[3]<=0) target*=0; else { sx=c[0]/c[3]*.5+.5; sy=c[1]/c[3]*.5+.5; const off=Math.max(0,Math.max(Math.abs(sx-.5),Math.abs(sy-.5))-.5); target*=Math.max(0,1-off*1.4); disc=Math.min(1,sky*1.5); } }
    else { const c0=xform(cam.vp,pos[0],pos[1],pos[2]), c1=xform(cam.vp,pos[0]+sd[0]*20,pos[1]+sd[1]*20,pos[2]+sd[2]*20); let dx=c1[0]-c0[0], dy=c1[1]-c0[1]; const l=Math.hypot(dx,dy)||1; dir=[dx/l,dy/l]; target*=.55; }
  }
  rayK+=(target-rayK)*.08; if(rayK<.004&&!disc) return;
  const dusk=sd?4*di.k*(1-di.k):0, col=[1,.93-.35*dusk,.78-.5*dusk];
  gl.useProgram(rayProg); gl.bindVertexArray(rayVAO); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE);
  gl.uniform2f(RU.uRes,cam.W,cam.H); gl.uniform2f(RU.uS,sx,sy); gl.uniform1f(RU.uK,rayK); gl.uniform3f(RU.uC,col[0],col[1],col[2]); gl.uniform1f(RU.uT,performance.now()/1000%1000);
  gl.uniform1f(RU.uDisc,disc*(cam.mode==='fp'||cam.persp?1:0)); gl.uniform2f(RU.uDir,dir[0],dir[1]);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.useProgram(prog); gl.bindVertexArray(null);
}
'''
rep("const cloudVB=new VB(), cloudMesh=makeVAO();","const cloudVB=new VB(), cloudMesh=makeVAO();\n"+RAYS)
# clouds drift with the same sun direction used for the rays
rep("{ const a=(world.preview?.3:(((world.time%(world.dayLen+world.nightLen))/(world.dayLen))))*Math.PI; gl.uniform2f(U.uSunXZ,Math.cos(a)*.55,.25); }",
    "{ const sd=sunDir()||[0,1,0]; gl.uniform2f(U.uSunXZ,sd[0]/Math.max(.25,sd[1]),sd[2]/Math.max(.25,sd[1])); }")
open(F,'w').write(s)
print('ok')
