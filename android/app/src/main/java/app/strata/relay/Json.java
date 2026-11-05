package app.strata.relay;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Minimal JSON reader/writer (no dependencies, so the relay core also runs on a plain JVM for tests). */
final class Json {
    private Json() {}

    static Object parse(String s) { return new P(s).val(); }

    @SuppressWarnings("unchecked")
    static Map<String, Object> obj(String s) { Object o = parse(s); return o instanceof Map ? (Map<String, Object>) o : new LinkedHashMap<>(); }

    static String str(Map<String, Object> m, String k) { Object o = m == null ? null : m.get(k); return o == null ? null : String.valueOf(o); }

    static long num(Map<String, Object> m, String k, long d) { Object o = m == null ? null : m.get(k); return o instanceof Number ? ((Number) o).longValue() : d; }

    @SuppressWarnings("unchecked")
    static Map<String, Object> map(Map<String, Object> m, String k) { Object o = m == null ? null : m.get(k); return o instanceof Map ? (Map<String, Object>) o : null; }

    static Map<String, Object> of(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    static String write(Object o) { StringBuilder b = new StringBuilder(); w(b, o); return b.toString(); }

    private static void w(StringBuilder b, Object o) {
        if (o == null) b.append("null");
        else if (o instanceof String) {
            b.append('"');
            for (char c : ((String) o).toCharArray()) {
                switch (c) {
                    case '"': b.append("\\\""); break;
                    case '\\': b.append("\\\\"); break;
                    case '\n': b.append("\\n"); break;
                    case '\r': b.append("\\r"); break;
                    case '\t': b.append("\\t"); break;
                    default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
                }
            }
            b.append('"');
        } else if (o instanceof Map) {
            b.append('{');
            boolean f = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) { if (!f) b.append(','); f = false; w(b, String.valueOf(e.getKey())); b.append(':'); w(b, e.getValue()); }
            b.append('}');
        } else if (o instanceof List) {
            b.append('[');
            boolean f = true;
            for (Object e : (List<?>) o) { if (!f) b.append(','); f = false; w(b, e); }
            b.append(']');
        } else b.append(String.valueOf(o));
    }

    private static final class P {
        final String s; int i = 0;
        P(String s) { this.s = s; }
        void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
        Object val() {
            ws(); char c = s.charAt(i);
            if (c == '{') {
                i++; Map<String, Object> m = new LinkedHashMap<>(); ws();
                if (s.charAt(i) == '}') { i++; return m; }
                for (;;) { ws(); String k = str(); ws(); i++; m.put(k, val()); ws(); char d = s.charAt(i++); if (d == '}') return m; }
            }
            if (c == '[') {
                i++; List<Object> l = new ArrayList<>(); ws();
                if (s.charAt(i) == ']') { i++; return l; }
                for (;;) { l.add(val()); ws(); char d = s.charAt(i++); if (d == ']') return l; }
            }
            if (c == '"') return str();
            if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
            if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
            if (s.startsWith("null", i)) { i += 4; return null; }
            int j = i;
            while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
            String n = s.substring(j, i);
            if (n.contains(".") || n.contains("e") || n.contains("E")) return Double.valueOf(n);
            return Long.valueOf(n);
        }
        String str() {
            i++; StringBuilder b = new StringBuilder();
            for (;;) {
                char c = s.charAt(i++);
                if (c == '"') return b.toString();
                if (c == '\\') {
                    char e = s.charAt(i++);
                    switch (e) {
                        case 'n': b.append('\n'); break;
                        case 't': b.append('\t'); break;
                        case 'r': b.append('\r'); break;
                        case 'b': b.append('\b'); break;
                        case 'f': b.append('\f'); break;
                        case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                        default: b.append(e);
                    }
                } else b.append(c);
            }
        }
    }
}
