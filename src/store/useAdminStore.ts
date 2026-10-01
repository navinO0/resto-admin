import { create } from 'zustand';
import { TableSession, MenuItem, Category, OrderStatus, AuthUser, RestaurantTable } from '../types';
import { apiService, setApiConfig, setAuthToken, getAuthToken } from '../api/client';
import { alarmService } from '../services/alarmService';
import { socketService } from '../services/socketService';
import { backgroundAlertService } from '../services/backgroundAlertService';
import { updateService, AppUpdateInfo } from '../services/updateService';
import { storage } from '../utils/storage';

export function getNotificationId(sessionId: string): number {
  let hash = 0;
  const str = sessionId || 'default';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647) || 1001;
}

export function buildNotificationContent(session: TableSession, currency: string = '₹'): { title: string; message: string; notifId: number } {
  const isTakeaway = session.orderType === 'takeaway';
  const customerName = session.customerNames?.[0] || '';

  let title = '';
  if (session.needsAttention) {
    title = isTakeaway
      ? `🔔 Takeaway Alert - ${customerName || 'Customer'}`
      : `🔔 Call Waiter - Table ${session.tableNumber}`;
  } else if (isTakeaway) {
    title = `🛍️ New Takeaway - ${customerName || 'Customer'}`;
  } else {
    title = `🍽️ New Order - Table ${session.tableNumber}`;
  }

  const allItems = (session.orders || []).flatMap((o) => o.items || []);
  let message = '';
  if (session.needsAttention && session.attentionNote) {
    message = `Note: ${session.attentionNote}`;
  } else if (allItems.length > 0) {
    const itemSummary = allItems
      .slice(0, 3)
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(', ');
    const moreCount = allItems.length - 3;
    const moreText = moreCount > 0 ? ` +${moreCount} more` : '';
    const totalText = session.totalAmount ? ` • ${currency}${session.totalAmount}` : '';
    message = `${itemSummary}${moreText}${totalText}`;
  } else {
    message = session.totalAmount ? `Total: ${currency}${session.totalAmount}` : 'New order received. Tap to view.';
  }

  const notifId = getNotificationId(session.id);
  return { title, message, notifId };
}

interface AdminState {
  // Config & Auth
  serverUrl: string;
  tenantId: string;
  restaurantName: string;
  currency: string;
  authToken: string | null;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;

  // Real-time State
  isConnected: boolean;
  isLoading: boolean;
  activeFilter: 'all' | 'pending' | 'kitchen' | 'ready' | 'takeaway';
  activeSessions: TableSession[];
  historicalSessions: TableSession[];
  isHistoryLoading: boolean;
  menuItems: MenuItem[];
  categories: Category[];
  tables: RestaurantTable[];
  incomingAlert: TableSession | null;
  incomingQueue: TableSession[];
  incomingQueueIndex: number;
  printReceiptSession: TableSession | null;
  tenantConfig: any | null;
  acceptingOrders: boolean;
  acceptingOnlineOrders: boolean;
  acceptingTableOrders: boolean;
  frontendUrl: string;
  acceptedPincodes: string[];
  availableUpdate: AppUpdateInfo | null;
  isUpdateModalVisible: boolean;

