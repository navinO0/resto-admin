import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { TableSession, OrderStatus } from '../types';
import { useAdminStore } from '../store/useAdminStore';
import { 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  Check, 
  Printer, 
  CheckCircle2, 
  MapPin, 
  Bell, 
  LogOut,
  Utensils
} from 'lucide-react-native';

interface OrderCardProps {
  session: TableSession;
}

export const OrderCard: React.FC<OrderCardProps> = ({ session }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { 
    updateOrderStatus, 
    acceptOrder, 
    declineOrder, 
    markPaid, 
    completeSession, 
    setPrintReceiptSession, 
    currency 
  } = useAdminStore();

  const handleAccept = async () => {
    setActionLoading('accept');
    try {
      await acceptOrder(session.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    setActionLoading('decline');
    try {
      await declineOrder(session.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (orderId: string, st: OrderStatus) => {
    const key = `${orderId}-${st}`;
    setActionLoading(key);
    try {
      await updateOrderStatus(session.id, orderId, st);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading('paid');
    try {
      await markPaid(session.id);
    } finally {
      setActionLoading(null);
    }
  };

  const isTakeaway = session.orderType === 'takeaway';
  const allOrders = session.orders || [];
  const hasPendingOrder = allOrders.some((o) => o.status === 'pending' || o.status === 'new');
  const totalItems = allOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0), 0);

  const customerTitle = isTakeaway
    ? (session.customerNames?.[0] || 'Takeaway Order')
    : `Table ${session.tableNumber}`;

  const handleCall = () => {
    if (session.mobileNumber) {
      Linking.openURL(`tel:${session.mobileNumber}`);
    }
  };

  const handleOpenMap = () => {
    if (session.address) {
      const q = encodeURIComponent(`${session.address} ${session.pincode || ''}`);
      Linking.openURL(`https://maps.google.com/?q=${q}`);
    }
  };

  const handleCheckout = () => {
    Alert.alert(
      'Complete Order & Table',
      `Close this ${isTakeaway ? 'takeaway order' : `Table ${session.tableNumber}`} and mark as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Close', 
          style: 'destructive',
          onPress: () => completeSession(session.id) 
        }
      ]
    );
  };

  const hasDineInAttention = !isTakeaway && session.needsAttention;

  return (
    <View style={[
      styles.card,
      (hasPendingOrder || hasDineInAttention) ? styles.alertCardBorder : null,
    ]}>
      
      {hasDineInAttention && (
        <View style={styles.attentionBanner}>
          <Bell size={16} color="#B45309" />
          <View style={styles.attentionTextCol}>
            <Text style={styles.attentionTitle}>
              {session.attentionType === 'payment'
                ? 'PAYMENT REQUESTED'
                : 'WAITER CALLED'}
            </Text>
            <Text style={styles.attentionNote}>
              {session.attentionNote || `Table ${session.tableNumber} needs assistance`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => {
              Alert.alert(
                'Dismiss Alert',
                `Mark waiter call for Table ${session.tableNumber} as handled?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Dismiss', onPress: () => {/* handled via socket update in real app, ignored for now as per instructions */} },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissBtnText}>DONE</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.cardHeader} 
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, isTakeaway ? styles.takeawayAvatar : styles.dineInAvatar]}>
            {isTakeaway ? (
              <ShoppingBag size={18} color="#EA580C" />
            ) : (
              <Text style={styles.tableText}>{session.tableNumber}</Text>
            )}
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{customerTitle}</Text>
              {isTakeaway && (
                <View style={styles.takeawayChip}>
                  <Text style={styles.takeawayChipText}>TAKEAWAY</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaTime}>
                {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaItems}>{totalItems} items</Text>
              <View style={[styles.payBadge, session.paymentStatus === 'paid' ? styles.paidBg : styles.unpaidBg]}>
                <Text style={[styles.payText, session.paymentStatus === 'paid' ? styles.paidText : styles.unpaidText]}>
                  {session.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isExpanded ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
        </View>
      </TouchableOpacity>

      {hasPendingOrder && (
        <View style={styles.pendingAlertBox}>
          <View style={styles.pendingHeader}>
            <View style={styles.pendingTag}>
              <Bell size={13} color="#D97706" />
              <Text style={styles.pendingTagText}>Incoming Order Awaiting Approval</Text>
            </View>
            {session.takeawayLocation && (
              <Text style={styles.locBadge}>
                {session.takeawayLocation === 'outside' ? 'DELIVERY' : 'IN-STORE PICKUP'}
              </Text>
            )}
          </View>

          {session.mobileNumber ? (
            <TouchableOpacity onPress={handleCall} style={styles.phoneRow}>
              <Phone size={14} color="#EA580C" />
              <Text style={styles.phoneText}>+91 {session.mobileNumber} (Tap to Call)</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.pendingActions}>
            <TouchableOpacity 
              style={styles.declineBtn} 
              onPress={handleDecline}
              disabled={!!actionLoading}
            >
              {actionLoading === 'decline' ? (
                <ActivityIndicator size="small" color="#E11D48" />
              ) : (
                <Text style={styles.declineBtnText}>Reject</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.acceptBtn} 
              onPress={handleAccept}
              disabled={!!actionLoading}
            >
              {actionLoading === 'accept' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>Accept to Kitchen</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {session.address ? (
        <TouchableOpacity onPress={handleOpenMap} style={styles.addressBox} activeOpacity={0.75}>
          <MapPin size={14} color="#64748B" />
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>DELIVERY ADDRESS (TAP FOR MAP):</Text>
            <Text style={styles.addressText}>{session.address} {session.pincode ? `(${session.pincode})` : ''}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.ordersSection}>
        {allOrders.map((order, orderIdx) => (
          <View key={order.id || orderIdx} style={styles.orderBox}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>Order #{order.id?.slice(-4) || orderIdx + 1}</Text>
              <View style={[styles.statusChip, getStatusStyle(order.status)]}>
                <Text style={styles.statusChipText}>{order.status?.toUpperCase()}</Text>
              </View>
            </View>

            {!isExpanded ? (
              <TouchableOpacity onPress={() => setIsExpanded(true)} style={styles.compactItemsRow}>
                <Text style={styles.compactItemsText} numberOfLines={2}>
                  {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.expandedItemsList}>
                {(order.items || []).map((item, itemIdx) => (
                  <View key={item.id || itemIdx} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{item.quantity}x</Text>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.instructions ? (
                        <Text style={styles.chefNote}>Note: {item.instructions}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>{currency}{item.price * item.quantity}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.statusButtonsRow}>
              {(['preparing', 'ready', 'served'] as OrderStatus[]).map((st) => {
                const isActive = order.status === st;
                const label = st === 'preparing' ? 'KITCHEN' : st.toUpperCase();
                const isBtnLoading = actionLoading === `${order.id}-${st}`;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusBtn, isActive ? styles.statusBtnActive : null]}
                    onPress={() => handleStatusChange(order.id, st)}
                    disabled={!!actionLoading}
                  >
                    {isBtnLoading ? (
                      <ActivityIndicator size="small" color={isActive ? "#FFFFFF" : "#0F172A"} />
                    ) : (
                      <Text style={[styles.statusBtnText, isActive ? styles.statusBtnTextActive : null]}>
                        {label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalAmount}>{currency}{session.totalAmount}</Text>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={styles.printIconButton} 
            onPress={() => setPrintReceiptSession(session)}
            activeOpacity={0.8}
          >
            <Printer size={16} color="#0F172A" />
          </TouchableOpacity>

          {session.paymentStatus !== 'paid' ? (
            <TouchableOpacity 
              style={styles.markPaidBtn} 
              onPress={handleMarkPaid}
              disabled={!!actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading === 'paid' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.markPaidText}>Mark Paid</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.checkoutBtn} 
              onPress={handleCheckout}
              activeOpacity={0.8}
            >
              <LogOut size={14} color="#FFFFFF" />
              <Text style={styles.checkoutText}>
                {isTakeaway ? 'Close Order' : 'Close Table'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

    </View>
  );
};

const getStatusStyle = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return { backgroundColor: '#F59E0B' };
    case 'new': return { backgroundColor: '#F59E0B' };
    case 'preparing': return { backgroundColor: '#3B82F6' };
    case 'ready': return { backgroundColor: '#8B5CF6' };
    case 'served': return { backgroundColor: '#10B981' };
    case 'cancelled': return { backgroundColor: '#EF4444' };
    default: return { backgroundColor: '#64748B' };
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  alertCardBorder: {
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  attentionTextCol: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
    flex: 1,
    letterSpacing: 0.3,
  },
  attentionNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 1,
  },
  dismissBtn: {
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dismissBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dineInAvatar: {
    backgroundColor: '#F1F5F9',
  },
  takeawayAvatar: {
    backgroundColor: '#FFEDD5',
  },
  tableText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  takeawayChip: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  takeawayChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  metaTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  metaItems: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  payBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBg: {
    backgroundColor: '#DCFCE7',
  },
  unpaidBg: {
    backgroundColor: '#FEF3C7',
  },
  payText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paidText: {
    color: '#15803D',
  },
  unpaidText: {
    color: '#B45309',
  },
  headerRight: {
    padding: 4,
  },
  pendingAlertBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  locBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
    textDecorationLine: 'underline',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  ordersSection: {
    padding: 14,
  },
  orderBox: {
    marginBottom: 10,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compactItemsRow: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  compactItemsText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  expandedItemsList: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    width: 24,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  chefNote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#EA580C',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  markPaidText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  checkoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
