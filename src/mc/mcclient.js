/* Strata Minecraft-compat protocol client (Java Edition 1.8 .. latest). Isolated: nothing here touches the Strata world. */
(function (g) {
  'use strict';
  let IDS = {};
  const te = new TextEncoder(), td = new TextDecoder();
  // ---- byte writer / reader ----
  class W {
    constructor() { this.a = []; }
    b(x) { this.a.push(x & 255); return this; }
    vi(n) { n >>>= 0; do { let x = n & 127; n >>>= 7; if (n) x |= 128; this.a.push(x); } while (n); return this; }
    str(s) { const u = te.encode(s); this.vi(u.length); for (const x of u) this.a.push(x); return this; }
    u16(n) { return this.b(n >> 8).b(n); }
    i32(n) { return this.b(n >> 24).b(n >> 16).b(n >> 8).b(n); }
    i64(n) { const d = new DataView(new ArrayBuffer(8)); d.setBigInt64(0, BigInt(n)); for (let i = 0; i < 8; i++) this.a.push(d.getUint8(i)); return this; }
    bool(x) { return this.b(x ? 1 : 0); }
    f32(n) { const d = new DataView(new ArrayBuffer(4)); d.setFloat32(0, n); for (let i = 0; i < 4; i++) this.a.push(d.getUint8(i)); return this; }
    f64(n) { const d = new DataView(new ArrayBuffer(8)); d.setFloat64(0, n); for (let i = 0; i < 8; i++) this.a.push(d.getUint8(i)); return this; }
    raw(u) { for (const x of u) this.a.push(x); return this; }
    bytes(u) { this.vi(u.length); return this.raw(u); }
    uuid(h) { h = (h || '').replace(/-/g, '').padEnd(32, '0'); for (let i = 0; i < 16; i++) this.a.push(parseInt(h.substr(i * 2, 2), 16)); return this; }
    out() { return Uint8Array.from(this.a); }
  }
  class R {
    constructor(u, p) { this.u = u; this.p = p || 0; this.d = new DataView(u.buffer, u.byteOffset, u.byteLength); }
    b() { return this.u[this.p++]; }
    vi() { let v = 0, s = 0, x; do { x = this.u[this.p++]; v |= (x & 127) << s; s += 7; } while (x & 128); return v; }
    str() { const n = this.vi(); const s = td.decode(this.u.subarray(this.p, this.p + n)); this.p += n; return s; }
    skip(n) { this.p += n; }
    i32() { const v = this.d.getInt32(this.p); this.p += 4; return v; }
    bool() { return this.b() !== 0; }
    i8() { return this.d.getInt8(this.p++); }
    u16() { const v = this.d.getUint16(this.p); this.p += 2; return v; }
    i16() { const v = this.d.getInt16(this.p); this.p += 2; return v; }
    f32() { const v = this.d.getFloat32(this.p); this.p += 4; return v; }
    f64() { const v = this.d.getFloat64(this.p); this.p += 8; return v; }
    i64() { const v = this.d.getBigInt64(this.p); this.p += 8; return Number(v); }
    uuid() { let h = ''; for (let i = 0; i < 16; i++) h += this.u[this.p++].toString(16).padStart(2, '0'); return h; }
    bytes() { const n = this.vi(); const r = this.u.subarray(this.p, this.p + n); this.p += n; return r; }
    rest() { return this.u.subarray(this.p); }
    nbt() { const t = this.b(); return this.tag(t); }
    tag(t) {
      switch (t) {
        case 0: return null; case 1: return this.d.getInt8(this.p++);
        case 2: { const v = this.d.getInt16(this.p); this.p += 2; return v; }
        case 3: return this.i32();
        case 4: { const v = this.d.getBigInt64(this.p); this.p += 8; return Number(v); }
        case 5: { const v = this.d.getFloat32(this.p); this.p += 4; return v; }
        case 6: { const v = this.d.getFloat64(this.p); this.p += 8; return v; }
        case 7: { const n = this.i32(); this.p += n; return null; }
        case 8: { const n = this.d.getUint16(this.p); this.p += 2; const s = td.decode(this.u.subarray(this.p, this.p + n)); this.p += n; return s; }
        case 9: { const it = this.b(), n = this.i32(), a = []; for (let i = 0; i < n; i++) a.push(this.tag(it)); return a; }
        case 10: { const o = {}; for (;;) { const k = this.b(); if (k === 0) break; const n = this.d.getUint16(this.p); this.p += 2; const name = td.decode(this.u.subarray(this.p, this.p + n)); this.p += n; o[name] = this.tag(k); } return o; }
        case 11: { const n = this.i32(); this.p += n * 4; return null; }
        case 12: { const n = this.i32(); this.p += n * 8; return null; }
        default: throw new Error('bad nbt tag ' + t);
      }
    }
  }
  // ---- chat components ----
  const TR = { 'chat.type.text': '<%s> %s', 'chat.type.announcement': '[%s] %s', 'chat.type.emote': '* %s %s', 'chat.type.admin': '[%s: %s]', 'chat.type.team.text': '<%s> %s',
    'multiplayer.player.joined': '%s joined the game', 'multiplayer.player.left': '%s left the game', 'multiplayer.player.joined.renamed': '%s (formerly known as %s) joined the game',
    'death.attack.generic': '%s died', 'commands.message.display.incoming': '%s whispers to you: %s', 'commands.message.display.outgoing': 'You whisper to %s: %s' };
  function comp(x) {
    if (x == null) return '';
    if (typeof x === 'string') { const t = x.trim(); if (t[0] === '{' || t[0] === '[' || t[0] === '"') { try { return comp(JSON.parse(t)); } catch (e) { /* plain text */ } } return x.replace(/§./g, ''); }
    if (typeof x === 'number' || typeof x === 'boolean') return String(x);
    if (Array.isArray(x)) return x.map(comp).join('');
    let s = '';
    if (x.text != null) s += comp(String(x.text)); else if (x.translate != null) {
      const w = (x.with || x.args || []).map(comp); let i = 0; const f = TR[x.translate];
      s += f ? f.replace(/%(\d+\$)?s/g, (m, n) => n ? (w[parseInt(n) - 1] || '') : (w[i++] || '')) : (x.fallback ? comp(x.fallback) : x.translate + (w.length ? ' ' + w.join(' ') : ''));
    } else if (x.selector != null) s += x.selector; else if (x.keybind != null) s += x.keybind;
    if (x.extra) s += comp(x.extra);
    return s.replace(/§./g, '');
  }
  const hex = u => Array.from(u, x => x.toString(16).padStart(2, '0')).join('');
  const b64 = u => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // ---- Minecraft 1.8 (protocol 47) world data ----
  const popc = m => { let n = 0; for (; m; m >>= 1) n += m & 1; return n; };
  function sections18(r, mask, sky, groundUp) {   // r positioned at the chunk data: blocks (state = id<<4|meta), block light, sky light, then biomes
    const out = [];
    for (let i = 0; i < 16; i++) if (mask & (1 << i)) { const a = new Uint16Array(4096); for (let j = 0; j < 4096; j++) { a[j] = r.u[r.p] | (r.u[r.p + 1] << 8); r.p += 2; } out.push({ y: i, blocks: a }); }
    for (let i = 0; i < out.length; i++) r.skip(2048);
    if (sky) for (let i = 0; i < out.length; i++) r.skip(2048);
    if (groundUp) r.skip(256);
    return out;
  }
  const ang = b => b * 360 / 256;
  function slot18(r) {   // 1.8 item: short id (-1 = empty), byte count, short damage, optional named NBT. raw keeps the bytes for sending back in clicks.
    const p0 = r.p, id = r.i16(); if (id < 0) return null;
    const count = r.b(), damage = r.i16(), t = r.b(); if (t !== 0) { r.skip(r.u16()); r.tag(t); }
    return { id, count, damage, raw: r.u.slice(p0, r.p) };
  }
  const pos64 = (x, y, z) => { const v = ((BigInt(x) & 0x3FFFFFFn) << 38n) | ((BigInt(y) & 0xFFFn) << 26n) | (BigInt(z) & 0x3FFFFFFn); const w = []; for (let i = 7; i >= 0; i--) w.push(Number((v >> BigInt(i * 8)) & 0xFFn)); return w; };
  const slotOut = (w, it) => { if (!it) return w.b(255).b(255); return w.raw(it.raw); };

  function connect(o) {
    const P = o.protocol, ids = IDS[P];
    if (!ids) throw new Error('No packet table for protocol ' + P);
    const rev = {}; for (const k of ['lc', 'cc', 'pc']) { rev[k] = {}; for (const n in (ids[k] || {})) rev[k][ids[k][n]] = n; }
    let state = 'login', ws, pend = 0, closed = false, joined = false, sky = true, posT = null;
    const H = o.world || null;
    const say = t => { try { o.onChat && o.onChat(t); } catch (e) { /* ui */ } };
    const status = t => { try { o.onStatus && o.onStatus(t); } catch (e) { /* ui */ } };
    // connection diagnostics: when a drop gives no reason, say how long we were in, when the server last spoke, and whether the app was in the background
    const T0 = Date.now(); let lastRx = T0, lastKA = 0, hidT = 0, hidMax = 0;
    const vis = () => { if (typeof document === 'undefined') return; if (document.hidden) hidT = Date.now(); else if (hidT) { hidMax = Math.max(hidMax, Date.now() - hidT); hidT = 0; } };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', vis);
    const diag = () => { const n = Date.now(), s = ms => Math.round(ms / 1000) + 's', bg = hidT ? n - hidT : hidMax;
      return ' (connected ' + s(n - T0) + ', last server packet ' + s(n - lastRx) + ' ago' + (lastKA ? ', last keep-alive ' + s(n - lastKA) + ' ago' : '') + (bg > 3000 ? ', app was in the background for ' + s(bg) : '') + ')'; };
    const end = why => { if (closed) return; closed = true; if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', vis); try { ws.close(); } catch (e) { /* closed */ } try { o.onClose && o.onClose(why); } catch (e) { /* ui */ } };
    const S = { login: 'ls', config: 'cs', play: 'ps' };
    const out = (name, w) => { const id = (ids[S[state]] || {})[name]; if (id == null) return false; const b = new W().vi(id); if (w) b.raw(w.out ? w.out() : w); ws.send(b.out()); return true; };
    const mc = P >= 765 ? r => comp(r.nbt()) : r => comp(r.str());        // text component encoding: NBT from 1.20.3
    const optMc = r => (r.bool() ? mc(r) : null);

    function loginStart() {
      const w = new W().str(o.name || 'Strata');
      if (P >= 764) w.uuid(o.uuid); else if (P >= 761) { w.bool(true).uuid(o.uuid); } else if (P >= 759) { w.bool(false).bool(true).uuid(o.uuid); }
      out('login_start', w);
    }
    function resourcePack(r, hash) {   // pretend-accept so servers that require a pack don't kick us
      const send = res => { const w = new W(); if (P >= 765) w.uuid(r.id); else if (P < 210) w.str(hash || ''); w.vi(res); out('resource_pack_receive', w); };
      send(3); send(0);
    }
    function onLogin(name, r, body) {
      if (name === 'disconnect') return end(comp(r.str()));
      if (name === 'encryption_begin') {
        const sid = r.str(), pub = r.bytes().slice(), tok = r.bytes().slice();
        status('Encrypting...'); ws.send(JSON.stringify({ type: 'mc_encrypt_begin', serverId: sid, publicKey: b64(pub), verifyToken: b64(tok) })); return;
      }
      if (name === 'success') {
        if (P >= 764) { out('login_acknowledged'); state = 'config'; } else state = 'play';
        status('Logged in'); return;
      }
      if (name === 'login_plugin_request') { const id = r.vi(); out('login_plugin_response', new W().vi(id).bool(false)); return; }
      if (name === 'cookie_request') { out('cookie_response', new W().str(r.str()).bool(false)); }
    }
    function onConfig(name, r, body, idLen) {
      if (name === 'disconnect') return end(mc(r));
      if (name === 'keep_alive') { out('keep_alive', body.subarray(idLen)); return; }
      if (name === 'ping') { out('pong', new W().i32(r.i32())); return; }
      if (name === 'finish_configuration') { out('finish_configuration'); state = 'play'; return; }
      if (name === 'select_known_packs') { out('select_known_packs', new W().vi(0)); return; }
      if (name === 'add_resource_pack') { resourcePack({ id: r.uuid() }); return; }
      if (name === 'cookie_request') { out('cookie_response', new W().str(r.str()).bool(false)); }
    }
    function onPlay(name, r, body, idLen) {
      // 1.8 entity metadata: flags (idx 0) and small bytes (baby, skeleton type, slime size) go to H.flags/H.bmeta, item slots to H.meta
      const meta18 = eid => { for (let n = 0; n < 40; n++) { const b = r.b() & 255; if (b === 127) break; const t = b >> 5, idx = b & 31;
        if (t === 0) { const v = r.i8(); if (idx === 0 && H.flags) H.flags(eid, v); else if (H.bmeta) H.bmeta(eid, idx, v); } else if (t === 1) r.i16(); else if (t === 2) r.i32(); else if (t === 3) r.f32(); else if (t === 4) r.str(); else if (t === 5) { const it = slot18(r); H.meta(eid, idx, it); } else if (t === 6) { r.i32(); r.i32(); r.i32(); } else if (t === 7) { r.f32(); r.f32(); r.f32(); } else break; } };
      switch (name) {
        case 'kick_disconnect': return end(P >= 765 ? comp(r.nbt()) : comp(r.str()));
        case 'keep_alive': out('keep_alive', body.subarray(idLen)); lastKA = Date.now(); return;
        case 'transaction': if (P === 47) { const wid = r.i8(), act = r.i16(), ok = r.bool(); if (!ok) out('transaction', new W().b(wid & 255).b((act >> 8) & 255).b(act & 255).bool(true)); } return;   // a refused click must be acknowledged, or the server ignores that window from then on
        case 'ping': out('pong', new W().i32(r.i32())); return;
        case 'login': if (!joined) { joined = true; status('Joined the world'); }
          if (P === 47 && H) { const eid = r.i32(), gm = r.b(), dim = r.i8(); sky = dim === 0; H.login && H.login({ eid, dimension: dim, gamemode: gm }); out('settings', new W().str('en_US').b(o.viewDistance || 6).b(0).bool(true).b(127)); out('custom_payload', new W().str('MC|Brand').str('vanilla')); }   // like the vanilla client; some anti-bot plugins drop clients that never send a brand
          return;
        case 'respawn': if (P === 47 && H) { sky = r.i32() === 0; H.respawn && H.respawn(); } return;
        case 'update_time': if (P === 47 && H && H.time) { const age = r.i64(), tod = r.i64(); H.time(age, tod); } return;
        case 'update_health': if (P === 47 && H && H.health) { const hp = r.f32(), food = r.vi(); H.health(hp, food); } return;
        case 'held_item_slot': if (P === 47 && H && H.held) H.held(r.i8()); return;
        case 'set_slot': if (P === 47 && H && H.slot) { const wid = r.i8(), sl = r.i16(); H.slot(wid, sl, slot18(r)); } return;
        case 'spawn_entity_painting': if (P === 47 && H && H.painting) { const eid = r.vi(), title = r.str(), hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; H.painting(eid, title, px, py, pz, r.b()); } return;
        case 'open_window': if (P === 47 && H && H.openWin) { const wid = r.b(), type = r.str(), title = comp(r.str()), n = r.b(); H.openWin(wid, type, title, n); } return;
        case 'close_window': if (P === 47 && H && H.closeWin) H.closeWin(r.b()); return;
        case 'craft_progress_bar': if (P === 47 && H && H.winProp) { const wid = r.b(), k = r.i16(); H.winProp(wid, k, r.i16()); } return;
        case 'window_items': if (P === 47 && H && H.items) { const wid = r.b(), n = r.i16(), l = []; for (let i = 0; i < n; i++) l.push(slot18(r)); H.items(wid, l); } return;
        case 'game_state_change': if (P === 47 && H && H.gameState) { const rs = r.b(), v = r.f32(); H.gameState(rs, v); } return;
        case 'position': if (P === 47 && H) {
          const x = r.f64(), y = r.f64(), z = r.f64(), yaw = r.f32(), pitch = r.f32(), fl = r.b();
          H.position && H.position({ x, y, z, yaw, pitch, flags: fl });
          // the server's value is final: confirm with our own position
          const w = new W().f64(H.cur ? H.cur.x : x).f64(H.cur ? H.cur.y : y).f64(H.cur ? H.cur.z : z).f32(yaw).f32(pitch).bool(true); out('position_look', w);
        } return;
        case 'map_chunk': if (P === 47 && H && H.chunk) {
          const x = r.i32(), z = r.i32(), gu = r.bool(), mask = r.u16(); r.vi();
          if (gu && mask === 0) { H.unload && H.unload(x, z); return; }
          H.chunk(x, z, sections18(r, mask, sky, gu), gu);
        } return;
        case 'map_chunk_bulk': if (P === 47 && H && H.chunk) {
          const sk = r.bool(), n = r.vi(), ms = []; for (let i = 0; i < n; i++) ms.push([r.i32(), r.i32(), r.u16()]);
          for (const [x, z, mask] of ms) H.chunk(x, z, sections18(r, mask, sk, true), true);
        } return;
        case 'entity_velocity': if (P === 47 && H && H.velocity) { const eid = r.vi(); H.velocity(eid, r.i16() / 8000, r.i16() / 8000, r.i16() / 8000); } return;
        case 'entity_status': if (P === 47 && H && H.status) { const eid = r.d.getInt32(r.p); r.p += 4; H.status(eid, r.i8()); } return;
        case 'update_sign': if (P === 47 && H && H.sign) {
          const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6, ln = [];
          for (let i = 0; i < 4; i++) { let t = r.str(); try { const j = JSON.parse(t); t = typeof j === 'string' ? j : (j.text || '') + (j.extra ? j.extra.map(e => e.text || '').join('') : ''); } catch (e) { /* plain */ } ln.push(t); }
          H.sign(px, py, pz, ln);
        } return;
        case 'spawn_entity': if (P === 47 && H && H.dropSpawn) {
          const eid = r.vi(), type = r.b(), x = r.i32() / 32, y = r.i32() / 32, z = r.i32() / 32, pitch = ang(r.i8()), yaw = ang(r.i8()), data = r.i32(); let vx = 0, vy = 0, vz = 0; if (data) { vx = r.i16() / 8000; vy = r.i16() / 8000; vz = r.i16() / 8000; }
          if (type === 2) H.dropSpawn(eid, x, y, z, vx, vy, vz); else if (H.objSpawn) H.objSpawn(eid, type, x, y, z, data, vx, vy, vz, yaw, pitch);   // projectiles (arrows, fireballs) for compat mode
        } return;
        case 'entity_metadata': if (P === 47 && H && H.meta) {
          meta18(r.vi());
        } return;
        case 'collect': if (P === 47 && H && H.collect) { const a = r.vi(); H.collect(a, r.vi()); } return;
        case 'named_sound_effect': if (P === 47 && H && H.sound) { const nm = r.str(), x = r.i32() / 8, y = r.i32() / 8, z = r.i32() / 8, v = r.f32(); H.sound(nm, x, y, z, v, r.b() / 63); } return;
        case 'explosion': if (P === 47 && H && H.explosion) {
          const x = r.f32(), y = r.f32(), z = r.f32(), rad = r.f32(), n = r.d.getInt32(r.p); r.p += 4; const rec = []; for (let i = 0; i < n; i++) rec.push([r.i8(), r.i8(), r.i8()]);
          H.explosion(x, y, z, rad, rec, r.f32(), r.f32(), r.f32());
        } return;
        case 'entity_equipment': if (P === 47 && H && H.equip) { const eid = r.vi(), sl = r.i16(); H.equip(eid, sl, slot18(r)); } return;
        case 'animation': if (P === 47 && H && H.anim) { const eid = r.vi(); H.anim(eid, r.b()); } return;
        case 'block_change': if (P === 47 && H && H.block) {
          const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8;
          const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6;
          H.block(px, py, pz, r.vi());
        } return;
        case 'multi_block_change': if (P === 47 && H && H.multi) {
          const cx = r.i32(), cz = r.i32(), n = r.vi(), l = [];
          for (let i = 0; i < n; i++) { const hz = r.b(), y = r.b(), st = r.vi(); l.push({ x: cx * 16 + (hz >> 4), y, z: cz * 16 + (hz & 15), state: st }); }
          H.multi(l);
        } return;
        case 'named_entity_spawn': if (P === 47 && H && H.spawn) {
          const eid = r.vi(), uuid = r.uuid(), x = r.i32() / 32, y = r.i32() / 32, z = r.i32() / 32, yaw = ang(r.i8()), pitch = ang(r.i8());
          H.spawn({ eid, kind: 'player', uuid, x, y, z, yaw, pitch });
        } return;
        case 'spawn_entity_living': if (P === 47 && H && H.spawn) {
          const eid = r.vi(), type = r.b(), x = r.i32() / 32, y = r.i32() / 32, z = r.i32() / 32, yaw = ang(r.i8()), pitch = ang(r.i8());
          H.spawn({ eid, kind: 'mob', type, x, y, z, yaw, pitch }); r.i8(); r.i16(); r.i16(); r.i16(); if (H.meta) meta18(eid);   // head pitch, velocity, then the spawn metadata (size, skeleton type, baby)
        } return;
        case 'rel_entity_move': if (P === 47 && H && H.move) { const eid = r.vi(); H.move(eid, r.i8() / 32, r.i8() / 32, r.i8() / 32); } return;
        case 'entity_look': if (P === 47 && H && H.look) { const eid = r.vi(); H.look(eid, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_move_look': if (P === 47 && H && H.move) { const eid = r.vi(), dx = r.i8() / 32, dy = r.i8() / 32, dz = r.i8() / 32; H.move(eid, dx, dy, dz); H.look && H.look(eid, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_teleport': if (P === 47 && H && H.teleport) { const eid = r.vi(); H.teleport(eid, r.i32() / 32, r.i32() / 32, r.i32() / 32, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_head_rotation': if (P === 47 && H && H.head) { const eid = r.vi(); H.head(eid, ang(r.i8())); } return;
        case 'entity_destroy': if (P === 47 && H && H.destroy) { const n = r.vi(), l = []; for (let i = 0; i < n; i++) l.push(r.vi()); H.destroy(l); } return;
        case 'player_info': if (P === 47 && H && H.playerInfo) {
          const act = r.vi(), n = r.vi();
          for (let i = 0; i < n; i++) { const u = r.uuid(); if (act === 0) { const nm = r.str(), pc = r.vi(); let sk = null; for (let k = 0; k < pc; k++) { const pn = r.str(), pv = r.str(); if (r.bool()) r.str(); if (pn === 'textures') { try { const j = JSON.parse(atob(pv)), t = j.textures && j.textures.SKIN; if (t) sk = { url: String(t.url || '').replace(/^http:/, 'https:'), slim: !!(t.metadata && t.metadata.model === 'slim') }; } catch (e) { /* bad property */ } } } r.vi(); r.vi(); if (r.bool()) r.str(); H.playerInfo(u, nm, sk); } else if (act === 4) H.playerInfo(u, null); else if (act === 1 || act === 2) r.vi(); else if (act === 3) { if (r.bool()) r.str(); } }
        } return;
        case 'start_configuration': out('configuration_acknowledged'); state = 'config'; return;
        case 'resource_pack_send': { const u = r.str(), h = r.str(); resourcePack({}, h); return; }
        case 'add_resource_pack': resourcePack({ id: r.uuid() }); return;
        case 'cookie_request': out('cookie_response', new W().str(r.str()).bool(false)); return;
        case 'chat': {
          if (P < 759) { const t = comp(r.str()), pos = r.b(); if (pos !== 2 && t) say(t); }
          return;
        }
        case 'system_chat': {
          let t, over = false;
          if (P >= 765) { t = comp(r.nbt()); over = r.bool(); } else { t = comp(r.str()); if (P >= 760) over = r.bool(); else r.vi(); }
          if (!over && t) say(t); return;
        }
        case 'player_chat': {
          let name, text;
          if (P < 761) {
            const signed = comp(r.str()); const un = r.bool() ? comp(r.str()) : null; r.vi(); r.uuid(); name = comp(r.str()); text = un || signed;
          } else {
            r.uuid(); r.vi(); const hasSig = r.bool(); if (hasSig) { r.skip(256); pend++; }
            const msg = r.str(); r.skip(16); const n = r.vi(); for (let i = 0; i < n; i++) { const id = r.vi(); if (id === 0) r.skip(256); }
            const un = optMc(r); const ft = r.vi(); if (ft === 2) { const c = r.vi(); r.skip(c * 8); }
            r.vi(); name = mc(r); text = un || msg;
            if (P >= 761 && pend >= 20) { out('message_acknowledgement', new W().vi(pend)); pend = 0; }
          }
          say('<' + name + '> ' + text); return;
        }
        case 'profileless_chat': case 'disguised_chat': {
          const m = mc(r); r.vi(); const n = mc(r); say('<' + n + '> ' + m); return;
        }
        default:
      }
    }
    function onPacket(body) {
      const r = new R(body, 0), id = r.vi(), idLen = r.p; lastRx = Date.now();
      const key = state === 'login' ? 'lc' : state === 'config' ? 'cc' : 'pc', name = rev[key][id];
      if (state === 'play' && !joined) { joined = true; status('Joined the world'); }
      if (o.debug) o.debug(state + ' ' + id + ' ' + (name || '?'));
      if (!name) return;
      try { (state === 'login' ? onLogin : state === 'config' ? onConfig : onPlay)(name, r, body, idLen); }
      catch (e) { status('Packet ' + name + ' failed: ' + e.message); }
    }

    ws = new WebSocket(o.relay); ws.binaryType = 'arraybuffer';
    ws.onopen = () => { status('Connecting to ' + o.host + ':' + o.port + '...'); ws.send(JSON.stringify({ type: 'tcp_open', host: o.host, port: o.port })); };
    ws.onerror = () => end('Could not reach the relay.');
    ws.onclose = () => end('Lost the connection to the relay' + diag());
    ws.onmessage = e => {
      if (typeof e.data !== 'string') { onPacket(new Uint8Array(e.data)); return; }
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.type === 'tcp_open_ok') {
        const w = new W().vi(0).vi(P).str(o.host).u16(o.port).vi(2); ws.send(w.out()); loginStart();
      } else if (m.type === 'mc_encrypt_ready') {
        const w = new W(); w.bytes(unb64(m.secret)); if (P === 759 || P === 760) w.bool(true); w.bytes(unb64(m.token)); out('encryption_begin', w);
      } else if (m.type === 'tcp_error' || m.type === 'mc_error') end(m.message || 'Connection failed.');
      else if (m.type === 'tcp_closed') end('Server closed the connection without a reason' + diag());
    };

    function chat(text) {
      if (closed || state !== 'play') return false;
      const now = BigInt(Date.now()), salt = BigInt(Math.floor(Math.random() * 2 ** 52));
      const ack = w => { w.vi(pend); w.b(0).b(0).b(0); pend = 0; if (P >= 770) w.b(0); };
      if (P < 759) return out('chat', new W().str(text));
      if (text[0] === '/') {
        const cmd = text.slice(1);
        if (P >= 766) return out('chat_command', new W().str(cmd));
        const w = new W().str(cmd).i64(now).i64(salt).vi(0);
        if (P === 759) w.bool(false); else if (P === 760) w.bool(false).vi(0).bool(false); else ack(w);
        return out('chat_command', w);
      }
      const w = new W().str(text).i64(now).i64(salt);
      if (P === 759) w.vi(0).bool(false); else if (P === 760) w.vi(0).bool(false).vi(0).bool(false); else { w.bool(false); ack(w); }
      return out('chat_message', w);
    }
    const sendPos = (x, y, z, yaw, pitch, ground) => { if (closed || state !== 'play') return false; return out('position_look', new W().f64(x).f64(y).f64(z).f32(yaw).f32(pitch).bool(ground)); };
    const v47 = f => (...a) => (P === 47 && !closed && state === 'play') ? f(...a) : false;
    const api = {
      dig: v47((status, x, y, z, face) => out('block_dig', new W().b(status).raw(pos64(x, y, z)).b(face))),
      place: v47((x, y, z, face, item, cx, cy, cz) => { const w = new W().raw(pos64(x, y, z)).b(face); slotOut(w, item); return out('block_place', w.b(cx).b(cy).b(cz)); }),
      select: v47(n => out('held_item_slot', new W().b(n >> 8).b(n))),
      click: v47((slot, button, action, mode, item, wid) => { const w = new W().b(wid || 0).b(slot >> 8).b(slot).b(button).b(action >> 8).b(action).b(mode); slotOut(w, item); return out('window_click', w); }),
      swing: v47(() => out('arm_animation')),
      respawn: v47(() => out('client_command', new W().vi(0))),
      attack: v47(eid => out('use_entity', new W().vi(eid).vi(1))),
      closeWin: v47(wid => out('close_window', new W().b(wid))),
      creative: v47((slot, item) => { const w = new W().b(slot >> 8).b(slot); slotOut(w, item); return out('set_creative_slot', w); }),
      chatCmd: t => chat(t),
    };
    return { chat, sendPos, api, close: () => end('Disconnected.'), get state() { return state; }, get joined() { return joined; } };
  }
  g.StrataMC = { connect, comp, setIds: x => { IDS = x; }, W, R };
})(typeof window !== 'undefined' ? window : globalThis);