  // Actions
  initAuthAndSync: () => Promise<void>;
  login: (email: string, password: string, tenantId?: string, customUrl?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setConnectionConfig: (serverUrl: string, tenantId?: string, restaurantName?: string) => Promise<boolean>;
  setFilter: (filter: 'all' | 'pending' | 'kitchen' | 'ready' | 'takeaway') => void;
  fetchSessions: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  updateOrderStatus: (sessionId: string, orderId: string, status: OrderStatus) => Promise<void>;
  acceptOrder: (sessionId: string, orderId?: string) => Promise<void>;
  declineOrder: (sessionId: string, orderId?: string) => Promise<void>;
  cancelOrder: (sessionId: string, orderId?: string) => Promise<void>;
  markPaid: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  toggleStock: (itemId: string, isAvailable: boolean) => Promise<void>;
  updateItem: (itemId: string, data: Partial<MenuItem>) => Promise<void>;
  createItem: (data: Partial<MenuItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  triggerIncomingOrderAlarm: (session: TableSession) => void;
  dismissIncomingAlert: (sessionId?: string) => void;
  nextIncomingAlert: () => void;
  prevIncomingAlert: () => void;
  setIncomingAlertIndex: (index: number) => void;
  silenceAlarmOnly: () => void;
  setPrintReceiptSession: (session: TableSession | null) => void;
  setConnected: (connected: boolean) => void;
  fetchTables: () => Promise<void>;
  fetchTenantConfig: () => Promise<void>;
  setAcceptingOrders: (value: boolean) => Promise<void>;
  setAcceptingOnlineOrders: (value: boolean) => Promise<void>;
  setAcceptingTableOrders: (value: boolean) => Promise<void>;
  setFrontendUrl: (url: string) => Promise<boolean>;
  updateAcceptedPincodes: (pincodes: string[]) => Promise<boolean>;
  setAvailableUpdate: (info: AppUpdateInfo | null) => void;
  setUpdateModalVisible: (visible: boolean) => void;
  checkForAppUpdate: (showModalIfAvailable?: boolean) => Promise<AppUpdateInfo | null>;
}

const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vq88x6oinnilh5tsbx87swga.navin.lol';

export const useAdminStore = create<AdminState>((set, get) => ({
  serverUrl: DEFAULT_SERVER_URL,
  tenantId: '',
  restaurantName: 'Restaurant Admin',
  currency: '₹',
  authToken: null,
  currentUser: null,
  isAuthenticated: false,
  isInitialLoading: true,

  isConnected: false,
  isLoading: false,
  activeFilter: 'all',
  activeSessions: [],
  historicalSessions: [],
  isHistoryLoading: false,
  menuItems: [],
  categories: [],
  tables: [],
  incomingAlert: null,
  incomingQueue: [],
  incomingQueueIndex: 0,
  printReceiptSession: null,
  acceptingOrders: true,
  acceptingOnlineOrders: true,
  acceptingTableOrders: true,
  frontendUrl: '',
  acceptedPincodes: [],
  tenantConfig: null,
  availableUpdate: null,
  isUpdateModalVisible: false,

  initAuthAndSync: async () => {
    try {
      set({ isInitialLoading: true });

      // 1. Check for stored URL and stored session
      const [savedUrl, savedToken, savedUser] = await Promise.all([
        storage.getItem('server_url'),
        storage.getItem('auth_token'),
        storage.getItem('auth_user'),
      ]);

      const activeUrl = (savedUrl && savedUrl.trim()) ? savedUrl.trim() : DEFAULT_SERVER_URL;

      if (savedToken && savedUser) {
        try {
          const user: AuthUser = JSON.parse(savedUser);
          const tenantId = user.tenantId;

          // Strict tenant isolation setup
          setApiConfig(activeUrl, tenantId);
          setAuthToken(savedToken);

          set({
            serverUrl: activeUrl,
            tenantId,
            authToken: savedToken,
            currentUser: user,
            isAuthenticated: true,
            isConnected: true,
          });

          // Connect socket to this tenant's isolated room
          socketService.connect(activeUrl, tenantId);

          // Keep background foreground service running for incoming orders even if app swiped from recents
          backgroundAlertService.startForegroundService();

          // Fetch tenant branding & operations config
          try {
            const config = await apiService.testConnection(activeUrl, tenantId);
            if (config?.name) {
              set({
                restaurantName: config.name,
                currency: config.operations?.currency || '₹',
              });
            }
          } catch (_) {}

          // Fetch tenant-scoped sessions, history, tables and menu
          await Promise.all([get().fetchTenantConfig(), get().fetchTables(), get().fetchSessions(), get().fetchMenu(), get().fetchHistory()]);
        } catch (parseErr) {
          console.warn('[AdminStore] Corrupt saved user profile. Clearing session:', parseErr);
          await storage.removeItem('auth_token');
          await storage.removeItem('auth_user');
          set({ isAuthenticated: false, currentUser: null, authToken: null });
        }
      } else {
        // Not authenticated — prompt user for credentials with saved serverUrl
        if (activeUrl) {
          setApiConfig(activeUrl, '');
        }
        set({
          serverUrl: activeUrl,
          isAuthenticated: false,
          currentUser: null,
          authToken: null,
          tenantId: '',
          activeSessions: [],
  historicalSessions: [],
  isHistoryLoading: false,
          menuItems: [],
          categories: [],
        });
      }
    } catch (err) {
      console.error('[AdminStore] initAuthAndSync error:', err);
    } finally {
      set({ isInitialLoading: false });
    }
  },

  login: async (email, password, tenantId, customUrl) => {
    try {
      set({ isLoading: true });

      // Clear any prior tenant data immediately to ensure zero cross-tenant contamination
      set({
        activeSessions: [],
  historicalSessions: [],
  isHistoryLoading: false,
        menuItems: [],
        categories: [],
        incomingAlert: null,
        incomingQueue: [],
        incomingQueueIndex: 0,
      });

      const activeUrl = (customUrl && customUrl.trim()) ? customUrl.trim() : (get().serverUrl || DEFAULT_SERVER_URL);

      // CRITICAL: Immediately update client config and persistent storage BEFORE calling login
      setApiConfig(activeUrl, tenantId || '');
      if (activeUrl) {
        await storage.setItem('server_url', activeUrl);
      }
      set({ serverUrl: activeUrl });

      console.log(`[AdminStore] 🔑 Staff login for: ${email} targeting backend: ${activeUrl}`);
      const res = await apiService.login(email, password, tenantId, activeUrl);
      const user = res.user;
      const token = res.token;

      // Extract tenant ID strictly from authenticated response
      const verifiedTenantId = user.tenantId;

      console.log(`[AdminStore] 🔒 Authenticated staff: ${user.name} for Tenant ID: ${verifiedTenantId}`);

      // Persist credentials
      await storage.setItem('auth_token', token);
      await storage.setItem('auth_user', JSON.stringify(user));
      await storage.setItem('tenant_id', verifiedTenantId);
      await storage.setItem('saved_staff_email', email.trim());

      // Set tenant-isolated API client & headers
      setApiConfig(activeUrl, verifiedTenantId);
      setAuthToken(token);

      set({
        serverUrl: activeUrl,
        tenantId: verifiedTenantId,
        authToken: token,
        currentUser: user,
        isAuthenticated: true,
        isLoading: false,
        isConnected: true,
      });

      // Connect socket specifically to the verified tenant room
      socketService.connect(activeUrl, verifiedTenantId);

      // Keep background foreground service running for incoming orders even if app swiped from recents
      backgroundAlertService.startForegroundService();

      // Fetch restaurant branding
      try {
        const config = await apiService.testConnection(activeUrl, verifiedTenantId);
        if (config?.name) {
          set({
            restaurantName: config.name,
            currency: config.operations?.currency || '₹',
          });
        }
      } catch (_) {}

      // Fetch data for this tenant only
      await Promise.all([get().fetchTenantConfig(), get().fetchTables(), get().fetchSessions(), get().fetchMenu(), get().fetchHistory()]);

      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      const msg = err.response?.data?.message || err.message || 'Invalid credentials or tenant mismatch.';
      return { success: false, message: msg };
    }
  },

  logout: async () => {
    console.log('[AdminStore] 🚪 Logging out staff and clearing tenant session.');
    
    // Disconnect real-time socket immediately
    socketService.disconnect();

    // Silently stop any ringing alarms
    alarmService.stopAlert();

    // Stop persistent background foreground service
    backgroundAlertService.stopForegroundService();

    // Clear persistent storage
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');
    await storage.removeItem('tenant_id');

    setAuthToken(null);
    setApiConfig(get().serverUrl, '');

    // Completely wipe all in-memory tenant data
    set({
      authToken: null,
      currentUser: null,
      tenantId: '',
      restaurantName: 'Restaurant Admin',
      isAuthenticated: false,
      isConnected: false,
      activeSessions: [],
  historicalSessions: [],
  isHistoryLoading: false,
      menuItems: [],
      categories: [],
      incomingAlert: null,
      incomingQueue: [],
      incomingQueueIndex: 0,
      printReceiptSession: null,
    });
  },

  setConnectionConfig: async (serverUrl, tenantId = '', restaurantName) => {
    try {
      set({ isLoading: true });
      const cleanUrl = (serverUrl || '').trim();
      const cleanTenant = (tenantId || '').trim();

      if (cleanUrl) {
        setApiConfig(cleanUrl, cleanTenant);
        await storage.setItem('server_url', cleanUrl);
        set({ serverUrl: cleanUrl });
      }

      if (cleanTenant) {
        await storage.setItem('tenant_id', cleanTenant);
        set({ tenantId: cleanTenant });
      }

      let connected = false;
      try {
        const config = await apiService.testConnection(cleanUrl, cleanTenant);
        if (config?.name) {
          set({
            restaurantName: restaurantName || config.name,
            currency: config?.operations?.currency || '₹',
          });
        }
        connected = true;
      } catch (testErr) {
        console.warn('[AdminStore] testConnection check error:', testErr);
      }

      set({
        serverUrl: cleanUrl,
        restaurantName: restaurantName || get().restaurantName || 'Restaurant Admin',
        isConnected: connected,
        isLoading: false,
      });

      return connected;
    } catch (err) {
      console.error('[AdminStore] setConnectionConfig error:', err);
      set({ isConnected: false, isLoading: false });
      return false;
    }
  },

  setFilter: (filter) => set({ activeFilter: filter }),

  fetchHistory: async () => {
    if (!getAuthToken() || !get().tenantId) return;
    set({ isHistoryLoading: true });
    try {
      const sessions = await apiService.getHistoricalSessions();
      set({ historicalSessions: sessions });
    } catch (err) {
      console.warn('[AdminStore] Failed to fetch historical sessions:', err);
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  fetchSessions: async () => {
    if (!getAuthToken() || !get().tenantId) {
      return;
    }
    try {
      const sessions = await apiService.getActiveSessions();
      console.log(`[AdminStore] ✅ [Tenant: ${get().tenantId}] Fetched ${sessions.length} active sessions.`);
      set({ activeSessions: sessions });
    } catch (err) {
      console.warn('[AdminStore] Failed to fetch active sessions:', err);
    }
  },

  fetchMenu: async () => {
    if (!get().tenantId) return;
    try {
      const [items, cats] = await Promise.all([
        apiService.getMenu(),
        apiService.getCategories(),
      ]);
      console.log(`[AdminStore] ✅ [Tenant: ${get().tenantId}] Fetched ${items.length} menu items across ${cats.length} categories.`);
      set({ menuItems: items, categories: cats });
    } catch (err) {
      console.warn('[AdminStore] Failed to fetch menu:', err);
    }
  },

  updateOrderStatus: async (sessionId, orderId, status) => {
    set((state) => ({
      activeSessions: state.activeSessions.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          orders: session.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        };
      }),
    }));

    try {
      await apiService.updateOrderStatus(sessionId, orderId, status);
      console.log(`[AdminStore] Order ${orderId} updated to ${status}`);
    } catch (err) {
      console.error('[AdminStore] Failed to update order status:', err);
      await get().fetchSessions();
    }
  },

  acceptOrder: async (sessionId, orderId) => {
    backgroundAlertService.cancelNotification(getNotificationId(sessionId));
    get().dismissIncomingAlert();
    const state = get();
    const nextQueue = state.incomingQueue.filter((s) => s.id !== sessionId);
    const nextIndex = Math.min(state.incomingQueueIndex, Math.max(0, nextQueue.length - 1));
    const nextAlert = nextQueue.length > 0 ? nextQueue[nextIndex] : null;

    if (nextQueue.length === 0) {
      alarmService.stopAlert();
    }

    set({
      incomingQueue: nextQueue,
      incomingAlert: nextAlert,
      incomingQueueIndex: nextIndex,
    });

    try {
      await apiService.acceptOrder(sessionId, orderId);
      await get().fetchSessions();
    } catch (err) {
      console.error('[AdminStore] Failed to accept order:', err);
    }
  },

  declineOrder: async (sessionId, orderId) => {
    backgroundAlertService.cancelNotification(getNotificationId(sessionId));
    get().dismissIncomingAlert();
    const state = get();
    const nextQueue = state.incomingQueue.filter((s) => s.id !== sessionId);
    const nextIndex = Math.min(state.incomingQueueIndex, Math.max(0, nextQueue.length - 1));
    const nextAlert = nextQueue.length > 0 ? nextQueue[nextIndex] : null;

    if (nextQueue.length === 0) {
      alarmService.stopAlert();
    }

    set({
      incomingQueue: nextQueue,
      incomingAlert: nextAlert,
      incomingQueueIndex: nextIndex,
    });

    try {
      await apiService.declineOrder(sessionId, orderId);
      await get().fetchSessions();
    } catch (err) {
      console.error('[AdminStore] Failed to decline order:', err);
    }
  },

  cancelOrder: async (sessionId: string, orderId?: string) => {
    backgroundAlertService.cancelNotification(getNotificationId(sessionId));
    const state = get();
    const nextQueue = state.incomingQueue.filter((s) => s.id !== sessionId);
    const nextIndex = Math.min(state.incomingQueueIndex, Math.max(0, nextQueue.length - 1));
    const nextAlert = nextQueue.length > 0 ? nextQueue[nextIndex] : null;

    if (nextQueue.length === 0) {
      alarmService.stopAlert();
    }

    set({
      incomingQueue: nextQueue,
      incomingAlert: nextAlert,
      incomingQueueIndex: nextIndex,
    });

    try {
      if (orderId) {
        await apiService.updateOrderStatus(sessionId, orderId, 'cancelled');
      } else {
        const session = get().activeSessions.find((s) => s.id === sessionId);
        if (session && session.orders?.length > 0) {
          for (const o of session.orders) {
            if (o.status !== 'cancelled') {
              await apiService.updateOrderStatus(sessionId, o.id, 'cancelled');
            }
          }
        } else {
          await apiService.deleteSession(sessionId);
        }
      }
      await get().fetchSessions();
    } catch (err) {
      console.error('[AdminStore] Failed to cancel order:', err);
      await get().fetchSessions();
    }
  },

  markPaid: async (sessionId) => {
    set((state) => ({
      activeSessions: state.activeSessions.map((s) =>
        s.id === sessionId ? { ...s, paymentStatus: 'paid' } : s
      ),
    }));

    try {
      await apiService.markPaymentStatus(sessionId, 'paid');
      console.log(`[AdminStore] Session ${sessionId} marked as paid.`);
    } catch (err) {
      console.error('[AdminStore] Failed to mark paid:', err);
      await get().fetchSessions();
    }
  },

  completeSession: async (sessionId) => {
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
    }));

    try {
      await apiService.completeSession(sessionId);
      console.log(`[AdminStore] Session ${sessionId} completed.`);
    } catch (err) {
      console.error('[AdminStore] Failed to complete session:', err);
      await get().fetchSessions();
    }
  },

