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

function safeRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line no-eval
    const req = (0, eval)('require');
    return req(name) as T;
  } catch {
    return null;
  }
}

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
    // Dynamic require so Android bundler never touches HealthKit symbols
    const mod = safeRequire<any>('react-native-health');
    const AppleHealthKit = mod?.default ?? mod;
    if (!AppleHealthKit) return false;

    const baseRead = [
      'Steps',
      'ActiveEnergyBurned',
      'DistanceWalkingRunning',
      'BodyMass',
      'SleepAnalysis',
      'HeartRate',
      'BodyFatPercentage',
    ];

    // Reproductive Health: try requesting, but fall back if unsupported.
    const reproRead = ['MenstrualFlow', 'OvulationTestResult'];

    const tryInit = (read: string[]) =>
      new Promise<boolean>((resolve) => {
        const permissions = { permissions: { read, write: [] as string[] } };
        AppleHealthKit.initHealthKit(permissions, (err: any) => resolve(!err));
      });

    let ok = await tryInit([...baseRead, ...reproRead]);
    if (!ok) ok = await tryInit(baseRead);
    return ok;
  } catch {
    return false;
  }
}

async function fetchAppleHealthData(): Promise<Omit<HealthSyncResult, 'source' | 'syncedAt'>> {
  const mod = safeRequire<any>('react-native-health');
  const AppleHealthKit = mod?.default ?? mod;
  if (!AppleHealthKit) {
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
  const options = {
    startDate: startOfDay.toISOString(),
    endDate: now.toISOString(),
    includeManuallyAdded: false,
  };

  // Helper: wrap HealthKit callbacks in Promises
  const get = <T>(fn: (opts: any, cb: (err: any, val: T) => void) => void, opts: any): Promise<T | null> =>
    new Promise((res) => fn(opts, (err, val) => res(err ? null : val)));

  const [stepsResult, caloriesResult, distanceResult, weightResult, bodyFatResult, sleepResult, hrResult, flowResult, ovuResult] =
    await Promise.allSettled([
      get<{ value: number }>(
        (o, cb) => AppleHealthKit.getStepCount(o, cb),
        options
      ),
      get<{ value: number }>(
        (o, cb) => AppleHealthKit.getActiveEnergyBurned(o, cb),
        options
      ),
      get<{ value: number }>(
        (o, cb) => AppleHealthKit.getDistanceWalkingRunning(o, cb),
        options
      ),
      get<{ value: number }>(
        (o, cb) => AppleHealthKit.getLatestWeight(o, cb),
        { unit: 'kilogram' }
      ),
      get<{ value: number }>(
        (o, cb) => AppleHealthKit.getLatestBodyFatPercentage(o, cb),
        { unit: 'percent' }
      ),
      get<Array<{ value: string; startDate: string; endDate: string }>>(
        (o, cb) => AppleHealthKit.getSleepSamples(o, cb),
        options
      ),
      get<Array<{ value: number }>>(
        (o, cb) => AppleHealthKit.getHeartRateSamples(o, cb),
        options
      ),
      get<any[]>(
        (o, cb) => AppleHealthKit.getSamples(o, cb),
        { ...options, type: 'MenstrualFlow', ascending: false, limit: 1 }
      ),
      get<any[]>(
        (o, cb) => AppleHealthKit.getSamples(o, cb),
        { ...options, type: 'OvulationTestResult', ascending: false, limit: 1 }
      ),
    ]);

  const steps = stepsResult.status === 'fulfilled' ? (stepsResult.value?.value ?? 0) : 0;
  const calories = caloriesResult.status === 'fulfilled' ? (caloriesResult.value?.value ?? 0) : 0;
  // HealthKit returns distance in meters by default
  const distanceRaw = distanceResult.status === 'fulfilled' ? (distanceResult.value?.value ?? 0) : 0;
  const distanceKm = distanceRaw / 1000;
  const weightKg = weightResult.status === 'fulfilled' ? (weightResult.value?.value ?? null) : null;
  const bodyFatPct = bodyFatResult.status === 'fulfilled' ? (bodyFatResult.value?.value ?? null) : null;

  // Sleep: sum of "ASLEEP" samples in hours
  let sleepHours: number | null = null;
  if (sleepResult.status === 'fulfilled' && Array.isArray(sleepResult.value)) {
    const asleep = sleepResult.value.filter((s) => s.value === 'ASLEEP');
    if (asleep.length > 0) {
      const totalMs = asleep.reduce((acc, s) => {
        return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
      }, 0);
      sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10;
    }
  }

  // Heart rate: average of samples
  let heartRateAvg: number | null = null;
  if (hrResult.status === 'fulfilled' && Array.isArray(hrResult.value) && hrResult.value.length > 0) {
    const sum = hrResult.value.reduce((a, s) => a + s.value, 0);
    heartRateAvg = Math.round(sum / hrResult.value.length);
  }

  const flowArr = flowResult.status === 'fulfilled' && Array.isArray(flowResult.value) ? flowResult.value : [];
  const ovuArr = ovuResult.status === 'fulfilled' && Array.isArray(ovuResult.value) ? ovuResult.value : [];
  const menstrualFlow = flowArr.length > 0 ? Number((flowArr[0] as any)?.value ?? null) : null;
  const ovulationTestResult = ovuArr.length > 0 ? Number((ovuArr[0] as any)?.value ?? null) : null;

  return {
    steps: Math.round(steps),
    activeCalories: Math.round(calories),
    distanceKm: Math.round(distanceKm * 100) / 100,
    weightKg,
    bodyFatPct: bodyFatPct !== null ? Math.round(bodyFatPct * 10) / 10 : null,
    sleepHours,
    heartRateAvg,
    menstrualFlow: Number.isFinite(menstrualFlow as any) ? (menstrualFlow as number) : null,
    ovulationTestResult: Number.isFinite(ovulationTestResult as any) ? (ovulationTestResult as number) : null,
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
    } = (safeRequire<any>('react-native-health-connect') ?? {});
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
  const { readRecords } = (safeRequire<any>('react-native-health-connect') ?? {});
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
    const mod = safeRequire<any>('@react-native-async-storage/async-storage');
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