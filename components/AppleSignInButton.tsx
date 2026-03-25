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
      console.log('[auth][apple] redirectUrl', redirectUrl);

      const { createdSessionId, setActive, authSessionResult } = await startOAuthFlow({
        redirectUrl,
      });

      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
        return;
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        Alert.alert('Apple sign-in incomplete', 'Please try again.');
      }
    } catch (e: any) {
      const code = e?.code ?? e?.errorCode;
      if (String(code) === 'ERR_REQUEST_CANCELED') return;
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
