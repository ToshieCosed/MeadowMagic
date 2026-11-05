// Runs the relay against the mock endpoints and walks the whole login chain. node test-auth.mjs
import { spawn } from 'node:child_process'; import { WebSocket } from 'ws'; import fs from 'node:fs';
const wait = ms => new Promise(r => setTimeout(r, ms));
const mock = spawn('node', ['mock-ms.mjs', '19081'], { stdio: 'inherit' }); await wait(600);
const base = 'http://localhost:19081', EP = { devicecode: base + '/devicecode', token: base + '/token', xbl: base + '/xbl', xsts: base + '/xsts', mclogin: base + '/mclogin', profile: base + '/profile' };
const store = '/tmp/relay-test-store.json'; try { fs.unlinkSync(store); } catch {}
const relay = spawn('node', ['relay.mjs'], { env: { ...process.env, MS_CLIENT_ID: 'test-client', PORT: '19080', RELAY_ENDPOINTS: JSON.stringify(EP), RELAY_STORE: store }, stdio: 'inherit' }); await wait(800);
const msgs = []; const ws = new WebSocket('ws://localhost:19080'); ws.on('message', m => msgs.push(JSON.parse(m.toString()))); await new Promise(r => ws.on('open', r));
ws.send(JSON.stringify({ type: 'auth_start' })); await wait(4500);
const types = msgs.map(m => m.type); const ok = msgs.find(m => m.type === 'auth_ok'), code = msgs.find(m => m.type === 'auth_code');
const pass = types.includes('hello') && code?.user_code === 'ABCD-1234' && ok?.name === 'Notch' && ok?.uuid === '069a79f444e94726a5befca90e38aaf5' && JSON.parse(fs.readFileSync(store, 'utf8')).refresh === 'REFRESH' && !JSON.stringify(msgs).includes('MCTOKEN');
console.log(JSON.stringify({ types, pass })); relay.kill(); mock.kill(); process.exit(pass ? 0 : 1);
