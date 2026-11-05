/* Strata <-> Minecraft compat engine hookup. Runs only while a compat session has a world; everything it changes is restored by stop(). */
(function () {
  'use strict';
  const SIZE = 2048, HGT = 256;
  const MCE = window.StrataMCE = { active: false };
  const OVR = ['stepMobs', 'stepMobSpawning', 'stepHostileSpawning', 'stepGrowth', 'stepDecay', 'stepHealth', 'spawnMob', 'fluidNotify', 'stepFluids', 'saveGame', 'stepMining'];
  const LIVING = { 90: 'pig', 91: 'sheep', 92: 'cow', 93: 'chicken', 100: 'horse', 95: 'wolf', 52: 'spider', 59: 'spider', 54: 'zombie', 57: 'zombie', 51: 'skeleton', 55: 'slime', 65: 'bat' };   // anything else (fish, phantoms, ...) is skipped
  let S = null;

  // ---- late block registration (ids 8192+), removed again on stop ----
  const post = id => { const bd = BLOCKS[id]; LOPQ[id] = bd.lightOpaque !== undefined ? bd.lightOpaque : (bd.opaque ? 1 : 0); LATT[id] = bd.att || 0; if (bd.tint) TINT[id] = bd.tint; if (bd.emit) EMIT[id] = bd.emit; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255);
  function register(e) {
    const key = JSON.stringify(e); if (S.vis.has(key)) return S.vis.get(key);
    const id = S.next++; S.regs.push(id);
    if (e.k === 'glass') { const c = rgb(e.t); def(id, 'mc glass', e.t, 0, 0, { opaque: false, noItem: 1, tint: c.map(v => v * .5 + .5) }); }
    else if (e.k === 'fence') { def(id, 'mc fence', '#000000', 0, 0, { opaque: false, fence: 1, noItem: 1 }); BLOCKS[id].top = BLOCKS[id].side = BLOCKS[id].bottom = hex(e.t); }
    else def(id, 'mc block', e.t, e.s || e.t, e.b || e.s || e.t, Object.assign({ noItem: 1 }, e.e ? { emit: e.e, att: 1 } : {}));
    post(id); S.vis.set(key, id); return id;
  }
  function stateToId(st) {   // protocol 47: st = blockId<<4 | meta
    let e = StrataMC.blocks18[st >> 4]; if (!e || e.k === 'skip') return 0;
    const v = e.v && e.v[st & 15]; if (v) e = v.k ? v : Object.assign({}, e, v);
    if (e.k === 'strata') return B[e.n] || 0;
    if (e.k === 'skip') return 0;
    return register(e);
  }
  const lookup = st => { let v = S.lut[st]; if (v < 0) v = S.lut[st] = stateToId(st); return v; };

  // ---- world ----
  class McGen { constructor(seed, size, h) { this.seed = seed; this.size = size; this.H = h; this.mcompat = true; }
    height() { return 64; } sample() { return 64; } biomeAt() { return 0; } spawnOK() { return 64; } village() { return false; }
    fill(ch) { const a = S && S.store.get(ch.cx * 1024 + ch.cz); if (a) ch.blocks = a; } }
  window.__McGen = McGen;
  const ckey = (cx, cz) => cx * 1024 + cz;
  function topOf(ch) { const bl = ch.blocks, L = CS * CS; let y = HGT - 1; for (; y > 0; y--) { let any = false; for (let i = y * L, e = i + L; i < e; i++) if (bl[i]) { any = true; break; } if (any) break; } ch.top = y + 1; }
  function dirtyAround(cx, cz) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = world.chunk(cx + dx, cz + dz); if (n) n.dirty = true; } }

  function ensureWorld(ax, az) {
    if (S.world) return;
    S.OX = 1024 - Math.floor(ax / 16) * 16; S.OZ = 1024 - Math.floor(az / 16) * 16;
    for (const n of OVR) { S.saved[n] = window[n]; window[n] = n === 'saveGame' ? function () {} : function () {}; }
    window.__mcActive = true; window.__cmobs = S.mobs;
    const meta = { id: 'mcompat', name: S.o.host, seedNum: 1, size: SIZE, height: HGT, gen: 'mcompat', sea: 63, gameMode: 'creative', mc: 1 };
    enterPlay(meta, null); S.world = true;
    world.radius = 5; world.ready = () => true;
    world.generate = function (cx, cz) { if (!S.store.has(ckey(cx, cz))) return null; const ch = World.prototype.generate.call(this, cx, cz); return ch; };
    document.body.classList.add('mc-compat'); if(!document.getElementById('mcCompatCss')){ const st=document.createElement('style'); st.id='mcCompatCss'; st.textContent='body.mc-compat #hotbar,body.mc-compat #wname,body.mc-compat #clock{display:none!important}'; document.head.appendChild(st); }
    S.o.onWorld && S.o.onWorld();
  }
  const inRange = (cx, cz) => cx >= 0 && cz >= 0 && cx < SIZE / 16 && cz < SIZE / 16;

  function makeHandler() {
    const Hd = {
      cur: null,
      login() {}, respawn() { for (const k of [...S.store.keys()]) unloadKey(k); S.store.clear(); },
      health() {}, time() {},
      position(p) {
        const c = Hd.cur || { x: 0, y: 0, z: 0 }, x = (p.flags & 1 ? c.x : 0) + p.x, y = (p.flags & 2 ? c.y : 0) + p.y, z = (p.flags & 4 ? c.z : 0) + p.z;
        ensureWorld(x, z); Hd.cur = { x, y, z };
        Object.assign(player, { x: x + S.OX, y, z: z + S.OZ, vx: 0, vy: 0, vz: 0, fallTop: y });
        if (!(p.flags & 8)) player.face = -p.yaw * Math.PI / 180;
      },
      chunk(cx, cz, sections, gu) {
        if (!S.world) ensureWorld(cx * 16 + 8, cz * 16 + 8);
        const sx = cx + (S.OX >> 4), sz = cz + (S.OZ >> 4); if (!inRange(sx, sz)) return;
        const k = ckey(sx, sz); let arr = gu ? new Uint16Array(CS * CS * HGT) : (S.store.get(k) || new Uint16Array(CS * CS * HGT));
        for (const sec of sections) { const base = sec.y * 4096, b = sec.blocks; for (let j = 0; j < 4096; j++) arr[base + j] = lookup(b[j]); }
        S.store.set(k, arr);
        const ch = world.chunk(sx, sz); if (ch) { ch.blocks = arr; topOf(ch); lightChunk(world, ch); ch.dirty = true; }
        dirtyAround(sx, sz);
      },
      unload(cx, cz) { unloadKey(ckey(cx + (S.OX >> 4), cz + (S.OZ >> 4))); },
      block(x, y, z, st) { if (!S.world) return; setBlock(x + S.OX, y, z + S.OZ, lookup(st)); },
      multi(l) { if (!S.world) return; for (const b of l) setBlock(b.x + S.OX, b.y, b.z + S.OZ, lookup(b.state)); },
      playerInfo(u, n) { if (n) S.names.set(u, n); else S.names.delete(u); },
      spawn(e) {
        if (!S.world) return; const type = e.kind === 'player' ? 'lost' : LIVING[e.type]; if (!type) return;
        const x = e.x + S.OX, z = e.z + S.OZ, m = { type, x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * Math.PI / 180, tface: -e.yaw * Math.PI / 180, hurtT: 0, moving: false, phase: 0, baby: false, wool: 0, sheared: false, col: 0, size: type === 'slime' ? 2 : 0, flee: 0 };
        S.ents.set(e.eid, m); S.mobs.push(m);
      },
      move(id, dx, dy, dz) { const m = S.ents.get(id); if (m) { m.tx += dx; m.ty += dy; m.tz += dz; } },
      look(id, yaw) { const m = S.ents.get(id); if (m) m.tface = -yaw * Math.PI / 180; },
      head() {},
      teleport(id, x, y, z, yaw) { const m = S.ents.get(id); if (m) { m.tx = x + S.OX; m.ty = y; m.tz = z + S.OZ; m.tface = -yaw * Math.PI / 180; } },
      destroy(l) { for (const id of l) { const m = S.ents.get(id); if (m) { S.ents.delete(id); const i = S.mobs.indexOf(m); if (i >= 0) S.mobs.splice(i, 1); } } },
    };
    return Hd;
  }
  function unloadKey(k) { S.store.delete(k); const ch = world && world.chunks.get(k); if (ch) { freeMesh(ch.mesh); freeMesh(ch.water); freeMesh(ch.leaf); freeMesh(ch.glass); world.chunks.delete(k); } }
  function setBlock(x, y, z, id) {
    const a = S.store.get(ckey(x >> 4, z >> 4)); if (!a || y < 0 || y >= HGT) return;
    if (world.chunk(x >> 4, z >> 4) && y >= 1) world.set(x, y, z, id); else a[(y * CS + (z & 15)) * CS + (x & 15)] = id;
  }

  function tick() {   // entity smoothing + our position to the server
    const now = performance.now(), dt = Math.min(.1, (now - (S.lastT || now)) / 1000); S.lastT = now;
    for (const m of S.mobs) { const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-14 * dt); m.x += dx * k; m.y += dy * k; m.z += dz * k; m.moving = d > .03; if (m.moving) m.phase += dt * 9;
      let da = m.tface - m.face; da = Math.atan2(Math.sin(da), Math.cos(da)); m.face += da * k; }
  }

  MCE.start = function (o) {
    if (MCE.active) MCE.stop();
    S = { o, store: new Map(), lut: new Int32Array(4096).fill(-1), vis: new Map(), regs: [], next: 8192, saved: {}, mobs: [], ents: new Map(), names: new Map(), world: false, OX: 0, OZ: 0 };
    MCE.active = true; const Hd = makeHandler();
    const prev = o.onClose; o.world = Hd; o.viewDistance = 6;
    o.onClose = w => { prev && prev(w); };
    const cl = StrataMC.connect(o); S.client = cl; S.Hd = Hd;
    S.t1 = setInterval(tick, 33);
    S.t2 = setInterval(() => { if (S && S.world && mode === 'play' && Hd.cur) { const x = player.x - S.OX, z = player.z - S.OZ; Hd.cur = { x, y: player.y, z }; cl.sendPos(x, player.y, z, -player.face * 180 / Math.PI, 0, !!player.onGround); } }, 50);
    return { chat: t => cl.chat(t), close: () => MCE.stop(), get state() { return cl.state; } };
  };
  MCE.stop = function () {
    if (!S) return; const s = S; S = null; MCE.active = false; clearInterval(s.t1); clearInterval(s.t2);
    try { s.client.close(); } catch (e) { /* closed */ }
    if (s.world) {
      for (const n of OVR) if (s.saved[n]) window[n] = s.saved[n];
      document.body.classList.remove('mc-compat'); window.__mcActive = false; window.__cmobs = null;
      for (const id of s.regs) { BLOCKS[id] = undefined; LOPQ[id] = 0; LATT[id] = 0; TINT[id] = undefined; EMIT[id] = undefined; } BLOCKS.length = Math.min(BLOCKS.length, 8192);
      document.getElementById('pause').hidden = true; document.getElementById('hud').hidden = true; document.getElementById('loading').hidden = true;
      document.getElementById('menu').hidden = true; startPreview();
    }
  };
})();
