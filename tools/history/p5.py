F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep("  horse:{hp:15,speed:1.7,w:1,h:1.6,food:[I.FIBER],drops:()=>[[I.HIDE,rint(0,2)]],name:'Horse',ride:9},",
"""  horse:{hp:15,speed:1.7,w:1,h:1.6,food:[I.FIBER],drops:()=>[[I.HIDE,rint(0,2)]],name:'Horse',ride:9},
  sheep:{hp:8,speed:1.25,w:.9,h:1.3,food:[I.SEEDS,I.FIBER],drops:m=>m.sheared?[]:[[DYES[m.wool||0].woolB,1]],name:'Sheep'},
  zombie:{hp:20,speed:2.3,w:.6,h:1.85,food:[],hostile:1,drops:()=>[[I.FLESH,rint(0,2)],[I.IRON,Math.random()<.06?1:0]],name:'Zombie'},
  skeleton:{hp:20,speed:2.1,w:.6,h:1.85,food:[],hostile:1,drops:()=>[[I.BONE,rint(0,2)],[I.SARROW,rint(0,2)]],name:'Skeleton'},""")
rep("for(const [id,n] of MOB[m.type].drops()) spawnDrop(","for(const [id,n] of MOB[m.type].drops(m)) spawnDrop(")
rep("  if(m.dead) return; m.hp-=dmg; m.hurtT=.35; m.flee=3;","  if(m.dead) return; m.hp-=dmg; m.hurtT=.35; if(MOB[m.type].hostile) m.aggro=20; else m.flee=3;")
# sheep wool colours on spawn
rep("function spawnMob(type,x,y,z,baby){ mobs.push({","function spawnMob(type,x,y,z,baby){ const r=Math.random(); mobs.push({wool:type==='sheep'?(r<.8?0:r<.87?7:r<.93?8:r<.97?15:r<.99?12:6):0,sheared:false,regrow:0,shootT:1+Math.random()*2,atkT:0,")
# animals spawn on any grassy top; sheep join the mix
rep("if(top===B.GRASS&&(above===0||(above>0&&BLOCKS[above].replace))) return [x+.5,y+1,z+.5]; } return null; }",
    "if((top===B.GRASS||top===B.SNOW_GRASS||top===B.PODZOL)&&(above===0||(above>0&&BLOCKS[above].replace))) return [x+.5,y+1,z+.5]; } return null; }")
