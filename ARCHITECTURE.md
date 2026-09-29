# Restaurant Admin Mobile Application — Master Technical Architecture & Specification

> **Document Status**: Production Architecture & Engineering Blueprint (Fully Implemented & Verified)  
> **Author**: Lead Mobile Architect & DeepMind Engineering Team  
> **Target OS**: Android 10 to Android 15+ (API Levels 29–35)  
> **Target Devices**: Android Smartphones, Kitchen Tablets, Dedicated POS Terminals  
> **Backend Integration**: Fastify REST API & Socket.io Real-Time Event Stream (Port 4000)  
> **Core Package**: `com.restaurant.admin` (Expo SDK 52 / React Native 0.76+)

---

## 1. Executive Summary & Core Operational Architecture

The Restaurant Admin Mobile application is a production-grade, merchant terminal designed for high-intensity restaurant environments (inspired by Zomato Merchant, Swiggy Partner, Uber Eats Orders, and Toast POS). It operates as an offline-resilient, multi-tenant kitchen display system (KDS) and point-of-sale (POS) hub.

### Core Architectural Pillars
1. **Zero-Miss Background Alerting (Continuous Loud Ring)**:
   - When new orders or waiter calls arrive, the device wakes up, sounds an alarm on the `ALARM` audio stream, and displays heads-up high-priority notifications even when the app is minimized or the screen is locked.
2. **Burst / Rapid-Fire Order Queue Engine**:
   - Manages sudden bursts of simultaneous orders without state overwrites or alert loss. An in-memory queue coordinates audio ringing, individual Android notifications, and carousel pagination.
3. **Permanent Customer Details Strip**:
   - Customer identifiers (Name, Mobile number with 1-tap dialer, Delivery address with Google Maps integration, Table PIN) remain visible through every order lifecycle state (`pending` $\rightarrow$ `kitchen` $\rightarrow$ `ready` $\rightarrow$ `served` $\rightarrow$ `paid`).
4. **Anytime Order & Table Cancellation**:
   - Staff can cancel individual orders or entire tables at any stage with explicit destructive confirmation alerts, synchronizing state instantly across backend, admin terminal, and customer web applications.
5. **Multi-Tenant Isolation & Staff Safety**:
   - Strictly scoped credentials and socket channels prevent cross-tenant data leaks. Generic non-technical vocabulary enables seamless adoption by kitchen cooks and floor staff.

---

## 2. Technology Stack & Architectural Decision Records (ADRs)

| Layer | Selected Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Framework** | **React Native (Expo SDK 52, Android Native Prebuild)** | React Native 0.76+ with TurboModules provides zero JSON serialization overhead and direct access to native Android Kotlin APIs. |
| **Native Module** | **Custom Kotlin `BackgroundAlertModule`** | Provides reliable Android 13/14/15 `NotificationManager` integration, `IMPORTANCE_HIGH` heads-up notifications, full-screen intents, and deep-link intent routing. |
| **State Management** | **Zustand** | Lightweight, predictable state store coordinating auth, session collections, menu items, active filters, and the burst order queue. |
| **Real-Time Engine** | **Socket.io Client (`socket.io-client` v4)** | Room-based event broadcasting (`tenantId` rooms), auto-reconnect with jitter backoff, and heartbeat health checks. |
| **Audio Engine** | **Expo Audio (`expo-audio`) + Native SoundPool** | Looping playback on `USAGE_ALARM` with audio focus management (`AUDIOFOCUS_GAIN_TRANSIENT`) to cut through loud kitchen noise. |
| **Persistence** | **AsyncStorage / MMKV (`@react-native-async-storage/async-storage`)** | Fast, secure key-value storage for JWT tokens, active tenant IDs, server URLs, and remembered staff emails. |
| **Network Client** | **Axios Interceptor Pipeline** | Dynamic backend resolution, automatic `x-tenant-id` header injection, and bearer token lifecycle management. |

