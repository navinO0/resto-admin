import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Switch,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { storage } from '../utils/storage';
import { alarmService } from '../services/alarmService';
import { backgroundAlertService } from '../services/backgroundAlertService';
import { 
  Volume2, 
  Wifi, 
  User, 
  LogOut, 
  LogIn, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  Globe, 
  QrCode,
  MapPin,
  Plus,
  X,
  Save
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { 
    serverUrl: storedUrl, 
    tenantId: storedTenant, 
    setConnectionConfig, 
    isConnected, 
    restaurantName,
    currentUser,
    isAuthenticated,
    login,
    logout,
    acceptingOrders,
    acceptingOnlineOrders,
    acceptingTableOrders,
    frontendUrl,
    acceptedPincodes,
    setAcceptingOrders,
    setAcceptingOnlineOrders,
    setAcceptingTableOrders,
    setFrontendUrl,
    updateAcceptedPincodes
  } = useAdminStore();

  const [url, setUrl] = useState(storedUrl);
  const [tenant, setTenant] = useState(storedTenant);
  const [customFrontendUrl, setCustomFrontendUrl] = useState(frontendUrl || '');
  const [isUpdatingFrontendUrl, setIsUpdatingFrontendUrl] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const [pincodesList, setPincodesList] = useState<string[]>([]);
  const [newPincode, setNewPincode] = useState('');
  const [isUpdatingPincodes, setIsUpdatingPincodes] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBatteryOptIgnored, setIsBatteryOptIgnored] = useState<boolean>(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    storage.getItem('saved_staff_email').then((savedEmail) => {
      if (savedEmail && savedEmail.trim()) {
        setLoginEmail(savedEmail.trim());
      }
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    backgroundAlertService.isBatteryOptimizationIgnored().then(setIsBatteryOptIgnored);
  }, []);

  useEffect(() => {
    if (frontendUrl) {
      setCustomFrontendUrl(frontendUrl);
    }
  }, [frontendUrl]);

  useEffect(() => {
    if (acceptedPincodes) {
      setPincodesList(acceptedPincodes);
    }
  }, [acceptedPincodes]);

  const handleSaveFrontendUrl = async () => {
    if (!customFrontendUrl.trim()) {
      Alert.alert('Required', 'Please enter a valid customer frontend URL.');
      return;
    }
    setIsUpdatingFrontendUrl(true);
    const success = await setFrontendUrl(customFrontendUrl.trim());
    setIsUpdatingFrontendUrl(false);
    if (success) {
      Alert.alert(
        'Frontend URL Saved',
        'Customer web app URL updated successfully. Existing physical table QR codes remain preserved.'
      );
    } else {
      Alert.alert('Update Failed', 'Could not update frontend URL. Check connection.');
    }
  };

  const handleAddPincode = () => {
    const code = newPincode.trim();
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit postal pincode.');
      return;
    }
    if (pincodesList.includes(code)) {
      Alert.alert('Duplicate', `Pincode ${code} is already in the list.`);
      return;
    }
    setPincodesList(prev => [...prev, code]);
    setNewPincode('');
  };

  const handleRemovePincode = (codeToRemove: string) => {
    setPincodesList(prev => prev.filter(c => c !== codeToRemove));
  };

  const handleSavePincodes = async () => {
    setIsUpdatingPincodes(true);
    const success = await updateAcceptedPincodes(pincodesList);
    setIsUpdatingPincodes(false);
    if (success) {
      Alert.alert(
        'Pincodes Saved',
        pincodesList.length > 0 
          ? `Delivery restricted to ${pincodesList.length} pincode(s). Customers outside these areas will be blocked.`
          : 'All delivery pincodes cleared. Delivery is now available everywhere.'
      );
    } else {
      Alert.alert('Update Failed', 'Could not save delivery pincodes. Check connection.');
    }
  };

  const handleSaveConnection = async () => {
    if (!url.trim()) {
      Alert.alert('Missing Info', 'Please enter backend host / URL');
      return;
    }

    setIsTesting(true);
    const success = await setConnectionConfig(url.trim(), tenant.trim());
    setIsTesting(false);

    if (success) {
      Alert.alert('Connected!', 'Backend host and configuration saved.');
    } else {
      Alert.alert('Notice', 'URL saved, but server health check failed. Verify server is online.');
    }
  };

  const handleTestAlarm = async () => {
    if (isAlarmPlaying) {
      await alarmService.stopAlert();
      setIsAlarmPlaying(false);
    } else {
      setIsAlarmPlaying(true);
      await alarmService.startAlert();
      setTimeout(async () => {
        await alarmService.stopAlert();
        setIsAlarmPlaying(false);
      }, 5000);
    }
  };

  const handleLoginSubmit = async () => {
    if (!loginEmail.trim() || !loginPass.trim()) {
      Alert.alert('Validation Error', 'Please enter email and password');
      return;
    }

    setIsLoggingIn(true);
    const res = await login(loginEmail.trim(), loginPass.trim(), tenant.trim() || undefined);
    setIsLoggingIn(false);

    if (res.success) {
      Alert.alert('Welcome!', 'Signed in successfully.');
    } else {
      Alert.alert('Login Failed', res.message || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F8FAFC' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[
          styles.content,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 60 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, isConnected ? styles.connectedBg : styles.disconnectedBg]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
          <Text style={styles.statusTitle}>
            {isConnected ? 'Backend Online & Synced' : 'Offline / Reconnecting'}
          </Text>
        </View>
        <Text style={styles.statusSub}>
          Restaurant: <Text style={styles.storeHighlight}>{restaurantName}</Text>
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>RESTAURANT OPERATIONS</Text>
        <View style={styles.box}>
          {/* Dedicated Online Orders Control */}
          <View style={styles.operationsRow}>
            <View style={styles.opIconContainer}>
              <Globe size={18} color="#EA580C" />
            </View>
            <View style={styles.operationsText}>
              <View style={styles.operationsTitleRow}>
                <Text style={styles.operationsTitle}>Accept Online Orders</Text>
                <View style={[styles.opBadge, acceptingOnlineOrders ? styles.opBadgeOpen : styles.opBadgeClosed]}>
                  <Text style={[styles.opBadgeText, acceptingOnlineOrders ? styles.opBadgeTextOpen : styles.opBadgeTextClosed]}>
                    {acceptingOnlineOrders ? 'OPEN' : 'PAUSED'}
                  </Text>
                </View>
              </View>
              <Text style={styles.boxDesc}>Takeaway, pickup & direct home deliveries from website.</Text>
            </View>
            <Switch
              value={acceptingOnlineOrders}
              onValueChange={(val) => setAcceptingOnlineOrders(val)}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>

          <View style={styles.opDivider} />

          {/* Dedicated Table / Dine-In Orders Control */}
          <View style={styles.operationsRow}>
            <View style={styles.opIconContainer}>
              <QrCode size={18} color="#EA580C" />
            </View>
            <View style={styles.operationsText}>
              <View style={styles.operationsTitleRow}>
                <Text style={styles.operationsTitle}>Accept Table Orders</Text>
                <View style={[styles.opBadge, acceptingTableOrders ? styles.opBadgeOpen : styles.opBadgeClosed]}>
                  <Text style={[styles.opBadgeText, acceptingTableOrders ? styles.opBadgeTextOpen : styles.opBadgeTextClosed]}>
                    {acceptingTableOrders ? 'OPEN' : 'PAUSED'}
                  </Text>
                </View>
              </View>
              <Text style={styles.boxDesc}>In-restaurant dine-in and table QR code ordering.</Text>
            </View>
            <Switch
              value={acceptingTableOrders}
              onValueChange={(val) => setAcceptingTableOrders(val)}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>STAFF AUTHENTICATION</Text>
        <View style={styles.box}>
          {isAuthenticated && currentUser ? (
            <View style={styles.userProfileRow}>
              <View style={styles.userAvatar}>
                <User size={22} color="#0F172A" />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{currentUser.name || 'Admin'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{currentUser.role.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>{currentUser.email}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <LogOut size={16} color="#E11D48" />
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.boxDesc}>
                Sign in with your staff account to view orders, update kitchen tickets, and manage menu items.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="staff@restaurant.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={loginPass}
                  onChangeText={setLoginPass}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleLoginSubmit}
                disabled={isLoggingIn}
                activeOpacity={0.8}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <LogIn size={16} color="#FFFFFF" />
                    <Text style={styles.loginBtnText}>Sign In to Terminal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>INCOMING ORDER ALARM & SOUND</Text>
        <View style={styles.box}>
          <Text style={styles.boxDesc}>
            Test the loud looping alarm chime and vibration pattern that fires when customers place orders.
          </Text>
          <TouchableOpacity 
            style={[styles.alarmTestBtn, isAlarmPlaying ? styles.alarmPlayingBtn : null]} 
            onPress={handleTestAlarm}
            activeOpacity={0.8}
          >
            <Volume2 size={18} color="#FFFFFF" />
            <Text style={styles.alarmTestText}>
              {isAlarmPlaying ? 'Stop Ringing' : 'Test Alarm Sound (5s)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>BACKGROUND & LOCKSCREEN RELIABILITY</Text>
        <View style={styles.box}>
          <Text style={styles.boxDesc}>
            Ensures orders ring immediately even when the device is locked, while preserving battery with lightweight event-driven sockets.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featureLeft}>
              <Smartphone size={16} color="#16A34A" />
              <Text style={styles.featureTitle}>Lockscreen Screen Wake</Text>
            </View>
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureLeft}>
              <ShieldCheck size={16} color="#16A34A" />
              <Text style={styles.featureTitle}>Battery Consumption</Text>
            </View>
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>ULTRA LOW</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureLeft}>
              <Zap size={16} color={isBatteryOptIgnored ? '#16A34A' : '#EA580C'} />
              <Text style={styles.featureTitle}>Background Doze Protection</Text>
            </View>
            <View style={isBatteryOptIgnored ? styles.pillGreen : styles.pillOrange}>
              <Text style={isBatteryOptIgnored ? styles.pillGreenText : styles.pillOrangeText}>
                {isBatteryOptIgnored ? 'ENABLED' : 'REQUIRED'}
              </Text>
            </View>
          </View>

          {!isBatteryOptIgnored && (
            <TouchableOpacity
              style={styles.batteryExemptBtn}
              onPress={() => {
                backgroundAlertService.requestBatteryOptimizationExemption();
                setTimeout(() => {
                  backgroundAlertService.isBatteryOptimizationIgnored().then(setIsBatteryOptIgnored);
                }, 2000);
              }}
              activeOpacity={0.8}
            >
              <Zap size={15} color="#FFFFFF" />
              <Text style={styles.batteryExemptBtnText}>Disable Battery Optimization</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>CUSTOMER ORDERING WEBSITE</Text>
        <View style={styles.box}>
          <Text style={styles.boxDesc}>
            Base web address for customer online orders and table menu QR codes. Existing physical table QR codes remain preserved.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>ORDERING WEBSITE URL</Text>
            <TextInput
              style={styles.input}
              value={customFrontendUrl}
              onChangeText={setCustomFrontendUrl}
              placeholder="https://order.your-restaurant.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSaveFrontendUrl} 
            disabled={isUpdatingFrontendUrl}
            activeOpacity={0.8}
          >
            {isUpdatingFrontendUrl ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Globe size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Website URL</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DELIVERY PINCODES & SERVICE AREA</Text>
        <View style={styles.box}>
          <Text style={styles.boxDesc}>
            Specify 6-digit pincodes where outside home delivery is available. Customers attempting to order outside these pincodes will be blocked.
          </Text>

          {/* Add Pincode Input Row */}
          <View style={styles.pincodeInputRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.pincodeInput}
                value={newPincode}
                onChangeText={setNewPincode}
                placeholder="6-digit pincode (e.g. 530001)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            <TouchableOpacity 
              style={styles.addPincodeBtn}
              onPress={handleAddPincode}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addPincodeBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Pincode Chips Container */}
          <View style={styles.pincodesContainer}>
            {pincodesList.length > 0 ? (
              pincodesList.map((code) => (
                <View key={code} style={styles.pincodeChip}>
                  <MapPin size={13} color="#EA580C" />
                  <Text style={styles.pincodeChipText}>{code}</Text>
                  <TouchableOpacity 
                    onPress={() => handleRemovePincode(code)} 
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noPincodesNotice}>
                <Text style={styles.noPincodesNoticeText}>
                  No restrictions set — delivery accepted from all areas.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { marginTop: 14 }]} 
            onPress={handleSavePincodes}
            disabled={isUpdatingPincodes}
            activeOpacity={0.8}
          >
            {isUpdatingPincodes ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Delivery Pincodes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>SERVER & OUTLET CONNECTION</Text>
        <View style={styles.box}>
          <View style={styles.field}>
            <Text style={styles.label}>SERVER ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://your-api.domain.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>OUTLET IDENTIFIER (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={tenant}
              onChangeText={setTenant}
              placeholder="Auto-detected on staff sign in"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSaveConnection} 
            disabled={isTesting}
            activeOpacity={0.8}
          >
            {isTesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Wifi size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Connection</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  connectedBg: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  disconnectedBg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectedDot: {
    backgroundColor: '#16A34A',
  },
  disconnectedDot: {
    backgroundColor: '#DC2626',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusSub: {
    fontSize: 13,
    color: '#475569',
  },
  storeHighlight: {
    fontWeight: '800',
    color: '#0F172A',
  },
  section: {
    marginBottom: 18,
  },

  operationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  opIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  operationsText: {
    flex: 1,
    paddingRight: 16,
  },
  operationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  operationsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  opBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opBadgeOpen: {
    backgroundColor: '#DCFCE7',
  },
  opBadgeClosed: {
    backgroundColor: '#FEE2E2',
  },
  opBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  opBadgeTextOpen: {
    color: '#15803D',
  },
  opBadgeTextClosed: {
    color: '#B91C1C',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  box: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alarmTestBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  alarmPlayingBtn: {
    backgroundColor: '#DC2626',
  },
  alarmTestText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    gap: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  pillGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillGreenText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  pillOrange: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillOrangeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  batteryExemptBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 14,
  },
  batteryExemptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pincodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  pincodeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  addPincodeBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 4,
  },
  addPincodeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pincodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 36,
  },
  pincodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  pincodeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  noPincodesNotice: {
    paddingVertical: 8,
  },
  noPincodesNoticeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
