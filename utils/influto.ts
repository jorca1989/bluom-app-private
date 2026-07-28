import Constants from 'expo-constants';
import { Platform } from 'react-native';
import InfluTo from '@influto/react-native-sdk';

let initialized = false;
let initializedPromise: Promise<void> | null = null;
let identifiedUserId: string | null = null;

// Public SDK key — safe to bundle (not a secret, same pattern as RevenueCat keys)
const INFLUTO_API_KEY = 'it_f7GRFZ1ndNcM0JqyLHj69zF3m38wNvTm289g8nuljxM';

export function getInfluToApiKey(): string | null {
  const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}) as Record<string, any>;
  return (
    process.env.EXPO_PUBLIC_INFLUTO_API_KEY ??
    extra.influtoApiKey ??
    INFLUTO_API_KEY
  );
}

export async function initializeInfluTo(appUserId?: string) {
  if (Platform.OS === 'web') return;

  const apiKey = getInfluToApiKey();
  if (!apiKey) {
    console.warn('[InfluTo] Missing INFLU or EXPO_PUBLIC_INFLUTO_API_KEY. SDK not initialized.');
    return;
  }

  if (!initializedPromise) {
    initializedPromise = (async () => {
      await InfluTo.initialize({
        apiKey,
        debug: __DEV__,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        autoCapture: true,
      });
      initialized = true;

      const attribution = await InfluTo.checkAttribution();
      console.log('[InfluTo] Attribution checked:', attribution.attributed ? attribution.referralCode : 'organic');
    })().catch((error) => {
      initialized = false;
      initializedPromise = null;
      console.warn('[InfluTo] Initialization failed:', error);
    });
  }

  await initializedPromise;

  if (initialized && appUserId && identifiedUserId !== appUserId) {
    identifiedUserId = appUserId;
    await InfluTo.identifyUser(appUserId, { source: 'clerk_revenuecat_app_user_id' });
  }
}