// Strata Minecraft-compat relay. Run: MS_CLIENT_ID=<your Azure app id> node relay.mjs   (default port 25580)
// Handles the documented Microsoft -> Xbox Live -> XSTS -> Minecraft services login so tokens never reach the browser.
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT_ID = process.env.MS_CLIENT_ID || '';
const PORT = +(process.env.PORT || 25580);
const STORE = process.env.RELAY_STORE || path.join(path.dirname(fileURLToPath(import.meta.url)), '.relay-auth.json');
const EP = Object.assign({
  devicecode: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode',
  token: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
  xbl: 'https://user.auth.xboxlive.com/user/authenticate',
  xsts: 'https://xsts.auth.xboxlive.com/xsts/authorize',
  mclogin: 'https://api.minecraftservices.com/authentication/login_with_xbox',
  profile: 'https://api.minecraftservices.com/minecraft/profile'
}, JSON.parse(process.env.RELAY_ENDPOINTS || '{}'));
const SCOPE = 'XboxLive.signin offline_access';
const XSTS_ERR = { 2148916233: 'This Microsoft account has no Xbox profile yet. Sign in once at xbox.com to create one.', 2148916235: 'Xbox Live is not available in this account\'s country.', 2148916236: 'The account needs adult verification (Xbox).', 2148916237: 'The account needs adult verification (Xbox).', 2148916238: 'Child accounts must be added to a Microsoft family before they can sign in.' };

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function post(url, body, json) {
  const r = await fetch(url, { method: 'POST', headers: json ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { 'Content-Type': 'application/x-www-form-urlencoded' }, body: json ? JSON.stringify(body) : new URLSearchParams(body).toString() });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; } return { ok: r.ok, status: r.status, j };
}
const loadStore = () => { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch { return {}; } };
const saveStore = o => { try { fs.writeFileSync(STORE, JSON.stringify(o), { mode: 0o600 }); } catch (e) { console.error('could not save login:', e.message); } };

// Microsoft access token -> Xbox Live -> XSTS -> Minecraft access token + profile
async function minecraftLogin(msToken) {
  const x1 = await post(EP.xbl, { Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + msToken }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' }, true);
  if (!x1.ok) throw new Error('Xbox Live sign-in failed (' + x1.status + ')');
  const uhs = x1.j.DisplayClaims.xui[0].uhs;
  const x2 = await post(EP.xsts, { Properties: { SandboxId: 'RETAIL', UserTokens: [x1.j.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' }, true);
  if (!x2.ok) throw new Error(XSTS_ERR[x2.j.XErr] || 'Xbox security token refused (' + x2.status + (x2.j.XErr ? ', ' + x2.j.XErr : '') + ')');
  const mc = await post(EP.mclogin, { identityToken: `XBL3.0 x=${uhs};${x2.j.Token}` }, true);
  if (!mc.ok || !mc.j.access_token) throw new Error('Minecraft login failed (' + mc.status + ')');
  const pr = await fetch(EP.profile, { headers: { Authorization: 'Bearer ' + mc.j.access_token } });
  if (pr.status === 404) throw new Error('This account does not own Minecraft: Java Edition.');
  if (!pr.ok) throw new Error('Could not read the Minecraft profile (' + pr.status + ')');
  const p = await pr.json();
  return { name: p.name, uuid: p.id, mcToken: mc.j.access_token, expires: Date.now() + (mc.j.expires_in || 86400) * 1000 };
}
async function refresh() {
  const st = loadStore(); if (!st.refresh) return null;
  const r = await post(EP.token, { client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: st.refresh, scope: SCOPE });
  if (!r.ok || !r.j.access_token) return null;
  if (r.j.refresh_token) saveStore({ refresh: r.j.refresh_token });
  return minecraftLogin(r.j.access_token);
}

let session = null;   // { name, uuid, mcToken, expires } kept only in this process
async function authFlow(send) {
  if (!CLIENT_ID) return send({ type: 'auth_error', message: 'Relay has no MS_CLIENT_ID. Register an Azure app (public client) and start the relay with MS_CLIENT_ID=<id>.' });
  try { const s = await refresh(); if (s) { session = s; return send({ type: 'auth_ok', name: s.name, uuid: s.uuid, remembered: true }); } } catch (e) { /* fall through to a fresh sign-in */ }
  const d = await post(EP.devicecode, { client_id: CLIENT_ID, scope: SCOPE });
  if (!d.ok || !d.j.device_code) return send({ type: 'auth_error', message: 'Microsoft refused the sign-in request (' + d.status + '). Check MS_CLIENT_ID and that "Allow public client flows" is on.' });
  send({ type: 'auth_code', user_code: d.j.user_code, verification_uri: d.j.verification_uri, expires_in: d.j.expires_in });
  let wait = (d.j.interval || 5) * 1000; const end = Date.now() + (d.j.expires_in || 900) * 1000;
  while (Date.now() < end) {
    await sleep(wait);
    const t = await post(EP.token, { client_id: CLIENT_ID, grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: d.j.device_code });
    if (t.ok && t.j.access_token) {
      if (t.j.refresh_token) saveStore({ refresh: t.j.refresh_token });
      try { session = await minecraftLogin(t.j.access_token); return send({ type: 'auth_ok', name: session.name, uuid: session.uuid }); } catch (e) { return send({ type: 'auth_error', message: e.message }); }
    }
    const err = t.j.error;
    if (err === 'authorization_pending') continue; if (err === 'slow_down') { wait += 5000; continue; }
    return send({ type: 'auth_error', message: err === 'authorization_declined' ? 'Sign-in was declined.' : err === 'expired_token' ? 'The code expired. Try again.' : 'Sign-in failed: ' + (err || t.status) });
  }
  send({ type: 'auth_error', message: 'The code expired. Try again.' });
}

const wss = new WebSocketServer({ port: PORT });
wss.on('connection', ws => {
  const send = o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  ws.on('message', buf => { let m; try { m = JSON.parse(buf.toString()); } catch { return; }
    if (m.type === 'auth_start') authFlow(send).catch(e => send({ type: 'auth_error', message: e.message }));
    else if (m.type === 'auth_status') send(session ? { type: 'auth_ok', name: session.name, uuid: session.uuid, remembered: true } : { type: 'auth_none' });
    else if (m.type === 'auth_logout') { session = null; saveStore({}); send({ type: 'auth_none' }); } });
  send({ type: 'hello', relay: 'strata-minecraft-compat', version: 1 });
});
console.log('Strata relay listening on ws://localhost:' + PORT + (CLIENT_ID ? '' : '  (no MS_CLIENT_ID set: sign-in disabled)'));
