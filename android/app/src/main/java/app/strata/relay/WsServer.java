package app.strata.relay;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/** Dependency-free RFC 6455 WebSocket server bound to the loopback interface only. */
public final class WsServer {
    public interface Handler {
        void onOpen(Conn c, String path);
        void onText(Conn c, String text);
        void onBinary(Conn c, byte[] data);
        void onClose(Conn c);
    }

    public static final class Conn {
        private final Socket sock; private final OutputStream out;
        volatile boolean open = true; public Object attach;
        Conn(Socket s) throws IOException { sock = s; out = s.getOutputStream(); }
        synchronized void frame(int op, byte[] p) {
            if (!open) return;
            try {
                ByteArrayOutputStream h = new ByteArrayOutputStream();
                h.write(0x80 | op);
                if (p.length < 126) h.write(p.length);
                else if (p.length < 65536) { h.write(126); h.write(p.length >> 8); h.write(p.length); }
                else { h.write(127); for (int i = 7; i >= 0; i--) h.write((int) (((long) p.length) >> (8 * i))); }
                out.write(h.toByteArray()); out.write(p); out.flush();
            } catch (IOException e) { close(); }
        }
        public void sendText(String t) { frame(1, t.getBytes(StandardCharsets.UTF_8)); }
        public void sendBinary(byte[] b) { frame(2, b); }
        public void close() { open = false; try { sock.close(); } catch (IOException ignored) {} }
    }

    private static final String GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    private final ServerSocket ss; private final Handler h;

    public WsServer(int port, Handler h) throws IOException { this.h = h; ss = new ServerSocket(port, 50, InetAddress.getByName("127.0.0.1")); }

    public int port() { return ss.getLocalPort(); }

    public void start() {
        Thread t = new Thread(() -> {
            while (!ss.isClosed()) {
                try { final Socket s = ss.accept(); Thread c = new Thread(() -> serve(s), "ws-conn"); c.setDaemon(true); c.start(); }
                catch (IOException e) { break; }
            }
        }, "ws-accept");
        t.setDaemon(true); t.start();
    }

    public void stop() { try { ss.close(); } catch (IOException ignored) {} }

    private void serve(Socket s) {
        Conn c = null;
        try {
            s.setTcpNoDelay(true);
            InputStream in = new BufferedInputStream(s.getInputStream());
            StringBuilder head = new StringBuilder(); int last4 = 0;
            while (true) {
                int b = in.read(); if (b < 0) return;
                head.append((char) b); last4 = ((last4 << 8) | b) & 0xffffffff;
                if (last4 == 0x0d0a0d0a) break;
                if (head.length() > 16384) return;
            }
            String[] lines = head.toString().split("\r\n");
            String path = lines[0].split(" ")[1], key = null;
            for (String l : lines) { int i = l.indexOf(':'); if (i > 0 && l.substring(0, i).trim().equalsIgnoreCase("Sec-WebSocket-Key")) key = l.substring(i + 1).trim(); }
            if (key == null) { s.close(); return; }
            String acc = Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-1").digest((key + GUID).getBytes(StandardCharsets.US_ASCII)));
            s.getOutputStream().write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc + "\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            s.getOutputStream().flush();
            c = new Conn(s); h.onOpen(c, path);
            ByteArrayOutputStream msg = new ByteArrayOutputStream(); int msgOp = 0;
            while (c.open) {
                int b0 = in.read(), b1 = in.read(); if (b0 < 0 || b1 < 0) break;
                boolean fin = (b0 & 0x80) != 0; int op = b0 & 0x0f; boolean masked = (b1 & 0x80) != 0; long len = b1 & 0x7f;
                if (len == 126) len = (in.read() << 8) | in.read();
                else if (len == 127) { len = 0; for (int i = 0; i < 8; i++) len = (len << 8) | in.read(); }
                if (len > 32L * 1024 * 1024) break;
                byte[] mask = new byte[4]; if (masked) readFully(in, mask);
                byte[] p = new byte[(int) len]; readFully(in, p);
                if (masked) for (int i = 0; i < p.length; i++) p[i] ^= mask[i & 3];
                if (op == 8) { c.frame(8, new byte[0]); break; }
                if (op == 9) { c.frame(10, p); continue; }
                if (op == 10) continue;
                if (op != 0) { msg.reset(); msgOp = op; }
                msg.write(p);
                if (fin) {
                    byte[] all = msg.toByteArray(); msg.reset();
                    if (msgOp == 1) h.onText(c, new String(all, StandardCharsets.UTF_8)); else h.onBinary(c, all);
                }
            }
        } catch (Exception e) {
            // connection dropped
        } finally {
            if (c != null) { c.close(); h.onClose(c); } else { try { s.close(); } catch (IOException ignored) {} }
        }
    }

    private static void readFully(InputStream in, byte[] b) throws IOException {
        int o = 0;
        while (o < b.length) { int n = in.read(b, o, b.length - o); if (n < 0) throw new IOException("eof"); o += n; }
    }
}
