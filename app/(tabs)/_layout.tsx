import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '@/utils/layout';
import { Home, Utensils, Dumbbell, Heart, User } from 'lucide-react-native';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useConvexAuth } from 'convex/react';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';


export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: TAB_BAR_HEIGHT + bottom,
          paddingBottom: bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => triggerSound(SoundEffect.NAV_TABS),
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarIcon: ({ size, color }) => <Utensils size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => triggerSound(SoundEffect.NAV_TABS),
        }}
      />
      <Tabs.Screen
        name="move"
        options={{
          title: 'Move',
          tabBarIcon: ({ size, color }) => <Dumbbell size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => triggerSound(SoundEffect.NAV_TABS),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ size, color }) => <Heart size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => triggerSound(SoundEffect.NAV_TABS),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => triggerSound(SoundEffect.NAV_TABS),
        }}
      />

    </Tabs>
  );
}
