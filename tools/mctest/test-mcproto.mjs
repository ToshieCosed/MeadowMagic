// Logs the Strata MC client into a minecraft-protocol (offline) server for each version, through the real relay.
// usage: node test-mcproto.mjs [protocol ...]
import mc from 'minecraft-protocol'; import mcdata from 'minecraft-data'; import fs from 'node:fs'; import { spawn } from 'node:child_process';
const IDS = JSON.parse(fs.readFileSync('../../src/mc/ids.json', 'utf8'));
(0, eval)(fs.readFileSync('../../src/mc/mcclient.js', 'utf8')); StrataMC.setIds(IDS);
const V = { 107:'1.9',108:'1.9.1',109:'1.9.2',315:'1.11',335:'1.12',338:'1.12.1',393:'1.13',401:'1.13.1',477:'1.14',480:'1.14.1',485:'1.14.2',490:'1.14.3',573:'1.15',575:'1.15.1',735:'1.16',736:'1.16.1',751:'1.16.2',753:'1.16.3',755:'1.17',757:'1.18',47:'1.8.8',110:'1.9.4',210:'1.10.2',316:'1.11.2',340:'1.12.2',404:'1.13.2',498:'1.14.4',578:'1.15.2',754:'1.16.5',756:'1.17.1',758:'1.18.2',759:'1.19',760:'1.19.2',761:'1.19.3',762:'1.19.4',763:'1.20.1',764:'1.20.2',765:'1.20.4',766:'1.20.6',767:'1.21.1',768:'1.21.3',769:'1.21.4',770:'1.21.5',771:'1.21.6',772:'1.21.8',773:'1.21.9',774:'1.21.11',775:'26.1' };
const want = process.argv.slice(2).map(Number); const list = Object.keys(V).map(Number).filter(p => !want.length || want.includes(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: '25590' }, stdio: 'ignore' }); await wait(1200);
let bad = 0;
for (const p of list) {
  const ver = V[p], res = { p, ver };
  try {
    const port = 25600 + (p % 400);
    const server = mc.createServer({ 'online-mode': false, version: ver, host: '127.0.0.1', port, maxPlayers: 5, motd: 't' });
    const d = mcdata(ver); const gotChat = [], gotCmd = [];
    server.on('login', c => {
      if (p < 735) c.write('login', { ...d.loginPacket, viewDistance: 10, hashedSeed: [0, 0], enableRespawnScreen: true, entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false }); else try { c.write('login', { ...d.loginPacket, entityId: c.id }); } catch (e) { c.write('login', { entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false }); }
      setTimeout(() => {
        try {
          if (p < 759) c.write('chat', { message: JSON.stringify({ text: 'hello strata' }), position: 0, sender: '0' });
          else c.write('system_chat', { content: p >= 765 ? { type: 'string', value: 'hello strata' } : JSON.stringify({ text: 'hello strata' }), ...(p === 759 ? { type: 1 } : { isActionBar: false }) });
        } catch (e) { res.sendErr = e.message; }
      }, 300);
      c.on('packet', (data, meta) => { if (meta.state !== 'play') return; if (/^chat(_message)?$/.test(meta.name)) gotChat.push(data.message); if (meta.name === 'chat_command' || meta.name === 'chat_command_signed') gotCmd.push(data.command); });
    });
    await wait(400);
    const chats = []; let status = [], closed = null;
    const cl = StrataMC.connect({ relay: 'ws://127.0.0.1:25590', host: '127.0.0.1', port, protocol: p, name: 'StrataBot', uuid: process.env.NOUUID ? undefined : '00000000000000000000000000000001', onChat: t => chats.push(t), onStatus: s => status.push(s), onClose: w => { closed = w; } });
    const t0 = Date.now(); while (Date.now() - t0 < 6000 && !(cl.joined && chats.some(t => t.includes('hello strata')))) await wait(100);
    res.joined = cl.joined; res.gotServerChat = chats.some(t => t.includes('hello strata'));
    cl.chat('hi from strata'); cl.chat('/say cmd'); await wait(700);
    res.serverGotChat = gotChat.includes('hi from strata'); res.serverGotCmd = gotCmd.some(x => x.replace(/^\//, '') === 'say cmd') || gotChat.includes('/say cmd');
    res.pass = res.joined && res.gotServerChat && res.serverGotChat && res.serverGotCmd;
    if (!res.pass) { res.status = status.slice(-3); res.closed = closed; res.chats = chats.slice(0, 2); res.gotChat = gotChat; res.gotCmd = gotCmd; }
    cl.close(); server.close();
  } catch (e) { res.error = e.message; res.pass = false; }
  if (!res.pass) bad++;
  console.log(JSON.stringify(res));
  await wait(300);
}
relay.kill(); console.log(bad ? 'FAILED ' + bad : 'ALL PASS'); process.exit(bad ? 1 : 0);
