// Browser test (dev only): a protocol-1.8 server spawns every 1.8 mob type in a row, arms skeletons/zombies, fires arrows and sends health+food.
// Screenshots: /tmp/mobs18-nopack.png and (with PACK=1) /tmp/mobs18-pack.png using a generated pack whose entity textures exercise the UV wrapping.
// Run: cd tools/mctest && npm i && NODE_PATH=/opt/npm-tools/node_modules node test-mobs18.mjs   (needs ../relay deps too)
import mc from 'minecraft-protocol'; import Chunk from 'prismarine-chunk'; import vec3 from 'vec3'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), { chromium } = req('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms)); const Vec3 = vec3.Vec3 || vec3;
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: '25593' }, stdio: 'ignore' }); await wait(1200);
const ver = '1.8.8', C = Chunk(ver), server = mc.createServer({ 'online-mode': false, version: ver, host: '127.0.0.1', port: 25779 });
function makeChunk() { const c = new C(); for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { c.setBlockType(new Vec3(x, 0, z), 7); for (let y = 1; y <= 60; y++) c.setBlockType(new Vec3(x, y, z), y === 60 ? 2 : 1); } return c; }
// every 1.8 living type, one per column (x), all at z=48 so they face the camera in a row
const TYPES = (process.env.TYPES || '54,51,57,50,58,52,59,60,67,61,56,62,55,66,97,99,98,101,96,92,90,91,93,95,100,65,94,120,68,53,64,63').split(',').map(Number);
const sl = (id, count, damage) => ({ blockId: id, itemCount: count, itemDamage: damage, nbtData: undefined });
server.on('login', c => {
  c.write('login', { entityId: c.id, gameMode: +(process.env.GM || 0), dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false });
  c.write('position', { x: 40.5, y: 61, z: 40.5, yaw: 0, pitch: 0, flags: 0 });
  for (let cx = 0; cx < 6; cx++) for (let cz = 0; cz < 6; cz++) { const ch = makeChunk(); c.write('map_chunk', { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }); }
  setTimeout(() => {
    let nb = 0, ns = 0; const BIG = [53, 56, 63, 64];
    TYPES.forEach((t, i) => { const big = BIG.includes(t), x = big ? 14 + (nb++) * 22 : 8 + (ns % 16) * 5, z = big ? 80 : 30 + Math.floor(ns++ / 16) * 16; c.write('spawn_entity_living', { entityId: 200 + i, type: t, x: Math.round(x * 32), y: (big ? 64 : 61) * 32, z: Math.round(z * 32), yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: t === 51 && process.env.WITHER ? [{ type: 0, key: 13, value: 1 }] : [] }); });
    TYPES.forEach((t, i) => { if (t === 51) c.write('entity_equipment', { entityId: 200 + i, slot: 0, item: sl(261, 1, 0) }); if (t === 54 || t === 57) c.write('entity_equipment', { entityId: 200 + i, slot: 0, item: sl(t === 57 ? 283 : 267, 1, 0) }); });
    // arrows: one flying across, one already stuck in the ground; plus a blaze fireball
    c.write('spawn_entity', { entityId: 900, type: 60, x: 34 * 32, y: 63 * 32, z: 44 * 32, pitch: 0, yaw: 0, objectData: 201, velocity: { x: 6000, y: 1200, z: 0 } });
    c.write('spawn_entity', { entityId: 901, type: 60, x: 41 * 32, y: Math.round(61.3 * 32), z: 44 * 32, pitch: 0, yaw: 0, objectData: 201, velocity: { x: 3000, y: -3000, z: 1000 } });
    c.write('spawn_entity', { entityId: 902, type: 64, x: 36 * 32, y: 63 * 32, z: 45 * 32, pitch: 0, yaw: 0, objectData: 210, velocity: { x: 400, y: 0, z: 0 } });
    c.write('update_health', { health: 15, food: 13, foodSaturation: 2 });
  }, +(process.env.SPAWN_MS || 20000));
});
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1000, height: 620 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|'))); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
if (process.env.PACK) { const zip = req('child_process').execFileSync('python3', [process.cwd() + '/make-entity-pack.py']); await pg.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); window.__testPack = await importPack(new File([bin], 'testpack.zip')); }, zip.toString('base64')); }
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: '1.8 - 1.8.9 (protocol 47)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:25593'); await pg.dispatchEvent('#mcRelay', 'change');
await pg.fill('#mcHost', '127.0.0.1:25779'); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: +(process.env.PLAYWAIT || 120000) }).catch(() => {}); console.error('mode', await pg.evaluate(() => { const S = StrataMCE.dbg(); return JSON.stringify({ mode, w: S && S.world, st: S && S.store.size, ch: world && world.chunks.size, p: [player.x, player.y, player.z], mobs: S && S.mobs.length, log: (document.getElementById('mcLog') || {}).innerText }); }));
if (process.env.PACK) await pg.evaluate(async () => { await applyPack(window.__testPack);
  // paint every compat model's box faces in distinct colours (part hue x face shade), standing in for real pack textures
  const CM = StrataMCE.CM, sh = [1.25, .55, 1, .75, .85, .45];
  for (const k in CM) { const d = CM[k], [W, H] = d.dims, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const M = d.model({ phase: 0, moving: false, face: 0, x: 0, y: 0, z: 0 }), ref = M.ref || 64, sc = W / ref;
    M.parts.forEach((pt, i) => { const [u, v] = pt.uv, [w, h, dd] = pt.s, hue = (i * 67) % 360;
      [[u + dd, v, w, dd], [u + dd + w, v, w, dd], [u + dd, v + dd, w, h], [u, v + dd, dd, h], [u + dd + w, v + dd, dd, h], [u + dd + w + dd, v + dd, w, h]].forEach((r, j) => { g.fillStyle = `hsl(${hue},70%,${Math.round(55 * sh[j])}%)`; g.fillRect(r[0] * sc, r[1] * sc, Math.max(1, r[2] * sc), Math.max(1, r[3] * sc)); }); });
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.activeTexture(gl.TEXTURE0); __ENT[k] = { tex: t, w: W, h: H }; } });
await pg.waitForFunction(() => (window.__cmobs || []).length > 0, null, { timeout: 60000 }).catch(() => {}); await wait(3000);
const shots = (process.env.SHOTS || '28').split(',').map(Number), out = [];
if (process.env.CLOSE) { const n = await pg.evaluate(() => window.__cmobs.length); for (let i = 0; i < n; i++) {
  const t = await pg.evaluate(([i, z]) => { const m = [...window.__cmobs].sort((a, b) => a.eid - b.eid)[i], big = { mc_ghast: 9, mc_dragon: 24, mc_wither: 8, mc_iron_golem: 6, zombie: m.size > 4 ? 22 : 4.5 }[m.type] || 4.5; player.x = m.x + big * .9; player.z = m.z - big * .4; player.y = 61; cam.zoom = z * big / 4.5; window.__tgt = m; return m.type + (m.size > 4 ? '-giant' : ''); }, [i, +(process.env.ZOOM || 3.2)]);
  await wait(+(process.env.SETTLE || 1000)); const p = await pg.evaluate(() => { const m = window.__tgt, d = MOB[m.type], s = m.size ? m.size * .5 : 1; return toScreen(m.x, m.y + (d ? d.h : 1) * s * .5, m.z); });
  const W = 400, H = 360, x = Math.max(0, Math.min(1000 - W, p[0] - W / 2)), y = Math.max(0, Math.min(620 - H, p[1] - H / 2)); const f = `/tmp/mob-${process.env.PACK ? 'pack' : 'nopack'}-${String(i).padStart(2, '0')}-${t}.png`; await pg.screenshot({ path: f, clip: { x, y, width: W, height: H } }); out.push(f); } }