  toggleStock: async (itemId, isAvailable) => {
    set((state) => ({
      menuItems: state.menuItems.map((item) =>
        item.id === itemId ? { ...item, isAvailable } : item
      ),
    }));

    try {
      await apiService.toggleItemStock(itemId, isAvailable);
      console.log(`[AdminStore] Item ${itemId} stock toggled: ${isAvailable}`);
    } catch (err) {
      console.error('[AdminStore] Failed to toggle stock:', err);
      await get().fetchMenu();
    }
  },

  updateItem: async (itemId, data) => {
    set((state) => ({
      menuItems: state.menuItems.map((item) =>
        item.id === itemId ? { ...item, ...data } : item
      ),
    }));

    try {
      await apiService.updateMenuItem(itemId, data);
      await get().fetchMenu();
    } catch (err) {
      console.error('[AdminStore] Failed to update item:', err);
      await get().fetchMenu();
    }
  },

  createItem: async (data) => {
    try {
      await apiService.createMenuItem(data);
      await get().fetchMenu();
    } catch (err) {
      console.error('[AdminStore] Failed to create item:', err);
      throw err;
    }
  },

  deleteItem: async (itemId) => {
    set((state) => ({
      menuItems: state.menuItems.filter((i) => i.id !== itemId),
    }));

    try {
      await apiService.deleteMenuItem(itemId);
      await get().fetchMenu();
    } catch (err) {
      console.error('[AdminStore] Failed to delete item:', err);
      await get().fetchMenu();
    }
  },

