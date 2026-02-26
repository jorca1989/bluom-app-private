// utils/healthIntegration.ts
import { Platform, Alert, Linking } from 'react-native';
import AppleHealthKit from 'react-native-health';
import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
} from 'react-native-health-connect';

type SyncedHealthData = {
  steps: number;
  calories: number;
  sleep: number;
  lastSync: number;
};

let hasInitialized = false;

export const requestHealthPermissions = async (): Promise<boolean> => {
  if (hasInitialized) return true;

  if (Platform.OS === 'ios') {
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
        ],
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
          // Permission denied or error — redirect to iOS Settings
          Alert.alert(
            'Apple Health Access Required',
            'Please enable Health access for Bluom in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') },
            ]
          );
          resolve(false);
          return;
        }
        hasInitialized = true;
        resolve(true);
      });
    });
  } else if (Platform.OS === 'android') {
    try {
      const isInitialized = await initialize();
      if (!isInitialized) {
        console.warn('[HealthConnect] Failed to initialize');
        return false;
      }

      // Check if permissions are already granted (this is safe and doesn't
      // require the ActivityResultLauncher that causes the lateinit crash).
      try {
        const existingPermissions = await getGrantedPermissions();
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
    } else if (Platform.OS === 'android') {
      try {
        const result = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfTodayISO(),
            endTime: endOfTodayISO(),
          },
        });
        // Sum the step count from all records returned
        steps = result.records.reduce((acc, record) => acc + record.count, 0);
      } catch (innerError) {
        console.warn('[HealthConnect] Failed to read records - possible permission or client issue', innerError);
      }
    }
  } catch (e) {
    console.warn('[Health sync] Fetch failed', e);
  }

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
      console.warn('[Health sync] saveExternalDataFn failed', e);
    }
  }

  return data;
};