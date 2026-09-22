import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

// v2 keys so existing users get the tour fresh
const KEYS = {
  fuel: 'bluom_coach_fuel_v2',
  move: 'bluom_coach_move_v2',
  wellness: 'bluom_coach_wellness_v2',
};

export type CoachTab = keyof typeof KEYS;

export function useCoachMark(tab: CoachTab) {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEYS[tab]).then(val => {
      if (!val) {
        setTimeout(() => setStepIndex(0), 700);
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, [tab]);

  const advance = useCallback(() => {
    setStepIndex(prev => prev + 1);
  }, []);

  const dismiss = useCallback(async () => {
    setStepIndex(-1);
    try {
      await SecureStore.setItemAsync(KEYS[tab], 'done');
    } catch { /* ignore */ }
  }, [tab]);

  const isVisible = (step: number) => stepIndex === step;
  const isActive = stepIndex >= 0;

  return { stepIndex, isVisible, isActive, advance, dismiss, ready };
}