rep("const types=['cow','cow','pig','pig','chicken','chicken','horse'],","const types=['cow','cow','pig','pig','chicken','chicken','horse','sheep','sheep','sheep'],")
rep("const near=mobs.filter(m=>Math.hypot(m.x-player.x,m.z-player.z)<64).length; if(near>=14) return;","const near=mobs.filter(m=>!MOB[m.type].hostile&&Math.hypot(m.x-player.x,m.z-player.z)<64).length; if(near>=14) return;")
rep("function stepMobSpawning(dt){","""// ---------- night monsters: zombies and skeletons spawn in the dark, burn in daylight ----------
let hostileT=2;
function stepHostileSpawning(dt){
  hostileT-=dt; if(hostileT>0) return; hostileT=2.5;
  for(let i=mobs.length-1;i>=0;i--){ const m=mobs[i]; if(MOB[m.type].hostile&&Math.hypot(m.x-player.x,m.z-player.z)>90) mobs.splice(i,1); }
  const n=mobs.filter(m=>MOB[m.type].hostile).length, night=!dayInfo().day; if(n>=(night?12:4)) return;
  for(let k=0;k<6;k++){ const a=Math.random()*6.28, d=18+Math.random()*22, x=Math.floor(player.x+Math.cos(a)*d), z=Math.floor(player.z+Math.sin(a)*d);
    if(x<1||z<1||x>=world.size-1||z>=world.size-1||!world.chunk(x>>4,z>>4)) continue;
    // try the surface, and sometimes a cave floor below it
    let y=world.surface(x,z); if(Math.random()<.4){ for(let yy=y-3;yy>2;yy--) if(world.solid(x,yy,z)&&!world.solid(x,yy+1,z)&&!world.solid(x,yy+2,z)){ y=yy; break; } }
    const top=world.get(x,y,z); if(!(top>0&&BLOCKS[top].solid&&BLOCKS[top].opaque)||world.solid(x,y+1,z)||world.solid(x,y+2,z)||isW(world.get(x,y+1,z))) continue;
    const L=sampleLight(x+.5,y+1.5,z+.5), dark=Math.max(L[4],L[5],L[6])<60&&(night||L[0]<70);
    if(!dark) continue;
    spawnMob(Math.random()<.55?'zombie':'skeleton',x+.5,y+1,z+.5,false); return; }
}
function stepHostile(m,d,dt,dist){ // returns [gx,gz,sp] or null when idle
  const p=player, dy=Math.abs(p.y-m.y), canSee=surv()&&!p.mount?.kind!=='x';
  // daylight burns under open sky
  const L=sampleLight(m.x,m.y+1.6,m.z); m.burnT=(m.burnT||0)-dt;
  if(dayInfo().day&&dayInfo().k>.6&&L[0]>200){ if(m.burnT<=0){ m.burnT=1; hitMob(m,2,m.x,m.z); m.flee=0; } if(Math.random()<dt*14) parts.push({x:m.x+(Math.random()-.5)*.5,y:m.y+Math.random()*1.8,z:m.z+(Math.random()-.5)*.5,vx:0,vy:1.5,vz:0,t:.5,c:[255,150,40],s:.07,ember:true}); }
  const target=surv()&&(dist<(m.aggro>0?32:18));
  m.aggro=Math.max(0,(m.aggro||0)-dt);
  if(!target) return null;
  m.atkT=Math.max(0,m.atkT-dt);
  if(m.type==='zombie'){
    if(dist<1.25&&dy<1.6&&m.atkT<=0){ m.atkT=1; m.swing=.3; hurt(3,'Slain by a zombie'); const l=dist||1; p.vx+=(p.x-m.x)/l*7; p.vz+=(p.z-m.z)/l*7; p.vy=Math.max(p.vy,4.5); }
    return dist>1?[p.x-m.x,p.z-m.z,d.speed]:[0,0,0];
  }
  // skeleton: keep a shooting distance and loose arrows on a timer
  m.shootT-=dt;
  if(m.shootT<=0&&dist<20){ m.shootT=1.6+Math.random()*1.2; const o=[m.x,m.y+1.5,m.z], t=[p.x,p.y+1.1,p.z], v=[t[0]-o[0],t[1]-o[1],t[2]-o[2]], l=Math.hypot(...v)||1, sp=22;
    arrows.push({id:I.SARROW,dmg:3,hostile:true,x:o[0]+v[0]/l*.7,y:o[1],z:o[2]+v[2]/l*.7,vx:v[0]/l*sp+(Math.random()-.5),vy:v[1]/l*sp+l*.11,vz:v[2]/l*sp+(Math.random()-.5),stuck:false,t:0}); m.face=Math.atan2(v[0],v[2]); m.draw=.35; }
  if(dist>11) return [p.x-m.x,p.z-m.z,d.speed]; if(dist<6) return [m.x-p.x,m.z-p.z,d.speed*.8];
  const a=Math.atan2(p.x-m.x,p.z-m.z)+Math.PI/2; return [Math.sin(a)*(m.strafe||1),Math.cos(a)*(m.strafe||1),d.speed*.5];
}
function stepMobSpawning(dt){""")
rep("    if(surv()) stepMobSpawning(dt);","    if(surv()){ stepMobSpawning(dt); stepHostileSpawning(dt); }")
rep("""    let gx=0,gz=0,sp=d.speed;
    if(m.flee>0){""","""    let gx=0,gz=0,sp=d.speed;
    if(m.type==='sheep'&&m.sheared){ m.regrow-=dt; if(m.regrow<=0){ m.sheared=false; } }
    m.swing=Math.max(0,(m.swing||0)-dt); m.draw=Math.max(0,(m.draw||0)-dt); if(Math.random()<dt*.3) m.strafe=Math.random()<.5?-1:1;
    const hv=d.hostile?stepHostile(m,d,dt,dist):null;
    if(hv){ gx=hv[0]; gz=hv[1]; sp=hv[2]; if(m.type==='zombie'&&dist<1.2){ m.face=Math.atan2(player.x-m.x,player.z-m.z); } }
    else if(m.flee>0){""")
# hostile mobs step off safe edges too (chasing), and face the player when shooting
rep("    if(l>.01&&safeAhead(m,gx,gz)){","    if(l>.01&&(safeAhead(m,gx,gz)||hv&&!isW(world.get(Math.floor(m.x+gx/l),Math.floor(m.y)-1,Math.floor(m.z+gz/l))))){")
rep("    if(l>.01&&(safeAhead(m,gx,gz)||hv&&!isW(world.get(Math.floor(m.x+gx/l),Math.floor(m.y)-1,Math.floor(m.z+gz/l))))){ const vx=gx/l*sp, vz=gz/l*sp; if(mobMove(m,vx,vz,dt,true)) m.timer=0; m.face=angLerp(m.face,Math.atan2(vx,vz),1-Math.exp(-6*dt));",
    "    if(l>.01&&(safeAhead(m,gx,gz)||hv&&!isW(world.get(Math.floor(m.x+gx/l),Math.floor(m.y)-1,Math.floor(m.z+gz/l))))){ const vx=gx/l*sp, vz=gz/l*sp; if(mobMove(m,vx,vz,dt,true)) m.timer=0; if(!(hv&&m.type==='skeleton')) m.face=angLerp(m.face,Math.atan2(vx,vz),1-Math.exp(-6*dt)); else m.face=angLerp(m.face,Math.atan2(player.x-m.x,player.z-m.z),1-Math.exp(-8*dt));")