for (const sx of shots) { await pg.evaluate(([x, Z]) => { const S = StrataMCE.dbg(); player.x = x + S.OX; player.z = Z + S.OZ; player.face = Math.PI; cam.zoom = +(window.__ZOOM || 7); }, [sx, +(process.env.PZ || 52)]); await wait(1500); const f = `/tmp/mobs18-${process.env.PACK ? 'pack' : 'nopack'}-${sx}.png`; await pg.screenshot({ path: f }); out.push(f); }
const info = await pg.evaluate(() => { const S = StrataMCE.dbg(); return { mobs: (window.__cmobs || []).map(m => m.type), proj: arrows.filter(a => a.mc).length, food: S.food, hunger: !!document.getElementById('mcHunger') && getComputedStyle(document.getElementById('mcHunger')).display, armed: (window.__cmobs || []).filter(m => m.eq && m.eq[0]).length }; });
await pg.$eval('#mcLeave', e => e.click()).catch(() => {}); await wait(1200);
const after = await pg.evaluate(() => ({ active: StrataMCE.active, models: Object.keys(__skins.MODELS).filter(k => k.startsWith('mc')), arrows: arrows.length, hunger: !!document.getElementById('mcHunger') && getComputedStyle(document.getElementById('mcHunger')).display, mobT: Object.keys(MOB).filter(k => k.startsWith('mc')) }));
console.log(JSON.stringify({ info, after, shots: out, errs: errs.slice(0, 6) }));
await b.close(); server.close(); relay.kill(); process.exit(0);
