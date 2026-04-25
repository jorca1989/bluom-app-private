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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react-native';
import { MASTER_ADMINS } from '@/convex/permissions';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AppleSignInButton from '@/components/AppleSignInButton';
import { useTranslation } from 'react-i18next';

function isAdminEmail(email: string) {
  const e = String(email ?? '').toLowerCase().trim();
  return !!e && MASTER_ADMINS.map((x) => String(x).toLowerCase().trim()).includes(e);
}

export default function LoginScreen() {
  const { t } = useTranslation();
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
      Alert.alert(t('auth.login.codeSent', 'Verification code sent'), t('auth.login.codeSentMsg', 'Check your email for a verification code to finish signing in.'));
    } catch (err: any) {
      console.error('[Auth] prepareFirstFactor error:', err);
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? '';
      const lower = String(msg).toLowerCase();
      if (lower.includes('allowed values') || lower.includes('email_code') || lower.includes('strategy')) {
        Alert.alert(t('auth.login.clerkSecTitle', 'Clerk Security Triggered'), t('auth.login.clerkSecMsg', 'Clerk is requiring a security check. Please try a different network or wait and try again.'));
      } else {
        Alert.alert(t('auth.login.couldNotSendCode', 'Could not send code'), msg || t('auth.login.codeSentMsg', 'Failed to send verification code.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaCode = async () => {
    if (!isLoaded) return;
    if (!mfaCode || mfaCode.length < 4) {
      Alert.alert(t('auth.login.mfaPlaceholder', 'Enter code'), t('auth.login.enterCode', 'Please enter the code from your email.'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await (signIn as any).attemptFirstFactor({ strategy: 'email_code', code: mfaCode });
      if (result?.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        if (Platform.OS === 'web') {
          router.replace(isAdminEmail(email) ? '/admin' : '/(tabs)');
        }
      } else {
        Alert.alert(t('auth.login.verifyIncomplete', 'Verification incomplete'), `Clerk returned status: ${result?.status ?? 'unknown'}`);
      }
    } catch (err: any) {
      console.error('[Auth] attemptFirstFactor error:', err);
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message;
      Alert.alert(t('auth.login.verifyFailed', 'Verification failed'), msg || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!isLoaded) return;
    if (submitLockRef.current || loading) return;

    submitLockRef.current = true;
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        setError(t('auth.login.errFillFields', 'Please enter both email and password'));
        return;
      }

      if ((signIn as any)?.status === 'needs_second_factor') {
        try { await prepareEmailCodeMfa(); } catch (e) { console.error(e); }
        return;
      }

      try {
        const result = await signIn.create({ identifier: email, password });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          if (Platform.OS === 'web') {
            router.replace(isAdminEmail(email) ? '/admin' : '/(tabs)');
          }
        } else {
          if (result.status === 'needs_second_factor') {
            try { await prepareEmailCodeMfa(); } catch (e) { console.error(e); }
          } else {
            setError(`Login incomplete (${result.status}). Please try again.`);
          }
        }
      } catch (err: any) {
        const longMessage = err?.errors?.[0]?.longMessage;
        const message = err?.errors?.[0]?.message ?? err?.message ?? '';
        Alert.alert(t('auth.login.loginFailed', 'Login Failed'), longMessage || message || 'Failed to sign in.');
        setError(err.errors?.[0]?.message || t('auth.login.errSignIn', 'Failed to sign in. Please check your credentials.'));
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.login.title', 'Welcome Back')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle', 'Sign in to continue your wellness journey')}</Text>
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
                  {t('auth.login.mfaTitle', 'Enter the code from your email')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.mfaPlaceholder', 'Email code')}
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
                  <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {loading ? <ActivityIndicator color="#ffffff" /> : (
                      <>
                        <LogIn size={20} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>{t('auth.login.verifyContinue', 'Verify & Continue')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMfaPending(false); setMfaCode(''); }} disabled={loading} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#2563eb', fontWeight: '700' }}>{t('auth.login.back', 'Back')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconWrapper}><Mail size={20} color="#64748b" /></View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.login.emailPlaceholder', 'Email')}
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
                  <View style={styles.inputIconWrapper}><Lock size={20} color="#64748b" /></View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.login.passwordPlaceholder', 'Password')}
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!loading}
                  />
                  <TouchableOpacity style={styles.eyeIconWrapper} onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </TouchableOpacity>
                </View>

                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable style={{ alignItems: 'flex-end', marginBottom: 16 }}>
                    <Text className="text-blue-600 font-semibold">{t('auth.login.forgotPassword', 'Forgot Password?')}</Text>
                  </Pressable>
                </Link>

                <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleEmailLogin} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? <ActivityIndicator color="#ffffff" /> : (
                      <>
                        <LogIn size={20} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>{t('auth.login.loginBtn', 'Login')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <>
                    {/* Social Logins - Hidden for Lite Build */}
                    {/*
                    <GoogleSignInButton disabled={loading} />
                    <View style={{ height: 12 }} />
                    <AppleSignInButton disabled={loading} />
                    */}
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.login.noAccount', "Don't have an account? ")}</Text>
            <TouchableOpacity onPress={() => router.push('/signup')} disabled={loading}>
              <Text style={styles.footerLink}>{t('auth.login.createAccount', 'Create Account')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', lineHeight: 24 },
  errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 24 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  form: { flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIconWrapper: { marginRight: 12 },
  eyeIconWrapper: { marginLeft: 12, padding: 4 },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1e293b' },
  primaryButton: { marginTop: 8, marginBottom: 24, borderRadius: 12, overflow: 'hidden', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  gradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { paddingHorizontal: 16, color: '#94a3b8', fontSize: 14 },
  googleButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  googleButtonText: { color: '#1e293b', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
