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
  // the same text as HTML, with Minecraft's colours and styles, § codes, and clickable links (only https/http urls)
  const MCOL = { black: '#000000', dark_blue: '#0000aa', dark_green: '#00aa00', dark_aqua: '#00aaaa', dark_red: '#aa0000', dark_purple: '#aa00aa', gold: '#ffaa00', gray: '#aaaaaa', dark_gray: '#555555', blue: '#5555ff', green: '#55ff55', aqua: '#55ffff', red: '#ff5555', light_purple: '#ff55ff', yellow: '#ffff55', white: '#ffffff' };
  const SEC = '0123456789abcdef', SECN = Object.keys(MCOL);
  const escH = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function secHTML(t, st) {   // legacy § codes inside a text run
    let out = '', cur = Object.assign({}, st); const span = (txt, c) => { if (!txt) return ''; const css = []; if (c.color) css.push('color:' + (MCOL[c.color] || c.color)); if (c.bold) css.push('font-weight:700'); if (c.italic) css.push('font-style:italic'); const d = [c.underlined && 'underline', c.strikethrough && 'line-through'].filter(Boolean); if (d.length) css.push('text-decoration:' + d.join(' ')); if (c.obfuscated) css.push('filter:blur(1.5px)');
      let h = escH(txt).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">$1</a>'); if (c.link) h = `<a href="${escH(c.link)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">${h}</a>`; if (c.cmd) h = `<span class="mcCmd" data-a="${c.cmd[0]}" data-v="${escH(c.cmd[1])}" style="cursor:pointer">${h}</span>`; if (c.hover) h = `<span title="${escH(c.hover)}">${h}</span>`; return css.length ? `<span style="${css.join(';')}">${h}</span>` : h; };
    const parts = String(t).split('§'); out += span(parts[0], cur);
    for (let i = 1; i < parts.length; i++) { const k = (parts[i][0] || '').toLowerCase(), rest = parts[i].slice(1), ci = SEC.indexOf(k);
      if (ci >= 0) cur = { color: SECN[ci], link: cur.link, cmd: cur.cmd, hover: cur.hover }; else if (k === 'r') cur = Object.assign({}, st); else if (k === 'l') cur.bold = 1; else if (k === 'o') cur.italic = 1; else if (k === 'n') cur.underlined = 1; else if (k === 'm') cur.strikethrough = 1; else if (k === 'k') cur.obfuscated = 1; out += span(rest, cur); }
    return out; }
  function compHTML(x, st) {
    st = st || {}; if (x == null) return ''; if (typeof x === 'string') { const t = x.trim(); if (t[0] === '{' || t[0] === '[' || t[0] === '"') { try { return compHTML(JSON.parse(t), st); } catch (e) { /* plain */ } } return secHTML(x, st); }
    if (typeof x === 'number' || typeof x === 'boolean') return escH(String(x)); if (Array.isArray(x)) { if (!x.length) return ''; const [h, ...rest] = x; return compHTML(h, st) + rest.map(e => compHTML(e, st)).join(''); }
    const s2 = Object.assign({}, st); for (const k of ['color', 'bold', 'italic', 'underlined', 'strikethrough', 'obfuscated']) if (x[k] != null) s2[k] = x[k] === 'false' ? false : x[k];
    if (x.clickEvent && /^(run|suggest)_command$/.test(x.clickEvent.action)) s2.cmd = [x.clickEvent.action[0], String(x.clickEvent.value || '')];
    if (x.hoverEvent && x.hoverEvent.action === 'show_text') s2.hover = comp(x.hoverEvent.value);
    if (x.clickEvent && x.clickEvent.action === 'open_url' && /^https?:\/\//i.test(x.clickEvent.value || '')) s2.link = x.clickEvent.value;
    let h = ''; if (x.text != null) h += secHTML(String(x.text), s2); else if (x.translate != null) { const w = (x.with || []).map(e => compHTML(e, s2)); let i = 0; const f = TR[x.translate];
      h += f ? secHTML(f, s2).replace(/%(\d+\$)?s/g, (m, n) => n ? (w[parseInt(n) - 1] || '') : (w[i++] || '')) : escH(x.translate) + (w.length ? ' ' + w.join(' ') : ''); } else if (x.selector != null) h += escH(x.selector);
    if (x.extra) h += x.extra.map(e => compHTML(e, s2)).join(''); return h; }
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
  // 1.9-1.12 chunk sections: bits per block, palette, packed longs (values may span two longs), block light, sky light; global ids are still id<<4|meta
  function sections19(r, mask, sky, groundUp) {
    const out = [];
    for (let i = 0; i < 16; i++) { if (!(mask & (1 << i))) continue; const bits = r.b(), pl = r.vi(), pal = []; for (let k = 0; k < pl; k++) pal.push(r.vi()); const nl = r.vi(), L = new Uint32Array(nl * 2);
      for (let k = 0; k < nl; k++) { L[k * 2] = r.d.getUint32(r.p); L[k * 2 + 1] = r.d.getUint32(r.p + 4); r.p += 8; }   // [hi, lo]
      const a = new Uint16Array(4096), mk = (1 << bits) - 1, ind = pl > 0 && bits <= 8;
      for (let j = 0; j < 4096; j++) { const bi = j * bits, li = bi >>> 6, of = bi & 63; let v;
        const lo = L[li * 2 + 1], hi = L[li * 2]; if (of < 32) { v = (lo >>> of) | (of ? (hi << (32 - of)) : 0); if (of + bits > 32 && of + bits <= 64) v = (lo >>> of) | (hi << (32 - of)); } else v = hi >>> (of - 32);
        if (of + bits > 64) { const lo2 = L[(li + 1) * 2 + 1]; v = (v >>> 0) | (lo2 << (64 - of)); }
        v &= mk; a[j] = ind ? (pal[v] || 0) : v; }
      r.skip(2048); if (sky) r.skip(2048); out.push({ y: i, blocks: a }); }
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
    const LEG = P <= 340, V9 = P >= 107, O = P >= 210 ? 1 : 0, SND = (g.StrataMC && g.StrataMC.sounds) ? (s => s && s.lists[s.map[P]])(g.StrataMC.sounds) : null;   // world support: 1.8 (47) .. 1.12.2 (340); V9 = the 1.9+ formats
    if (!ids) throw new Error('No packet table for protocol ' + P);
    const rev = {}; for (const k of ['lc', 'cc', 'pc']) { rev[k] = {}; for (const n in (ids[k] || {})) rev[k][ids[k][n]] = n; }
    let state = 'login', ws, pend = 0, closed = false, joined = false, sky = true, posT = null;
    const H = o.world || null;
    const say = (t, html) => { try { o.onChat && o.onChat(t, html); } catch (e) { /* ui */ } };
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
    function resourcePack(r, hash, url) {   // accept; on 1.8-1.12 download the pack through the relay and hand it to the engine, then report loaded (0) or failed (2)
      const send = res => { const w = new W(); if (P >= 765) w.uuid(r.id); else if (P < 210) w.str(hash || ''); w.vi(res); out('resource_pack_receive', w); };
      send(3);
      if (!(LEG && url && H && H.serverPack && /^https?:\/\//i.test(url))) { send(0); return; }
      httpGet(url).then(buf => Promise.resolve(H.serverPack(buf, url)).then(() => send(0)), e => { status('Server resource pack failed: ' + (e && e.message || e)); send(2); });
    }
    const HTTP = {}; let httpN = 0;
    function httpGet(url) { return new Promise((res, rej) => { const id = ++httpN; HTTP[id] = { res, rej }; ws.send(JSON.stringify({ type: 'http_get', id, url })); setTimeout(() => { if (HTTP[id]) { delete HTTP[id]; rej(new Error('timed out')); } }, 120000); }); }
    // ---- Forge (FML protocol 2, 1.12.2): the handshake runs over plugin messages before the server sends Join Game ----
    const F = { mods: o.forgeMods || [], reg: {}, parts: null };
    const pay = (ch, w) => out('custom_payload', new W().str(ch).raw(w.out ? w.out() : w));
    const hs = w => pay('FML|HS', w), ack = ph => hs(new W().b(255).b(ph));
    function fml(ch, r) {
      if (ch === 'REGISTER') { const chans = td.decode(r.u.subarray(r.p)).split('\0').filter(Boolean); F.chans = chans; pay('REGISTER', new W().raw(te.encode(chans.join('\0')))); return true; }
      if (ch === 'FML|MP') { if (!F.parts) { F.parts = { ch: r.str(), n: r.b(), len: r.i32(), got: [] }; } else { r.b(); F.parts.got.push(r.u.slice(r.p)); if (F.parts.got.length >= F.parts.n - 1) { const all = new Uint8Array(F.parts.len); let o2 = 0; for (const g2 of F.parts.got) { all.set(g2.subarray(0, Math.min(g2.length, all.length - o2)), o2); o2 += g2.length; } const c2 = F.parts.ch; F.parts = null; fml(c2, new R(all, 0)); } } return true; }
      if (ch === 'FML|HS') { const d = r.i8();
        if (d === 0) { r.b(); status('Forge server: sending mod list (' + F.mods.length + ' mods)'); hs(new W().b(1).b(2)); const w = new W().b(2).vi(F.mods.length); for (const m of F.mods) w.str(m.modid).str(m.version); hs(w); }
        else if (d === 2) { const n = r.vi(); F.serverMods = []; for (let i = 0; i < n; i++) F.serverMods.push({ modid: r.str(), version: r.str() }); ack(2); }
        else if (d === 3) { const more = r.bool(), nm = r.str(), n = r.vi(), ids = {}; for (let i = 0; i < n; i++) { const k = r.str(); ids[r.vi()] = k; } const nd = r.vi(); for (let i = 0; i < nd; i++) r.str(); const no = r.vi(); for (let i = 0; i < no; i++) { r.str(); r.str(); }
          F.reg[nm] = ids; if (!more) { if (H && H.forgeRegistries) try { H.forgeRegistries(F.reg, F.serverMods || F.mods); } catch (e) { /* engine */ } ack(3); } }
        else if (d === -1) { const ph = r.b(); if (ph === 2) ack(4); else if (ph === 3) { ack(5); status('Forge handshake complete'); } }
        return true; }
      if (ch === 'FML') { const d = r.b();
        if (d === 2 && H && H.modSpawn) { const eid = r.i32(), mod = r.str(), tid = r.i32(); r.skip(16); const x = r.f64(), y = r.f64(), z = r.f64(), yaw = ang(r.i8()), pitch = ang(r.i8()); H.modSpawn({ eid, mod, tid, x, y, z, yaw, pitch }); }
        else if (d === 1 && H && H.modGui) { const wid = r.i32(), mod = r.str(), gid = r.i32(); H.modGui(wid, mod, gid, r.i32(), r.i32(), r.i32()); }
        return true; }
      if (ch === 'FORGE') return true;
      if (H && H.modPayload) { try { if (H.modPayload(ch, r.u.slice(r.p))) return true; } catch (e) { status('Mod packet ' + ch + ' failed: ' + e.message); return true; } }
      return F.chans && F.chans.includes(ch);   // a mod channel nothing here understands yet: swallow it
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
        if (t === 0) { const v = r.i8(); if (idx === 0 && H.flags) H.flags(eid, v); else if (H.bmeta) H.bmeta(eid, idx, v, 0); } else if (t === 1) { const v = r.i16(); if (H.bmeta) H.bmeta(eid, idx, v, 1); } else if (t === 2) { const v = r.i32(); if (H.bmeta) H.bmeta(eid, idx, v, 2); } else if (t === 3) r.f32(); else if (t === 4) { const sv = r.str(); if (H.smeta) H.smeta(eid, idx, sv); } else if (t === 5) { const it = slot18(r); H.meta(eid, idx, it); } else if (t === 6) { r.i32(); r.i32(); r.i32(); } else if (t === 7) { r.f32(); r.f32(); r.f32(); } else break; } };
      // 1.9-1.12 metadata: index byte (255 ends), type byte, value; H.vmeta gets (eid, index, kind, value) and the engine maps indices per version
      const meta19 = eid => { for (let n = 0; n < 60; n++) { const idx = r.b(); if (idx === 255) break; const t = r.b(); let v = null, k = 'skip';
        if (t === 0) { v = r.i8(); k = 'byte'; } else if (t === 1) { v = r.vi(); k = 'int'; } else if (t === 2) { v = r.f32(); k = 'float'; } else if (t === 3) { v = r.str(); k = 'str'; } else if (t === 4) { v = r.str(); k = 'chat'; } else if (t === 5) { v = slot18(r); k = 'slot'; } else if (t === 6) { v = r.bool() ? 1 : 0; k = 'bool'; }
        else if (t === 7) { r.f32(); r.f32(); r.f32(); } else if (t === 8) r.skip(8); else if (t === 9) { if (r.bool()) r.skip(8); } else if (t === 10) { v = r.vi(); k = 'int'; } else if (t === 11) { if (r.bool()) r.skip(16); } else if (t === 12) { v = r.vi(); k = 'block'; } else if (t === 13) { const tt = r.b(); if (tt) { r.skip(r.u16()); r.tag(tt); } } else break;
        if (idx === 0 && k === 'byte' && H.flags) H.flags(eid, v); else if (k !== 'skip' && H.vmeta) H.vmeta(eid, idx, k, v); } };
      const metaAny = eid => V9 ? meta19(eid) : meta18(eid);
      const nbtRaw = () => { const p0 = r.p, t = r.b(); if (t) { r.skip(r.u16()); r.tag(t); } return r.u.slice(p0, r.p); };
      switch (name) {
        case 'kick_disconnect': return end(P >= 765 ? comp(r.nbt()) : comp(r.str()));
        case 'keep_alive': out('keep_alive', body.subarray(idLen)); lastKA = Date.now(); return;
        case 'transaction': if (LEG) { const wid = r.i8(), act = r.i16(), ok = r.bool(); if (!ok) out('transaction', new W().b(wid & 255).b((act >> 8) & 255).b(act & 255).bool(true)); if (H && H.trans) H.trans(wid, act, ok); } return;   // a refused click must be acknowledged, or the server ignores that window from then on
        case 'ping': out('pong', new W().i32(r.i32())); return;
        case 'login': if (!joined) { joined = true; status('Joined the world'); }
          if (LEG && H) { const eid = r.i32(), gm = r.b(), dim = P >= 108 ? r.i32() : r.i8(); sky = dim === 0; H.login && H.login({ eid, dimension: dim, gamemode: gm });
            if (V9) out('settings', new W().str('en_US').b(o.viewDistance || 6).vi(0).bool(true).b(127).vi(1)); else out('settings', new W().str('en_US').b(o.viewDistance || 6).b(0).bool(true).b(127)); out('custom_payload', new W().str('MC|Brand').str(o.forge ? 'fml,forge' : 'vanilla')); }   // like the vanilla client; some anti-bot plugins drop clients that never send a brand
          return;
        case 'respawn': if (LEG && H) { const dim = r.i32(); sky = dim === 0; H.respawn && H.respawn(dim); } return;
        case 'update_time': if (LEG && H && H.time) { const age = r.i64(), tod = r.i64(); H.time(age, tod); } return;
        case 'update_health': if (LEG && H && H.health) { const hp = r.f32(), food = r.vi(); H.health(hp, food); } return;
        case 'held_item_slot': if (LEG && H && H.held) H.held(r.i8()); return;
        case 'set_slot': if (LEG && H && H.slot) { const wid = r.i8(), sl = r.i16(); H.slot(wid, sl, slot18(r)); } return;
        case 'spawn_entity_painting': if (LEG && H && H.painting) { const eid = r.vi(); if (V9) r.skip(16); const title = r.str(), hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; H.painting(eid, title, px, py, pz, r.b()); } return;
        case 'experience': if (LEG && H && H.xp) { const bar = r.f32(), lv = r.vi(); H.xp(bar, lv, r.vi()); } return;
        case 'entity_effect': if (LEG && H && H.effect) { const eid = r.vi(), id = r.i8(), amp = r.i8(), dur = r.vi(); H.effect(eid, id, amp, dur); } return;
        case 'remove_entity_effect': if (LEG && H && H.effect) { const eid = r.vi(); H.effect(eid, r.i8(), 0, 0); } return;
        case 'attach_entity': if (P === 47 && H && H.attach) { const a = r.i32(), v = r.i32(); H.attach(a, v, r.bool()); } return;
        case 'spawn_entity_experience_orb': if (LEG && H && H.orb) { const eid = r.vi(), q = V9 ? () => r.f64() : () => r.i32() / 32, x = q(), y = q(), z = q(); H.orb(eid, x, y, z, r.i16()); } return;
        case 'spawn_entity_weather': if (LEG && H && H.bolt) { const eid = r.vi(), t = r.i8(), q = V9 ? () => r.f64() : () => r.i32() / 32; H.bolt(eid, t, q(), q(), q()); } return;
        case 'world_particles': if (LEG && H && H.particles) { const id = r.i32(); r.bool(); const x = r.f32(), y = r.f32(), z = r.f32(), ox = r.f32(), oy = r.f32(), oz = r.f32(), sp = r.f32(), n = r.i32(), dt = []; const k = id === 36 ? 2 : id === 37 || id === 38 || id === 46 ? 1 : 0; for (let i = 0; i < k; i++) dt.push(r.vi()); H.particles(id, x, y, z, ox, oy, oz, sp, n, dt); } return;
        case 'world_event': if (LEG && H && H.event) { const id = r.i32(); const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; H.event(id, px, py, pz, r.i32(), r.bool()); } return;
        case 'open_sign_entity': if (LEG && H && H.signEdit) { const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; H.signEdit(px, py, pz); } return;
        case 'block_break_animation': if (LEG && H && H.crack) { const eid = r.vi(); const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; H.crack(eid, px, py, pz, r.i8()); } return;
        case 'scoreboard_objective': if (LEG && H && H.objective) { const nm = r.str(), a = r.i8(); let txt = null; if (a === 0 || a === 2) { txt = r.str(); r.str(); } H.objective(nm, a, txt); } return;
        case 'scoreboard_score': if (LEG && H && H.score) { const it = r.str(), a = r.i8(), obj = r.str(); H.score(it, a, obj, a === 1 ? 0 : r.vi()); } return;
        case 'scoreboard_display_objective': if (LEG && H && H.showObjective) { const pos2 = r.i8(); H.showObjective(pos2, r.str()); } return;
        case 'title': if (LEG && H && H.title) { let a = r.vi(); if (P >= 315) { if (a === 2) { const t = r.str(); if (o.onActionBar) try { o.onActionBar(comp(t), compHTML(t)); } catch (e) { /* ui */ } return; } if (a > 2) a--; }
          if (a === 0 || a === 1) H.title(a, r.str()); else if (a === 2) H.title(2, [r.i32(), r.i32(), r.i32()]); else H.title(a); } return;
        case 'playerlist_header': if (LEG && H && H.tabHeader) { const h = r.str(); H.tabHeader(h, r.str()); } return;
        case 'open_window': if (LEG && H && H.openWin) { const wid = r.b(), type = r.str(), title = comp(r.str()), n = r.b(); H.openWin(wid, type, title, n); } return;
        case 'close_window': if (LEG && H && H.closeWin) H.closeWin(r.b()); return;
        case 'craft_progress_bar': if (LEG && H && H.winProp) { const wid = r.b(), k = r.i16(); H.winProp(wid, k, r.i16()); } return;
        case 'window_items': if (LEG && H && H.items) { const wid = r.b(), n = r.i16(), l = []; for (let i = 0; i < n; i++) l.push(slot18(r)); H.items(wid, l); } return;
        case 'game_state_change': if (LEG && H && H.gameState) { const rs = r.b(), v = r.f32(); H.gameState(rs, v); } return;
        case 'position': if (LEG && H) {
          const x = r.f64(), y = r.f64(), z = r.f64(), yaw = r.f32(), pitch = r.f32(), fl = r.b();
          if (V9) out('teleport_confirm', new W().vi(r.vi()));   // 1.9+: every server teleport must be confirmed, or it keeps pulling us back
          H.position && H.position({ x, y, z, yaw, pitch, flags: fl });
          // the server's value is final: confirm with our own position
          const w = new W().f64(H.cur ? H.cur.x : x).f64(H.cur ? H.cur.y : y).f64(H.cur ? H.cur.z : z).f32(yaw).f32(pitch).bool(true); out('position_look', w);
        } return;
        case 'map_chunk': if (LEG && H && H.chunk) {
          if (V9) { const x = r.i32(), z = r.i32(), gu = r.bool(), mask = r.vi(); r.vi(); const sec = sections19(r, mask, sky, gu); H.chunk(x, z, sec, gu);
            if (P >= 110 && H.tile) { const n = r.vi(); for (let i = 0; i < n; i++) H.tile(null, null, null, 0, nbtRaw()); } return; }   // 1.9.4+: the chunk's block entities (signs...)
          const x = r.i32(), z = r.i32(), gu = r.bool(), mask = r.u16(); r.vi();
          if (gu && mask === 0) { H.unload && H.unload(x, z); return; }
          H.chunk(x, z, sections18(r, mask, sky, gu), gu);
        } return;
        case 'map_chunk_bulk': if (LEG && H && H.chunk) {
          const sk = r.bool(), n = r.vi(), ms = []; for (let i = 0; i < n; i++) ms.push([r.i32(), r.i32(), r.u16()]);
          for (const [x, z, mask] of ms) H.chunk(x, z, sections18(r, mask, sk, true), true);
        } return;
        case 'unload_chunk': if (LEG && H && H.unload) { const x = r.i32(); H.unload(x, r.i32()); } return;
        case 'tile_entity_data': if (LEG && H && H.tile) { const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6; const a = r.b(); H.tile(px, py, pz, a, nbtRaw()); } return;
        case 'set_passengers': if (LEG && H && H.passengers) { const v = r.vi(), n = r.vi(), l = []; for (let i = 0; i < n; i++) l.push(r.vi()); H.passengers(v, l); } return;
        case 'boss_bar': if (LEG && H && H.boss) { const u = Array.from(r.u.subarray(r.p, r.p + 16), x => x.toString(16).padStart(2, '0')).join(''); r.p += 16; const a = r.vi(), d = {};
          if (a === 0) { d.title = r.str(); d.hp = r.f32(); d.color = r.vi(); d.div = r.vi(); d.flags = r.b(); } else if (a === 2) d.hp = r.f32(); else if (a === 3) d.title = r.str(); else if (a === 4) { d.color = r.vi(); d.div = r.vi(); } else if (a === 5) d.flags = r.b(); H.boss(u, a, d); } return;
        case 'sound_effect': if (LEG && H && H.sound && SND) { const id = r.vi(); r.vi(); const x = r.i32() / 8, y = r.i32() / 8, z = r.i32() / 8, v = r.f32(), pi = P >= 210 ? r.f32() : r.b() / 63; H.sound(SND[id] || '', x, y, z, v, pi); } return;
        case 'entity_velocity': if (LEG && H && H.velocity) { const eid = r.vi(); H.velocity(eid, r.i16() / 8000, r.i16() / 8000, r.i16() / 8000); } return;
        case 'entity_status': if (LEG && H && H.status) { const eid = r.d.getInt32(r.p); r.p += 4; H.status(eid, r.i8()); } return;
        case 'update_sign': if (LEG && H && H.sign) {
          const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6, ln = [];
          for (let i = 0; i < 4; i++) { let t = r.str(); try { const j = JSON.parse(t); t = typeof j === 'string' ? j : (j.text || '') + (j.extra ? j.extra.map(e => e.text || '').join('') : ''); } catch (e) { /* plain */ } ln.push(t); }
          H.sign(px, py, pz, ln);
        } return;
        case 'spawn_entity': if (LEG && H && H.dropSpawn) {
          let eid, type, x, y, z, pitch, yaw, data, vx = 0, vy = 0, vz = 0;
          if (V9) { eid = r.vi(); r.skip(16); type = r.b(); x = r.f64(); y = r.f64(); z = r.f64(); pitch = ang(r.i8()); yaw = ang(r.i8()); data = r.i32(); vx = r.i16() / 8000; vy = r.i16() / 8000; vz = r.i16() / 8000; }
          else { eid = r.vi(); type = r.b(); x = r.i32() / 32; y = r.i32() / 32; z = r.i32() / 32; pitch = ang(r.i8()); yaw = ang(r.i8()); data = r.i32(); if (data) { vx = r.i16() / 8000; vy = r.i16() / 8000; vz = r.i16() / 8000; } }
          if (type === 2) H.dropSpawn(eid, x, y, z, vx, vy, vz); else if (H.objSpawn) H.objSpawn(eid, type, x, y, z, data, vx, vy, vz, yaw, pitch);   // projectiles (arrows, fireballs) for compat mode
        } return;
        case 'entity_metadata': if (LEG && H && H.meta) {
          metaAny(r.vi());
        } return;
        case 'collect': if (LEG && H && H.collect) { const a = r.vi(); H.collect(a, r.vi()); } return;
        case 'named_sound_effect': if (LEG && H && H.sound) { const nm = r.str(); if (V9) r.vi(); const x = r.i32() / 8, y = r.i32() / 8, z = r.i32() / 8, v = r.f32(); H.sound(nm, x, y, z, v, P >= 210 ? r.f32() : r.b() / 63); } return;
        case 'explosion': if (LEG && H && H.explosion) {
          const x = r.f32(), y = r.f32(), z = r.f32(), rad = r.f32(), n = r.d.getInt32(r.p); r.p += 4; const rec = []; for (let i = 0; i < n; i++) rec.push([r.i8(), r.i8(), r.i8()]);
          H.explosion(x, y, z, rad, rec, r.f32(), r.f32(), r.f32());
        } return;
        case 'entity_equipment': if (LEG && H && H.equip) { const eid = r.vi(), sl = V9 ? [0, 5, 1, 2, 3, 4][r.vi()] : r.i16(); H.equip(eid, sl, slot18(r)); } return;   // 1.9+ slots (main, off, feet, legs, chest, head) -> 1.8 order, off hand = 5
        case 'animation': if (LEG && H && H.anim) { const eid = r.vi(); H.anim(eid, r.b()); } return;
        case 'block_change': if (LEG && H && H.block) {
          const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8;
          const px = hi >> 6, py = ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, pz = (lo << 6) >> 6;
          H.block(px, py, pz, r.vi());
        } return;
        case 'multi_block_change': if (LEG && H && H.multi) {
          const cx = r.i32(), cz = r.i32(), n = r.vi(), l = [];
          for (let i = 0; i < n; i++) { const hz = r.b(), y = r.b(), st = r.vi(); l.push({ x: cx * 16 + (hz >> 4), y, z: cz * 16 + (hz & 15), state: st }); }
          H.multi(l);
        } return;
        case 'named_entity_spawn': if (LEG && H && H.spawn) {
          const eid = r.vi(), uuid = r.uuid(); let x, y, z; if (V9) { x = r.f64(); y = r.f64(); z = r.f64(); } else { x = r.i32() / 32; y = r.i32() / 32; z = r.i32() / 32; } const yaw = ang(r.i8()), pitch = ang(r.i8());
          H.spawn({ eid, kind: 'player', uuid, x, y, z, yaw, pitch }); if (V9 && H.vmeta) meta19(eid);
        } return;
        case 'spawn_entity_living': if (LEG && H && H.spawn) {
          if (V9) { const eid = r.vi(); r.skip(16); const type = P >= 315 ? r.vi() : r.b(), x = r.f64(), y = r.f64(), z = r.f64(), yaw = ang(r.i8()), pitch = ang(r.i8()); H.spawn({ eid, kind: 'mob', type, x, y, z, yaw, pitch }); r.i8(); r.i16(); r.i16(); r.i16(); if (H.vmeta) meta19(eid); return; }
          const eid = r.vi(), type = r.b(), x = r.i32() / 32, y = r.i32() / 32, z = r.i32() / 32, yaw = ang(r.i8()), pitch = ang(r.i8());
          H.spawn({ eid, kind: 'mob', type, x, y, z, yaw, pitch }); r.i8(); r.i16(); r.i16(); r.i16(); if (H.meta) meta18(eid);   // head pitch, velocity, then the spawn metadata (size, skeleton type, baby)
        } return;
        case 'rel_entity_move': if (LEG && H && H.move) { const eid = r.vi(); if (V9) H.move(eid, r.i16() / 4096, r.i16() / 4096, r.i16() / 4096); else H.move(eid, r.i8() / 32, r.i8() / 32, r.i8() / 32); } return;
        case 'entity_look': if (LEG && H && H.look) { const eid = r.vi(); H.look(eid, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_move_look': if (LEG && H && H.move) { const eid = r.vi(), q = V9 ? () => r.i16() / 4096 : () => r.i8() / 32, dx = q(), dy = q(), dz = q(); H.move(eid, dx, dy, dz); H.look && H.look(eid, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_teleport': if (LEG && H && H.teleport) { const eid = r.vi(); if (V9) H.teleport(eid, r.f64(), r.f64(), r.f64(), ang(r.i8()), ang(r.i8())); else H.teleport(eid, r.i32() / 32, r.i32() / 32, r.i32() / 32, ang(r.i8()), ang(r.i8())); } return;
        case 'entity_head_rotation': if (LEG && H && H.head) { const eid = r.vi(); H.head(eid, ang(r.i8())); } return;
        case 'entity_destroy': if (LEG && H && H.destroy) { const n = r.vi(), l = []; for (let i = 0; i < n; i++) l.push(r.vi()); H.destroy(l); } return;
        case 'player_info': if (LEG && H && H.playerInfo) {
          const act = r.vi(), n = r.vi();
          for (let i = 0; i < n; i++) { const u = r.uuid(); if (act === 0) { const nm = r.str(), pc = r.vi(); let sk = null; for (let k = 0; k < pc; k++) { const pn = r.str(), pv = r.str(); if (r.bool()) r.str(); if (pn === 'textures') { try { const j = JSON.parse(atob(pv)), t = j.textures && j.textures.SKIN; if (t) sk = { url: String(t.url || '').replace(/^http:/, 'https:'), slim: !!(t.metadata && t.metadata.model === 'slim') }; } catch (e) { /* bad property */ } } } const gm = r.vi(), ping = r.vi(); const dn = r.bool() ? r.str() : null; H.playerInfo(u, nm, sk, ping, gm); if (dn && H.dispName) H.dispName(u, comp(dn), compHTML(dn)); } else if (act === 4) H.playerInfo(u, null); else if (act === 2) { const ping = r.vi(); H.ping && H.ping(u, ping); } else if (act === 1) r.vi(); else if (act === 3) { const dn = r.bool() ? r.str() : null; H.dispName && H.dispName(u, dn && comp(dn), dn && compHTML(dn)); } }
        } return;
        case 'scoreboard_team': case 'teams': if (LEG && H && H.team) { const t = r.str(), m = r.i8(); let info = null, pl = null;
            if (m === 0 || m === 2) { info = { name: r.str(), prefix: r.str(), suffix: r.str() }; r.i8(); info.vis = r.str(); if (V9) info.coll = r.str(); info.color = r.i8(); }
            if (m === 0 || m === 3 || m === 4) { const n = r.vi(); pl = []; for (let i = 0; i < n; i++) pl.push(r.str()); }
            H.team(t, m, info, pl); } return;
        case 'map': if (LEG && H && H.map) { const id = r.vi(), sc = r.i8(); if (V9) r.bool(); const n = r.vi(), icons = []; for (let i = 0; i < n; i++) { const dt = r.b(); icons.push({ dir: dt >> 4, type: dt & 15, x: r.i8(), z: r.i8() }); }
            const cols = r.b(); let pat = null; if (cols > 0) { const rows = r.b(), x = r.b(), y = r.b(); pat = { cols, rows, x, y, data: r.bytes().slice() }; } H.map(id, sc, icons, pat); } return;
        case 'abilities': if (LEG && H && H.abilities) { const f = r.i8(), fs = r.f32(); H.abilities(f, fs, r.f32()); } return;
        case 'combat_event': if (LEG && H && H.combat) { const ev = r.vi(); if (ev === 2) { const pid = r.vi(); r.i32(); const m = r.str(); H.combat(pid, comp(m), compHTML(m)); } } return;
        case 'world_border': if (LEG && H && H.border) { const a = r.vi(), vl = () => { let v = 0, s = 1, x; do { x = r.b(); v += (x & 127) * s; s *= 128; } while (x & 128); return v; }, b = { a };
            if (a === 0) b.r = r.f64() / 2; else if (a === 1) { b.from = r.f64() / 2; b.r = r.f64() / 2; b.ms = vl(); } else if (a === 2) { b.x = r.f64(); b.z = r.f64(); }
            else if (a === 3) { b.x = r.f64(); b.z = r.f64(); b.from = r.f64() / 2; b.r = r.f64() / 2; b.ms = vl(); r.vi(); b.warnT = r.vi(); b.warnB = r.vi(); } else if (a === 4) b.warnT = r.vi(); else if (a === 5) b.warnB = r.vi();
            H.border(b); } return;
        case 'tab_complete': if (LEG && H && H.tabDone) { const n = r.vi(), l = []; for (let i = 0; i < n; i++) l.push(r.str()); H.tabDone(l); } return;
        case 'set_cooldown': if (LEG && H && H.cooldown) { const it = r.vi(); H.cooldown(it, r.vi()); } return;
        case 'bed': if (LEG && H && H.bed) { const eid = r.vi(); const hi = r.d.getInt32(r.p), lo = r.d.getUint32(r.p + 4); r.p += 8; H.bed(eid, hi >> 6, ((lo >>> 26) | ((hi & 63) << 6)) & 0xfff, (lo << 6) >> 6); } return;
        case 'camera': if (LEG && H && H.camera) H.camera(r.vi()); return;
        case 'custom_payload': if (LEG && H) { const ch = r.str(); if (o.forge && fml(ch, r)) return;
            if (ch === 'MC|TrList' && H.trades) { const wid = r.i32(), n = r.b(), l = []; for (let i = 0; i < n; i++) { const a = slot18(r), out1 = slot18(r), b2 = r.bool() ? slot18(r) : null, off = r.bool(), uses = r.i32(), max = r.i32(); l.push({ a, out: out1, b: b2, off, uses, max }); } H.trades(wid, l); }
            else if (ch === 'MC|BOpen' && H.bookOpen) H.bookOpen(V9 && r.p < r.u.length ? r.vi() : 0);
            else if (ch === 'MC|Brand' && H.brand) H.brand(r.str());
            else if (H.plugin) H.plugin(ch, r.u.slice(r.p)); } return;
        case 'advancements': if (LEG && H && H.advancements) { const reset = r.bool(), n = r.vi(), add = [];
            for (let i = 0; i < n; i++) { const id = r.str(), a = { id, parent: r.bool() ? r.str() : null, crit: [] };
              if (r.bool()) { const t = r.str(), d = r.str(); a.title = comp(t); a.desc = comp(d); a.icon = slot18(r); a.frame = r.vi(); const f = r.i32(); a.bg = (f & 1) ? r.str() : null; a.toast = !!(f & 2); a.hidden = !!(f & 4); a.x = r.f32(); a.y = r.f32(); }
              const nc = r.vi(); for (let k = 0; k < nc; k++) a.crit.push(r.str()); const nr = r.vi(); a.req = []; for (let k = 0; k < nr; k++) { const m = r.vi(), g2 = []; for (let j = 0; j < m; j++) g2.push(r.str()); a.req.push(g2); } add.push(a); }
            const nd = r.vi(), rem = []; for (let i = 0; i < nd; i++) rem.push(r.str());
            const np = r.vi(), prog = []; for (let i = 0; i < np; i++) { const id = r.str(), m = r.vi(), c = {}; for (let k = 0; k < m; k++) { const cn = r.str(); c[cn] = r.bool() ? r.i64() : 0; } prog.push({ id, c }); }
            H.advancements(reset, add, rem, prog); } return;
        case 'unlock_recipes': return;
        case 'start_configuration': out('configuration_acknowledged'); state = 'config'; return;
        case 'resource_pack_send': { const u = r.str(), h = r.str(); resourcePack({}, h, u); return; }
        case 'add_resource_pack': resourcePack({ id: r.uuid() }); return;
        case 'cookie_request': out('cookie_response', new W().str(r.str()).bool(false)); return;
        case 'chat': {
          if (P < 759) { const raw = r.str(), t = comp(raw), pos = r.b(); if (pos === 2) { if (o.onActionBar) try { o.onActionBar(t, compHTML(raw)); } catch (e) { /* ui */ } } else if (t) say(t, compHTML(raw)); }
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
        const w = new W().vi(0).vi(P).str(o.host + (o.forge && LEG ? '\0FML\0' : '')).u16(o.port).vi(2); ws.send(w.out()); loginStart();   // Forge servers look for the FML marker
      } else if (m.type === 'mc_encrypt_ready') {
        const w = new W(); w.bytes(unb64(m.secret)); if (P === 759 || P === 760) w.bool(true); w.bytes(unb64(m.token)); out('encryption_begin', w);
      } else if (m.type === 'tcp_error' || m.type === 'mc_error') end(m.message || 'Connection failed.');
      else if (m.type === 'http_data' || m.type === 'http_error') { const h = HTTP[m.id]; if (h) { delete HTTP[m.id]; if (m.type === 'http_data') h.res(unb64(m.data)); else h.rej(new Error(m.message || 'download failed')); } }
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
    const v47 = f => (...a) => (LEG && !closed && state === 'play') ? f(...a) : false;
    const api = {
      dig: v47((status, x, y, z, face) => out('block_dig', new W().b(status).raw(pos64(x, y, z)).b(face))),
      place: v47((x, y, z, face, item, cx, cy, cz) => {
        if (V9) { if (face === 255) return out('use_item', new W().vi(0)); const w = new W().raw(pos64(x, y, z)).vi(face).vi(0); return out('block_place', P >= 315 ? w.f32(cx / 16).f32(cy / 16).f32(cz / 16) : w.b(cx).b(cy).b(cz)); }   // 1.9+: hand, and floats from 1.11
        const w = new W().raw(pos64(x, y, z)).b(face); slotOut(w, item); return out('block_place', w.b(cx).b(cy).b(cz)); }),
      useItem: v47(hand => V9 ? out('use_item', new W().vi(hand || 0)) : false),
      swapHands: v47(() => V9 ? out('block_dig', new W().b(6).raw(pos64(0, 0, 0)).b(0)) : false),
      vehicleMove: v47((x, y, z, yaw, pitch) => V9 ? out('vehicle_move', new W().f64(x).f64(y).f64(z).f32(yaw).f32(pitch)) : false),
      steerBoat: v47((l, rr) => V9 ? out('steer_boat', new W().bool(l).bool(rr)) : false),
      sneak: v47((eid, on) => out('entity_action', new W().vi(eid).vi(on ? 0 : 1).vi(0))),
      select: v47(n => out('held_item_slot', new W().b(n >> 8).b(n))),
      click: v47((slot, button, action, mode, item, wid) => { const w = new W().b(wid || 0).b(slot >> 8).b(slot).b(button).b(action >> 8).b(action).b(mode); slotOut(w, item); return out('window_click', w); }),
      swing: v47(() => V9 ? out('arm_animation', new W().vi(0)) : out('arm_animation')),
      respawn: v47(() => out('client_command', new W().vi(0))),
      attack: v47(eid => out('use_entity', new W().vi(eid).vi(1))),
      closeWin: v47(wid => out('close_window', new W().b(wid))),
      creative: v47((slot, item) => { const w = new W().b(slot >> 8).b(slot); slotOut(w, item); return out('set_creative_slot', w); }),
      chatCmd: t => chat(t),
      sign: v47((x, y, z, lines) => { const w = new W().raw(pos64(x, y, z)); for (const l of lines) w.str(V9 ? l : JSON.stringify({ text: l })); return out('update_sign', w); }),   // 1.9+ sends plain text
      interact: v47(eid => out('use_entity', V9 ? new W().vi(eid).vi(0).vi(0) : new W().vi(eid).vi(0))),
      look: v47((yaw, pitch, ground) => out('look', new W().f32(yaw).f32(pitch).bool(ground))),
      steer: v47((side, fwd, flags) => out('steer_vehicle', new W().f32(side).f32(fwd).b(flags))),
      enchant: v47((wid, i) => out('enchant_item', new W().b(wid).b(i))),
      rename: v47(t => out('custom_payload', new W().str('MC|ItemName').str(t))),
      action: v47((eid, a, p) => out('entity_action', new W().vi(eid).vi(a).vi(p || 0))),   // 3/4 sprint, 8 elytra (1.9+)
      abilities: v47((flags, fly, walk) => out('abilities', new W().b(flags).f32(fly).f32(walk))),
      tab: v47(text => out('tab_complete', V9 ? new W().str(text).bool(false).bool(false) : new W().str(text).bool(false))),
      trade: v47(i => out('custom_payload', new W().str('MC|TrSel').i32(i))),
      advTab: v47(id => P >= 335 ? out('advancement_tab', id ? new W().vi(0).str(id) : new W().vi(1)) : false),
      modSend: v47((ch, bytes) => out('custom_payload', new W().str(ch).raw(bytes))),
      payload: v47((ch, bytes) => out('custom_payload', new W().str(ch).raw(bytes))),
    };
    return { chat, sendPos, api, close: () => end('Disconnected.'), get state() { return state; }, get joined() { return joined; } };
  }
  // server list ping through the relay: resolves with the status JSON (Forge servers include modinfo.modList)
  function status(o) { return new Promise((res, rej) => { let ws; try { ws = new WebSocket(o.relay); } catch (e) { rej(e); return; } ws.binaryType = 'arraybuffer'; const t = setTimeout(() => { try { ws.close(); } catch (e) { /* closed */ } rej(new Error('status timed out')); }, 12000);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'tcp_open', host: o.host, port: o.port }));
    ws.onerror = () => { clearTimeout(t); rej(new Error('relay unreachable')); };
    ws.onmessage = e => { if (typeof e.data === 'string') { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.type === 'tcp_open_ok') { ws.send(new W().vi(0).vi(o.protocol).str(o.host + (o.forge ? '\0FML\0' : '')).u16(o.port).vi(1).out()); ws.send(new W().vi(0).out()); } else if (m.type === 'tcp_error' || m.type === 'tcp_closed') { clearTimeout(t); rej(new Error(m.message || 'closed')); } return; }
      const r = new R(new Uint8Array(e.data), 0); if (r.vi() !== 0) return; clearTimeout(t); let j = null; try { j = JSON.parse(r.str()); } catch (x) { /* bad */ } try { ws.close(); } catch (x) { /* closed */ } res(j); }; }); }
  g.StrataMC = g.StrataMC || {}; Object.assign(g.StrataMC, { connect, status, comp, compHTML, setIds: x => { IDS = x; }, W, R });
})(typeof window !== 'undefined' ? window : globalThis);
