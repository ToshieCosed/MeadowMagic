// Browser test (dev only) for the 1.8-1.12.2 world code: a minecraft-protocol server of version VER serves real chunks (prismarine-chunk),
// new blocks, mobs of that version, a player, a dropped item, a sign, a boss bar and a title; checks decode, meshing, entities and the 1.9+ handshake details.
// Run: cd tools/mctest && VER=1.12.2 NODE_PATH=/opt/npm-tools/node_modules node test-world-multi.mjs   (screenshot: /tmp/world-<VER>.png)
import mc from 'minecraft-protocol'; import mcdata from 'minecraft-data'; import Chunk from 'prismarine-chunk'; import vec3 from 'vec3'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms)); const Vec3 = vec3.Vec3 || vec3;
const ver = process.env.VER || '1.12.2', d = mcdata(ver), P = d.version.version, V9 = P >= 107, O = P >= 210 ? 1 : 0, C = Chunk(ver);
const LABEL = { 47: '1.8.9', 107: '1.9', 108: '1.9.1', 109: '1.9.2', 110: '1.9.4', 210: '1.10.2', 315: '1.11', 316: '1.11.2', 335: '1.12', 338: '1.12.1', 340: '1.12.2' }[P];
const port = 25800 + (P % 97), rport = 25700 + (P % 97);
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(rport) }, stdio: 'ignore' }); await wait(1200);
const server = mc.createServer({ 'online-mode': false, version: ver, host: '127.0.0.1', port });
const S = (x, y, z, id, m) => ({ id, m: m || 0, x, y, z });
const EXTRA = [S(40, 61, 44, 35, 14), S(41, 61, 44, 5, 0)];
if (P >= 107) EXTRA.push(S(42, 61, 44, 201), S(43, 61, 44, 198, 1), S(44, 61, 44, 208));
if (P >= 210) EXTRA.push(S(45, 61, 44, 213), S(46, 61, 44, 216));
if (P >= 315) EXTRA.push(S(47, 61, 44, 219), S(48, 61, 44, 225));
if (P >= 335) EXTRA.push(S(49, 61, 44, 251, 14), S(50, 61, 44, 235));
function makeChunk(cx, cz) {
  const c = new C(); for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { c.setBlockType(new Vec3(x, 0, z), 7); for (let y = 1; y <= 60; y++) c.setBlockType(new Vec3(x, y, z), y === 60 ? 2 : y > 57 ? 3 : 1); try { c.setSkyLight(new Vec3(x, 61, z), 15); } catch (e) { /* ok */ } }
  for (const b of EXTRA) if (b.x >> 4 === cx && b.z >> 4 === cz) { c.setBlockType(new Vec3(b.x & 15, b.y, b.z & 15), b.id); c.setBlockData(new Vec3(b.x & 15, b.y, b.z & 15), b.m); }
  if (cx === 2 && cz === 2) { c.setBlockType(new Vec3(10, 61, 14), 63); }   // a sign post at 42,61,46
  return c;
}
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0'), sl = (id, count, damage, nbt) => ({ blockId: id, itemCount: count, itemDamage: damage, nbtData: nbt });
const MOBS = [[54, 34, 47], [51, 36, 47], [91, 38, 47]]; if (P >= 107) MOBS.push([69, 40, 48]); if (P >= 210) MOBS.push([102, 43, 48]); if (P >= 315) MOBS.push([103, 46, 48], [36, 49, 48], [34, 52, 48], [23, 34, 50], [6, 37, 50], [28, 40, 50]); if (P >= 335) MOBS.push([105, 43, 51], [37, 46, 51]);
const got = { pos: 0, tc: 0, place: 0, use: 0, click: 0, settings: null };
server.on('login', c => {
  c.on('packet', (dt, m) => { if (/position/.test(m.name)) got.pos++; if (m.name === 'teleport_confirm') got.tc++; if (m.name === 'settings') got.settings = dt; if (m.name === 'block_place') got.place++; if (m.name === 'use_item') got.use++; if (m.name === 'window_click') got.click++; });
  c.write('login', { entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false });
  c.write('position', { x: 40.5, y: 61, z: 46.5, yaw: 0, pitch: 0, flags: 0, teleportId: 7 });
  for (let cx = 0; cx < 5; cx++) for (let cz = 0; cz < 5; cz++) { const ch = makeChunk(cx, cz); const pk = { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }; if (V9) pk.blockEntities = []; c.write('map_chunk', pk); }
  setTimeout(() => {
    const lines = ['{"text":"Hello"}', '{"text":"' + ver + '"}', '{"text":""}', '{"text":""}'];
    if (P >= 110) c.write('tile_entity_data', { location: { x: 42, y: 61, z: 46 }, action: 9, nbtData: { type: 'compound', name: '', value: { id: { type: 'string', value: P >= 315 ? 'minecraft:sign' : 'Sign' }, x: { type: 'int', value: 42 }, y: { type: 'int', value: 61 }, z: { type: 'int', value: 46 }, Text1: { type: 'string', value: lines[0] }, Text2: { type: 'string', value: lines[1] }, Text3: { type: 'string', value: lines[2] }, Text4: { type: 'string', value: lines[3] } } } });
    else c.write('update_sign', { location: { x: 42, y: 61, z: 46 }, text1: lines[0], text2: lines[1], text3: lines[2], text4: lines[3] });
    MOBS.forEach(([t, x, z], i) => { const md = t === 91 ? [{ key: V9 ? 12 + O : 16, type: 0, value: 14 }] : []; const pk = { entityId: 200 + i, type: t, x, y: 61, z, yaw: 0, pitch: 0, headPitch: 0, metadata: md };
      if (V9) { pk.entityUUID = uuid(200 + i); pk.velocity = { x: 0, y: 0, z: 0 }; } else { pk.x *= 32; pk.y *= 32; pk.z *= 32; pk.velocity = { x: 0, y: 0, z: 0 }; } c.write('spawn_entity_living', pk); });
    c.write('entity_equipment', { entityId: 201, slot: 0, item: sl(261, 1, 0) });
    c.write('entity_equipment', { entityId: 200, slot: V9 ? 5 : 4, item: sl(310, 1, 0) });
    const drop = { entityId: 300, type: 2, x: 39, y: 61.2, z: 45, pitch: 0, yaw: 0, objectData: 1 }; if (V9) { drop.objectUUID = uuid(300); drop.velocity = { x: 0, y: 0, z: 0 }; } else { drop.x *= 32; drop.y = Math.round(drop.y * 32); drop.z *= 32; drop.velocity = { x: 0, y: 0, z: 0 }; }
    c.write('spawn_entity', drop); c.write('entity_metadata', { entityId: 300, metadata: [{ key: V9 ? 5 + O : 10, type: 5, value: sl(264, 3, 0) }] });
    const items = Array(V9 ? 46 : 45).fill(null).map(() => ({ blockId: -1 })); items[36] = sl(276, 1, 0); items[37] = sl(1, 32, 0); if (V9) { items[38] = sl(373, 1, 0, { type: 'compound', name: '', value: { Potion: { type: 'string', value: 'minecraft:strong_swiftness' } } }); items[45] = sl(442, 1, 0); }
    c.write('window_items', { windowId: 0, items }); c.write('update_health', { health: 16, food: 15, foodSaturation: 2 });
    c.write('chat', { message: JSON.stringify({ text: 'hello from ' + ver, color: 'gold' }), position: 0 });
    if (V9) c.write('boss_bar', { entityUUID: uuid(900), action: 0, title: JSON.stringify({ text: 'Test Boss' }), health: .6, color: 2, dividers: 0, flags: 0 });
    c.write('title', { action: 0, text: JSON.stringify({ text: 'Welcome' }) });
    c.write('player_info', { action: 'add_player', data: [{ uuid: uuid(400), name: 'Alice', properties: [], gamemode: 0, ping: 30 }] });
    const pl = { entityId: 400, playerUUID: uuid(400), x: 44, y: 61, z: 46, yaw: 0, pitch: 0, metadata: [] }; if (!V9) { pl.x *= 32; pl.y *= 32; pl.z *= 32; pl.currentItem = 0; } c.write('named_entity_spawn', pl);
    setTimeout(() => { const t = { entityId: 200 }; if (V9) Object.assign(t, { x: 35, y: 61, z: 47, yaw: 0, pitch: 0, onGround: true }); else Object.assign(t, { x: 35 * 32, y: 61 * 32, z: 47 * 32, yaw: 0, pitch: 0, onGround: true }); c.write('entity_teleport', t);
      c.write('block_change', { location: { x: 40, y: 61, z: 45 }, type: (V9 && P >= 315 ? 219 : 89) << 4 }); }, 2500);
  }, 2500);
});
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|'))); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: LABEL + ' (protocol ' + P + ')' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:' + rport); await pg.dispatchEvent('#mcRelay', 'change');
await pg.fill('#mcHost', '127.0.0.1:' + port); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 150000 }).catch(() => {});
await pg.waitForFunction(() => (window.__cmobs || []).length > 2, null, { timeout: 60000 }).catch(() => {}); await wait(4000);
const info = await pg.evaluate(() => { const S = StrataMCE.dbg(), g = (x, y, z) => world.get(x + S.OX, y, z + S.OZ), w = world;
  return { mode, chunks: w.chunks.size, meshed: [...w.chunks.values()].filter(c => c.mesh).length, ground: g(40, 60, 46), stone: g(40, 30, 46), wool: g(40, 61, 44), purpur: g(42, 61, 44), rod: g(43, 61, 44), path: g(44, 61, 44), magma: g(45, 61, 44), shulker: g(47, 61, 44), concrete: g(49, 61, 44), changed: g(40, 61, 45),
    mobs: (window.__cmobs || []).map(m => m.type + (m.wool ? ':' + m.wool : '') + (m.htype != null ? ':h' + m.htype : '')), z0: (window.__cmobs || []).find(m => m.eid === 200), drops: drops.filter(q => q.mc).length, dropId: (drops.find(q => q.mc) || {}).id, signs: (w.decor || []).filter(d => d.kind === 'sign').map(d => d.text),
    players: S.players.length, hot: inv.slots.slice(0, 3).map(s => s && ITEMS[s.id].name), off: S.slots[45] && S.slots[45].id, boss: !!document.getElementById('mcBoss') && document.getElementById('mcBoss').textContent, title: (document.getElementById('mcT1') || {}).textContent, hp: player.hp,
    log: document.getElementById('mcLog').innerText.slice(-200), p: [player.x - S.OX, player.y, player.z - S.OZ] }; });
