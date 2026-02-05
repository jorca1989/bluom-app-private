import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Dimensions, Switch, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useAccessControl } from '@/hooks/useAccessControl';
import { getBottomContentPadding } from '@/utils/layout';
import { BlurView } from 'expo-blur';
import { VitalityChart } from '@/components/VitalityChart';

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- Sub-Components ---

const ActionTile = ({ icon, label, subLabel, onPress, color = "blue" }: any) => (
  <TouchableOpacity onPress={onPress} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 flex-row items-center justify-between shadow-lg">
    <View className="flex-row items-center gap-4">
      <View className={`w-12 h-12 rounded-2xl items-center justify-center ${color === 'emerald' ? 'bg-emerald-500/10' : color === 'purple' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
        <Ionicons name={icon} size={24} color={color === 'emerald' ? '#10b981' : color === 'purple' ? '#a855f7' : '#3b82f6'} />
      </View>
      <View>
        <Text className="text-white font-black text-lg">{label}</Text>
        <Text className="text-slate-400 text-xs font-bold">{subLabel}</Text>
      </View>
    </View>
    <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
      <Ionicons name="chevron-forward" size={16} color="#64748b" />
    </View>
  </TouchableOpacity>
);

const VitalitySlider = ({ label, value, onChange, icon }: { label: string, value: number, onChange: (v: number) => void, icon: any }) => {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={18} color="#94a3b8" />
          <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider">{label}</Text>
        </View>
        <Text className="text-blue-400 font-black text-lg">{value}/10</Text>
      </View>
      <View className="flex-row justify-between items-center bg-slate-800/50 rounded-full p-1 h-12 relative">
        <View className="absolute left-2 right-2 h-1 bg-slate-700 rounded-full z-0 top-[22px]" />
        {[2, 4, 6, 8, 10].map((step) => (
          <TouchableOpacity key={step} onPress={() => onChange(step)} className="z-10 w-10 h-10 items-center justify-center">
            <View className={`w-4 h-4 rounded-full border-2 ${value >= step ? 'bg-blue-500 border-blue-400' : 'bg-slate-800 border-slate-600'}`} />
          </TouchableOpacity>
        ))}
        <View className="absolute left-2 h-1 bg-blue-500 rounded-full z-0 top-[22px]" style={{ width: `${(value / 10) * 100}%` }} />
      </View>
    </View>
  );
};

export default function MensHealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  // --- Data Queries ---
  const today = new Date().toISOString().slice(0, 10);
  // @ts-ignore
  const history = useQuery(api.mensHealth.getVitalityHistory, convexUser?._id ? { userId: convexUser._id, days: 7 } : 'skip');
  // @ts-ignore
  const status = useQuery(api.mensHealth.getOptimizationStatus, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const wellnessLog = useQuery(api.wellness.getTodayLog, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');

  // --- Mutations ---
  // @ts-ignore
  const logSession = useMutation(api.mensHealth.logSession);
  // @ts-ignore
  const logSupps = useMutation(api.mensHealth.logSupplement);

  // --- Modals State ---
  const [activeModal, setActiveModal] = useState<'NONE' | 'PELVIC' | 'VITALITY' | 'SUPPS'>('NONE');

  // Pelvic State
  const [kegelActive, setKegelActive] = useState(false);
  const [kegelSeconds, setKegelSeconds] = useState(0);
  const [sessionInstruction, setSessionInstruction] = useState("READY");

  // Vitality State
  const [drive, setDrive] = useState(5);
  const [recovery, setRecovery] = useState(5);
  const [focus, setFocus] = useState(5);
  // Optional: Sync mood from wellness check
  const moodSync = wellnessLog?.mood || 5;

  // Supps State
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [suppNote, setSuppNote] = useState('');

  // Handlers

  // Pelvic Timer
  useEffect(() => {
    let interval: any;
    if (kegelActive) {
      interval = setInterval(() => {
        setKegelSeconds(s => {
          const next = s + 1;
          const cycle = next % 10;
          if (cycle > 0 && cycle <= 5) setSessionInstruction("SQUEEZE & HOLD ⚡");
          else setSessionInstruction("RELAX & BREATHE 🌬️");
          return next;
        });
      }, 1000);
    } else {
      setSessionInstruction("READY");
      setKegelSeconds(0);
    }
    return () => clearInterval(interval);
  }, [kegelActive]);

  async function handleFinishPelvic() {
    if (!convexUser?._id) return;
    setKegelActive(false);
    try {
      await logSession({
        userId: convexUser._id,
        date: today,
        duration: kegelSeconds,
        drive: drive,
        recovery: recovery,
        focus: focus
      });
      Alert.alert("Protocol Complete", "Session logged.");
      setActiveModal('NONE');
    } catch (e) { Alert.alert("Error", "Failed to log."); }
  }

  async function handleLogVitality() {
    if (!convexUser?._id) return;
    try {
      await logSession({
        userId: convexUser._id,
        date: today,
        duration: 0,
        drive, recovery, focus
      });
      Alert.alert("Logged", "System status updated.");
      setActiveModal('NONE');
    } catch (e) { Alert.alert("Error", "Failed to log."); }
  }

  const activeStack = status?.recommendedStack || [];

  async function handleLogSupps() {
    if (!convexUser?._id) return;
    try {
      await logSupps({
        userId: convexUser._id,
        date: today,
        items: activeStack.map((i: any) => ({ name: i.name, dosage: "1 dose", taken: true })), // MVP: Log all active as taken
        notes: suppNote + (enhancedMode ? " [Enhanced Mode]" : "")
      });
      Alert.alert("Stack Logged", "Supplement intake recorded.");
      setActiveModal('NONE');
    } catch (e) { Alert.alert("Error", "Failed to log supplements."); }
  }


  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-5 pb-4 flex-row items-center gap-4 bg-black border-b border-slate-900" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-black text-xl tracking-tight">Optimization Hub</Text>
          <Text className="text-blue-500 font-bold text-xs uppercase tracking-widest">System Status: {status?.score || 0}%</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}>

        {/* Chart Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-end mb-4 px-1">
            <View>
              <Text className="text-white font-black text-2xl">7-Day Trend</Text>
              <View className="flex-row gap-4 mt-1">
                <View className="flex-row items-center gap-1"><View className="w-2 h-2 rounded-full bg-blue-500" /><Text className="text-slate-500 text-xs font-bold">Drive</Text></View>
                <View className="flex-row items-center gap-1"><View className="w-2 h-2 rounded-full bg-emerald-500" /><Text className="text-slate-500 text-xs font-bold">Recovery</Text></View>
              </View>
            </View>
          </View>
          {history ? (
            <VitalityChart data={history.map((h: any) => ({ date: h.date, drive: h.drive, recovery: h.recovery, focus: h.focus }))} />
          ) : (
            <View className="h-48 bg-slate-900 rounded-3xl items-center justify-center border border-slate-800">
              <Text className="text-slate-600 font-bold">Loading Data...</Text>
            </View>
          )}
        </View>

        {/* Action Mosaic */}
        <Text className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4 px-1">Daily Protocols</Text>

        <ActionTile
          icon="fitness"
          label="Pelvic Power Protocol"
          subLabel="Core stability & strength"
          onPress={() => setActiveModal('PELVIC')}
        />
        <ActionTile
          icon="stats-chart"
          label="Vitality Check-In"
          subLabel="Log Drive, Focus, Recovery"
          color="emerald"
          onPress={() => setActiveModal('VITALITY')}
        />
        <ActionTile
          icon="flask"
          label="Supplement Stack"
          subLabel="Track intake & cycle"
          color="purple"
          onPress={() => setActiveModal('SUPPS')}
        />

        {/* Pro Insights Shield */}
        <View className="mt-6 mb-8 relative">
          <Text className="text-white font-black text-xl mb-4">Deep Bio-Analytics</Text>
          <View className="bg-slate-900 rounded-3xl p-6 border border-slate-800 min-h-[160px]">
            <Text className="text-slate-500">Analysis of your correlations...</Text>
          </View>

          {!isPro && (
            <View className="absolute inset-0 rounded-3xl overflow-hidden">
              <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark">
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="lock-closed" size={32} color="#fff" className="mb-2" />
                  <TouchableOpacity onPress={() => promptUpgrade('Unlock Deep Analytics')} className="bg-blue-600 px-6 py-3 rounded-full mt-4 shadow-lg shadow-blue-500/20">
                    <Text className="font-bold text-white uppercase tracking-wide">Upgrade to Unlock</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- MODALS --- */}

      {/* PELVIC MODAL */}
      <Modal visible={activeModal === 'PELVIC'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-black p-6">
          <View className="items-center mt-10 mb-10">
            <Text className="text-blue-500 font-black text-xs uppercase tracking-widest mb-2">Protocol Active</Text>
            <Text className="text-white font-black text-4xl text-center">Pelvic Power Protocol</Text>
          </View>

          <View className="flex-1 items-center justify-center">
            <View className={`w-64 h-64 rounded-full border-[8px] items-center justify-center ${kegelActive ? 'border-blue-500 bg-blue-900/20' : 'border-slate-800 bg-slate-900'}`}>
              <Text className="text-white text-7xl font-black font-variant-numeric-tabular">
                {Math.floor(kegelSeconds / 60)}:{(kegelSeconds % 60).toString().padStart(2, '0')}
              </Text>
              <Text className="text-slate-400 font-bold mt-4 uppercase tracking-widest">{sessionInstruction}</Text>
            </View>
          </View>

          <View className="gap-4" style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {!kegelActive ? (
              <TouchableOpacity onPress={() => setKegelActive(true)} className="bg-blue-600 py-5 rounded-2xl items-center shadow-lg shadow-blue-500/20">
                <Text className="text-white font-black text-lg uppercase tracking-wide">Start Protocol</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleFinishPelvic} className="bg-slate-800 border border-slate-700 py-5 rounded-2xl items-center">
                <Text className="text-white font-black text-lg uppercase tracking-wide">Finish & Log</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setActiveModal('NONE')} className="py-4 items-center">
              <Text className="text-slate-500 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* VITALITY MODAL */}
      <Modal visible={activeModal === 'VITALITY'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-black p-6">
          <Text className="text-white font-black text-2xl mb-8 mt-6">Daily Check-In</Text>
          <VitalitySlider label="Drive / Libido" value={drive} onChange={setDrive} icon="flame" />
          <VitalitySlider label="Recovery Status" value={recovery} onChange={setRecovery} icon="battery-charging" />
          <VitalitySlider label="Mental Focus" value={focus} onChange={setFocus} icon="eye" />

          {/* Sync Status */}
          <View className="bg-purple-900/20 p-4 rounded-2xl mb-6 flex-row items-center gap-3 border border-purple-500/20">
            <Ionicons name="sync" size={20} color="#a855f7" />
            <View>
              <Text className="text-purple-400 font-bold">Mood Synced from Wellness</Text>
              <Text className="text-purple-300 text-xs">Current: {wellnessLog?.moodEmoji || '-'}</Text>
            </View>
          </View>


          <TouchableOpacity onPress={handleLogVitality} className="bg-emerald-600 py-5 rounded-2xl items-center shadow-lg shadow-emerald-500/20 mt-8">
            <Text className="text-white font-black text-lg uppercase tracking-wide">Save Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('NONE')} className="py-4 items-center mt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            <Text className="text-slate-500 font-bold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* SUPPS MODAL */}
      <Modal visible={activeModal === 'SUPPS'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-black p-6">
          <View className="flex-row justify-between items-center mt-6 mb-8">
            <Text className="text-white font-black text-2xl">Stack Tracker</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-400 text-xs font-bold uppercase">Enhanced Mode</Text>
              <Switch value={enhancedMode} onValueChange={setEnhancedMode} trackColor={{ false: '#334155', true: '#ef4444' }} thumbColor="#fff" />
            </View>
          </View>

          <ScrollView className="flex-1">
            {activeStack.map((item: any, idx: number) => (
              <View
                key={idx}
                className="flex-row items-center justify-between p-5 rounded-2xl mb-3 border bg-slate-900 border-slate-800"
              >
                <View>
                  <Text className="font-bold text-lg text-white">{item.name}</Text>
                  <Text className="text-slate-500 text-xs">{item.reason}</Text>
                </View>
                <Ionicons name="checkmark-circle-outline" size={24} color="#64748b" />
              </View>
            ))}

            <View className="mt-6">
              <Text className="text-slate-400 font-bold mb-2 uppercase text-xs">Notes / Side Effects</Text>
              <TextInput
                className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 min-h-[100px]"
                multiline
                placeholder="Log any effects..."
                placeholderTextColor="#64748b"
                value={suppNote}
                onChangeText={setSuppNote}
              />
            </View>
          </ScrollView>

          <TouchableOpacity onPress={handleLogSupps} className="bg-purple-600 py-5 rounded-2xl items-center shadow-lg shadow-purple-500/20 mt-4">
            <Text className="text-white font-black text-lg uppercase tracking-wide">Log Stack</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('NONE')} className="py-4 items-center" style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            <Text className="text-slate-500 font-bold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
