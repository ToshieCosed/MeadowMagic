// Browser test (dev only): Lycanites Mobs on a real Forge 1.12.2 server. Imports the jar, summons creatures, checks that each is drawn from its own OBJ model
// posed by the mod's model classes, with its textures and layers. Screenshots /tmp/lyc*.png
// Run: JAR=lycanitesmobs.jar NODE_PATH=/opt/npm-tools/node_modules node test-lyc.mjs
import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms));
const DIR = process.env.FORGE_DIR || '/tmp/claude-0/forgesrv', SP = 25990, RP = 25992, JAR = process.env.JAR;
const srv = spawn('/usr/lib/jvm/java-8-openjdk-amd64/bin/java', ['-Xmx3G', '-jar', 'server.jar', 'nogui'], { cwd: DIR, stdio: ['pipe', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; });
const cmd = c => srv.stdin.write(c + '\n'); for (let i = 0; i < 180 && !/Done \(/.test(log); i++) await wait(1000);
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(RP) }, stdio: 'ignore' }); await wait(1200);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|')));
pg.on('console', m => { const t = m.text(); if ((m.type() === 'error' || /^jvm:|objmobs|port fx/.test(t)) && !/ERR_TUNNEL|Failed to load/.test(t)) errs.push(t.slice(0, 300)); });
let out = {};
try {
await pg.exposeFunction('srvCmd', c => { cmd(c); return 1; }); await pg.exposeFunction('srvLog', () => log.slice(-1500));
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: '1.12.2 (protocol 340)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:' + RP); await pg.dispatchEvent('#mcRelay', 'change');
await pg.$eval('#mcForge', e => { e.checked = true; e.dispatchEvent(new Event('change')); }); await wait(300);
await pg.$eval('#mcModsClr', e => e.click()); await wait(300); const t0 = Date.now(); await pg.setInputFiles('#mcModsIn', [JAR]);
await pg.waitForFunction(() => /Imported|Could not/.test(document.getElementById('mcModsStat').textContent), null, { timeout: 600000 }); out.importS = Math.round((Date.now() - t0) / 1000); out.imported = await pg.$eval('#mcModsStat', e => e.textContent);
await pg.fill('#mcHost', '127.0.0.1:' + SP); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 150000 }); await wait(5000);
cmd('gamerule doMobSpawning false'); cmd('time set 6000'); cmd('tp @a 0 4 0'); await wait(1500);
const mobs = ['afrit', 'warg', 'grue', 'cinder', 'jengu', 'reiver', 'wisp', 'sylph', 'roa', 'amalgalich', 'banshee', 'maka'];
mobs.forEach((n, i) => cmd(`summon lycanitesmobs:${n} ${-6 + (i % 4) * 4} 4 ${5 + Math.floor(i / 4) * 4} {NoAI:1b,PersistenceRequired:1b}`));
await wait(6000);
out.r = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const r = {};
  r.ocr = S.modRec && S.modRec.ocr ? Object.keys(S.modRec.ocr).length : 0; r.objFiles = S.modRec ? Object.keys(S.modRec.files).filter(k => k.startsWith('o/')).length : 0; r.classes = S.modRec ? Object.keys(S.modRec.files).filter(k => k.startsWith('j/')).length : 0;
  r.mobs = S.mobs.filter(m => m.modEnt && /^lycanitesmobs:/.test(m.modEnt)).map(m => [m.modEnt, m.type, !!m.ly, m.md ? [m.md[14], m.md[20], m.md[23], m.md[24]] : null]);
  await W(1500); r.tex = [...FX.T.keys()].filter(k => /lycanites/.test(k)); r.fly = Object.fromEntries([...(window.__lyFly || [])]);
  return r; });