# skeleton arrows hit the player, and can't be picked up
rep("    if(a.stuck){ if(a.t>.5&&Math.hypot(","    if(a.stuck){ if(a.hostile){ if(a.t>20) arrows.splice(i,1); continue; } if(a.t>.5&&Math.hypot(")
rep("    for(const m of mobs){ const {hw,h}=mobBox(m); if(Math.abs(m.x-a.x)<hw+.15&&",
    "    if(a.hostile&&Math.abs(player.x-a.x)<.45&&Math.abs(player.z-a.z)<.45&&a.y>player.y&&a.y<player.y+ph()){ hurt(a.dmg,'Shot by a skeleton'); player.vx+=a.vx*.12; player.vz+=a.vz*.12; arrows.splice(i,1); continue; }\n    if(!a.hostile) for(const m of mobs){ const {hw,h}=mobBox(m); if(Math.abs(m.x-a.x)<hw+.15&&")
# taps on sheep: shear with a knife, recolour with dye
rep("  const m=e.mob, d=MOB[m.type], near=Math.hypot(m.x-player.x,m.z-player.z)<3.5;",
"""  const m=e.mob, d=MOB[m.type], near=Math.hypot(m.x-player.x,m.z-player.z)<3.5;
  if(m.type==='sheep'&&near&&!m.baby&&it){
    if(it.dye&&!m.sheared){ const k=DYES.findIndex(q=>q.k===it.dye); if(k!==m.wool){ m.wool=k; s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); toast('Dyed the sheep '+DYES[k].name.toLowerCase()); burst(m.x,m.y+1,m.z,hex(DYES[k].wool),8,2); } return true; }
    if(it.tool==='knife'&&!m.sheared){ m.sheared=true; m.regrow=50+Math.random()*60; spawnDrop(m.x,m.y+1,m.z,DYES[m.wool].woolB,rint(1,3)); useTool(); burst(m.x,m.y+1,m.z,hex(DYES[m.wool].wool),10,2); toast('Sheared'); return true; } }""")
# models
rep("""  else if(m.type==='horse'){""","""  else if(m.type==='sheep'){ const w=hex(DYES[m.wool||0].wool), sk=[214,196,178], f=m.sheared?0:.09;
    legs([-.18,.18],[-.36,.36],.5,.075,sk); if(!m.sheared) legs([-.18,.18],[-.36,.36],.5,.11,w);
    box([-.28-f,.5-f*.5,-.52-f],[.28+f,1.0+f,.5+f],m.sheared?sk:w); box([-.17,.78,.48],[.17,1.12,.82],sk); if(!m.sheared) box([-.19,.98,.48],[.19,1.16,.7],w);
    box([-.12,.94,.82],[-.06,1.0,.84],MC.black); box([.06,.94,.82],[.12,1.0,.84],MC.black); }
  else if(m.type==='zombie'||m.type==='skeleton'){ const z=m.type==='zombie', skin=z?[96,142,74]:[214,212,202], shirt=z?[44,122,138]:skin, pants=z?[58,58,138]:skin, lw=z?.12:.06, aw=z?.09:.05;
    const ws=m.moving?Math.sin(m.phase)*.7:0, arm=z?-1.5+(m.swing>0?Math.sin(m.swing*20)*.4:0)+ws*.15:(m.draw>0||m.aggro>0?-1.5:ws*.8);
    box([-.13-lw,0,-lw],[-.13+lw,.76,lw],pants,T(.76,0,ws)); box([.13-lw,0,-lw],[.13+lw,.76,lw],pants,T(.76,0,-ws));
    box([-.25,.76,-.13],[.25,1.38,.13],shirt); if(!z){ for(const y of [.86,.98,1.1,1.22]) box([-.24,y,-.12],[.24,y+.05,.12],[150,148,140]); box([-.05,.76,-.06],[.05,1.38,.06],[180,178,170]); }
    box([-.25-aw*2,.78,-aw],[-.25,1.36,aw],z?shirt:skin,T(1.3,0,arm)); box([.25,.78,-aw],[.25+aw*2,1.36,aw],z?shirt:skin,T(1.3,0,z?arm:arm*.9));
    box([-.25-aw*2,.74,-aw],[-.25,.86,aw],skin,T(1.3,0,arm)); box([.25,.74,-aw],[.25+aw*2,.86,aw],skin,T(1.3,0,z?arm:arm*.9));
    if(!z) box([-.48,.7,.0],[-.42,1.5,.06],[120,82,48],T(1.3,0,arm));
    box([-.22,1.38,-.22],[.22,1.82,.22],skin); box([-.15,1.54,.215],[-.05,1.64,.23],z?[30,40,26]:[30,30,32]); box([.05,1.54,.215],[.15,1.64,.23],z?[30,40,26]:[30,30,32]);
    if(!z) box([-.12,1.42,.215],[.12,1.46,.23],[60,58,56]); }
  else if(m.type==='horse'){""")
open(F,'w').write(s); print('ok')
