// Node test (dev only): joins a real Forge 1.12.2 server through the relay with mcclient's Forge mode, without a browser.
// Run: FORGE_DIR=/tmp/claude-0/forgesrv node test-forge-node.mjs   (starts the server and relay itself)
import fs from 'node:fs'; import vm from 'node:vm'; import { spawn } from 'node:child_process';
const wait = ms => new Promise(r => setTimeout(r, ms)), DIR = process.env.FORGE_DIR || '/tmp/claude-0/forgesrv', SP = 25990, RP = 25991;
const java = '/usr/lib/jvm/java-8-openjdk-amd64/bin/java';
let srv = null; if (!process.env.NOSTART) { srv = spawn(java, ['-Xmx2G', '-jar', 'server.jar', 'nogui'], { cwd: DIR, stdio: ['pipe', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; });
  for (let i = 0; i < 90 && !/Done \(/.test(log); i++) await wait(1000); if (!/Done \(/.test(log)) { console.log('server did not start'); process.exit(1); } globalThis.__srvlog = () => log; }
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(RP) }, stdio: 'ignore' }); await wait(1200);
const g = globalThis; g.window = g; vm.runInThisContext(fs.readFileSync('../../src/mc/mcclient.js', 'utf8')); g.StrataMC.setIds(JSON.parse(fs.readFileSync('../../src/mc/ids.json', 'utf8')));
const st = await g.StrataMC.status({ relay: 'ws://127.0.0.1:' + RP, host: '127.0.0.1', port: SP, protocol: 340, forge: true });
const mods = (st && st.modinfo && st.modinfo.modList) || []; const res = { statusMods: mods.map(m => m.modid + '@' + m.version) };
const got = { chunks: 0, login: null, reg: null, status: [], chat: [], payloads: {} };
const H = { login(p) { got.login = p; }, chunk() { got.chunks++; }, forgeRegistries(reg, m) { got.reg = Object.fromEntries(Object.entries(reg).map(([k, v]) => [k, Object.keys(v).length])); got.blocks = reg['minecraft:blocks']; got.items = reg['minecraft:items']; },
  modPayload(ch, b) { got.payloads[ch] = (got.payloads[ch] || 0) + 1; return false; }, position() {}, time() {}, health() {} };
const cl = g.StrataMC.connect({ relay: 'ws://127.0.0.1:' + RP, host: '127.0.0.1', port: SP, protocol: 340, name: 'Strata1', forge: true, forgeMods: mods, world: H,
  onStatus: t => got.status.push(t), onChat: t => got.chat.push(t), onClose: w => got.closed = w });
for (let i = 0; i < 40 && got.chunks < 20 && !got.closed; i++) await wait(500);
res.got = { chunks: got.chunks, login: got.login, reg: got.reg, status: got.status.slice(-6), closed: got.closed, payloads: got.payloads, modBlocks: Object.entries(got.blocks || {}).filter(([i, n]) => !n.startsWith('minecraft:')).slice(0, 8), modItems: Object.entries(got.items || {}).filter(([i, n]) => !n.startsWith('minecraft:')).length };
res.pass = got.chunks > 0 && !!got.reg && !got.closed; console.log(JSON.stringify(res, null, 1)); try { cl.close(); } catch (e) { /* closed */ }
relay.kill(); if (srv) { srv.stdin.write('stop\n'); await wait(3000); srv.kill(); } process.exit(res.pass ? 0 : 1);