  triggerIncomingOrderAlarm: (session: TableSession) => {
    console.log('[AdminStore] 🔔 TRIGGERING ORDER ALARM FOR:', session.id);
    set({ incomingAlert: session });
    const state = get();
    const existingIdx = state.incomingQueue.findIndex((s) => s.id === session.id);
    let updatedQueue = [...state.incomingQueue];
    if (existingIdx >= 0) {
      updatedQueue[existingIdx] = session;
    } else {
      updatedQueue.push(session);
    }

    const activeIndex = Math.min(state.incomingQueueIndex, updatedQueue.length - 1);
    set({
      incomingQueue: updatedQueue,
      incomingAlert: updatedQueue[activeIndex],
      incomingQueueIndex: activeIndex,
    });

    if (existingIdx < 0) {
      alarmService.startAlert();
      const currency = get().currency || '₹';
      const { title, message, notifId } = buildNotificationContent(session, currency);
      backgroundAlertService.showOrderNotification(notifId, title, message, session.id);
    }
  },

  dismissIncomingAlert: (sessionId?: string) => {
    const state = get();
    const targetId = sessionId || state.incomingAlert?.id;
    if (targetId) {
      backgroundAlertService.cancelNotification(getNotificationId(targetId));
      const nextQueue = state.incomingQueue.filter((s) => s.id !== targetId);
      const nextIndex = Math.min(state.incomingQueueIndex, Math.max(0, nextQueue.length - 1));
      const nextAlert = nextQueue.length > 0 ? nextQueue[nextIndex] : null;

      if (nextQueue.length === 0) {
        alarmService.stopAlert();
      }

      set({
        incomingQueue: nextQueue,
        incomingAlert: nextAlert,
        incomingQueueIndex: nextIndex,
      });
    } else {
      alarmService.stopAlert();
      set({ incomingAlert: null, incomingQueue: [], incomingQueueIndex: 0 });
    }
  },

