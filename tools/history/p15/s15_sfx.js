
/* =====================================================================
   STAGE 15: sound effects, ambience and more particles. Every sound is synthesized here (filtered noise and tuned
   oscillators), placed left/right and faded by distance, muffled under water and given a little echo in caves.
   A resource pack that ships Minecraft sound files (assets/minecraft/sounds/…) replaces these with its own.
   ===================================================================== */
var SFX={vol:1,bus:null,filt:null,revG:null,amb:{},voices:0,under:false,near:{},pack:{},last:{},caveT:20,ambT:0,drips:[],fires:[],lavas:[],portals:[],furn:[]};
{ const p=prefsGet(); if(p.sfxVol!=null) SFX.vol=p.sfxVol; }
const rr=(a,b)=>a+Math.random()*(b-a);
function sfxInit(){ const c=ac(); if(!c) return null; if(SFX.bus) return c;
  SFX.filt=c.createBiquadFilter(); SFX.filt.type='lowpass'; SFX.filt.frequency.value=20000; SFX.filt.Q.value=.7; SFX.filt.connect(MASTER);
  SFX.bus=c.createGain(); SFX.bus.gain.value=SFX.vol; SFX.bus.connect(SFX.filt);
  // a short generated echo, louder in caves and under water
  const len=c.sampleRate*1.6|0, ir=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2); }
  const cv=c.createConvolver(); cv.buffer=ir; SFX.revG=c.createGain(); SFX.revG.gain.value=.06; SFX.bus.connect(cv); cv.connect(SFX.revG); SFX.revG.connect(SFX.filt);
  return c; }
function sfxSetVol(v){ SFX.vol=v; if(SFX.bus) SFX.bus.gain.setTargetAtTime(v,AC.currentTime,.05); const p=prefsGet(); p.sfxVol=v; store.set('strata:prefs',p); }
// a gain node to play a one-shot into, or null if it is too far away or too quiet to matter
function sfxOut(x,y,z,vol,range){ const c=sfxInit(); if(!c||c.state!=='running'||SFX.vol<=0||SFX.voices>30) return null;
  let g=vol, pan=0;
  if(x!=null&&world){ const dx=x-player.x, dy=y-(player.y+1.5), dz=z-player.z, d=Math.hypot(dx,dy,dz), R=range||16; if(d>R) return null; g*=Math.pow(1-d/R,1.5);
    if(d>.6&&cam.view){ const v=cam.view; pan=Math.max(-1,Math.min(1,(dx*v[0]+dy*v[4]+dz*v[8])/d))*.75; } }
  if(g<.004) return null;
  const G=c.createGain(); G.gain.value=g; if(pan&&c.createStereoPanner){ const P=c.createStereoPanner(); P.pan.value=pan; G.connect(P); P.connect(SFX.bus); } else G.connect(SFX.bus);
  SFX.voices++; setTimeout(()=>{ SFX.voices--; try{ G.disconnect(); }catch(e){} },2600); return G; }
// building blocks: a filtered noise burst and an enveloped tone
function nz(out,t,dur,o){ const c=AC, s=c.createBufferSource(); s.buffer=noise(); s.loop=true; s.playbackRate.value=o.rate||1;
  const f=c.createBiquadFilter(); f.type=o.type||'bandpass'; f.frequency.setValueAtTime(o.f||1000,t); if(o.f2) f.frequency.exponentialRampToValueAtTime(o.f2,t+dur); f.Q.value=o.q??1;
  const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(o.v??1,t+(o.a||.004)); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t,Math.random()*.4); s.stop(t+dur+.05); }
function tn(out,t,dur,o){ const c=AC, s=c.createOscillator(); s.type=o.type||'sine'; s.frequency.setValueAtTime(o.f,t); if(o.f2) s.frequency.exponentialRampToValueAtTime(o.f2,t+(o.fd||dur));
  const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(o.v??1,t+(o.a||.005)); g.gain.exponentialRampToValueAtTime(.001,t+dur); s.connect(g); let n=g;
  if(o.lp){ const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; f.Q.value=o.lq||1; n.connect(f); n=f; }
  if(o.bp){ const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=o.bp; f.Q.value=o.bq||2; n.connect(f); n=f; }
  if(o.vib){ const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=o.vib; lg.gain.value=o.vd||o.f*.03; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t+dur+.05); }
  if(o.trem){ const l=c.createOscillator(), lg=c.createGain(), tg=c.createGain(); tg.gain.value=.6; l.frequency.value=o.trem; lg.gain.value=.4; l.connect(lg); lg.connect(tg.gain); n.connect(tg); n=tg; l.start(t); l.stop(t+dur+.05); }
  n.connect(out); s.start(t); s.stop(t+dur+.05); }
/* ---------- block materials ---------- */
const MATS_S=['stone','grass','dirt','gravel','sand','wood','leaves','metal','glass','wool','snow','slime','plant'];
const MAT_OF=new Uint8Array(8192);
for(const bd of BLOCKS) if(bd){ const n=bd.name.toLowerCase(); let m=0;
  if(bd.leaves||bd.wart) m=6; else if(bd.crop||bd.sapling||bd.spr||bd.plant||bd.vine||bd.lily||bd.mush||bd.berry!==undefined||bd.cocoa||bd.kelp||bd.web) m=12;
  else if(/slime|bounce/.test(n)) m=11; else if(/wool|carpet|cushion|elevator|cake/.test(n)) m=9; else if(/glass|^ice|packed ice|lantern|crystal/.test(n)) m=8;
  else if(/snow/.test(n)) m=10; else if(/grass|mycelium|podzol/.test(n)) m=1; else if(/dirt|farmland|clay/.test(n)) m=2; else if(/gravel|bedrock/.test(n)) m=3;
  else if(/^sand$|^red sand$|hellsand|ash|chalk/.test(n)) m=4; else if(/ ore$/.test(n)) m=0;
  else if(bd.metal||/iron|^tin |bronze|alumin|gold|steel|titanium|platinum|diamond|silver|rail|smelter|forge|jukebox/.test(n)) m=7;
  else if(/stone|cobble|brick|deepslate|andesite|diorite|granite|tuff|calcite|obsidian|terracotta|crucible|coral|dusk|portal|pocket/.test(n)) m=0;
  else if(bd.log||bd.planks||bd.wood||/wood|oak|birch|spruce|jungle|acacia|mangrove|cherry|pale|crimson|warped|chest|ladder|bookshelf|table|chair|drawer|fence|gate|door|plate|desk|pumpkin|melon|cactus|rope|mushroom|tanning/.test(n)) m=5;
  MAT_OF[bd.id]=m; }