out.names = out.r.mobs.map(m => m[0].split(':')[1]).sort().join(' '); out.namesOk = mobs.every(n => out.names.split(' ').includes(n));
const P0 = await pg.evaluate(() => { const S = StrataMCE.dbg(); return S.client && S.client.api ? 1 : 0; });
cmd('setblock 2 4 -3 lycanitesmobs:equipmentforge_lesser'); cmd('setblock 4 4 -3 lycanitesmobs:equipment_infuser'); cmd('setblock 6 4 -3 lycanitesmobs:equipment_station'); cmd('setblock 8 4 -3 lycanitesmobs:summoningpedestal');
cmd('give @a lycanitesmobs:stablesummoningstaff 1'); cmd('give @a lycanitesmobs:afritlung 1'); await wait(3000);
out.ui = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)), r = {}, F = S.forge.items;
  r.icon = Object.keys(S.modRec.files).filter(k => k.startsWith('i/lycanitesmobs:gen/equip_')).length; r.iconItem = S.modRec.items['lycanitesmobs:afritlung'];
  const sel = n => { const k = S.slots.findIndex((it, i) => i >= 36 && it && F[it.id] === n); if (k >= 0) { inv.sel = k - 36; S.client.api.select(k - 36); } return k; };
  r.staffSlot = sel('lycanitesmobs:stablesummoningstaff'); await W(800); const h = document.getElementById('lyHud'); r.hud = h && !h.hidden ? h.innerText.replace(/\s+/g, ' ') : null;
  const P = StrataMCE.dbgPort(); P.lycBook('creatures'); await W(1500); const b = document.getElementById('lyBook'); r.book = b && !b.hidden ? b.innerText.slice(0, 160).replace(/\s+/g, ' ') : null;
  for (const t of ['pets', 'summoning', 'elements']) { P.lycBook(t); await W(200); r['book_' + t] = document.getElementById('lyBookB').innerText.slice(0, 100).replace(/\s+/g, ' '); } b.hidden = true;
  r.wins = []; for (const [x, nm] of [[2, 'forge'], [4, 'infuser'], [6, 'station'], [8, 'pedestal']]) { S.client.api.place(x, 4, -3, 1, null, 8, 16, 8); for (let k = 0; k < 25 && !(S.win && S.win.ly); k++) await W(200);
    r.wins.push([nm, S.win && S.win.ly, S.win && S.win.title, S.win && S.win.slots.length, [...document.querySelectorAll('#mcTop .lbl')].map(e => e.textContent).join(',')]); closeInv(); await W(600); }
  return r; });
