package com.restaurant.admin

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class OrderForegroundService : Service() {

    private var isRunning = false
    private var workerThread: Thread? = null
    private val notifiedSessions = mutableSetOf<String>()

    companion object {
        const val FOREGROUND_CHANNEL_ID = "kitchen_terminal_foreground_channel"
        const val ORDERS_CHANNEL_ID = "orders_channel"
        const val NOTIFICATION_ID = 9001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isRunning) {
            isRunning = true
            startForegroundNotification()
            startOrderPolling()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        workerThread?.interrupt()
        workerThread = null
        super.onDestroy()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Low-priority channel for persistent service status
            val fgChannel = NotificationChannel(
                FOREGROUND_CHANNEL_ID,
                "Kitchen Terminal Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the Kitchen Terminal active to receive live orders"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(fgChannel)

            // High-priority channel for order alerts
            val ordersChannel = NotificationChannel(
                ORDERS_CHANNEL_ID,
                "New Orders & Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts for incoming restaurant orders and customer calls"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(ordersChannel)
        }
    }

    private fun startForegroundNotification() {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        val notification = NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID)
            .setContentTitle("Kitchen Terminal Active")
            .setContentText("Listening for live table and takeaway orders")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startOrderPolling() {
        workerThread = thread(start = true, name = "OrderPollingThread") {
            while (isRunning) {
                try {
                    checkOrders()
                } catch (e: Exception) {
                    // Suppress and retry next cycle
                }

                try {
                    Thread.sleep(3500) // Poll every 3.5 seconds
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
    }

    private fun checkOrders() {
        val prefs = getSharedPreferences("restaurant_admin_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null) ?: return
        val tenantId = prefs.getString("tenant_id", "") ?: ""
        var serverUrl = prefs.getString("server_url", "") ?: ""

        if (serverUrl.isBlank() || token.isBlank()) return

        if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
            serverUrl = "http://$serverUrl"
        }
        serverUrl = serverUrl.trimEnd('/')

        val endpoint = "$serverUrl/api/v1/sessions"
        val url = URL(endpoint)
        val conn = url.openConnection() as HttpURLConnection

        try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.setRequestProperty("Authorization", "Bearer $token")
            if (tenantId.isNotBlank()) {
                conn.setRequestProperty("x-tenant-id", tenantId)
            }

            if (conn.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val responseStr = reader.use { it.readText() }
                parseAndTriggerOrders(responseStr)
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun parseAndTriggerOrders(jsonString: String) {
        // If app is currently visible to staff in foreground, let React Native handle UI/sound
        if (BackgroundAlertModule.isAppForeground) {
            return
        }

        try {
            val sessionsArray = JSONArray(jsonString)
            val currentActiveSessionIds = mutableSetOf<String>()

            for (i in 0 until sessionsArray.length()) {
                val session = sessionsArray.getJSONObject(i)
                val sessionId = session.optString("id")
                val isCompleted = session.optBoolean("isCompleted", false)

                if (isCompleted || sessionId.isBlank()) continue
                currentActiveSessionIds.add(sessionId)

                val needsAttention = session.optBoolean("needsAttention", false)
                val attentionNote = session.optString("attentionNote", "")
                val tableNumber = session.optString("tableNumber", "Order")
                val isTakeaway = session.optString("orderType", "").equals("takeaway", ignoreCase = true) ||
                                 tableNumber.equals("takeaway", ignoreCase = true)

                // Check orders in this session
                val ordersArray = session.optJSONArray("orders") ?: JSONArray()
                var hasPendingOrder = false
                var totalItemsCount = 0
                val itemNames = mutableListOf<String>()

                for (j in 0 until ordersArray.length()) {
                    val order = ordersArray.getJSONObject(j)
                    val status = order.optString("status", "").lowercase()
                    if (status == "pending") {
                        hasPendingOrder = true
                    }
                    val itemsArray = order.optJSONArray("items") ?: JSONArray()
                    for (k in 0 until itemsArray.length()) {
                        val item = itemsArray.getJSONObject(k)
                        totalItemsCount += item.optInt("quantity", 1)
                        if (itemNames.size < 3) {
                            itemNames.add("${item.optInt("quantity", 1)}x ${item.optString("name", "")}")
                        }
                    }
                }

                // If this session has a pending order or waiter attention call, and we haven't alerted it yet
                if (hasPendingOrder || needsAttention) {
                    if (!notifiedSessions.contains(sessionId)) {
                        notifiedSessions.add(sessionId)

                        var title = if (isTakeaway) "🛍️ New Takeaway Order" else "🍽️ New Order - Table $tableNumber"
                        var message = if (itemNames.isNotEmpty()) {
                            val summary = itemNames.joinToString(", ")
                            val extra = if (totalItemsCount > itemNames.size) " +more" else ""
                            "$summary$extra"
                        } else {
                            "New order received. Tap to view."
                        }

                        if (needsAttention && attentionNote.isNotBlank()) {
                            title = "⚠️ Table $tableNumber Needs Attention"
                            message = attentionNote
                        }

                        sendOrderAlert(sessionId, title, message)
                    }
                }
            }

            // Clean up old sessions that are no longer active
            notifiedSessions.retainAll(currentActiveSessionIds)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun sendOrderAlert(sessionId: String, title: String, message: String) {
        try {
            // 1. Wake up screen
            wakeUpScreen()

            // 2. Build high priority heads-up notification
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("sessionId", sessionId)
                putExtra("action", "OPEN_ORDER")
            }

            val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val notifId = (sessionId.hashCode() and 0x7FFFFFFF)
            val pendingIntent = PendingIntent.getActivity(this, notifId, intent, flag)

            val builder = NotificationCompat.Builder(this, ORDERS_CHANNEL_ID)
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

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(notifId, builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun wakeUpScreen() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null) {
                @Suppress("DEPRECATION")
                val wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                    "RestaurantAdmin:ForegroundWakeLock"
                )
                wakeLock.acquire(15 * 1000L) // 15 seconds
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

