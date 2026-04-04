import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import PanicButton from '../../components/PanicButton';
import MeditationHub from '../../components/MeditationHub';
import GamesHub from '../../components/GamesHub';
import LifeGoalsHub from '../../components/LifeGoalsHub';
import { triggerSound, SoundEffect } from '../../utils/soundEffects';
import { getBottomContentPadding, TAB_BAR_HEIGHT } from '../../utils/layout';

const { width } = Dimensions.get('window');

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon, iconBg, iconColor, label, value, sub,
}: {
  icon: string; iconBg: string; iconColor: string;
  label: string; value: string; sub: string;
}) {
  return (
    <View style={kpiStyles.card}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={kpiStyles.label} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      <Text style={kpiStyles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={kpiStyles.sub} numberOfLines={1} adjustsFontSizeToFit>{sub}</Text>
    </View>
  );
}
const kpiStyles = StyleSheet.create({
  card: {
    width: (width - 64) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  label: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  value: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  sub: { fontSize: 11, color: '#94a3b8' },
});

// ─── Quick Action Button ───────────────────────────────────────────────────────
function QuickActionBtn({
  icon, label, color, bg, onPress,
}: { icon: string; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[qaStyles.btn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[qaStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const qaStyles = StyleSheet.create({
  btn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 6, minWidth: 70,
  },
  label: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
});

// ─── Hub Card ─────────────────────────────────────────────────────────────────
function HubCard({
  icon, label, sub, gradient, onPress,
}: {
  icon: string; label: string; sub?: string;
  gradient: readonly [string, string]; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={hubStyles.wrap} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={hubStyles.card}
      >
        <View style={hubStyles.iconWrap}>
          <Ionicons name={icon as any} size={22} color="#fff" />
        </View>
        <Text style={hubStyles.label}>{label}</Text>
        {sub && <Text style={hubStyles.sub}>{sub}</Text>}
        <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.45)" style={hubStyles.arrow} />
      </LinearGradient>
    </TouchableOpacity>
  );
}
const hubStyles = StyleSheet.create({
  wrap: { width: (width - 60) / 2 },
  card: {
    borderRadius: 20, padding: 18, minHeight: 108,
    justifyContent: 'flex-end', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 7,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  label: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.1 },
  sub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  arrow: { position: 'absolute', top: 14, right: 14 },
});

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>
        {title}
      </Text>
      {sub && <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function WellnessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const user = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const today = new Date().toISOString().split('T')[0];
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  }), []);

  const habits = useQuery(api.habits.getUserHabitsForDate, user ? { userId: user._id, date: today } : 'skip');
  const sleepLogs = useQuery(api.wellness.getSleepLogs, user ? { userId: user._id, startDate: last7Days[0], endDate: today } : 'skip');
  const moodLogs = useQuery(api.wellness.getMoodLogs, user ? { userId: user._id, startDate: last7Days[0], endDate: today } : 'skip');
  const meditationLogs = useQuery(api.wellness.getMeditationLogs, user ? { userId: user._id, limit: 50 } : 'skip');

  const logSleep = useMutation(api.wellness.logSleep);
  const logMood = useMutation(api.wellness.logMood);

  // Modal state
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showMeditationHub, setShowMeditationHub] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);
  const [showLifeGoals, setShowLifeGoals] = useState(params.showLifeGoals === 'true');
  const [sleepInput, setSleepInput] = useState('');

  const MOODS = [
    { label: 'Excellent', value: 5, color: '#22c55e', emoji: '😄' },
    { label: 'Good', value: 4, color: '#3b82f6', emoji: '🙂' },
    { label: 'Okay', value: 3, color: '#eab308', emoji: '😐' },
    { label: 'Low', value: 2, color: '#f97316', emoji: '😟' },
    { label: 'Poor', value: 1, color: '#ef4444', emoji: '😢' },
  ];

  const todaySleep = useMemo(() => sleepLogs?.find(l => l.date === today), [sleepLogs, today]);
  const todayMood = useMemo(() => moodLogs?.find(l => l.date === today), [moodLogs, today]);
  const moodConfig = useMemo(() => todayMood ? MOODS.find(m => m.value === todayMood.mood) : null, [todayMood]);
  const completedHabits = useMemo(() => habits?.filter(h => h.completedToday).length ?? 0, [habits]);
  const totalHabits = habits?.length ?? 0;
  const isPro = !!user?.isPremium;

  const sleepAvg = useMemo(() => {
    const valid = sleepLogs?.filter(l => l.hours > 0) ?? [];
    if (!valid.length) return 0;
    return Math.round((valid.reduce((a, c) => a + c.hours, 0) / valid.length) * 10) / 10;
  }, [sleepLogs]);

  const meditationMins7d = useMemo(() => {
    if (!meditationLogs) return 0;
    const weekSet = new Set(last7Days);
    return meditationLogs
      .filter(l => weekSet.has(l.date))
      .reduce((a, c) => a + (c.durationMinutes ?? 0), 0);
  }, [meditationLogs, last7Days]);

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

  if (!user) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const bottomPad = getBottomContentPadding(insets.bottom, 16) + TAB_BAR_HEIGHT;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Wellness</Text>
            <Text style={s.subtitle}>Mental health & optimisation</Text>
          </View>
        </View>

        {/* ── KPI 2×2 Grid ── */}
        <View style={s.kpiGrid}>
          <KpiCard
            icon="moon" iconBg="#ede9fe" iconColor="#7c3aed"
            label="Sleep"
            value={todaySleep ? `${todaySleep.hours}h` : '--'}
            sub="Last night"
          />
          <KpiCard
            icon="happy"
            iconBg={moodConfig ? moodConfig.color + '25' : '#f1f5f9'}
            iconColor={moodConfig?.color ?? '#64748b'}
            label="Mood"
            value={moodConfig ? moodConfig.emoji : '--'}
            sub={moodConfig?.label ?? 'Not logged'}
          />
          <KpiCard
            icon="checkmark-circle" iconBg="#dcfce7" iconColor="#16a34a"
            label="Habits"
            value={`${completedHabits}/${totalHabits}`}
            sub="Done today"
          />
          <KpiCard
            icon="leaf" iconBg="#d1fae5" iconColor="#059669"
            label="Meditation"
            value={`${meditationMins7d}m`}
            sub="This week"
          />
        </View>

        {/* ── Quick Actions (replaces old + dropdown) ── */}
        <View style={s.section}>
          <SectionHeader title="Quick Log" sub="Track your daily wellness" />
          <View style={s.quickActions}>
            <QuickActionBtn
              icon="moon-outline" label="Sleep" color="#7c3aed" bg="#ede9fe"
              onPress={() => setShowSleepModal(true)}
            />
            <QuickActionBtn
              icon="happy-outline" label="Mood" color="#eab308" bg="#fef9c3"
              onPress={() => setShowMoodModal(true)}
            />
            <QuickActionBtn
              icon="stats-chart" label="Insights" color="#0891b2" bg="#cffafe"
              onPress={() => setShowInsightsModal(true)}
            />
            <QuickActionBtn
              icon="leaf-outline" label="Meditate" color="#059669" bg="#d1fae5"
              onPress={() => { triggerSound(SoundEffect.UI_TAP); setShowMeditationHub(true); }}
            />
          </View>
        </View>

        {/* ── AI Mental Health Plan Banner ── */}
        <View style={s.section}>
          <TouchableOpacity
            onPress={() => router.push('/mental-health-plan' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1e1b4b', '#312e81', '#4c1d95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.planBanner}
            >
              {/* Decorative blobs */}
              <View style={[s.blob, { top: -30, right: -20, width: 130, height: 130, backgroundColor: 'rgba(139,92,246,0.3)' }]} />
              <View style={[s.blob, { bottom: -20, left: 50, width: 80, height: 80, backgroundColor: 'rgba(99,102,241,0.2)' }]} />

              <View style={s.planBannerLeft}>
                <View style={s.planBannerBadge}>
                  <Text style={s.planBannerBadgeText}>
                    {isPro ? '✦ PRO · AI-Powered · Refreshes Monthly' : '30-Day Blueprint · Free'}
                  </Text>
                </View>
                <Text style={s.planBannerTitle}>
                  {isPro ? 'Your Personalised\nMental Blueprint' : 'Your Mental\nHealth Blueprint'}
                </Text>
                <Text style={s.planBannerSub}>
                  {isPro
                    ? 'AI plan tailored to your stress, sleep & goals — rotates every 30 days'
                    : 'A structured 30-day programme based on your onboarding. Upgrade for AI personalisation.'}
                </Text>

                <View style={s.planBannerCta}>
                  <Text style={s.planBannerCtaText}>View plan →</Text>
                </View>
              </View>

              <View style={s.planBannerRight}>
                <View style={s.planBannerIcon}>
                  <Ionicons name={isPro ? 'sparkles' : 'calendar'} size={28} color="#a78bfa" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Wellness Hubs Grid ── */}
        <View style={s.section}>
          <SectionHeader title="Wellness Hubs" sub="Your mental toolbox" />
          <View style={s.hubGrid}>
            <HubCard
              icon="journal" label="Reflections" sub="Journal & gratitude"
              gradient={['#db2777', '#9d174d']}
              onPress={() => router.push('/reflections-hub' as any)}
            />
            <HubCard
              icon="game-controller" label="Brain Games" sub="Sharpen your mind"
              gradient={['#7c3aed', '#5b21b6']}
              onPress={() => { triggerSound(SoundEffect.UI_TAP); setShowGamesHub(true); }}
            />
            <HubCard
              icon="locate" label="Habits" sub="Daily streaks"
              gradient={['#059669', '#065f46']}
              onPress={() => router.push('/habit-hub' as any)}
            />
            <HubCard
              icon="flag" label="Life Goals" sub="Dream & achieve"
              gradient={['#d97706', '#92400e']}
              onPress={() => setShowLifeGoals(true)}
            />
            <HubCard
              icon="library" label="Library" sub="Curated knowledge"
              gradient={['#2563eb', '#1e3a8a']}
              onPress={() => router.push('/library' as any)}
            />
          </View>
        </View>

        {/* ── 7-Day Mood Chart ── */}
        {moodLogs && moodLogs.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="7-Day Mood Trend" />
            <View style={s.moodChart}>
              {last7Days.map((date) => {
                const log = moodLogs.find(l => l.date === date);
                const mood = log?.mood ?? 0;
                const cfg = MOODS.find(m => m.value === mood);
                const dow = new Date(date + 'T12:00:00').getDay();
                const dayLabel = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'][dow];
                return (
                  <View key={date} style={s.moodBar}>
                    <View style={s.moodBarTrack}>
                      <View style={[s.moodBarFill, {
                        height: mood ? `${(mood / 5) * 100}%` : '4%',
                        backgroundColor: cfg?.color ?? '#e2e8f0',
                      }]} />
                    </View>
                    <Text style={s.moodDayLabel}>{dayLabel}</Text>
                    {mood > 0 && <Text style={s.moodEmoji}>{cfg?.emoji}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Insights Modal ── */}
      <Modal visible={showInsightsModal} animationType="slide">
        <SafeAreaView style={s.modalWrap} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Wellness Analytics</Text>
            <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
              <Ionicons name="close" size={28} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            {[
              { label: 'Habit Completion', value: totalHabits > 0 ? `${Math.round((completedHabits / totalHabits) * 100)}%` : '0%', locked: false },
              { label: '7-Day Sleep Avg', value: `${sleepAvg}h`, locked: false },
              { label: 'Meditation (Week)', value: `${meditationMins7d}m`, locked: false },
              { label: 'Mood Stability', value: isPro ? 'Stable' : '🔒 Pro', locked: !isPro },
            ].map(item => (
              <View key={item.label} style={[s.metricRow, item.locked && { opacity: 0.5 }]}>
                <Text style={s.metricLabel}>{item.label}</Text>
                <Text style={s.metricValue}>{item.value}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Sleep Modal ── */}
      <Modal visible={showSleepModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalWrap} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Log Sleep</Text>
            <TouchableOpacity onPress={() => setShowSleepModal(false)}>
              <Ionicons name="close" size={28} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 24 }}>
            <Text style={s.inputLabel}>Hours slept</Text>
            <TextInput
              style={s.input} placeholder="e.g. 7.5" keyboardType="numeric"
              value={sleepInput} onChangeText={setSleepInput} placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleLogSleep}>
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Mood Modal ── */}
      <Modal visible={showMoodModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalWrap} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>How are you feeling?</Text>
            <TouchableOpacity onPress={() => setShowMoodModal(false)}>
              <Ionicons name="close" size={28} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 24, gap: 12 }}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[s.moodOption, { borderColor: m.color + '50' }]}
                onPress={() => handleLogMood(m.value)}
              >
                <Text style={s.moodOptionEmoji}>{m.emoji}</Text>
                <Text style={[s.moodOptionLabel, { color: m.color }]}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={m.color + '80'} />
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {showMeditationHub && <MeditationHub userId={user._id} onClose={() => setShowMeditationHub(false)} />}
      {showGamesHub && <GamesHub userId={user._id} onClose={() => setShowGamesHub(false)} />}
      {showLifeGoals && <LifeGoalsHub userId={user._id} onClose={() => setShowLifeGoals(false)} />}
      {/* <PanicButton userId={user._id} /> */}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 24, columnGap: 16,
    marginTop: 8,
  },

  section: { paddingHorizontal: 24, marginTop: 24 },

  quickActions: { flexDirection: 'row', gap: 10 },

  // ── Plan Banner ──────────────────────────────────────────────────
  planBanner: {
    borderRadius: 24, padding: 22, flexDirection: 'row',
    alignItems: 'center', overflow: 'hidden', minHeight: 150,
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  blob: { position: 'absolute', borderRadius: 999 },
  planBannerLeft: { flex: 1, paddingRight: 16 },
  planBannerRight: { alignItems: 'center', justifyContent: 'center' },
  planBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  planBannerBadgeText: { fontSize: 9, color: '#a78bfa', fontWeight: '700', letterSpacing: 0.6 },
  planBannerTitle: {
    fontSize: 20, fontWeight: '900', color: '#ffffff',
    lineHeight: 26, marginBottom: 8,
  },
  planBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 17, marginBottom: 14 },
  planBannerCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.22)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  planBannerCtaText: { color: '#c4b5fd', fontWeight: '700', fontSize: 12 },
  planBannerIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },

  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // ── Mood chart ───────────────────────────────────────────────────
  moodChart: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  moodBar: { alignItems: 'center', flex: 1, gap: 4 },
  moodBarTrack: {
    width: 8, height: 60, backgroundColor: '#f1f5f9',
    borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden',
  },
  moodBarFill: { width: '100%', borderRadius: 4 },
  moodDayLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  moodEmoji: { fontSize: 11 },

  // ── Modals ───────────────────────────────────────────────────────
  modalWrap: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc', padding: 18, borderRadius: 14, marginBottom: 10,
  },
  metricLabel: { fontSize: 15, fontWeight: '600', color: '#475569' },
  metricValue: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  input: {
    height: 52, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 18, color: '#0f172a',
    backgroundColor: '#f8fafc', marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#8b5cf6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  moodOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14,
    padding: 16, borderWidth: 1, gap: 14,
  },
  moodOptionEmoji: { fontSize: 28 },
  moodOptionLabel: { flex: 1, fontSize: 17, fontWeight: '700' },
});