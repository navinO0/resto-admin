package com.restaurant.admin

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import android.os.Environment

class BackgroundAlertModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName(): String = "BackgroundAlertModule"

    companion object {
        var isAppForeground: Boolean = true
        var lastClickedSessionId: String? = null
        var instance: BackgroundAlertModule? = null

        fun handleIntent(intent: Intent) {
            val sessionId = intent.getStringExtra("sessionId")
            if (!sessionId.isNullOrEmpty()) {
                lastClickedSessionId = sessionId
                instance?.emitOpenOrderEvent(sessionId)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "orders_channel"
            val channelName = "New Orders & Alerts"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(channelId, channelName, importance).apply {
                description = "Alerts for incoming restaurant orders and customer calls"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun emitOpenOrderEvent(sessionId: String) {
        try {
            if (reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap().apply {
                    putString("sessionId", sessionId)
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNotificationOpenOrder", params)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun getInitialSessionId(promise: Promise) {
        val s = lastClickedSessionId
        lastClickedSessionId = null
        promise.resolve(s)
    }

    @ReactMethod
    fun showOrderNotification(id: Double, title: String, message: String, sessionId: String) {
        try {
            createNotificationChannel()

            val intent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("sessionId", sessionId)
                putExtra("action", "OPEN_ORDER")
            }

            val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getActivity(
                reactContext,
                id.toInt(),
                intent,
                flag
            )

            val builder = NotificationCompat.Builder(reactContext, "orders_channel")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(id.toInt(), builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun cancelNotification(id: Double) {
        try {
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(id.toInt())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun wakeUpScreen() {
        try {
            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null) {
                @Suppress("DEPRECATION")
                val wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                    "RestaurantAdmin:AlertWakeLock"
                )
                wakeLock.acquire(15 * 1000L) // 15 seconds to wake device up
            }

            val activity = reactContext.currentActivity
            if (activity is Activity) {
                activity.runOnUiThread {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        activity.setShowWhenLocked(true)
                        activity.setTurnScreenOn(true)
                        val keyguardManager = activity.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                        keyguardManager?.requestDismissKeyguard(activity, null)
                    } else {
                        @Suppress("DEPRECATION")
                        activity.window?.addFlags(
                            android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                            android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                            android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                            android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val isIgnored = powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
                promise.resolve(isIgnored)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private val prefs by lazy {
        reactContext.getSharedPreferences("restaurant_admin_prefs", Context.MODE_PRIVATE)
    }

    @ReactMethod
    fun getStorageItem(key: String, promise: Promise) {
        try {
            val value = prefs.getString(key, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setStorageItem(key: String, value: String, promise: Promise) {
        try {
            prefs.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun removeStorageItem(key: String, promise: Promise) {
        try {
            prefs.edit().remove(key).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun clearStorage(promise: Promise) {
        try {
            prefs.edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startForegroundService() {
        try {
            val intent = Intent(reactContext, OrderForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopForegroundService() {
        try {
            val intent = Intent(reactContext, OrderForegroundService::class.java)
            reactContext.stopService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ── In-App Auto-Updater Methods ──────────────────────────────────────────

    @ReactMethod
    fun getAppVersion(promise: Promise) {
        try {
            val pInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            val map = Arguments.createMap().apply {
                putString("versionName", pInfo.versionName)
                val vCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    pInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode.toLong()
                }
                putDouble("versionCode", vCode.toDouble())
                putString("packageName", reactContext.packageName)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_VERSION", e.message)
        }
    }

    @ReactMethod
    fun checkInstallPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(reactContext.packageManager.canRequestPackageInstalls())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestInstallPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun getUpdateApkFile(): File {
        val dir = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: reactContext.cacheDir
        return File(dir, "RestaurantAdmin-update.apk")
    }

    private fun emitUpdateProgress(progress: Int, current: Long, total: Long) {
        try {
            if (reactContext.hasActiveReactInstance()) {
                val map = Arguments.createMap().apply {
                    putInt("progress", progress)
                    putDouble("current", current.toDouble())
                    putDouble("total", total.toDouble())
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onUpdateProgress", map)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun downloadAndInstallApk(downloadUrl: String, promise: Promise) {
        Thread {
            try {
                val apkFile = getUpdateApkFile()
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                val url = URL(downloadUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 15000
                conn.readTimeout = 60000
                conn.instanceFollowRedirects = true
                conn.connect()

                val responseCode = conn.responseCode
                if (responseCode !in 200..299) {
                    promise.reject("ERR_DOWNLOAD", "Server responded with HTTP $responseCode")
                    return@Thread
                }

                val totalLength = conn.contentLength.toLong()
                val inputStream = BufferedInputStream(conn.inputStream)
                val outputStream = FileOutputStream(apkFile)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalRead = 0L
                var lastProgress = -1

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalRead += bytesRead
                    val progress = if (totalLength > 0) {
                        ((totalRead * 100) / totalLength).toInt()
                    } else {
                        -1
                    }
                    if (progress != lastProgress) {
                        lastProgress = progress
                        emitUpdateProgress(progress, totalRead, totalLength)
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()
                conn.disconnect()

                emitUpdateProgress(100, totalRead, totalLength)

                // Launch package installer
                installApkFile(apkFile, promise)

            } catch (e: Exception) {
                e.printStackTrace()
                promise.reject("ERR_DOWNLOAD", e.message)
            }
        }.start()
    }

    @ReactMethod
    fun installDownloadedApk(promise: Promise) {
        try {
            val apkFile = getUpdateApkFile()
            if (!apkFile.exists() || apkFile.length() == 0L) {
                promise.reject("ERR_FILE_NOT_FOUND", "No downloaded update file found. Please download again.")
                return
            }
            installApkFile(apkFile, promise)
        } catch (e: Exception) {
            promise.reject("ERR_INSTALL", e.message)
        }
    }

    private fun installApkFile(apkFile: File, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!reactContext.packageManager.canRequestPackageInstalls()) {
                    requestInstallPermission()
                    promise.reject("PERMISSION_REQUIRED", "Permission required to install update. Please enable 'Allow from this source' and return to install.")
                    return
                }
            }

            val apkUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("ERR_INSTALL", e.message)
        }
    }
}
