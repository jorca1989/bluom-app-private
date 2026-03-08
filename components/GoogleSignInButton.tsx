import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth } from '@clerk/clerk-expo';

type Props = {
  disabled?: boolean;
};

export default function GoogleSignInButton({ disabled }: Props) {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [loading, setLoading] = React.useState(false);

  // Keep native-only for now to avoid web redirect complexity.
  if (Platform.OS === 'web') return null;

  const onPress = async () => {
    if (disabled || loading) return;
    try {
      setLoading(true);
      // Android can produce triple-slash redirects (bluom:///...) via Linking.createURL.
      // Clerk requires exact string match against allowlisted redirect URLs.
      const redirectUrl = 'bluom://sso-callback';
      console.log('[auth][google] redirectUrl', redirectUrl);

      const { createdSessionId, setActive, authSessionResult } = await startOAuthFlow({
        redirectUrl,
      });

      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
        return;
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        Alert.alert('Google sign-in incomplete', 'Please try again.');
      }
    } catch (e: any) {
      const code = e?.code ?? e?.errorCode;
      if (String(code) === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Google sign-in failed', e?.message ? String(e.message) : 'Please try again.');
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
        <Ionicons name="logo-google" size={18} color="#4285F4" />
        <Text style={styles.text}>Continue with Google</Text>
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

