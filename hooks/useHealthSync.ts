import { useCallback, useState } from 'react';
import { Platform, Alert } from 'react-native';

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

let isAppleHealthAvailable = false;
let requestAppleAuthorization: any = null;
let queryQuantitySamples: any = null;
let HKQuantityTypeIdentifier: any = null;

if (Platform.OS === 'ios') {
  try {
    const hk = require('@kingstinct/react-native-healthkit');
    isAppleHealthAvailable = true;
    requestAppleAuthorization = hk.requestAuthorization;
    queryQuantitySamples = hk.queryQuantitySamples;
    HKQuantityTypeIdentifier = hk.HKQuantityTypeIdentifier;
  } catch (e) {
    console.log('Failed to require @kingstinct/react-native-healthkit', e);
  }
}

export function useHealthSync(): UseHealthSyncReturn {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [latest, setLatest] = useState<HealthSyncResult | null>(null);

  const source: HealthSource | null = Platform.OS === 'ios' ? 'apple_health' : 'google_health';

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        if (!isAppleHealthAvailable) {
          Alert.alert('Health Connection Failed', 'HealthKit is not available on this device or build.');
          return false;
        }
        
        await requestAppleAuthorization([
          HKQuantityTypeIdentifier.stepCount,
          HKQuantityTypeIdentifier.activeEnergyBurned,
          HKQuantityTypeIdentifier.distanceWalkingRunning,
          HKQuantityTypeIdentifier.bodyMass,
          HKQuantityTypeIdentifier.heartRate
        ]);
        
        setConnected(true);
        return true;
      } else {
        // Android Google Health Connect integration placeholder
        // To be implemented fully once react-native-health-connect permissions are set in AndroidManifest
        Alert.alert('Health Connect', 'Google Health Connect is not fully configured in this build.');
        setConnected(true);
        return true;
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Health Connection Failed', e?.message || 'Could not connect to health data');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
  }, []);

  const sync = useCallback(async (userId: any): Promise<HealthSyncResult | null> => {
    if (!connected) return null;
    
    setSyncing(true);
    try {
      if (Platform.OS === 'ios' && isAppleHealthAvailable) {
        // Just mock some basic sync for now since full query needs exact Date parsing
        const result: HealthSyncResult = {
          steps: 5000,
          activeCalories: 300,
          distanceKm: 3.5,
          weightKg: 70,
          sleepHours: 7,
          heartRateAvg: 65,
          source: 'apple_health',
          syncedAt: Date.now()
        };
        
        setLatest(result);
        setLastSync(Date.now());
        return result;
      }
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
    return null;
  }, [connected]);

  return { connected, syncing, lastSync, latest, connect, disconnect, sync, source };
}