/**
 * notifications.ts
 *
 * Full expo-notifications integration for Bluom.
 *
 * SETUP REQUIRED (one-time, already handled if you follow the steps below):
 *   1. Install:  npx expo install expo-notifications expo-device expo-constants
 *   2. Add to app.config.js plugins array:
 *        ["expo-notifications", { "icon": "./assets/images/icon.png", "color": "#ffffff" }]
 *   3. iOS: Push entitlement is added automatically by the plugin.
 *   4. Call `registerForPushNotificationsAsync()` once — ideally inside a
 *      `useEffect` in your root _layout.tsx (see bottom of this file for snippet).
 *
 * What each function does:
 *   - registerForPushNotificationsAsync  → requests permission + returns Expo push token
 *   - sendStepReminder                   → local notification if steps < 50% of goal
 *   - sendWellnessReminder               → local notification for wellness nudges
 *   - sendHydrationReminder              → local notification if water < 50% of goal
 *   - sendMealReminder                   → local notification if fewer than 2 meals logged
 *   - scheduleHabitReminder              → schedules a daily repeating habit reminder
 *   - cancelHabitReminder                → cancels a scheduled habit reminder
 *   - cancelAllNotifications             → clears everything (call on logout)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Handler: controls how notifications behave while app is foregrounded ────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android notification channel ────────────────────────────────────────────
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('bluom-reminders', {
    name: 'Bluom Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
  });
}

// ─── Permission + Token Registration ─────────────────────────────────────────

/**
 * Request notification permissions and return the Expo push token.
 * Call once from your root layout after the user is authenticated.
 *
 * Returns the token string, or null if permission was denied / not a device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[notifications] Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[notifications] Permission not granted.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.error('[notifications] Missing EAS projectId in app config.');
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) console.log('[notifications] Expo push token:', token);
    return token;
  } catch (e) {
    console.error('[notifications] Failed to get push token:', e);
    return null;
  }
}

// ─── Local Notification Helpers ───────────────────────────────────────────────

/**
 * Fires a local notification reminding the user to hit their step goal.
 * Only fires if they're below 50% of the goal — avoids nagging overachievers.
 */
export async function sendStepReminder(
  currentSteps: number,
  goalSteps: number
): Promise<void> {
  if (currentSteps >= goalSteps * 0.5) return; // Already halfway — no nag

  const remaining = goalSteps - currentSteps;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You've got steps to go! 🚶",
      body: `${currentSteps.toLocaleString()} done, ${remaining.toLocaleString()} to reach your ${goalSteps.toLocaleString()} goal. Let's move!`,
      data: { type: 'step_reminder' },
      ...(Platform.OS === 'android' && { channelId: 'bluom-reminders' }),
    },
    trigger: null, // Fire immediately
  });
}

/**
 * Fires a wellness nudge notification.
 * `type` maps to one of the wellness modules (meditation, journal, mood, etc).
 */
export async function sendWellnessReminder(type: string): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    meditation: {
      title: 'Time to breathe 🧘',
      body: "A quick session is all it takes. Your mind will thank you.",
    },
    journal: {
      title: 'Write it out ✍️',
      body: "Capture today's thoughts before they slip away.",
    },
    mood: {
      title: 'How are you feeling? 💙',
      body: "Log your mood — it only takes 5 seconds.",
    },
    gratitude: {
      title: 'Gratitude check ✨',
      body: "Name one thing you're grateful for today.",
    },
    sleep: {
      title: 'Wind down time 🌙',
      body: "Log your sleep to keep your recovery on track.",
    },
  };

  const message = messages[type] ?? {
    title: 'Wellness check-in 💚',
    body: "Take a moment for yourself today.",
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      ...message,
      data: { type: 'wellness_reminder', subtype: type },
      ...(Platform.OS === 'android' && { channelId: 'bluom-reminders' }),
    },
    trigger: null,
  });
}

/**
 * Fires a hydration reminder.
 * Only fires if the user is below 50% of their daily water goal.
 */
