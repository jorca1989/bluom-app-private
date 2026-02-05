import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react-native';
import { MASTER_ADMINS } from '@/convex/permissions';

function isAdminEmail(email: string) {
  const e = String(email ?? '').toLowerCase().trim();
  return !!e && MASTER_ADMINS.map((x) => String(x).toLowerCase().trim()).includes(e);
}

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const submitLockRef = useRef(false);

  const prepareEmailCodeMfa = async () => {
    try {
      setLoading(true);
      setError('');
      // Bulletproof: Clerk may require emailAddressId for email_code (otherwise it can behave like MFA is disabled).
      const factor = (signIn as any)?.supportedFirstFactors?.find?.((f: any) => f?.strategy === 'email_code');
      if (factor && 'emailAddressId' in factor && (factor as any).emailAddressId) {
        await (signIn as any).prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: (factor as any).emailAddressId,
        });
      } else {
        throw new Error('No valid email verification strategy found.');
      }
      setMfaPending(true);
      Alert.alert('Verification code sent', 'Check your email for a verification code to finish signing in.');
    } catch (err: any) {
      console.error('[Auth] prepareFirstFactor error:', err);
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? '';
      const lower = String(msg).toLowerCase();
      // Clerk returns "allowed values" / strategy errors when email_code is not enabled for the instance.
      if (lower.includes('allowed values') || lower.includes('email_code') || lower.includes('strategy')) {
        Alert.alert(
          'Clerk Security Triggered',
          "Clerk is requiring a security check. Please try a different network or wait and try again."
        );
      } else {
        Alert.alert('Could not send code', msg || 'Failed to send verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaCode = async () => {
    if (!isLoaded) return;
    if (!mfaCode || mfaCode.length < 4) {
      Alert.alert('Enter code', 'Please enter the code from your email.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      // IMPORTANT: Clerk requires emailAddressId when requesting the code, but NOT when verifying it.
      const result = await (signIn as any).attemptFirstFactor({ strategy: 'email_code', code: mfaCode });
      if (result?.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Web: take admins straight to the admin dashboard (Vercel + hobby plan checks depend on author access).
        if (Platform.OS === 'web') {
          router.replace(isAdminEmail(email) ? '/admin' : '/');
        }
      } else {
        Alert.alert('Verification incomplete', `Clerk returned status: ${result?.status ?? 'unknown'}`);
      }
    } catch (err: any) {
      console.error('[Auth] attemptFirstFactor error:', err);
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message;
      Alert.alert('Verification failed', msg || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!isLoaded) return;
    // Hard guard against same-tick double taps before React state updates propagate.
    if (submitLockRef.current || loading) return;
    submitLockRef.current = true;
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    console.log('Login Attempt:', { email, password });

    // Prevent "zombie" session errors: don't start a new sign-in if one is already in progress.
    // Clerk uses `signIn.status` to track an ongoing sign-in attempt.
    if ((signIn as any)?.status) {
      const status = (signIn as any)?.status;
      console.warn('[Auth] signIn is already in progress', status);
      // Bypass 2FA dead-end: if Clerk says we need a second factor, request an email code.
      if (status === 'needs_second_factor') {
        setLoading(false);
        submitLockRef.current = false;
        try {
          await prepareEmailCodeMfa();
        } catch (e) {
          // prepareEmailCodeMfa handles alerts; swallow to avoid crashes.
          console.error('[Auth] prepareEmailCodeMfa failed:', e);
        }
        return;
      }
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    try {
      setError('');

      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Web: take admins straight to the admin dashboard.
        if (Platform.OS === 'web') {
          router.replace(isAdminEmail(email) ? '/admin' : '/');
        }
      } else {
        console.warn('[Auth] signIn.create returned non-complete status:', result.status);
        if (result.status === 'needs_second_factor') {
          try {
            await prepareEmailCodeMfa();
          } catch (e) {
            console.error('[Auth] prepareEmailCodeMfa failed:', e);
          }
        } else {
          setError(`Login incomplete (${result.status}). Please try again.`);
        }
      }
    } catch (err: any) {
      const code = err?.errors?.[0]?.code;
      const message = err?.errors?.[0]?.message ?? err?.message ?? '';
      const longMessage = err?.errors?.[0]?.longMessage;

      // If Clerk is requiring CAPTCHA or thinks fields are missing, log full object for debugging.
      if (String(code).includes('identifier') || String(code).includes('password') || String(message).toLowerCase().includes('identifier') || String(message).toLowerCase().includes('password')) {
        console.error('Login error (full):', err);
      } else {
        console.error('Login error:', err);
      }

      Alert.alert('Login Failed', longMessage || message || 'Failed to sign in.');
      setError(err.errors?.[0]?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your wellness journey</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {mfaPending ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#334155', fontWeight: '700', marginBottom: 8 }}>
                  Enter the code from your email
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email code"
                  placeholderTextColor="#94a3b8"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 12 }, loading && styles.buttonDisabled]}
                  onPress={handleVerifyMfaCode}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <LogIn size={20} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setMfaPending(false);
                    setMfaCode('');
                  }}
                  disabled={loading}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#2563eb', fontWeight: '700' }}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconWrapper}>
                    <Mail size={20} color="#64748b" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIconWrapper}>
                    <Lock size={20} color="#64748b" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconWrapper}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <LogIn size={20} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} disabled={loading}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIconWrapper: {
    marginRight: 12,
  },
  eyeIconWrapper: {
    marginLeft: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1e293b',
  },
  primaryButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#94a3b8',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
});
