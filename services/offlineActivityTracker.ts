/**
 * offlineActivityTracker.ts
 *
 * Persists outdoor activity session data to AsyncStorage when offline.
 * When the network is restored, the pending entry is synced to Convex automatically.
 *
 * Usage:
 *   import { saveOfflineActivity, getPendingActivities, clearPendingActivities } from '@/services/offlineActivityTracker';
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bluom_offline_activities';

export interface OfflineActivity {
  id: string;
  userId: string;
  exerciseName: string;
  exerciseType: string;
  duration: number;    // minutes
  met: number;
  distance: number;    // km
  date: string;        // ISO date string YYYY-MM-DD
  savedAt: string;     // ISO timestamp
}

/** Save a completed activity to AsyncStorage (used when Convex save fails or offline). */
export async function saveOfflineActivity(activity: Omit<OfflineActivity, 'id' | 'savedAt'>): Promise<void> {
  try {
    const existing = await getPendingActivities();
    const entry: OfflineActivity = {
      ...activity,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      savedAt: new Date().toISOString(),
    };
    const updated = [...existing, entry];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[offlineActivityTracker] saveOfflineActivity failed:', e);
  }
}

/** Retrieve all pending offline activities. */
export async function getPendingActivities(): Promise<OfflineActivity[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineActivity[];
  } catch (e) {
    console.warn('[offlineActivityTracker] getPendingActivities failed:', e);
    return [];
  }
}

/** Remove all pending offline activities (call after successful sync). */
export async function clearPendingActivities(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[offlineActivityTracker] clearPendingActivities failed:', e);
  }
}

/** Remove a single pending offline activity by ID (call after individual sync). */
export async function removePendingActivity(id: string): Promise<void> {
  try {
    const existing = await getPendingActivities();
    const updated = existing.filter((a) => a.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[offlineActivityTracker] removePendingActivity failed:', e);
  }
}
