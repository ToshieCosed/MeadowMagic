package app.strata.relay;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.DataFormatException;
import java.util.zip.Deflater;
import java.util.zip.Inflater;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.spec.X509EncodedKeySpec;

/**
 * Strata Minecraft-compat relay core (same message format as tools/relay/relay.mjs).
 * Microsoft -> Xbox -> XSTS -> Minecraft login, then a packet pipe: the page reads and writes whole packet bodies,
 * this class does TCP framing, zlib compression and AES/CFB8 encryption.
 */
public final class Relay implements WsServer.Handler {
    public static final class Config {
        public String clientId = "c36a9fb6-4f2a-41ff-90bd-ae7cc92031eb"; public File store; public String token = "";
        public final Map<String, String> ep = new LinkedHashMap<>();
        public Config() {
            ep.put("devicecode", "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode");
            ep.put("token", "https://login.microsoftonline.com/consumers/oauth2/v2.0/token");
            ep.put("xbl", "https://user.auth.xboxlive.com/user/authenticate");
            ep.put("xsts", "https://xsts.auth.xboxlive.com/xsts/authorize");
            ep.put("mclogin", "https://api.minecraftservices.com/authentication/login_with_xbox");
            ep.put("profile", "https://api.minecraftservices.com/minecraft/profile");
            ep.put("sessionjoin", "https://sessionserver.mojang.com/session/minecraft/join");
        }
    }

    private static final String SCOPE = "XboxLive.signin offline_access";
    private final Config cfg;
    private volatile String clientId;
    private volatile Session session;

    private static final class Session { String name, uuid, mcToken; }

    /** Per-connection state. */
    private static final class Ctx {
        WsServer.Conn ws; Socket sock; OutputStream sout; volatile Cipher enc, dec; volatile int compress = -1; volatile boolean login = true; volatile byte[] pending;
        byte[] buf = new byte[0]; int len = 0;
    }

    public Relay(Config cfg) { this.cfg = cfg; this.clientId = cfg.clientId == null ? "" : cfg.clientId; }

    // ---- WebSocket handler ----
    @Override public void onOpen(WsServer.Conn c, String path) {
        if (cfg.token != null && !cfg.token.isEmpty() && (path == null || !path.contains("t=" + cfg.token))) { c.close(); return; }
        Ctx x = new Ctx(); x.ws = c; c.attach = x;
        c.sendText(Json.write(Json.of("type", "hello", "relay", "strata-minecraft-compat", "version", 2)));
    }

    @Override public void onText(WsServer.Conn c, String text) {
        final Ctx x = (Ctx) c.attach; if (x == null) return;
        final Map<String, Object> m; try { m = Json.obj(text); } catch (RuntimeException e) { return; }
        String type = Json.str(m, "type"); if (type == null) return;
        switch (type) {
            case "auth_start": { final String cid = Json.str(m, "clientId"); thread(() -> authFlow(x, cid)); break; }
            case "auth_status": { Session s = session; send(x, s != null ? Json.of("type", "auth_ok", "name", s.name, "uuid", s.uuid, "remembered", true) : Json.of("type", "auth_none")); break; }
            case "auth_logout": session = null; saveRefresh(null); send(x, Json.of("type", "auth_none")); break;
            case "tcp_open": { final String host = Json.str(m, "host"); final int port = (int) Json.num(m, "port", 25565); thread(() -> tcpOpen(x, host, port)); break; }
            case "tcp_close": tcpClose(x); break;
            case "mc_encrypt_begin": thread(() -> encryptBegin(x, m)); break;
            default: break;
        }
    }

    @Override public void onBinary(WsServer.Conn c, byte[] data) { Ctx x = (Ctx) c.attach; if (x != null) tcpSend(x, data); }

    @Override public void onClose(WsServer.Conn c) { Ctx x = (Ctx) c.attach; if (x != null) tcpClose(x); }

    private static void thread(Runnable r) { Thread t = new Thread(r, "relay-task"); t.setDaemon(true); t.start(); }

    private static void send(Ctx x, Map<String, Object> o) { x.ws.sendText(Json.write(o)); }

    // ---- sign-in ----
    private static final Map<Long, String> XSTS = new LinkedHashMap<>();
    static {
        XSTS.put(2148916233L, "This Microsoft account has no Xbox profile yet. Sign in once at xbox.com to create one.");
        XSTS.put(2148916235L, "Xbox Live is not available in this account's country.");
        XSTS.put(2148916236L, "The account needs adult verification (Xbox).");
        XSTS.put(2148916237L, "The account needs adult verification (Xbox).");
        XSTS.put(2148916238L, "Child accounts must be added to a Microsoft family before they can sign in.");
    }

