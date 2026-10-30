F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep('<section id="journal" class="panel"','''<section id="music" class="panel" aria-label="Music" hidden>
  <header><h2 id="muTitle">Music</h2><label class="ghost filebtn" style="padding:8px 12px">Import MIDI<input type="file" id="muFile" accept=".mid,.midi,audio/midi,audio/x-midi" multiple></label><button class="ghost" id="muStop">Stop</button><button class="primary" id="muClose">Done</button></header>
  <div class="paintBody" style="display:block">
    <div id="muNow" class="hint"></div>
    <div id="muKeys" class="mukeys"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0"><label><input type="checkbox" id="muAll" checked> Every channel on this instrument</label><label>Volume <input type="range" id="muVol" min="0" max="1" step=".05" value=".7"></label></div>
    <div id="muSongs"></div><div id="muChans"></div></div>
</section>
<section id="journal" class="panel"''')
rep("#mapHud{opacity:.88;","""#muSongs .row{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)}#muSongs .row span{flex:1}#muSongs button{padding:6px 10px;border-radius:8px}
.mukeys{display:flex;gap:2px;margin:8px 0;overflow-x:auto;touch-action:none}.mukeys button{flex:0 0 auto;width:34px;height:70px;border-radius:0 0 6px 6px;background:#f4f1ea;color:#333;font-size:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;border:1px solid #999}
.mukeys button.blk{background:#2a2a30;color:#ccc;height:52px;width:26px;margin:0 -14px;z-index:1;position:relative}.mukeys button.on{background:#f0b548!important}
#muChans .ch{display:flex;gap:8px;align-items:center;margin:4px 0}#muChans select{background:#1d2530;color:#fff;border:1px solid #445;border-radius:6px;padding:4px}
#mapHud{opacity:.88;""")

BLK10=r'''
NB('JUKEBOX'); def(B.JUKEBOX,'Jukebox','#5a3a22','#7a4f2a',0,{decor:1,jukebox:1}); pat(B.JUKEBOX,PT.CHISEL,PT.PLANK);
'''
rep("for(const d of DYES){ d.elev=NB('ELEV_'+d.k);",BLK10+"for(const d of DYES){ d.elev=NB('ELEV_'+d.k);")
ITEMS10=r'''
const INSTR={piano:{name:'Piano',w:'triangle',a:.004,d:1.2,s:0,r:.3,o:0,h:.5},lute:{name:'Lute',w:'sawtooth',a:.003,d:.6,s:0,r:.15,lp:2400,o:0},flute:{name:'Bone flute',w:'sine',a:.06,d:.2,s:.85,r:.12,vib:5,o:1},
  harp:{name:'Harp',w:'triangle',a:.002,d:1.6,s:0,r:.4,o:0,h:.3},violin:{name:'Vielle',w:'sawtooth',a:.09,d:.3,s:.9,r:.2,lp:3000,vib:6,o:0},bass:{name:'Bass',w:'square',a:.005,d:.5,s:.5,r:.12,lp:700,o:-1},
  handpan:{name:'Handpan',w:'sine',a:.003,d:1.8,s:0,r:.5,o:0,h:.6,bell:1},musicbox:{name:'Music box',w:'sine',a:.002,d:.9,s:0,r:.3,o:1,h:.25,bell:1},synth:{name:'Synth',w:'square',a:.01,d:.3,s:.6,r:.1,lp:3500,o:0},drums:{name:'Drum kit',drum:1}};
for(const k in INSTR) INSTR[k].item=NI('INST_'+k.toUpperCase(),INSTR[k].name,{stack:1,instrument:k});
NI('DISC_BLANK','Blank music disc'); NI('DISC','Music disc',{stack:1,disc:1});
'''
rep("NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});",ITEMS10+"NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});")
RECIPES10=r'''
{ const IR={piano:[['III','PPP','P.P'],{I:[I.IRON]}],lute:[['..S','PPF','PP.'],{F:[I.STRING]}],flute:[['X','X','X'],{X:[I.BONE]}],harp:[['GSG','GFG'],{G:[I.GOLD],F:[I.STRING]}],
    violin:[['.PF','PPF','.S.'],{F:[I.STRING]}],bass:[['.PF','PPF','PPF'],{F:[I.STRING]}],handpan:[['.I.','III','.I.'],{I:[I.IRON]}],musicbox:[['PPP','PNP','PPP'],{N:[I.NUG_IRON]}],
    synth:[['III','RNR'],{I:[I.IRON],R:[I.LUMEN],N:[I.GOLD]}],drums:[['EEE','P.P','PPP'],{E:[I.LEATHER]}]};
  for(const k in IR) r_(INSTR[k].item,1,IR[k][0],{keys:IR[k][1],tier:k==='synth'||k==='harp'||k==='handpan'||k==='piano'?2:0,cat:'decor'});
  r_(B.JUKEBOX,1,['PPP','PDP','PPP'],{keys:{D:[I.DIAMOND]},cat:'decor'}); r_(I.DISC_BLANK,1,['.C.','CNC','.C.'],{keys:{C:[I.COAL,I.CHARCOAL],N:[I.NUG_IRON]},cat:'decor'}); }
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES10+"// every wood's logs make its own planks; material keys accept every variant")
rep("const ORE_NAME={2:'stone',","spec(B.JUKEBOX,2.2,'axe');\nconst ORE_NAME={2:'stone',")

CODE10=r'''
/* =====================================================================
   STAGE 10: music — instruments, MIDI import, jukeboxes and discs (in the spirit of Immersive Melodies / MIMI)
   ===================================================================== */
