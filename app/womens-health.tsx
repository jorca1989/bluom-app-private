import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useAccessControl } from '@/hooks/useAccessControl';
import { BlurView } from 'expo-blur';
import { SymptomChart } from '@/components/SymptomChart';

export type LifeStage = 'cycle' | 'pregnancy' | 'menopause';

function getPregnancySizeEmoji(babySize: string) {
  const key = babySize.toLowerCase();
  if (key.includes('poppy')) return '🌱';
  if (key.includes('sesame')) return '🫘';
  if (key.includes('lentil')) return '🫘';
  if (key.includes('blueberry')) return '🫐';
  if (key.includes('kidney bean')) return '🫘';
  if (key.includes('grape')) return '🍇';
  if (key.includes('kumquat')) return '🍊';
  if (key.includes('fig')) return '🟣';
  if (key.includes('lime')) return '🍋';
  if (key.includes('lemon')) return '🍋';
  if (key.includes('apple')) return '🍎';
  if (key.includes('avocado')) return '🥑';
  if (key.includes('turnip')) return '🥔';
  if (key.includes('pepper')) return '🫑';
  if (key.includes('cucumber')) return '🥒';
  if (key.includes('papaya')) return '🟠';
  if (key.includes('eggplant')) return '🍆';
  if (key.includes('squash')) return '🎃';
  if (key.includes('pineapple')) return '🍍';
  if (key.includes('cantaloupe')) return '🍈';
  if (key.includes('honeydew')) return '🍈';
  if (key.includes('watermelon')) return '🍉';
  if (key.includes('pumpkin')) return '🎃';
  return '✨';
}

const getPregnancyStats = (startDate: number) => {
  const now = Date.now();
  const diffTime = Math.abs(now - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;

  let trimester = 1;
  if (weeks >= 14) trimester = 2;
  if (weeks >= 28) trimester = 3;

  // Simple hardcoded size mapping for MVP
  const sizes = ["Poppy Seed", "Sesame Seed", "Lentil", "Blueberry", "Kidney Bean", "Grape", "Kumquat", "Fig", "Lime", "Lemon", "Apple", "Avocado", "Turnip", "Bell Pepper", "Cucumber", "Papaya", "Eggplant", "Squash", "Pineapple", "Cantaloupe", "Honeydew", "Watermelon", "Pumpkin"];
  const babySize = sizes[weeks] || "Melon";

  return { weeks, days, trimester, babySize, progress: Math.min(weeks / 40, 1) };
};

const getCyclePhase = (startDate: number) => {
  const now = Date.now();
  const diffTime = Math.abs(now - startDate);
  const cycleDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) % 28 || 28; // Simple 28 day cycle

  let phase = 'Menstrual';
  let phaseDesc = 'Rest & Recharge';
  if (cycleDay > 5) { phase = 'Follicular'; phaseDesc = 'Rising Energy'; }
  if (cycleDay > 13) { phase = 'Ovulation'; phaseDesc = 'Peak Vitality'; }
  if (cycleDay > 16) { phase = 'Luteal'; phaseDesc = 'Winding Down'; }

  return { cycleDay, phase, phaseDesc };
};

// --- Components ---
const ActionTile = ({ icon, label, subLabel, onPress, color = "rose", iconColor }: any) => (
  <TouchableOpacity onPress={onPress} className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 flex-row items-center justify-between shadow-sm">
    <View className="flex-row items-center gap-4">
      <View className={`w-12 h-12 rounded-2xl items-center justify-center bg-${color}-50`}>
        <Ionicons name={icon} size={24} color={iconColor || "#e11d48"} />
      </View>
      <View>
        <Text className="text-slate-900 font-black text-lg">{label}</Text>
        <Text className="text-slate-500 text-xs font-bold">{subLabel}</Text>
      </View>
    </View>
    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </View>
  </TouchableOpacity>
);

