import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView, Linking } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { 
  Bell, 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  MapPin, 
  User, 
  Hash 
} from 'lucide-react-native';

export const IncomingOrderModal: React.FC = () => {
  const { 
    incomingAlert, 
    incomingQueue, 
    incomingQueueIndex, 
    nextIncomingAlert, 
    prevIncomingAlert, 
    setIncomingAlertIndex, 
    dismissIncomingAlert, 
    silenceAlarmOnly, 
    acceptOrder, 
    declineOrder, 
    currency 
  } = useAdminStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (incomingAlert) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [incomingAlert]);

  if (!incomingAlert) return null;

  const isTakeaway = incomingAlert.orderType === 'takeaway';
  const customerName = incomingAlert.customerNames?.[0] || (isTakeaway ? 'Takeaway Customer' : `Table ${incomingAlert.tableNumber} Guest`);
  const allOrders = incomingAlert.orders || [];
  const allItems = allOrders.flatMap((o) => o.items || []);
  const hasMultipleInQueue = incomingQueue.length > 1;

  const handleAccept = () => {
    acceptOrder(incomingAlert.id);
  };

  const handleDecline = () => {
    declineOrder(incomingAlert.id);
  };

  const handleCall = () => {
    if (incomingAlert.mobileNumber) {
      Linking.openURL(`tel:${incomingAlert.mobileNumber}`);
    }
  };

  const handleOpenMap = () => {
    if (incomingAlert.address) {
      const q = encodeURIComponent(`${incomingAlert.address} ${incomingAlert.pincode || ''}`);
      Linking.openURL(`https://maps.google.com/?q=${q}`);
    }
  };

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── Burst / Multi-Order Queue Header ── */}
          {hasMultipleInQueue && (
            <View style={styles.queueHeader}>
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>
                  🚨 {incomingQueue.length} ORDERS WAITING
                </Text>
              </View>
              <View style={styles.queueNav}>
                <TouchableOpacity 
                  style={styles.navBtn} 
                  onPress={prevIncomingAlert}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={16} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.navText}>
                  {incomingQueueIndex + 1} of {incomingQueue.length}
                </Text>
                <TouchableOpacity 
                  style={styles.navBtn} 
                  onPress={nextIncomingAlert}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-forward" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.header}>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
              {isTakeaway ? (
                <Ionicons name="bag-outline" size={26} color="#FFFFFF" />
              ) : (
                <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
              )}
            </Animated.View>
            <View style={styles.headerText}>
              <Text style={styles.alertTag}>
                {incomingAlert.needsAttention
                  ? (incomingAlert.attentionType === 'payment' ? 'GUEST PAYMENT NOTIFICATION' : 'GUEST ASSISTANCE CALL')
                  : isTakeaway ? 'INCOMING TAKEAWAY / ONLINE ORDER' : 'NEW DINE-IN ORDER'}
              </Text>
              <Text style={styles.title} numberOfLines={1}>{customerName}</Text>
            </View>
          </View>

          {/* ── Customer Details Strip ── */}
          <View style={styles.customerBox}>
            <View style={styles.customerRow}>
              <Ionicons name="person-outline" size={13} color="#64748B" />
              <Text style={styles.customerLabel}>Customer:</Text>
              <Text style={styles.customerValue} numberOfLines={1}>
                {incomingAlert.customerNames?.join(', ') || (isTakeaway ? 'Takeaway Customer' : 'Dine-in Guest')}
              </Text>
            </View>

            {incomingAlert.mobileNumber ? (
              <TouchableOpacity onPress={handleCall} style={styles.phoneClickableRow} activeOpacity={0.7}>
                <Ionicons name="call-outline" size={13} color="#EA580C" />
                <Text style={styles.phoneLabel}>Phone:</Text>
                <Text style={styles.phoneValue}>+91 {incomingAlert.mobileNumber}</Text>
                <Text style={styles.callBadge}>TAP TO CALL</Text>
              </TouchableOpacity>
            ) : null}

            {(incomingAlert.pin || incomingAlert.joinPin) ? (
              <View style={styles.customerRow}>
                <Ionicons name="list-outline" size={13} color="#64748B" />
                <Text style={styles.customerLabel}>Table PIN:</Text>
                <Text style={styles.pinValue}>{incomingAlert.pin || incomingAlert.joinPin}</Text>
              </View>
            ) : null}

            {incomingAlert.address ? (
              <TouchableOpacity onPress={handleOpenMap} style={styles.addressClickableRow} activeOpacity={0.7}>
                <Ionicons name="location-outline" size={13} color="#2563EB" />
                <Text style={styles.customerLabel}>Address:</Text>
                <Text style={styles.addressValue} numberOfLines={1}>
                  {incomingAlert.address} {incomingAlert.pincode ? `(${incomingAlert.pincode})` : ''}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Summary Info Banner ── */}
          <View style={styles.infoBanner}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>ORDER TYPE</Text>
              <Text style={styles.infoValue}>
                {isTakeaway ? 'Takeaway / Delivery' : `Table ${incomingAlert.tableNumber}`}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.priceValue}>{currency}{incomingAlert.totalAmount}</Text>
            </View>
          </View>

          {incomingAlert.needsAttention && incomingAlert.attentionNote ? (
            <View style={styles.attentionBox}>
              <Text style={styles.attentionText}>Note: {incomingAlert.attentionNote}</Text>
            </View>
          ) : null}

          <Text style={styles.itemsHeader}>Order Items ({allItems.length}):</Text>
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {allItems.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.quantity}x</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.instructions ? (
                    <Text style={styles.itemNote}>Note: {item.instructions}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemPrice}>{currency}{item.price * item.quantity}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            {incomingAlert.needsAttention ? (
              <TouchableOpacity 
                style={[styles.acceptButton, { backgroundColor: '#3B82F6' }]} 
                onPress={() => dismissIncomingAlert(incomingAlert.id)} 
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>
                  {incomingAlert.attentionType === 'payment' ? 'ACKNOWLEDGE PAYMENT' : 'ACKNOWLEDGE CALL'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>
                  {isTakeaway ? 'ACCEPT TAKEAWAY' : 'ACCEPT TO KITCHEN'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryRow}>
              {!incomingAlert.needsAttention && (
                <TouchableOpacity style={styles.declineButton} onPress={handleDecline} activeOpacity={0.85}>
                  <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.silenceButton} onPress={silenceAlarmOnly} activeOpacity={0.85}>
                <Ionicons name="volume-mute-outline" size={18} color="#475569" />
                <Text style={styles.silenceText}>Silence</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissButton} 
                onPress={() => dismissIncomingAlert(incomingAlert.id)} 
                activeOpacity={0.85}
              >
                <Text style={styles.dismissText}>
                  {hasMultipleInQueue ? 'Skip' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 20,
    maxHeight: '90%',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  queueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  queueNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  navText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  alertTag: {
    fontSize: 10,
    fontSize: 9,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 1,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  customerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  customerValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  phoneClickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phoneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  phoneValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  callBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EA580C',
    marginLeft: 'auto',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 1,
  },
  addressClickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    textDecorationLine: 'underline',
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 16,
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 2,
  },
  attentionBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    padding: 8,
    borderRadius: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  attentionText: {
    fontSize: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  itemsHeader: {
    fontSize: 12,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  itemsList: {
    maxHeight: 180,
    marginBottom: 16,
    maxHeight: 160,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qtyBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginRight: 10,
    marginRight: 8,
  },
  qtyText: {
    fontSize: 12,
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemNote: {
    fontSize: 11,
    fontSize: 10,
    color: '#EA580C',
    fontStyle: 'italic',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  actions: {
    gap: 10,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 7,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    gap: 8,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 7,
    gap: 6,
    gap: 4,
  },
  declineText: {
    color: '#E11D48',
    fontSize: 13,
    fontSize: 12,
    fontWeight: '700',
  },
  silenceButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 7,
    gap: 6,
    gap: 4,
  },
  silenceText: {
    color: '#475569',
    fontSize: 13,
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 7,
  },
  dismissText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