    private String loadRefresh() {
        try { return Json.str(Json.obj(new String(Files.readAllBytes(cfg.store.toPath()), StandardCharsets.UTF_8)), "refresh"); } catch (Exception e) { return null; }
    }

    private void saveRefresh(String r) {
        try { if (cfg.store != null) Files.write(cfg.store.toPath(), Json.write(r == null ? Json.of() : Json.of("refresh", r)).getBytes(StandardCharsets.UTF_8)); } catch (Exception e) { /* best effort */ }
    }

    private static Map<String, String> form(String... kv) { Map<String, String> m = new LinkedHashMap<>(); for (int i = 0; i + 1 < kv.length; i += 2) m.put(kv[i], kv[i + 1]); return m; }

    private Session minecraftLogin(String msToken) throws IOException {
        Http.Res x1 = Http.postJson(cfg.ep.get("xbl"), Json.of("Properties", Json.of("AuthMethod", "RPS", "SiteName", "user.auth.xboxlive.com", "RpsTicket", "d=" + msToken), "RelyingParty", "http://auth.xboxlive.com", "TokenType", "JWT"));
        if (!x1.ok()) throw new IOException("Xbox Live sign-in failed (" + x1.status + ")");
        Map<String, Object> j1 = x1.json(); String uhs;
        try { uhs = Json.str((Map<String, Object>) ((List<?>) Json.map(j1, "DisplayClaims").get("xui")).get(0), "uhs"); } catch (RuntimeException e) { throw new IOException("Xbox Live answered unexpectedly"); }
        List<Object> toks = new ArrayList<>(); toks.add(Json.str(j1, "Token"));
        Http.Res x2 = Http.postJson(cfg.ep.get("xsts"), Json.of("Properties", Json.of("SandboxId", "RETAIL", "UserTokens", toks), "RelyingParty", "rp://api.minecraftservices.com/", "TokenType", "JWT"));
        if (!x2.ok()) { long xe = Json.num(x2.json(), "XErr", 0); String msg = XSTS.get(xe); throw new IOException(msg != null ? msg : "Xbox security token refused (" + x2.status + (xe != 0 ? ", " + xe : "") + ")"); }
        Http.Res mc = Http.postJson(cfg.ep.get("mclogin"), Json.of("identityToken", "XBL3.0 x=" + uhs + ";" + Json.str(x2.json(), "Token")));
        String at = Json.str(mc.json(), "access_token");
        if (!mc.ok() || at == null) throw new IOException("Minecraft login failed (" + mc.status + ")");
        Http.Res pr = Http.get(cfg.ep.get("profile"), at);
        if (pr.status == 404) throw new IOException("This account does not own Minecraft: Java Edition.");
        if (!pr.ok()) throw new IOException("Could not read the Minecraft profile (" + pr.status + ")");
        Session s = new Session(); s.name = Json.str(pr.json(), "name"); s.uuid = Json.str(pr.json(), "id"); s.mcToken = at; return s;
    }

    private Session refresh() {
        try {
            String r = loadRefresh(); if (r == null) return null;
            Http.Res t = Http.postForm(cfg.ep.get("token"), form("client_id", clientId, "grant_type", "refresh_token", "refresh_token", r, "scope", SCOPE));
            Map<String, Object> j = t.json(); String at = Json.str(j, "access_token");
            if (!t.ok() || at == null) return null;
            String nr = Json.str(j, "refresh_token"); if (nr != null) saveRefresh(nr);
            return minecraftLogin(at);
        } catch (Exception e) { return null; }
    }

