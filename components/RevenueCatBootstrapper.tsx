import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { configureRevenueCat } from '@/utils/revenuecat';

/**
 * Initializes RevenueCat Purchases SDK once we know the signed-in user.
 * This keeps Purchases configured app-wide without needing to repeat setup per-screen.
 */
export function RevenueCatBootstrapper() {
  const { user: clerkUser, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser?.id) return;
    configureRevenueCat(clerkUser.id).catch(() => {});
  }, [isLoaded, clerkUser?.id]);

  return null;
}


