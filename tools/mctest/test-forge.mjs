// Browser test (dev only): real Forge 1.12.2 server (FORGE_DIR, with mods/) + relay; imports the jars in JARS through the connect screen, joins with Forge on,
// places modded blocks and gives modded items from the server console, checks names, textures and the inventory. Screenshot /tmp/forge.png
// Run: FORGE_DIR=/tmp/claude-0/forgesrv JARS="a.jar b.jar" NODE_PATH=/opt/npm-tools/node_modules node test-forge.mjs
import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms));
const DIR = process.env.FORGE_DIR || '/tmp/claude-0/forgesrv', SP = 25990, RP = 25992, JARS = (process.env.JARS || '').split(' ').filter(Boolean);
const srv = spawn('/usr/lib/jvm/java-8-openjdk-amd64/bin/java', ['-Xmx2G', '-jar', 'server.jar', 'nogui'], { cwd: DIR, stdio: ['pipe', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; });
const cmd = c => srv.stdin.write(c + '\n'); for (let i = 0; i < 90 && !/Done \(/.test(log); i++) await wait(1000);
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(RP) }, stdio: 'ignore' }); await wait(1200);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|'))); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: '1.12.2 (protocol 340)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:' + RP); await pg.dispatchEvent('#mcRelay', 'change');
await pg.$eval('#mcForge', e => { e.checked = true; e.dispatchEvent(new Event('change')); }); await wait(300);
if (JARS.length) { await pg.$eval('#mcModsClr', e => e.click()); await wait(300); await pg.setInputFiles('#mcModsIn', JARS); await pg.waitForFunction(() => /Imported|Could not/.test(document.getElementById('mcModsStat').textContent), null, { timeout: 120000 }).catch(() => {}); console.log('IMPORT:', await pg.$eval('#mcModsStat', e => e.textContent), errs.slice(0, 3)); }
const imported = await pg.$eval('#mcModsStat', e => e.textContent); await wait(1600); const modsLine = await pg.$eval('#mcModsStat', e => e.textContent);
await pg.fill('#mcHost', '127.0.0.1:' + SP); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 150000 }).catch(() => {}); await wait(5000);
cmd('tp @a 0 4 0'); await wait(1500);
const blocks = ['solarflux:solar_panel_1', 'solarflux:solar_panel_8', 'computercraft:computer', 'computercraft:peripheral', 'waystones:waystone', 'computercraft:turtle_expanded'];
blocks.forEach((n, i) => cmd(`setblock ${2 + i} 4 2 ${n}${n === 'waystones:waystone' ? ' 8' : ''}`)); cmd('setblock 6 5 2 waystones:waystone 0'); cmd('give @a solarflux:solar_panel_1 3'); cmd('give @a computercraft:pocket_computer_advanced 1'); cmd('give @a waystones:warp_stone 1'); cmd('give @a computercraft:disk 1');
await wait(4000); await pg.waitForFunction(() => PACK.on, null, { timeout: 30000 }).catch(() => {}); await wait(1500);
const info = await pg.evaluate(blocks => { const S = StrataMCE.dbg(); const g = (x, y, z) => world.get(x + S.OX, y, z + S.OZ);
  return { dbg: [S.modPackOn, PACK.worldId, PACK.name, !!(S.modRec && Object.keys(S.modRec.files).length), S.o.forge], forge: !!S.forge, modRec: !!S.modRec, packOn: PACK.on, p: [Math.round(player.x - S.OX), Math.round(player.y), Math.round(player.z - S.OZ)],
    placed: blocks.map((n, i) => { const id = g(2 + i, 4, 2), bd = BLOCKS[id]; return [n, id, bd && bd.name, !!PACK.has[id]]; }),
    inv: S.slots.filter(Boolean).map(it => { const st = StrataMCE.dbg() && it; const sid = it && (window.__dbgItem ? 0 : 0); return it.id; }),
    hot: inv.slots.slice(0, 9).map(s => s && [ITEMS[s.id].name, ITEMS[s.id].mcTex || null, !!(ITEMS[s.id].mcTex && PACK.img['i/' + ITEMS[s.id].mcTex])]).filter(Boolean),
    log: document.getElementById('mcLog').innerText.slice(-500) }; }, blocks);