const MSND=[
  (o,t,k,v)=>{ nz(o,t,k==='break'?.16:.07,{f:rr(1300,2200),q:1.2,v}); tn(o,t,.06,{f:rr(130,170),f2:70,v:v*.7}); if(k==='break') for(let i=0;i<3;i++) nz(o,t+.03+i*.04,.05,{f:rr(2000,3600),q:2,v:v*.45}); },
  (o,t,k,v)=>{ const n=k==='step'?2:4; for(let i=0;i<n;i++) nz(o,t+i*rr(.015,.035),.07,{f:rr(2400,4200),q:.8,v:v*.75}); nz(o,t,.12,{type:'lowpass',f:900,v:v*.4}); },
  (o,t,k,v)=>{ nz(o,t,k==='break'?.14:.09,{type:'lowpass',f:rr(600,850),v}); for(let i=0;i<(k==='break'?4:2);i++) nz(o,t+i*.03,.05,{f:rr(1200,1900),q:1.5,v:v*.45}); },
  (o,t,k,v)=>{ const n=k==='step'?5:9; for(let i=0;i<n;i++) nz(o,t+rr(0,k==='step'?.07:.16),.04,{f:rr(1300,3200),q:1.6,v:v*.8}); nz(o,t,.1,{type:'lowpass',f:700,v:v*.4}); },
  (o,t,k,v)=>{ nz(o,t,k==='break'?.2:.12,{type:'highpass',f:rr(1500,2400),v:v*.7}); for(let i=0;i<3;i++) nz(o,t+rr(0,.08),.04,{f:rr(2500,4500),q:1.3,v:v*.4}); },
  (o,t,k,v)=>{ const f=rr(170,250); tn(o,t,k==='step'?.07:.11,{type:'triangle',f,f2:f*.8,v}); nz(o,t,.07,{f:rr(700,1000),q:3,v:v*.6});
    if(k!=='step'){ tn(o,t+.045,.08,{type:'triangle',f:f*1.35,f2:f*1.1,v:v*.5}); } if(k==='break') nz(o,t+.03,.22,{f:rr(400,700),q:4,v:v*.35,f2:300}); },
  (o,t,k,v)=>{ for(let i=0;i<(k==='step'?3:7);i++) nz(o,t+rr(0,k==='step'?.06:.2),.07,{f:rr(3000,5500),q:.9,v:v*.6}); nz(o,t,.18,{type:'highpass',f:2500,v:v*.35}); },
  (o,t,k,v)=>{ nz(o,t,.025,{type:'highpass',f:4000,v:v*.8}); const f=rr(620,900), d=k==='step'?.14:k==='break'?.55:.4; for(const [r,a] of [[1,.4],[1.47,.28],[2.09,.22],[2.76,.16],[3.9,.1]]) tn(o,t,d*(1.3-r*.15),{f:f*r,v:v*a}); },
  (o,t,k,v)=>{ if(k!=='break'){ nz(o,t,.06,{f:rr(2500,3800),q:1.4,v}); tn(o,t,.08,{f:rr(1800,2600),v:v*.25}); return; }
    nz(o,t,.3,{type:'highpass',f:4500,v}); nz(o,t,.08,{f:1500,q:1,v:v*.6}); for(let i=0;i<9;i++) tn(o,t+rr(0,.28),rr(.05,.12),{f:rr(2800,6800),v:v*rr(.15,.35)}); },
  (o,t,k,v)=>{ nz(o,t,k==='break'?.16:.11,{type:'lowpass',f:rr(380,560),v}); },
  (o,t,k,v)=>{ for(let i=0;i<(k==='step'?3:6);i++) nz(o,t+rr(0,.08),.06,{type:'lowpass',f:rr(1400,2300),v:v*.7}); },
  (o,t,k,v)=>{ tn(o,t,.2,{f:rr(240,300),f2:110,v,vib:28,vd:30}); nz(o,t,.14,{type:'lowpass',f:700,v:v*.5}); },
  (o,t,k,v)=>{ for(let i=0;i<(k==='step'?1:3);i++) nz(o,t+i*.02,.05,{f:rr(3000,5000),q:.9,v:v*.6}); }];
const MAT_VOL={step:.3,hit:.34,place:.62,break:.78};
function sfxBlock(b,kind,x,y,z,vm){ if(!(b>0)) return; const m=MAT_OF[b], o=sfxOut(x+.5,y+.5,z+.5,MAT_VOL[kind]*(vm||1),kind==='step'?12:20); if(!o) return;
  if(sfxPackBlock(o,m,kind,b)) return; MSND[m](o,AC.currentTime,kind,1); }