    private void authFlow(Ctx x, String cid) {
        try {
            if (cid != null && !cid.isEmpty()) clientId = cid;
            if (clientId.isEmpty()) { send(x, Json.of("type", "auth_error", "message", "No Azure client id set. Register an Azure app (public client) and enter its id in the menu.")); return; }
            Session s0 = refresh(); if (s0 != null) { session = s0; send(x, Json.of("type", "auth_ok", "name", s0.name, "uuid", s0.uuid, "remembered", true)); return; }
            Http.Res d = Http.postForm(cfg.ep.get("devicecode"), form("client_id", clientId, "scope", SCOPE));
            Map<String, Object> dj = d.json();
            if (!d.ok() || Json.str(dj, "device_code") == null) { send(x, Json.of("type", "auth_error", "message", "Microsoft refused the sign-in request (" + d.status + "). Check the client id and that \"Allow public client flows\" is on.")); return; }
            send(x, Json.of("type", "auth_code", "user_code", Json.str(dj, "user_code"), "verification_uri", Json.str(dj, "verification_uri"), "expires_in", Json.num(dj, "expires_in", 900)));
            long wait = Json.num(dj, "interval", 5) * 1000, end = System.currentTimeMillis() + Json.num(dj, "expires_in", 900) * 1000;
            while (System.currentTimeMillis() < end) {
                Thread.sleep(wait);
                Http.Res t = Http.postForm(cfg.ep.get("token"), form("client_id", clientId, "grant_type", "urn:ietf:params:oauth:grant-type:device_code", "device_code", Json.str(dj, "device_code")));
                Map<String, Object> tj = t.json(); String at = Json.str(tj, "access_token");
                if (t.ok() && at != null) {
                    String nr = Json.str(tj, "refresh_token"); if (nr != null) saveRefresh(nr);
                    try { Session s = minecraftLogin(at); session = s; send(x, Json.of("type", "auth_ok", "name", s.name, "uuid", s.uuid)); }
                    catch (IOException e) { send(x, Json.of("type", "auth_error", "message", e.getMessage())); }
                    return;
                }
                String err = Json.str(tj, "error");
                if ("authorization_pending".equals(err)) continue;
                if ("slow_down".equals(err)) { wait += 5000; continue; }
                send(x, Json.of("type", "auth_error", "message", "authorization_declined".equals(err) ? "Sign-in was declined." : "expired_token".equals(err) ? "The code expired. Try again." : "Sign-in failed: " + (err != null ? err : t.status)));
                return;
            }
            send(x, Json.of("type", "auth_error", "message", "The code expired. Try again."));
        } catch (Exception e) { send(x, Json.of("type", "auth_error", "message", String.valueOf(e.getMessage()))); }
    }

    // ---- Minecraft packet pipe ----
    private static void putVi(ByteArrayOutputStream o, int n) { do { int b = n & 0x7f; n >>>= 7; if (n != 0) b |= 0x80; o.write(b); } while (n != 0); }

    /** returns {value, bytesUsed} or null when incomplete. */
    private static int[] readVi(byte[] b, int off, int end) {
        int v = 0, s = 0, i = off;
        for (;;) {
            if (i >= end) return null;
            int x = b[i++] & 0xff; v |= (x & 0x7f) << s;
            if ((x & 0x80) == 0) return new int[]{v, i - off};
            s += 7; if (s > 35) throw new IllegalStateException("bad varint");
        }
    }

    private void tcpOpen(Ctx x, String host, int port) {
        tcpClose(x);
        try {
            Socket s = new Socket(); s.setTcpNoDelay(true); s.connect(new InetSocketAddress(host, port), 10000);
            synchronized (x) { x.sock = s; x.sout = s.getOutputStream(); x.enc = null; x.dec = null; x.compress = -1; x.login = true; x.pending = null; x.buf = new byte[65536]; x.len = 0; }
            send(x, Json.of("type", "tcp_open_ok"));
            final Socket fs = s;
            thread(() -> tcpReader(x, fs));
        } catch (Exception e) { send(x, Json.of("type", "tcp_error", "message", String.valueOf(e.getMessage()))); }
    }

    private void tcpReader(Ctx x, Socket s) {
        byte[] rb = new byte[16384];
        try {
            java.io.InputStream in = s.getInputStream();
            for (;;) {
                int n = in.read(rb); if (n < 0) break;
                byte[] d = (x.dec != null) ? x.dec.update(rb, 0, n) : Arrays.copyOf(rb, n);
                if (x.len + d.length > x.buf.length) x.buf = Arrays.copyOf(x.buf, Math.max(x.buf.length * 2, x.len + d.length));
                System.arraycopy(d, 0, x.buf, x.len, d.length); x.len += d.length;
                int pos = 0;
                for (;;) {
                    int[] l = readVi(x.buf, pos, x.len); if (l == null || x.len - pos - l[1] < l[0]) break;
                    int start = pos + l[1], end = start + l[0]; pos = end;
                    byte[] body;
                    if (x.compress >= 0) {
                        int[] dl = readVi(x.buf, start, end);
                        if (dl[0] == 0) body = Arrays.copyOfRange(x.buf, start + dl[1], end);
                        else { Inflater inf = new Inflater(); inf.setInput(x.buf, start + dl[1], end - start - dl[1]); body = new byte[dl[0]]; int got = 0; while (got < body.length) { int k = inf.inflate(body, got, body.length - got); if (k == 0 && (inf.finished() || inf.needsInput())) break; got += k; } inf.end(); }
                    } else body = Arrays.copyOfRange(x.buf, start, end);
                    x.ws.sendBinary(body);
                    if (x.login) { int[] id = readVi(body, 0, body.length); if (id != null) { if (id[0] == 3) { int[] t = readVi(body, id[1], body.length); x.compress = t[0]; } else if (id[0] == 2) x.login = false; } }
                }
                if (pos > 0) { System.arraycopy(x.buf, pos, x.buf, 0, x.len - pos); x.len -= pos; }
            }
        } catch (Exception e) {
            if (x.sock == s) send(x, Json.of("type", "tcp_error", "message", "bad packet stream: " + e.getMessage()));
        }
        boolean mine; synchronized (x) { mine = x.sock == s; if (mine) x.sock = null; }
        try { s.close(); } catch (IOException ignored) {}
        if (mine) send(x, Json.of("type", "tcp_closed"));
    }

