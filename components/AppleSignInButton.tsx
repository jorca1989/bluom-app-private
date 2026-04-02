import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth } from '@clerk/clerk-expo';

type Props = {
  disabled?: boolean;
};

export default function AppleSignInButton({ disabled }: Props) {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_apple' });
  const [loading, setLoading] = React.useState(false);

  // Apple sign-in is iOS-only in-app.
  if (Platform.OS !== 'ios') return null;

  const onPress = async () => {
    if (disabled || loading) return;
    try {
      setLoading(true);
      const redirectUrl = 'bluom://sso-callback';
      console.log('🍎 [AppleAuth] Starting OAuth Flow with redirectUrl:', redirectUrl);

      const { createdSessionId, setActive, authSessionResult } = await startOAuthFlow({
        redirectUrl,
      });

      console.log('🍎 [AppleAuth] OAuth Flow completed.');
      console.log('🍎 [AppleAuth] authSessionResult:', JSON.stringify(authSessionResult, null, 2));
      console.log('🍎 [AppleAuth] createdSessionId:', createdSessionId);

      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
        console.log('🍎 [AppleAuth] User cancelled or dismissed the flow.');
        return;
      }

      // Important fix: explicitly check if the type was a success before assuming the session is valid
      console.log('🍎 [AppleAuth] Flow Result Type:', authSessionResult?.type);
      
      if ((authSessionResult?.type === 'success' || createdSessionId) && setActive) {
        if (createdSessionId) {
          console.log('🍎 [AppleAuth] Setting active session to:', createdSessionId);
          await setActive({ session: createdSessionId });
          console.log('🍎 [AppleAuth] Session successfully set!');
        } else {
          console.log('🍎 [AppleAuth] Auth success but no session ID yet. This may be handled by Clerk internally.');
        }
      } else {
        console.log('🍎 [AppleAuth] authSessionResult type was not success and missing session ID. Full Result:', JSON.stringify(authSessionResult));
        Alert.alert('Apple sign-in incomplete', 'Could not establish session. Please try again or use another method.');
      }
    } catch (e: any) {
      const code = e?.code ?? e?.errorCode;
      if (String(code) === 'ERR_REQUEST_CANCELED') {
         console.log('🍎 [AppleAuth] Request cleanly cancelled by OS.');
         return;
      }
      console.error('🍎 [AppleAuth] Fatal Error during sign in:', e);
      Alert.alert('Apple sign-in failed', e?.message ? String(e.message) : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
    >
      <View style={styles.row}>
        <Ionicons name="logo-apple" size={20} color="#0f172a" />
        <Text style={styles.text}>Continue with Apple</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  text: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
