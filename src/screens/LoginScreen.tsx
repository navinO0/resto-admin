import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { ChefHat, Mail, Lock, LogIn, Store, ShieldCheck, ChevronDown, ChevronUp, Server, Eye, EyeOff } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { login, serverUrl, setConnectionConfig } = useAdminStore();

  const [email, setEmail] = useState('admin@biryanivspulao.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(
    serverUrl && !serverUrl.includes('navin.lol') ? serverUrl : 'http://100.109.147.65:4000'
  );

  React.useEffect(() => {
    if (serverUrl && !serverUrl.includes('navin.lol')) {
      setCustomServerUrl(serverUrl);
    } else {
      setCustomServerUrl('http://100.109.147.65:4000');
    }
  }, [serverUrl]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (customServerUrl.trim() && customServerUrl.trim() !== serverUrl) {
        setConnectionConfig(customServerUrl.trim(), '');
      }

      let effectiveTenant: string | undefined = undefined;
      if (email.includes('biryanivspulao')) {
        effectiveTenant = 'b20dfe0b-2fec-49b0-aa3d-5d890e7434c3';
      } else if (email.includes('spicegarden')) {
        effectiveTenant = '9d8ef7d0-9655-441a-9630-629d761283c3';
      }

      const res = await login(email.trim(), password.trim(), effectiveTenant);
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
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
            Authenticate with your restaurant staff credentials to access live kitchen orders and menu operations.
          </Text>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

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
              {showServerConfig ? 'Hide Server URL' : 'Configure Backend Server URL'}
            </Text>
            {showServerConfig ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverBox}>
              <Text style={styles.fieldLabel}>FASTIFY BACKEND API URL</Text>
              <TextInput
                style={styles.input}
                value={customServerUrl}
                onChangeText={setCustomServerUrl}
                placeholder="https://vq88x6oinnilh5tsbx87swga.navin.lol"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
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
    paddingBottom: 40,
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
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetCard: {
    flex: 1,
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
  presetCardActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  presetCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  presetCardTextActive: {
    color: '#EA580C',
  },
  customTenantToggle: {
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  customTenantToggleText: {
    fontSize: 11,
    fontWeight: '700',
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

