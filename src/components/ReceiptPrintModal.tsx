import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { TableSession } from '../types';
import { useAdminStore } from '../store/useAdminStore';
import { Printer, X, Share2 } from 'lucide-react-native';

interface ReceiptPrintModalProps {
  session: TableSession | null;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({ session, onClose }) => {
  const { restaurantName, currency } = useAdminStore();

  if (!session) return null;

  const isTakeaway = session.orderType === 'takeaway';
  const allOrders = session.orders || [];
  const allItems = allOrders.flatMap((o) => o.items || []);

  const subtotal = allItems.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0);
  const deliveryFee = session.deliveryFee || 0;
  const grandTotal = session.totalAmount || subtotal + deliveryFee;

  const handleShareReceipt = async () => {
    try {
      const itemsText = allItems
        .map((i) => `• ${i.quantity}x ${i.name} - ${currency}${i.price * i.quantity}`)
        .join('\n');

      const message = `🧾 ${restaurantName.toUpperCase()}\n` +
        `--------------------------\n` +
        `Order Type: ${isTakeaway ? 'Takeaway' : `Table ${session.tableNumber}`}\n` +
        `Date: ${new Date(session.startTime).toLocaleString()}\n` +
        `Customer: ${session.customerNames?.[0] || 'Guest'}\n` +
        `--------------------------\n` +
        `${itemsText}\n` +
        `--------------------------\n` +
        `Total: ${currency}${grandTotal}\n` +
        `Payment: ${session.paymentStatus?.toUpperCase() || 'UNPAID'}\n` +
        `Thank you for dining with us!`;

      await Share.share({ message });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleMockPrint = () => {
    Alert.alert('Printer Sent', `KOT & Bill sent to thermal printer for ${isTakeaway ? 'Takeaway' : `Table ${session.tableNumber}`}`);
    onClose();
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Printer size={20} color="#0F172A" />
              <Text style={styles.headerTitle}>Bill & KOT Slip</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.receiptPaper}>
              <Text style={styles.receiptRestaurant}>{restaurantName.toUpperCase()}</Text>
              <Text style={styles.receiptSub}>Order Receipt & KOT Slip</Text>
              
              <View style={styles.dividerDashed} />

              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Order Type:</Text>
                <Text style={styles.metaVal}>{isTakeaway ? 'TAKEAWAY' : `TABLE ${session.tableNumber}`}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Time:</Text>
                <Text style={styles.metaVal}>{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              {session.customerNames?.[0] && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Customer:</Text>
                  <Text style={styles.metaVal}>{session.customerNames[0]}</Text>
                </View>
              )}
              {session.mobileNumber && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Phone:</Text>
                  <Text style={styles.metaVal}>+91 {session.mobileNumber}</Text>
                </View>
              )}

              <View style={styles.dividerDashed} />

              <View style={styles.itemHeaderRow}>
                <Text style={[styles.colItem, styles.tableHeader]}>ITEM</Text>
                <Text style={[styles.colQty, styles.tableHeader]}>QTY</Text>
                <Text style={[styles.colPrice, styles.tableHeader]}>AMT</Text>
              </View>

              {allItems.map((item, idx) => (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={styles.colItem}>
                    <Text style={styles.itemNameText}>{item.name}</Text>
                    {item.instructions ? (
                      <Text style={styles.itemNoteText}>* {item.instructions}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.colQty}>{item.quantity}</Text>
                  <Text style={styles.colPrice}>{currency}{item.price * item.quantity}</Text>
                </View>
              ))}

              <View style={styles.dividerDashed} />

              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Subtotal</Text>
                <Text style={styles.totalVal}>{currency}{subtotal}</Text>
              </View>
              {deliveryFee > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalKey}>Delivery Fee</Text>
                  <Text style={styles.totalVal}>{currency}{deliveryFee}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalKey}>GRAND TOTAL</Text>
                <Text style={styles.grandTotalVal}>{currency}{grandTotal}</Text>
              </View>

              <View style={styles.dividerDashed} />

              <View style={styles.statusRow}>
                <Text style={styles.paymentStatusLabel}>PAYMENT STATUS:</Text>
                <View style={[styles.paymentBadge, session.paymentStatus === 'paid' ? styles.paidBadge : styles.unpaidBadge]}>
                  <Text style={[styles.paymentBadgeText, session.paymentStatus === 'paid' ? styles.paidText : styles.unpaidText]}>
                    {session.paymentStatus?.toUpperCase() || 'UNPAID'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareReceipt} activeOpacity={0.8}>
              <Share2 size={16} color="#0F172A" />
              <Text style={styles.shareBtnText}>Share Slip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.printBtn} onPress={handleMockPrint} activeOpacity={0.8}>
              <Printer size={16} color="#FFFFFF" />
              <Text style={styles.printBtnText}>Print KOT / Bill</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  receiptScroll: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  receiptPaper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptRestaurant: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  receiptSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  metaKey: {
    fontSize: 12,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tableHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  colItem: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  colPrice: {
    flex: 1.2,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemNoteText: {
    fontSize: 10,
    color: '#EA580C',
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  totalKey: {
    fontSize: 12,
    color: '#64748B',
  },
  totalVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  grandTotalRow: {
    marginTop: 6,
  },
  grandTotalKey: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  paymentStatusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
  },
  unpaidBadge: {
    backgroundColor: '#FEF3C7',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  paidText: {
    color: '#15803D',
  },
  unpaidText: {
    color: '#B45309',
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  printBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    gap: 6,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
