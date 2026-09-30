import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
  Animated,
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { RestaurantTable } from '../types';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_W - 48) / 2;
const MODAL_QR_SIZE = Math.min(SCREEN_W - 96, 280);

const TableCardSkeleton = () => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.75, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Animated.View style={[{ width: 60, height: 18, backgroundColor: '#E2E8F0', borderRadius: 4, opacity: anim }]} />
        <Animated.View style={[{ width: 45, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, opacity: anim }]} />
      </View>
      <Animated.View style={[{ width: 50, height: 12, backgroundColor: '#E2E8F0', borderRadius: 4, marginVertical: 8, opacity: anim }]} />
      <Animated.View style={[{ width: CARD_WIDTH - 26, height: CARD_WIDTH - 26, backgroundColor: '#E2E8F0', borderRadius: 10, opacity: anim }]} />
      <View style={[styles.cardFooter, { marginTop: 8 }]}>
        <Animated.View style={[{ width: 65, height: 12, backgroundColor: '#E2E8F0', borderRadius: 4, opacity: anim }]} />
        <Animated.View style={[{ width: 36, height: 20, backgroundColor: '#E2E8F0', borderRadius: 10, opacity: anim }]} />
      </View>
    </View>
  );
};

interface QRModalProps {
  table: RestaurantTable | null;
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ table, onClose }) => {
  if (!table) return null;

  return (
    <Modal
      visible={!!table}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={modalStyles.dialog}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.headerTextCol}>
              <Text style={modalStyles.tableTitle}>TABLE {table.tableNumber}</Text>
              <View style={modalStyles.metaRow}>
                <Text style={modalStyles.sectionBadge}>{table.section}</Text>
                <Text style={modalStyles.capacityText}>• {table.capacity} Seats</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={modalStyles.closeButton} 
              onPress={onClose} 
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* QR Frame */}
          <View style={modalStyles.qrCard}>
            {table.qrCode ? (
              <Image
                source={{ uri: table.qrCode }}
                style={modalStyles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={modalStyles.noQrPlaceholder}>
                <MaterialIcons name="qr-code" size={48} color="#94A3B8" />
                <Text style={modalStyles.noQrText}>QR Code Not Available</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <Text style={modalStyles.instruction}>
            Customers can scan this QR with their phone camera to browse the menu and place orders.
          </Text>

          {/* Action Button */}
          <TouchableOpacity 
            style={modalStyles.doneButton} 
            onPress={onClose} 
            activeOpacity={0.7}
          >
            <Text pointerEvents="none" style={modalStyles.doneButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const TablesScreen: React.FC = () => {
  const { tables, fetchTables } = useAdminStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTableForQR, setActiveTableForQR] = useState<RestaurantTable | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTables();
    setRefreshing(false);
  }, [fetchTables]);

  const sections = Array.from(new Set(tables.map((t) => t.section || 'Main'))).sort();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EA580C']}
            tintColor="#EA580C"
          />
        }
      >
        {tables.length === 0 && refreshing && (
          <View style={styles.grid}>
            <TableCardSkeleton />
            <TableCardSkeleton />
            <TableCardSkeleton />
            <TableCardSkeleton />
          </View>
        )}

        {tables.length === 0 && !refreshing && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="qr-code" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Tables Configured</Text>
            <Text style={styles.emptySubtitle}>Pull down to sync tables from server</Text>
          </View>
        )}

        {sections.map((sec) => {
          const secTables = tables
            .filter((t) => (t.section || 'Main') === sec)
            .sort((a, b) =>
              String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true })
            );

          return (
            <View key={sec} style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>{sec.toUpperCase()}</Text>
                <Text style={styles.sectionCountText}>{secTables.length} tables</Text>
              </View>

              <View style={styles.grid}>
                {secTables.map((table) => (
                  <View key={table.id} style={styles.card}>
                    {/* Header */}
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardNumber}>Table {table.tableNumber}</Text>
                      <View style={[styles.statusPill, table.isActive ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusPillText, table.isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                          {table.isActive ? 'ACTIVE' : 'OFF'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.capacityMeta}>
                      <Ionicons name="people-outline" size={12} color="#64748B" />
                      <Text style={styles.capacityMetaText}>{table.capacity} seats</Text>
                    </View>

                    {/* QR Code Container with Tap to Enlarge */}
                    <TouchableOpacity
                      style={styles.qrBox}
                      onPress={() => setActiveTableForQR(table)}
                      activeOpacity={0.8}
                    >
                      {table.qrCode ? (
                        <>
                          <Image
                            source={{ uri: table.qrCode }}
                            style={styles.qrThumbnail}
                            resizeMode="contain"
                          />
                          <View style={styles.expandOverlay}>
                            <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
                            <Text style={styles.expandText}>Tap to Scan</Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.qrEmptyBox}>
                          <MaterialIcons name="qr-code" size={28} color="#CBD5E1" />
                          <Text style={styles.qrEmptyText}>No QR Code</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Allow Orders Toggle */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.allowOrdersLabel}>Allow Orders</Text>
                      <Switch
                        value={table.allowOrdering !== false}
                        trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                        thumbColor="#FFFFFF"
                        disabled={true}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* QR Modal for Easy Customer Scanning */}
      <QRModal
        table={activeTableForQR}
        onClose={() => setActiveTableForQR(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusActiveText: {
    color: '#15803D',
  },
  statusInactiveText: {
    color: '#94A3B8',
  },
  capacityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  capacityMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  qrBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    marginBottom: 10,
  },
  qrThumbnail: {
    width: CARD_WIDTH - 26,
    height: CARD_WIDTH - 26,
    margin: 4,
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 5,
  },
  expandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  qrEmptyBox: {
    width: CARD_WIDTH - 26,
    height: CARD_WIDTH - 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  qrEmptyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  allowOrdersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerTextCol: {
    flex: 1,
  },
  tableTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrImage: {
    width: MODAL_QR_SIZE,
    height: MODAL_QR_SIZE,
  },
  noQrPlaceholder: {
    width: MODAL_QR_SIZE,
    height: MODAL_QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noQrText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  instruction: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