await pg.screenshot({ path: '/tmp/lyc-ui.png' });
cmd('give @a lycanitesmobs:summoningpedestal 1'); cmd('give @a lycanitesmobs:equipment 1 0 {Items:[{Slot:0b,id:"lycanitesmobs:ironrod",Count:1b,Damage:0s},{Slot:1b,id:"lycanitesmobs:ironhilt",Count:1b,Damage:0s},{Slot:2b,id:"lycanitesmobs:cinderblade",Count:1b,Damage:0s}]}');
cmd('kill @e[type=lycanitesmobs:amalgalich]'); cmd('tp @a 9 4 -1'); cmd('gamemode survival @a'); cmd('effect @a minecraft:resistance 1000 255 true'); cmd('effect @a minecraft:regeneration 1000 255 true'); cmd('summon lycanitesmobs:beholder 9 7 4'); await wait(4000);
out.more = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)), r = {}, F = S.forge.items;
  r.eqIcon = Object.keys(S.modRec.files).filter(k => k.startsWith('i/lycanitesmobs:gen/eq_')); r.eqItem = S.slots.filter(Boolean).map(it => F[it.id]).filter(n => /equipment$/.test(n || ''));
  const px = Math.round(player.x - S.OX - .5) + 2, pz = Math.round(player.z - S.OZ - .5), py = 3; r.at = [px, py, pz];
  const k = S.slots.findIndex((it, i) => i >= 36 && it && F[it.id] === 'lycanitesmobs:summoningpedestal'); r.pedSlot = k; if (k >= 0) { inv.sel = k - 36; S.client.api.select(k - 36); await W(400); S.client.api.place(px, py, pz, 1, null, 8, 16, 8); await W(1500); }
  if (!(BLOCKS[world.get(px + S.OX, py + 1, pz + S.OZ)] || {}).modName) { r.pedCmd = 1; await window.srvCmd(`setblock ${px} ${py + 1} ${pz} lycanitesmobs:summoningpedestal`); await W(2500); }
  { const b = BLOCKS[world.get(px + S.OX, py + 1, pz + S.OZ)]; r.pedB = b && [b.name, b.modName]; r.srv = (await window.srvLog()).split('\n').slice(-14); r.disc = S.client && S.client.closed; }
  r.pedBlock = (BLOCKS[world.get(px + S.OX, py + 1, pz + S.OZ)] || {}).modName; inv.sel = 8; S.client.api.select(8); await W(300); S.client.api.place(px, py + 1, pz, 1, null, 8, 16, 8);
  for (let q = 0; q < 25 && !(S.win && S.win.ly); q++) await W(200); r.ped = S.win && [S.win.ly, S.win.title, S.win.slots.length, document.querySelector('#mcInv') && document.querySelector('#mcInv').innerText.slice(0, 200).replace(/\s+/g, ' ')];
  const P = StrataMCE.dbgPort(); await W(400); try { closeInv(); } catch (e) { /* */ } await W(300);
  r.lasers = []; for (let q = 0; q < 40; q++) { await W(500); const L = S.mobs.filter(m => m.modEnt && /lycanitesmobs/.test(m.modEnt) && m.md && typeof m.md[7] === 'string'); if (L.length) { r.lasers = L.map(m => [m.modEnt, m.md[7], m.md[8], m.md[10]]); break; } }
  { const k2 = S.slots.findIndex((it, i) => i >= 36 && it && F[it.id] === 'lycanitesmobs:equipment'); if (k2 >= 0) { inv.sel = k2 - 36; S.client.api.select(k2 - 36); invChanged(); } await W(1200); r.held3d = !!(StrataMCE.dbgPort && window.__fx3dItem); r.heldItem = ITEMS[inv.slots[inv.sel] && inv.slots[inv.sel].id] && ITEMS[inv.slots[inv.sel].id].lyEq; r.eqTex = [...FX.T.keys()].filter(k => /equipment\//.test(k)); }
  await window.srvCmd('give @a lycanitesmobs:beastspawn 1 0 {CreatureInfoSpawnEgg:{creaturename:"warg"}}'); await window.srvCmd('lycanitesmobs mobevent start hellsfury 0'); await W(2500);
  r.ev = [!!document.getElementById('lyEvent'), (document.getElementById('mcLog') || {}).innerText && document.getElementById('mcLog').innerText.split('\n').filter(l => /begun|event/i.test(l)).slice(-2)];
  r.egg = Object.values(ITEMS).filter(it => it && /:gen\/egg_/.test(it.mcTex || '')).map(it => [it.name, it.mcTex, !!(PACK.img && PACK.img['i/' + it.mcTex])]);
  r.eggDbg = [!!S.modRec.files['i/lycanitesmobs:items/spawns/beast'], !!(PACK.img && PACK.img['i/lycanitesmobs:items/spawns/beast']), JSON.stringify(S.modRec.ocr && S.modRec.ocr['lycanitesmobs:warg'] && S.modRec.ocr['lycanitesmobs:warg'].egg), !!S.modRec.files['i/lycanitesmobs:gen/egg_warg']];
  r.glowTex = [...FX.T.keys()].filter(k => /cinderblade/.test(k));
  r.beamTex = [...FX.T.keys()].filter(k => /beam|laser/.test(k)); r.fxNames = [...document.querySelectorAll('#mcFx *, [id*=fx]')].map(e => e.textContent).join(' ').slice(0, 200); r.pos = [Math.round(player.x - S.OX), Math.round(player.z - S.OZ)]; return r; });
await pg.screenshot({ path: '/tmp/lyc-event.png' }); await wait(9000); await pg.evaluate(() => { cam.zoom = Math.max(ZMIN, cam.zoom * .35); }); await wait(1500); await pg.screenshot({ path: '/tmp/lyc-laser.png' }); await pg.evaluate(() => { openInv(); }); await wait(800); await pg.screenshot({ path: '/tmp/lyc-inv.png' }); await pg.evaluate(() => { closeInv(); });
await pg.evaluate(() => { const P = StrataMCE.dbgPort(); P.lycBook('creatures', 'warg'); }); await wait(800); await pg.screenshot({ path: '/tmp/lyc-book.png' });
await pg.evaluate(() => { const S = StrataMCE.dbg(); player.x = 0 + S.OX; player.z = 8 + S.OZ; cam.zoom = Math.max(ZMIN, cam.zoom * .5); }); await wait(2500); await pg.screenshot({ path: '/tmp/lyc.png' });
await pg.evaluate(() => { cam.zoom = Math.max(ZMIN, cam.zoom * .6); }); await wait(2000); await pg.screenshot({ path: '/tmp/lyc2.png' });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
