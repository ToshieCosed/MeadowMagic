F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

# ---------- fixes ----------
# music keeps playing while menus are open, and notes that fall behind are skipped instead of piling up
rep("  let dt=Math.min(.05,(now-last)/1000); last=now;\n  if(document.hidden) return;","  let dt=Math.min(.05,(now-last)/1000); last=now;\n  if(document.hidden) return;\n  if(typeof stepMusic==='function') stepMusic(dt);")
rep("stepDuskAmbient(dt); } stepMusic(dt);","stepDuskAmbient(dt); }")
rep("const n=s.notes[p.i++]; if(p.mute[n.c]) continue; const when=Math.max(now,p.t0+n.t);","const n=s.notes[p.i++]; if(p.mute[n.c]) continue; if(p.t0+n.t<now-.12) continue; const when=Math.max(now,p.t0+n.t);")
# pocket rooms: cut the ceiling away in the overhead view, like the Underworld
rep("  gl.uniform1f(U.uRoof,world.meta&&world.meta.dim==='under'&&!cam.persp?Math.floor(player.y)+5.99:0);",
    "  gl.uniform1f(U.uRoof,world.meta&&(world.meta.dim==='under'||world.meta.dim==='pocket')&&!cam.persp?Math.floor(player.y)+(world.meta.dim==='pocket'?3.99:5.99):0);")

