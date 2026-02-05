/**
 * Minimal notification helpers.
 *
 * This repo currently doesn't include expo-notifications setup. These functions
 * are safe no-ops so UI can keep reminder effects without crashing.
 */

export function sendStepReminder(currentSteps: number, goalSteps: number) {
  // TODO: integrate expo-notifications when native configuration is added.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[notifications] step reminder', { currentSteps, goalSteps });
  }
}

export function sendWellnessReminder(type: string) {
  // TODO: integrate expo-notifications when native configuration is added.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[notifications] wellness reminder', { type });
  }
}

export function sendHydrationReminder(currentOz: number, goalOz: number) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[notifications] hydration reminder', { currentOz, goalOz });
  }
}

export function sendMealReminder(uniqueMealsLogged: number) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[notifications] meal reminder', { uniqueMealsLogged });
  }
}