  nextIncomingAlert: () => {
    const { incomingQueue, incomingQueueIndex } = get();
    if (incomingQueue.length <= 1) return;
    const nextIndex = (incomingQueueIndex + 1) % incomingQueue.length;
    set({ incomingQueueIndex: nextIndex, incomingAlert: incomingQueue[nextIndex] });
  },

  prevIncomingAlert: () => {
    const { incomingQueue, incomingQueueIndex } = get();
    if (incomingQueue.length <= 1) return;
    const prevIndex = (incomingQueueIndex - 1 + incomingQueue.length) % incomingQueue.length;
    set({ incomingQueueIndex: prevIndex, incomingAlert: incomingQueue[prevIndex] });
  },

  setIncomingAlertIndex: (index: number) => {
    const { incomingQueue } = get();
    if (index >= 0 && index < incomingQueue.length) {
      set({ incomingQueueIndex: index, incomingAlert: incomingQueue[index] });
    }
  },

  silenceAlarmOnly: () => {
    alarmService.stopAlert();
  },

  setPrintReceiptSession: (session) => set({ printReceiptSession: session }),

  setConnected: (connected) => set({ isConnected: connected }),

  fetchTables: async () => {
    if (!getAuthToken() || !get().tenantId) return;
    try {
      const tables = await apiService.getTables();
      set({ tables });
    } catch (err) {
      console.warn('[AdminStore] Failed to fetch tables:', err);
    }
  },

