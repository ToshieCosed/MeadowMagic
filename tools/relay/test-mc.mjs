// Walks a login through the relay to a mock Minecraft server: sign-in, TCP, encryption handshake, compression, big packet in, big packet out.
// RELAY_CMD="node relay.mjs" (default) or e.g. "java -cp /tmp/relay-out app.strata.relay.RelayMain"
import { spawn } from 'node:child_process'; import { WebSocket } from 'ws'; import fs from 'node:fs'; import zlib from 'node:zlib';
const wait = ms => new Promise(r => setTimeout(r, ms));
const vi = n => { const a = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; a.push(b); } while (n); return Buffer.from(a); };
const rv = (b, o) => { let v = 0, s = 0, i = o; for (;;) { const x = b[i++]; v |= (x & 0x7f) << s; if (!(x & 0x80)) return { v, len: i - o }; s += 7; } };
const mock = spawn('node', ['mock-ms.mjs', '19281', '19282'], { stdio: 'inherit' }); await wait(900);
const base = 'http://localhost:19281', EP = { devicecode: base + '/devicecode', token: base + '/token', xbl: base + '/xbl', xsts: base + '/xsts', mclogin: base + '/mclogin', profile: base + '/profile', sessionjoin: base + '/sessionjoin' };
const store = '/tmp/relay-mc-store.json'; try { fs.unlinkSync(store); } catch {}
const cmd = (process.env.RELAY_CMD || 'node relay.mjs').split(' ');
const relay = spawn(cmd[0], cmd.slice(1), { env: { ...process.env, MS_CLIENT_ID: 'test-client', PORT: '19280', RELAY_ENDPOINTS: JSON.stringify(EP), RELAY_STORE: store }, stdio: 'inherit' }); await wait(1500);
const ws = new WebSocket('ws://localhost:19280/?t=x'); const texts = [], bins = []; ws.on('message', (m, isBin) => isBin ? bins.push(Buffer.from(m)) : texts.push(JSON.parse(m.toString()))); await new Promise(r => ws.on('open', r));
const until = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await wait(50); } return null; };
const r = {};
ws.send(JSON.stringify({ type: 'auth_start' })); r.auth = !!(await until(() => texts.find(m => m.type === 'auth_ok'), 15000));
ws.send(JSON.stringify({ type: 'tcp_open', host: '127.0.0.1', port: 19282 })); r.open = !!(await until(() => texts.find(m => m.type === 'tcp_open_ok')));
ws.send(Buffer.concat([vi(0), vi(765), Buffer.from('\x09localhost'), Buffer.from([0x63, 0xdd]), vi(2)]));          // handshake
ws.send(Buffer.concat([vi(0), Buffer.from('\x06Notchy'), Buffer.alloc(16)]));                                       // login start
const req = await until(() => bins.find(b => rv(b, 0).v === 1)); r.encReq = !!req;
let o = 1; const sl = rv(req, o); o += sl.len + sl.v; const l1 = rv(req, o); o += l1.len; const pub = req.subarray(o, o + l1.v); o += l1.v; const l2 = rv(req, o); o += l2.len; const tok = req.subarray(o, o + l2.v);
ws.send(JSON.stringify({ type: 'mc_encrypt_begin', serverId: '', publicKey: pub.toString('base64'), verifyToken: tok.toString('base64') }));
const ready = await until(() => texts.find(m => m.type === 'mc_encrypt_ready' || m.type === 'mc_error')); r.ready = ready?.type === 'mc_encrypt_ready';
if (r.ready) { const es = Buffer.from(ready.secret, 'base64'), et = Buffer.from(ready.token, 'base64'); ws.send(Buffer.concat([vi(1), vi(es.length), es, vi(et.length), et])); }
r.setComp = !!(await until(() => bins.find(b => rv(b, 0).v === 3)));
r.loginOk = !!(await until(() => bins.find(b => rv(b, 0).v === 2 && b.subarray(1).toString() === 'login-ok')));
const big = await until(() => bins.find(b => rv(b, 0).v === 0x20)); r.bigIn = !!big && big.length === 3001 && big.subarray(1).every(x => x === 0x41);
const payload = Buffer.alloc(5000, 0x42); ws.send(Buffer.concat([vi(0x10), payload]));
const echo = await until(() => bins.find(b => rv(b, 0).v === 0x11)); r.echo = !!echo && echo.length === 5001 && echo.subarray(1).every(x => x === 0x42);
const st = await (await fetch(base + '/state')).json(); r.hash = !!st.expected && st.join?.serverId === st.expected && st.join?.accessToken === 'MCTOKEN' && st.join?.selectedProfile === '069a79f444e94726a5befca90e38aaf5';
r.noLeak = !JSON.stringify(texts).includes('MCTOKEN');
const pass = Object.values(r).every(Boolean); if (!pass) console.log(JSON.stringify(texts.filter(m => /error/.test(m.type)))); console.log(JSON.stringify({ ...r, pass })); relay.kill(); mock.kill(); process.exit(pass ? 0 : 1);