---

## 3. Detailed Component & System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FASTIFY BACKEND (PORT 4000)                              │
│                                                                                        │
│   ┌────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐   │
│   │  /api/v1/sessions  │     │     /api/v1/menu      │     │  fastify-socket.io    │   │
│   │  (Orders & Billing)│     │  (Inventory & Items)  │     │  (Tenant-Scoped Rooms)│   │
│   └─────────▲──────────┘     └───────────▲───────────┘     └───────────┬───────────┘   │
└─────────────┼────────────────────────────┼─────────────────────────────┼───────────────┘
              │ REST (Axios + Tenant ID)   │ REST                        │ Socket.io
              │                            │                             │ (order:new, etc)
┌─────────────▼────────────────────────────▼─────────────────────────────▼───────────────┐
│                                 ANDROID ADMIN APP ENGINE                               │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      Event Dispatcher & Connection Manager                     │   │
│   │    • Auto-reconnect with exponential backoff    • Heartbeat ping monitoring    │   │
│   └──────────────────────┬─────────────────────────────────┬───────────────────────┘   │
│                          │                                 │                           │
│   ┌──────────────────────▼───────┐                  ┌──────▼───────────────────────┐   │
│   │   Background Alert Engine    │                  │       Zustand Store          │   │
│   │  • Kotlin BackgroundModule   │                  │  • activeSessions            │   │
│   │  • Notification Channel      │                  │  • incomingQueue []          │   │
│   │  • Heads-Up Notifications    │                  │  • incomingQueueIndex        │   │
│   │  • Looping Alarm Sound       │                  │  • menuItems & categories    │   │
│   │  • PendingIntent Deep-Links  │                  │  • tables & operational gates│   │
│   └──────────────────────┬───────┘                  └──────────────┬───────────────┘   │
│                          │                                         │                   │
│   ┌──────────────────────▼─────────────────────────────────────────▼────────────────┐   │
│   │                              User Interface Layer                              │   │
│   │  • IncomingOrderModal (Queue Carousel, Customer Info, Accept/Decline/Silence)  │   │
│   │  • LiveOrdersScreen (Status filters: All / Pending / Kitchen / Ready / Served) │   │
│   │  • OrderCard (Permanent Customer Strip, Item Checklists, Cancel Order Anytime) │   │
│   │  • TablesScreen (QR Code cards, Table Capacities, Allow Ordering Toggles)      │   │
│   │  • MenuScreen (1-tap Stock Toggles, Edit Dish Modal, Special Tag)              │   │
│   │  • SettingsScreen (Operational Gates, Accepted Pincodes, Bluetooth Printer)   │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep-Dive: Native Android Alerting & Background Reliability

### 4.1. Custom Kotlin Module (`BackgroundAlertModule.kt`)
To guarantee delivery on Android 13, 14, and 15 without relying on heavy external dependencies, a native TurboModule bridge is implemented:
- **Package**: `com.restaurantadmin.BackgroundAlertModule`
- **Notification Channel**: `restaurant_orders_channel`
  - Name: `Order Alerts`
  - Importance: `NotificationManager.IMPORTANCE_HIGH`
  - Audio Attributes: `USAGE_NOTIFICATION_RINGTONE`, default notification sound
  - Vibration Pattern: `longArrayOf(0, 500, 200, 500)`
- **Intent Deep-Linking (`PendingIntent`)**:
  - Attached with `FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE`
  - Passes extra `orderSessionId` to `MainActivity`
  - `MainActivity.kt` overrides `onNewIntent(intent: Intent)` to route intents while in foreground or background:
    ```kotlin
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val sessionId = intent.getStringExtra("orderSessionId")
        if (!sessionId.isNullOrEmpty()) {
            BackgroundAlertModule.sendNotificationEvent(sessionId)
        }
    }
    ```
