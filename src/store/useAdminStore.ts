import { create } from 'zustand';
import { TableSession, MenuItem, Category, OrderStatus, AuthUser, RestaurantTable } from '../types';
import { apiService, setApiConfig, setAuthToken, getAuthToken } from '../api/client';
import { alarmService } from '../services/alarmService';
import { socketService } from '../services/socketService';
import { storage } from '../utils/storage';

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
  menuItems: MenuItem[];
  categories: Category[];
  tables: RestaurantTable[];
  incomingAlert: TableSession | null;
  printReceiptSession: TableSession | null;
  tenantConfig: any | null;
  acceptingOrders: boolean;
  acceptingOnlineOrders: boolean;
  acceptingTableOrders: boolean;
  frontendUrl: string;
  acceptedPincodes: string[];

  // Actions
  initAuthAndSync: () => Promise<void>;
  login: (email: string, password: string, tenantId?: string, customUrl?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setConnectionConfig: (serverUrl: string, tenantId?: string, restaurantName?: string) => Promise<boolean>;
  setFilter: (filter: 'all' | 'pending' | 'kitchen' | 'ready' | 'takeaway') => void;
  fetchSessions: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  updateOrderStatus: (sessionId: string, orderId: string, status: OrderStatus) => Promise<void>;
  acceptOrder: (sessionId: string, orderId?: string) => Promise<void>;
  declineOrder: (sessionId: string, orderId?: string) => Promise<void>;
  markPaid: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  toggleStock: (itemId: string, isAvailable: boolean) => Promise<void>;
  updateItem: (itemId: string, data: Partial<MenuItem>) => Promise<void>;
  createItem: (data: Partial<MenuItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  triggerIncomingOrderAlarm: (session: TableSession) => void;
  dismissIncomingAlert: () => void;
  setPrintReceiptSession: (session: TableSession | null) => void;
  setConnected: (connected: boolean) => void;
  fetchTables: () => Promise<void>;
  fetchTenantConfig: () => Promise<void>;
  setAcceptingOrders: (value: boolean) => Promise<void>;
  setAcceptingOnlineOrders: (value: boolean) => Promise<void>;
  setAcceptingTableOrders: (value: boolean) => Promise<void>;
  setFrontendUrl: (url: string) => Promise<boolean>;
  updateAcceptedPincodes: (pincodes: string[]) => Promise<boolean>;
}

const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || '';

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
  menuItems: [],
  categories: [],
  tables: [],
  incomingAlert: null,
  printReceiptSession: null,
  acceptingOrders: true,
  acceptingOnlineOrders: true,
  acceptingTableOrders: true,
  frontendUrl: '',
  acceptedPincodes: [],
  tenantConfig: null,

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

          // Fetch tenant-scoped sessions and menu
          await Promise.all([get().fetchTenantConfig(), get().fetchTables(), get().fetchSessions(), get().fetchMenu()]);
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
        menuItems: [],
        categories: [],
        incomingAlert: null,
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
      await Promise.all([get().fetchTenantConfig(), get().fetchTables(), get().fetchSessions(), get().fetchMenu()]);

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
      menuItems: [],
      categories: [],
      incomingAlert: null,
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
    get().dismissIncomingAlert();
    try {
      await apiService.acceptOrder(sessionId, orderId);
      await get().fetchSessions();
    } catch (err) {
      console.error('[AdminStore] Failed to accept order:', err);
    }
  },

  declineOrder: async (sessionId, orderId) => {
    get().dismissIncomingAlert();
    try {
      await apiService.declineOrder(sessionId, orderId);
      await get().fetchSessions();
    } catch (err) {
      console.error('[AdminStore] Failed to decline order:', err);
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
    alarmService.startAlert();
  },

  dismissIncomingAlert: () => {
    set({ incomingAlert: null });
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
}));
