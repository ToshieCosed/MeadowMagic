package app.strata;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/** Runs while Strata is connected to a Minecraft server, so Android doesn't freeze the app (and the relay inside it) when you switch away. */
public class KeepService extends Service {
    private PowerManager.WakeLock lock;

    @Override public int onStartCommand(Intent in, int flags, int id) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("server") == null) nm.createNotificationChannel(new NotificationChannel("server", "Server connection", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, "server").setSmallIcon(android.R.drawable.stat_sys_upload_done).setContentTitle("Strata is connected to a server")
            .setContentText("Staying connected while you're in another app").setOngoing(true).setContentIntent(open).build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC); else startForeground(1, n);
        if (lock == null) { lock = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "strata:server"); lock.setReferenceCounted(false); lock.acquire(6 * 60 * 60 * 1000L); }   // the CPU stays up with the screen off too (at most 6 hours)
        return START_NOT_STICKY;
    }

    @Override public void onDestroy() { if (lock != null && lock.isHeld()) lock.release(); lock = null; super.onDestroy(); }
    @Override public IBinder onBind(Intent i) { return null; }
}
