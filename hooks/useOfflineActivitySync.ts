/**
 * useOfflineActivitySync.ts
 *
 * Hook that watches network connectivity and syncs pending offline activities
 * to Convex when the connection is restored.
 *
 * Place at the root of the app (e.g. _layout.tsx) so it runs globally.
 *
 * Usage:
 *   import useOfflineActivitySync from '@/hooks/useOfflineActivitySync';
 *   // In your root component:
 *   useOfflineActivitySync();
 */

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { api } from '@/convex/_generated/api';
import {
  getPendingActivities,
  removePendingActivity,
  OfflineActivity,
} from '@/services/offlineActivityTracker';

// We use a polling approach since NetInfo can be unavailable in some environments.
const SYNC_INTERVAL_MS = 30_000; // attempt sync every 30 seconds

export default function useOfflineActivitySync() {
  const { user: clerkUser } = useUser();
  const logExerciseEntry = useMutation(api.exercise.logExerciseEntry);

  useEffect(() => {
    if (!clerkUser?.id || !logExerciseEntry) return;

    const trySync = async () => {
      const pending = await getPendingActivities();
      if (pending.length === 0) return;

      for (const activity of pending) {
        try {
          await logExerciseEntry({
            userId: activity.userId as any,
            exerciseName: activity.exerciseName,
            exerciseType: activity.exerciseType as 'strength' | 'cardio' | 'hiit' | 'yoga',
            duration: activity.duration,
            met: activity.met,
            distance: activity.distance,
            date: activity.date,
          });
          await removePendingActivity(activity.id);
          console.log('[useOfflineActivitySync] Synced offline activity:', activity.id);
        } catch (e) {
          // Still offline or sync failed — leave in queue for next attempt
          console.log('[useOfflineActivitySync] Sync failed, will retry:', e);
          break; // Stop trying if one fails — likely still offline
        }
      }
    };

    // Run immediately on mount
    trySync();

    // Then poll every 30 seconds
    const interval = setInterval(trySync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [clerkUser?.id, logExerciseEntry]);
}
