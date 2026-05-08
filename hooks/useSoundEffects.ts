import { useEffect } from 'react';
import { Platform } from 'react-native';
import { preloadAllSounds } from '@/utils/soundEffects';

/**
 * Preloads all short UI/game SFX at app start for near zero-latency playback.
 */
export function useSoundEffects() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        await preloadAllSounds();
      } catch {
        // ignore
      }
    })();
  }, []);

  // We intentionally don't unload on unmount because RootLayout persists for app lifetime.
  // If you add an explicit "app teardown" path, call unloadAllSounds() there.
}


