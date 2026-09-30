import axios from 'axios';
import { TableSession, MenuItem, Category, OrderStatus, AuthUser, TenantConfig, RestaurantTable } from '../types';

const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL || '';

let currentServerUrl = DEFAULT_URL ? (DEFAULT_URL.endsWith('/api/v1') ? DEFAULT_URL : `${DEFAULT_URL.replace(/\/+$/, '')}/api/v1`) : '';
// Strictly empty by default - no hardcoded default tenant!
let currentTenantId: string = '';
let currentAuthToken: string | null = null;

export const setApiConfig = (serverUrl: string, tenantId?: string) => {
  let cleanUrl = (serverUrl || '').trim();
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
  if (cleanUrl && !cleanUrl.endsWith('/api/v1')) {
    cleanUrl = `${cleanUrl}/api/v1`;
  }
  currentServerUrl = cleanUrl;
  currentTenantId = tenantId ? tenantId.trim() : '';
  console.log(`[ApiClient] 🌐 Server URL configured: "${currentServerUrl}" (Tenant: "${currentTenantId || 'none'}")`);
};

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => currentAuthToken;
export const getCurrentTenantId = () => currentTenantId;
export const getCurrentServerUrl = () => currentServerUrl;

const getAxiosInstance = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentTenantId) {
    headers['x-tenant-id'] = currentTenantId;
  }

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  return axios.create({
    baseURL: currentServerUrl,
    headers,
    timeout: 10000,
  });
};

