import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useSignInWithApple } from '@clerk/clerk-expo';
import * as AppleAuthentication from 'expo-apple-authentication';

type Props = {
  disabled?: boolean;
};

export default function AppleSignInButton({ disabled }: Props) {
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [loading, setLoading] = React.useState(false);

  const onPress = async () => {
    if (disabled || loading) return;
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (e: any) {
      const code = e?.code ?? e?.errorCode;
      if (String(code) === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Sign-In failed', e?.message ? String(e.message) : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, (disabled || loading) && { opacity: 0.6 }]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={styles.btn}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  btn: { width: '100%', height: 56 },
});