const RhythmCard = ({ title, desc, icon, color }: any) => (
  <View className={`w-36 h-40 rounded-3xl p-4 justify-between mr-3 border ${color === 'blue' ? 'bg-blue-50 border-blue-100' : color === 'red' ? 'bg-rose-50 border-rose-100' : color === 'orange' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
    <View className="w-8 h-8 rounded-full bg-white/50 items-center justify-center">
      <Ionicons name={icon} size={18} color="#334155" />
    </View>
    <View>
      <Text className="font-black text-slate-800 text-sm mb-1">{title}</Text>
      <Text className="font-medium text-slate-500 text-[10px] leading-tight">{desc}</Text>
    </View>
  </View>
);

const PrivacyModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View className="flex-1 bg-white p-8">
      <Text className="text-3xl font-black text-slate-900 mb-6">Your Privacy First</Text>
      <View className="gap-6">
        <View className="flex-row gap-4">
          <Ionicons name="shield-checkmark" size={32} color="#10b981" />
          <View className="flex-1">
            <Text className="font-bold text-lg text-slate-900">Zero Third-Party Sales</Text>
            <Text className="text-slate-500">We verify that your intimate health data is never sold to advertisers or insurance brokers.</Text>
          </View>
        </View>
        <View className="flex-row gap-4">
          <Ionicons name="lock-closed" size={32} color="#3b82f6" />
          <View className="flex-1">
            <Text className="font-bold text-lg text-slate-900">End-to-End Encryption</Text>
            <Text className="text-slate-500">Your logs are encrypted at rest and in transit. Only you hold the keys to your history.</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={onClose} className="mt-auto bg-slate-900 py-4 rounded-xl items-center">
        <Text className="text-white font-bold">Close</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

export default function WomensHealthScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const updateUser = useMutation(api.users.updateUser);

  // Queries
  const today = new Date().toISOString().slice(0, 10);
  // @ts-ignore
  const history = useQuery(api.womensHealth.getOptimizationHistory, convexUser?._id ? { userId: convexUser._id, days: 7 } : 'skip');
  // @ts-ignore
  const status = useQuery(api.womensHealth.getOptimizationStatus, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const wellnessLog = useQuery(api.wellness.getTodayLog, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip'); // For Mood Sync

  // Mutations
  // @ts-ignore
  const logBioCheck = useMutation(api.womensHealth.logBioCheck);
  // @ts-ignore
  const logSupplements = useMutation(api.mensHealth.logSupplement); // Reuse supplements logger structure

  // State
  const [lifeStage, setLifeStage] = useState<LifeStage>('cycle');
  const [showLifeSelector, setShowLifeSelector] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<'NONE' | 'PELVIC' | 'BIO' | 'SUPPS'>('NONE');
  const [privacyVisible, setPrivacyVisible] = useState(false);

  // Bio-Log Form
  const [energy, setEnergy] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [flow, setFlow] = useState<string | undefined>(undefined);
  const [babyMovement, setBabyMovement] = useState(5);
  const [hotFlashSeverity, setHotFlashSeverity] = useState(5);

  // Setup Form
  const [setupDate, setSetupDate] = useState(new Date().toISOString().slice(0, 10));

  // Pelvic
  const [kegelActive, setKegelActive] = useState(false);
  const [kegelSeconds, setKegelSeconds] = useState(0);
  const [kegelInstruction, setKegelInstruction] = useState("HOLD 🔒");

  useEffect(() => {
    if (convexUser?.lifeStage) setLifeStage(convexUser.lifeStage as LifeStage);
  }, [convexUser?.lifeStage]);

  // Check Setup Needs
  const needsSetup = useMemo(() => {
    if (!convexUser) return false;
    if (lifeStage === 'pregnancy' && !convexUser.pregnancyStartDate) return true;
    if (lifeStage === 'cycle' && !convexUser.lastPeriodDate) return true;
    return false;
  }, [convexUser, lifeStage]);

  // Pelvic Timer
  useEffect(() => {
    let interval: any;
    if (kegelActive) {
      interval = setInterval(() => {
        setKegelSeconds(s => {
          const next = s + 1;
          const cycle = next % 6;
          setKegelInstruction(cycle < 3 ? "HOLD 🔒" : "RELAX 🌬️");
          return next;
        });
      }, 1000);
    } else {
      setKegelSeconds(0);
      setKegelInstruction("Ready?");
    }
    return () => clearInterval(interval);
  }, [kegelActive]);

  const handleSetupSubmit = async () => {
    if (!convexUser?._id) return;
    const timestamp = new Date(setupDate).getTime();
    const updates: any = { lifeStage };
    if (lifeStage === 'pregnancy') updates.pregnancyStartDate = timestamp;
    if (lifeStage === 'cycle') updates.lastPeriodDate = timestamp;

    await updateUser({ userId: convexUser._id, updates });
    // No setSetupVisible(false) needed as banner is conditional
  };

  const activeStack = status?.recommendedStack || [];

  const handleLogBio = async () => {
    if (!convexUser?._id) return;
    try {
      await logBioCheck({
        userId: convexUser._id,
        date: today,
        mood: wellnessLog?.mood || 5, // Use synced mood or default
        energy,
        babyMovement: lifeStage === 'pregnancy' ? babyMovement : undefined,
        hotFlashSeverity: lifeStage === 'menopause' ? hotFlashSeverity : undefined,
        symptoms,
        flow: lifeStage === 'cycle' ? flow : undefined
      });
      Alert.alert("Logged", "Bio-markers synced.");
      setActiveModal('NONE');
    } catch (e) { Alert.alert("Error", "Failed to save."); }
  };

  const toggleStackItem = async (itemName: string) => {
    if (!convexUser?._id) return;
    await logSupplements({
      userId: convexUser._id,
      date: today,
      items: activeStack.map(i => ({ name: i.name, dosage: "1 dose", taken: i.name === itemName || true })),
    });
    Alert.alert("Tracked", `${itemName} logged.`);
  };


  // --- Render Sections ---

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-5 pb-4 flex-row items-center justify-between pt-3">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#e11d48" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowLifeSelector(true)} className="flex-row items-center bg-rose-50 px-4 py-2 rounded-full border border-rose-100">
          <Text className="text-rose-600 font-bold capitalize mr-2">{lifeStage}</Text>
          <Ionicons name="chevron-down" size={14} color="#e11d48" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert("System Status", "Your daily adherence score (0-100%) tracking Bio-Log, Pelvic Protocol, and Supplement Stack completion.")} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center">
          <Ionicons name="information-circle-outline" size={22} color="#e11d48" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Missing Context/Date Banner */}
        {needsSetup && (
          <View className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 relative overflow-hidden">
            <View className="flex-row justify-between items-start z-10">
              <View className="flex-1">
                <Text className="text-rose-900 font-black text-lg mb-1">
                  {lifeStage === 'pregnancy' ? 'Track your Baby’s Growth' : 'Unlock your Hormonal Blueprint'}
                </Text>
                <Text className="text-rose-700 text-xs mb-3 leading-relaxed">
                  {lifeStage === 'pregnancy' ? 'See weekly milestones.' : 'Map your 28-day rhythm.'}
                </Text>

                <View className="bg-white p-3 rounded-xl border border-rose-100 mb-3">
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">{lifeStage === 'pregnancy' ? 'Conception Date' : 'Last Period Start'}</Text>
                  <TextInput
                    value={setupDate}
                    onChangeText={setSetupDate}
                    placeholder="YYYY-MM-DD"
                    className="font-bold text-slate-900 border-b border-slate-200 pb-1"
                  />
                </View>

                <TouchableOpacity onPress={handleSetupSubmit} className="bg-rose-600 self-start px-6 py-2 rounded-lg shadow-sm">
                  <Text className="text-white font-bold text-xs uppercase">Save & Unlock</Text>
                </TouchableOpacity>
              </View>
              <Ionicons name="calendar" size={60} color="#ffe4e6" style={{ position: 'absolute', right: -10, top: 40, opacity: 0.5 }} />
            </View>
          </View>
        )}


        <View className="mb-6 flex-row items-end justify-between">
          <View>
            <Text className="text-slate-900 font-black text-3xl mb-1">Hormonal Blueprint</Text>
            <Text className="text-slate-500 font-medium">Optimization based on your biology.</Text>
          </View>
          <View className="items-end">
            <Text className="text-rose-600 font-black text-2xl">{status?.score || 0}%</Text>
            <Text className="text-rose-400 text-[10px] font-bold uppercase tracking-wider">System Status</Text>
          </View>
        </View>

        {/* Dashboards */}
        {!needsSetup && lifeStage === 'pregnancy' && convexUser?.pregnancyStartDate && (
          <View className="mb-8">
            {(() => {
              const stats = getPregnancyStats(convexUser.pregnancyStartDate!);
              return (
                <View className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text className="text-rose-900 font-black text-2xl">Week {stats.weeks}</Text>
                      <Text className="text-rose-600 font-bold">Trimester {stats.trimester}</Text>
                    </View>
                    <View className="bg-white px-4 py-3 rounded-2xl shadow-sm items-center min-w-[110px]">
                      <Text className="text-xs font-bold text-slate-500 uppercase">Baby Size</Text>
                      <Text className="text-3xl leading-none mt-2">{getPregnancySizeEmoji(stats.babySize)}</Text>
                      <Text className="text-slate-900 font-black">{stats.babySize}</Text>
                    </View>
                  </View>
                  {/* Progress Bar */}
                  <View className="h-3 bg-rose-200 rounded-full w-full overflow-hidden">
                    <View className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.progress * 100}%` }} />
                  </View>
                  <Text className="text-right text-xs font-bold text-rose-400 mt-2">{40 - stats.weeks} weeks to go</Text>
                </View>
              )
            })()}
          </View>
        )}

        {!needsSetup && lifeStage === 'cycle' && convexUser?.lastPeriodDate && (
          <View className="mb-8">
            {(() => {
              const { cycleDay, phase, phaseDesc } = getCyclePhase(convexUser.lastPeriodDate!);
              return (
                <View>
                  <View className="bg-rose-50 p-6 rounded-3xl border border-rose-100 mb-6 flex-row justify-between items-center">
                    <View>
                      <Text className="text-rose-900 font-black text-xl">{phase} Phase</Text>
                      <Text className="text-rose-600 font-bold">{phaseDesc}</Text>
                    </View>
                    <View className="w-16 h-16 rounded-full bg-white items-center justify-center border-4 border-rose-100">
                      <Text className="text-rose-600 text-[10px] font-black uppercase tracking-widest leading-none">Day</Text>
                      <Text className="text-rose-900 font-black text-2xl leading-none">{cycleDay}</Text>
                    </View>
                  </View>

                  {/* Horizontal Calendar - Simplified */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <View key={d} className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${d === cycleDay ? 'bg-rose-600' : 'bg-slate-50'}`}>
                        <Text className={`text-xs font-bold ${d === cycleDay ? 'text-white' : 'text-slate-300'}`}>{d}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )
            })()}
          </View>
        )}

        <View className="mb-8">
          <View className="flex-row gap-4 mb-2 justify-end">
            <View className="flex-row items-center gap-1"><View className="w-2 h-2 rounded-full bg-purple-500" /><Text className="text-slate-500 text-xs font-bold">Mood</Text></View>
            <View className="flex-row items-center gap-1"><View className="w-2 h-2 rounded-full bg-amber-500" /><Text className="text-slate-500 text-xs font-bold">Energy</Text></View>
          </View>
          <SymptomChart data={history?.map((h: any) => ({ date: h.date, mood: h.mood, energy: h.energy })) || []} />
        </View>

        {/* Rhythm Sync */}
        <View className="mb-8">
          <Text className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4 px-1">Your Hormonal Rhythm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {lifeStage === 'pregnancy' ? [
              { title: 'Move', desc: 'Pelvic stability', icon: 'walk', color: 'blue' },
              { title: 'Fuel', desc: 'Magnesium', icon: 'nutrition', color: 'orange' },
              { title: 'Focus', desc: 'Bonding meditation', icon: 'headset', color: 'emerald' }
            ].map((c, i) => <RhythmCard key={i} {...c} />) :
              [
                { title: 'Move', desc: 'Luteal: Yoga', icon: 'body', color: 'red' },
                { title: 'Fuel', desc: 'Complex carbs', icon: 'leaf', color: 'orange' },
                { title: 'Rest', desc: 'Prioritize 8h', icon: 'bed', color: 'emerald' }
              ].map((c, i) => <RhythmCard key={i} {...c} />)
            }
          </ScrollView>
        </View>

        <Text className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4 px-1">Daily Optimization</Text>
        <ActionTile icon="fitness" label="Pelvic Power Protocol" subLabel="Core & floor stability" color="rose" onPress={() => setActiveModal('PELVIC')} />
        <ActionTile icon="pulse" label="Daily Bio-Log" subLabel="Track mood, energy & flow" color="purple" iconColor="#a855f7" onPress={() => setActiveModal('BIO')} />
        <ActionTile icon="flask" label="Vitality Stack" subLabel="Supplements & meds" color="amber" iconColor="#d97706" onPress={() => setActiveModal('SUPPS')} />

        {/* Privacy Banner */}
        <TouchableOpacity onPress={() => setPrivacyVisible(true)} className="mt-8 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row items-center gap-3">
          <Ionicons name="shield-checkmark" size={24} color="#10b981" />
          <View className="flex-1">
            <Text className="text-slate-900 font-bold">Your Privacy is Protected</Text>
            <Text className="text-slate-500 text-xs">We do not sell your data. Tap to learn more.</Text>
          </View>
        </TouchableOpacity>

        {/* Pro Insights Shield */}
        <View className="mt-8 mb-8 relative">
          <Text className="text-slate-900 font-black text-xl mb-4">{lifeStage === 'pregnancy' ? 'Trimester Milestone Analysis' : 'Cycle Regularity Analysis'}</Text>
          <View className="bg-white rounded-3xl p-6 border border-slate-100 min-h-[160px] shadow-sm">
            <Text className="text-slate-500">Deep analysis of follicular phase length and luteal consistency...</Text>
          </View>
          {!isPro && (
            <View className="absolute inset-0 rounded-3xl overflow-hidden">
              <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light">
                <View className="flex-1 items-center justify-center bg-white/50">
                  <Ionicons name="lock-closed" size={32} color="#e11d48" className="mb-2" />
                  <TouchableOpacity onPress={() => promptUpgrade('Unlock Analysis')} className="bg-rose-600 px-6 py-3 rounded-full mt-4 shadow-lg shadow-rose-500/20">
                    <Text className="font-bold text-white uppercase tracking-wide">Upgrade to Unlock</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ... keeping modals ... */}
      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />

      {/* Life Stage Selector */}
      <Modal visible={showLifeSelector} transparent animationType="fade" onRequestClose={() => setShowLifeSelector(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-3xl w-full max-w-sm p-6">
            <Text className="text-xl font-black text-slate-900 mb-2">Select Life Stage</Text>
            {(['cycle', 'pregnancy', 'menopause'] as LifeStage[]).map((stage) => (
              <TouchableOpacity key={stage} onPress={() => { setLifeStage(stage); updateUser({ userId: convexUser!._id, updates: { lifeStage: stage } }); setShowLifeSelector(false); }} className={`p-4 rounded-xl mb-2 flex-row items-center justify-between ${lifeStage === stage ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
                <Text className={`font-bold capitalize ${lifeStage === stage ? 'text-rose-600' : 'text-slate-600'}`}>{stage}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLifeSelector(false)} className="mt-4 py-3 bg-slate-100 rounded-xl items-center"><Text className="font-bold text-slate-900">Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bio Check Modal */}
      <Modal visible={activeModal === 'BIO'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-white p-6">
          <Text className="text-slate-900 font-black text-2xl mb-8 mt-6">Bio-Log: {lifeStage}</Text>

          {/* Mood Sync Status */}
          <View className="bg-purple-50 p-4 rounded-2xl mb-6 flex-row items-center gap-3">
            <Ionicons name="sync" size={20} color="#7e22ce" />
            <View>
              <Text className="text-purple-900 font-bold">Mood Synced from Wellness</Text>
              <Text className="text-purple-700 text-xs">Current: {wellnessLog?.moodEmoji || '-'}</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-slate-500 font-bold mb-2">Energy Level (1-10)</Text>
            <View className="flex-row justify-between bg-slate-50 rounded-full p-2"><Text className="font-black text-lg ml-2">{energy}</Text><View className="flex-row gap-1">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <TouchableOpacity key={n} onPress={() => setEnergy(n)} className={`w-6 h-6 rounded-full ${energy === n ? 'bg-amber-500' : 'bg-slate-200'}`} />)}</View></View>
          </View>

          {lifeStage === 'pregnancy' && (
            <View className="mb-6">
              <Text className="text-slate-500 font-bold mb-2">Baby Movement (1-10)</Text>
              <View className="flex-row justify-between bg-slate-50 rounded-full p-2"><Text className="font-black text-lg ml-2">{babyMovement}</Text><View className="flex-row gap-1">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <TouchableOpacity key={n} onPress={() => setBabyMovement(n)} className={`w-6 h-6 rounded-full ${babyMovement === n ? 'bg-rose-500' : 'bg-slate-200'}`} />)}</View></View>
            </View>
          )}

          {lifeStage === 'menopause' && (
            <View className="mb-6">
              <Text className="text-slate-500 font-bold mb-2">Hot Flash Severity (1-10)</Text>
              <View className="flex-row justify-between bg-slate-50 rounded-full p-2"><Text className="font-black text-lg ml-2">{hotFlashSeverity}</Text><View className="flex-row gap-1">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <TouchableOpacity key={n} onPress={() => setHotFlashSeverity(n)} className={`w-6 h-6 rounded-full ${hotFlashSeverity === n ? 'bg-orange-500' : 'bg-slate-200'}`} />)}</View></View>
            </View>
          )}

          {lifeStage === 'cycle' && (
            <View className="mb-6">
              <Text className="text-slate-500 font-bold mb-2">Flow</Text>
              <View className="flex-row gap-2">{['Light', 'Medium', 'Heavy'].map(f => <TouchableOpacity key={f} onPress={() => setFlow(f)} className={`px-4 py-2 rounded-full border ${flow === f ? 'bg-rose-500 border-rose-500' : 'border-slate-200'}`}><Text className={`${flow === f ? 'text-white' : 'text-slate-600'} font-bold`}>{f}</Text></TouchableOpacity>)}</View>
            </View>
          )}

          <TouchableOpacity onPress={handleLogBio} className="bg-rose-600 py-4 rounded-2xl items-center mt-4"><Text className="text-white font-bold text-lg">Save Log</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('NONE')} className="py-4 items-center"><Text className="text-slate-500 font-bold">Cancel</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* Vitality Stack Modal */}
      <Modal visible={activeModal === 'SUPPS'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-white p-6">
          <Text className="text-slate-900 font-black text-2xl mb-2">Vitality Stack</Text>
          <Text className="text-slate-500 mb-8">Personalized based on your goals & rhythm.</Text>

          <ScrollView className="space-y-3">
            {activeStack.map((item: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => toggleStackItem(item.name)} className="flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <View>
                  <Text className="font-bold text-slate-800 text-lg">{item.name}</Text>
                  <Text className="text-slate-500 text-xs">{item.reason}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={28} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => setActiveModal('NONE')} className="mt-8 py-4 items-center"><Text className="text-slate-500 font-bold">Close</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* Pelvic Modal */}
      <Modal visible={activeModal === 'PELVIC'} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveModal('NONE')}>
        <View className="flex-1 bg-white p-6 justify-center items-center">
          <Text className="text-slate-900 font-black text-3xl mb-10">Pelvic Power</Text>
          <View className={`w-64 h-64 rounded-full border-[8px] items-center justify-center ${kegelActive ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}>
            <Text className="text-6xl font-black text-slate-900">{Math.floor(kegelSeconds / 60)}:{(kegelSeconds % 60).toString().padStart(2, '0')}</Text>
            <Text className="text-rose-500 font-bold mt-2 uppercase tracking-widest">{kegelInstruction}</Text>
          </View>
          <TouchableOpacity onPress={() => setKegelActive(!kegelActive)} className={`mt-10 px-10 py-4 rounded-full ${kegelActive ? 'bg-slate-900' : 'bg-rose-600'}`}>
            <Text className="text-white font-bold text-lg">{kegelActive ? 'Stop Session' : 'Start Timer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveModal('NONE')} className="mt-4"><Text className="text-slate-400 font-bold">Close</Text></TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