- **Cold-Start Handler**:
  - `getInitialSessionId(promise: Promise)` allows JavaScript to inspect launch intent parameters on cold startup.

### 4.2. Sound & Vibration Alarm Pipeline
- Managed by `alarmService.ts` via `expo-audio`.
- Plays looping urgent chime on `AUDIOFOCUS_GAIN_TRANSIENT`.
- Automatically terminates when all orders in `incomingQueue` are accepted, declined, or silenced.

---

## 5. Burst / Rapid-Fire Order Queue Implementation

### 5.1. The Problem
In commercial kitchens, orders do not arrive sequentially with human delays. During peak rush hours, 3–10 orders can trigger within seconds via WebSockets. If the state store uses a single scalar (`incomingAlert: TableSession | null`), subsequent orders overwrite earlier orders, dropping alert modals and confusing staff.

### 5.2. Queue Architecture (`useAdminStore.ts`)
```typescript
interface AdminState {
  // Burst Queue State
  incomingQueue: TableSession[];
  incomingQueueIndex: number;
  incomingAlert: TableSession | null;

  // Actions
  triggerIncomingOrderAlarm: (session: TableSession) => void;
  nextIncomingAlert: () => void;
  prevIncomingAlert: () => void;
  setIncomingAlertIndex: (index: number) => void;
  dismissIncomingAlert: (sessionId?: string) => void;
  acceptOrder: (sessionId: string, orderId?: string) => Promise<void>;
  declineOrder: (sessionId: string, orderId?: string) => Promise<void>;
  cancelOrder: (sessionId: string, orderId?: string) => Promise<void>;
}
```

### 5.3. Hashed Notification IDs
Each notification requires a unique integer ID to prevent Android from overwriting notifications from previous orders:
```typescript
export function getNotificationId(sessionId: string): number {
  let hash = 0;
  const str = sessionId || 'default';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647) || 1001;
}
```

### 5.4. Queue State Transitions
1. **Arrival (`triggerIncomingOrderAlarm`)**:
   - Check if `session.id` already exists in `incomingQueue`.
   - If found, update order details in-place. If new, append to `incomingQueue`.
   - Update `incomingAlert = incomingQueue[incomingQueueIndex]`.
   - Post independent Android heads-up notification via `BackgroundAlertModule.showOrderNotification(...)`.
   - Start audio alarm if not already ringing.
2. **Carousel Navigation (`IncomingOrderModal.tsx`)**:
   - When `incomingQueue.length > 1`:
     - Displays urgent header: `🚨 X ORDERS WAITING`.
     - Controls: `< Prev` and `Next >` navigation (`Order X of Y`).
     - "Mute Sound" button silences the audible ring while keeping the order on-screen.
     - "Skip" advances to the next order without dismissing.
3. **Resolution (`acceptOrder` / `declineOrder`)**:
   - Removes the handled session from `incomingQueue`.
   - Cancels the specific Android notification for that `sessionId`.
   - Recalculates `incomingQueueIndex` (`Math.min(currentIndex, queue.length - 1)`).
   - If queue has remaining orders $\rightarrow$ modal immediately switches to the next waiting order.
   - If queue is empty $\rightarrow$ alarm stops and modal dismisses cleanly.

---

## 6. Permanent Customer Details Strip Architecture

### 6.1. Visibility Invariant
Customer information must **never** disappear after order acceptance. In commercial environments, kitchen and delivery dispatchers constantly need customer names, direct phone numbers, and addresses while food is preparing or ready.

### 6.2. Visual Hierarchy on `OrderCard.tsx`
Immediately below `cardHeader`, `OrderCard` renders a permanent metadata strip active across **all** states:
1. **Customer Identity**:
   - Dine-in: `👤 [Customer Name(s)]` (or `Dine-in Guest` if anonymous).
   - Takeaway: `👤 [Customer Name(s)]` (or `Takeaway Customer`).
