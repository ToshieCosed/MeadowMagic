package app.strata;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import app.strata.relay.Relay;
import app.strata.relay.WsServer;
import java.io.File;
import java.security.SecureRandom;

public class MainActivity extends Activity {
    private WebView web;
    private WsServer server;
    private String token;

    /** Exposed to the page as window.StrataNative. */
    public class Bridge {
        @JavascriptInterface public String info() { return "{\"port\":" + server.port() + ",\"token\":\"" + token + "\",\"clientId\":\"\"}"; }
    }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        byte[] r = new byte[16]; new SecureRandom().nextBytes(r); StringBuilder sb = new StringBuilder(); for (byte x : r) sb.append(String.format("%02x", x)); token = sb.toString();
        try {
            Relay.Config c = new Relay.Config(); c.token = token; c.store = new File(getFilesDir(), "relay-auth.json");
            server = new WsServer(0, new Relay(c)); server.start();
        } catch (Exception e) { Log.e("Strata", "relay failed", e); }
        web = new WebView(this);
        WebSettings s = web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebChromeClient(new WebChromeClient() { @Override public boolean onConsoleMessage(ConsoleMessage m) { Log.d("StrataJS", m.message()); return true; } });
        if (server != null) web.addJavascriptInterface(new Bridge(), "StrataNative");
        setContentView(web);
        hideBars();
        web.loadUrl("file:///android_asset/strata.html");
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (server != null) server.stop(); web.destroy(); super.onDestroy(); }
}
