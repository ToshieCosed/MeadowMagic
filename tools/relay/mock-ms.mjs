// Fake Microsoft / Xbox / Minecraft endpoints for testing the relay offline. node mock-ms.mjs <port>
import http from 'node:http';
import net from 'node:net';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const port = +process.argv[2] || 0, mcPort = +process.argv[3] || 0; let polls = 0; const state = { join: null, expected: null, echoed: false, bigOk: false };
const srv = http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => {
  const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/devicecode') return send(200, { device_code: 'DEV', user_code: 'ABCD-1234', verification_uri: 'https://microsoft.com/link', expires_in: 60, interval: 1 });
  if (req.url === '/token') { if (b.includes('refresh_token')) return send(400, { error: 'invalid_grant' }); return ++polls < 2 ? send(400, { error: 'authorization_pending' }) : send(200, { access_token: 'MSTOKEN', refresh_token: 'REFRESH' }); }
  if (req.url === '/xbl') return send(200, { Token: 'XBLTOKEN', DisplayClaims: { xui: [{ uhs: 'UHS123' }] } });
  if (req.url === '/xsts') return send(200, { Token: 'XSTSTOKEN' });
  if (req.url === '/mclogin') return JSON.parse(b).identityToken === 'XBL3.0 x=UHS123;XSTSTOKEN' ? send(200, { access_token: 'MCTOKEN', expires_in: 86400 }) : send(401, {});
  if (req.url === '/profile') return req.headers.authorization === 'Bearer MCTOKEN' ? send(200, { id: '069a79f444e94726a5befca90e38aaf5', name: 'Notch' }) : send(401, {});
  if (req.url === '/sessionjoin') { state.join = JSON.parse(b); return res.writeHead(204).end(); }
  if (req.url === '/state') return send(200, state);
  send(404, {}); }); });
srv.listen(port, () => console.log('mock listening ' + srv.address().port));

// ---- a tiny Minecraft-like server: encryption request, AES/CFB8, set-compression, login success, one big packet, echo ----
const vi = n => { const a = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; a.push(b); } while (n); return Buffer.from(a); };
const rv = (b, o) => { let v = 0, s = 0, i = o; for (;;) { if (i >= b.length) return null; const x = b[i++]; v |= (x & 0x7f) << s; if (!(x & 0x80)) return { v, len: i - o }; s += 7; } };
const digest = buf => { let h = crypto.createHash('sha1').update(buf).digest(); const neg = h[0] & 0x80; if (neg) { h = Buffer.from(h); let c = 1; for (let i = h.length - 1; i >= 0; i--) { const x = (~h[i] & 0xff) + c; h[i] = x & 0xff; c = x >> 8; } } return (neg ? '-' : '') + (h.toString('hex').replace(/^0+/, '') || '0'); };
if (mcPort) net.createServer(sock => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }); const pub = publicKey.export({ type: 'spki', format: 'der' }); const token = crypto.randomBytes(4);
  let buf = Buffer.alloc(0), enc = null, dec = null, comp = -1, step = 0;
  const out = body => { let d = comp >= 0 ? Buffer.concat([vi(0), body]) : body; if (comp >= 0 && body.length >= comp) d = Buffer.concat([vi(body.length), zlib.deflateSync(body)]); let f = Buffer.concat([vi(d.length), d]); if (enc) f = enc.update(f); sock.write(f); };
  sock.on('data', d => { if (dec) d = dec.update(d); buf = Buffer.concat([buf, d]);
    for (;;) { const r = rv(buf, 0); if (!r || buf.length < r.len + r.v) break; let body = buf.subarray(r.len, r.len + r.v); buf = buf.subarray(r.len + r.v);
      if (comp >= 0) { const dl = rv(body, 0), rest = body.subarray(dl.len); body = dl.v === 0 ? rest : zlib.inflateSync(rest); }
      const id = rv(body, 0).v;
      if (step === 0 && id === 0) { step = 1; if (body[1] === 0x00 && false) {} }
      else if (step === 0) { }
      if (step === 1 && id === 0 && body.length > 8) { /* login start */ step = 2; const sid = Buffer.from(''); out(Buffer.concat([vi(1), vi(0), vi(pub.length), pub, vi(token.length), token])); state.pub = pub; }
      else if (step === 2 && id === 1) { let o = 1; const a = rv(body, o); o += a.len; const es = body.subarray(o, o + a.v); o += a.v; const b = rv(body, o); o += b.len; const et = body.subarray(o, o + b.v);
        const dp = x => crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, x); const secret = dp(es), tk = dp(et);
        if (!tk.equals(token)) { sock.destroy(); return; }
        state.expected = digest(Buffer.concat([Buffer.from(''), secret, pub])); enc = crypto.createCipheriv('aes-128-cfb8', secret, secret); dec = crypto.createDecipheriv('aes-128-cfb8', secret, secret); step = 3;
        out(Buffer.concat([vi(3), vi(64)])); comp = 64; out(Buffer.concat([vi(2), Buffer.from('login-ok')]));
        out(Buffer.concat([vi(0x20), Buffer.alloc(3000, 0x41)])); }
      else if (step === 3 && id === 0x10) { state.echoed = body.length; out(Buffer.concat([vi(0x11), body.subarray(1)])); } } });
}).listen(mcPort, () => console.log('mock minecraft listening ' + mcPort));
