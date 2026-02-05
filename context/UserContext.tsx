import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { configureRevenueCat, getCustomerInfoSafe } from '@/utils/revenuecat';

type UserContextValue = {
  isPro: boolean;
  isAdmin: boolean;
  customerInfo: any | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const ADMIN_EMAILS = new Set(
  [
    'jwfcarvalho1989@gmail.com',
    'ggovsaas@gmail.com',
    'josecarvalhoggov@gmail.com',
  ].map((e) => e.toLowerCase())
);

function isAdminFromClerk(user: any): boolean {
  const role = (user?.publicMetadata as any)?.role;
  if (role === 'admin') return true;
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase?.() ?? '';
  return ADMIN_EMAILS.has(email);
}

function isProFromCustomerInfo(info: any): boolean {
  return !!info?.entitlements?.active?.pro_features;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastUserIdRef = useRef<string | null>(null);

  const isAdmin = useMemo(() => isAdminFromClerk(clerkUser), [clerkUser]);
  const isPro = useMemo(() => isAdmin || isProFromCustomerInfo(customerInfo), [isAdmin, customerInfo]);

  const refresh = useCallback(async () => {
    if (!clerkUser?.id) {
      setCustomerInfo(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timeoutMs = 10_000;
    let timeoutHandle: any;
    try {
      // Fail-safe: never hang the app if RevenueCat stalls
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
      });

      await configureRevenueCat(clerkUser.id);
      const info = await Promise.race([getCustomerInfoSafe(), timeoutPromise]);
      if (info) setCustomerInfo(info);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      setIsLoading(false);
    }
  }, [clerkUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    const userId = clerkUser?.id ?? null;
    // Only run once per login state change to avoid loops.
    if (lastUserIdRef.current === userId) return;
    lastUserIdRef.current = userId;
    refresh().catch(() => {
      setCustomerInfo(null);
      setIsLoading(false);
    });
  }, [isLoaded, clerkUser?.id, refresh]);

  const value: UserContextValue = useMemo(
    () => ({ isPro, isAdmin, customerInfo, isLoading, refresh }),
    [isPro, isAdmin, customerInfo, isLoading, refresh]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}