let AC=null, MASTER=null;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); MASTER=AC.createGain(); MASTER.gain.value=.8; MASTER.connect(AC.destination); }catch(e){ return null; } } if(AC.state==='suspended') AC.resume(); return AC; }
let noiseBuf=null; function noise(){ if(!noiseBuf){ const c=ac(); noiseBuf=c.createBuffer(1,c.sampleRate*.5,c.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return noiseBuf; }
let voices=0;
function playNote(inst,note,vel,when,dur,out){ const c=ac(); if(!c||voices>40) return; const I=INSTR[inst]||INSTR.piano; voices++; setTimeout(()=>voices--,(when-c.currentTime+dur+.6)*1000);
  const g=c.createGain(), v=Math.pow(vel/127,1.4)*.32; g.connect(out);
  if(I.drum){ const src=c.createBufferSource(); src.buffer=noise(); const f=c.createBiquadFilter();
    if(note<=36){ const o=c.createOscillator(); o.frequency.setValueAtTime(140,when); o.frequency.exponentialRampToValueAtTime(40,when+.15); const og=c.createGain(); og.gain.setValueAtTime(v*2.2,when); og.gain.exponentialRampToValueAtTime(.001,when+.25); o.connect(og); og.connect(out); o.start(when); o.stop(when+.3); g.disconnect(); return; }
    const hat=note===42||note===44||note===46||note>=49; f.type=hat?'highpass':'bandpass'; f.frequency.value=hat?7000:1800; const len=hat?(note===46?.25:.06):.18;
    g.gain.setValueAtTime(v*(hat?.7:1.3),when); g.gain.exponentialRampToValueAtTime(.001,when+len); src.connect(f); f.connect(g); src.start(when); src.stop(when+len+.05); return; }
  const fr=440*Math.pow(2,(note-69)/12+I.o), o=c.createOscillator(); o.type=I.w; o.frequency.value=fr; let node=o;
  if(I.vib){ const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=I.vib; lg.gain.value=fr*.006; l.connect(lg); lg.connect(o.frequency); l.start(when); l.stop(when+dur+I.r+.1); }
  if(I.lp){ const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=I.lp; node.connect(f); node=f; }
  node.connect(g);
  if(I.h){ const o2=c.createOscillator(); o2.type='sine'; o2.frequency.value=fr*(I.bell?2.76:2); const g2=c.createGain(); g2.gain.value=I.h; o2.connect(g2); g2.connect(g); o2.start(when); o2.stop(when+dur+I.r+1); }
  const end=I.s>0?when+dur:when+Math.min(dur+.2,I.d), peak=v;
  g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(peak,when+I.a);
  if(I.s>0){ g.gain.setTargetAtTime(peak*I.s,when+I.a,I.d*.3); g.gain.setTargetAtTime(0,end,I.r/3); } else { g.gain.setTargetAtTime(0,when+I.a,I.d/3); }
  o.start(when); o.stop(end+I.r+1.2); }
// ---------- MIDI files ----------
function parseMidi(buf){ const d=new DataView(buf); let p=0; const str=n=>{ let s=''; for(let i=0;i<n;i++) s+=String.fromCharCode(d.getUint8(p+i)); p+=n; return s; };
  const u32=()=>{ const v=d.getUint32(p); p+=4; return v; }, u16=()=>{ const v=d.getUint16(p); p+=2; return v; }, vlq=()=>{ let v=0,b; do{ b=d.getUint8(p++); v=(v<<7)|(b&127); }while(b&128); return v; };
  if(str(4)!=='MThd') throw new Error('Not a MIDI file'); const hl=u32(), fmt=u16(), nt=u16(), div=u16(); p=8+hl; if(div&0x8000) throw new Error('SMPTE timing is not supported');
  const raw=[], tempos=[[0,500000]];
  for(let t=0;t<nt&&p<d.byteLength;t++){ if(str(4)!=='MTrk'){ break; } const len=u32(), end=p+len; let tick=0, run=0;
    while(p<end){ tick+=vlq(); let st=d.getUint8(p); if(st&128){ p++; run=st; } else st=run;
      const ty=st&0xf0, ch=st&15;
      if(st===0xff){ const mt=d.getUint8(p++), ml=vlq(); if(mt===0x51) tempos.push([tick,(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)]); p+=ml; }
      else if(st===0xf0||st===0xf7){ p+=vlq(); }
      else if(ty===0x80||ty===0x90){ const n=d.getUint8(p), v=d.getUint8(p+1); p+=2; raw.push({tick,on:ty===0x90&&v>0,n,v,ch}); }
      else if(ty===0xc0){ raw.push({tick,prog:d.getUint8(p),ch}); p+=1; }
      else if(ty===0xd0){ p+=1; } else { p+=2; } }
    p=end; }
  tempos.sort((a,b)=>a[0]-b[0]); const secAt=tk=>{ let s=0,lt=0,us=500000; for(const [t,u] of tempos){ if(t>tk) break; s+=(t-lt)*us/div/1e6; lt=t; us=u; } return s+(tk-lt)*us/div/1e6; };
  raw.sort((a,b)=>a.tick-b.tick); const open={}, notes=[], prog={}, chans={};
  for(const e of raw){ if(e.prog!=null){ prog[e.ch]=e.prog; continue; } const k=e.ch*128+e.n;
    if(e.on){ open[k]=open[k]||[]; open[k].push(e); } else { const o=open[k]&&open[k].shift(); if(o){ const t=secAt(o.tick); notes.push({t,d:Math.max(.05,secAt(e.tick)-t),n:e.n,v:o.v,c:e.ch}); chans[e.ch]=prog[e.ch]??0; } } }
  for(const k in open) for(const o of open[k]){ const t=secAt(o.tick); notes.push({t,d:.3,n:o.n,v:o.v,c:o.ch}); chans[o.ch]=prog[o.ch]??0; }
  notes.sort((a,b)=>a.t-b.t); const t0=notes.length?notes[0].t:0; for(const n of notes) n.t-=t0;   // trim leading silence
  return {notes,chans,len:notes.length?Math.max(...notes.map(n=>n.t+n.d)):0}; }
const gmInst=(ch,prog)=>ch===9?'drums':prog<8?'piano':prog<16?'musicbox':prog<24?'synth':prog<32?'lute':prog<40?'bass':prog===46?'harp':prog<48?'violin':prog<56?'violin':prog<72?'synth':prog<80?'flute':prog<104?'synth':prog<112?'lute':prog<120?'handpan':'synth';
// ---------- built-in songs (original tunes) ----------
function tune(name,bpm,parts){ const notes=[], beat=60/bpm, N={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  parts.forEach(([inst,ch,txt])=>{ let t=0; for(const tok of txt.trim().split(/\s+/)){ const [nn,len]=tok.split(':'); const L=parseFloat(len||'1')*beat;
      if(nn!=='r'){ for(const one of nn.split('+')){ const m=one.match(/^([A-G])([#b]?)(\d)$/); if(!m) continue; const n=12*(+m[3]+1)+N[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0); notes.push({t,d:L*.9,n,v:ch===9?100:92,c:ch}); } } t+=L; } });
  notes.sort((a,b)=>a.t-b.t); const chans={}; parts.forEach(([inst,ch])=>chans[ch]={piano:0,harp:46,flute:73,bass:33,musicbox:10,violin:40,lute:24,drums:0,handpan:114,synth:80}[inst]); return {name,notes,chans,len:Math.max(...notes.map(n=>n.t+n.d)),builtin:1}; }
const BUILTIN={
  strata:tune('Strata (title)',96,[['harp',0,'E4:1 G4:1 B4:1 E5:1 D5:1 B4:1 G4:2 C4:1 E4:1 G4:1 C5:1 B4:1 G4:1 E4:2 A3:1 C4:1 E4:1 A4:1 G4:1 E4:1 C4:1 D4:1 B3:1 D4:1 G4:1 B4:2 A4:2 B4:4'],
    ['bass',1,'E2:4 E2:4 C2:4 C2:4 A1:4 A1:4 G1:4 B1:4'],['flute',2,'r:16 G5:3 F#5:1 E5:4 r:4 E5:2 D5:2 B4:4 D5:4']]),
  dusk:tune('Dusk waltz',132,[['musicbox',0,'A4:1 C5:1 E5:1 D5:2 C5:1 B4:3 G4:1 B4:1 D5:1 C5:2 B4:1 A4:3 F4:1 A4:1 C5:1 E5:2 D5:1 C5:3 B4:1 G#4:1 B4:1 A4:3'],
    ['bass',1,'A2:3 G2:3 G2:3 A2:3 F2:3 F2:3 E2:3 A2:3'],['violin',2,'r:12 E5:3 D5:3 C5:3 E5:3']]),
  lantern:tune('Lantern lullaby',72,[['piano',0,'G4:1 E4:1 G4:1 C5:2 B4:1 A4:1 G4:3 r:1 F4:1 A4:1 C5:1 F5:2 E5:1 D5:1 C5:4 E5:1 D5:1 C5:1 B4:1 A4:1 G4:1 F4:1 E4:1 D4:2 G4:2 C4:4'],
    ['bass',1,'C3+G3:4 C3+G3:4 F2+C3:4 C3+G3:4 A2+E3:4 F2+C3:4 G2+D3:4 C3+G3:4']]),
  jig:tune('Kitsune jig',168,[['flute',0,'D5:1 F#5:1 A5:1 F#5:1 D5:1 F#5:1 G5:1 E5:1 C#5:1 E5:1 A5:1 E5:1 D5:1 F#5:1 A5:1 D6:1 C#6:1 A5:1 B5:1 G5:1 E5:1 A5:1 F#5:1 D5:2 r:1'],
    ['lute',1,'D3+A3:3 D3+A3:3 A2+E3:3 A2+E3:3 D3+A3:3 D3+A3:3 G2+D3:3 A2+E3:3 D3+A3:2'],['drums',9,'C2:1 F#2:1 F#2:1 D2:1 F#2:1 F#2:1 C2:1 F#2:1 F#2:1 D2:1 F#2:1 F#2:1 C2:1 F#2:1 F#2:1 D2:1 F#2:1 F#2:1 C2:1 F#2:1 F#2:1 D2:1 F#2:1 F#2:1']])};
// imported songs live in the browser (shared by every world)
function userSongs(){ return store.get('strata:songs')||{}; }
function songById(id){ if(BUILTIN[id]) return BUILTIN[id]; const u=userSongs()[id]; if(!u) return null; if(!songCache[id]){ try{ const s=parseMidi(unb64(u.data).buffer); s.name=u.name; songCache[id]=s; }catch(e){ return null; } } return songCache[id]; }
const songCache={};
// ---------- players: something making music at a place (you, a jukebox) ----------
const players=[];
function startSong(id,opts){ const c=ac(); if(!c) return null; const s=songById(id); if(!s){ toast('That song could not be loaded'); return null; }
  stopSong(opts.key); const out=c.createGain(); out.gain.value=0; out.connect(MASTER);
  const p={id,key:opts.key,song:s,inst:opts.inst||null,all:!!opts.all,mute:opts.mute||{},map:opts.map||{},pos:opts.pos,out,t0:c.currentTime+.08,i:0,loop:!!opts.loop,vol:opts.vol??.7}; players.push(p); return p; }
function stopSong(key){ for(let i=players.length-1;i>=0;i--) if(players[i].key===key){ const p=players[i]; try{ p.out.gain.setTargetAtTime(0,AC.currentTime,.05); setTimeout(()=>p.out.disconnect(),400); }catch(e){} players.splice(i,1); } }
function stepMusic(dt){ if(!AC||!players.length) return; const now=AC.currentTime;
  for(let k=players.length-1;k>=0;k--){ const p=players[k], s=p.song; const pos=p.pos(); if(!pos){ stopSong(p.key); continue; }
    const dist=Math.hypot(pos[0]-player.x,pos[1]-player.y,pos[2]-player.z), g=Math.max(0,1-dist/28)*p.vol; p.out.gain.setTargetAtTime(g,now,.1);
    while(p.i<s.notes.length&&p.t0+s.notes[p.i].t<now+.35){ const n=s.notes[p.i++]; if(p.mute[n.c]) continue; const when=Math.max(now,p.t0+n.t);
      const inst=p.all&&p.inst?(n.c===9&&p.inst!=='drums'?null:p.inst):(p.map[n.c]||gmInst(n.c,s.chans[n.c]||0)); if(!inst) continue; if(g>.01) playNote(inst,n.n,n.v,when,n.d,p.out); }
    if(Math.random()<dt*4&&g>.02) parts.push({x:pos[0]+(Math.random()-.5)*.6,y:pos[1]+1.2,z:pos[2]+(Math.random()-.5)*.6,vx:0,vy:.9,vz:0,t:1.2,c:hsl(Math.random()*360),s:.07});
    if(p.i>=s.notes.length&&now>p.t0+s.len+.3){ if(p.loop){ p.i=0; p.t0=now+.4; } else { stopSong(p.key); if(p.key==='me') player.playing=null; } } } }
// ---------- the music panel (instruments, imports, discs) ----------
let muCtx=null;
function openMusic(ctx){ muCtx=ctx; ac(); mode='ui'; mining=null; document.getElementById('music').hidden=false; renderMusic(); }
function closeMusic(){ document.getElementById('music').hidden=true; muCtx=null; if(mode==='ui'){ mode='play'; last=performance.now(); } renderHotbar(); }
document.getElementById('muClose').addEventListener('click',closeMusic);
document.getElementById('muStop').addEventListener('click',()=>{ if(muCtx&&muCtx.jukebox){ stopSong('jb:'+muCtx.jukebox); } else { stopSong('me'); player.playing=null; } renderMusic(); });
document.getElementById('muVol').addEventListener('input',e=>{ for(const p of players) p.vol=+e.target.value; });
document.getElementById('muFile').addEventListener('change',async ev=>{ const U=userSongs(); let n=0;
  for(const f of ev.target.files){ try{ const buf=await f.arrayBuffer(); const sng=parseMidi(buf); if(!sng.notes.length) throw new Error('no notes'); const id='u'+Date.now().toString(36)+n; U[id]={name:f.name.replace(/\.midi?$/i,''),data:b64(new Uint8Array(buf))}; n++; }
    catch(e){ toast(`Could not read ${f.name}: ${e.message}`); } }
  if(n){ store.set('strata:songs',U); toast(`Imported ${n} song${n>1?'s':''}`); } ev.target.value=''; renderMusic(); });
function renderMusic(){ const ctx=muCtx||{}, inst=ctx.inst, jb=ctx.jukebox;
  document.getElementById('muTitle').textContent=jb?'Jukebox':inst?INSTR[inst].name:'Music';
  const playing=players.find(p=>p.key===(jb?'jb:'+jb:'me'));
  document.getElementById('muNow').textContent=playing?'Now playing: '+playing.song.name:jb?'Pick a song, or burn one onto a blank disc':'Pick a song to play on your '+INSTR[inst].name.toLowerCase()+', or tap the keys';
  document.getElementById('muAll').parentElement.hidden=!inst||jb;
  // live keyboard for the held instrument
  const K=document.getElementById('muKeys'); K.innerHTML=''; K.hidden=!inst||!!jb;
  if(inst&&!jb){ const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], base=inst==='bass'?36:inst==='drums'?35:60;
    for(let n=base;n<base+(inst==='drums'?12:25);n++){ const b=document.createElement('button'), blk=names[n%12].includes('#')&&inst!=='drums'; b.className=blk?'blk':''; b.textContent=inst==='drums'?n:names[n%12]+(n%12===0?Math.floor(n/12)-1:'');
      b.addEventListener('pointerdown',e=>{ e.preventDefault(); const c=ac(); if(!c) return; playNote(inst,n,100,c.currentTime,.6,MASTER); b.classList.add('on'); setTimeout(()=>b.classList.remove('on'),150); player.swingT=.2; }); K.appendChild(b); } }
  const L=document.getElementById('muSongs'); L.innerHTML='';
  const ids=[...Object.keys(BUILTIN),...Object.keys(userSongs())], U=userSongs();
  for(const id of ids){ const nm=BUILTIN[id]?BUILTIN[id].name:U[id].name, row=document.createElement('div'); row.className='row'; row.innerHTML=`<span></span>`; row.firstChild.textContent=nm+(BUILTIN[id]?'':' · imported');
    const play=document.createElement('button'); play.className='primary'; play.textContent='Play'; play.addEventListener('click',()=>{
      if(jb){ const [x,y,z]=jb.split(',').map(Number); startSong(id,{key:'jb:'+jb,pos:()=>BLOCKS[world.get(x,y,z)]?.jukebox?[x+.5,y+.5,z+.5]:null,loop:true,vol:+document.getElementById('muVol').value}); }
      else { const all=document.getElementById('muAll').checked; startSong(id,{key:'me',inst,all,pos:()=>{ const s=held(); return s&&ITEMS[s.id].instrument===inst?[player.x,player.y+1,player.z]:null; },vol:+document.getElementById('muVol').value,map:muMap,mute:muMute}); player.playing=inst; }
      renderMusic(); }); row.appendChild(play);
    const disc=document.createElement('button'); disc.className='ghost'; disc.textContent='Burn disc'; disc.addEventListener('click',()=>{ if(!creative()){ if(!countItem([I.DISC_BLANK])){ toast('You need a blank music disc'); return; } takeItem([I.DISC_BLANK],1); }
      const left=addItem(I.DISC,1); if(!left) inv.slots[inv.landed].x={song:id,name:nm,col:Math.random()*360|0}; toast('Burned “'+nm+'” to a disc'); }); row.appendChild(disc);
    if(!BUILTIN[id]){ const del=document.createElement('button'); del.className='ghost'; del.textContent='Delete'; del.addEventListener('click',()=>{ const U2=userSongs(); delete U2[id]; store.set('strata:songs',U2); renderMusic(); }); row.appendChild(del); }
    L.appendChild(row); }
  // per-channel mapping for the last chosen song (when not forcing every channel onto one instrument)
  const C=document.getElementById('muChans'); C.innerHTML=''; const p=players.find(q=>q.key==='me');
  if(p&&!jb&&!document.getElementById('muAll').checked){ C.innerHTML='<h3>Channels</h3>'; for(const ch of Object.keys(p.song.chans)){ const row=document.createElement('div'); row.className='ch';
      const on=document.createElement('input'); on.type='checkbox'; on.checked=!muMute[ch]; on.addEventListener('change',()=>{ muMute[ch]=!on.checked; });
      const sel=document.createElement('select'); for(const k in INSTR){ const o=document.createElement('option'); o.value=k; o.textContent=INSTR[k].name; sel.appendChild(o); } sel.value=muMap[ch]||gmInst(+ch,p.song.chans[ch]); sel.addEventListener('change',()=>{ muMap[ch]=sel.value; });
      row.append(on,document.createTextNode(' Channel '+(+ch+1)+(ch==9?' (drums)':'')+' '),sel); C.appendChild(row); } } }
const muMap={}, muMute={};
document.getElementById('muAll').addEventListener('change',()=>{ const p=players.find(q=>q.key==='me'); if(p) p.all=document.getElementById('muAll').checked; renderMusic(); });
// jukebox taps: insert a disc to play it (loops), tap again to take it out
function tapJukebox(x,y,z){ const k=x+','+y+','+z, t=getTileGeneric(x,y,z,'jukebox'), s=held();
  if(t.disc){ stopSong('jb:'+k); const left=addItem(I.DISC,1); if(!left) inv.slots[inv.landed].x=t.disc; else spawnDrop(x+.5,y+1,z+.5,I.DISC,1); t.disc=null; toast('Ejected the disc'); return; }
  if(s&&s.id===I.DISC&&s.x){ t.disc=s.x; inv.slots[inv.sel]=null; invChanged(); startSong(s.x.song,{key:'jb:'+k,pos:()=>BLOCKS[world.get(x,y,z)]?.jukebox?[x+.5,y+.5,z+.5]:null,loop:true}); toast('♪ '+s.x.name); return; }
  openMusic({jukebox:k}); }
'''
rep("/* ---------- stage 6: decor entities ---------- */",CODE10+"\n/* ---------- stage 6: decor entities ---------- */")
rep("stepPortal(dt); stepThrown(dt); stepGate(dt); stepDuskAmbient(dt); }","stepPortal(dt); stepThrown(dt); stepGate(dt); stepDuskAmbient(dt); } stepMusic(dt);")
rep("  if(b===B.POCKET&&!player.crouch){","  if(b===B.JUKEBOX){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; } ac(); tapJukebox(x,y,z); return true; }\n  if(b===B.POCKET&&!player.crouch){")
rep("const INTERACTIVE=b=>b===B.POCKET||","const INTERACTIVE=b=>b===B.JUKEBOX||b===B.POCKET||")
rep("  if(BLOCKS[b].drawer) spillDrawer(x,y,z);","  if(BLOCKS[b].drawer) spillDrawer(x,y,z);\n  if(b===B.JUKEBOX){ const t=world.tiles.get(tileKey(x,y,z)); stopSong('jb:'+x+','+y+','+z); if(t&&t.disc){ spawnDrop(x+.5,y+1,z+.5,I.DISC,1); drops[drops.length-1].x=t.disc; } world.tiles.delete(tileKey(x,y,z)); }")
rep("  if(s.id===I.DUSK_ORB){ throwOrb(sx,sy); return true; }","  if(it.instrument){ openMusic({inst:it.instrument}); return true; } if(it.disc){ toast(s.x?'♪ '+s.x.name+' · put it in a jukebox':'A music disc'); return true; }\n  if(s.id===I.DUSK_ORB){ throwOrb(sx,sy); return true; }")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.instrument||it.disc||")
# discs keep their song when dropped and picked up
rep("if(dist<.95){ const left=addItem(q.id,q.n,q.d,q.bag);","if(dist<.95){ const left=addItem(q.id,q.n,q.d,q.bag); if(q.x&&left<q.n) inv.slots[inv.landed].x=q.x;")
rep("tiles:[...world.tiles.values()].map(t=>({id:t.id,n:t.n,kind:t.kind,","tiles:[...world.tiles.values()].map(t=>({disc:t.disc||null,size:t.size,id:t.id,n:t.n,kind:t.kind,")
# playing pose: hold the instrument up and strum/bob
rep("  if(bowDraw) armA=-1.55; if(p.gliding) armA=-2.9;","  if(bowDraw) armA=-1.55; if(p.gliding) armA=-2.9; if(p.playing&&players.some(q=>q.key==='me')) armA=-1.2+Math.sin(performance.now()/120)*.25;")
# icons and labels
rep("    if(it.telelink){","""    if(it.instrument){ const k=it.instrument; g.lineCap='round';
      if(k==='piano'||k==='synth'){ g.fillStyle=k==='piano'?'#2a2a30':'#4a3a70'; g.fillRect(6,20,48,24); g.fillStyle='#f4f1ea'; for(let i=0;i<7;i++) g.fillRect(9+i*6.5,28,5,14); g.fillStyle='#111'; for(const i of [0,1,3,4,5]) g.fillRect(13+i*6.5,28,3,8); }
      else if(k==='drums'){ g.fillStyle='#c83c3c'; g.fillRect(14,26,32,22); g.fillStyle='#f4efe2'; g.beginPath(); g.ellipse(30,26,16,6,0,0,7); g.fill(); g.strokeStyle='#8a5a34'; g.lineWidth=3; g.beginPath(); g.moveTo(16,8); g.lineTo(26,22); g.moveTo(44,8); g.lineTo(34,22); g.stroke(); }
      else if(k==='flute'){ g.strokeStyle='#ece8dc'; g.lineWidth=7; g.beginPath(); g.moveTo(10,48); g.lineTo(50,12); g.stroke(); g.fillStyle='#555'; for(let i=0;i<4;i++){ g.beginPath(); g.arc(22+i*7,38-i*6.5,1.8,0,7); g.fill(); } }
      else if(k==='harp'){ g.strokeStyle='#e9bf3f'; g.lineWidth=5; g.beginPath(); g.moveTo(16,54); g.lineTo(16,8); g.quadraticCurveTo(44,10,48,40); g.lineTo(16,54); g.stroke(); g.strokeStyle='#eee'; g.lineWidth=1; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(20+i*5,14+i*3); g.lineTo(20+i*5,50-i*2); g.stroke(); } }
      else if(k==='handpan'||k==='musicbox'){ g.fillStyle=k==='handpan'?'#8e99a6':'#a8743f'; if(k==='handpan'){ g.beginPath(); g.ellipse(30,32,24,16,0,0,7); g.fill(); g.fillStyle='#6a737e'; for(const [x,y] of [[30,30],[18,32],[42,32],[30,40]]){ g.beginPath(); g.ellipse(x,y,5,3,0,0,7); g.fill(); } } else { g.fillRect(10,20,40,28); g.fillStyle='#d6b06a'; g.fillRect(10,16,40,6); g.fillStyle='#ffd84a'; g.fillRect(48,30,8,3); } }
      else { const col=k==='bass'?'#5a3a22':k==='violin'?'#8a3a1e':'#b88a52'; g.fillStyle=col; g.beginPath(); g.ellipse(24,38,14,13,0,0,7); g.fill(); g.strokeStyle='#3a2414'; g.lineWidth=5; g.beginPath(); g.moveTo(30,30); g.lineTo(50,8); g.stroke(); g.fillStyle='#111'; g.beginPath(); g.arc(24,38,4,0,7); g.fill(); }
      return c; }
    if(it.disc||id===I.DISC_BLANK){ g.fillStyle='#18181c'; g.beginPath(); g.arc(30,30,24,0,7); g.fill(); g.strokeStyle='#2c2c33'; g.lineWidth=1; for(const r of [10,15,20]){ g.beginPath(); g.arc(30,30,r,0,7); g.stroke(); } g.fillStyle=id===I.DISC_BLANK?'#888':'#e86a3c'; g.beginPath(); g.arc(30,30,7,0,7); g.fill(); g.fillStyle='#000'; g.beginPath(); g.arc(30,30,2,0,7); g.fill(); return c; }
    if(it.telelink){""")
rep("||it.telelink||it.lore||it.expander||it.starter||","||it.instrument||it.disc||id===I.DISC_BLANK||it.telelink||it.lore||it.expander||it.starter||",cnt=2)
rep("${s.x&&s.x.xp!=null&&s.id===I.XP_BOOK?' · '+s.x.xp+' XP':''}","${s.x&&s.x.xp!=null&&s.id===I.XP_BOOK?' · '+s.x.xp+' XP':''}${s.x&&s.x.song&&s.x.name?' · '+s.x.name:''}")
# star island chests and fishing can turn up built-in discs
rep("    else if(q<.86) put(I.XP_BOOK,1,{xp:40+(r()*160|0)});","    else if(q<.83){ const ks=Object.keys(BUILTIN), kk=ks[r()*ks.length|0]; put(I.DISC,1,{song:kk,name:BUILTIN[kk].name}); }\n    else if(q<.86) put(I.XP_BOOK,1,{xp:40+(r()*160|0)});")
open(F,'w').write(s); print('ok')
