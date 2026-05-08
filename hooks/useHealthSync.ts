/**
 * useHealthSync.ts
 *
 * Platform-safe wrapper around Apple Health (react-native-health) and
 * Google Health Connect (react-native-health-connect).
 *
 * CRITICAL: All HealthKit / Health Connect imports are behind dynamic
 * requires / Platform guards so the Android bundle never includes
 * HealthKit symbols and the iOS binary never includes Health Connect ones.
 * This prevents Apple binary rejection (Guideline 2.5.1) and Play Store
 * policy violations.
 *
 * Usage:
 *   const { connected, lastSync, sync, connect, disconnect } = useHealthSync();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

let KingstinctHealthKit: any = null;
let AndroidHealthConnect: any = null;
let AsyncStorageModule: any = null;

try { KingstinctHealthKit = require('@kingstinct/react-native-healthkit'); } catch (e) {}
try { AndroidHealthConnect = require('react-native-health-connect'); } catch (e) {}
try { AsyncStorageModule = require('@react-native-async-storage/async-storage'); } catch (e) {}

// ─── Types ────────────────────────────────────────────────────
export type HealthSource = 'apple_health' | 'google_health';

export interface HealthSyncResult {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  weightKg: number | null;
  bodyFatPct?: number | null;
  sleepHours: number | null;
  heartRateAvg: number | null;
  menstrualFlow?: number | null;
  ovulationTestResult?: number | null;
  source: HealthSource;
  syncedAt: number;
}

export interface UseHealthSyncReturn {
  /** Whether the user has granted permissions and the source is connected */
  connected: boolean;
  /** Whether a sync is currently in flight */
  syncing: boolean;
  /** Epoch ms of last successful sync, or null */
  lastSync: number | null;
  /** Latest synced values */
  latest: HealthSyncResult | null;
  /** Request permissions + mark as connected */
  connect: () => Promise<boolean>;
  /** Revoke local connection flag (does NOT revoke OS-level permissions) */
  disconnect: () => void;
  /** Pull fresh data and push to Convex */
  sync: (userId: Id<'users'>) => Promise<HealthSyncResult | null>;
  /** Platform this hook manages */
  source: HealthSource | null;
}

// ─── iOS – Apple Health ───────────────────────────────────────
async function connectAppleHealth(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const mod = KingstinctHealthKit;
    if (!mod || !mod.requestAuthorization) return false;

    const HKQuantityTypeIdentifier = mod.HKQuantityTypeIdentifier || {
      stepCount: 'HKQuantityTypeIdentifierStepCount',
      activeEnergyBurned: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      distanceWalkingRunning: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
      bodyMass: 'HKQuantityTypeIdentifierBodyMass',
      heartRate: 'HKQuantityTypeIdentifierHeartRate',
      bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
    };
    
    const HKCategoryTypeIdentifier = mod.HKCategoryTypeIdentifier || {
      sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
    };

    const readPermissions = [
      HKQuantityTypeIdentifier.stepCount,
      HKQuantityTypeIdentifier.activeEnergyBurned,
      HKQuantityTypeIdentifier.distanceWalkingRunning,
      HKQuantityTypeIdentifier.bodyMass,
      HKCategoryTypeIdentifier.sleepAnalysis,
      HKQuantityTypeIdentifier.heartRate,
      HKQuantityTypeIdentifier.bodyFatPercentage,
    ];

    const writePermissions: any[] = [];
    const ok = await mod.requestAuthorization(readPermissions, writePermissions);
    return !!ok;
  } catch {
    return false;
  }
}