/* ---------- named one-shots ---------- */
const SND={
  splash:(o,t)=>{ nz(o,t,.7,{type:'lowpass',f:3200,f2:350,v:1}); nz(o,t,.25,{type:'highpass',f:2500,v:.5}); for(let i=0;i<6;i++) tn(o,t+rr(.1,.6),.06,{f:rr(500,900),f2:rr(1100,1800),v:.15}); },
  splashS:(o,t)=>{ nz(o,t,.28,{type:'lowpass',f:2600,f2:500,v:.8}); tn(o,t+.05,.05,{f:700,f2:1300,v:.15}); },
  swim:(o,t)=>{ nz(o,t,.35,{type:'bandpass',f:900,f2:500,q:.8,v:.7}); nz(o,t+.08,.2,{type:'highpass',f:2000,v:.25}); },
  pop:(o,t)=>{ const f=rr(500,700); tn(o,t,.08,{f,f2:f*2.2,v:.7}); },
  orb:(o,t)=>{ const f=rr(1500,2300); tn(o,t,.35,{f,v:.4}); tn(o,t,.3,{f:f*1.5,v:.2}); tn(o,t,.2,{f:f*2.01,v:.12}); },
  hurt:(o,t)=>{ tn(o,t,.18,{type:'sawtooth',f:rr(210,250),f2:120,v:.5,lp:900}); nz(o,t,.08,{type:'lowpass',f:1200,v:.5}); },
  fall:(o,t)=>{ tn(o,t,.25,{f:90,f2:40,v:1}); nz(o,t,.2,{type:'lowpass',f:500,v:.8}); },
  eat:(o,t)=>{ for(let i=0;i<4;i++){ nz(o,t+i*.17,.09,{type:'lowpass',f:rr(1500,2600),v:.8}); nz(o,t+i*.17+.02,.05,{f:rr(2500,4000),q:2,v:.4}); } },
  burp:(o,t)=>{ tn(o,t,.35,{type:'sawtooth',f:105,f2:80,v:.45,lp:500,trem:22}); },
  drink:(o,t)=>{ for(let i=0;i<3;i++) tn(o,t+i*.22,.13,{f:rr(380,450),f2:180,v:.45,lp:900}); },
  bowDraw:(o,t)=>{ nz(o,t,.9,{type:'bandpass',f:500,f2:1300,q:6,v:.45,a:.3}); tn(o,t,.8,{type:'sawtooth',f:55,f2:75,v:.08,lp:300,a:.3}); },
  bowShoot:(o,t)=>{ tn(o,t,.22,{type:'triangle',f:rr(150,180),f2:110,v:.7,vib:40,vd:12}); nz(o,t,.25,{type:'bandpass',f:1800,f2:600,q:1.5,v:.45}); },
  arrowHit:(o,t)=>{ nz(o,t,.05,{type:'lowpass',f:1400,v:.9}); tn(o,t,.12,{type:'triangle',f:rr(260,320),f2:180,v:.5,vib:60,vd:25}); },
  ignite:(o,t)=>{ nz(o,t,.03,{type:'highpass',f:5000,v:.8}); tn(o,t,.04,{f:3200,v:.3}); nz(o,t+.03,.5,{f:400,f2:2200,q:1.2,v:.7,a:.08}); },
  crackle:(o,t)=>{ for(let i=0;i<3;i++) nz(o,t+rr(0,.2),rr(.008,.025),{type:'highpass',f:rr(2500,5000),v:rr(.3,.8)}); },
  lavaPop:(o,t)=>{ tn(o,t,.12,{f:rr(160,240),f2:60,v:.7}); nz(o,t,.06,{type:'lowpass',f:900,v:.6}); },
  plink:(o,t)=>{ const f=rr(1100,1700); tn(o,t,.09,{f,f2:f*1.6,v:.5}); },
  sizzle:(o,t)=>{ nz(o,t,.35,{type:'highpass',f:3500,v:.5,a:.02}); },
  chestOpen:(o,t)=>{ nz(o,t,.45,{type:'bandpass',f:380,f2:900,q:7,v:.5,a:.05}); tn(o,t+.38,.07,{type:'triangle',f:150,f2:110,v:.5}); },
  chestClose:(o,t)=>{ nz(o,t,.2,{type:'bandpass',f:700,f2:350,q:6,v:.4}); tn(o,t+.16,.1,{type:'triangle',f:120,f2:70,v:.9}); nz(o,t+.16,.06,{type:'lowpass',f:900,v:.6}); },
  metalOpen:(o,t)=>{ nz(o,t,.5,{type:'bandpass',f:900,f2:1700,q:12,v:.4,a:.06}); SND.metalHit(o,t+.42); },
  metalClose:(o,t)=>{ nz(o,t,.2,{type:'bandpass',f:1600,f2:800,q:10,v:.35}); SND.metalHit(o,t+.16); },
  metalHit:(o,t)=>{ const f=rr(330,420); for(const [r,a] of [[1,.4],[2.4,.2],[3.7,.12]]) tn(o,t,.35,{f:f*r,v:a}); nz(o,t,.04,{type:'highpass',f:3000,v:.5}); },
  bagOpen:(o,t)=>{ for(let i=0;i<5;i++) nz(o,t+i*.05,.08,{f:rr(1200,2200),q:1.2,v:.45}); },
  bagClose:(o,t)=>{ for(let i=0;i<3;i++) nz(o,t+i*.05,.07,{f:rr(900,1600),q:1.2,v:.45}); },
  doorOpen:(o,t)=>{ nz(o,t,.35,{type:'bandpass',f:500,f2:1100,q:8,v:.45,a:.04}); tn(o,t+.28,.06,{type:'triangle',f:220,f2:170,v:.4}); },
  doorClose:(o,t)=>{ nz(o,t,.12,{type:'bandpass',f:900,f2:500,q:6,v:.35}); tn(o,t+.1,.1,{type:'triangle',f:150,f2:90,v:.9}); },
  equipLeather:(o,t)=>{ for(let i=0;i<4;i++) nz(o,t+i*.06,.09,{f:rr(900,1700),q:1.3,v:.5}); },
  equipMetal:(o,t)=>{ for(let i=0;i<3;i++){ const f=rr(1800,2600); tn(o,t+i*.07,.18,{f,v:.25}); tn(o,t+i*.07,.12,{f:f*1.52,v:.15}); } nz(o,t,.2,{f:1200,q:1,v:.25}); },
  equipGem:(o,t)=>{ for(let i=0;i<3;i++){ const f=rr(2600,3400); tn(o,t+i*.06,.3,{f,v:.25}); tn(o,t+i*.06,.25,{f:f*2,v:.1}); } },
  unequip:(o,t)=>{ nz(o,t,.16,{f:1200,q:1,v:.6}); nz(o,t+.06,.1,{f:900,q:1,v:.4}); },
  treeFall:(o,t)=>{ nz(o,t,.7,{type:'bandpass',f:900,f2:200,q:5,v:.6,a:.1}); tn(o,t,.6,{type:'sawtooth',f:90,f2:45,v:.12,lp:300,a:.2});
    nz(o,t+.6,1.1,{type:'lowpass',f:1600,f2:200,v:1,a:.01}); tn(o,t+.6,.5,{f:70,f2:35,v:.9}); for(let i=0;i<10;i++) nz(o,t+.62+rr(0,.6),.12,{f:rr(2500,5000),q:1,v:.35}); },
  click:(o,t)=>{ nz(o,t,.02,{type:'highpass',f:3000,v:.6}); tn(o,t,.03,{f:1200,v:.2}); },
  railClack:(o,t)=>{ nz(o,t,.03,{type:'highpass',f:2500,v:.5}); tn(o,t,.08,{f:rr(400,480),v:.2}); },
  portalTrigger:(o,t)=>{ nz(o,t,3,{type:'bandpass',f:200,f2:1800,q:3,v:.7,a:1.5}); tn(o,t,3,{type:'sawtooth',f:60,f2:180,v:.15,lp:600,a:1.2,vib:6,vd:8}); },
  portalTravel:(o,t)=>{ nz(o,t,2.2,{type:'bandpass',f:2400,f2:120,q:2,v:1}); tn(o,t,2,{type:'sawtooth',f:300,f2:40,v:.25,lp:1200,vib:9,vd:30}); for(let i=0;i<8;i++) tn(o,t+rr(0,1.2),.4,{f:rr(900,2400),v:.08}); },
  // teleport: a quick reversed-feeling swell that snaps shut
  warp:(o,t)=>{ nz(o,t,.4,{type:'bandpass',f:600,f2:3000,q:4,v:.7,a:.32}); tn(o,t,.45,{f:300,f2:1400,v:.3,a:.35,vib:14,vd:40}); tn(o,t+.38,.3,{f:900,f2:200,v:.3}); },
  // an original time-door sound: a rising detuned chord with a tape-like flutter, then a soft thump as it settles
  timedoorOpen:(o,t)=>{ for(const [f,d] of [[110,0],[165,4],[220,-6],[330,9],[440,-3]]){ tn(o,t,1.8,{type:'sawtooth',f:f*.5,f2:f*(1+d/1000),fd:.9,v:.08,lp:1400,a:.6,vib:7,vd:f*.012}); }
    nz(o,t,1.2,{type:'bandpass',f:300,f2:2600,q:3,v:.45,a:.8}); tn(o,t+.85,.4,{f:80,f2:40,v:.7}); for(let i=0;i<6;i++) tn(o,t+.9+i*.08,.3,{f:rr(1200,2600),v:.07}); },
  timedoorClose:(o,t)=>{ for(const f of [440,330,220]) tn(o,t,.7,{type:'sawtooth',f,f2:f*.4,v:.07,lp:1200}); nz(o,t,.6,{type:'bandpass',f:2400,f2:200,q:3,v:.4}); tn(o,t+.5,.25,{f:70,f2:35,v:.6}); },
  cave:(o,t)=>{ const k=Math.random()*3|0, b=rr(40,70); tn(o,t,6,{type:'sine',f:b,f2:b*rr(.7,1.2),v:.35,a:2}); tn(o,t+.5,5,{type:'triangle',f:b*rr(2.9,3.2),f2:b*rr(2.2,3.6),v:.06,a:2.5,vib:.3,vd:4});
    nz(o,t,5.5,{type:'bandpass',f:rr(200,500),f2:rr(150,900),q:8,v:.25,a:2.5}); if(k===1) for(let i=0;i<4;i++) tn(o,t+1.5+i*rr(.3,.7),.6,{f:rr(600,1100),f2:rr(400,800),v:.04,a:.2}); },
  bubbles:(o,t)=>{ for(let i=0;i<5;i++){ const f=rr(400,800); tn(o,t+rr(0,.5),.07,{f,f2:f*2.5,v:.2}); } },
  netherAmb:(o,t)=>{ tn(o,t,5,{type:'sawtooth',f:rr(35,48),f2:rr(30,55),v:.12,lp:220,a:2}); nz(o,t,4,{type:'bandpass',f:rr(120,260),q:6,v:.4,a:2}); },
  duskAmb:(o,t)=>{ const b=rr(300,420); for(const r of [1,1.5,2.01]) tn(o,t+r*.2,3,{f:b*r,v:.05,a:1.2,vib:4,vd:3}); },
};
function sfx(name,x,y,z,vol,range){ const o=sfxOut(x,y,z,vol??1,range); if(!o) return; if(sfxPackNamed(o,name)) return; const f=SND[name]; if(f) f(o,AC.currentTime); }
/* ---------- creatures ---------- */
const VOICE={
  cow:(o,t,k)=>tn(o,t,k==='idle'?.9:.4,{type:'sawtooth',f:k==='hurt'?150:rr(105,120),f2:k==='hurt'?120:rr(88,98),v:.4,lp:700,lq:4,vib:5,vd:3}),
  pig:(o,t,k)=>{ for(let i=0;i<(k==='hurt'?1:2);i++) tn(o,t+i*.16,.14,{type:'square',f:k==='hurt'?420:rr(250,320),f2:rr(180,220),v:.22,lp:1100}); nz(o,t,.12,{f:600,q:3,v:.2}); },
  chicken:(o,t,k)=>{ for(let i=0;i<(k==='hurt'?2:3);i++) tn(o,t+i*.09,.07,{type:'triangle',f:k==='hurt'?1600:rr(900,1300),f2:rr(700,900),v:.25}); },
  sheep:(o,t,k)=>tn(o,t,k==='hurt'?.35:.65,{type:'sawtooth',f:k==='hurt'?330:rr(240,280),f2:rr(220,250),v:.3,bp:950,bq:3,trem:17}),
  horse:(o,t,k)=>{ tn(o,t,k==='hurt'?.3:.8,{type:'sawtooth',f:k==='hurt'?700:450,f2:k==='hurt'?500:300,fd:.3,v:.25,lp:1800,trem:24}); nz(o,t,.4,{type:'highpass',f:2000,v:.15}); },
  wolf:(o,t,k)=>{ if(k==='hurt'){ tn(o,t,.35,{type:'triangle',f:900,f2:600,v:.3,vib:12,vd:40}); return; } for(let i=0;i<2;i++){ tn(o,t+i*.22,.11,{type:'sawtooth',f:rr(380,450),f2:250,v:.3,lp:1600}); nz(o,t+i*.22,.08,{f:900,q:2,v:.3}); } },
  zombie:(o,t,k)=>{ tn(o,t,k==='hurt'?.35:1.1,{type:'sawtooth',f:k==='hurt'?130:rr(80,95),f2:rr(60,75),v:.35,lp:500,lq:5,vib:4,vd:4}); nz(o,t,.6,{type:'bandpass',f:350,q:4,v:.15}); },
  skeleton:(o,t,k)=>{ for(let i=0;i<(k==='hurt'?4:7);i++) nz(o,t+i*rr(.04,.07),.02,{f:rr(2500,4200),q:3,v:.5}); },
  spider:(o,t,k)=>{ nz(o,t,k==='hurt'?.25:.7,{type:'highpass',f:3200,v:.35,a:.06}); for(let i=0;i<4;i++) nz(o,t+rr(0,.5),.02,{f:2200,q:4,v:.3}); },
  bat:(o,t,k)=>{ for(let i=0;i<3;i++) tn(o,t+i*.06,.04,{f:rr(3500,5500),f2:rr(2500,4000),v:.12}); },
  slime:(o,t,k)=>MSND[11](o,t,'place',.7),
  walker:(o,t,k)=>{ tn(o,t,k==='hurt'?.5:1.2,{f:k==='hurt'?300:rr(140,200),f2:rr(90,400),v:.25,vib:6,vd:60,a:.3}); nz(o,t,.8,{type:'bandpass',f:400,f2:1500,q:6,v:.15,a:.4}); },
  lost:(o,t,k)=>tn(o,t,.45,{type:'sawtooth',f:k==='hurt'?300:rr(170,210),f2:rr(150,230),v:.2,bp:rr(700,1100),bq:3}),
  demon:(o,t,k)=>{ tn(o,t,.7,{type:'sawtooth',f:k==='hurt'?120:70,f2:50,v:.35,lp:600,trem:30}); for(let i=0;i<3;i++) nz(o,t+rr(0,.5),.02,{type:'highpass',f:3000,v:.4}); },
};
const MOB_VOICE=t=>VOICE[t]?t:/zombie/.test(t)?'zombie':/skel/.test(t)?'skeleton':/demon/.test(t)?'demon':/slime/.test(t)?'slime':/walker|dusk/.test(t)?'walker':null;
function sfxMob(m,kind){ const v=MOB_VOICE(m.type); const o=sfxOut(m.x,m.y+.8,m.z,kind==='idle'?.55:.75,kind==='idle'?18:22); if(!o) return;
  if(kind==='death'){ nz(o,AC.currentTime,.25,{type:'lowpass',f:600,v:.6}); }
  if(kind!=='idle'){ tn(o,AC.currentTime,.07,{f:110,f2:60,v:.6}); nz(o,AC.currentTime,.05,{type:'lowpass',f:1800,v:.5}); }
  if(sfxPackMob(o,m.type,kind)) return; if(v) VOICE[v](o,AC.currentTime+(kind==='idle'?0:.03),kind); }
