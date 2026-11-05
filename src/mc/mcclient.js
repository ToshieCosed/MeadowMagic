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

  function connect(o) {
    const P = o.protocol, ids = IDS[P];
    if (!ids) throw new Error('No packet table for protocol ' + P);
    const rev = {}; for (const k of ['lc', 'cc', 'pc']) { rev[k] = {}; for (const n in (ids[k] || {})) rev[k][ids[k][n]] = n; }
    let state = 'login', ws, pend = 0, closed = false, joined = false;
    const say = t => { try { o.onChat && o.onChat(t); } catch (e) { /* ui */ } };
    const status = t => { try { o.onStatus && o.onStatus(t); } catch (e) { /* ui */ } };
    const end = why => { if (closed) return; closed = true; try { ws.close(); } catch (e) { /* closed */ } try { o.onClose && o.onClose(why); } catch (e) { /* ui */ } };
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
      switch (name) {
        case 'kick_disconnect': return end(P >= 765 ? comp(r.nbt()) : comp(r.str()));
        case 'keep_alive': out('keep_alive', body.subarray(idLen)); return;
        case 'ping': out('pong', new W().i32(r.i32())); return;
        case 'login': if (!joined) { joined = true; status('Joined the world'); } return;
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
      const r = new R(body, 0), id = r.vi(), idLen = r.p;
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
    ws.onclose = () => end('Connection closed.');
    ws.onmessage = e => {
      if (typeof e.data !== 'string') { onPacket(new Uint8Array(e.data)); return; }
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.type === 'tcp_open_ok') {
        const w = new W().vi(0).vi(P).str(o.host).u16(o.port).vi(2); ws.send(w.out()); loginStart();
      } else if (m.type === 'mc_encrypt_ready') {
        const w = new W(); w.bytes(unb64(m.secret)); if (P === 759 || P === 760) w.bool(true); w.bytes(unb64(m.token)); out('encryption_begin', w);
      } else if (m.type === 'tcp_error' || m.type === 'mc_error') end(m.message || 'Connection failed.');
      else if (m.type === 'tcp_closed') end('Server closed the connection.');
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
    return { chat, close: () => end('Disconnected.'), get state() { return state; }, get joined() { return joined; } };
  }
  g.StrataMC = { connect, comp, setIds: x => { IDS = x; }, W, R };
})(typeof window !== 'undefined' ? window : globalThis);