async function fetchAppleHealthData(): Promise<Omit<HealthSyncResult, 'source' | 'syncedAt'>> {
  const mod = KingstinctHealthKit;
  if (!mod || !mod.queryQuantitySamples) {
    return {
      steps: 0,
      activeCalories: 0,
      distanceKm: 0,
      weightKg: null,
      bodyFatPct: null,
      sleepHours: null,
      heartRateAvg: null,
      menstrualFlow: null,
      ovulationTestResult: null,
    };
  }

  const HKQuantityTypeIdentifier = mod.HKQuantityTypeIdentifier || {
    stepCount: 'HKQuantityTypeIdentifierStepCount',
    activeEnergyBurned: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    distanceWalkingRunning: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
    bodyMass: 'HKQuantityTypeIdentifierBodyMass',
    heartRate: 'HKQuantityTypeIdentifierHeartRate',
    bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
  };
  
  const HKCategoryTypeIdentifier = mod.HKCategoryTypeIdentifier || {
    sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
    menstrualFlow: 'HKCategoryTypeIdentifierMenstrualFlow',
    ovulationTestResult: 'HKCategoryTypeIdentifierOvulationTestResult',
  };

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const options = {
    from: startOfDay,
    to: now,
  };

  const [stepsRes, calRes, distRes, weightRes, bodyFatRes, sleepRes, hrRes] = await Promise.allSettled([
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.stepCount, options),
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.activeEnergyBurned, options),
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.distanceWalkingRunning, options),
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.bodyMass, options),
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.bodyFatPercentage, options),
    mod.queryCategorySamples(HKCategoryTypeIdentifier.sleepAnalysis, options),
    mod.queryQuantitySamples(HKQuantityTypeIdentifier.heartRate, options),
  ]);

  const steps = stepsRes.status === 'fulfilled'
    ? stepsRes.value.reduce((acc: number, sample: any) => acc + (sample.quantity || 0), 0)
    : 0;

  const calories = calRes.status === 'fulfilled'
    ? calRes.value.reduce((acc: number, sample: any) => acc + (sample.quantity || 0), 0)
    : 0;

  const distanceRaw = distRes.status === 'fulfilled'
    ? distRes.value.reduce((acc: number, sample: any) => acc + (sample.quantity || 0), 0)
    : 0;
  const distanceKm = distanceRaw / 1000;

  let weightKg: number | null = null;
  if (weightRes.status === 'fulfilled' && weightRes.value.length > 0) {
    const sorted = weightRes.value.sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    weightKg = sorted[0]?.quantity ?? null;
  }

  let bodyFatPct: number | null = null;
  if (bodyFatRes.status === 'fulfilled' && bodyFatRes.value.length > 0) {
    const sorted = bodyFatRes.value.sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    // Kingstinct returns fraction (e.g. 0.15 for 15%)
    bodyFatPct = sorted[0]?.quantity != null ? sorted[0].quantity * 100 : null;
  }

  let sleepHours: number | null = null;
  if (sleepRes.status === 'fulfilled' && sleepRes.value.length > 0) {
    // HKCategoryValueSleepAnalysisAsleep = 0
    const asleep = sleepRes.value.filter((s: any) => s.value === 0);
    if (asleep.length > 0) {
      const totalMs = asleep.reduce((acc: number, s: any) => acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()), 0);
      sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10;
    }
  }

  let heartRateAvg: number | null = null;
  if (hrRes.status === 'fulfilled' && hrRes.value.length > 0) {
    const sum = hrRes.value.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);
    heartRateAvg = Math.round(sum / hrRes.value.length);
  }

  return {
    steps: Math.round(steps),
    activeCalories: Math.round(calories),
    distanceKm: Math.round(distanceKm * 100) / 100,
    weightKg: weightKg !== null ? Math.round(weightKg * 10) / 10 : null,
    bodyFatPct: bodyFatPct !== null ? Math.round(bodyFatPct * 10) / 10 : null,
    sleepHours,
    heartRateAvg,
    menstrualFlow: null,
    ovulationTestResult: null,
  };
}