function sfxMobTick(m,dt,dist){ if(dist>24||m.dead) return;
  m._idle=(m._idle??rr(3,14))-dt; if(m._idle<=0){ m._idle=MOB[m.type].hostile?rr(5,11):rr(8,20); if(m.type!=='wolf'||!m.tame||Math.random()<.3) sfxMob(m,'idle'); }
  const k=Math.floor((m.phase||0)/Math.PI); if(k!==m._pk){ m._pk=k; if(m.moving&&dist<12&&m.type!=='bat'&&m.type!=='slime'){ const b=world.get(Math.floor(m.x),Math.floor(m.y-.1),Math.floor(m.z)); sfxBlock(b,'step',Math.floor(m.x),Math.floor(m.y-.1),Math.floor(m.z),m.baby?.4:.7); } } }
/* ---------- the player ---------- */
function sfxUnder(on){ if(SFX.under===on||!sfxInit()) return; SFX.under=on; const t=AC.currentTime;
  SFX.filt.frequency.setTargetAtTime(on?520:20000,t,.08); SFX.filt.Q.setTargetAtTime(on?1.4:.7,t,.08); }
function sfxPlayerTick(p,dt){ if(!game()) return;
  const sp=Math.hypot(p.vx,p.vz), X=Math.floor(p.x), Z=Math.floor(p.z), below=world.get(X,Math.floor(p.y-.05),Z);
  if(p.onGround&&sp>.6&&!p.inWater&&!player.mount){ p._stepD=(p._stepD||0)+sp*dt; const stride=p.crouch?1.25:1.7;
    if(p._stepD>stride){ p._stepD=0; sfxBlock(below,'step',X,Math.floor(p.y-.05),Z,p.crouch?.5:sp>6?1.1:1); if(sp>6) dustAt(p.x,p.y,p.z,3,1.1); } }
  if(p.onLadder&&Math.abs(p.speed||0)>.4){ p._ladD=(p._ladD||0)+Math.abs(p.speed)*dt; if(p._ladD>.55){ p._ladD=0; sfxBlock(B.LADDER_N,'step',X,Math.floor(p.y),Z); } }
  if(p.onGround&&!p._g&&!p.inWater){ const v=-(p.vyLand||0); if(v>11) sfx('fall',p.x,p.y,p.z,.9); if(v>3.5) sfxBlock(below,'step',X,Math.floor(p.y-.05),Z,Math.min(2.2,.6+v*.08)); }
  if(!p.onGround&&p._g&&p.vy>4&&!p.inWater) sfxBlock(below>0?below:world.get(X,Math.floor(p.y-1.05),Z),'step',X,Math.floor(p.y-1),Z,.6);
  if(p.inWater&&!p._w){ const v=-(p.vyLand||p.vy||0); sfx(v>5?'splash':'splashS',p.x,p.y+.5,p.z,Math.min(1,.5+v*.06)); }
  if(!p.inWater&&p._w&&p.vy>1) sfx('splashS',p.x,p.y,p.z,.4);
  if(p.inWater&&sp>1.2){ p._swimT=(p._swimT||0)-dt; if(p._swimT<=0){ p._swimT=rr(.5,.8); sfx('swim',p.x,p.y+.5,p.z,.45); } }
  const head=world.get(X,Math.floor(p.y+(p.swimProne?.5:1.6)),Z); sfxUnder(isW(head));
  if(player.mount&&player.mount.kind==='boat'&&sp>1.5){ p._oarD=(p._oarD||0)+sp*dt; if(p._oarD>2.2){ p._oarD=0; sfx('swim',p.x,p.y,p.z,.35); } }
  p._g=p.onGround; p._w=p.inWater; }
