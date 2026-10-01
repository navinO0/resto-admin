import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, TextInput, Animated } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { OrderCard } from '../components/OrderCard';
import { ReceiptPrintModal } from '../components/ReceiptPrintModal';
import { TableSession } from '../types';
import { Ionicons } from '@expo/vector-icons';

const OrderSkeleton = () => {
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
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.topRow}>
        <Animated.View style={[skeletonStyles.box, { width: 140, height: 18, opacity: anim }]} />
        <Animated.View style={[skeletonStyles.box, { width: 70, height: 20, borderRadius: 10, opacity: anim }]} />
      </View>
      <Animated.View style={[skeletonStyles.box, { width: '60%', height: 12, marginVertical: 8, opacity: anim }]} />
      <Animated.View style={[skeletonStyles.box, { width: '100%', height: 50, borderRadius: 8, opacity: anim }]} />
      <View style={skeletonStyles.bottomRow}>
        <Animated.View style={[skeletonStyles.box, { width: 90, height: 22, opacity: anim }]} />
        <Animated.View style={[skeletonStyles.box, { width: 100, height: 32, borderRadius: 8, opacity: anim }]} />
      </View>
    </View>
  );
};

export const HistoryScreen: React.FC = () => {
  const { 
    historicalSessions, 
    fetchHistory, 
    isHistoryLoading,
    printReceiptSession,
    setPrintReceiptSession
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  useEffect(() => {
    fetchHistory();
  }, []);

  
    

  
    

  
    

  

  
  const getSessionStatus = (session: TableSession) => {
    const orders = session.orders || [];
    const isCancelled =
      (orders.length > 0 && orders.every((o: any) => ['cancelled', 'declined', 'rejected'].includes((o.status || '').toLowerCase()))) ||
      (session.isCompleted && session.paymentStatus !== 'paid' && orders.every((o: any) => (o.items || []).every((i: any) => ['cancelled', 'declined', 'rejected'].includes((i.status || '').toLowerCase()))));
    if (isCancelled) return 'cancelled';
    if (session.paymentStatus === 'paid') return 'billed';
    if (session.isCompleted) return 'completed';
    if (orders.length > 0 && orders.every((o: any) => o.status === 'cancelled')) return 'cancelled';
    if (orders.length > 0 && orders.some((o: any) => ['accepted', 'preparing', 'ready', 'served'].includes(o.status))) return 'accepted';
    if (orders.length > 0 && orders.some((o: any) => ['accepted', 'preparing', 'ready', 'served'].includes((o.status || '').toLowerCase()))) return 'accepted';
    return 'other';
  };

  const billedCount = historicalSessions.filter(s => getSessionStatus(s) === 'billed').length;
  const completedCount = historicalSessions.filter(s => getSessionStatus(s) === 'completed').length;
  const cancelledCount = historicalSessions.filter(s => getSessionStatus(s) === 'cancelled').length;
  const acceptedCount = historicalSessions.filter(s => getSessionStatus(s) === 'accepted').length;

  const filteredSessions = historicalSessions.filter((session) => {
    // Status Filter
    if (activeFilter !== 'all') {
      const status = getSessionStatus(session);
      if (status !== activeFilter) return false;
    }

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const orders = session.orders || [];
      const matchTable = String(session.tableNumber).toLowerCase().includes(q);
      const matchCust = (session.customerNames || []).some((n) => n.toLowerCase().includes(q));
      const matchPhone = session.mobileNumber?.includes(q);
      const matchItems = orders.some((o) => (o.items || []).some((i) => i.name.toLowerCase().includes(q)));
      return matchTable || matchCust || matchPhone || matchItems;
    }

    return true;
  });

  const filterTabs: Array<{ id: any; label: string; count?: number }> = [
    { id: 'all', label: 'All', count: historicalSessions.length },
    { id: 'accepted', label: 'Accepted', count: acceptedCount },
    { id: 'completed', label: 'Completed', count: completedCount },
    { id: 'billed', label: 'Billed', count: billedCount },
    { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
  ];


  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search table, customer, phone, or dish..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isActive ? styles.filterPillActive : null]}
                onPress={() => setActiveFilter(tab.id)}
              >
                <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                  {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isHistoryLoading && historicalSessions.length === 0 ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard session={item} />}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={isHistoryLoading} onRefresh={fetchHistory} colors={['#EA580C']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="checkmark-circle" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Order History</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'all'
                  ? 'No order history found yet. Completed, billed, and cancelled orders will appear here.'
                  : `No historical orders matching the "${activeFilter}" filter.`}
              </Text>
            </View>
          }
        />
      )}

      <ReceiptPrintModal 
        session={printReceiptSession} 
        onClose={() => setPrintReceiptSession(null)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    gap: 6,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 70,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  box: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
});