# ---------- fonts for books and signs ----------
rep('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@500&family=Caveat:wght@500;700&family=Cinzel:wght@500;700&family=Special+Elite&family=Press+Start+2P&family=Dancing+Script:wght@600&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Pirata+One&display=swap">')
rep('<section id="journal" class="panel"','''<section id="fwUI" hidden aria-label="ForgeWrite">
  <div class="fw-wrap">
    <div class="fw-bar" id="fwBar"></div>
    <div class="fw-book"><div id="fwPage" class="fw-page" spellcheck="false"></div></div>
    <div class="fw-foot"><button class="ghost" id="fwPrev">‹</button><span id="fwNum"></span><button class="ghost" id="fwNext">›</button><button class="ghost" id="fwAdd">+ Page</button><button class="ghost" id="fwDel">Remove page</button>
      <span style="flex:1"></span><button class="ghost" id="fwSign">Sign…</button><button class="primary" id="fwDone">Done</button></div>
    <div class="fw-signbox" id="fwSignBox" hidden><input id="fwTitle" maxlength="32" placeholder="Title"><input id="fwAuthor" maxlength="24" placeholder="Author"><button class="primary" id="fwSignOk">Sign and close</button><button class="ghost" id="fwSignNo">Cancel</button><p class="hint">Signing makes it read-only, like a written book.</p></div>
  </div>
</section>
<section id="signUI" class="panel" aria-label="Sign" hidden>
  <header><h2>Sign</h2><button class="ghost" id="sgRemove">Take down</button><button class="primary" id="sgDone">Done</button></header>
  <div class="paintBody"><div class="stack" style="min-width:240px">
    <textarea id="sgText" rows="4" maxlength="120" placeholder="Write up to four lines"></textarea>
    <div class="sgrow"><label>Font <select id="sgFont"></select></label><label>Align <select id="sgAlign"><option value="center">Centre</option><option value="left">Left</option><option value="right">Right</option></select></label><label><input type="checkbox" id="sgGlow"> Glow</label></div>
    <div><div class="hint">Text colour</div><div id="sgCols" class="sgcols"></div></div>
    <div class="sgrow"><label>Frame <select id="sgFrame"></select></label><label>Background <select id="sgBg"></select></label></div></div>
    <canvas id="sgPrev" width="256" height="154" style="width:min(80vw,320px);border-radius:6px"></canvas></div>
</section>
<section id="journal" class="panel"''')
rep("#mapHud{opacity:.88;","""#fwUI{position:fixed;inset:0;z-index:8;display:grid;place-items:center;background:rgba(10,8,6,.55)}
.fw-wrap{width:min(96vw,640px);max-height:96vh;display:flex;flex-direction:column;gap:8px}
.fw-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:rgba(24,33,42,.92);padding:8px;border-radius:12px}.fw-bar select,.fw-bar button{background:#1d2530;color:#fff;border:1px solid #445;border-radius:7px;padding:5px 8px;font:inherit;font-size:13px}
.fw-bar .sw{width:22px;height:22px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.35)}
.fw-book{border-radius:6px 14px 14px 6px;padding:10px;background:linear-gradient(90deg,#5a3418,#7a4a24 6%,#5a3418);box-shadow:0 10px 30px rgba(0,0,0,.5)}
.fw-page{min-height:min(54vh,380px);max-height:58vh;overflow:auto;padding:22px 24px;border-radius:3px 10px 10px 3px;color:#2b2016;font:17px/1.5 Merriweather,Georgia,serif;outline:none;
  background:#f3e6c4 radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.45),transparent 60%),#f3e6c4;box-shadow:inset 0 0 40px rgba(120,80,30,.35)}
.fw-page.lined{background:repeating-linear-gradient(#fbf7ec 0 25px,#9cc2e8 25px 26px);box-shadow:inset 30px 0 0 -28px #e08a8a}
.fw-page.dark{background:#22192a radial-gradient(ellipse at 50% 0,rgba(180,120,255,.15),transparent 70%);color:#eee3ff}.fw-page.plain{background:#fff;box-shadow:none}
.fw-page.stone{background:#9aa0a7 repeating-radial-gradient(circle at 20% 30%,rgba(255,255,255,.06) 0 3px,transparent 3px 9px);color:#1b1e22}
.fw-foot{display:flex;gap:6px;align-items:center;background:rgba(24,33,42,.92);padding:8px;border-radius:12px;color:#e8edf1}.fw-foot button{padding:6px 10px;border-radius:8px}
.fw-signbox{display:flex;flex-wrap:wrap;gap:8px;background:rgba(24,33,42,.95);padding:10px;border-radius:12px}.fw-signbox input{flex:1;min-width:140px;background:#1d2530;color:#fff;border:1px solid #445;border-radius:7px;padding:8px}
#sgText{width:100%;box-sizing:border-box;background:#1d2530;color:#fff;border:1px solid #445;border-radius:8px;padding:8px;font:15px system-ui}.sgrow{display:flex;gap:10px;flex-wrap:wrap}.sgrow select{background:#1d2530;color:#fff;border:1px solid #445;border-radius:6px;padding:4px}
.sgcols{display:flex;flex-wrap:wrap;gap:5px}.sgcols button{width:24px;height:24px;border-radius:50%;padding:0;border:2px solid rgba(255,255,255,.3)}.sgcols button[aria-pressed=true]{border-color:#fff;box-shadow:0 0 0 2px #f0b548}
#mapHud{opacity:.88;""")

rep("NI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});","NI('FORGEWRITE','ForgeWrite',{stack:1,forgewrite:1}); NI('FORGEWRITE_SIGNED','Written ForgeWrite',{stack:1,forgewrite:2}); NI('SIGN','Sign',{stack:16,decorItem:1,decor:1});\nNI('BUCKET','Bucket',{stack:16,decorItem:0,bucket:'empty'});")
rep("// every wood's logs make its own planks; material keys accept every variant","""{ r_(I.FORGEWRITE,1,['BDF'],{keys:{B:[I.BOOK],D:[DYE_BY.black.item,I.COAL,I.CHARCOAL],F:[I.FEATHER]},cat:'items'});
  r_(I.FORGEWRITE_SIGNED,2,['WB'],{keys:{W:[I.FORGEWRITE_SIGNED],B:[I.FORGEWRITE]},cat:'items',copyBook:1});
  r_(I.SIGN,3,['PPP','PPP','.S.'],{cat:'decor'}); }
// every wood's logs make its own planks; material keys accept every variant""")
# copying a written ForgeWrite keeps its pages
rep("  if(rc.copyArt){","  if(rc.copyBook){ const src=inv.grid.find(g=>g&&g.id===I.FORGEWRITE_SIGNED); for(let k=0;k<rc.n;k++){ if(addItem(I.FORGEWRITE_SIGNED,1)){ toast('Inventory full'); break; } inv.slots[inv.landed].x=src&&src.x?JSON.parse(JSON.stringify(src.x)):{pages:['']}; if(!k) landed=inv.landed; } }\n  else if(rc.copyArt){")