/* ---------- looping ambience: flowing water, fire, lava, portals, under water, minecarts ---------- */
function loopNode(name,build){ let L=SFX.amb[name]; if(L) return L; const c=AC, g=c.createGain(); g.gain.value=0; g.connect(SFX.bus); L={g}; build(c,g); SFX.amb[name]=L; return L; }
function nzLoop(c,dst,type,f,q,lfo,depth){ const s=c.createBufferSource(); s.buffer=noise(); s.loop=true; const fl=c.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; s.connect(fl);
  if(lfo){ const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=lfo; lg.gain.value=depth; l.connect(lg); lg.connect(fl.frequency); l.start(); } fl.connect(dst); s.start(); }
const LOOPS={
  water:(c,g)=>{ nzLoop(c,g,'bandpass',800,.7,.23,250); const h=c.createGain(); h.gain.value=.35; h.connect(g); nzLoop(c,h,'highpass',2600,.5,.41,600); },
  fire:(c,g)=>{ nzLoop(c,g,'lowpass',380,1,.6,120); },
  lava:(c,g)=>{ nzLoop(c,g,'lowpass',170,3,.17,60); },
  portal:(c,g)=>{ nzLoop(c,g,'bandpass',600,7,.11,420); const o=c.createOscillator(), og=c.createGain(); o.type='sawtooth'; o.frequency.value=58; og.gain.value=.06; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300; o.connect(f); f.connect(og); og.connect(g); o.start(); },
  under:(c,g)=>{ nzLoop(c,g,'lowpass',300,2,.09,120); const o=c.createOscillator(), og=c.createGain(); o.frequency.value=46; og.gain.value=.25; o.connect(og); og.connect(g); o.start(); },
  cart:(c,g)=>{ nzLoop(c,g,'lowpass',260,1.5,7,80); },
  furnace:(c,g)=>{ nzLoop(c,g,'lowpass',240,1,1.3,90); }};
