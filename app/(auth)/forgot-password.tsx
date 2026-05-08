import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Request an email code
  const onRequestReset = async () => {
    if (!isLoaded) return;
    if (!emailAddress) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });

      setSuccessfulCreation(true);
      setError('');
    } catch (err: any) {
      console.error('[Forgot Password] Request Error:', err);
      setError(err?.errors?.[0]?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the code and set a new password
  const onReset = async () => {
    if (!isLoaded) return;
    if (!code || !password) {
      setError('Please enter both the reset code and your new password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Alert.alert('Password Reset', 'Your password has been successfully reset.');
        router.replace('/(tabs)');
      } else {
        console.warn('[Forgot Password] Reset returned non-complete status:', result.status);
        setError(`Password reset incomplete (${result.status}). Please try again.`);
      }
    } catch (err: any) {
      console.error('[Forgot Password] Reset Error:', err);
      setError(err?.errors?.[0]?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F4F0]" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-10">
        <Text className="text-3xl font-bold text-slate-800 mb-2">Reset Password</Text>
        
        {error ? (
          <View className="bg-red-100 p-3 rounded-lg mb-6">
            <Text className="text-red-600 text-sm text-center">{error}</Text>
          </View>
        ) : null}

        {!successfulCreation ? (
          <View className="mt-4">
            <Text className="text-slate-500 mb-6 leading-6">
              Enter the email address associated with your account and we'll send you a short code to reset your password.
            </Text>
            
            <View className="flex-row items-center bg-white rounded-xl mb-6 px-4 border border-slate-200 h-14">
              <Mail size={20} color="#64748b" className="mr-3" />
              <TextInput
                className="flex-1 text-base text-slate-800"
                placeholder="Email address"
                placeholderTextColor="#94a3b8"
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              onPress={onRequestReset}
              disabled={loading}
              className={`bg-blue-600 rounded-xl py-4 flex-row justify-center items-center ${loading ? 'opacity-60' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-base font-semibold">Send Reset Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.back()} 
              disabled={loading}
              className="mt-6"
            >
              <Text className="text-blue-600 font-semibold text-center">Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-4">
            <Text className="text-slate-500 mb-6 leading-6">
              A 6-digit code has been sent to {emailAddress}. Enter it below along with your new password.
            </Text>

            <View className="flex-row items-center bg-white rounded-xl mb-4 px-4 border border-slate-200 h-14">
              <TextInput
                className="flex-1 text-base text-slate-800 text-center tracking-[8px] font-bold"
                placeholder="000000"
                placeholderTextColor="#cbd5e1"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>

            <View className="flex-row items-center bg-white rounded-xl mb-6 px-4 border border-slate-200 h-14">
              <Lock size={20} color="#64748b" className="mr-3" />
              <TextInput
                className="flex-1 text-base text-slate-800"
                placeholder="New Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              onPress={onReset}
              disabled={loading}
              className={`bg-blue-600 rounded-xl py-4 flex-row justify-center items-center ${loading ? 'opacity-60' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-base font-semibold">Reset & Login</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
