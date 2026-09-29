export type OrderStatus = 'pending' | 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  customerName?: string;
  instructions?: string;
  status?: OrderStatus;
  image?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  timestamp: string;
  total: number;
  orderNumber?: number;
}

export interface TableSession {
  id: string;
  tableNumber: string | number;
  orderType: 'dine-in' | 'takeaway';
  startTime: string;
  endTime?: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'upi' | 'card';
  customerNames?: string[];
  customerPhone?: string;
  mobileNumber?: string;
  address?: string;
  pincode?: string;
  takeawayLocation?: 'inside' | 'outside' | 'in';
  deliveryFee?: number;
  joinPin?: string;
  isCompleted?: boolean;
  needsAttention?: boolean;
  attentionType?: 'call' | 'payment';
  attentionNote?: string;
  orders: Order[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  category?: string;
  categoryId?: string;
  isAvailable: boolean;
  isVeg?: boolean;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  prepTime?: string;
  image?: string;
  calories?: number;
  spiceLevel?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  sortOrder?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  permissions?: Record<string, boolean>;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  capacity: number;
  section: string;
  isActive: boolean;
  qrCode?: string;
  allowOrdering?: boolean;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  siteUrl?: string;
  tagline?: string;
  description?: string;
  logo?: string;
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    googleMaps?: string;
  };
  operations?: {
    openingHours?: string;
    currency?: string;
    upiId?: string;
    upiName?: string;
    timezone?: string;
    allowTakeaway?: boolean;
    acceptingOrders?: boolean;
    acceptingOnlineOrders?: boolean;
    acceptingTableOrders?: boolean;
    acceptedPincodes?: string[];
  };
}
