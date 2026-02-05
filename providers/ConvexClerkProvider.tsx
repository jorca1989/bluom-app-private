import { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";

const CLERK_JWT_TEMPLATE_ID =
  process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE_ID ??
  (process.env as any).CLERK_JWT_TEMPLATE_ID ??
  'jtmp_37ixCZjxhFlM4THbZIBUlZYoFLr';

function useConvexClerkAuth() {
  const auth = useAuth();
  return {
    ...auth,
    getToken: async (options?: any) => {
      const base = options ?? {};
      try {
        const t = await auth.getToken({ ...base, template: CLERK_JWT_TEMPLATE_ID });
        if (t) return t;
      } catch (e) {
        // ignore and fall back
      }
      try {
        const t = await auth.getToken({ ...base, template: 'convex' });
        if (t) return t;
      } catch (e) {
        // ignore and fall back
      }
      return auth.getToken(base);
    },
  };
}

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key); // Must be awaited
      return item;
    } catch (error) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value); // Must be awaited
    } catch (err) {
      return;
    }
  },
};

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  }
);

export function ConvexClerkProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please add it to your .env file"
    );
  }

  if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_CONVEX_URL. Please add it to your .env file"
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useConvexClerkAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