function loopSet(name,v){ if(v<=.002&&!SFX.amb[name]) return; const L=loopNode(name,LOOPS[name]); L.g.gain.setTargetAtTime(Math.max(0,v),AC.currentTime,.25); }
function sfxScan(){ const p=player, X=Math.floor(p.x), Y=Math.floor(p.y), Z=Math.floor(p.z), R=8;
  const near={water:99,fire:99,lava:99,portal:99}; SFX.drips.length=0; SFX.fires.length=0; SFX.lavas.length=0; SFX.portals.length=0;
  for(let dy=-6;dy<=6;dy++){ const y=Y+dy; if(y<1||y>=world.H) continue; for(let dz=-R;dz<=R;dz++) for(let dx=-R;dx<=R;dx++){ const x=X+dx, z=Z+dz, b=world.get(x,y,z); if(b<=0) continue; const bd=BLOCKS[b];
    const d=Math.hypot(dx,dy*.8,dz);
    if(b===B.FALL||bd.flow&&isW(b)){ if(d<near.water) near.water=d; }
    else if(bd.fire){ if(d<near.fire) near.fire=d; if(SFX.fires.length<24) SFX.fires.push([x,y,z]); }
    else if(LAVAID[b]){ if(world.get(x,y+1,z)===0){ if(d<near.lava) near.lava=d; if(SFX.lavas.length<24) SFX.lavas.push([x,y,z]); } }
    else if(bd.portal){ if(d<near.portal) near.portal=d; if(SFX.portals.length<24) SFX.portals.push([x,y,z]); }
    else if(bd.opaque&&SFX.drips.length<48&&world.get(x,y-1,z)===0){ const a=world.get(x,y+1,z); if(a>0&&(isW(a)||LAVAID[a])) SFX.drips.push([x,y,z,LAVAID[a]?1:0]); } } }
  SFX.near=near;
  SFX.furn.length=0; for(const t of world.tiles.values()) if(t.kind==='furnace'&&t.burning&&Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z)<12) SFX.furn.push(t); }
function sfxAmbientTick(dt){
  if(!AC||AC.state!=='running'||!SFX.bus) return;
  if(!game()||mode==='menu'||mode==='pause'){ for(const k in SFX.amb) loopSet(k,0); sfxUnder(false); return; }
  if(mode!=='play') dt=0;
  SFX.ambT-=dt; if(SFX.ambT<=0){ SFX.ambT=.3; sfxScan(); }
  const n=SFX.near, f=(d,r)=>Math.max(0,1-d/r);
  loopSet('water',f(n.water??99,12)*.32); loopSet('fire',f(n.fire??99,9)*.3); loopSet('lava',f(n.lava??99,11)*.45); loopSet('portal',f(n.portal??99,9)*.4); loopSet('under',SFX.under?.55:0);
  loopSet('furnace',SFX.furn.length?.18:0);
  // minecarts rumble and click over the rail joints
  let cart=0; for(const v of vehicles){ if(v.kind!=='cart') continue; const d=Math.hypot(v.x-player.x,v.z-player.z), s=Math.abs(v.v||0); if(d>16||s<.3) continue; cart=Math.max(cart,Math.min(1,s/9)*(1-d/16));
    v._rd=(v._rd||0)+s*dt; if(v._rd>1.1){ v._rd=0; sfx('railClack',v.x,v.y,v.z,.5+Math.min(.5,s/16)); } }
  loopSet('cart',cart*.5);
  const P=Math.random;
  if(SFX.fires.length&&P()<dt*7){ const q=SFX.fires[P()*SFX.fires.length|0]; sfx('crackle',q[0]+.5,q[1]+.4,q[2]+.5,.7,12); parts.push({x:q[0]+P(),y:q[1]+.8,z:q[2]+P(),vx:(P()-.5)*.2,vy:.6+P()*.5,vz:(P()-.5)*.2,t:1.8,c:[90,90,96],s:.06,smoke:true}); }
  for(const t of SFX.furn) if(P()<dt*3) sfx('crackle',t.x+.5,t.y+.5,t.z+.5,.5,10);
  if(SFX.lavas.length&&P()<dt*1.6){ const q=SFX.lavas[P()*SFX.lavas.length|0]; sfx('lavaPop',q[0]+.5,q[1]+1,q[2]+.5,.6,14);
    for(let i=0;i<4;i++) parts.push({x:q[0]+.5,y:q[1]+1,z:q[2]+.5,vx:(P()-.5)*2,vy:2.5+P()*2,vz:(P()-.5)*2,t:1,c:[255,140+P()*60|0,40],s:.05,ember:true}); }
  for(const q of SFX.portals) if(P()<dt*1.2) parts.push({x:q[0]+P(),y:q[1]+P(),z:q[2]+P(),vx:(P()-.5)*.8,vy:(P()-.5)*.8,vz:(P()-.5)*.8,t:1.2,c:[170,90,255],s:.045,ember:true});
  // drips under blocks that hold water or lava
  for(const q of SFX.drips) if(P()<dt*.22) parts.push({x:q[0]+.2+P()*.6,y:q[1]-.03,z:q[2]+.2+P()*.6,vx:0,vy:0,vz:0,t:4,hang:.5+P()*.7,c:q[3]?[255,120,30]:[90,140,230],s:.035,drip:q[3]?2:1});
  // caves, the Underworld and the Dusk each get their own occasional sound
  SFX.caveT-=dt; if(SFX.caveT<=0){ SFX.caveT=rr(30,80);
    if(inUnder()) sfx('netherAmb',null,null,null,.8); else if(inDusk()) sfx('duskAmb',null,null,null,.7);
    else if(!SFX.under&&skyAt(Math.floor(player.x),Math.floor(player.y+1.6),Math.floor(player.z))<=3&&player.y<world.H-8) sfx('cave',null,null,null,.8); else SFX.caveT=rr(8,20); }
  if(SFX.under&&P()<dt*.25) sfx('bubbles',null,null,null,.5);
  const cave=!SFX.under&&skyAt(Math.floor(player.x),Math.floor(player.y+1.6),Math.floor(player.z))<=4;
  SFX.revG.gain.setTargetAtTime(SFX.under?.3:cave||inUnder()?.32:.06,AC.currentTime,.5);
  // splashes when dropped items, mobs and arrows hit water
  for(const q of drops){ const w=isW(world.get(Math.floor(q.x),Math.floor(q.y),Math.floor(q.z))); if(w&&q._w===false){ sfx('splashS',q.x,q.y,q.z,.5,14); splashParts(q.x,Math.floor(q.y)+1,q.z,5); } q._w=w; }
  for(const m of mobs){ if(Math.abs(m.x-player.x)>20||Math.abs(m.z-player.z)>20) continue; const w=isW(world.get(Math.floor(m.x),Math.floor(m.y+.2),Math.floor(m.z))); if(w&&m._w===false){ sfx('splashS',m.x,m.y,m.z,.7,16); splashParts(m.x,Math.floor(m.y)+1,m.z,8); } m._w=w; }
  for(const a of arrows){ const w=isW(world.get(Math.floor(a.x),Math.floor(a.y),Math.floor(a.z))); if(w&&a._w===false){ sfx('splashS',a.x,a.y,a.z,.4,14); splashParts(a.x,Math.floor(a.y)+1,a.z,4); } a._w=w; }
  // bow, standing in a portal, the Telelink timedoor
  if(bowDraw&&!SFX._bd) sfx('bowDraw',null,null,null,.7); SFX._bd=!!bowDraw;
  const pt=(player.portalT||0)>0; if(pt&&!SFX._pt) sfx('portalTrigger',null,null,null,.6); SFX._pt=pt;
  if(typeof gate!=='undefined'){ if(gate&&gate!==SFX._gate){ SFX._gate=gate; if(gate.closing==null) sfx('timedoorOpen',gate.x,gate.y+1,gate.z,.9,30); }
    if(gate&&gate.closing!=null&&!gate._snd){ gate._snd=1; sfx('timedoorClose',gate.x,gate.y+1,gate.z,.8,30); } }
}
function splashParts(x,y,z,n){ for(let i=0;i<n;i++) parts.push({x:x+(Math.random()-.5)*.5,y,z:z+(Math.random()-.5)*.5,vx:(Math.random()-.5)*2,vy:1.5+Math.random()*2,vz:(Math.random()-.5)*2,t:.6,c:[200,225,250],s:.05}); }
function dripLand(q,y){ const lava=q.drip===2; sfx(lava?'sizzle':'plink',q.x,y,q.z,lava?.35:.45,12);
  for(let i=0;i<3;i++) parts.push({x:q.x,y:y+.02,z:q.z,vx:(Math.random()-.5)*1.2,vy:.8+Math.random(),vz:(Math.random()-.5)*1.2,t:.35,c:q.c,s:.03,ember:lava}); }
