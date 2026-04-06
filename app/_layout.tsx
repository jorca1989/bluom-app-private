import '../global.css';
import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { Buffer } from 'buffer';
globalThis.Buffer = globalThis.Buffer ?? Buffer;

// ─── In-memory flag set by onboarding.tsx before it saves data ───────────────
// Using a module-level variable means it's synchronously readable by _layout.tsx
// with zero async gap — no SecureStore read needed.
export let pendingRouteAfterOnboarding: '/premium' | null = null;
export function setPendingRouteAfterOnboarding(route: '/premium' | null) {
  pendingRouteAfterOnboarding = route;
}

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.warn('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key).catch(() => null);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('SecureStore set item error: ', err);
      return;
    }
  },
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string);

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
      } catch (e) { /* ignore */ }
      try {
        const t = await auth.getToken({ ...base, template: 'convex' });
        if (t) return t;
      } catch (e) { /* ignore */ }
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
  const navigationState = useRootNavigationState();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  const showAuthLoading = isLoaded && isSignedIn && !convexAuthenticated;
  const showConvexUserLoading = isLoaded && isSignedIn && convexAuthenticated && convexUser === undefined;

  const [isTimedOut, setIsTimedOut] = useState(false);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);

  // hasNavigatedRef prevents double-fires within a single auth session
  const hasNavigatedRef = useRef(false);
  const sessionKeyRef = useRef<string>('');

  // ─── Track previous onboarding completion to detect the exact transition ──
  // We store the previous convexUser.age so we can detect the moment it goes
  // from 0 → >0 (i.e. onboarding just completed) within this session.
  const prevAgeRef = useRef<number | null>(null);

  // Reset nav lock when auth session changes
  useEffect(() => {
    const k = isSignedIn ? (user?.id ?? 'signed_in') : 'signed_out';
    if (sessionKeyRef.current !== k) {
      sessionKeyRef.current = k;
      hasNavigatedRef.current = false;
      prevAgeRef.current = null;
    }
  }, [isSignedIn, user?.id]);

  // Minimum splash delay
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashTimeElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // ─── THE ONLY NAVIGATION LOGIC IN THE APP ────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isLoaded || convexLoading || !navigationState?.key) return;
    if (!isSignedIn || !convexAuthenticated) {
      // Not signed in → go to login
      if (segments[0] !== '(auth)') {
        hasNavigatedRef.current = true;
        router.replace('/login');
      }
      return;
    }

    // Signed in but user data not loaded yet
    if (convexUser === undefined) return;

    // No Convex user record → needs onboarding
    if (convexUser === null) {
      if (segments[0] !== 'onboarding') {
        hasNavigatedRef.current = true;
        router.replace('/onboarding');
      }
      return;
    }

    const currentAge = convexUser.age ?? 0;
    const previousAge = prevAgeRef.current;

    // ── Case 1: Onboarding JUST completed this session ──────────────────────
    // Detected by: previousAge was 0 (or null during first load after onboarding)
    // AND pendingRouteAfterOnboarding was set by onboarding.tsx
    if (pendingRouteAfterOnboarding && currentAge > 0) {
      const destination = pendingRouteAfterOnboarding;
      setPendingRouteAfterOnboarding(null); // Clear immediately to prevent re-fire
      hasNavigatedRef.current = true;
      prevAgeRef.current = currentAge;
      router.replace(destination);
      return;
    }

    // Update prevAge tracking
    prevAgeRef.current = currentAge;

    // ── Case 2: Already onboarded, returning user ────────────────────────────
    if (currentAge > 0) {
      const inAuth = segments[0] === '(auth)';
      const isOnb = segments[0] === 'onboarding';
      const isIndex = (segments.length as number) === 0 || segments[0] === 'index';

      // Only redirect if stuck on auth/onboarding/index screens
      if ((inAuth || isOnb || isIndex) && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        router.replace('/(tabs)');
      }
      return;
    }

    // ── Case 3: age is 0 → needs onboarding ─────────────────────────────────
    if (segments[0] !== 'onboarding' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace('/onboarding');
    }
  }, [isSignedIn, isLoaded, convexLoading, convexAuthenticated, convexUser, segments]);

  // Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((!isLoaded || showAuthLoading || showConvexUserLoading) && Platform.OS !== 'web') {
        setIsTimedOut(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoaded, showAuthLoading, showConvexUserLoading]);

  // Splash screen
  useEffect(() => {
    const ready =
      isTimedOut ||
      (isLoaded && (!isSignedIn || (isSignedIn && convexAuthenticated && convexUser !== undefined)));
    if (ready && minSplashTimeElapsed) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded, isSignedIn, convexAuthenticated, convexUser, isTimedOut, minSplashTimeElapsed]);

  if (isTimedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Connection Timeout</Text>
        <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>
          The app is taking too long to load. This might be a network issue.
        </Text>
        <Text
          style={{ color: '#2563eb', fontWeight: '600', marginTop: 8 }}
          onPress={() => {
            router.replace(isSignedIn ? '/(tabs)' : '/login');
            setIsTimedOut(false);
          }}
        >
          Tap to Retry
        </Text>
      </View>
    );
  }

  if (!isLoaded || showAuthLoading || (isSignedIn && !convexAuthenticated && !convexUser) || showConvexUserLoading) {
    const message =
      !isLoaded ? 'Loading…' :
        showAuthLoading ? 'Syncing account…' :
          showConvexUserLoading ? 'Syncing profile…' : 'Syncing…';
    return <LoadingScreen message={message} />;
  }

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
              <Stack.Screen name="(auth)/login" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="(auth)/signup" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'card', gestureEnabled: false }} />
              <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="meal-hub" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="ai-meal-maker" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          </CelebrationProvider>
        </UserProvider>
      </AudioProvider>
      <StatusBar style="auto" />
    </>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Root ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ color: 'gray' }}>We've noted this issue. Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  useFrameworkReady();
  useSoundEffects();
  useEffect(() => { warnIfMissingGoogleOAuthClientIds(); }, []);

  if (!publishableKey || !convexUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#dc2626' }}>Configuration Error</Text>
        <Text style={{ color: '#64748b', textAlign: 'center' }}>
          Missing environment variables.{'\n'}
          {!publishableKey && 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY\n'}
          {!convexUrl && 'EXPO_PUBLIC_CONVEX_URL'}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ConvexProviderWithClerk client={convex} useAuth={useConvexClerkAuth}>
              <AnalyticsProvider>
                <InitialLayout />
              </AnalyticsProvider>
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
