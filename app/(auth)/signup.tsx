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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react-native';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AppleSignInButton from '@/components/AppleSignInButton';
import { useTranslation } from 'react-i18next';

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const submitLockRef = useRef(false);

  const getFriendlyErrorMessage = (error: any): string => {
    const err = error?.errors?.[0];
    const msg = err?.longMessage || err?.message || error?.message || '';
    if (msg.toLowerCase().includes('8 characters') || msg.toLowerCase().includes('too short')) {
      return t('auth.signup.pwMinLength', 'Password must be at least 8 characters long.');
    }
    if (msg) return msg;
    return t('common.genericError', 'Something went wrong. Please try again.');
  };

  const handleEmailSignup = async () => {
    if (!isLoaded || submitLockRef.current || loading) return;
    submitLockRef.current = true;
    setLoading(true);
    setError('');

    try {
      if (!firstName || !lastName || !email || !password) {
        setError(t('auth.signup.errFillFields', 'Please fill in all fields'));
        return;
      }
      const result = await signUp.create({ emailAddress: email, password, firstName, lastName });
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signUp || submitLockRef.current || loading) return;
    submitLockRef.current = true;
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(`Verification incomplete: ${result.status}`);
      }
    } catch (err: any) {
      setError(t('auth.signup.errInvalidCode', 'Invalid code. Please try again.'));
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 40) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{pendingVerification ? t('auth.signup.titleVerify', 'Verify Your Email') : t('auth.signup.title', 'Create Account')}</Text>
            <Text style={styles.subtitle}>
              {pendingVerification
                ? t('auth.signup.subtitleVerify', 'Enter the code sent to {{email}}', { email })
                : t('auth.signup.subtitle', 'Start your personalized wellness journey today')}
            </Text>
          </View>

          {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.form}>
            {pendingVerification ? (
              <>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyCode} disabled={loading}>
                  <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.gradientButton}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('auth.signup.verifyBtn', 'Verify Email')}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                    <UserPlus size={20} color="#64748b" style={{ marginRight: 12 }} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('auth.signup.firstNamePlaceholder', 'First Name')}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={[styles.input, { marginLeft: 0 }]}
                      placeholder={t('auth.signup.lastNamePlaceholder', 'Last Name')}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.emailPlaceholder', 'Email')}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#64748b" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.signup.passwordPlaceholder', 'Password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleEmailSignup} disabled={loading}>
                  <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.gradientButton}>
                    {loading ? <ActivityIndicator color="#fff" /> : <><UserPlus size={20} color="#fff" /><Text style={styles.primaryButtonText}>{t('auth.signup.createBtn', 'Create Account')}</Text></>}
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

                <View style={styles.footer}>
                  <Text style={styles.footerText}>{t('auth.signup.alreadyAccount', 'Already have an account? ')}</Text>
                  <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.footerLink}>{t('auth.signup.loginLink', 'Login')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b' },
  errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  form: { flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1e293b' },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  primaryButton: { borderRadius: 12, overflow: 'hidden' },
  gradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { paddingHorizontal: 16, color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, paddingBottom: 40 },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
