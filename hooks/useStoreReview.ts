import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';

const REVIEW_KEY = 'bluom_review_requested_v1';
const APP_OPENS_KEY = 'bluom_app_opens_count';
const APP_STORE_ID = '6759072102';
const APP_STORE_REVIEW_URL = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const PLAY_STORE_REVIEW_URL = process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'market://details?id=com.jwfca.bluom';

export async function incrementAppOpens(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(APP_OPENS_KEY);
    const count = parseInt(raw ?? '0', 10) + 1;
    await SecureStore.setItemAsync(APP_OPENS_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

export async function maybeRequestReview(trigger?: 'action' | 'opens'): Promise<void> {
  try {
    const alreadyRequested = await SecureStore.getItemAsync(REVIEW_KEY);
    if (alreadyRequested) return;

    const opensRaw = await SecureStore.getItemAsync(APP_OPENS_KEY);
    const opens = parseInt(opensRaw ?? '0', 10);

    // Show on specific positive action trigger OR after 3+ app opens
    if (trigger === 'action' || opens >= 3) {
      await SecureStore.setItemAsync(REVIEW_KEY, 'true');
      try {
        const StoreReview = require('expo-store-review');
        if (StoreReview && typeof StoreReview.requestReview === 'function') {
          const available = await StoreReview.isAvailableAsync?.();
          if (available) {
            await StoreReview.requestReview();
            return;
          }
        }
      } catch {
        // Native module not linked in current dev binary, fallback
      }

      // Fallback to store deep link if supported
      try {
        const url = Platform.OS === 'ios' ? APP_STORE_REVIEW_URL : PLAY_STORE_REVIEW_URL;
        await Linking.openURL(url);
      } catch {
        // Silently continue
      }
    }
  } catch (e) {
    console.warn('[StoreReview] failed:', e);
  }
}
