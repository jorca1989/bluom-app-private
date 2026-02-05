import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useConvexAuth } from 'convex/react';
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RevenueCatBootstrapper } from '@/components/RevenueCatBootstrapper';
import { UserProvider } from '@/context/UserContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CelebrationProvider } from '@/context/CelebrationContext';
import { AudioProvider } from '@/context/AudioContext';
import { warnIfMissingGoogleOAuthClientIds } from '@/utils/googleOAuthEnv';

// Polyfill Buffer for libraries like react-native-svg (used by lucide-react-native).
import { Buffer } from 'buffer';
globalThis.Buffer = globalThis.Buffer ?? Buffer;

const HAS_SEEN_ONBOARDING_KEY = 'bluom_has_seen_onboarding_v1';

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string);

const CLERK_JWT_TEMPLATE_ID =
  process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE_ID ??
  // Fallback for environments where non-public vars are still injected (e.g. tests).
  (process.env as any).CLERK_JWT_TEMPLATE_ID ??
  // Hard requirement from user prompt.
  'jtmp_37ixCZjxhFlM4THbZIBUlZYoFLr';

function useConvexClerkAuth() {
  const auth = useAuth();
  return {
    ...auth,
    getToken: async (options?: any) => {
      const base = options ?? {};
      // Clerk's SDK commonly expects the *template name* (e.g. "convex"), but you provided the template id (jtmp_...).
      // To avoid false-positive loops, try the configured value first, then fall back to the "convex" template name,
      // and finally to the default token.
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

function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>{message ?? 'Loading...'}</Text>
    </View>
  );
}

function InitialLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } = useConvexAuth();
  const router = useRouter();
  const segments = useSegments();

  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const showAuthLoading = isLoaded && isSignedIn && !convexAuthenticated;
  const showConvexUserLoading = isLoaded && isSignedIn && convexAuthenticated && convexUser === undefined;

  useEffect(() => {
    // Web is a marketing landing page (app/index.tsx renders <LandingPage />).
    // Avoid native auth/onboarding redirects on web to prevent routing into native-only screens.
    if (Platform.OS === 'web') return;
    if (!isLoaded || convexLoading) return;


    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isOnboarding = segments[0] === 'onboarding';
    const isRoot = (segments as string[]).length === 0;

    console.log("Routing Check:", { isSignedIn, convexAuthenticated, hasConvexUser: !!convexUser, segments: segments[0] });

    if (isSignedIn && convexAuthenticated) {
      // User is logged in and authenticated with Convex AND user data exists
      if (convexUser === undefined) return; // Loading user data
      if (convexUser === null) {
        // Standard behavior for store submission: if user record is missing, go to onboarding immediately.
        if (!isOnboarding) router.replace("/onboarding");
        return;
      }

      if (convexUser) {
        // Redirect to tabs only if we are currently in an auth screen or at the root
        // AND the user has completed onboarding (checked via age > 0)
        if ((convexUser.age ?? 0) > 0) {
          // Only redirect if we're not already in the app
          if (inAuthGroup || (segments as string[]).length === 0 || isOnboarding) {
            router.replace("/(tabs)");
          }
        } else if ((convexUser.age ?? 0) === 0 && !isOnboarding) {
          // Force redirect to onboarding if age is 0 and not already there
          console.log("Redirecting to onboarding (incomplete profile)");
          router.replace("/onboarding");
        }
      }
    } else if (!isSignedIn) {
      // User is not signed in
      if (isRoot) {
        // First install: show onboarding slider once. Any later signed-out session should go straight to auth.
        (async () => {
          try {
            const hasSeen = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING_KEY);
            if (hasSeen === '1') {
              router.replace("/(auth)/login");
            } else {
              router.replace("/onboarding");
            }
          } catch (e) {
            // If SecureStore fails, fall back to onboarding so first-time users aren't blocked.
            router.replace("/onboarding");
          }
        })();
        return;
      }

      // Redirect to login only if we are not already in an auth group or onboarding
      if (!inAuthGroup && !isOnboarding) {
        router.replace("/(auth)/login");
      }
    }
  }, [isSignedIn, isLoaded, convexLoading, convexAuthenticated, convexUser, segments]);

  if (showAuthLoading) {
    return <LoadingScreen message="Signing you in..." />;
  }

  if (showConvexUserLoading) {
    return <LoadingScreen message="Setting up your account..." />;
  }
  // Standard behavior: while redirect triggers, keep rendering the app shell.

  return (
    <>
      <RevenueCatBootstrapper />
      <AudioProvider>
        <UserProvider>
          <CelebrationProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#ffffff' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="(auth)/login"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="(auth)/signup"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="onboarding"
                options={{
                  headerShown: false,
                  presentation: 'card',
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="premium"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="admin"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          </CelebrationProvider>
        </UserProvider>
      </AudioProvider>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  useSoundEffects();
  useEffect(() => {
    warnIfMissingGoogleOAuthClientIds();
  }, []);

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ConvexProviderWithClerk client={convex} useAuth={useConvexClerkAuth}>
            <InitialLayout />
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