export const apiService = {
  // ── AUTHENTICATION WITH CREDENTIAL-BASED TENANT RESOLUTION ──
  async login(
    email: string, 
    password: string, 
    tenantIdentifier?: string, 
    overrideServerUrl?: string
  ): Promise<{ token: string; user: AuthUser }> {
    if (overrideServerUrl && overrideServerUrl.trim()) {
      setApiConfig(overrideServerUrl.trim(), tenantIdentifier || '');
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const attemptLogin = async (identifier?: string) => {
      const payload: Record<string, any> = {
        email: trimmedEmail,
        password: trimmedPassword,
      };

      if (identifier && identifier.trim()) {
        const cleanId = identifier.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        if (isUuid) {
          payload.tenantId = cleanId;
        } else {
          payload.tenantSlug = cleanId;
        }
      }

      console.log(`[ApiClient] 📡 Attempting login to: ${currentServerUrl}/auth/login with email: ${trimmedEmail}`);
      const res = await getAxiosInstance().post('/auth/login', payload);
      return res.data;
    };

    // 1. If tenantIdentifier is explicitly provided by user/preset, use it
    // 1. If tenantIdentifier is explicitly provided by user, use it
    if (tenantIdentifier && tenantIdentifier.trim()) {
      const data = await attemptLogin(tenantIdentifier);
      const { token, user } = data;
      setAuthToken(token);
      setApiConfig(currentServerUrl, user.tenantId);
      return { token, user };
    }

    // 2. If tenantIdentifier is not specified, resolve tenant based on credentials
    let candidateSlugs: string[] = [];
    const lowerEmail = trimmedEmail.toLowerCase();
    if (lowerEmail.includes('biryani')) {
      candidateSlugs = ['biryani-vs-pulao', 'spice-garden', 'system-admin'];
    } else if (lowerEmail.includes('spicegarden')) {
      candidateSlugs = ['spice-garden', 'biryani-vs-pulao', 'system-admin'];
    } else if (lowerEmail.includes('platform')) {
      candidateSlugs = ['system-admin', 'biryani-vs-pulao', 'spice-garden'];
    } else {
      candidateSlugs = ['biryani-vs-pulao', 'spice-garden', 'system-admin'];
    }

    let lastError: any = null;
    for (const slug of candidateSlugs) {
      try {
        const data = await attemptLogin(slug);
        if (data?.token && data?.user?.tenantId) {
          const { token, user } = data;
          setAuthToken(token);
          setApiConfig(currentServerUrl, user.tenantId);
          console.log(`[ApiClient] 🎯 Successfully authenticated & fetched Tenant ID: ${user.tenantId} for ${user.email}`);
          return { token, user };
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Invalid credentials or unauthorized restaurant outlet.');
    // 2. Direct login - backend automatically resolves restaurant from staff credentials
    const data = await attemptLogin();
    const { token, user } = data;
    setAuthToken(token);
    setApiConfig(currentServerUrl, user.tenantId);
    console.log(`[ApiClient] 🎯 Successfully authenticated & resolved Restaurant: ${user.tenantId} for ${user.email}`);
    return { token, user };
  },

  async getMe(): Promise<AuthUser> {
    const res = await getAxiosInstance().get('/auth/me');
    return res.data;
  },

  // ── SESSIONS & LIVE ORDERS (TENANT ISOLATED) ──
  async getActiveSessions(): Promise<TableSession[]> {
    const res = await getAxiosInstance().get('/sessions', {
      params: { isCompleted: false },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getSessionById(sessionId: string): Promise<TableSession> {
    const res = await getAxiosInstance().get(`/sessions/${sessionId}`);
    return res.data;
  },

  async updateOrderStatus(sessionId: string, orderId: string, status: OrderStatus) {
    const res = await getAxiosInstance().patch(`/sessions/${sessionId}/orders/${orderId}/status`, { status });
    return res.data;
  },

  async updateItemStatus(sessionId: string, orderId: string, itemId: string, status: OrderStatus) {
    const res = await getAxiosInstance().patch(`/sessions/${sessionId}/orders/${orderId}/items/${itemId}`, { status });
    return res.data;
  },

  async acceptOrder(sessionId: string, orderId?: string) {
    if (orderId) {
      return this.updateOrderStatus(sessionId, orderId, 'preparing');
    }
    const session = await this.getSessionById(sessionId);
    const pendingOrder = (session.orders || []).find((o) => o.status === 'pending' || o.status === 'new');
    if (pendingOrder) {
      return this.updateOrderStatus(sessionId, pendingOrder.id, 'preparing');
    }
  },

  async declineOrder(sessionId: string, orderId?: string) {
    if (orderId) {
      return this.updateOrderStatus(sessionId, orderId, 'cancelled');
    }
    const session = await this.getSessionById(sessionId);
    const pendingOrder = (session.orders || []).find((o) => o.status === 'pending' || o.status === 'new');
    if (pendingOrder) {
      return this.updateOrderStatus(sessionId, pendingOrder.id, 'cancelled');
    }
    const activeOrders = (session.orders || []).filter((o) => o.status !== 'cancelled');
    if (activeOrders.length > 0) {
      for (const o of activeOrders) {
        await this.updateOrderStatus(sessionId, o.id, 'cancelled');
      }
    }
  },

  async markPaymentStatus(sessionId: string, status: 'paid' | 'pending' = 'paid') {
    const res = await getAxiosInstance().patch(`/sessions/${sessionId}/payment`, {
      status,
    });
    return res.data;
  },

  async completeSession(sessionId: string) {
    const res = await getAxiosInstance().post(`/sessions/${sessionId}/complete`);
    return res.data;
  },

  async deleteSession(sessionId: string) {
    const res = await getAxiosInstance().delete(`/sessions/${sessionId}`);
    return res.data;
  },

  // ── MENU & CATEGORIES (TENANT ISOLATED) ──
  // Fetches ALL menu items by paginating until no more remain
  async getMenu(): Promise<MenuItem[]> {
    const PAGE_SIZE = 100;
    let allItems: MenuItem[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await getAxiosInstance().get('/menu', {
        params: { limit: PAGE_SIZE, offset },
      });

      let items: MenuItem[] = [];
      if (Array.isArray(res.data)) {
        items = res.data;
        hasMore = false; // old format — no pagination info
      } else if (res.data && Array.isArray(res.data.items)) {
        items = res.data.items;
        hasMore = res.data.hasMore === true;
      } else {
        hasMore = false;
      }

      allItems = [...allItems, ...items];
      offset += PAGE_SIZE;

      // Safety: if server returned fewer than PAGE_SIZE, we're done
      if (items.length < PAGE_SIZE) {
        hasMore = false;
      }
    }

    console.log(`[ApiClient] ✅ Fetched ${allItems.length} total menu items for tenant.`);
    return allItems;
  },

  async getCategories(): Promise<Category[]> {
    const res = await getAxiosInstance().get('/categories', {
      params: { limit: 500 },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  async toggleItemStock(itemId: string, isAvailable: boolean) {
    const res = await getAxiosInstance().patch(`/menu/${itemId}/availability`, { isAvailable });
    return res.data;
  },

  async createMenuItem(data: Partial<MenuItem>) {
    const res = await getAxiosInstance().post('/menu', data);
    return res.data;
  },

  async updateMenuItem(itemId: string, data: Partial<MenuItem>) {
    const res = await getAxiosInstance().put(`/menu/${itemId}`, data);
    return res.data;
  },

  async deleteMenuItem(itemId: string) {
    const res = await getAxiosInstance().delete(`/menu/${itemId}`);
    return res.data;
  },

  // ── TENANT CONFIG & PING ──
  async testConnection(serverUrl: string, tenantId?: string): Promise<TenantConfig | any> {
    let cleanUrl = (serverUrl || '').trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
    if (!cleanUrl.endsWith('/api/v1')) cleanUrl = `${cleanUrl}/api/v1`;

    const headers: Record<string, string> = {};
    if (tenantId && tenantId.trim()) {
      headers['x-tenant-id'] = tenantId.trim();
    }

    try {
      const res = await axios.get(`${cleanUrl}/config`, {
        headers,
        timeout: 6000,
      });
      return res.data;
    } catch (err: any) {
      const rootUrl = cleanUrl.replace(/\/api\/v1\/?$/, '');
      try {
        const healthRes = await axios.get(`${rootUrl}/health`, { timeout: 4000 });
        return { name: 'Restaurant Server', operations: { currency: '₹' }, health: healthRes.data };
      } catch (healthErr) {
        throw err;
      }
    }
  },

  async getTables(): Promise<RestaurantTable[]> {
    const res = await getAxiosInstance().get('/tables/admin');
    return Array.isArray(res.data) ? res.data : [];
  },

  async updateSettings(settings: {
    acceptingOrders?: boolean;
    acceptingOnlineOrders?: boolean;
    acceptingTableOrders?: boolean;
    frontendUrl?: string;
    acceptedPincodes?: string[];
  }): Promise<any> {
    const res = await getAxiosInstance().patch('/tenants/settings', settings);
    return res.data;
  },

  async getConfig(): Promise<any> {
    const res = await getAxiosInstance().get('/config');
    return res.data;
  },
};
