// Browser test (dev only) for Stage 19 compat features on VER (1.8.9 - 1.12.2): teams, hologram stands, maps in frames, world border, cooldowns,
// clickable chat commands, tab complete, villager trades, the recipe book, elytra / sleeping players, bed colours, advancements, server resource packs.
// Run: cd tools/mctest && VER=1.12.2 NODE_PATH=/opt/npm-tools/node_modules node test-features.mjs   (needs /tmp/claude-0/srvpack.zip; screenshot /tmp/feat-<VER>.png)
import mc from 'minecraft-protocol'; import mcdata from 'minecraft-data'; import Chunk from 'prismarine-chunk'; import vec3 from 'vec3'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms)); const Vec3 = vec3.Vec3 || vec3;
const ver = process.env.VER || '1.12.2', d = mcdata(ver), P = d.version.version, V9 = P >= 107, O = P >= 210 ? 1 : 0, C = Chunk(ver);
const LABEL = { 47: '1.8.9', 107: '1.9', 110: '1.9.4', 210: '1.10.2', 316: '1.11.2', 340: '1.12.2' }[P];
const port = 26100 + (P % 97), rport = 26000 + (P % 97), hport = 26300 + (P % 97);
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(rport) }, stdio: 'ignore' }); await wait(1200);
const hs = http.createServer((q, r) => { const png = /skin/.test(q.url); r.writeHead(200, { 'Content-Type': png ? 'image/png' : 'application/zip', 'Access-Control-Allow-Origin': '*' }); r.end(fs.readFileSync(png ? '/tmp/claude-0/skin.png' : '/tmp/claude-0/srvpack.zip')); }).listen(hport);
const server = mc.createServer({ 'online-mode': false, version: ver, host: '127.0.0.1', port });
function makeChunk(cx, cz) { const c = new C(); for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { c.setBlockType(new Vec3(x, 0, z), 7); for (let y = 1; y <= 60; y++) c.setBlockType(new Vec3(x, y, z), y === 60 ? 2 : y > 57 ? 3 : 1); try { c.setSkyLight(new Vec3(x, 61, z), 15); } catch (e) { /* ok */ } }
  if (cx === 2 && cz === 2) { c.setBlockType(new Vec3(4, 61, 12), 26); c.setBlockData(new Vec3(4, 61, 12), 0); c.setBlockType(new Vec3(4, 61, 13), 26); c.setBlockData(new Vec3(4, 61, 13), 8); c.setBlockType(new Vec3(14, 61, 12), 1); c.setBlockType(new Vec3(14, 62, 12), 1); }
  if (cx === 2 && cz === 3) { c.setBlockType(new Vec3(6, 61, 0), 144); c.setBlockData(new Vec3(6, 61, 0), 1); c.setBlockType(new Vec3(7, 61, 0), 144); c.setBlockData(new Vec3(7, 61, 0), 1); }
  return c; }
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0'), sl = (id, count, damage) => ({ blockId: id, itemCount: count, itemDamage: damage });
const slotB = (id, n, dm) => { const b = Buffer.alloc(6); b.writeInt16BE(id, 0); b.writeInt8(n, 2); b.writeInt16BE(dm, 3); b[5] = 0; return b; };
const got = { chats: [], tab: 0, chatCmd: '', trSel: -1, rp: [], click: 0, act: [] };
const mt = (key, type, value) => ({ key, type, value }), BYTE = 0, STR = V9 ? 3 : 4, BOOL = V9 ? 6 : 0, SLOT = 5;
server.on('login', c => {
  c.on('packet', (dt, m) => { try { onP(dt, m); } catch (e) { got.err = String(e.stack).slice(0, 300); } }); const onP = (dt, m) => { if (m.name === 'chat') got.chats.push(dt.message); if (m.name === 'use_item' || (m.name === 'block_place' && dt.location && dt.location.y === -1 && dt.direction === -1)) got.useItem = (got.useItem || 0) + 1; if (m.name === 'block_place') got.bp = (got.bp || 0) + 1; if (m.name === 'tab_complete') { got.tab++; c.write('tab_complete', { matches: ['/help', '/heal'] }); } if (m.name === 'chat' && dt.message[0] === '/' && !got.chatCmd) got.chatCmd = dt.message;
    if (m.name === 'custom_payload' && dt.channel === 'MC|TrSel') got.trSel = dt.data.readInt32BE(0); if (m.name === 'resource_pack_receive') got.rp.push(dt.result); if (m.name === 'window_click') got.click++; if (m.name === 'entity_action') got.act.push(dt.actionId);
    if (m.name === 'chat' && dt.message === '/rtp') { for (let cx = 311; cx <= 314; cx++) for (let cz = 311; cz <= 314; cz++) { const ch = makeChunk(cx, cz); const pk = { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }; if (V9) pk.blockEntities = []; c.write('map_chunk', pk); }
      c.write('position', { x: 5000.5, y: 61, z: 5000.5, yaw: 0, pitch: 0, flags: 0, teleportId: 9 }); }
    if (m.name === 'chat' && dt.message === '/switch') { c.write('login', { entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false }); c.write('respawn', { dimension: -1, difficulty: 0, gamemode: 0, levelType: 'default' }); c.write('respawn', { dimension: 0, difficulty: 0, gamemode: 0, levelType: 'default' }); } };
  c.write('login', { entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false });
  c.write('position', { x: 40.5, y: 61, z: 46.5, yaw: 0, pitch: 0, flags: 0, teleportId: 7 });
  for (let cx = 0; cx < 5; cx++) for (let cz = 0; cz < 5; cz++) { const ch = makeChunk(cx, cz); const pk = { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }; if (V9) pk.blockEntities = []; c.write('map_chunk', pk); }
  setTimeout(() => {
    const items = Array(V9 ? 46 : 45).fill(null).map(() => ({ blockId: -1 })); items[36] = sl(276, 1, 0); items[9] = sl(5, 4, 0); items[10] = sl(388, 10, 0); items[37] = sl(358, 1, 5); if (V9) items[6] = sl(443, 1, 0);
    c.write('window_items', { windowId: 0, items }); c.write('update_health', { health: 20, food: 20, foodSaturation: 2 });
    c.write(V9 ? 'teams' : 'scoreboard_team', Object.assign({ team: 'red', mode: 0, name: 'Red', prefix: '§c[R] ', suffix: '', friendlyFire: 1, nameTagVisibility: 'always', color: 12, players: ['Alice'] }, V9 ? { collisionRule: 'always' } : {}));
    for (const [n, id] of [['Alice', 400], ['Bob', 401]]) { c.write('player_info', { action: 'add_player', data: [{ uuid: uuid(id), name: n, properties: [], gamemode: 0, ping: 30 }] });
      const pl = { entityId: id, playerUUID: uuid(id), x: id === 400 ? 44 : 36.5, y: id === 400 ? 64 : 61, z: 46, yaw: 0, pitch: 0, metadata: [] }; if (!V9) { pl.x *= 32; pl.y *= 32; pl.z *= 32; pl.currentItem = 0; } c.write('named_entity_spawn', pl); }
    if (V9) { c.write('entity_equipment', { entityId: 400, slot: 4, item: sl(443, 1, 0) }); c.write('entity_metadata', { entityId: 400, metadata: [mt(0, BYTE, -128)] }); c.write('entity_equipment', { entityId: 401, slot: 1, item: sl(442, 1, 0) }); }
    c.write('bed', { entityId: 401, location: { x: 36, y: 61, z: 45 } });
    if (P >= 335) for (const z of [44, 45]) c.write('tile_entity_data', { location: { x: 36, y: 61, z }, action: 11, nbtData: { type: 'compound', name: '', value: { id: { type: 'string', value: 'minecraft:bed' }, x: { type: 'int', value: 36 }, y: { type: 'int', value: 61 }, z: { type: 'int', value: z }, color: { type: 'int', value: 11 } } } });
    // a hologram: invisible marker armour stand with a visible custom name
    const st = { entityId: 500, type: 78, x: 41.5, y: 62, z: 48.5, pitch: 0, yaw: 0, objectData: 0, velocity: { x: 0, y: 0, z: 0 } }; if (V9) st.objectUUID = uuid(500); else { st.x *= 32; st.y *= 32; st.z *= 32; }
    c.write('spawn_entity', st); c.write('entity_metadata', { entityId: 500, metadata: [mt(0, BYTE, 0x20), mt(2, STR, '§aWelcome §lHolo'), mt(3, BOOL, V9 ? true : 1), mt(10 + O, BYTE, 16)] });
    // a map in an item frame on the stone at 46,61,44 (facing south)
    const data = Buffer.alloc(16384); for (let i = 0; i < 16384; i++) data[i] = ((i >> 7) < 64 ? 4 : 12) * 4 + 2;
    c.write('map', Object.assign({ itemDamage: 5, scale: 0, icons: [{ directionAndType: 0, x: 0, z: 0 }], columns: -128, rows: -128, x: 0, y: 0, data }, V9 ? { trackingPosition: true } : {}));
    const fr = { entityId: 501, type: 71, x: 46, y: 62, z: 45, pitch: 0, yaw: 0, objectData: 0, velocity: { x: 0, y: 0, z: 0 } }; if (V9) fr.objectUUID = uuid(501); else { fr.x *= 32; fr.y *= 32; fr.z *= 32; }
    c.write('spawn_entity', fr); c.write('entity_metadata', { entityId: 501, metadata: [mt(V9 ? 6 + O : 8, SLOT, sl(358, 1, 5))] });
    const skull = (x, z, type, tex) => c.write('tile_entity_data', { location: { x, y: 61, z }, action: 4, nbtData: { type: 'compound', name: '', value: Object.assign({ id: { type: 'string', value: P >= 315 ? 'minecraft:skull' : 'Skull' }, x: { type: 'int', value: x }, y: { type: 'int', value: 61 }, z: { type: 'int', value: z }, SkullType: { type: 'byte', value: type }, Rot: { type: 'byte', value: 4 } },
      tex ? { Owner: { type: 'compound', value: { Name: { type: 'string', value: 'Steve' }, Properties: { type: 'compound', value: { textures: { type: 'list', value: { type: 'compound', value: [{ Value: { type: 'string', value: Buffer.from(JSON.stringify({ textures: { SKIN: { url: tex } } })).toString('base64') } }] } } } } } } } : {}) } });
    skull(38, 48, 3, 'http://127.0.0.1:' + hport + '/skin.png'); skull(39, 48, 4);
    c.write('world_border', { action: 3, x: 40, z: 40, old_radius: 40, new_radius: 40, speed: 0, portalBoundary: 29999984, warning_time: 15, warning_blocks: 5 });
    if (V9) c.write('set_cooldown', { itemID: 276, cooldownTicks: 1200 });
    c.write('abilities', { flags: 4, flyingSpeed: .05, walkingSpeed: .1 });
    c.write('chat', { message: JSON.stringify({ text: 'Click ', extra: [{ text: '[spawn]', color: 'aqua', clickEvent: { action: 'run_command', value: '/spawn' }, hoverEvent: { action: 'show_text', value: 'Go to spawn' } }] }), position: 0 });
    c.write('resource_pack_send', { url: 'http://127.0.0.1:' + hport + '/pack.zip', hash: '' });
    if (P >= 335) c.write('advancements', { reset: true, advancementMapping: [{ key: 'story/root', value: { parentId: undefined, displayData: { title: '{"text":"Minecraft"}', description: '{"text":"The heart"}', icon: sl(2, 1, 0), frameType: 0, flags: { _unused: 0, hidden: 0, show_toast: 0, has_background_texture: 1 }, backgroundTexture: 'minecraft:textures/blocks/stone.png', xCord: 0, yCord: 0 }, criteria: [{ key: 'crafting_table', value: undefined }], requirements: [['crafting_table']] } },
      { key: 'story/mine_stone', value: { parentId: 'story/root', displayData: { title: '{"text":"Stone Age"}', description: '{"text":"Mine stone"}', icon: sl(270, 1, 0), frameType: 0, flags: { _unused: 0, hidden: 0, show_toast: 1, has_background_texture: 0 }, xCord: 1, yCord: 0 }, criteria: [{ key: 'get_stone', value: undefined }], requirements: [['get_stone']] } }],
      identifiers: [], progressMapping: [{ key: 'story/root', value: [{ criterionIdentifier: 'crafting_table', criterionProgress: [0, 123456] }] }, { key: 'story/mine_stone', value: [{ criterionIdentifier: 'get_stone', criterionProgress: undefined }] }] });
    setTimeout(() => { if (P >= 335) c.write('advancements', { reset: false, advancementMapping: [], identifiers: [], progressMapping: [{ key: 'story/mine_stone', value: [{ criterionIdentifier: 'get_stone', criterionProgress: [0, 123456] }] }] });
      c.write('open_window', { windowId: 3, inventoryType: 'minecraft:villager', windowTitle: JSON.stringify({ text: 'Farmer' }), slotCount: 3, entityId: 0 }); const wi = Array(39).fill(null).map(() => ({ blockId: -1 })); wi[3] = sl(5, 4, 0); wi[4] = sl(388, 10, 0); wi[30] = sl(276, 1, 0); wi[31] = sl(358, 1, 5); c.write('window_items', { windowId: 3, items: wi });
      const tr = Buffer.concat([Buffer.from([0, 0, 0, 3, 1]), slotB(388, 1, 0), slotB(297, 3, 0), Buffer.from([0, 0]), Buffer.from([0, 0, 0, 0, 0, 0, 0, 7])]); c.write('custom_payload', { channel: 'MC|TrList', data: tr }); }, 3000);
  }, 2500);
});
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|'))); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
const toasts = []; await pg.exposeFunction('__tlog', t => toasts.push(t)); await pg.evaluate(() => { const o = window.toast; window.toast = (t, ...a) => { window.__tlog(String(t)); return o(t, ...a); }; });
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: LABEL + ' (protocol ' + P + ')' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:' + rport); await pg.dispatchEvent('#mcRelay', 'change');
await pg.fill('#mcHost', '127.0.0.1:' + port); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 150000 }).catch(() => {}); await wait(7000);
if (process.env.SHOT) await pg.evaluate(() => { window.__noSwitch = 1; });
const info = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const r = {};
  r.team = !!(S.teams && S.teams.get('red'));
  r.holo = S.stands.map(s => [s.cname, s.cvis, s.invis, s.marker]); r.map = !!(S.maps && S.maps.get(5)); r.mapPost = (world.decor || []).filter(e => e.mapId === 5).length;
  r.border = S.border && Math.round(S.border.to); r.cool = !!(S.icd && S.icd.get(276)); r.abil = S.abil && S.abil.f;
  const alice = S.players.find(p => p.eid === 400), bob = S.players.find(p => p.eid === 401); r.glide = alice && alice.glide; r.sleep = !!(bob && bob.sleep); r.aliceTeam = document.querySelector('#mcTags')?.innerHTML.includes('[R]');
  const bed = BLOCKS[world.get(36 + S.OX, 61, 44 + S.OZ)]; r.bed = bed && bed.bed ? bed.bed.k + ':' + bed.bed.fi + ':' + bed.bed.head : String(bed && bed.name);
  r.stone = !!(PACK.on && PACK.rec && PACK.rec.files['b/stone']); r.adv = S.adv && S.adv.size; r.advBtn = !!document.getElementById('mcAdvBtn');
  const cmd = document.querySelector('#mcLog .mcCmd'); r.cmdTitle = !!document.querySelector('#mcLog [title="Go to spawn"]'); if (cmd) cmd.click();
  const i = document.getElementById('mcIn'); i.value = '/he'; i.dispatchEvent(new Event('input')); await W(900); r.sug = [...document.querySelectorAll('#mcSug button')].map(b => b.textContent);
  r.trades = S.win && S.win.trades && S.win.trades.length; const tb = [...document.querySelectorAll('#mcExt button')].find(b => /→/.test(b.textContent)); if (tb) tb.click(); await W(600); r.pay = S.win && S.win.slots[0] && S.win.slots[0].id;
  closeInv(); await W(300); openInv(); await W(200); const rb = [...document.querySelectorAll('#mcExt button')].find(b => /Recipe book/.test(b.textContent)); if (rb) rb.click(); await W(200);
  const ct = document.querySelector('#mcExt [aria-label="Craft Crafting Table"]'); r.ct = !!ct; if (ct) ct.click(); await W(500); r.grid = [1, 2, 3, 4].map(k => S.slots[k] && S.slots[k].id);
  closeInv(); await W(200);
  if (S.o.protocol >= 107) { player.y += 6; player.vy = -1; player.onGround = false; input.jumpEdge = true; await W(150); r.selfGlide = player.gliding; }
  selectSlot(1); for (let k = 0; k < 30 && !r.mapHudOn; k++) { await W(150); r.mapHudOn = !!document.getElementById('mcMapHud') && document.getElementById('mcMapHud').style.display !== 'none'; } r.held = [inv.sel, held() && held().mc && held().mc.id, mode];
  r.tags = [...document.querySelectorAll('#mcTags > div')].map(e => e.textContent);
  player.x = 40 + S.OX + 45; await W(200); r.clamp = Math.round(player.x - S.OX);
  { player.gliding = false; player.x = 41.5 + S.OX; player.z = 46.5 + S.OZ; player.y = 61; player.vx = player.vy = player.vz = 0; await W(600); S.food = 10; S.Hd.slot(0, 38, { id: 297, count: 5, damage: 0, raw: new Uint8Array([1, 41, 5, 0, 0, 0]) }); selectSlot(2); await W(200); let hit = null; for (let yy = innerHeight * .55; yy < innerHeight * .95 && !hit; yy += 20) { if (pick(innerWidth / 2, yy)) hit = yy; } r.eatTap = [hit != null, tryInteract(innerWidth / 2, hit), !!player.eating]; }
  { player.eating = null; player.eatCd = 0; await W(300); const u0 = 0; mining = { t0: performance.now() - 400, sx: innerWidth / 2, sy: 40, ptr: 7 }; await W(400); r.hold = [!!(mining && mining.used), !!player.eating]; endMining(7); await W(100); r.hold.push(!!player.eating); }
  r.skulls = S.skulls && [...S.skulls.values()].map(q => q.type + ':' + q.face + ':' + !!(q.T && q.T.tex)); r.tilt = window.__plTilt ? 1 : 0;
  S.client.chat('/rtp'); for (let k = 0; k < 40 && Math.abs(player.x - S.OX - 5000) > 5; k++) await W(250); await W(1500); r.rtp = [Math.floor(player.x - S.OX), Math.floor(player.z - S.OZ), world.get(Math.floor(player.x), 60, Math.floor(player.z)), world.chunks.size, Math.round(player.y), JSON.stringify(S.Hd.cur), S.far && S.far.size, S.OX];
  if (!window.__noSwitch) { S.client.chat('/switch'); await W(1500); } r.afterSwitch = [S.players.length, S.mobs.length, S.stands.length, S.ents.size];
  return r; });
