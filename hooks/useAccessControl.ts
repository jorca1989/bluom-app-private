import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { useUser as useAppUser } from '@/context/UserContext';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';

export function useAccessControl() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const appUser = useAppUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isLoading = !isClerkLoaded || convexUser === undefined || appUser.isLoading;

  const isAdmin = useMemo(() => {
    return appUser.isAdmin;
  }, [appUser.isAdmin]);

  const isPro = useMemo(() => {
    return appUser.isPro;
  }, [appUser.isPro]);

  function promptUpgrade(message: string) {
    triggerSound(SoundEffect.UPGRADE_ALL_FEATURES);
    Alert.alert('Premium Required', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Upgrade', onPress: () => router.push('/premium') },
    ]);
  }

  return { convexUser, isAdmin, isPro, isLoading, promptUpgrade };
}


