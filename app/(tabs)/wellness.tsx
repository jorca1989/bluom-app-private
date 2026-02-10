import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Dimensions, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// ... imports

import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import PanicButton from '../../components/PanicButton';
import MeditationHub from '../../components/MeditationHub';
import GamesHub from '../../components/GamesHub';
import MindWorldScreen from '../../components/mindworld/MindWorldScreen';
import LifeGoalsHub from '../../components/LifeGoalsHub';
import UniversityHub from '../../components/UniversityHub';
import { triggerSound, SoundEffect } from '../../utils/soundEffects';
import { getBottomContentPadding } from '../../utils/layout';

const { width } = Dimensions.get('window');
const UNLOCK_ALL_INSIGHTS = true;

export default function WellnessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

  const today = new Date().toISOString().split('T')[0];
  const last7Days = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Queries
  const habits = useQuery(api.habits.getUserHabitsForDate, user ? { userId: user._id, date: today } : "skip");
  const sleepLogs = useQuery(api.wellness.getSleepLogs, user ? { userId: user._id, startDate: last7Days[0], endDate: today } : "skip");
  const moodLogs = useQuery(api.wellness.getMoodLogs, user ? { userId: user._id, startDate: last7Days[0], endDate: today } : "skip");
  const insights = useQuery(api.aimind.getWellnessInsights, user ? { userId: user._id } : "skip");
  const meditationLogs = useQuery(api.wellness.getMeditationLogs, user ? { userId: user._id, limit: 50 } : "skip");

  const logSleep = useMutation(api.wellness.logSleep);
  const logMood = useMutation(api.wellness.logMood);

  // Local UI State
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showMeditationHub, setShowMeditationHub] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);
  const [showMindWorld, setShowMindWorld] = useState(false);
  const [showLifeGoals, setShowLifeGoals] = useState(params.showLifeGoals === 'true');
  const [showUniversity, setShowUniversity] = useState(false);
  const [sleepInput, setSleepInput] = useState('');

  const moods = [
    { label: 'Excellent', value: 5, color: '#16a34a', icon: 'happy' },
    { label: 'Good', value: 4, color: '#3b82f6', icon: 'happy-outline' },
    { label: 'Okay', value: 3, color: '#eab308', icon: 'remove-circle-outline' },
    { label: 'Low', value: 2, color: '#f97316', icon: 'sad-outline' },
    { label: 'Poor', value: 1, color: '#dc2626', icon: 'sad' },
  ];

  // Logic for Summary Cards
  const todaySleep = useMemo(() => sleepLogs?.find(l => l.date === today), [sleepLogs, today]);
  const todayMood = useMemo(() => moodLogs?.find(l => l.date === today), [moodLogs, today]);
  const completedHabitsCount = useMemo(() => habits?.filter(h => h.completedToday).length || 0, [habits]);
  const totalHabitsCount = habits?.length || 0;
  const moodConfig = useMemo(() => todayMood ? moods.find(m => m.value === todayMood.mood) : null, [todayMood]);

  // Analytics Calculations for Modal
  const sleepAvg = useMemo(() => {
    const valid = sleepLogs?.filter(l => l.hours > 0) || [];
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((acc, curr) => acc + curr.hours, 0) / valid.length) * 10) / 10;
  }, [sleepLogs]);

  const meditationMinutes7d = useMemo(() => {
    if (!meditationLogs) return 0;
    const weekSet = new Set(last7Days);
    return meditationLogs.filter(l => weekSet.has(l.date)).reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  }, [meditationLogs, last7Days]);

  const isPremiumActive = useMemo(() => UNLOCK_ALL_INSIGHTS || !!user?.isPremium, [user]);

  const handleLogSleep = async () => {
    if (!user || !sleepInput) return;
    await logSleep({ userId: user._id, hours: parseFloat(sleepInput), quality: 80, date: today });
    setSleepInput('');
    setShowSleepModal(false);
    triggerSound(SoundEffect.WELLNESS_LOG);
  };

  const handleLogMood = async (val: number) => {
    if (!user) return;
    await logMood({ userId: user._id, mood: val as any, date: today });
    setShowMoodModal(false);
    triggerSound(SoundEffect.WELLNESS_LOG);
  };

  if (!user) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View><Text style={styles.title}>Wellness</Text><Text style={styles.subtitle}>Daily Health Tracking</Text></View>
          <TouchableOpacity style={styles.plusButton} onPress={() => setShowDropdown(!showDropdown)}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
        </View>

        {showDropdown && (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowDropdown(false); setShowSleepModal(true); }}><Ionicons name="moon" size={20} color="#8b5cf6" /><Text style={styles.menuText}>Log Sleep</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowDropdown(false); setShowMoodModal(true); }}><Ionicons name="happy" size={20} color="#eab308" /><Text style={styles.menuText}>Log Mood</Text></TouchableOpacity>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.sumCard}>
            <Text style={styles.sumLabel}>Sleep</Text>
            <Text style={styles.sumValue}>{todaySleep ? `${todaySleep.hours}h` : '--'}</Text>
            <Text style={styles.sumSub}>Last night</Text>
          </View>
          <View style={styles.sumCard}>
            <Text style={styles.sumLabel}>Mood</Text>
            <Text style={[styles.sumValue, { color: moodConfig?.color || '#1e293b' }]}>{moodConfig ? moodConfig.label : '--'}</Text>
            <Text style={styles.sumSub}>Today</Text>
          </View>
          <View style={styles.sumCard}>
            <Text style={styles.sumLabel}>Habits</Text>
            <Text style={styles.sumValue}>{completedHabitsCount}</Text>
            <Text style={styles.sumSub}>Done</Text>
          </View>
        </View>

        {/* Hub Grid */}
        <View style={styles.hubGrid}>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#6366f1' }]} onPress={() => { triggerSound(SoundEffect.UI_TAP); setShowMeditationHub(true); }}><Ionicons name="leaf" size={24} color="#fff" /><Text style={styles.hubText}>Meditate</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#db2777' }]} onPress={() => router.push('/reflections-hub' as any)}><Ionicons name="journal" size={24} color="#fff" /><Text style={styles.hubText}>Reflections</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#a855f7' }]} onPress={() => { triggerSound(SoundEffect.UI_TAP); setShowGamesHub(true); }}><Ionicons name="game-controller" size={24} color="#fff" /><Text style={styles.hubText}>Games</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#16a34a' }]} onPress={() => router.push('/habit-hub' as any)}><Ionicons name="locate" size={24} color="#fff" /><Text style={styles.hubText}>Habits</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#14b8a6' }]} onPress={() => setShowInsightsModal(true)}><Ionicons name="stats-chart" size={24} color="#fff" /><Text style={styles.hubText}>Insights</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#4CAF50' }]} onPress={() => setShowMindWorld(true)}><Ionicons name="planet" size={24} color="#fff" /><Text style={styles.hubText}>Mind World</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#f59e0b' }]} onPress={() => setShowLifeGoals(true)}><Ionicons name="flag" size={24} color="#fff" /><Text style={styles.hubText}>Life Goals</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.hubCard, { backgroundColor: '#3b82f6' }]} onPress={() => setShowUniversity(true)}><Ionicons name="school" size={24} color="#fff" /><Text style={styles.hubText}>University</Text></TouchableOpacity>
        </View>
      </ScrollView>

      {/* INSIGHTS MODAL */}
      <Modal visible={showInsightsModal} animationType="slide">
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wellness Analytics</Text>
            <TouchableOpacity onPress={() => setShowInsightsModal(false)}><Ionicons name="close" size={28} color="#1e293b" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Habit Completion</Text>
              <Text style={styles.metricValue}>{totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0}%</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>7-Day Sleep Avg</Text>
              <Text style={styles.metricValue}>{sleepAvg}h</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Meditation (Week)</Text>
              <Text style={styles.metricValue}>{meditationMinutes7d}m</Text>
            </View>
            <View style={[styles.metricItem, !isPremiumActive && { opacity: 0.5 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.metricTitle}>Mood Stability</Text>
                {!isPremiumActive && <Ionicons name="lock-closed" size={14} style={{ marginLeft: 8 }} />}
              </View>
              <Text style={styles.metricValue}>Stable</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Other Modals (Sleep, Mood, Hubs) */}
      <Modal visible={showSleepModal} animationType="slide">
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Sleep Log</Text><TouchableOpacity onPress={() => setShowSleepModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity></View>
          <TextInput style={styles.input} placeholder="Hours slept (e.g. 8)" keyboardType="numeric" value={sleepInput} onChangeText={setSleepInput} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleLogSleep}><Text style={styles.btnText}>Save Log</Text></TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={showMoodModal} animationType="slide">
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Mood Log</Text><TouchableOpacity onPress={() => setShowMoodModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity></View>
          <View style={{ gap: 10 }}>
            {moods.map((m) => (
              <TouchableOpacity key={m.value} style={styles.moodItem} onPress={() => handleLogMood(m.value)}>
                <Ionicons name={m.icon as any} size={28} color={m.color} />
                <Text style={styles.moodText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {showMeditationHub && <MeditationHub userId={user._id} onClose={() => setShowMeditationHub(false)} />}
      {showGamesHub && <GamesHub userId={user._id} onClose={() => setShowGamesHub(false)} />}
      {showMindWorld && <MindWorldScreen visible={true} onClose={() => setShowMindWorld(false)} />}
      {showLifeGoals && <LifeGoalsHub userId={user._id} onClose={() => setShowLifeGoals(false)} />}
      {showUniversity && <UniversityHub onClose={() => setShowUniversity(false)} />}
      <PanicButton userId={user._id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf2fe' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  plusButton: { backgroundColor: '#3b82f6', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  menu: { backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 16, padding: 8, elevation: 5, marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 20 },
  sumCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 16, alignItems: 'center', elevation: 1 },
  sumLabel: { fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
  sumValue: { fontSize: 16, fontWeight: 'bold', fontStyle: 'italic', color: '#1e293b' },
  sumSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24 },
  hubCard: { width: (width - 60) / 2, padding: 20, borderRadius: 16, alignItems: 'center', gap: 8 },
  hubText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardText: { color: '#64748b', fontSize: 14 },
  modalContent: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  metricItem: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTitle: { fontSize: 16, fontWeight: '600', color: '#475569' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, fontSize: 18, marginBottom: 20 },
  saveBtn: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  moodItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 15, backgroundColor: '#f8fafc', borderRadius: 12 },
  moodText: { fontSize: 16, color: '#1e293b' }
});