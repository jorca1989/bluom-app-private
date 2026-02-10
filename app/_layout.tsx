import '../global.css';
import React, { useEffect, useState } from 'react';
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
    if (Platform.OS === 'web') return;
    if (!isLoaded || convexLoading) return;

    if (isSignedIn && convexAuthenticated) {
      if (convexUser === undefined) return;

      if (convexUser === null) {
        if (segments[0] !== 'onboarding') router.replace('/onboarding');
        return;
      }

      if ((convexUser.age ?? 0) > 0) {
        const inAuth = segments[0] === '(auth)';
        const isOnb = segments[0] === 'onboarding';
        if (inAuth || (segments.length as number) === 0 || isOnb) {
          router.replace('/(tabs)');
        }
      } else {
        if (segments[0] !== 'onboarding') router.replace('/onboarding');
      }
    } else if (!isSignedIn) {
      if (segments[0] !== '(auth)') {
        router.replace('/login');
      }
    }
  }, [isSignedIn, isLoaded, convexLoading, convexAuthenticated, convexUser, segments]);

  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // If we are still loading after 10 seconds, show timeout message
      if ((!isLoaded || showAuthLoading || showConvexUserLoading) && Platform.OS !== 'web') {
        setIsTimedOut(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isLoaded, showAuthLoading, showConvexUserLoading]);

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
            // Simple reload attempt
            router.replace('/');
            setIsTimedOut(false);
          }}
        >
          Tap to Retry
        </Text>
      </View>
    );
  }

  if (!isLoaded || showAuthLoading || (isSignedIn && !convexAuthenticated && !convexUser)) {
    return <LoadingScreen message="App is loading..." />;
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


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

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
  useEffect(() => {
    warnIfMissingGoogleOAuthClientIds();
  }, []);

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
              <InitialLayout />
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
