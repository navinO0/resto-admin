import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAdminStore } from './src/store/useAdminStore';
import { socketService } from './src/services/socketService';
import { backgroundAlertService } from './src/services/backgroundAlertService';
import { alarmService } from './src/services/alarmService';
import { LiveOrdersScreen } from './src/screens/LiveOrdersScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TablesScreen } from './src/screens/TablesScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { IncomingOrderModal } from './src/components/IncomingOrderModal';
import { ListOrdered, Utensils, Settings, Grid3x3, RefreshCw, ChefHat, WifiOff } from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables' | 'settings'>('orders');
  const appStateRef = useRef(AppState.currentState);
  const {
    activeSessions,
    restaurantName,
    isConnected,
    initAuthAndSync,
    fetchSessions,
    fetchTables,
    fetchTenantConfig,
    fetchMenu,
    isLoading,
    isInitialLoading,
    currentUser,
    isAuthenticated
  } = useAdminStore();

  const handleOpenOrder = async (sessionId: string) => {
    console.log('[App] 🛎️ Handling open order from notification:', sessionId);
    alarmService.stopAlert();
    setActiveTab('orders');

    let session = useAdminStore.getState().activeSessions.find((s) => s.id === sessionId);
    if (!session) {
      await useAdminStore.getState().fetchSessions();
      session = useAdminStore.getState().activeSessions.find((s) => s.id === sessionId);
    }

    if (session) {
      useAdminStore.setState({ incomingAlert: session });
    }
  };

  useEffect(() => {
    initAuthAndSync();
    initAuthAndSync().then(async () => {
      // Check if app was cold-started from a notification tap
      const initialSessionId = await backgroundAlertService.getInitialSessionId();
      if (initialSessionId) {
        handleOpenOrder(initialSessionId);
      }
    });

    // Request notification permission for Android 13+
    backgroundAlertService.requestNotificationPermission();

    // Listen for notification clicks when app is in background or foreground
    const unsubscribeNotif = backgroundAlertService.onNotificationOpenOrder((sessionId) => {
      handleOpenOrder(sessionId);
    });

    return () => {
      unsubscribeNotif();
    };
  }, []);

  // Refresh data when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        console.log('[App] 📱 Foreground resume — refreshing data...');
        if (isAuthenticated) {
          fetchSessions();
          fetchMenu();
          fetchTables();
        }
        // Also check if an intent brought us back
        backgroundAlertService.getInitialSessionId().then((sessionId) => {
          if (sessionId) {
            handleOpenOrder(sessionId);
          }
        });
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, fetchSessions,
    fetchTables,
    fetchTenantConfig, fetchMenu]);

  // 1. Initial Loading / Splash Screen
  if (isInitialLoading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.splashLogo}>
          <ChefHat size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.splashTitle}>Restaurant Admin</Text>
        <Text style={styles.splashSub}>Initializing secure tenant terminal...</Text>
        <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // 2. Unauthenticated: Render dedicated Login Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  // 3. Authenticated: Render Main Merchant Dashboard
  const totalActiveOrders = activeSessions.length;
  const pendingCount = activeSessions.filter((s) =>
    (s.orders || []).some((o) => o.status === 'pending' || o.status === 'new')
  ).length;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ── Top App Bar ── */}
        <View style={styles.appBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <ChefHat size={20} color="#FFFFFF" />
            </View>
            <View style={styles.brandTextCol}>
              <Text style={styles.brandTitle} numberOfLines={1}>{restaurantName}</Text>
              <View style={styles.statusRow}>
                {isConnected ? (
                  <>
                    <View style={styles.onlineDot} />
                    <Text style={styles.statusText}>LIVE SYNCED</Text>
                  </>
                ) : (
                  /* Tappable RECONNECT chip when offline */
                  <TouchableOpacity
                    style={styles.reconnectChip}
                    onPress={() => socketService.manualReconnect()}
                    activeOpacity={0.7}
                  >
                    <WifiOff size={10} color="#FFFFFF" />
                    <Text style={styles.reconnectText}>TAP TO RECONNECT</Text>
                  </TouchableOpacity>
                )}
                {currentUser ? (
                  <>
                    <Text style={styles.statusDivider}>•</Text>
                    <Text style={styles.userBadge}>{currentUser.name || 'Staff'}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => { fetchSessions(); fetchMenu(); }}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <RefreshCw size={17} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* ── Main Tab Content ── */}
        <View style={styles.screenContainer}>
          {activeTab === 'orders' && <LiveOrdersScreen />}
          {activeTab === 'menu' && <MenuScreen />}
          {activeTab === 'tables' && <TablesScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </View>

        {/* ── Bottom Navigation Bar ── */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.8}
          >
            <View>
              <ListOrdered size={22} color={activeTab === 'orders' ? '#EA580C' : '#94A3B8'} />
              {totalActiveOrders > 0 && (
                <View style={[styles.badge, pendingCount > 0 ? styles.badgePending : null]}>
                  <Text style={styles.badgeText}>{totalActiveOrders}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === 'orders' ? styles.tabLabelActive : null]}>
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('menu')}
            activeOpacity={0.8}
          >
            <Utensils size={22} color={activeTab === 'menu' ? '#EA580C' : '#94A3B8'} />
            <Text style={[styles.tabLabel, activeTab === 'menu' ? styles.tabLabelActive : null]}>
              Menu & Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('tables')}
            activeOpacity={0.8}
          >
            <Grid3x3 size={22} color={activeTab === 'tables' ? '#EA580C' : '#94A3B8'} />
            <Text style={[styles.tabLabel, activeTab === 'tables' ? styles.tabLabelActive : null]}>
              Tables
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Settings size={22} color={activeTab === 'settings' ? '#EA580C' : '#94A3B8'} />
            <Text style={[styles.tabLabel, activeTab === 'settings' ? styles.tabLabelActive : null]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Persistent Ringing Incoming Order Alert Modal ── */}
        <IncomingOrderModal />

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  splashSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandTextCol: {
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  offlineText: {
    color: '#F59E0B',
  },
  reconnectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reconnectText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  statusDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  userBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabLabelActive: {
    color: '#EA580C',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#0F172A',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgePending: {
    backgroundColor: '#EA580C',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
