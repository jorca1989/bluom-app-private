// utils/healthIntegration.ts
import { Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';

// Safe import — react-native-health is iOS-only and may crash on Android if not in the native build
let AppleHealthKit: any = null;
try {
  AppleHealthKit = require('react-native-health').default;
} catch (e) {
  console.warn('[HealthKit] Native module not available — skipping Apple Health features');
}

// Dynamic import to avoid crash if native module isn't compiled into the dev build
let HealthConnect: {
  initialize: () => Promise<boolean>;
  requestPermission: (perms: any[]) => Promise<any>;
  readRecords: (type: string, opts: any) => Promise<any>;
  getGrantedPermissions: () => Promise<any[]>;
} | null = null;

try {
  const hc = require('react-native-health-connect');
  HealthConnect = {
    initialize: hc.initialize,
    requestPermission: hc.requestPermission,
    readRecords: hc.readRecords,
    getGrantedPermissions: hc.getGrantedPermissions,
  };
} catch (e) {
  console.warn('[HealthConnect] Native module not available — skipping Health Connect features');
}

type SyncedHealthData = {
  steps: number;
  calories: number;
  sleep: number;
  lastSync: number;
};

let hasInitialized = false;

export const requestHealthPermissions = async (opts?: {
  force?: boolean;
  openSettingsOnFailure?: boolean;
}): Promise<boolean> => {
  const force = opts?.force ?? false;
  const openSettingsOnFailure = opts?.openSettingsOnFailure ?? false;

  if (!force && hasInitialized) return true;

  if (Platform.OS === 'ios' && AppleHealthKit) {
    const openIosSettings = async () => {
      if (!openSettingsOnFailure) return;
      try {
        await Linking.openSettings();
      } catch {
        try {
          await Linking.openURL('app-settings:');
        } catch {
          // ignore
        }
      }
    };

    const permissions = {
      permissions: {
        // BUILD 18: Request only what we need for "Import"
        // Read: steps + active energy ("Calories")
        read: [
          AppleHealthKit.Constants?.Permissions?.StepCount,
          AppleHealthKit.Constants?.Permissions?.ActiveEnergyBurned,
        ].filter(Boolean),
        // Write: workouts (only if we export Bluom workouts to Apple Health)
        write: [AppleHealthKit.Constants?.Permissions?.Workout].filter(Boolean),
      },
    };

    return await new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions as any, (err: any) => {
        if (err) {
          console.warn('[HealthKit] initHealthKit error', err);
          // Permission denied/undetermined or other error — jumpstart iOS Settings
          if (openSettingsOnFailure) {
            openIosSettings();
          } else {
            Alert.alert(
              'Apple Health Access Required',
              'Please enable Health access for Bluom in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          resolve(false);
          return;
        }
        hasInitialized = true;
        resolve(true);
      });
    });
  } else if (Platform.OS === 'android') {
    try {
      if (!HealthConnect) {
        console.warn('[HealthConnect] Module not available');
        return false;
      }
      const isInitialized = await HealthConnect.initialize();
      if (!isInitialized) {
        console.warn('[HealthConnect] Failed to initialize');
        return false;
      }

      // Check if permissions are already granted (this is safe and doesn't
      // require the ActivityResultLauncher that causes the lateinit crash).
      try {
        const existingPermissions = await HealthConnect.getGrantedPermissions();
        const alreadyHasRead = existingPermissions.some(
          (p: any) => p.recordType === 'Steps' && p.accessType === 'read'
        );
        if (alreadyHasRead) {
          hasInitialized = true;
          return true;
        }
      } catch (checkErr) {
        console.warn('[HealthConnect] getGrantedPermissions failed', checkErr);
      }

      // Permissions not yet granted — open Health Connect's permission screen
      // directly instead of calling requestPermission() which crashes.
      Alert.alert(
        'Health Connect Permissions Required',
        'Bluom needs Steps access. Tap "Open Health Connect" to grant permission, then try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Health Connect',
            onPress: () => {
              Linking.sendIntent(
                'android.health.connect.action.MANAGE_HEALTH_PERMISSIONS',
                [{ key: 'android.intent.extra.PACKAGE_NAME', value: 'com.jwfca.bluom' }]
              ).catch(() => {
                // Fallback: open Health Connect main screen
                Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => {
                  Linking.openSettings();
                });
              });
            },
          },
        ]
      );
      return false;
    } catch (e) {
      console.warn('[HealthConnect] Permission request failed', e);
      return false;
    }
  }

  return false;
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
  let steps = 0;
  let calories = 0;

  const ok = await requestHealthPermissions();
  if (!ok) {
    const data: SyncedHealthData = { steps: 0, calories: 0, sleep: 0, lastSync };
    if (saveExternalDataFn) {
      try { await saveExternalDataFn(data); } catch { }
    }
    return data;
  }

  try {
    if (Platform.OS === 'ios') {
      steps = await new Promise<number>((resolve) => {
        // Use getDailyStepCountSamples to sum up all sources for the day
        AppleHealthKit.getDailyStepCountSamples(
          {
            startDate: startOfTodayISO(),
            endDate: endOfTodayISO(),
            includeManuallyAdded: true,
          } as any,
          (err: any, results: any[]) => {
            if (err) {
              console.warn('[HealthKit] getDailyStepCountSamples error', err);
              resolve(0);
              return;
            }
            if (!results || results.length === 0) {
              resolve(0);
              return;
            }
            // Sum up the value field of all returned samples
            const totalSteps = results.reduce((acc, curr) => acc + (curr.value || 0), 0);
            resolve(Math.round(totalSteps));
          }
        );
      });

      // ActiveEnergyBurned (kcal) for "Calories Burned Today"
      calories = await new Promise<number>((resolve) => {
        const fn =
          AppleHealthKit.getActiveEnergyBurned ??
          AppleHealthKit.getActiveEnergyBurnedSamples ??
          null;
        if (!fn) {
          console.warn('[HealthKit] Active energy API not available on this build');
          resolve(0);
          return;
        }
        fn(
          {
            startDate: startOfTodayISO(),
            endDate: endOfTodayISO(),
            includeManuallyAdded: true,
          } as any,
          (err: any, results: any[]) => {
            if (err) {
              console.warn('[HealthKit] getActiveEnergyBurned error', err);
              resolve(0);
              return;
            }
            if (!results || results.length === 0) {
              resolve(0);
              return;
            }
            const total = results.reduce((acc, curr) => acc + (curr.value || 0), 0);
            resolve(Math.round(total));
          }
        );
      });
    } else if (Platform.OS === 'android' && HealthConnect) {
      try {
        const result = await HealthConnect.readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfTodayISO(),
            endTime: endOfTodayISO(),
          },
        });
        // Sum the step count from all records returned
        steps = result.records.reduce((acc: number, record: any) => acc + record.count, 0);
      } catch (innerError) {
        console.warn('[HealthConnect] Failed to read records - possible permission or client issue', innerError);
      }

      // Active calories burned for "Calories Burned Today"
      try {
        const kcalFromEnergy = (energy: any): number => {
          // Health Connect energies are typically { value, unit } where unit is:
          // 'kilocalories' | 'calories' | 'kilojoules' | 'joules'
          const v = Number(energy?.value ?? 0);
          if (!isFinite(v) || v <= 0) return 0;
          const unit = String(energy?.unit ?? '').toLowerCase();
          if (unit.includes('kilocal')) return v;
          if (unit === 'calories' || unit === 'calorie') return v / 1000;
          if (unit.includes('kilojoule')) return v * 0.239006;
          if (unit.includes('joule')) return (v / 1000) * 0.239006;
          return v; // best-effort fallback
        };

        const energyResult = await HealthConnect.readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfTodayISO(),
            endTime: endOfTodayISO(),
          },
        });
        calories = Math.round(
          (energyResult?.records ?? []).reduce((acc: number, record: any) => {
            return acc + kcalFromEnergy(record?.energy);
          }, 0)
        );
      } catch (innerError) {
        console.warn('[HealthConnect] Failed to read ActiveCaloriesBurned', innerError);
      }
    }
  } catch (e) {
    console.warn('[Health sync] Fetch failed', e);
  }

  const data: SyncedHealthData = {
    steps,
    calories,
    sleep: 0,
    lastSync,
  };

  if (saveExternalDataFn) {
    try {
      await saveExternalDataFn(data);
    } catch (e) {
      console.warn('[Health sync] saveExternalDataFn failed', e);
    }
  }

  return data;
};