/* ---------- hooks: wrap existing actions so they make their sounds ---------- */
{ const W=(name,fn)=>{ const o=window[name]; if(typeof o!=='function') return; window[name]=fn(o); };
  W('placeSurv',o=>function(){ const f0=flash, r=o.apply(this,arguments); if(flash&&flash!==f0&&flash.place){ const [x,y,z]=flash.c; sfxBlock(world.get(x,y,z),'place',x,y,z); } return r; });
  W('fellTree',o=>function(x,y,z){ const k=world.get(x,y,z), n=o.apply(this,arguments); if(n>1){ sfx('treeFall',x+.5,y+3,z+.5,1,30); const lf=WOODS.find(w=>w.log===k); if(lf) burst(x+.5,y+4,z+.5,BLOCKS[lf.leaves].top,24,4); } else if(n===1) sfxBlock(k,'break',x,y,z); return n; });
  W('shoot',o=>function(){ const n=arrows.length, r=o.apply(this,arguments); if(arrows.length>n) sfx('bowShoot',null,null,null,.8); return r; });
  W('eat',o=>function(){ const c=player.eatCd, r=o.apply(this,arguments); if(player.eatCd!==c&&player.eatCd>0){ sfx('eat',null,null,null,.7); setTimeout(()=>sfx('burp',null,null,null,.45),800); } return r; });
  W('drinkMilk',o=>function(){ sfx('drink',null,null,null,.7); return o.apply(this,arguments); });
  W('hurt',o=>function(n){ const h=player.hp, r=o.apply(this,arguments); if(player.hp<h) sfx('hurt',null,null,null,.8); return r; });
  W('feed',o=>function(){ sfx('pop',null,null,null,.35); return o.apply(this,arguments); });
  W('toggleDoor',o=>function(x,y,z){ const b=world.get(x,y,z), d=BLOCKS[b]&&BLOCKS[b].door, r=o.apply(this,arguments); if(d){ const met=d.m.metal; sfx(met?(d.open?'metalClose':'metalOpen'):(d.open?'doorClose':'doorOpen'),x+.5,y+.5,z+.5,.8); } return r; });
  W('openBackpack',o=>function(){ SFX._bag=1; try{ return o.apply(this,arguments); } finally{ SFX._bag=0; } });
  W('openStore',o=>function(arr,title,key){ const r=o.apply(this,arguments); let snd='chestOpen', pos=null;
    if(SFX._bag) snd='bagOpen'; else if(typeof key==='string'&&/^-?\d+,-?\d+,-?\d+$/.test(key)){ pos=key.split(',').map(Number); if(MAT_OF[world.get(...pos)]===7) snd='metalOpen'; }
    SFX._store={snd:snd==='bagOpen'?'bagClose':snd==='metalOpen'?'metalClose':'chestClose',pos}; sfx(snd,pos&&pos[0]+.5,pos&&pos[1]+.5,pos&&pos[2]+.5,.8); return r; });
  W('closeStore',o=>function(){ const s=SFX._store; SFX._store=null; if(s) sfx(s.snd,s.pos&&s.pos[0]+.5,s.pos&&s.pos[1]+.5,s.pos&&s.pos[2]+.5,.8); return o.apply(this,arguments); });
  W('switchDim',o=>function(){ sfx(gate?'warp':'portalTravel',null,null,null,.9); return o.apply(this,arguments); });
  W('teleportPlayer',o=>function(x,y,z){ sfx('warp',null,null,null,.8); return o.apply(this,arguments); });
  W('walkerTeleport',o=>function(m){ sfx('warp',m.x,m.y+1,m.z,.8); const r=o.apply(this,arguments); sfx('warp',m.x,m.y+1,m.z,.8); return r; });
  W('lightPortalAt',o=>function(x,y,z){ const r=o.apply(this,arguments); if(r) sfx('ignite',x+.5,y+.5,z+.5,.9); return r; });
  W('setOpen',o=>function(x,y,z,open){ const b=world.get(x,y,z), r=o.apply(this,arguments), a=world.get(x,y,z); if(a!==b&&b>0){ const met=MAT_OF[b]===7; sfx(met?(open?'metalOpen':'metalClose'):(open?'doorOpen':'doorClose'),x+.5,y+.5,z+.5,.7); } return r; });
  W('useBucket',o=>function(){ const a=held()&&held().id, r=o.apply(this,arguments), c=held()&&held().id; if(a!==c) sfx(a===I.BUCKET_LAVA||c===I.BUCKET_LAVA?'lavaPop':'swim',null,null,null,.6); return r; });
  W('invChanged',o=>function(){ const r=o.apply(this,arguments); const sig=(inv.armor||[]).map(s=>s?s.id:0); const prev=SFX._arm; SFX._arm=sig;
    if(prev&&game()) for(let i=0;i<sig.length;i++) if(sig[i]!==prev[i]){ if(sig[i]){ const it=ITEMS[sig[i]], k=it.amat||'';
      sfx(/leather|wood/.test(k)?'equipLeather':/diamond|platinum|titanium/.test(k)?'equipGem':'equipMetal',null,null,null,.6); } else sfx('unequip',null,null,null,.5); break; }
    return r; }); }
// the volume slider in the pause menu
{ const r=document.getElementById('sfxVol'), out=document.getElementById('sfxOut'); if(r){ r.value=Math.round(SFX.vol*10); out.textContent=r.value;
  r.addEventListener('input',()=>{ out.textContent=r.value; sfxSetVol(r.value/10); sfx('pop',null,null,null,.5); }); } }
