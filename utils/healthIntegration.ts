// utils/healthIntegration.ts
import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';

type SyncedHealthData = {
  steps: number;
  calories: number;
  sleep: number;
  lastSync: number;
};

let hasInitialized = false;

export const requestHealthPermissions = async (): Promise<boolean> => {
  // `react-native-health` is iOS-only (Apple HealthKit).
  if (Platform.OS !== 'ios') return false;

  if (hasInitialized) return true;

  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.StepCount,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.SleepAnalysis,
      ],
      // Request write as well (even if we currently only read steps),
      // so the native permission prompt covers both directions.
      write: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.StepCount,
      ],
    },
  };

  return await new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions as any, (err: any) => {
      if (err) {
        console.warn('[HealthKit] initHealthKit error', err);
        resolve(false);
        return;
      }
      hasInitialized = true;
      resolve(true);
    });
  });
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export const syncHealthData = async (saveExternalDataFn?: any): Promise<SyncedHealthData> => {
  const lastSync = Date.now();

  if (Platform.OS !== 'ios') {
    const data: SyncedHealthData = { steps: 0, calories: 0, sleep: 0, lastSync };
    if (saveExternalDataFn) {
      try {
        await saveExternalDataFn(data);
      } catch {}
    }
    return data;
  }

  const ok = await requestHealthPermissions();
  if (!ok) {
    const data: SyncedHealthData = { steps: 0, calories: 0, sleep: 0, lastSync };
    if (saveExternalDataFn) {
      try {
        await saveExternalDataFn(data);
      } catch {}
    }
    return data;
  }

  const steps = await new Promise<number>((resolve) => {
    AppleHealthKit.getStepCount(
      {
        startDate: startOfTodayISO(),
        endDate: endOfTodayISO(),
        includeManuallyAdded: true,
      } as any,
      (err: any, results: any) => {
        if (err) {
          console.warn('[HealthKit] getStepCount error', err);
          resolve(0);
          return;
        }
        resolve(Math.round(Number(results?.value ?? 0)));
      },
    );
  });

  const data: SyncedHealthData = {
    steps,
    calories: 0,
    sleep: 0,
    lastSync,
  };

  if (saveExternalDataFn) {
    try {
      await saveExternalDataFn(data);
    } catch (e) {
      console.warn('[HealthKit] saveExternalDataFn failed', e);
    }
  }

  return data;
};