  fetchTenantConfig: async () => {
    if (!getAuthToken() || !get().tenantId) return;
    try {
      const config = await apiService.getConfig();
      const ops = config?.operations;
      const acceptingOnlineOrders = ops?.acceptingOnlineOrders !== undefined 
        ? Boolean(ops.acceptingOnlineOrders) 
        : (ops?.acceptingOrders !== undefined ? Boolean(ops.acceptingOrders) : true);
      const acceptingTableOrders = ops?.acceptingTableOrders !== undefined 
        ? Boolean(ops.acceptingTableOrders) 
        : (ops?.acceptingOrders !== undefined ? Boolean(ops.acceptingOrders) : true);
      const acceptingOrders = ops?.acceptingOrders !== undefined 
        ? Boolean(ops.acceptingOrders) 
        : (acceptingOnlineOrders || acceptingTableOrders);
      const frontendUrl = config?.frontendUrl || config?.siteUrl || ops?.frontendUrl || '';
      const acceptedPincodes = Array.isArray(ops?.acceptedPincodes) ? ops.acceptedPincodes : [];

      set({ 
        tenantConfig: config, 
        acceptingOrders,
        acceptingOnlineOrders,
        acceptingTableOrders,
        frontendUrl,
        acceptedPincodes,
      });
    } catch (err) {
      console.warn('[AdminStore] Failed to fetch tenant config:', err);
    }
  },