/* ---------- resource-pack sounds (Minecraft's sound file layout) ---------- */
const MC_SND={ 'step.stone':'step/stone','step.grass':'step/grass','step.dirt':'step/gravel','step.gravel':'step/gravel','step.sand':'step/sand','step.wood':'step/wood','step.leaves':'step/grass','step.metal':'step/stone',
  'step.glass':'step/stone','step.wool':'step/cloth','step.snow':'step/snow','step.slime':'mob/slime/small','step.plant':'step/grass','step.ladder':'step/ladder',
  'dig.stone':'dig/stone','dig.grass':'dig/grass','dig.dirt':'dig/gravel','dig.gravel':'dig/gravel','dig.sand':'dig/sand','dig.wood':'dig/wood','dig.leaves':'dig/grass','dig.metal':'dig/stone',
  'dig.glass':'random/glass','dig.wool':'dig/cloth','dig.snow':'dig/snow','dig.slime':'mob/slime/big','dig.plant':'dig/grass',
  splash:'liquid/splash',splashS:'liquid/splash2',swim:'liquid/swim',pop:'random/pop',orb:'random/orb',hurt:'damage/hit',fall:'damage/fallbig',eat:'random/eat',burp:'random/burp',drink:'random/drink',
  bowShoot:'random/bow',arrowHit:'random/bowhit',ignite:'fire/ignite',crackle:'fire/fire',lavaPop:'liquid/lavapop',plink:'block/pointed_dripstone/drip_water',sizzle:'block/pointed_dripstone/drip_lava',
  chestOpen:'random/chestopen',chestClose:'random/chestclosed',doorOpen:'random/door_open',doorClose:'random/door_close',equipLeather:'item/armor/equip_leather',equipMetal:'item/armor/equip_iron',
  equipGem:'item/armor/equip_diamond',portalTrigger:'portal/trigger',portalTravel:'portal/travel',warp:'mob/endermen/portal',cave:'ambient/cave/cave',bubbles:'ambient/underwater/additions/bubbles',
  'mob.cow.idle':'mob/cow/say','mob.cow.hurt':'mob/cow/hurt','mob.pig.idle':'mob/pig/say','mob.pig.hurt':'mob/pig/say','mob.chicken.idle':'mob/chicken/say','mob.chicken.hurt':'mob/chicken/hurt',
  'mob.sheep.idle':'mob/sheep/say','mob.sheep.hurt':'mob/sheep/say','mob.horse.idle':'mob/horse/idle','mob.horse.hurt':'mob/horse/hit','mob.wolf.idle':'mob/wolf/bark','mob.wolf.hurt':'mob/wolf/hurt',
  'mob.zombie.idle':'mob/zombie/say','mob.zombie.hurt':'mob/zombie/hurt','mob.zombie.death':'mob/zombie/death','mob.skeleton.idle':'mob/skeleton/say','mob.skeleton.hurt':'mob/skeleton/hurt',
  'mob.skeleton.death':'mob/skeleton/death','mob.spider.idle':'mob/spider/say','mob.spider.death':'mob/spider/death','mob.bat.idle':'mob/bat/idle','mob.bat.hurt':'mob/bat/hurt',
  'mob.slime.idle':'mob/slime/small','mob.slime.hurt':'mob/slime/small','mob.walker.idle':'mob/endermen/idle','mob.walker.hurt':'mob/endermen/hit','mob.walker.death':'mob/endermen/death' };
const MC_SND_LOOP={water:'liquid/water',lava:'liquid/lava',portal:'portal/portal',under:'ambient/underwater/underwater_ambience',cart:'minecart/base',fire:'fire/fire'};
function sfxPackBuf(key){ const L=SFX.pack[key]; return L&&L.length?L[Math.random()*L.length|0]:null; }
function sfxPackPlayBuf(o,buf,rate,vol){ const s=AC.createBufferSource(); s.buffer=buf; s.playbackRate.value=rate||1; const g=AC.createGain(); g.gain.value=vol??1; s.connect(g); g.connect(o); s.start(); return true; }
function sfxPackBlock(o,m,kind,b){ const k=(kind==='step'||kind==='hit'?'step.':'dig.')+(b===B.LADDER_N||LADDER_DIR[b]?'ladder':MATS_S[m]); const buf=sfxPackBuf(k)||(kind!=='step'&&kind!=='hit'?null:null); if(!buf) return false;
  return sfxPackPlayBuf(o,buf,(kind==='hit'?.5:kind==='step'?1:.8)*rr(.92,1.08),kind==='hit'?.6:1); }
function sfxPackNamed(o,name){ const buf=sfxPackBuf(name); return buf?sfxPackPlayBuf(o,buf,rr(.95,1.05)):false; }
function sfxPackMob(o,type,kind){ const v=MOB_VOICE(type); const buf=v&&(sfxPackBuf('mob.'+v+'.'+kind)||sfxPackBuf('mob.'+v+'.idle')); return buf?sfxPackPlayBuf(o,buf,rr(.9,1.1)):false; }
async function packSoundsFrom(z){ const out={}; const all=[...z.files.keys()]; const idx={}; for(const n of all){ const m=n.match(/(?:^|\/)assets\/minecraft\/sounds\/(.+?)(\d*)\.ogg$/i); if(m){ const k=m[1].toLowerCase(); (idx[k]=idx[k]||[]).push(n); } }
  const want=Object.assign({},MC_SND); for(const k in MC_SND_LOOP) want['loop.'+k]=MC_SND_LOOP[k];
  let n=0; for(const k in want){ const paths=idx[want[k]]; if(!paths) continue; out[k]=[]; for(const p of paths.slice(0,6)){ const d=await z.read(p); if(d){ out[k].push(d); n++; } } if(!out[k].length) delete out[k]; }
  return {sounds:out,count:n}; }
const LOOPS_BASE=Object.assign({},LOOPS);
async function applyPackSounds(rec){ SFX.pack={}; Object.assign(LOOPS,LOOPS_BASE); for(const k in SFX.amb){ try{ SFX.amb[k].g.disconnect(); }catch(e){} } SFX.amb={};
  if(!rec||!rec.sounds) return; const c=ac(); if(!c) return;
  for(const k in rec.sounds){ const arr=[]; for(const ab of rec.sounds[k]){ try{ arr.push(await c.decodeAudioData(ab.slice(0))); }catch(e){} } if(arr.length) SFX.pack[k]=arr; }
  for(const k in MC_SND_LOOP){ const L=SFX.pack['loop.'+k]; if(!L) continue; LOOPS[k]=(c,g)=>{ const s=c.createBufferSource(); s.buffer=L[0]; s.loop=true; s.connect(g); s.start(); }; } }