2. **Direct Dialer Button**:
   - Renders `📞 +91 XXXXXXXXXX [CALL]`.
   - Tapping invokes Android's native dialer via `Linking.openURL('tel:${mobileNumber}')`.
3. **Dining Location & Delivery Details**:
   - Takeaway: Shows `DELIVERY` or `IN-STORE PICKUP` badge. If address is present, displays full address with a clickable `[MAP]` pill invoking `https://maps.google.com/?q=${encodedAddress}`.
   - Dine-in: Displays `Table ${tableNumber}` and `PIN: ${joinPin}` for table synchronization.
4. **Order Timestamp**:
   - Formatted local time: `MMM DD, hh:mm A` with elapsed items count.

---

## 7. Anytime Order & Session Cancellation Architecture

### 7.1. Granular Order-Level Cancellation
Inside each order card:
- Status action row: `[KITCHEN]  [READY]  [SERVED]  [CANCEL]`.
- Pressing `CANCEL` triggers an Android system alert:
  > **Cancel Order?**  
  > *Are you sure you want to cancel Order #XXXX? The customer will be notified that this order was cancelled.*  
  > `[Keep Order]` / `[Yes, Cancel Order (Destructive)]`
- On confirmation, calls:
  `PATCH /api/v1/sessions/:sessionId/orders/:orderId/status` with `{ status: 'cancelled' }`.
- Status chip turns red (`CANCELLED`) and action button indicates permanent cancellation.

### 7.2. Session-Level Table Cancellation
In the card footer:
- Staff can tap `[Cancel Table]` / `[Cancel Order]` with confirmation:
  > **Cancel Table / Order?**  
  > *Are you sure you want to cancel this entire table session? All active items will be cancelled.*  
  > `[Keep Active]` / `[Yes, Cancel Entirely]`
- Invokes `cancelOrder(session.id)`, updating all child orders to `cancelled` and marking session completed.

### 7.3. Cross-Stack Synchronization
```
┌─────────────────────────────────┐
│   Admin Mobile App (Staff)      │
│   Taps "CANCEL" on Order/Table  │
└────────────────┬────────────────┘
                 │ PATCH /api/v1/sessions/:id/orders/:orderId/status { status: 'cancelled' }
                 ▼
┌─────────────────────────────────┐
│       Fastify Backend           │
│   1. Updates Order & Items to   │
│      'cancelled'                │
│   2. If all orders cancelled:   │
│      session.isCompleted = true │
│   3. Broadcasts via Socket.io:  │
│      'session:updated'          │
└────────────────┬────────────────┘
                 │ WebSocket Broadcast
                 ▼
┌─────────────────────────────────┐
│   Customer Frontend Web App     │
│   ActiveSessionBanner.tsx       │
│   1. Receives 'session:updated' │
│   2. Detects isAllCancelled     │
│   3. Displays Red Cancelled UI  │
│      with reason & Reset action │
└─────────────────────────────────┘
```

---

## 8. Restaurant Staff UX & Multi-Tenant Security Standards

1. **Non-Technical Language**:
   - Replaced development terms ("Superadmin", "Tenant", "Instance", "Payload", "Cluster") with staff terminology:
     - Header: `Kitchen Admin — Live Kitchen & POS Terminal`
     - Screen Badge: `RESTAURANT STAFF TERMINAL`
     - Form: `STAFF EMAIL ADDRESS`, `PASSWORD`, `SIGN IN`
     - Card Actions: `Accept to Kitchen`, `Close Table`, `Close Order`
2. **Zero Cross-Tenant Leakage**:
   - Hardcoded test credentials have been completely purged.
   - On device launch, form defaults are strictly empty.
   - Once staff logs in successfully, the app saves **only their email** in persistent storage (`saved_staff_email`), enabling convenient auto-fill without leaking credentials across outlets.