const gui = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const id = world.get(2 + S.OX, 4, 2 + S.OZ), wid = world.get(6 + S.OX, 4, 2 + S.OZ), wid2 = world.get(6 + S.OX, 5, 2 + S.OZ);
  const r = { panelBoxes: BLOCKS[id] && BLOCKS[id].boxes, panelTex: !!PACK.has[id], way: [BLOCKS[wid] && BLOCKS[wid].boxes && BLOCKS[wid].boxes.length, wid2 !== wid] };
  S.client.api.place(2, 4, 2, 1, null, 8, 16, 8); for (let k = 0; k < 30 && !(S.win && S.win.sf && S.win.sf[0]); k++) await W(200);
  r.win = S.win && [S.win.type, S.win.n, S.win.sf]; r.ext = (document.querySelector('#mcExt') || {}).innerText; closeInv(); await W(300);
  // a waystone list as the server sends it after activation, then the destination screen and the teleport request
  const ent = (o, name, x, y, z) => { const u = new TextEncoder().encode(name); o.push(u.length, ...u, 0, 0, 0, 0); const v = (BigInt(x & 0x3FFFFFF) << 38n) | (BigInt(y & 0xFFF) << 26n) | BigInt(z & 0x3FFFFFF); for (let i = 7; i >= 0; i--) o.push(Number((v >> BigInt(i * 8)) & 255n)); o.push(0); };
  const pk = [1, 0, 2]; ent(pk, 'Home', 6, 4, 2); ent(pk, 'Mine', 100, 20, -50); for (let i = 0; i < 16; i++) pk.push(0); S.Hd.modPayload('waystones', Uint8Array.from(pk)); r.ways = (S.ways || []).map(w => w.name + '@' + w.pos.join(','));
  const sent = []; const ms = S.client.api.modSend; S.client.api.modSend = (ch, b) => { sent.push([ch, Array.from(b).slice(0, 8)]); return ms(ch, b); };
  const bd = BLOCKS[wid]; r.tap = bd && bd.modName ? StrataMCE.dbg() && (function () { return true; })() : false; window.__wayHit = [6 + S.OX, 4, 2 + S.OZ];
  await W(50); return r; });
const way = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const sent = []; const ms = S.client.api.modSend; S.client.api.modSend = (ch, b) => { sent.push([ch, b.length]); };
  const bd = BLOCKS[world.get(...window.__wayHit)]; const ok = window.__portTapTest ? 0 : 0; // open the screen the way a tap would
  S.Hd.modPayload('waystones', Uint8Array.from([9, 3, 0, 4, 72, 111, 109, 101, 0, 0, 0, 0, ...(() => { const v = (BigInt(6) << 38n) | (BigInt(4) << 26n) | BigInt(2); const o = []; for (let i = 7; i >= 0; i--) o.push(Number((v >> BigInt(i * 8)) & 255n)); return o; })(), 0]));
  await W(200); const btns = [...document.querySelectorAll('#mcWays button')].map(b => b.textContent); const dest = [...document.querySelectorAll('#mcWays button')].find(b => /Mine/.test(b.textContent)); if (dest) dest.click(); await W(200); S.client.api.modSend = ms; return { btns, sent }; });
await pg.evaluate(() => { const S = StrataMCE.dbg(); player.x = 4.5 + S.OX; player.z = 4.5 + S.OZ; cam.zoom = 2.6; }); await wait(2500); await pg.screenshot({ path: '/tmp/forge.png' });
await pg.$eval('#mcLeave', e => e.click()).catch(() => {}); await wait(1500); const after = await pg.evaluate(() => ({ active: StrataMCE.active, pack: PACK.on }));
const res = { imported, modsLine, info, gui, way, after, errs: errs.slice(0, 5) };
res.pass = gui.win && /solarflux/.test(gui.win[0]) && /Energy/.test(gui.ext || '') && gui.panelBoxes && gui.ways.length === 2 && way.sent.length === 1 && way.sent[0][0] === 'waystones' && info.forge && info.modRec && info.placed.every(p => p[1] > 0) && info.placed.filter(p => p[3]).length >= 4 && info.hot.length >= 3 && !errs.length && !after.active;
console.log(JSON.stringify(res, null, 1)); await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(res.pass ? 0 : 1);
