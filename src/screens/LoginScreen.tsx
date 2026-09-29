import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { 
  ChefHat, 
  Mail, 
  Lock, 
  LogIn, 
  Store, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Server, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react-native';

interface OutletOption {
  id: string;
  name: string;
  defaultEmail: string;
}

const OUTLETS: OutletOption[] = [
  { id: 'b20dfe0b-2fec-49b0-aa3d-5d890e7434c3', name: 'Biryani vs Pulao', defaultEmail: 'admin@biryanivspulao.com' },
  { id: '9d8ef7d0-9655-441a-9630-629d761283c3', name: 'Spice Garden', defaultEmail: 'manager@spicegarden.com' },
  { id: 'auto', name: 'Auto-Detect / Other', defaultEmail: '' },
];

export const LoginScreen: React.FC = () => {
  const { login, serverUrl, setConnectionConfig } = useAdminStore();

  const [selectedOutlet, setSelectedOutlet] = useState<string>('b20dfe0b-2fec-49b0-aa3d-5d890e7434c3');
  const [email, setEmail] = useState('admin@biryanivspulao.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(serverUrl || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverTestStatus, setServerTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [serverTestMsg, setServerTestMsg] = useState<string>('');

  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
    if (serverUrl && serverUrl.trim()) {
      setCustomServerUrl(serverUrl.trim());
    }
  }, [serverUrl]);

  const handleSelectOutlet = (outlet: OutletOption) => {
    setSelectedOutlet(outlet.id);
    if (outlet.defaultEmail) {
      setEmail(outlet.defaultEmail);
    }
    setErrorMessage(null);
  };

  const handleApplyServerUrl = async () => {
    const cleanUrl = customServerUrl.trim();
    if (!cleanUrl) {
      setServerTestStatus('failed');
      setServerTestMsg('Please enter a server URL');
      return;
    }

    setServerTestStatus('testing');
    try {
      const tenantToTest = selectedOutlet !== 'auto' ? selectedOutlet : '';
      const ok = await setConnectionConfig(cleanUrl, tenantToTest);
      if (ok) {
        setServerTestStatus('success');
        setServerTestMsg('Connected successfully');
      } else {
        setServerTestStatus('failed');
        setServerTestMsg('Server unreachable. Please check URL');
      }
    } catch (err: any) {
      setServerTestStatus('failed');
      setServerTestMsg(err?.message || 'Connection failed');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const activeUrl = customServerUrl.trim() || serverUrl;
      const effectiveTenant = selectedOutlet !== 'auto' ? selectedOutlet : undefined;

      const res = await login(email.trim(), password.trim(), effectiveTenant, activeUrl);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid credentials or unauthorized restaurant outlet.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardView} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 50 }
        ]} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        {/* ── Brand Header ── */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <ChefHat size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>Kitchen Admin</Text>
          <Text style={styles.appSubtitle}>Live Kitchen & POS Terminal</Text>
          <View style={styles.isolationBadge}>
            <ShieldCheck size={12} color="#15803D" />
            <Text style={styles.isolationText}>STRICT TENANT ISOLATION ACTIVE</Text>
          </View>
        </View>

        {/* ── Login Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Sign In</Text>
          <Text style={styles.cardDesc}>
            Select your restaurant outlet and enter your staff credentials to access orders and menu operations.
          </Text>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#E11D48" style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Outlet Selection */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>SELECT RESTAURANT OUTLET</Text>
            <View style={styles.outletRow}>
              {OUTLETS.map((outlet) => {
                const isSelected = selectedOutlet === outlet.id;
                return (
                  <TouchableOpacity
                    key={outlet.id}
                    style={[styles.outletCard, isSelected && styles.outletCardSelected]}
                    onPress={() => handleSelectOutlet(outlet)}
                    activeOpacity={0.8}
                  >
                    <Store size={14} color={isSelected ? '#EA580C' : '#64748B'} />
                    <Text style={[styles.outletName, isSelected && styles.outletNameSelected]}>
                      {outlet.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STAFF EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <Mail size={16} color="#94A3B8" />
              <TextInput
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                placeholder="admin@restaurant.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Lock size={16} color="#94A3B8" />
              <TextInput
                style={styles.inputInner}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#64748B" />
                ) : (
                  <Eye size={18} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity 
            style={styles.signInBtn} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <LogIn size={18} color="#FFFFFF" />
                <Text style={styles.signInBtnText}>SIGN IN TO RESTAURANT</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Server Config Collapsible */}
          <TouchableOpacity 
            style={styles.serverConfigToggle} 
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Server size={14} color="#64748B" />
            <Text style={styles.serverConfigToggleText}>
              {showServerConfig ? 'Hide Server Configuration' : 'Configure Backend Server URL'}
            </Text>
            {showServerConfig ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverBox}>
              <Text style={styles.fieldLabel}>FASTIFY BACKEND API URL</Text>
              <TextInput
                style={styles.input}
                value={customServerUrl}
                onChangeText={(val) => {
                  setCustomServerUrl(val);
                  setServerTestStatus('idle');
                }}
                placeholder="https://your-api.domain.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={styles.applyBtn}
                onPress={handleApplyServerUrl}
                disabled={serverTestStatus === 'testing'}
                activeOpacity={0.8}
              >
                {serverTestStatus === 'testing' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyBtnText}>Apply & Test Server URL</Text>
                )}
              </TouchableOpacity>

              {serverTestStatus === 'success' && (
                <View style={styles.testSuccessBox}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <Text style={styles.testSuccessText}>{serverTestMsg}</Text>
                </View>
              )}

              {serverTestStatus === 'failed' && (
                <View style={styles.testFailedBox}>
                  <AlertCircle size={14} color="#DC2626" />
                  <Text style={styles.testFailedText}>{serverTestMsg}</Text>
                </View>
              )}
            </View>
          )}

        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Data Isolation Guarantee: All live orders, billing records, and stock status are strictly scoped to your authenticated restaurant outlet.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  isolationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 10,
  },
  isolationText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },
  outletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outletCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  outletCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  outletName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  outletNameSelected: {
    color: '#EA580C',
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  inputInner: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  testSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  testSuccessText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  testFailedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  testFailedText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  signInBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  serverConfigToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 6,
  },
  serverConfigToggleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  serverBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
    marginTop: 20,
    lineHeight: 16,
  },
});
