import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import WorkoutDetailModal from '@/components/move/modals/WorkoutDetailModal';
import ActiveWorkoutModal, { ActiveExercise } from '@/components/move/modals/ActiveWorkoutModal';
import { FREE_4_WEEK_PLAN, getWeekRoutineDays, PlanWeek } from '@/utils/fourWeekPlanData';

// ─── Week colours ─────────────────────────────────────────────────────────────
const WEEK_COLORS = ['#1e293b', '#4c1d95', '#065f46', '#92400e'];

export default function FourWeekPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useClerkUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const isPro = convexUser?.subscriptionStatus === 'active' ||
    clerkUser?.emailAddresses?.some(e => e.emailAddress === 'ggovsaas@gmail.com');

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);  // week index 0-3
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [activeWorkoutExercises, setActiveWorkoutExercises] = useState<ActiveExercise[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const handleViewWeek = (weekIndex: number) => {
    setSelectedWeek(weekIndex);
    setShowWorkoutDetail(true);
  };

  const handleStartActiveWorkout = (dayIndex: number) => {
    if (selectedWeek === null) return;
    const week = FREE_4_WEEK_PLAN[selectedWeek];
    const day = week.days[dayIndex];
    const built: ActiveExercise[] = day.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      thumbnailUrl: ex.thumbnailUrl,
      sets: Array.from({ length: ex.sets }).map((_, i) => ({
        id: `${ex.id}-set-${i}`,
        weight: '',
        reps: String(ex.reps).split('-')[0],
        completed: false,
      })),
    }));
    setActiveDayIndex(dayIndex);
    setActiveWorkoutExercises(built);
    setShowWorkoutDetail(false);
    setShowActiveWorkout(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>4-Week Plan</Text>
          <Text style={styles.headerSub}>A free template to get you moving.</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={14} color="#a5b4fc" />
            <Text style={styles.heroBadgeText}>FREE TEMPLATE</Text>
          </View>
          <Text style={styles.heroTitle}>Start with structure.</Text>
          <Text style={styles.heroSub}>
            Follow this 4-week routine to build momentum.{' '}
            {isPro
              ? 'Your personalised plan adapts as you progress.'
              : 'Upgrade to Pro for a personalised plan that adapts over time.'}
          </Text>
        </View>

        {/* Week cards */}
        <View style={styles.weekGrid}>
          {FREE_4_WEEK_PLAN.map((week, idx) => (
            <TouchableOpacity
              key={week.weekNum}
              style={[styles.weekCard, { backgroundColor: WEEK_COLORS[idx] }]}
              onPress={() => handleViewWeek(idx)}
              activeOpacity={0.85}
            >
              <Text style={styles.weekLabel}>Week {week.weekNum}</Text>
              <Text style={styles.weekTheme}>{week.theme}</Text>
              {week.focus.map(f => (
                <Text key={f} style={styles.weekFocus}>• {f}</Text>
              ))}
              <TouchableOpacity style={styles.viewWeekBtn} onPress={() => handleViewWeek(idx)}>
                <Text style={styles.viewWeekBtnText}>View week</Text>
                <Ionicons name="chevron-forward" size={14} color="#ffffff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pro upgrade banner (free users) / Pro rotating plan (pro users) */}
        {isPro ? (
          <View style={styles.proCard}>
            <View style={styles.proCardHeader}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={styles.proCardTitle}>Your Pro Rotating Plan</Text>
            </View>
            <Text style={styles.proCardSub}>
              Your AI plan in Move adapts each week based on your progress. Use the 4-week template above as a baseline, or let your plan guide you automatically.
            </Text>
            <TouchableOpacity
              style={styles.proCardBtn}
              onPress={() => router.push('/(tabs)/move' as any)}
            >
              <Text style={styles.proCardBtnText}>Go to Move tab →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.unlockBanner} onPress={() => setShowUpgrade(true)} activeOpacity={0.9}>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>Unlock Pro Plan</Text>
              <Text style={styles.unlockSub}>
                Get a personalised routine, exercise swaps, and progressive guidance.
              </Text>
            </View>
            <View style={styles.goProBtn}>
              <Text style={styles.goProText}>Go Pro</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Week detail modal */}
      {selectedWeek !== null && (
        <WorkoutDetailModal
          visible={showWorkoutDetail}
          routineDays={getWeekRoutineDays(selectedWeek)}
          initialTab={1}
          isPreviewMode={true}
          onClose={() => setShowWorkoutDetail(false)}
          onStartActiveWorkout={handleStartActiveWorkout}
        />
      )}

      {/* Active workout modal */}
      <ActiveWorkoutModal
        visible={showActiveWorkout}
        exercises={activeWorkoutExercises}
        onClose={() => setShowActiveWorkout(false)}
        onFinishWorkout={(time, vol, sets, ex) => {
          setShowActiveWorkout(false);
        }}
      />

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Unlock Pro Plan"
        message="Get a personalised routine, exercise swaps, and progressive guidance."
        upgradeLabel="Go Pro"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  content: { padding: 16, gap: 16 },

  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '900', color: '#a5b4fc', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginBottom: 10 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },

  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  weekCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
  },
  weekLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  weekTheme: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  weekFocus: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  viewWeekBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 12,
  },
  viewWeekBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  unlockBanner: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  unlockSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  goProBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  goProText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  proCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  proCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  proCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  proCardSub: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 16 },
  proCardBtn: {
    backgroundColor: '#f8fafc', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  proCardBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
});