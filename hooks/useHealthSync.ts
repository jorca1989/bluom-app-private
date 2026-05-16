/**
 * useHealthSync.ts (Stubbed)
 *
 * This hook is currently stubbed to avoid dependencies on native HealthKit 
 * and Health Connect modules, ensuring App Store compliance.
 */

import { useCallback, useState } from 'react';

export type HealthSource = 'apple_health' | 'google_health';

export interface HealthSyncResult {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  weightKg: number | null;
  bodyFatPct?: number | null;
  sleepHours: number | null;
  heartRateAvg: number | null;
  source: HealthSource;
  syncedAt: number;
}

export interface UseHealthSyncReturn {
  connected: boolean;
  syncing: boolean;
  lastSync: number | null;
  latest: HealthSyncResult | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sync: (userId: any) => Promise<HealthSyncResult | null>;
  source: HealthSource | null;
}

export function useHealthSync(): UseHealthSyncReturn {
  const [connected, setConnected] = useState(false);
  const [syncing] = useState(false);
  const [lastSync] = useState<number | null>(null);
  const [latest] = useState<HealthSyncResult | null>(null);

  const connect = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
  }, []);

  const sync = useCallback(async (): Promise<HealthSyncResult | null> => {
    return null;
  }, []);

  return { connected, syncing, lastSync, latest, connect, disconnect, sync, source: null };
}