3. **Operational Controls (`SettingsScreen.tsx` & `TablesScreen.tsx`)**:
   - `Accepting Orders` master kill-switch.
   - Independent `Accepting Online Orders` and `Accepting Dine-in Table Orders` gates.
   - Serviceable Delivery Pincodes whitelist editor.
   - Table QR code regenerator and customer scan preview.

---

## 9. File Structure of Implemented Codebase

```
restaurant-admin-mobile/
├── android/
│   ├── app/
│   │   ├── build.gradle                 # SDK 34, namespace com.restaurant.admin
│   │   └── src/main/
│   │       ├── AndroidManifest.xml      # Full-screen intent, WAKE_LOCK, POST_NOTIFICATIONS
│   │       ├── java/com/restaurant/admin/
│   │       │   └── MainActivity.kt      # SingleTop intent listener & Kotlin bridge
│   │       └── java/com/restaurantadmin/
│   │           ├── BackgroundAlertModule.kt   # Native notification manager & heads-up alerts
│   │           └── BackgroundAlertPackage.kt  # TurboModule ReactPackage export
├── src/
│   ├── api/
│   │   └── client.ts                    # Axios client, auth, tenant resolution, orders API
│   ├── components/
│   │   ├── IncomingOrderModal.tsx       # Burst order queue carousel & customer info modal
│   │   ├── OrderCard.tsx                # Permanent customer info strip & cancel button
│   │   ├── ReceiptPrintModal.tsx        # ESC/POS bluetooth receipt formatting
│   │   └── EditDishModal.tsx            # Menu item price, recipe, and stock editor
│   ├── screens/
│   │   ├── LiveOrdersScreen.tsx         # Filterable live kitchen tickets
│   │   ├── TablesScreen.tsx             # Table management & QR code scanning
│   │   ├── MenuScreen.tsx               # Fast 1-tap stock availability toggles
│   │   ├── SettingsScreen.tsx           # Operational gates, pincodes & printers
│   │   └── LoginScreen.tsx              # Generic staff authentication & email remember
│   ├── services/
│   │   ├── alarmService.ts              # Looping chime audio player (USAGE_ALARM)
│   │   ├── backgroundAlertService.ts    # JS NativeEventEmitter for Kotlin module
│   │   └── socketService.ts             # Auto-reconnecting multi-tenant Socket.io client
│   ├── store/
│   │   └── useAdminStore.ts             # Zustand store with burst queue & operational state
│   ├── types/
│   │   └── index.ts                     # TypeScript definitions for TableSession, Order, Item
│   └── utils/
│       └── storage.ts                   # Unified persistent key-value abstraction
├── App.tsx                              # Root navigator, tab bar, cold-start intent router
├── app.json                             # Expo application configuration
└── package.json
```

---

## 10. Quality Assurance & Verification History

| Verification Target | Test Scenario | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| **Burst Order Queue** | 3 simultaneous orders dispatched to backend within 500ms. | All 3 orders queued. Modal displays `🚨 3 ORDERS WAITING (1 of 3)`. Accepting order 1 auto-advances to order 2 without closing modal. | **PASSED** |
| **Android Heads-up Notifications** | App minimized to background, order placed via API. | High-priority notification appeared in Android status bar with sound. Tapping opened app and launched order modal directly. | **PASSED** |
| **Permanent Customer Strip** | Dine-in and Takeaway orders moved to `preparing` and `ready`. | Customer name, phone dialer (`+91 ...`), address, and table PIN remained permanently visible. | **PASSED** |
| **Anytime Order Cancellation** | Staff tapped `CANCEL` on preparing order item. | Prompted destructive confirmation alert. Status updated to `CANCELLED`. Customer frontend updated banner to cancelled state. | **PASSED** |
| **Multi-Tenant Isolation** | Staff logged in as `admin@biryanivspulao.com`. | Only Biryani vs Pulao tables, sessions, and menu items fetched. No cross-outlet data visible. | **PASSED** |

---

*Document maintained and synchronized with production codebase.*
