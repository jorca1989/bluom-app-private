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
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react-native';

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitLockRef = useRef(false);

  const getFriendlyErrorMessage = (error: any): string => {
    const errorMessage = error?.errors?.[0]?.message || '';
    if (errorMessage.toLowerCase().includes('password')) return 'Password must be at least 8 characters long';
    if (errorMessage.toLowerCase().includes('email')) return 'Please enter a valid email address or one not already in use.';
    return errorMessage || 'Something went wrong. Please try again.';
  };

  const handleEmailSignup = async () => {
    if (!isLoaded || submitLockRef.current || loading) return;
    submitLockRef.current = true;

    if (!email || !password) {
      setError('Please fill in all fields');
      submitLockRef.current = false;
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await signUp.create({ emailAddress: email, password });
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

    try {
      setLoading(true);
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(`Verification incomplete: ${result.status}`);
      }
    } catch (err: any) {
      setError('Invalid code. Please try again.');
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
            <Text style={styles.title}>{pendingVerification ? 'Verify Your Email' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {pendingVerification ? `Enter the code sent to ${email}` : 'Start your personalized wellness journey today'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}

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
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify Email</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
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
                    placeholder="Password"
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
                    {loading ? <ActivityIndicator color="#fff" /> : <><UserPlus size={20} color="#fff" /><Text style={styles.primaryButtonText}>Create Account</Text></>}
                  </LinearGradient>
                </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 40 },
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
});