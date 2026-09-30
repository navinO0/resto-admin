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
import { storage } from '../utils/storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export const LoginScreen: React.FC = () => {
  const { login, serverUrl, setConnectionConfig } = useAdminStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Autofill previously saved staff email
  useEffect(() => {
    storage.getItem('saved_staff_email').then((savedEmail) => {
      if (savedEmail && savedEmail.trim()) {
        setEmail(savedEmail.trim());
      }
    });
  }, []);

  useEffect(() => {
    if (serverUrl && serverUrl.trim()) {
      setCustomServerUrl(serverUrl.trim());
    }
  }, [serverUrl]);

  const handleApplyServerUrl = async () => {
    const cleanUrl = customServerUrl.trim();
    if (!cleanUrl) {
      setServerTestStatus('failed');
      setServerTestMsg('Please enter a server address');
      return;
    }

    setServerTestStatus('testing');
    try {
      const ok = await setConnectionConfig(cleanUrl, '');
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
      const res = await login(email.trim(), password.trim(), undefined, activeUrl);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid email or password. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check your server connection.');
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
        
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="restaurant-menu" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>Kitchen Admin</Text>
          <Text style={styles.appSubtitle}>Live Kitchen & POS Terminal</Text>
          <View style={styles.isolationBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#15803D" />
            <Text style={styles.isolationText}>RESTAURANT STAFF TERMINAL</Text>
          </View>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Sign In</Text>
          <Text style={styles.cardDesc}>
            Enter your restaurant staff credentials to access live orders, kitchen tickets, and menu management.
          </Text>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#E11D48" style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STAFF EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                placeholder="staff@restaurant.com"
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
              <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
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
                  <Ionicons name="eye-off-outline" size={18} color="#64748B" />
                ) : (
                  <Ionicons name="eye-outline" size={18} color="#64748B" />
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
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.signInBtnText}>SIGN IN</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Server Config Collapsible */}
          <TouchableOpacity 
            style={styles.serverConfigToggle} 
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Ionicons name="server-outline" size={14} color="#64748B" />
            <Text style={styles.serverConfigToggleText}>
              {showServerConfig ? 'Hide Server Configuration' : 'Server Setup (Optional)'}
            </Text>
            {showServerConfig ? <Ionicons name="chevron-up" size={14} color="#64748B" /> : <Ionicons name="chevron-down" size={14} color="#64748B" />}
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverBox}>
              <Text style={styles.fieldLabel}>SERVER ADDRESS</Text>
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
                  <Text style={styles.applyBtnText}>Connect & Verify Server</Text>
                )}
              </TouchableOpacity>

              {serverTestStatus === 'success' && (
                <View style={styles.testSuccessBox}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={styles.testSuccessText}>{serverTestMsg}</Text>
                </View>
              )}

              {serverTestStatus === 'failed' && (
                <View style={styles.testFailedBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.testFailedText}>{serverTestMsg}</Text>
                </View>
              )}
            </View>
          )}

        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Secure Restaurant Terminal • Connected to your kitchen and live orders.
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
