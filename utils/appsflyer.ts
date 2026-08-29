import { Platform } from 'react-native';

function safeRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line no-eval
    const req = (0, eval)('require');
    return req(name) as T;
  } catch {
    return null;
  }
}

const appsFlyer = safeRequire<any>('react-native-appsflyer');

const APPSFLYER_DEV_KEY = '4MkVRDY5NmYPjTZVydCgCV';
const APPLE_APP_ID = 'id6759072102';

let isInitialized = false;

/**
 * Initializes AppsFlyer SDK for iOS and Android
 */
export function initAppsFlyer(): void {
  if (Platform.OS === 'web' || !appsFlyer || isInitialized) return;

  try {
    appsFlyer.initSdk(
      {
        devKey: APPSFLYER_DEV_KEY,
        isDebug: __DEV__,
        appId: APPLE_APP_ID,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
      },
      (res: any) => {
        isInitialized = true;
        if (__DEV__) console.log('[AppsFlyer] initSdk success:', res);
      },
      (err: any) => {
        console.error('[AppsFlyer] initSdk error:', err);
      }
    );
  } catch (e) {
    console.error('[AppsFlyer] Failed to initialize:', e);
  }
}

/**
 * Sets Customer User ID (CUID) for user attribution matching (recommended by AppsFlyer)
 */
export function setAppsFlyerCUID(userId: string): void {
  if (Platform.OS === 'web' || !appsFlyer || !userId) return;

  try {
    appsFlyer.setCustomerUserId(userId, (res: any) => {
      if (__DEV__) console.log('[AppsFlyer] CUID set:', userId);
    });
  } catch (e) {
    if (__DEV__) console.warn('[AppsFlyer] setCustomerUserId error:', e);
  }
}

/**
 * Logs in-app event to AppsFlyer
 */
export function logAppsFlyerEvent(eventName: string, eventValues: Record<string, any> = {}): void {
  if (Platform.OS === 'web' || !appsFlyer) return;

  try {
    appsFlyer.logEvent(
      eventName,
      eventValues,
      (res: any) => {
        if (__DEV__) console.log(`[AppsFlyer] Event logged: ${eventName}`, res);
      },
      (err: any) => {
        if (__DEV__) console.warn(`[AppsFlyer] Event log error: ${eventName}`, err);
      }
    );
  } catch (e) {
    if (__DEV__) console.warn('[AppsFlyer] logEvent failed:', e);
  }
}
