package app.strata.relay;

import java.io.File;
import java.util.Map;

/** Desktop/test entry point: MS_CLIENT_ID, PORT, RELAY_STORE, RELAY_ENDPOINTS (JSON) from the environment. */
public final class RelayMain {
    public static void main(String[] a) throws Exception {
        Relay.Config c = new Relay.Config();
        c.clientId = System.getenv().getOrDefault("MS_CLIENT_ID", c.clientId);
        c.store = new File(System.getenv().getOrDefault("RELAY_STORE", ".relay-auth.json"));
        String eps = System.getenv("RELAY_ENDPOINTS");
        if (eps != null) for (Map.Entry<String, Object> e : Json.obj(eps).entrySet()) c.ep.put(e.getKey(), String.valueOf(e.getValue()));
        WsServer s = new WsServer(Integer.parseInt(System.getenv().getOrDefault("PORT", "25580")), new Relay(c));
        s.start();
        System.out.println("Strata relay (java) listening on ws://127.0.0.1:" + s.port());
        Thread.currentThread().join();
    }
}