// ─── Android – Google Health Connect ─────────────────────────
async function connectGoogleHealth(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const {
      initialize,
      requestPermission,
      getSdkStatus,
      SdkAvailabilityStatus,
    } = AndroidHealthConnect || {};
    if (!initialize || !requestPermission || !getSdkStatus || !SdkAvailabilityStatus) return false;

    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      Alert.alert(
        'Health Connect Required',
        'Please install the Health Connect app from the Play Store to sync your health data.',
        [{ text: 'OK' }]
      );
      return false;
    }

    await initialize();

    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'BodyFat' },
      { accessType: 'read', recordType: 'MenstruationFlow' },
      { accessType: 'read', recordType: 'OvulationTest' },
    ]);

    return granted.length > 0;
  } catch {
    return false;
  }
}

async function fetchGoogleHealthData(): Promise<Omit<HealthSyncResult, 'source' | 'syncedAt'>> {
  const { readRecords } = AndroidHealthConnect || {};
  if (!readRecords) {
    return {
      steps: 0,
      activeCalories: 0,
      distanceKm: 0,
      weightKg: null,
      bodyFatPct: null,
      sleepHours: null,
      heartRateAvg: null,
      menstrualFlow: null,
      ovulationTestResult: null,
    };
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const timeRangeFilter = {
    operator: 'between',
    startTime: startOfDay.toISOString(),
    endTime: now.toISOString(),
  };

  const [stepsRes, calRes, distRes, weightRes, bodyFatRes, sleepRes, hrRes, flowRes, ovuRes] = await Promise.allSettled([
    readRecords('Steps', { timeRangeFilter }),
    readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
    readRecords('Distance', { timeRangeFilter }),
    readRecords('Weight', { timeRangeFilter }),
    readRecords('BodyFat', { timeRangeFilter }),
    readRecords('SleepSession', { timeRangeFilter }),
    readRecords('HeartRate', { timeRangeFilter }),
    readRecords('MenstruationFlow', { timeRangeFilter }),
    readRecords('OvulationTest', { timeRangeFilter }),
  ]);

  const steps = stepsRes.status === 'fulfilled'
    ? (stepsRes.value?.records ?? []).reduce((a: number, r: any) => a + (r.count ?? 0), 0)
    : 0;

  const calories = calRes.status === 'fulfilled'
    ? (calRes.value?.records ?? []).reduce((a: number, r: any) => a + (r.energy?.inKilocalories ?? 0), 0)
    : 0;

  const distanceM = distRes.status === 'fulfilled'
    ? (distRes.value?.records ?? []).reduce((a: number, r: any) => a + (r.distance?.inMeters ?? 0), 0)
    : 0;

  const weightRecords: any[] = weightRes.status === 'fulfilled' ? (weightRes.value?.records ?? []) : [];
  const latestWeight =
    weightRecords.length > 0
      ? (weightRecords[weightRecords.length - 1] as any)?.weight?.inKilograms ?? null
      : null;

  const bodyFatRecords: any[] = bodyFatRes.status === 'fulfilled' ? (bodyFatRes.value?.records ?? []) : [];
  const latestBodyFatPct =
    bodyFatRecords.length > 0
      ? (bodyFatRecords[bodyFatRecords.length - 1] as any)?.percentage ?? null
      : null;

  let sleepHours: number | null = null;
  if (sleepRes.status === 'fulfilled') {
    const sessions = sleepRes.value?.records ?? [];
    if (sessions.length > 0) {
      const totalMs = (sessions as any[]).reduce((acc, s) => {
        return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime());
      }, 0);
      sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10;
    }
  }

  let heartRateAvg: number | null = null;
  if (hrRes.status === 'fulfilled') {
    const samples = (hrRes.value?.records ?? []).flatMap((r: any) => r.samples ?? []);
    if (samples.length > 0) {
      const sum = samples.reduce((a: number, s: any) => a + (s.beatsPerMinute ?? 0), 0);
      heartRateAvg = Math.round(sum / samples.length);
    }
  }

  const flowRecords: any[] = flowRes.status === 'fulfilled' ? (flowRes.value?.records ?? []) : [];
  const menstrualFlow =
    flowRecords.length > 0
      ? (flowRecords[flowRecords.length - 1] as any)?.flow ?? null
      : null;

  const ovuRecords: any[] = ovuRes.status === 'fulfilled' ? (ovuRes.value?.records ?? []) : [];
  const ovulationTestResult =
    ovuRecords.length > 0
      ? (ovuRecords[ovuRecords.length - 1] as any)?.result ?? null
      : null;

  return {
    steps: Math.round(steps),
    activeCalories: Math.round(calories),
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    weightKg: latestWeight,
    bodyFatPct: latestBodyFatPct,
    sleepHours,
    heartRateAvg,
    menstrualFlow: menstrualFlow !== null ? Number(menstrualFlow) : null,
    ovulationTestResult: ovulationTestResult !== null ? Number(ovulationTestResult) : null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────
const STORAGE_KEY = 'bluom_health_connected';

export function useHealthSync(): UseHealthSyncReturn {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [latest, setLatest] = useState<HealthSyncResult | null>(null);

  const saveExternalData = useMutation(api.integrations.saveExternalData);
  const mountedRef = useRef(true);

  const getAsyncStorage = useCallback(() => {
    const mod = AsyncStorageModule;
    return mod?.default ?? mod ?? null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Restore persisted connection flag
    const AsyncStorage = getAsyncStorage();
    AsyncStorage?.getItem?.(STORAGE_KEY).then((v: string | null) => {
      if (mountedRef.current && v === 'true') setConnected(true);
    }).catch(() => {});
    return () => { mountedRef.current = false; };
  }, [getAsyncStorage]);

  const source: HealthSource | null = Platform.OS === 'ios'
    ? 'apple_health'
    : Platform.OS === 'android'
      ? 'google_health'
      : null;

  const connect = useCallback(async (): Promise<boolean> => {
    let ok = false;
    if (Platform.OS === 'ios') {
      ok = await connectAppleHealth();
    } else if (Platform.OS === 'android') {
      ok = await connectGoogleHealth();
    }
    if (ok) {
      setConnected(true);
      const AsyncStorage = getAsyncStorage();
      await AsyncStorage?.setItem?.(STORAGE_KEY, 'true');
    }
    return ok;
  }, [getAsyncStorage]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setLatest(null);
    const AsyncStorage = getAsyncStorage();
    AsyncStorage?.removeItem?.(STORAGE_KEY);
  }, [getAsyncStorage]);

  const sync = useCallback(async (userId: Id<'users'>): Promise<HealthSyncResult | null> => {
    if (!source) return null;
    setSyncing(true);
    try {
      const data = Platform.OS === 'ios'
        ? await fetchAppleHealthData()
        : await fetchGoogleHealthData();

      const result: HealthSyncResult = {
        ...data,
        source,
        syncedAt: Date.now(),
      };

      // Push to Convex
      await saveExternalData({
        userId,
        steps: result.steps,
        calories: result.activeCalories,
        distanceKm: result.distanceKm,
        weightKg: result.weightKg ?? undefined,
        bodyFatPct: result.bodyFatPct ?? undefined,
        sleepHours: result.sleepHours ?? undefined,
        heartRateAvg: result.heartRateAvg ?? undefined,
        menstrualFlow: result.menstrualFlow ?? undefined,
        ovulationTestResult: result.ovulationTestResult ?? undefined,
        source,
      });

      if (mountedRef.current) {
        setLatest(result);
        setLastSync(result.syncedAt);
      }
      return result;
    } catch (e) {
      console.warn('[useHealthSync] sync failed:', e);
      return null;
    } finally {
      if (mountedRef.current) setSyncing(false);
    }
  }, [source, saveExternalData]);

  return { connected, syncing, lastSync, latest, connect, disconnect, sync, source };
}