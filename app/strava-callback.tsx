import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Handle the redirect from Strava (https://bluom.app/strava-callback)
 */
export default function StravaCallbackScreen() {
  const router = useRouter();
  const { code, error } = useLocalSearchParams<{ code: string; error: string }>();
  const exchangeToken = useAction(api.strava.exchangeToken);

  useEffect(() => {
    async function handleExchange() {
      if (error) {
        console.error('Strava Auth Error:', error);
        router.replace('/integrations');
        return;
      }

      if (code) {
        try {
          await exchangeToken({ code });
          router.replace('/integrations');
        } catch (err) {
          console.error('Token Exchange Failed:', err);
          router.replace('/integrations');
        }
      } else {
        // No code, no error - something is wrong
        router.replace('/integrations');
      }
    }

    handleExchange();
  }, [code, error, exchangeToken, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fc4c02" />
      <Text style={styles.text}>Connecting to Strava...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
});
