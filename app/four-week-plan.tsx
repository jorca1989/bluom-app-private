import React, { useState, useMemo } from 'react';
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
import ExerciseDetailModal from '@/components/move/modals/ExerciseDetailModal';
import { FREE_4_WEEK_PLAN, getWeekRoutineDays, PlanWeek } from '@/utils/fourWeekPlanData';
import { buildWeekFromDBWorkouts } from '@/utils/buildPlanFromDB';

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
  
  const activePlans = useQuery(
    api.plans.getActivePlans,
    convexUser?._id ? {} : 'skip'
  );

  const dbWorkouts = useQuery(api.videoWorkouts.list, {});

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);  // week index 0-3
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [activeWorkoutExercises, setActiveWorkoutExercises] = useState<ActiveExercise[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<any>(null);

  // ── Resolve days: AI plan > static plan ─────────────────────────────────────
  // The AI plan's `workouts` represents ONE week's template, repeated for all 4 weeks.
  const aiWorkouts = activePlans?.fitnessPlan?.workouts;

  const getWeekDays = useMemo(() => {
    return (weekIdx: number) => {
      // 1. AI plan takes priority
      if (aiWorkouts && aiWorkouts.length > 0) {
        return aiWorkouts.map((w: any, i: number) => ({
          dayNum: i + 1,
          dayTitle: w.focus || w.day || `Workout ${i + 1}`,
          muscleGroups: Array.isArray(w.muscleGroups)
            ? w.muscleGroups.join(', ')
            : (w.muscleGroups || w.focus || 'Full Body'),
          exercises: (w.exercises || []).map((ex: any, j: number) => ({
            id: `ai-w${weekIdx + 1}-d${i + 1}-e${j}`,
            name: ex.name || 'Exercise',
            thumbnailUrl: ex.thumbnailUrl || '',
            videoUrl: ex.videoUrl || '',
            primaryMuscle: Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : (ex.primaryMuscles || ex.muscleGroup || 'Various'),
            equipment: ex.equipment || 'Various',
            sets: typeof ex.sets === 'number' ? ex.sets : (parseInt(String(ex.sets)) || 3),
            reps: ex.reps !== undefined ? String(ex.reps) : '10',
          })),
        }));
      }
      // 2. DB workouts
      if (dbWorkouts && dbWorkouts.length > 0) {
        const dbDaysPerWeek = Number(convexUser?.weeklyWorkoutTime) || 4;
        return buildWeekFromDBWorkouts(dbWorkouts, weekIdx, dbDaysPerWeek, convexUser?.biologicalSex || 'male');
      }
      // 3. Static fallback
      return getWeekRoutineDays(weekIdx);
    };
  }, [aiWorkouts, dbWorkouts, convexUser]);

  // For week card theme — use AI plan split name or static theme
  const getWeekTheme = (weekIdx: number): string => {
    if (aiWorkouts && aiWorkouts.length > 0) {
      return activePlans?.fitnessPlan?.workoutSplit || `Week ${weekIdx + 1}`;
    }
    return FREE_4_WEEK_PLAN[weekIdx]?.theme || 'Phase';
  };

  const handleViewWeek = (weekIndex: number) => {
    setSelectedWeek(weekIndex);
    setShowWorkoutDetail(true);
  };

  const handleStartActiveWorkout = (dayIndex: number) => {
    if (selectedWeek === null) return;
    const days = getWeekDays(selectedWeek);
    const day = days[dayIndex];
    if (!day) return;
    const built: ActiveExercise[] = (day.exercises || []).map((ex: any) => ({
      id: String(ex.id),
      name: ex.name,
      thumbnailUrl: ex.thumbnailUrl,
      sets: Array.from({ length: typeof ex.sets === 'number' ? ex.sets : 3 }).map((_, i) => ({
        id: `${ex.id}-set-${i}`,
        weight: '',
        reps: String(ex.reps || '10').split('-')[0],
        completed: false,
      })),
    }));
    setActiveDayIndex(dayIndex);
    setActiveWorkoutExercises(built);
    setShowWorkoutDetail(false);
    setShowActiveWorkout(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
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
              : 'Free users get a full 28-day blueprint. Upgrade to Pro to continue your journey.'}
          </Text>
        </View>

        {/* Week cards */}
        <View style={styles.weekGrid}>
          {[1, 2, 3, 4].map((_, idx) => {
            const days = getWeekDays(idx);
            const theme = getWeekTheme(idx);

            return (
              <TouchableOpacity
                key={`week-card-${idx}`}
                style={[styles.weekCard, { backgroundColor: WEEK_COLORS[idx] }]}
                onPress={() => handleViewWeek(idx)}
                activeOpacity={0.85}
              >
                <Text style={styles.weekLabel}>Week {idx + 1}</Text>
                <Text style={styles.weekTheme} numberOfLines={1}>{theme}</Text>

                <View style={styles.daysSummary}>
                  {days.map((d: any, dIdx: number) => (
                    <Text key={`daysum-${idx}-${dIdx}`} style={styles.daySummaryText} numberOfLines={1}>
                      {dIdx + 1}. {d.dayTitle}
                    </Text>
                  ))}
                </View>

                <View style={styles.viewWeekBtn}>
                  <Text style={styles.viewWeekBtnText}>View week</Text>
                  <Ionicons name="chevron-forward" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>
            );
          })}
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
              <Text style={styles.unlockTitle}>Continue Your Journey</Text>
              <Text style={styles.unlockSub}>
                Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with an AI-generated plan that adapts every cycle.
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
          routineDays={getWeekDays(selectedWeek) as any}
          initialTab={1}
          isPreviewMode={false}
          onClose={() => setShowWorkoutDetail(false)}
          onStartActiveWorkout={handleStartActiveWorkout}
          onExercisePress={(ex) => {
            setSelectedExerciseForDetail({
              _id: ex.id,
              name: ex.name,
              category: ex.primaryMuscle,
              type: 'strength',
              muscleGroups: [ex.primaryMuscle],
              primaryMuscles: [ex.primaryMuscle],
              secondaryMuscles: ex.secondaryMuscles ?? [],
              thumbnailUrl: ex.thumbnailUrl,
              videoUrl: ex.videoUrl,
              instructions: ex.instructions ?? [],
              equipment: ex.equipment,
              fromRoutine: true,
            } as any);
            setShowWorkoutDetail(false);
            setTimeout(() => setShowExerciseDetail(true), 100);
          }}
          isPro={isPro}
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

      {/* Exercise detail modal — plan exercises are always fully visible */}
      <ExerciseDetailModal
        visible={showExerciseDetail}
        exercise={selectedExerciseForDetail}
        isPro={true}
        onClose={() => {
          setShowExerciseDetail(false);
          setShowWorkoutDetail(true);
        }}
        onUpgradePress={() => {}}
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
  weekTheme: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 10 },
  daysSummary: { gap: 3, marginBottom: 12 },
  daySummaryText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
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