await wait(800); await pg.evaluate(() => { const S = StrataMCE.dbg(); player.x = 41 + S.OX; player.z = 50 + S.OZ; player.y = 61; cam.zoom = 6; if (window.__noSwitch) { S.slots[36 + inv.sel] = { id: 442, count: 1, damage: 0, raw: new Uint8Array([1, 186, 1, 0, 0, 0]) }; S.block = true; } }); await wait(2500); await pg.screenshot({ path: '/tmp/feat-' + ver + '.png' });
await pg.$eval('#mcLeave', e => e.click()).catch(() => {}); await wait(1500);
const after = await pg.evaluate(() => ({ active: StrataMCE.active, pack: !!(PACK.on && PACK.rec && PACK.rec.files && PACK.rec.files['b/stone']), elytra: window.__elytra, css: !!document.getElementById('mcExtCss') }));
const res = { ver, P, info, got, toasts: toasts.slice(0, 8), after, errs: errs.slice(0, 5) }, x = info;
res.pass = x.team && x.holo.length === 1 && x.holo[0][1] && x.holo[0][2] && x.holo[0][3] && /Welcome/.test(x.tags.join('|')) && x.map && x.mapPost === 1 && x.border === 20 && x.abil === 4 && x.sleep && x.tags.includes("[R] Alice") && /^red:/.test(x.bed) === (P < 335) && x.stone && got.rp.join() === '3,0' && got.chatCmd === '/spawn' && x.cmdTitle && x.sug.includes('/help') && got.tab >= 1
  && x.trades === 1 && got.trSel === 0 && x.pay === 388 && x.ct && x.grid.every(v => v === 5) && x.mapHudOn && x.clamp <= 60 && (!V9 || (x.cool && x.glide && x.selfGlide && got.act.some(a => a === 8 || a === 'start_fall_flying'))) && (P < 335 || (x.adv === 2 && x.advBtn && /blue:/.test(x.bed) && toasts.some(t => /Stone Age/.test(t)))) && x.skulls && x.skulls.includes('3:1:true') && x.skulls.includes('4:1:false') && x.tilt && x.eatTap.join() === 'true,true,true' && x.hold.join() === 'true,true,false' && got.useItem >= 1 && x.rtp[0] === 5000 && x.rtp[2] > 0 && x.rtp[4] >= 60 && x.afterSwitch.join() === '0,0,0,0' && !errs.length && !after.active && !after.pack && !after.css;
console.log(JSON.stringify(res)); await b.close(); server.close(); hs.close(); relay.kill(); process.exit(res.pass ? 0 : 1);