  setAcceptingOrders: async (value) => {
    try {
      await apiService.updateSettings({ acceptingOrders: value, acceptingOnlineOrders: value, acceptingTableOrders: value });
      set({ acceptingOrders: value, acceptingOnlineOrders: value, acceptingTableOrders: value });
    } catch (err) {
      console.error('[AdminStore] Failed to set acceptingOrders:', err);
    }
  },

  setAcceptingOnlineOrders: async (value) => {
    try {
      const res = await apiService.updateSettings({ acceptingOnlineOrders: value });
      const currentTable = get().acceptingTableOrders;
      const combined = value || currentTable;
      set({ 
        acceptingOnlineOrders: value,
        acceptingOrders: res?.acceptingOrders ?? combined
      });
    } catch (err) {
      console.error('[AdminStore] Failed to set acceptingOnlineOrders:', err);
    }
  },

  setAcceptingTableOrders: async (value) => {
    try {
      const res = await apiService.updateSettings({ acceptingTableOrders: value });
      const currentOnline = get().acceptingOnlineOrders;
      const combined = currentOnline || value;
      set({ 
        acceptingTableOrders: value,
        acceptingOrders: res?.acceptingOrders ?? combined
      });
    } catch (err) {
      console.error('[AdminStore] Failed to set acceptingTableOrders:', err);
    }
  },

  setFrontendUrl: async (url: string) => {
    try {
      set({ isLoading: true });
      const res = await apiService.updateSettings({ frontendUrl: url });
      set({ 
        frontendUrl: res?.frontendUrl || url, 
        isLoading: false 
      });
      // Refresh tables so regenerated QR codes are loaded immediately
      await get().fetchTables();
      return true;
    } catch (err) {
      console.error('[AdminStore] Failed to update frontendUrl:', err);
      set({ isLoading: false });
      return false;
    }
  },

  updateAcceptedPincodes: async (pincodes: string[]) => {
    try {
      set({ isLoading: true });
      const cleanPincodes = pincodes
        .map(p => p.trim())
        .filter(p => /^\d{6}$/.test(p) || p.length > 0);
      const res = await apiService.updateSettings({ acceptedPincodes: cleanPincodes });
      set({ 
        acceptedPincodes: res?.acceptedPincodes || cleanPincodes, 
        isLoading: false 
      });
      return true;
    } catch (err) {
      console.error('[AdminStore] Failed to update acceptedPincodes:', err);
      set({ isLoading: false });
      return false;
    }
  },

  setAvailableUpdate: (info: AppUpdateInfo | null) => set({ availableUpdate: info }),
  setUpdateModalVisible: (visible: boolean) => set({ isUpdateModalVisible: visible }),

  checkForAppUpdate: async (showModalIfAvailable = true) => {
    try {
      const update = await updateService.checkForUpdates(get().serverUrl);
      if (update && update.isUpdateAvailable) {
        set({ availableUpdate: update });
        if (showModalIfAvailable) {
          set({ isUpdateModalVisible: true });
        }
        return update;
      } else {
        set({ availableUpdate: update || null });
        return update;
      }
    } catch (err) {
      console.warn('[AdminStore] Check for app update failed:', err);
      return null;
    }
  },
}));
