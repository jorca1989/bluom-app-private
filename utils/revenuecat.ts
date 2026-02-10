import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
  PurchasesOfferings,
} from 'react-native-purchases';
import { Platform } from 'react-native';

let configuredForUserId: string | null = null;

export function getRevenueCatAndroidApiKey(): string | null {
  const key =
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ??
    // Back-compat with older env naming used in this repo
    process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
  if (!key) return null;
  return String(key);
}

export async function configureRevenueCat(appUserId: string) {
  // RevenueCat SDK is native-only; on web this will be undefined and can crash.
  if (Platform.OS === 'web') return;
  const apiKey = getRevenueCatAndroidApiKey();
  if (!apiKey) {
    // Keep this non-fatal in dev so the app can run without purchases configured yet.
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] Missing EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
    return;
  }
  if (configuredForUserId === appUserId) return;

  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
    Purchases.configure({ apiKey, appUserID: appUserId });
    configuredForUserId = appUserId;
  } catch (e) {
    console.warn('[revenuecat] Failed to configure Purchases:', e);
  }
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] getCustomerInfo failed', e);
    return null;
  }
}

export async function getOfferingsSafe(): Promise<PurchasesOfferings | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] getOfferings failed', e);
    return null;
  }
}

export function pickProOffering(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  if (!offerings) return null;
  const preferredId = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID;
  const preferred =
    preferredId && offerings.all ? (offerings.all as any)[String(preferredId)] : null;
  return preferred ?? offerings.current ?? null;
}

export function pickMonthlyAndAnnualPackages(offering: PurchasesOffering | null): {
  monthly?: PurchasesPackage;
  annual?: PurchasesPackage;
  all: PurchasesPackage[];
} {
  if (!offering) return { all: [] };

  const pkgs = offering.availablePackages;

  const monthlyProductId = process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PRODUCT_ID;
  const yearlyProductId = process.env.EXPO_PUBLIC_REVENUECAT_YEARLY_PRODUCT_ID;

  const getProductId = (p: PurchasesPackage) =>
    String(((p as any)?.product?.identifier ?? (p as any)?.product?.productIdentifier ?? '') || '');

  const monthly =
    (monthlyProductId
      ? pkgs.find((p: PurchasesPackage) => getProductId(p) === String(monthlyProductId))
      : undefined) ??
    pkgs.find((p: PurchasesPackage) => String(p.packageType).toLowerCase().includes('monthly'));

  const annual =
    (yearlyProductId
      ? pkgs.find((p: PurchasesPackage) => getProductId(p) === String(yearlyProductId))
      : undefined) ??
    pkgs.find((p: PurchasesPackage) => String(p.packageType).toLowerCase().includes('annual'));

  return { monthly, annual, all: pkgs };
}

export async function purchasePackageSafe(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  try {
    const res = await Purchases.purchasePackage(pkg);
    return res?.customerInfo ?? null;
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    // User cancelled -> not an error for UI
    if (e?.userCancelled || msg.toLowerCase().includes('cancel')) return null;
    throw e;
  }
}