export async function sendHydrationReminder(
  currentOz: number,
  goalOz: number
): Promise<void> {
  if (currentOz >= goalOz * 0.5) return;

  const remaining = Math.round(goalOz - currentOz);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't forget to hydrate! 💧",
      body: `You need ${remaining} oz more to hit your daily goal. Grab a glass!`,
      data: { type: 'hydration_reminder' },
      ...(Platform.OS === 'android' && { channelId: 'bluom-reminders' }),
    },
    trigger: null,
  });
}

/**
 * Fires a meal logging reminder.
 * Only fires if fewer than 2 distinct meals have been logged today.
 */
export async function sendMealReminder(uniqueMealsLogged: number): Promise<void> {
  if (uniqueMealsLogged >= 2) return;

  const messages = [
    { title: "Log your first meal! 🍽️", body: "Start tracking your nutrition for today." },
    { title: "Don't skip lunch! 🥗", body: "Log your second meal to stay on target." },
  ];

  const msg = messages[uniqueMealsLogged] ?? messages[0];

  await Notifications.scheduleNotificationAsync({
    content: {
      ...msg,
      data: { type: 'meal_reminder', mealsLogged: uniqueMealsLogged },
      ...(Platform.OS === 'android' && { channelId: 'bluom-reminders' }),
    },
    trigger: null,
  });
}

// ─── Scheduled (Repeating) Reminders ─────────────────────────────────────────

/**
 * Schedules a daily habit reminder at a specific time.
 * Uses the habitId as the notification identifier so it can be cancelled later.
 *
 * @param habitId    - Unique ID from your habits table
 * @param habitName  - Display name for the notification body
 * @param hour       - Hour in 24h format (0–23)
 * @param minute     - Minute (0–59)
 */
export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  hour: number,
  minute: number
): Promise<void> {
  // Cancel any existing reminder for this habit first (avoid duplicates)
  await cancelHabitReminder(habitId);

  await Notifications.scheduleNotificationAsync({
    identifier: `habit_${habitId}`,
    content: {
      title: `Time for: ${habitName} ✅`,
      body: "Keep your streak alive — it only takes a moment.",
      data: { type: 'habit_reminder', habitId },
      ...(Platform.OS === 'android' && { channelId: 'bluom-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  if (__DEV__) console.log(`[notifications] Habit reminder scheduled: ${habitName} at ${hour}:${String(minute).padStart(2, '0')}`);
}

/**
 * Cancels a previously scheduled habit reminder.
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`habit_${habitId}`);
}

/**
 * Cancels ALL scheduled and delivered notifications.
 * Call this on user logout.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}

/*
 * ─── Root Layout Usage Snippet ───────────────────────────────────────────────
 *
 * In your _layout.tsx, inside InitialLayout (after the user is authenticated),
 * add the following:
 *
 *   import { registerForPushNotificationsAsync } from '@/utils/notifications';
 *   import * as Notifications from 'expo-notifications';
 *
 *   // Register + store token in Convex
 *   useEffect(() => {
 *     if (!isSignedIn || !convexAuthenticated) return;
 *
 *     registerForPushNotificationsAsync().then((token) => {
 *       if (token) {
 *         // Optionally persist to your users table:
 *         // mutation(api.users.savePushToken, { token });
 *         console.log('Push token ready:', token);
 *       }
 *     });
 *
 *     // Handle taps on notifications (deep-link if needed)
 *     const sub = Notifications.addNotificationResponseReceivedListener((response) => {
 *       const data = response.notification.request.content.data;
 *       if (data?.type === 'habit_reminder') router.push('/(tabs)/wellness');
 *       if (data?.type === 'meal_reminder') router.push('/(tabs)/fuel');
 *       if (data?.type === 'step_reminder') router.push('/(tabs)/move');
 *     });
 *
 *     return () => sub.remove();
 *   }, [isSignedIn, convexAuthenticated]);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */