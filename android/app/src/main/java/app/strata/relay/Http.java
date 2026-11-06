package app.strata.relay;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Tiny HTTP client for the Microsoft / Xbox / Minecraft endpoints. */
final class Http {
    private Http() {}

    static final class Res {
        final int status; final String text;
        Res(int status, String text) { this.status = status; this.text = text; }
        boolean ok() { return status >= 200 && status < 300; }
        Map<String, Object> json() { try { return Json.obj(text); } catch (RuntimeException e) { return Json.of(); } }
    }

    static Res postForm(String url, Map<String, String> form) throws IOException {
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, String> e : form.entrySet()) { if (b.length() > 0) b.append('&'); b.append(URLEncoder.encode(e.getKey(), "UTF-8")).append('=').append(URLEncoder.encode(e.getValue(), "UTF-8")); }
        return send("POST", url, "application/x-www-form-urlencoded", b.toString(), null);
    }

    static Res postJson(String url, Object body) throws IOException { return send("POST", url, "application/json", Json.write(body), null); }

    static Res get(String url, String bearer) throws IOException { return send("GET", url, null, null, bearer); }

    /** Download raw bytes (server resource packs), following up to 5 redirects, capped at 100 MB. */
    static byte[] getBytes(String url) throws IOException {
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(60000);
            c.setRequestProperty("User-Agent", "Strata-Compat");
            int st = c.getResponseCode();
            if (st >= 300 && st < 400 && c.getHeaderField("Location") != null) { url = new URL(new URL(url), c.getHeaderField("Location")).toString(); c.disconnect(); continue; }
            if (st >= 400) { c.disconnect(); throw new IOException("HTTP " + st); }
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) { byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) { bo.write(buf, 0, n); if (bo.size() > 100 << 20) throw new IOException("pack too large"); } }
            c.disconnect(); return bo.toByteArray();
        }
        throw new IOException("too many redirects");
    }

    private static Res send(String method, String url, String type, String body, String bearer) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method); c.setConnectTimeout(15000); c.setReadTimeout(30000);
        c.setRequestProperty("Accept", "application/json");
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            c.setDoOutput(true); c.setRequestProperty("Content-Type", type);
            try (OutputStream o = c.getOutputStream()) { o.write(body.getBytes(StandardCharsets.UTF_8)); }
        }
        int st = c.getResponseCode();
        InputStream in = st >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        if (in != null) { byte[] buf = new byte[4096]; int n; while ((n = in.read(buf)) > 0) bo.write(buf, 0, n); in.close(); }
        c.disconnect();
        return new Res(st, new String(bo.toByteArray(), StandardCharsets.UTF_8));
    }
}
