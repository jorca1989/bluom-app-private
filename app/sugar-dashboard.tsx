import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CircularProgress } from '@/components/CircularProgress';
import { SugarScanModal, SugarScanResult } from '@/components/SugarScanModal';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser as useAppUser } from '@/context/UserContext';
import { useCelebration } from '@/context/CelebrationContext';

// --- Ketosis State Logic ---
type KetoState = 'Deep Ketosis' | 'Nutritional Ketosis' | 'Glucose Burning';

function getKetosisState(netCarbs: number): { state: KetoState; color: string; bgColor: string } {
  if (netCarbs < 25) return { state: 'Deep Ketosis', color: '#7c3aed', bgColor: '#f5f3ff' }; // Violet
  if (netCarbs < 50) return { state: 'Nutritional Ketosis', color: '#2563eb', bgColor: '#eff6ff' }; // Blue
  return { state: 'Glucose Burning', color: '#475569', bgColor: '#f8fafc' }; // Slate
}

export default function MetabolicHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const appUser = useAppUser();
  const celebration = useCelebration();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Ensure we have a valid userId before querying
  const userId = convexUser?._id;

  // --- Queries ---
  const progress = useQuery(
    api.sugar.getResetProgress,
    userId ? { userId, days: 90, asOf: today } : 'skip'
  );

  const streaks = useQuery(
    api.streaks.getMetricStreaks,
    userId ? { userId } : 'skip'
  );

  const todayMacros = useQuery(
    api.metabolic.getDailyMetabolic,
    userId ? { userId, date: today } : 'skip'
  );

  // Pull macros from actual Fuel logs (food entries) so KPIs match what the user ate.
  const foodTotals = useQuery(
    api.food.getDailyTotals,
    userId ? { userId, date: today } : 'skip'
  );

  // Daily Check-in Logic (for Sugar)
  const todaySugarLog = useQuery(
    api.sugar.getDailyStatus,
    userId ? { userId, date: today } : 'skip'
  );

  const saveDaily = useMutation(api.sugar.logDailyStatus);
  const logMacros = useMutation(api.metabolic.logMacros);

  // Dev: Test Logging
  const handleDevLog = async () => {
    if (!userId) {
      Alert.alert("Wait", "User loading...");
      return;
    }
    try {
      await logMacros({
        userId,
        date: today,
        carbs: 10,
        fiber: 2,
        fat: 15,
        protein: 20,
        sugar: 1,
        calories: 300,
      });
      Alert.alert("Dev", "Logged test macros: 10g Carbs, 15g Fat");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // --- Metric Calculations ---
  // Default fallbacks if no logs
  const carbs = foodTotals?.carbs ?? todayMacros?.carbs ?? 0;
  // Fuel entries do not track fiber yet; fall back to metabolic log fiber if present.
  const fiber = todayMacros?.fiber ?? 0;
  const fat = foodTotals?.fat ?? todayMacros?.fat ?? 0;

  const netCarbs = Math.max(0, carbs - fiber);
  const ketoState = getKetosisState(netCarbs);

  // Fat/Carb Ratio (Percentage)
  // Avoid division by zero. If total = 0, ratio is 0.
  const totalFuel = fat + netCarbs;
  const fatPercentage = totalFuel > 0 ? Math.round((fat / totalFuel) * 100) : 0;

  // Keto budget: net carbs remaining (Fuel logs don't include sugar grams yet).
  const netCarbBudget = 25;
  const netCarbsRemaining = Math.max(0, netCarbBudget - netCarbs);

  const pct = Math.round((progress?.progress ?? 0) * 100);
  const streak = progress?.streak ?? 0;

  // --- Modals State ---
  const [showScan, setShowScan] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showGreenList, setShowGreenList] = useState(false); // Keto Cheat Sheet

  // Check-in Form
  const [checkInSugarFree, setCheckInSugarFree] = useState<boolean | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize Check-in form from data
  useMemo(() => {
    if (todaySugarLog) {
      setCheckInSugarFree(todaySugarLog.isSugarFree);
      setCheckInNotes(todaySugarLog.notes || '');
    }
  }, [todaySugarLog]);

  async function handleSaveCheckIn() {
    if (!userId) return;
    if (checkInSugarFree === null) {
      Alert.alert('Daily check-in', 'Choose Sugar‑free or Had sugar.');
      return;
    }
    setSaving(true);
    try {
      await saveDaily({
        userId,
        date: today,
        isSugarFree: checkInSugarFree,
        notes: checkInNotes.trim() || undefined,
      });
      celebration.trigger('fireworks');
      setShowCheckIn(false);
      Alert.alert('Saved', 'Daily check‑in saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const handleScanResult = (res: SugarScanResult) => {
    router.push({
      pathname: '/sugar-scan-result',
      params: {
        productName: res.productName,
        sugar: String(res.estimatedSugarGrams ?? 0),
        calories: String(res.estimatedCalories ?? 0),
        alternative: res.smartAlternative ?? '',
        notes: res.notes ?? '',
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-extrabold text-lg">Metabolic Hub</Text>
          <Text className="text-slate-500 font-bold text-xs">Glucose vs Ketones • Command Center</Text>
        </View>
        <TouchableOpacity onPress={() => setShowGreenList(true)} activeOpacity={0.8} onLongPress={handleDevLog}>
          <Ionicons name="document-text-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Ketosis State Banner --- */}
        <View style={{ backgroundColor: ketoState.bgColor }} className="mb-4 border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between">
          <View>
            <Text style={{ color: ketoState.color }} className="font-extrabold text-xs uppercase tracking-wider mb-1">Current State</Text>
            <Text className="text-slate-900 font-black text-xl">{ketoState.state}</Text>
          </View>
          <View style={{ backgroundColor: ketoState.color }} className="w-12 h-12 rounded-full items-center justify-center">
            <Ionicons name="flash" size={24} color="#fff" />
          </View>
        </View>

        {/* --- New KPI Grid --- */}
        <View className="flex-row gap-3 mb-4">
          {/* Net Carbs */}
          <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-4">
            <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1">Net Carbs</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-2xl">{Math.round(netCarbs)}</Text>
              <Text className="text-slate-400 font-bold text-xs">g</Text>
            </View>
            <Text className="text-slate-400 font-semibold text-[10px] mt-1">{Math.round(carbs)}c - {Math.round(fiber)}f</Text>
          </View>

          {/* Fat/Carb Ratio */}
          <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-4">
            <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1">Fat/Carb %</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-slate-900 font-black text-2xl">{fatPercentage}</Text>
              <Text className="text-slate-400 font-bold text-xs">%</Text>
            </View>
            <Text className="text-slate-400 font-semibold text-[10px] mt-1">Fat Dominance</Text>
          </View>

          {/* Net Carb Budget */}
          <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-4">
            <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1">Net Carbs Left</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className={`font-black text-2xl ${netCarbsRemaining < 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.round(netCarbsRemaining)}</Text>
              <Text className="text-slate-400 font-bold text-xs">g</Text>
            </View>
            <Text className="text-slate-400 font-semibold text-[10px] mt-1">of {netCarbBudget}g Budget</Text>
          </View>
        </View>

        {/* --- Brain Rewiring (Preserved) --- */}
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-slate-900 font-extrabold text-base">Brain Rewiring Meter</Text>
              <Text className="text-slate-500 font-bold text-xs mt-1">90‑day reset streak</Text>
            </View>
            <View className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Ionicons name="flame" size={14} color="#f97316" />
              <Text className="text-orange-800 font-extrabold">{streaks?.sugar ?? streak}d streak</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-4 mt-4">
            <View className="items-center justify-center">
              <CircularProgress progress={(progress?.progress ?? 0)} size={80} strokeWidth={8} />
              <View className="absolute items-center justify-center">
                <Text className="text-slate-900 font-black text-lg">{pct}%</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 font-semibold leading-5 text-sm">
                Consistency rewires dopamine pathways. Keep stacking sugar-free days.
              </Text>
            </View>
          </View>
        </View>

        {/* --- Actions --- */}
        <TouchableOpacity
          onPress={() => setShowScan(true)}
          activeOpacity={0.9}
          className="mb-3 bg-slate-900 rounded-3xl px-5 py-5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center">
              <Ionicons name="camera" size={22} color="#fff" />
            </View>
            <View>
              <Text className="text-white font-extrabold text-lg">Scan Food</Text>
              <Text className="text-white/70 font-bold text-xs">Detect Hidden Sugars & Macros</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCheckIn(true)}
          activeOpacity={0.9}
          className="bg-white border-2 border-slate-200 rounded-3xl px-5 py-4 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="create-outline" size={20} color="#0f172a" />
          <Text className="text-slate-900 font-extrabold text-base">Log Daily Status</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- Daily Check-in Modal --- */}
      <Modal visible={showCheckIn} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCheckIn(false)}>
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <View className="px-4 py-4 flex-row justify-between items-center border-b border-slate-100">
            <Text className="text-xl font-black text-slate-900">Daily Check-in</Text>
            <TouchableOpacity onPress={() => setShowCheckIn(false)}>
              <Ionicons name="close-circle" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView className="p-5">
            <Text className="text-slate-500 font-bold mb-4">Did you stay sugar-free today?</Text>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setCheckInSugarFree(true)}
                activeOpacity={0.85}
                className={`flex-1 rounded-2xl border-2 px-4 py-6 items-center ${checkInSugarFree === true ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent'}`}
              >
                <Ionicons name="shield-checkmark" size={32} color={checkInSugarFree === true ? '#10b981' : '#94a3b8'} className="mb-2" />
                <Text className={`font-black ${checkInSugarFree === true ? 'text-emerald-700' : 'text-slate-500'}`}>Sugar Free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCheckInSugarFree(false)}
                activeOpacity={0.85}
                className={`flex-1 rounded-2xl border-2 px-4 py-6 items-center ${checkInSugarFree === false ? 'bg-rose-50 border-rose-500' : 'bg-slate-50 border-transparent'}`}
              >
                <Ionicons name="alert-circle" size={32} color={checkInSugarFree === false ? '#f43f5e' : '#94a3b8'} className="mb-2" />
                <Text className={`font-black ${checkInSugarFree === false ? 'text-rose-700' : 'text-slate-500'}`}>Had Sugar</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-slate-900 font-bold mb-2">Notes</Text>
            <TextInput
              value={checkInNotes}
              onChangeText={setCheckInNotes}
              placeholder="How are you feeling? Triggers?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-50 rounded-xl p-4 text-slate-900 border border-slate-200 h-32"
            />

            <TouchableOpacity
              onPress={handleSaveCheckIn}
              disabled={saving}
              className={`mt-6 rounded-2xl py-4 items-center ${saving ? 'bg-slate-300' : 'bg-blue-600'}`}
            >
              <Text className="text-white font-black text-lg">{saving ? 'Saving...' : 'Save Check-in'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* --- Keto Green List Modal --- */}
      <Modal visible={showGreenList} animationType="fade" transparent onRequestClose={() => setShowGreenList(false)}>
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-3xl p-6 h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-black text-slate-900">Keto Green List</Text>
              <TouchableOpacity onPress={() => setShowGreenList(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-slate-500 font-medium mb-4">Stick to these foods to stay in Deep/Nutritional Ketosis.</Text>

              <View className="mb-4">
                <Text className="text-emerald-600 font-black mb-2 uppercase tracking-wider text-xs">Healthy Fats</Text>
                <Text className="text-slate-800 font-semibold leading-6">• Avocado / Avocado Oil{'\n'}• Olive Oil / Coconut Oil{'\n'}• Butter / Ghee{'\n'}• MCT Oil</Text>
              </View>

              <View className="mb-4">
                <Text className="text-blue-600 font-black mb-2 uppercase tracking-wider text-xs">Proteins</Text>
                <Text className="text-slate-800 font-semibold leading-6">• Fatty Fish (Salmon, Mackerel){'\n'}• Eggs (Whole){'\n'}• Beef / Steak (Fatty cuts){'\n'}• Chicken Thighs (Skin on)</Text>
              </View>

              <View className="mb-4">
                <Text className="text-purple-600 font-black mb-2 uppercase tracking-wider text-xs">Low Carb Veggies</Text>
                <Text className="text-slate-800 font-semibold leading-6">• Spinach / Kale{'\n'}• Broccoli / Cauliflower{'\n'}• Zucchini{'\n'}• Asparagus</Text>
              </View>

              <View>
                <Text className="text-rose-600 font-black mb-2 uppercase tracking-wider text-xs">Avoid / Limit</Text>
                <Text className="text-slate-800 font-semibold leading-6">• Bread, Pasta, Rice{'\n'}• Potatoes{'\n'}• Sugary Fruits (Bananas, Grapes){'\n'}• Processed Snacks</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SugarScanModal visible={showScan} onClose={() => setShowScan(false)} onResult={handleScanResult} />

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title="Unlock with Pro"
        message="Upgrade to Pro to unlock premium Metabolic insights."
        upgradeLabel="View Pro Plans"
      />
    </SafeAreaView>
  );
}