    private void tcpClose(Ctx x) { Socket s; synchronized (x) { s = x.sock; x.sock = null; } if (s != null) try { s.close(); } catch (IOException ignored) {} }

    private void tcpSend(Ctx x, byte[] body) {
        synchronized (x) {
            if (x.sock == null) return;
            try {
                byte[] data = body;
                if (x.compress >= 0) {
                    ByteArrayOutputStream c = new ByteArrayOutputStream();
                    if (body.length >= x.compress) {
                        putVi(c, body.length); Deflater df = new Deflater(); df.setInput(body); df.finish(); byte[] t = new byte[4096];
                        while (!df.finished()) { int k = df.deflate(t); c.write(t, 0, k); } df.end();
                    } else { putVi(c, 0); c.write(body, 0, body.length); }
                    data = c.toByteArray();
                }
                ByteArrayOutputStream f = new ByteArrayOutputStream(); putVi(f, data.length); f.write(data, 0, data.length);
                byte[] frame = f.toByteArray(); if (x.enc != null) frame = x.enc.update(frame);
                Cipher ne = null;
                if (x.pending != null) {   // everything after the encryption response is encrypted; the reader must be ready before the reply can arrive
                    byte[] k = x.pending; x.pending = null;
                    ne = Cipher.getInstance("AES/CFB8/NoPadding"); ne.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(k, "AES"), new IvParameterSpec(k));
                    Cipher d = Cipher.getInstance("AES/CFB8/NoPadding"); d.init(Cipher.DECRYPT_MODE, new SecretKeySpec(k, "AES"), new IvParameterSpec(k)); x.dec = d;
                }
                x.sout.write(frame); x.sout.flush();
                if (ne != null) x.enc = ne;
            } catch (Exception e) { send(x, Json.of("type", "tcp_error", "message", String.valueOf(e.getMessage()))); }
        }
    }

    /** Minecraft's signed-hex SHA-1 digest. */
    static String mcDigest(byte[] in) throws Exception {
        return new BigInteger(MessageDigest.getInstance("SHA-1").digest(in)).toString(16);
    }

    private void encryptBegin(Ctx x, Map<String, Object> m) {
        Session s = session; if (s == null) { send(x, Json.of("type", "mc_error", "message", "Not signed in.")); return; }
        try {
            byte[] secret = new byte[16]; new SecureRandom().nextBytes(secret);
            byte[] pub = Base64.getDecoder().decode(Json.str(m, "publicKey")), token = Base64.getDecoder().decode(Json.str(m, "verifyToken"));
            String sid = Json.str(m, "serverId"); if (sid == null) sid = "";
            ByteArrayOutputStream h = new ByteArrayOutputStream(); h.write(sid.getBytes(StandardCharsets.UTF_8)); h.write(secret); h.write(pub);
            Http.Res j = Http.postJson(cfg.ep.get("sessionjoin"), Json.of("accessToken", s.mcToken, "selectedProfile", s.uuid, "serverId", mcDigest(h.toByteArray())));
            if (j.status != 204 && !j.ok()) { send(x, Json.of("type", "mc_error", "message", "Session server refused the join (" + j.status + ").")); return; }
            Cipher rsa = Cipher.getInstance("RSA/ECB/PKCS1Padding"); rsa.init(Cipher.ENCRYPT_MODE, KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(pub)));
            byte[] es = rsa.doFinal(secret); rsa.init(Cipher.ENCRYPT_MODE, KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(pub))); byte[] et = rsa.doFinal(token);
            synchronized (x) { x.pending = secret; }
            send(x, Json.of("type", "mc_encrypt_ready", "secret", Base64.getEncoder().encodeToString(es), "token", Base64.getEncoder().encodeToString(et)));
        } catch (Exception e) { send(x, Json.of("type", "mc_error", "message", String.valueOf(e.getMessage()))); }
    }
}
