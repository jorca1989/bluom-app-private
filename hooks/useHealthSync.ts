import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export type HealthSource = 'apple_health' | 'google_health';

export interface HealthSyncResult {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  weightKg: number | null;
  bodyFatPct: number | null;
  sleepHours: number | null;
  heartRateAvg: number | null;
  restingHeartRate: number | null;
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
  openPermissionSettings: () => void;
  sync: (userId?: Id<'users'>) => Promise<HealthSyncResult | null>;
  source: HealthSource | null;
}

const CONNECTION_KEY = `bluom.health.connection.v3.${Platform.OS}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const ANDROID_READ_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
] as const;

let HealthKit: any = null;
let HealthConnect: any = null;

try {
  if (Platform.OS === 'ios') {
    // Keep the named function exports. The default export is a native proxy, not
    // the public function collection exposed by this library.
    HealthKit = require('@kingstinct/react-native-healthkit');
  } else if (Platform.OS === 'android') {
    HealthConnect = require('react-native-health-connect');
  }
} catch (error) {
  console.warn('[health] Native module unavailable', error);
}

function localDayRange() {
  const now = new Date();
  return { now, start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
}

function lastNightRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { now, start };
}

function mergeSleepHours(samples: any[]): number | null {
  const intervals = samples
    .filter(sample => sample.value !== 0 && sample.value !== 2)
    .map(sample => ({ start: new Date(sample.startDate).getTime(), end: new Date(sample.endDate).getTime() }))
    .filter(interval => Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  if (!intervals.length) return null;

  let totalMs = 0;
  let active = intervals[0];
  for (const interval of intervals.slice(1)) {
    if (interval.start <= active.end) active.end = Math.max(active.end, interval.end);
    else {
      totalMs += active.end - active.start;
      active = interval;
    }
  }
  totalMs += active.end - active.start;
  return Math.round((totalMs / 36e5) * 10) / 10;
}

export function useHealthSync(): UseHealthSyncReturn {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [latest, setLatest] = useState<HealthSyncResult | null>(null);
  const saveExternalData = useMutation(api.integrations.saveExternalData);
  const source: HealthSource | null = Platform.OS === 'ios'
    ? 'apple_health'
    : Platform.OS === 'android'
      ? 'google_health'
      : null;

  useEffect(() => {
    let active = true;
    const restoreConnection = async () => {
      const wasConnected = await AsyncStorage.getItem(CONNECTION_KEY) === 'true';
      if (!wasConnected || !active) return;

      // Apple deliberately does not disclose read authorization. Android does,
      // so clear stale local state when the user revoked all Health Connect reads.
      if (Platform.OS === 'android' && HealthConnect?.initialize && HealthConnect?.getGrantedPermissions) {
        const initialized = await HealthConnect.initialize();
        const granted = initialized ? await HealthConnect.getGrantedPermissions() : [];
        const hasReadPermission = granted.some((permission: any) => permission.accessType === 'read');
        if (!hasReadPermission) {
          await AsyncStorage.removeItem(CONNECTION_KEY);
          if (active) setConnected(false);
          return;
        }
      }
      if (active) setConnected(true);
    };
    restoreConnection().catch(() => { if (active) setConnected(false); });
    return () => { active = false; };
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        if (!HealthKit?.requestAuthorization || !HealthKit?.isHealthDataAvailable) {
          Alert.alert('Apple Health unavailable', 'Install a current native iOS build on a device that supports HealthKit.');
          return false;
        }
        if (!HealthKit.isHealthDataAvailable()) {
          Alert.alert('Apple Health unavailable', 'Health data is not available on this device.');
          return false;
        }
        const approved = await HealthKit.requestAuthorization({
          toRead: [
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
            'HKQuantityTypeIdentifierDistanceWalkingRunning',
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierBodyFatPercentage',
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierRestingHeartRate',
            'HKCategoryTypeIdentifierSleepAnalysis',
          ],
        });
        if (!approved) return false;
      } else if (Platform.OS === 'android') {
        if (!HealthConnect?.initialize || !HealthConnect?.requestPermission) {
          Alert.alert('Health Connect unavailable', 'Health Connect is not available in this Android build.');
          return false;
        }
        const initialized = await HealthConnect.initialize();
        if (!initialized) {
          Alert.alert('Health Connect unavailable', 'Install or update Health Connect, then try again.');
          return false;
        }
        const granted = await HealthConnect.requestPermission(ANDROID_READ_PERMISSIONS);
        if (!granted.some((permission: any) => permission.accessType === 'read')) return false;
      } else {
        return false;
      }

      setConnected(true);
      await AsyncStorage.setItem(CONNECTION_KEY, 'true');
      return true;
    } catch (error: any) {
      console.error('[health] Connect failed', error);
      Alert.alert('Health connection failed', error?.message ?? 'Could not request health permissions.');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Disconnect only stops Bluom sync. Platform permissions remain user-managed.
    setConnected(false);
    setLatest(null);
    AsyncStorage.removeItem(CONNECTION_KEY).catch(() => undefined);
  }, []);

  const openPermissionSettings = useCallback(() => {
    if (Platform.OS === 'android' && HealthConnect?.openHealthConnectSettings) {
      HealthConnect.openHealthConnectSettings();
      return;
    }
    Linking.openSettings().catch(() => undefined);
  }, []);

  const sync = useCallback(async (userId?: Id<'users'>): Promise<HealthSyncResult | null> => {
    if (!connected || !source) return null;
    setSyncing(true);
    try {
      const { now, start } = localDayRange();
      let steps = 0;
      let activeCalories = 0;
      let distanceKm = 0;
      let weightKg: number | null = null;
      let bodyFatPct: number | null = null;
      let sleepHours: number | null = null;
      let heartRateAvg: number | null = null;
      let restingHeartRate: number | null = null;
      const sleepRange = lastNightRange();

      if (Platform.OS === 'ios' && HealthKit) {
        const dateFilter = { filter: { date: { startDate: start, endDate: now } } };
        const sleepDateFilter = { filter: { date: { startDate: sleepRange.start, endDate: sleepRange.now } } };
        const total = async (identifier: string, unit: string) => {
          const statistics = await HealthKit.queryStatisticsForQuantity(identifier, ['cumulativeSum'], { ...dateFilter, unit });
          return Number(statistics?.sumQuantity?.quantity ?? 0);
        };
        try { steps = Math.round(await total('HKQuantityTypeIdentifierStepCount', 'count')); } catch (error) { console.warn('[health] iOS steps failed', error); }
        try { activeCalories = Math.round(await total('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal')); } catch (error) { console.warn('[health] iOS calories failed', error); }
        try { distanceKm = Math.round((await total('HKQuantityTypeIdentifierDistanceWalkingRunning', 'm')) / 10) / 100; } catch (error) { console.warn('[health] iOS distance failed', error); }
        try {
          const sample = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
          weightKg = sample ? Math.round(Number(sample.quantity) * 10) / 10 : null;
        } catch (error) { console.warn('[health] iOS weight failed', error); }
        try {
          const sample = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%');
          bodyFatPct = sample ? Math.round(Number(sample.quantity) * 10) / 10 : null;
        } catch (error) { console.warn('[health] iOS body fat failed', error); }
        try {
          const statistics = await HealthKit.queryStatisticsForQuantity('HKQuantityTypeIdentifierHeartRate', ['discreteAverage'], { ...dateFilter, unit: 'count/min' });
          const value = Number(statistics?.averageQuantity?.quantity);
          heartRateAvg = Number.isFinite(value) ? Math.round(value) : null;
        } catch (error) { console.warn('[health] iOS heart rate failed', error); }
        try {
          const sample = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate', 'count/min');
          restingHeartRate = sample ? Math.round(Number(sample.quantity)) : null;
        } catch (error) { console.warn('[health] iOS resting heart rate failed', error); }
        try {
          const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { ...sleepDateFilter, limit: 1000, ascending: true });
          sleepHours = mergeSleepHours(samples);
        } catch (error) { console.warn('[health] iOS sleep failed', error); }
      } else if (Platform.OS === 'android' && HealthConnect) {
        const timeRangeFilter = { operator: 'between' as const, startTime: start.toISOString(), endTime: now.toISOString() };
        const sleepTimeRangeFilter = { operator: 'between' as const, startTime: sleepRange.start.toISOString(), endTime: sleepRange.now.toISOString() };
        const recentTimeRangeFilter = { operator: 'after' as const, startTime: new Date(now.getTime() - 30 * DAY_MS).toISOString() };
        try { steps = Math.round(Number((await HealthConnect.aggregateRecord({ recordType: 'Steps', timeRangeFilter }))?.COUNT_TOTAL ?? 0)); } catch (error) { console.warn('[health] Android steps failed', error); }
        try { activeCalories = Math.round(Number((await HealthConnect.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }))?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0)); } catch (error) { console.warn('[health] Android calories failed', error); }
        try { distanceKm = Math.round(Number((await HealthConnect.aggregateRecord({ recordType: 'Distance', timeRangeFilter }))?.DISTANCE?.inKilometers ?? 0) * 100) / 100; } catch (error) { console.warn('[health] Android distance failed', error); }
        try {
          const records = await HealthConnect.readRecords('Weight', { timeRangeFilter: recentTimeRangeFilter, ascendingOrder: false, pageSize: 1 });
          weightKg = records.records[0]?.weight?.inKilograms ?? null;
        } catch (error) { console.warn('[health] Android weight failed', error); }
        try {
          const records = await HealthConnect.readRecords('BodyFat', { timeRangeFilter: recentTimeRangeFilter, ascendingOrder: false, pageSize: 1 });
          bodyFatPct = records.records[0]?.percentage ?? null;
        } catch (error) { console.warn('[health] Android body fat failed', error); }
        try {
          const aggregate = await HealthConnect.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter });
          heartRateAvg = Number.isFinite(aggregate?.BPM_AVG) ? Math.round(aggregate.BPM_AVG) : null;
        } catch (error) { console.warn('[health] Android heart rate failed', error); }
        try {
          const records = await HealthConnect.readRecords('RestingHeartRate', { timeRangeFilter: recentTimeRangeFilter, ascendingOrder: false, pageSize: 1 });
          restingHeartRate = records.records[0]?.beatsPerMinute ?? null;
        } catch (error) { console.warn('[health] Android resting heart rate failed', error); }
        try {
          const aggregate = await HealthConnect.aggregateRecord({ recordType: 'SleepSession', timeRangeFilter: sleepTimeRangeFilter });
          sleepHours = Number.isFinite(aggregate?.SLEEP_DURATION_TOTAL) ? Math.round((aggregate.SLEEP_DURATION_TOTAL / 3600) * 10) / 10 : null;
        } catch (error) { console.warn('[health] Android sleep failed', error); }
      }

      // Some providers expose steps without an ActiveCalories record. Keep the
      // activity summary useful with the same conservative estimate used for manual steps.
      if (activeCalories === 0 && steps > 0) {
        activeCalories = Math.round(steps * 0.04);
      }

      const result: HealthSyncResult = { steps, activeCalories, distanceKm, weightKg, bodyFatPct, sleepHours, heartRateAvg, restingHeartRate, source, syncedAt: Date.now() };
      if (userId) {
        await saveExternalData({ userId, steps, calories: activeCalories, distanceKm, weightKg: weightKg ?? undefined, bodyFatPct: bodyFatPct ?? undefined, sleepHours: sleepHours ?? undefined, heartRateAvg: heartRateAvg ?? undefined, restingHeartRate: restingHeartRate ?? undefined, source });
      }
      setLatest(result);
      setLastSync(result.syncedAt);
      return result;
    } catch (error) {
      console.error('[health] Sync failed', error);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [connected, saveExternalData, source]);

  return { connected, syncing, lastSync, latest, connect, disconnect, openPermissionSettings, sync, source };
}
