package app.strata;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import app.strata.relay.Relay;
import app.strata.relay.WsServer;
import java.io.File;
import java.security.SecureRandom;

public class MainActivity extends Activity {
    private ValueCallback<Uri[]> fileCb;
    @Override protected void onActivityResult(int req, int res, Intent data) {
        if (req != 7701) { super.onActivityResult(req, res, data); return; }
        if (fileCb == null) return; Uri[] r = null;
        if (res == RESULT_OK && data != null) {
            if (data.getClipData() != null) { int n = data.getClipData().getItemCount(); r = new Uri[n]; for (int k = 0; k < n; k++) r[k] = data.getClipData().getItemAt(k).getUri(); }
            else if (data.getData() != null) r = new Uri[] { data.getData() };
        }
        fileCb.onReceiveValue(r); fileCb = null;
    }
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
        s.setUseWideViewPort(true); s.setLoadWithOverviewMode(false); s.setTextZoom(100); s.setSupportZoom(false); s.setBuiltInZoomControls(false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { Log.d("StrataJS", m.message()); return true; }
            @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {   // lets <input type=file> (resource packs, skins, MIDI, images) open Android's picker
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb; Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                if (p != null && p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try { startActivityForResult(Intent.createChooser(i, "Choose a file"), 7701); } catch (Exception e) { fileCb = null; return false; }
                return true;
            }
        });
        if (server != null) web.addJavascriptInterface(new Bridge(), "StrataNative");
        setContentView(web);
        if (android.os.Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        hideBars();
        web.loadUrl("file:///android_asset/strata.html");
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (server != null) server.stop(); web.destroy(); super.onDestroy(); }
}
