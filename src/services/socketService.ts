import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { TableSession } from '../types';
import { getAuthToken } from '../api/client';

// ─── Heartbeat ping interval when socket is disconnected ──────────────────────
// Every PING_INTERVAL ms we try a plain HTTP GET to the server.
// If it replies we force-reconnect the socket immediately.
const PING_INTERVAL_MS = 5_000;   // 5 s between pings while offline
const MAX_RECONNECT_ATTEMPTS = Infinity; // never give up

class SocketService {
  private socket: Socket | null = null;
  private currentUrl: string = '';
  private currentTenant: string = '';

  // Handles for cleanup
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private storeUnsubscribe: (() => void) | null = null;

  // ── Public bootstrap ───────────────────────────────────────────────────────
  init() {
    const { serverUrl, tenantId } = useAdminStore.getState();
    if (tenantId) {
      this.connect(serverUrl, tenantId);
    }

    // Re-connect whenever auth state changes (login / logout / server switch)
    this.storeUnsubscribe = useAdminStore.subscribe((state) => {
      if (
        state.serverUrl !== this.currentUrl ||
        state.tenantId !== this.currentTenant
      ) {
        if (state.tenantId) {
          this.connect(state.serverUrl, state.tenantId);
        } else {
          this.disconnect();
        }
      }
    });

    // Re-connect when app is brought back to the foreground
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  // ── AppState handler ───────────────────────────────────────────────────────
  private handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      console.log('[SocketService] 📱 App foregrounded — checking connection...');
      const { serverUrl, tenantId } = useAdminStore.getState();
      if (tenantId) {
        if (!this.socket || !this.socket.connected) {
          console.log('[SocketService] 🔄 Reconnecting after foreground resume...');
          this.connect(serverUrl, tenantId);
        } else {
          // Socket is connected — still refresh data in case we missed events
          useAdminStore.getState().fetchSessions();
        }
      }
    }
  };

  // ── Heartbeat ping while disconnected ─────────────────────────────────────
  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(async () => {
      const { serverUrl, tenantId } = useAdminStore.getState();
      if (!serverUrl || !tenantId) return;
      if (this.socket?.connected) {
        // Already reconnected — stop pinging
        this.stopPing();
        return;
      }
      try {
        const res = await fetch(`${serverUrl}/docs/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4_000),
        });
        if (res.status < 500) {
          console.log('[SocketService] 🌐 Network restored — forcing reconnect...');
          this.stopPing();
          this.connect(serverUrl, tenantId);
        }
      } catch {
        // Still offline — keep pinging silently
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ── Core connect ──────────────────────────────────────────────────────────
  connect(serverUrl: string, tenantId: string) {
    if (!serverUrl || !tenantId) {
      this.disconnect();
      return;
    }

    // Tear down existing socket cleanly
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentUrl = serverUrl;
    this.currentTenant = tenantId;

    const rootUrl = serverUrl.replace(/\/api\/v1\/?$/, '');
    console.log(
      `[SocketService] 🔌 Connecting → ${rootUrl} (tenant: ${tenantId})`,
    );

    this.socket = io(rootUrl, {
      query: { tenantId },
      // Prefer WebSocket, fall back to long-polling
      transports: ['websocket', 'polling'],
      // ── Reconnection settings ────────────────────────────────────────────
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1_000,       // start at 1 s
      reconnectionDelayMax: 15_000,   // cap at 15 s
      randomizationFactor: 0.4,       // jitter so multiple clients don't pile-on
      timeout: 10_000,
    });

    // ── Connection events ────────────────────────────────────────────────────
    this.socket.on('connect', () => {
      console.log(`[SocketService] ✅ Connected — tenant room: ${tenantId}`);
      useAdminStore.getState().setConnected(true);
      this.stopPing(); // network is up — stop fallback pinging
      // Refresh data in case we missed socket events while offline
      if (getAuthToken()) {
        useAdminStore.getState().fetchSessions();
      }
      useAdminStore.getState().fetchMenu();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[SocketService] ⚠️  Disconnected:', reason);
      useAdminStore.getState().setConnected(false);

      // Socket.io handles most cases via reconnection:true, but for
      // server-initiated closes we also kick off our own heartbeat ping
      // so the UI recovers the moment network is back.
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.startPing();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[SocketService] ❌ connect_error:', error.message);
      useAdminStore.getState().setConnected(false);
      // Kick off heartbeat so we recover the moment network is back
      this.startPing();
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[SocketService] 🔁 Reconnect attempt #${attempt}...`);
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log(`[SocketService] 🎉 Reconnected after ${attempt} attempt(s)`);
      useAdminStore.getState().setConnected(true);
      this.stopPing();
      if (getAuthToken()) {
        useAdminStore.getState().fetchSessions();
      }
      useAdminStore.getState().fetchMenu();
    });

    this.socket.io.on('reconnect_failed', () => {
      console.warn('[SocketService] 🚫 socket.io gave up — handing off to ping loop');
      this.startPing();
    });

    // ── Business events ──────────────────────────────────────────────────────
    const handleIncomingOrder = (session: TableSession) => {
      console.log('[SocketService] 🚨 Incoming order — session:', session.id);
      useAdminStore.getState().fetchSessions();
      useAdminStore.getState().triggerIncomingOrderAlarm(session);
    };

    this.socket.on('order:new', handleIncomingOrder);
    this.socket.on('session:new', handleIncomingOrder);

    this.socket.on('session:updated', (session: TableSession) => {
      console.log('[SocketService] 🔄 session:updated:', session.id);
      useAdminStore.getState().fetchSessions();

      const hasPendingTakeaway =
        session.orderType === 'takeaway' &&
        (session.orders || []).some((o) => o.status === 'pending');

      if (hasPendingTakeaway || session.needsAttention) {
        useAdminStore.getState().triggerIncomingOrderAlarm(session);
      }
    });

    this.socket.on('session:attention', (session: TableSession) => {
      console.log('[SocketService] 🔔 session:attention — Table:', session.tableNumber);
      session.needsAttention = true;
      useAdminStore.getState().fetchSessions();
      useAdminStore.getState().triggerIncomingOrderAlarm(session);
    });

    this.socket.on('session:completed', () => {
      useAdminStore.getState().fetchSessions();
    });

    this.socket.on('session:deleted', () => {
      useAdminStore.getState().fetchSessions();
    });

    this.socket.on('menu:availability', () => {
      useAdminStore.getState().fetchMenu();
    });

    this.socket.on('menu:updated', () => {
      useAdminStore.getState().fetchMenu();
    });
  }

  // ── Expose a manual reconnect for UI buttons ──────────────────────────────
  manualReconnect() {
    const { serverUrl, tenantId } = useAdminStore.getState();
    if (tenantId) {
      console.log('[SocketService] 👆 Manual reconnect triggered');
      this.connect(serverUrl, tenantId);
    }
  }

  // ── Teardown ──────────────────────────────────────────────────────────────
  disconnect() {
    this.stopPing();

    if (this.socket) {
      console.log(`[SocketService] 🛑 Disconnecting — tenant: ${this.currentTenant}`);
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    this.currentUrl = '';
    this.currentTenant = '';
  }
}

export const socketService = new SocketService();
