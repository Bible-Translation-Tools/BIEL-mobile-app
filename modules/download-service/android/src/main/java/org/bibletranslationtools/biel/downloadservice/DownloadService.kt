package org.bibletranslationtools.biel.downloadservice

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

data class DownloadNotificationContent(
  val channelId: String,
  val title: String,
  val body: String,
  val percent: Int,
)

/**
 * Foreground service (type `dataSync`) that runs while a download is in progress.
 *
 * It does no work itself: the downloads run in JavaScript. Its job is to keep the app process
 * from being frozen in the background, and to own the download progress notification, which
 * Android requires every foreground service to show.
 *
 * State is static because JavaScript drives it through [show] / [stop] from the module, which
 * has no reference to the service instance.
 */
class DownloadService : Service() {
  companion object {
    private const val TAG = "BielDownloadService"
    private const val NOTIFICATION_ID = 0xB1E1

    private var instance: DownloadService? = null
    private var startRequested = false
    private var content: DownloadNotificationContent? = null

    @Synchronized
    fun show(context: Context, next: DownloadNotificationContent) {
      content = next

      val running = instance
      if (running != null) {
        running.post(next)
        return
      }
      if (startRequested) return // onStartCommand picks up the latest content.

      try {
        ContextCompat.startForegroundService(
          context.applicationContext,
          Intent(context.applicationContext, DownloadService::class.java),
        )
        startRequested = true
      } catch (e: Exception) {
        // E.g. ForegroundServiceStartNotAllowedException when the app is already in the
        // background. The download still runs; it just isn't protected from being frozen.
        Log.w(TAG, "Could not start download service", e)
      }
    }

    @Synchronized
    fun stop() {
      content = null
      startRequested = false
      instance?.finish()
      // If the start is still pending, onStartCommand sees no content and stops right away.
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    synchronized(DownloadService) {
      startRequested = false
      val current = content
      // Android requires startForeground after startForegroundService, even when the
      // download already finished, so promote first and stop right after if there is nothing to show.
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        buildNotification(current ?: DownloadNotificationContent(channelIdOrDefault(), "", "", 0)),
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        } else {
          0
        },
      )
      // Only a promoted service is visible to show()/stop(), so stop() can never race ahead of
      // startForeground (which would crash with ForegroundServiceDidNotStartInTimeException).
      instance = this
      if (current == null) finish()
    }
    return START_NOT_STICKY
  }

  /** Android 15+: the daily `dataSync` time limit was reached. */
  override fun onTimeout(startId: Int, fgsType: Int) {
    Log.w(TAG, "Download service reached the dataSync time limit; stopping")
    synchronized(DownloadService) {
      startRequested = false
      finish()
    }
  }

  override fun onDestroy() {
    synchronized(DownloadService) {
      if (instance === this) instance = null
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  /** Called with the lock held. Detaches first so a later [show] starts a fresh service. */
  private fun finish() {
    if (instance === this) instance = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  @SuppressLint("MissingPermission") // Denied permission is caught below.
  private fun post(next: DownloadNotificationContent) {
    try {
      NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, buildNotification(next))
    } catch (e: SecurityException) {
      // POST_NOTIFICATIONS denied (Android 13+). The service keeps running without a visible notification.
      Log.w(TAG, "Could not update download notification", e)
    }
  }

  private fun channelIdOrDefault(): String = content?.channelId ?: "book-downloads"

  private fun buildNotification(next: DownloadNotificationContent): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    return NotificationCompat.Builder(this, next.channelId)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(next.title)
      .setContentText(next.body)
      .setProgress(100, next.percent.coerceIn(0, 100), false)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }
}
