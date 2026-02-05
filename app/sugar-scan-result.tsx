import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser as useAppUser } from '@/context/UserContext';
import { useCelebration } from '@/context/CelebrationContext';
import { getBottomContentPadding } from '@/utils/layout';

export default function SugarScanResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const appUser = useAppUser();
  const celebration = useCelebration();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const saveDaily = useMutation(api.sugar.logDailyStatus);

  const productName = String(params.productName ?? 'Unknown');
  const sugar = Number(params.sugar ?? 0);
  const calories = Number(params.calories ?? 0);
  const hiddenSugars = useMemo(() => {
    try {
      return JSON.parse(String(params.hiddenSugarsFound ?? '[]'));
    } catch {
      return [];
    }
  }, [params.hiddenSugarsFound]);
  const alternative = String(params.alternative ?? '');
  const notes = String(params.notes ?? '');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function saveSugarLog() {
    if (!convexUser?._id) return;
    if (!(appUser.isPro || appUser.isAdmin)) {
      setShowUpgrade(true);
      return;
    }
    try {
      await saveDaily({
        userId: convexUser._id,
        date: today,
        isSugarFree: sugar <= 0,
        notes: `Scan: ${productName}. Sugar≈${Math.round(sugar)}g, Calories≈${Math.round(calories)}. ${notes}. Hidden sugars: ${hiddenSugars.join(', ')}`.slice(0, 900),
      });
      celebration.trigger('fireworks');
      Alert.alert('Saved', 'Saved to today’s Sugar check‑in.');
      router.replace('/sugar-dashboard');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not save.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-extrabold text-lg">Scan Result</Text>
          <Text className="text-slate-500 font-bold text-xs">{productName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}>
        <View className="bg-white border border-slate-200 rounded-2xl p-4">
          <Text className="text-slate-900 font-extrabold text-base">Estimated Sugar</Text>
          <Text className="text-rose-600 font-black text-4xl mt-2">{Math.round(sugar)}g</Text>
          <Text className="text-slate-500 font-bold text-xs mt-1">Per serving (best‑effort)</Text>
        </View>

        <View className="bg-white border border-slate-200 rounded-2xl p-4 mt-3">
          <Text className="text-slate-900 font-extrabold text-base">Estimated Calories</Text>
          <Text className="text-slate-900 font-black text-4xl mt-2">{Math.round(calories)}</Text>
          <Text className="text-slate-500 font-bold text-xs mt-1">kcal per serving (best‑effort)</Text>
        </View>

        {hiddenSugars.length > 0 && (
          <View className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mt-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="warning" size={18} color="#e11d48" />
              <Text className="text-rose-900 font-black text-base">Hidden Sugars Found</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {hiddenSugars.map((s: string, i: number) => (
                <View key={i} className="bg-rose-100 px-3 py-1 rounded-full">
                  <Text className="text-rose-700 font-bold text-xs">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="bg-white border border-slate-200 rounded-2xl p-4 mt-3 overflow-hidden">
          <Text className="text-slate-900 font-extrabold text-base">Smart Alternative</Text>
          {appUser.isPro || appUser.isAdmin ? (
            <Text className="text-slate-700 font-semibold mt-2 leading-5">{alternative || '—'}</Text>
          ) : (
            <View className="mt-2 rounded-xl overflow-hidden">
              <BlurView intensity={30} tint="light" className="absolute inset-0" />
              <View className="p-3">
                <Text className="text-slate-900 font-extrabold">Unlock with Pro</Text>
                <Text className="text-slate-600 font-semibold mt-1">Get smart, low‑sugar alternatives tailored to what you scanned.</Text>
                <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.85} className="mt-3 bg-blue-600 rounded-xl py-3 items-center">
                  <Text className="text-white font-extrabold">View Pro Plans</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {!!notes ? (
          <View className="bg-white border border-slate-200 rounded-2xl p-4 mt-3">
            <Text className="text-slate-900 font-extrabold text-base">Notes</Text>
            <Text className="text-slate-700 font-semibold mt-2 leading-5">{notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity onPress={saveSugarLog} activeOpacity={0.9} className="mt-4 bg-slate-900 rounded-2xl py-4 items-center">
          <Text className="text-white font-extrabold">Save Sugar Log</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title="Unlock with Pro"
        message="Upgrade to Pro to save Sugar scan logs and unlock Smart Alternatives."
        upgradeLabel="View Pro Plans"
      />
    </SafeAreaView>
  );
}


