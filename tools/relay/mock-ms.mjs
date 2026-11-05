// Fake Microsoft / Xbox / Minecraft endpoints for testing the relay offline. node mock-ms.mjs <port>
import http from 'node:http';
const port = +process.argv[2] || 0; let polls = 0;
const srv = http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => {
  const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/devicecode') return send(200, { device_code: 'DEV', user_code: 'ABCD-1234', verification_uri: 'https://microsoft.com/link', expires_in: 60, interval: 1 });
  if (req.url === '/token') { if (b.includes('refresh_token')) return send(400, { error: 'invalid_grant' }); return ++polls < 2 ? send(400, { error: 'authorization_pending' }) : send(200, { access_token: 'MSTOKEN', refresh_token: 'REFRESH' }); }
  if (req.url === '/xbl') return send(200, { Token: 'XBLTOKEN', DisplayClaims: { xui: [{ uhs: 'UHS123' }] } });
  if (req.url === '/xsts') return send(200, { Token: 'XSTSTOKEN' });
  if (req.url === '/mclogin') return JSON.parse(b).identityToken === 'XBL3.0 x=UHS123;XSTSTOKEN' ? send(200, { access_token: 'MCTOKEN', expires_in: 86400 }) : send(401, {});
  if (req.url === '/profile') return req.headers.authorization === 'Bearer MCTOKEN' ? send(200, { id: '069a79f444e94726a5befca90e38aaf5', name: 'Notch' }) : send(401, {});
  send(404, {}); }); });
srv.listen(port, () => console.log('mock listening ' + srv.address().port));
