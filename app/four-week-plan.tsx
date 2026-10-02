import React, { useState, useMemo } from 'react';
import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import WorkoutDetailModal from '@/components/move/modals/WorkoutDetailModal';
import ActiveWorkoutModal, { ActiveExercise } from '@/components/move/modals/ActiveWorkoutModal';
import ExerciseDetailModal from '@/components/move/modals/ExerciseDetailModal';
import { FREE_4_WEEK_PLAN, getWeekRoutineDays, PlanWeek } from '@/utils/fourWeekPlanData';
import { buildWeekFromDBWorkouts, resolveExerciseMedia } from '@/utils/buildPlanFromDB';
import { useAccessControl } from '@/hooks/useAccessControl';
import { translateValue } from '@/utils/translateHelper';

// Premium gradient pairs — (start, end, text accent)
const WEEK_GRADIENTS: [string, string][] = [
  ['#4f46e5', '#2563eb'],   // Week 1 — Indigo → Blue
  ['#10b981', '#0d9488'],   // Week 2 — Emerald → Teal
  ['#f43f5e', '#ec4899'],   // Week 3 — Rose → Pink
  ['#f59e0b', '#f97316'],   // Week 4 — Amber → Orange
];

export default function FourWeekPlanScreen() {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useClerkUser();
  const { t, i18n } = useTranslation();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const { isPro } = useAccessControl();
  
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

  const translateWorkoutLabel = React.useCallback((value?: string) => {
    if (!value) return '';
    return translateValue(value, i18n.language, t);
  }, [t, i18n.language]);

  const translateMuscleList = React.useCallback((value?: string) => {
    if (!value) return '';
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => translateValue(part, i18n.language, t))
      .join(', ');
  }, [t, i18n.language]);

  // ── Resolve days: AI plan > DB workouts > static plan ───────────────────────
  // The AI plan's `workouts` represents ONE week's template, repeated for all 4 weeks.
  const aiWorkouts = activePlans?.fitnessPlan?.workouts;

  const getWeekDays = useMemo(() => {
    const userSex = convexUser?.biologicalSex || 'male';

    return (weekIdx: number) => {
      // For rotation beyond 4 weeks, map the index onto the 4-week cycle
      const rotatedIdx = weekIdx % 4;
      // 1. AI plan takes priority
      if (aiWorkouts && aiWorkouts.length > 0) {
        return aiWorkouts.map((w: any, i: number) => ({
          dayNum: i + 1,
          dayTitle: translateWorkoutLabel(w.focus || w.day || `Workout ${i + 1}`),
          muscleGroups: Array.isArray(w.muscleGroups)
            ? translateMuscleList(w.muscleGroups.join(', '))
            : translateMuscleList(w.muscleGroups || w.focus || 'Full Body'),
          exercises: (w.exercises || []).map((ex: any, j: number) => {
            const muscle = Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : (ex.primaryMuscles || ex.muscleGroup || 'Various');
            const media = resolveExerciseMedia(ex.name, muscle, dbWorkouts, userSex);
            return {
              id: `ai-w${weekIdx + 1}-d${i + 1}-e${j}`,
              name: ex.name || 'Exercise',
              thumbnailUrl: ex.thumbnailUrl || media.thumbnailUrl || media.videoUrl || '',
              videoUrl: ex.videoUrl || media.videoUrl || '',
              primaryMuscle: muscle,
              equipment: ex.equipment || 'Various',
              sets: typeof ex.sets === 'number' ? ex.sets : (parseInt(String(ex.sets)) || 3),
              reps: ex.reps !== undefined ? String(ex.reps) : '10',
            };
          }),
        }));
      }
      // 2. DB workouts
      if (dbWorkouts && dbWorkouts.length > 0) {
        const dbDaysPerWeek = Number(convexUser?.weeklyWorkoutTime) || 4;
        return buildWeekFromDBWorkouts(dbWorkouts, rotatedIdx, dbDaysPerWeek, userSex, t);
      }
      // 3. Static fallback with DB media resolution
      return getWeekRoutineDays(rotatedIdx).map(day => ({
        ...day,
        dayTitle: translateWorkoutLabel(day.dayTitle),
        muscleGroups: translateMuscleList(day.muscleGroups),
        exercises: day.exercises.map(ex => {
          const media = resolveExerciseMedia(ex.name, ex.primaryMuscle, dbWorkouts, userSex);
          return {
            ...ex,
            thumbnailUrl: media.thumbnailUrl || media.videoUrl || ex.thumbnailUrl,
            videoUrl: media.videoUrl || '',
          };
        }),
      }));
    };
  }, [aiWorkouts, dbWorkouts, convexUser, translateMuscleList, translateWorkoutLabel, t]);

  // For week card theme — use AI plan split name or static theme
  const getWeekTheme = (weekIdx: number): string => {
    if (aiWorkouts && aiWorkouts.length > 0) {
      const split = activePlans?.fitnessPlan?.workoutSplit || `Week ${weekIdx + 1}`;
      return translateWorkoutLabel(split);
    }
    const rotatedIdx = weekIdx % 4;
    const theme = FREE_4_WEEK_PLAN[rotatedIdx]?.theme || 'Phase';
    return translateWorkoutLabel(theme);
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
      videoUrl: ex.videoUrl,
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={themeColors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('move.fourWeekPlan', '4-Week Plan')}</Text>
          <Text style={styles.headerSub}>{t('move.fourWeekPlanDesc', 'A free template to get you moving.')}</Text>
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
            <Text style={styles.heroBadgeText}>{t('move.freeTemplate', 'FREE TEMPLATE')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('move.startWithStructure', 'Start with structure.')}</Text>
          <Text style={styles.heroSub}>
            {t('move.followRoutine', 'Follow this 4-week routine to build momentum.')}{' '}
            {isPro
              ? t('move.proPlanAdapts', 'Your personalised plan adapts as you progress.')
              : t('move.freeUsers28Days', 'Free users get a full 28-day blueprint. Upgrade to Pro to continue your journey.')}
          </Text>
        </View>

        {/* Week cards grid */}
        <View style={styles.weekGrid}>
          {[0, 1, 2, 3].map((weekIdx) => {
            const days = getWeekDays(weekIdx);
            const theme = getWeekTheme(weekIdx);
            const gradient = WEEK_GRADIENTS[weekIdx % WEEK_GRADIENTS.length];
            return (
              <TouchableOpacity
                key={`week-${weekIdx}`}
                style={styles.weekCard}
                onPress={() => handleViewWeek(weekIdx)}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.weekCardGradient}
                >
                  {/* Week pill */}
                  <View style={styles.weekPill}>
                    <Text style={styles.weekPillText}>{t('common.weekNum', 'Week {{num}}', { num: weekIdx + 1 })}</Text>
                  </View>
                  <Text style={styles.weekTheme} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{theme}</Text>
                  <View style={styles.daysSummary}>
                    {days.slice(0, 3).map((d: any, dIdx: number) => (
                      <View key={`d-${weekIdx}-${dIdx}`} style={styles.daySummaryRow}>
                        <View style={styles.daySummaryDot} />
                        <Text style={styles.daySummaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                          {d.dayTitle}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.viewWeekBtn}>
                    <Text style={styles.viewWeekBtnText}>{t('move.viewWeek', 'View week')}</Text>
                    <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.9)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>


        {/* Pro upgrade banner (free users) / Pro rotating plan (pro users) */}
        {isPro ? (
          <View style={styles.proCard}>
            <View style={styles.proCardHeader}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={styles.proCardTitle}>{t('move.yourProRotatingPlan', 'Your Pro Rotating Plan')}</Text>
            </View>
            <Text style={styles.proCardSub}>
              {t('move.proPlanDesc', 'Your AI plan in Move adapts each week based on your progress. Use the 4-week template above as a baseline, or let your plan guide you automatically.')}
            </Text>
            <TouchableOpacity
              style={styles.proCardBtn}
              onPress={() => router.push('/(tabs)/move' as any)}
            >
              <Text style={styles.proCardBtnText}>{t('move.goToMoveTab', 'Go to Move tab →')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.unlockBanner} onPress={() => setShowUpgrade(true)} activeOpacity={0.9}>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{t('move.continueJourney', 'Continue Your Journey')}</Text>
              <Text style={styles.unlockSub}>
                {t('move.freeUsers28DaysFull', 'Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with an AI-generated plan that adapts every cycle.')}
              </Text>
            </View>
            <View style={styles.goProBtn}>
              <Text style={styles.goProText}>{t('move.goPro', 'Go Pro')}</Text>
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
        title={t('modals.pro.unlockPlan', 'Unlock Pro Plan')}
        message={t('move.proUpsellDesc', 'Get a personalised routine, exercise swaps, and progressive guidance.')}
        upgradeLabel={t('modals.pro.goPro', 'Go Pro')}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  headerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  content: { padding: 16, gap: 16 },

  heroCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '900', color: '#6366f1', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: c.text, marginBottom: 10 },
  heroSub: { fontSize: 14, color: c.textMuted, lineHeight: 20 },

  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  weekCard: {
    width: '47%',
    borderRadius: 20,
    minHeight: 210,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  weekCardGradient: {
    flex: 1,
    minHeight: 210,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'space-between',
  },
  weekPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  weekPillText: { fontSize: 11, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  weekTheme: { fontSize: 19, fontWeight: '900', color: '#ffffff', marginBottom: 10, letterSpacing: -0.3 },
  daysSummary: { gap: 5, marginBottom: 10, flex: 1 },
  daySummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daySummaryDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    flexShrink: 0,
  },
  daySummaryText: { fontSize: 11.5, color: 'rgba(255,255,255,0.88)', fontWeight: '600', flex: 1 },
  viewWeekBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
  viewWeekBtnText: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

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
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  proCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  proCardTitle: { fontSize: 16, fontWeight: '800', color: c.text },
  proCardSub: { fontSize: 13, color: c.textMuted, lineHeight: 19, marginBottom: 16 },
  proCardBtn: {
    backgroundColor: c.surfaceMuted, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  proCardBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
});