CODE12=r'''
/* =====================================================================
   STAGE 12: ForgeWrites (books you write, with colours, fonts and paper) · signs with frames and backgrounds
   ===================================================================== */
const FW_FONTS=[['Merriweather, Georgia, serif','Book serif'],['system-ui, sans-serif','Clean sans'],['"JetBrains Mono", monospace','Typewriter mono'],['"Special Elite", monospace','Old typewriter'],
  ['Caveat, cursive','Handwriting'],['"Dancing Script", cursive','Calligraphy'],['Cinzel, serif','Engraved'],['"Pirata One", serif','Blackletter'],['"Press Start 2P", monospace','Pixel'],['"Chakra Petch", sans-serif','Techno']];
const FW_COLS=['#2b2016','#000000','#ffffff',...DYES.map(d=>d.dye),'#8a1c1c','#1c5a8a','#2e7d32','#c99a2e','#ff6ad5','#38d9c8','#9b5de5'];
// keep only harmless formatting from the editor
function cleanHTML(html){ const box=document.createElement('div'); box.innerHTML=html; const OK={B:1,I:1,U:1,S:1,BR:1,DIV:1,P:1,SPAN:1,FONT:1,STRIKE:1,STRONG:1,EM:1,BIG:1,SMALL:1,CENTER:1};
  const walk=n=>{ for(const c of [...n.childNodes]){ if(c.nodeType===3) continue; if(c.nodeType!==1||!OK[c.tagName]){ if(c.nodeType===1&&!['SCRIPT','STYLE','IFRAME','IMG','OBJECT'].includes(c.tagName)){ walk(c); c.replaceWith(...c.childNodes); } else c.remove(); continue; }
      const st=c.getAttribute('style')||'', col=c.getAttribute('color'), face=c.getAttribute('face'), size=c.getAttribute('size'), keep=[];
      for(const part of st.split(';')){ const [k,v]=part.split(':').map(x=>x&&x.trim()); if(!k||!v) continue; if(['color','font-family','font-size','font-weight','font-style','text-decoration','text-align','background-color','text-shadow'].includes(k)&&!/url|expression|javascript/i.test(v)) keep.push(k+':'+v); }
      for(const a of [...c.attributes]) c.removeAttribute(a.name); if(keep.length) c.setAttribute('style',keep.join(';')); if(col) c.setAttribute('color',col); if(face) c.setAttribute('face',face); if(size) c.setAttribute('size',size); walk(c); } };
  walk(box); return box.innerHTML.slice(0,6000); }
let fwSt=null;
function openForgeWrite(){ const s=held(); s.x=s.x||{pages:[''],paper:'parchment'}; s.x.pages=s.x.pages||['']; const ro=ITEMS[s.id].forgewrite===2;
  fwSt={s,page:0,ro}; mode='ui'; mining=null; document.getElementById('fwUI').hidden=false; document.getElementById('fwSignBox').hidden=true; buildFwBar(); showFwPage(); }
function buildFwBar(){ const bar=document.getElementById('fwBar'), ro=fwSt.ro; bar.innerHTML='';
  if(ro){ bar.innerHTML=`<b style="color:#fff;padding:0 6px">${(fwSt.s.x.title||'Untitled').replace(/</g,'&lt;')}</b><span class="hint">by ${(fwSt.s.x.author||'Unknown').replace(/</g,'&lt;')}</span>`; return; }
  const ex=(c,v)=>{ document.getElementById('fwPage').focus(); document.execCommand('styleWithCSS',false,true); document.execCommand(c,false,v); };
  const font=document.createElement('select'); font.innerHTML='<option value="">Font…</option>'+FW_FONTS.map(([f,n])=>`<option value='${f}' style='font-family:${f}'>${n}</option>`).join(''); font.addEventListener('change',()=>{ if(font.value) ex('fontName',font.value); font.value=''; });
  const size=document.createElement('select'); size.innerHTML='<option value="">Size…</option><option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="6">Huge</option>'; size.addEventListener('change',()=>{ if(size.value) ex('fontSize',size.value); size.value=''; });
  bar.append(font,size);
  for(const [c,l] of [['bold','B'],['italic','I'],['underline','U'],['strikeThrough','S'],['justifyLeft','⇤'],['justifyCenter','≡'],['justifyRight','⇥']]){ const b=document.createElement('button'); b.textContent=l; b.style.fontWeight=c==='bold'?'700':''; b.style.fontStyle=c==='italic'?'italic':''; b.addEventListener('mousedown',e=>e.preventDefault()); b.addEventListener('click',()=>ex(c)); bar.appendChild(b); }
  for(const c of FW_COLS){ const b=document.createElement('button'); b.className='sw'; b.style.background=c; b.setAttribute('aria-label','Text colour '+c); b.addEventListener('mousedown',e=>e.preventDefault()); b.addEventListener('click',()=>ex('foreColor',c)); bar.appendChild(b); }
  const hl=document.createElement('select'); hl.innerHTML='<option value="">Highlight…</option><option value="transparent">None</option><option value="#fff27a">Yellow</option><option value="#9df5b0">Green</option><option value="#9fd8ff">Blue</option><option value="#ffb3d9">Pink</option>'; hl.addEventListener('change',()=>{ if(hl.value) ex('hiliteColor',hl.value); hl.value=''; });
  const paper=document.createElement('select'); paper.innerHTML='<option value="parchment">Parchment</option><option value="lined">Lined paper</option><option value="plain">Plain white</option><option value="dark">Night violet</option><option value="stone">Stone tablet</option>'; paper.value=fwSt.s.x.paper||'parchment';
  paper.addEventListener('change',()=>{ fwSt.s.x.paper=paper.value; showFwPage(true); }); bar.append(hl,paper); }
function saveFwPage(){ if(!fwSt||fwSt.ro) return; fwSt.s.x.pages[fwSt.page]=cleanHTML(document.getElementById('fwPage').innerHTML); invChanged(); }
function showFwPage(keep){ if(keep) saveFwPage(); const el=document.getElementById('fwPage'), x=fwSt.s.x; el.className='fw-page'+(x.paper&&x.paper!=='parchment'?' '+x.paper:''); el.contentEditable=!fwSt.ro; el.innerHTML=cleanHTML(x.pages[fwSt.page]||'');
  document.getElementById('fwNum').textContent=`Page ${fwSt.page+1} of ${x.pages.length}`; for(const id of ['fwAdd','fwDel','fwSign']) document.getElementById(id).hidden=fwSt.ro; }
document.getElementById('fwPrev').addEventListener('click',()=>{ if(!fwSt) return; saveFwPage(); fwSt.page=Math.max(0,fwSt.page-1); showFwPage(); });
document.getElementById('fwNext').addEventListener('click',()=>{ if(!fwSt) return; saveFwPage(); fwSt.page=Math.min(fwSt.s.x.pages.length-1,fwSt.page+1); showFwPage(); });
document.getElementById('fwAdd').addEventListener('click',()=>{ saveFwPage(); if(fwSt.s.x.pages.length>=100){ toast('A ForgeWrite holds 100 pages'); return; } fwSt.s.x.pages.splice(fwSt.page+1,0,''); fwSt.page++; showFwPage(); });
document.getElementById('fwDel').addEventListener('click',()=>{ const P=fwSt.s.x.pages; if(P.length<=1){ P[0]=''; showFwPage(); return; } P.splice(fwSt.page,1); fwSt.page=Math.min(fwSt.page,P.length-1); showFwPage(); });
document.getElementById('fwDone').addEventListener('click',()=>{ saveFwPage(); document.getElementById('fwUI').hidden=true; fwSt=null; if(mode==='ui'){ mode='play'; last=performance.now(); } renderHotbar(); });
document.getElementById('fwSign').addEventListener('click',()=>{ document.getElementById('fwSignBox').hidden=false; document.getElementById('fwTitle').focus(); });
document.getElementById('fwSignNo').addEventListener('click',()=>{ document.getElementById('fwSignBox').hidden=true; });
document.getElementById('fwSignOk').addEventListener('click',()=>{ saveFwPage(); const t=document.getElementById('fwTitle').value.trim(); if(!t){ toast('Give it a title'); return; }
  const s=fwSt.s; s.x.title=t; s.x.author=document.getElementById('fwAuthor').value.trim()||'Anonymous'; s.id=I.FORGEWRITE_SIGNED; invChanged(); document.getElementById('fwUI').hidden=true; fwSt=null; if(mode==='ui'){ mode='play'; last=performance.now(); } renderHotbar(); toast('Signed “'+t+'”'); });
// ---------- signs ----------
const SIGN_FRAMES=[['wood','Oak frame'],['dark','Dark wood frame'],['iron','Iron frame'],['gold','Gold frame'],['stone','Stone frame'],['rope','Rope frame'],['dusk','Dusk crystal frame'],['none','No frame']];
const SIGN_BGS=[['planks','Oak planks'],['spruce','Spruce planks'],['parchment','Parchment'],['slate','Slate'],['stone','Stone'],['brick','Brick'],['night','Night sky'],['paper','White paper'],['chalk','Chalkboard'],['wool','Red wool']];
function drawSign(c,e){ const g=c.getContext('2d'), W=c.width, H=c.height; g.clearRect(0,0,W,H); const R=(n)=>{ let x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };
  const bg=e.bg||'planks', fr=e.frame||'wood', inset=fr==='none'?0:14;
  const fill={planks:'#c59a5f',spruce:'#7d5733',parchment:'#efdfb4',slate:'#3a4048',stone:'#979ca2',brick:'#a8523e',night:'#151a3a',paper:'#fbfaf6',chalk:'#2f4a3a',wool:'#b02e26'}[bg]; g.fillStyle=fill; g.fillRect(0,0,W,H);
  if(bg==='planks'||bg==='spruce'){ for(let y=0;y<H;y+=19){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(0,y,W,2); for(let k=0;k<30;k++){ g.fillStyle=`rgba(0,0,0,${R(y*7+k)*.08})`; g.fillRect(R(k+y)*W,y+2+R(k*3+y)*15,20+R(k)*40,1); } const o=(y/19)%2?W*.4:W*.75; g.fillStyle='rgba(0,0,0,.15)'; g.fillRect(o,y,2,19); } }
  else if(bg==='parchment'){ const gr=g.createRadialGradient(W/2,H/2,10,W/2,H/2,W*.7); gr.addColorStop(0,'rgba(255,255,255,.25)'); gr.addColorStop(1,'rgba(120,80,30,.35)'); g.fillStyle=gr; g.fillRect(0,0,W,H); }
  else if(bg==='brick'){ for(let y=0;y<H;y+=16){ g.fillStyle='#d6cbbd'; g.fillRect(0,y,W,2); for(let x=((y/16)%2)*16;x<W;x+=32) g.fillRect(x,y,2,16); } }
  else if(bg==='night'){ for(let k=0;k<70;k++){ g.fillStyle=`rgba(255,255,255,${.3+R(k)*.7})`; g.fillRect(R(k*3)*W,R(k*7)*H,1+R(k)*1.5,1+R(k)*1.5); } }
  else if(bg==='stone'||bg==='slate'){ for(let k=0;k<200;k++){ g.fillStyle=`rgba(${R(k)>.5?255:0},${R(k)>.5?255:0},${R(k)>.5?255:0},.06)`; g.fillRect(R(k*5)*W,R(k*11)*H,4+R(k)*8,3+R(k*2)*6); } }
  else if(bg==='wool'){ for(let y=0;y<H;y+=3) for(let x=(y%6);x<W;x+=6){ g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(x,y,3,2); } }
  // frame
  if(fr!=='none'){ const fc={wood:['#8a5a34','#b98d58'],dark:['#3d2b18','#5a4028'],iron:['#7d8288','#c8ccd2'],gold:['#b88a1e','#f4d35a'],stone:['#6a6e74','#9aa0a7'],rope:['#a88a5a','#d9be86'],dusk:['#4a2a78','#c77dff']}[fr];
    g.lineWidth=inset; g.strokeStyle=fc[0]; g.strokeRect(inset/2,inset/2,W-inset,H-inset); g.lineWidth=3; g.strokeStyle=fc[1]; g.strokeRect(3,3,W-6,H-6); g.strokeRect(inset-2,inset-2,W-2*inset+4,H-2*inset+4);
    if(fr==='rope'){ g.strokeStyle='rgba(90,60,30,.6)'; g.lineWidth=2; for(let x=0;x<W;x+=8){ g.beginPath(); g.moveTo(x,2); g.lineTo(x+6,inset-2); g.stroke(); g.beginPath(); g.moveTo(x,H-inset+2); g.lineTo(x+6,H-2); g.stroke(); } }
    if(fr==='iron'||fr==='gold') for(const [x,y] of [[inset/2,inset/2],[W-inset/2,inset/2],[inset/2,H-inset/2],[W-inset/2,H-inset/2]]){ g.fillStyle=fc[1]; g.beginPath(); g.arc(x,y,4,0,7); g.fill(); }
    if(fr==='dusk'){ g.shadowColor='#c77dff'; g.shadowBlur=10; g.strokeStyle='#e7a6ff'; g.lineWidth=2; g.strokeRect(inset-4,inset-4,W-2*inset+8,H-2*inset+8); g.shadowBlur=0; } }
  // text
  const lines=(e.text||'').split('\n').slice(0,4); const font=e.font||FW_FONTS[0][0]; const n=Math.max(1,lines.length), lh=Math.min(30,(H-2*inset-10)/Math.max(n,2.2));
  g.textBaseline='middle'; g.textAlign=e.align||'center'; const x=e.align==='left'?inset+8:e.align==='right'?W-inset-8:W/2;
  lines.forEach((t,i)=>{ let sz=lh*.82; g.font=`${sz}px ${font}`; while(g.measureText(t).width>W-2*inset-14&&sz>8){ sz--; g.font=`${sz}px ${font}`; }
    if(e.glow){ g.shadowColor=e.color||'#2b2016'; g.shadowBlur=10; } g.fillStyle=e.color||(['slate','night','chalk','wool'].includes(bg)?'#f4f1ea':'#2b2016'); g.fillText(t,x,H/2+(i-(n-1)/2)*lh); g.shadowBlur=0; }); }
let signSt=null;
function openSign(e){ signSt=e; mode='ui'; mining=null; const $=id=>document.getElementById(id);
  $('sgText').value=e.text||''; $('sgFont').innerHTML=FW_FONTS.map(([f,n])=>`<option value='${f}'>${n}</option>`).join(''); $('sgFont').value=e.font||FW_FONTS[0][0]; $('sgAlign').value=e.align||'center'; $('sgGlow').checked=!!e.glow;
  $('sgFrame').innerHTML=SIGN_FRAMES.map(([k,n])=>`<option value="${k}">${n}</option>`).join(''); $('sgFrame').value=e.frame||'wood';
  $('sgBg').innerHTML=SIGN_BGS.map(([k,n])=>`<option value="${k}">${n}</option>`).join(''); $('sgBg').value=e.bg||'planks';
  const C=$('sgCols'); C.innerHTML=''; for(const c of ['',...FW_COLS]){ const b=document.createElement('button'); b.style.background=c||'linear-gradient(135deg,#2b2016 50%,#f4f1ea 50%)'; b.setAttribute('aria-label',c?'Colour '+c:'Automatic'); b.setAttribute('aria-pressed',(e.color||'')===c);
    b.addEventListener('click',()=>{ e.color=c||null; C.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); upd(); }); C.appendChild(b); }
  const upd=()=>{ e.text=$('sgText').value; e.font=$('sgFont').value; e.align=$('sgAlign').value; e.glow=$('sgGlow').checked; e.frame=$('sgFrame').value; e.bg=$('sgBg').value; e.ver=(e.ver||0)+1; drawSign($('sgPrev'),e); world.changed=true; };
  for(const id of ['sgText','sgFont','sgAlign','sgGlow','sgFrame','sgBg']){ $(id).oninput=upd; $(id).onchange=upd; }
  upd(); document.fonts&&document.fonts.ready.then(()=>{ if(signSt===e) upd(); }); $('signUI').hidden=false; }
document.getElementById('sgDone').addEventListener('click',()=>{ signSt=null; closeUI('signUI'); });
document.getElementById('sgRemove').addEventListener('click',()=>{ if(signSt) removeDecor(signSt,true); signSt=null; closeUI('signUI'); });
function placeSign(sx,sy){ const r=pick(sx,sy); if(!r||!r.prev){ toast('Tap a wall or the ground'); return; } if(!reachOK(...r.hit)){ toast('Too far away'); return; }
  const d=[r.prev[0]-r.hit[0],r.prev[1]-r.hit[1],r.prev[2]-r.hit[2]]; let e;
  if(d[1]===1){ // standing sign on a post, facing you
    const a=Math.atan2(player.x-(r.prev[0]+.5),player.z-(r.prev[2]+.5)), q=Math.round(a/(Math.PI/2))*(Math.PI/2), n=[Math.round(Math.sin(q)),0,Math.round(Math.cos(q))];
    e={kind:'sign',c:[r.prev[0]+.5,r.prev[1]+.95,r.prev[2]+.5],n,u:[-n[2],0,n[0]],v:[0,1,0],w:1,h:.6,sup:r.hit.slice(),cell:r.prev.slice(),post:1}; }
  else if(d[1]===-1){ toast('Signs go on walls or the ground'); return; }
  else { const f=faceFrame(r.hit,r.prev,1,1); e=Object.assign({kind:'sign'},f,{h:.6}); }
  e.text=''; e.frame='wood'; e.bg='planks'; world.decor.push(e); world.changed=true; const s=held(); if(s&&!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } openSign(e); }
'''
rep("/* ---------- stage 6: decor entities ---------- */",CODE12+"\n/* ---------- stage 6: decor entities ---------- */")
# hooks: taps, removal, texture, post rendering, icons
rep("  if(e.kind==='poster'){ openPoster(null,e); return true; }","  if(e.kind==='poster'){ openPoster(null,e); return true; }\n  if(e.kind==='sign'){ openSign(e); return true; }")
rep("if(e.kind==='poster') giveBack(I.POSTER); }","if(e.kind==='poster') giveBack(I.POSTER); if(e.kind==='sign') giveBack(I.SIGN); }")
rep("  if(e.kind==='poster'){ if(!e.tex){","  if(e.kind==='sign'){ const k='sign'+world.decor.indexOf(e)+'_'+(e.ver||0); if(e.texKey!==k){ if(e.texObj) gl.deleteTexture(e.texObj); const c=document.createElement('canvas'); c.width=256; c.height=154; drawSign(c,e); e.texObj=glTex(c,true); e.texKey=k; } return e.texObj; }\n  if(e.kind==='poster'){ if(!e.tex){")
rep("    if(e.kind==='painting') frameB(.07,[120,82,48]);","    if(e.kind==='sign'&&e.post){ const cx=e.cell[0]+.5, cz=e.cell[2]+.5, y0=e.cell[1]; emitBox(vb,[cx-.05,y0,cz-.05],[cx+.05,y0+.66,cz+.05],[120,82,48],IDT); }\n    if(e.kind==='sign'){ const b0=decorCorners(e,0); const mn=[0,1,2].map(i=>Math.min(...b0.map(p=>p[i]))-e.n[i]*.04), mx=[0,1,2].map(i=>Math.max(...b0.map(p=>p[i]))-e.n[i]*.005); emitBox(vb,mn,mx,[110,76,44],IDT); }\n    if(e.kind==='painting') frameB(.07,[120,82,48]);")
rep("const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(","const tapOnly=()=>{const s=held(), it=s&&ITEMS[s.id]; return !!it&&(it.forgewrite||")
rep("  if(it.instrument){ openMusic({inst:it.instrument}); return true; }","  if(it.forgewrite){ openForgeWrite(); return true; } if(s.id===I.SIGN){ placeSign(sx,sy); return true; }\n  if(it.instrument){ openMusic({inst:it.instrument}); return true; }")
rep("function useDecor(sx,sy){ const s=held(); if(!s) return false;","function useDecor(sx,sy){ const s=held(); if(!s) return false;\n  if(s.id===I.SIGN){ placeSign(sx,sy); return true; }")
rep("    if(id===I.DEMON_BONE){","""    if(it.forgewrite){ g.fillStyle=it.forgewrite===2?'#6a2a1a':'#8a5a34'; g.fillRect(12,8,32,44); g.fillStyle='#f3e6c4'; g.fillRect(40,10,4,40); g.fillStyle='#c99a2e'; g.fillRect(16,12,24,3); g.fillRect(16,45,24,3);
      if(it.forgewrite===1){ g.strokeStyle='#f2f2ee'; g.lineWidth=3; g.beginPath(); g.moveTo(50,6); g.quadraticCurveTo(40,24,30,40); g.stroke(); g.fillStyle='#222'; g.fillRect(28,38,4,4); } else { g.fillStyle='#ffd84a'; g.beginPath(); g.arc(28,30,6,0,7); g.fill(); } return c; }
    if(id===I.SIGN){ g.fillStyle='#8a5a34'; g.fillRect(27,32,6,24); g.fillStyle='#c59a5f'; g.fillRect(6,10,48,26); g.strokeStyle='#8a5a34'; g.lineWidth=3; g.strokeRect(6,10,48,26); g.fillStyle='#3a2a1a'; g.fillRect(14,18,32,3); g.fillRect(18,26,24,3); return c; }
    if(id===I.DEMON_BONE){""")
rep("||id===I.DEMON_BONE||id===I.DEMON_EYE||","||it.forgewrite||id===I.SIGN||id===I.DEMON_BONE||id===I.DEMON_EYE||")
rep("${s.x&&s.x.song&&s.x.name?' · '+s.x.name:''}","${s.x&&s.x.song&&s.x.name?' · '+s.x.name:''}${s.x&&s.x.title?' · “'+s.x.title+'” by '+(s.x.author||'?'):''}")
# decor save: don't save GL textures
rep("    decor:world.decor.map(d=>({...d,item:d.item?packS(d.item):null})),","    decor:world.decor.map(d=>{ const o={...d,item:d.item?packS(d.item):null}; delete o.texObj; delete o.texKey; delete o.tex; delete o.canvas; return o; }),")
open(F,'w').write(s); print('ok')
