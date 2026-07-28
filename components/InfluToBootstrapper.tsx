import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { initializeInfluTo } from '@/utils/influto';

/**
 * Initializes InfluTo once on native startup and sends the install/attribution event
 * their dashboard expects before RevenueCat webhook conversion tracking can work.
 */
export function InfluToBootstrapper() {
  const { user: clerkUser, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    initializeInfluTo(clerkUser?.id).catch(() => {});
  }, [isLoaded, clerkUser?.id]);

  return null;
}