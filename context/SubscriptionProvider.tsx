import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { configureRevenueCat, getCustomerInfoSafe } from '@/utils/revenuecat';

type SubscriptionStatus = 'unknown' | 'free' | 'pro';

type SubscriptionContextValue = {
  status: SubscriptionStatus;
  isPro: boolean;
  isAdmin: boolean;
  customerInfo: any | null;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function isProFromCustomerInfo(customerInfo: any): boolean {
  const active = customerInfo?.entitlements?.active;
  if (!active) return false;
  // Only count the specific entitlement we use for Pro.
  return !!active?.pro_features;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus>('unknown');

  const isAdmin = useMemo(() => {
    return (
      convexUser?.isAdmin === true ||
      convexUser?.role === 'admin' ||
      convexUser?.role === 'super_admin'
    );
  }, [convexUser?.isAdmin, convexUser?.role]);

  const refresh = async () => {
    // Ensure Purchases is configured before calling getCustomerInfo (prevents stale/free status).
    if (clerkUser?.id) {
      await configureRevenueCat(clerkUser.id);
    }
    const info = await getCustomerInfoSafe();
    setCustomerInfo(info);
    const rcPro = info ? isProFromCustomerInfo(info) : false;

    // Pro is ONLY from RevenueCat entitlements (admin remains separate).
    const finalPro = isAdmin || rcPro;
    setStatus(finalPro ? 'pro' : 'free');
  };

  useEffect(() => {
    // refresh when user becomes available and when convexUser loads
    if (!clerkUser?.id) return;
    if (convexUser === undefined) return;
    refresh().catch(() => {
      // If RevenueCat is not configured yet, treat as free (unless admin).
      setStatus(isAdmin ? 'pro' : 'free');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id, convexUser?._id, isAdmin]);

  const value: SubscriptionContextValue = useMemo(
    () => ({
      status,
      isPro: status === 'pro',
      isAdmin,
      customerInfo,
      refresh,
    }),
    [status, isAdmin, customerInfo]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}