info.z0 = info.z0 && [Math.round(info.z0.tx - 0), info.z0.eq && info.z0.eq[4] && info.z0.eq[4].id];
await pg.evaluate(() => { const S = StrataMCE.dbg(); player.x = 42.5 + S.OX; player.z = 54 + S.OZ; cam.zoom = 7; }); await wait(3000); await pg.screenshot({ path: '/tmp/world-' + ver + '.png' });
const act = await pg.evaluate(async () => { const S = StrataMCE.dbg(); selectSlot(1); S.client.api.place(41 - 0, 61, 44, 1, S.slots[37], 8, 16, 8); S.client.api.useItem(0); openInv(); await new Promise(r => setTimeout(r, 300)); const b = document.querySelectorAll('#mcHot .islot')[1]; if (b) b.click(); closeInv(); return 1; });
await wait(1500);
await pg.$eval('#mcLeave', e => e.click()).catch(() => {}); await wait(1200);
const after = await pg.evaluate(() => ({ active: StrataMCE.active, blocks: BLOCKS.length }));
const res = { ver, P, info, got, after, errs: errs.slice(0, 5) };
const x = info; res.pass = x.mode === 'play' && x.chunks >= 9 && x.meshed >= 4 && x.ground > 0 && x.stone > 0 && x.wool > 0 && x.mobs.length >= 3 && x.mobs.includes('sheep:14') && x.drops === 1 && x.signs.length === 1 && /Hello/.test(x.signs[0]) && x.players === 1 && /sword/i.test(x.hot[0] || '') && got.pos > 2 && (!V9 || (got.tc >= 1 && x.off && /Test Boss/.test(x.boss || '') && /Swiftness/.test(x.hot[2] || '') && x.purpur > 0 && x.rod > 0)) && (P < 315 || (x.shulker > 0 && x.mobs.includes('mc_llama') && x.mobs.includes('mc_vindicator') && x.mobs.includes('mc_husk') && x.mobs.some(m => m === 'horse:h4'))) && (P < 335 || (x.concrete > 0 && x.mobs.includes('parrot') && x.mobs.includes('mc_illusioner'))) && (P < 210 || x.mobs.includes('mc_polar_bear')) && (P < 107 || x.mobs.includes('mc_shulker')) && !errs.length && !after.active;
console.log(JSON.stringify(res)); await b.close(); server.close(); relay.kill(); process.exit(res.pass ? 0 : 1);
