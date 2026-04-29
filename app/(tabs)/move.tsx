import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AIRoutineModal from '@/components/AIRoutineModal';
import Tooltip from '@/components/Tooltip';
import CoachMark from '@/components/CoachMark';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Settings2 } from 'lucide-react-native';


import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useCelebration } from '@/context/CelebrationContext';
// Health integrations disabled for Build 18 submission.
import { useResponsive } from '@/utils/responsive';
import ProgramWorkoutWidget from '@/components/move/ProgramWorkoutWidget';
import MoveQuickActions from '@/components/move/MoveQuickActions';
import MoveInsights from '@/components/move/MoveInsights';
import OutdoorActivityBanner from '@/components/move/OutdoorActivityBanner';
import OutdoorActivityModal from '@/components/move/modals/OutdoorActivityModal';
import ActiveWorkoutModal, { ActiveExercise } from '@/components/move/modals/ActiveWorkoutModal';
import WorkoutDetailModal from '@/components/move/modals/WorkoutDetailModal';
import ExerciseSearchModal, { ExerciseLibraryItem as ESearchItem } from '@/components/move/modals/ExerciseSearchModal';
import SingleExerciseLogModal from '@/components/move/modals/SingleExerciseLogModal';
import ExerciseDetailModal from '@/components/move/modals/ExerciseDetailModal';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { FREE_4_WEEK_PLAN, getWeekRoutineDays } from '@/utils/fourWeekPlanData';
import { buildPlanFromDBWorkouts } from '@/utils/buildPlanFromDB';



// ─────────────────────────────────────────────────────────────
// WIDGET TOGGLE SYSTEM
// ─────────────────────────────────────────────────────────────
type MoveWidgetId = 'kpis' | 'swipeable' | 'quickActions' | 'todayActivities' | 'moveInsights';
const MOVE_WIDGETS: { id: MoveWidgetId; emoji: string; labelKey: string }[] = [
  { id: 'kpis',            emoji: '📊', labelKey: 'move.widgets.kpis' },
  { id: 'swipeable',       emoji: '🗓️', labelKey: 'move.widgets.swipeable' },
  { id: 'quickActions',    emoji: '⚡', labelKey: 'move.widgets.quickActions' },
  { id: 'todayActivities', emoji: '🏃', labelKey: 'move.widgets.todayActivities' },
  { id: 'moveInsights',    emoji: '📈', labelKey: 'move.widgets.moveInsights' },
];
const MOVE_WIDGETS_KEY = 'bluom_move_widgets_v1';

const safeNumber = (val: string | number, fallback = 0) => {
  const parsed = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(parsed) ? fallback : parsed;
};

type ExerciseType = 'strength' | 'cardio' | 'hiit' | 'yoga';
type ExerciseLibraryItem = {
  _id: any;
  name: string | { [key: string]: string; en: string };
  category: string;
  type: ExerciseType;
  met: number;
  caloriesPerMinute?: number;
  muscleGroups: string[];
};


const workoutCategories = ['All', 'Strength', 'Cardio', 'HIIT', 'Flexibility'] as const;

function toIsoDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function MoveScreen() {
  const router = useRouter();
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false); // Disabled for production
  const params = useLocalSearchParams<{ openWorkouts?: string }>();
  const insets = useSafeAreaInsets();
  const { width, isTablet, isSmallPhone: isSmallScreen, contentMaxWidth, kpiCardWidth } = useResponsive();
  const { t } = useTranslation();

  // ── Widget config ──
  const allMoveWidgetIds = MOVE_WIDGETS.map(w => w.id);
  const [visibleMoveWidgets, setVisibleMoveWidgets] = useState<Set<MoveWidgetId>>(new Set(allMoveWidgetIds));
  const [showMoveWidgetConfig, setShowMoveWidgetConfig] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(MOVE_WIDGETS_KEY);
        if (raw) {
          const parsed: MoveWidgetId[] = JSON.parse(raw);
          setVisibleMoveWidgets(new Set(parsed));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleMoveWidget = useCallback(async (id: MoveWidgetId) => {
    setVisibleMoveWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      SecureStore.setItemAsync(MOVE_WIDGETS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isMW = (id: MoveWidgetId) => visibleMoveWidgets.has(id);

  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isPro = convexUser?.subscriptionStatus === 'active' || clerkUser?.emailAddresses?.some(e => e.emailAddress === 'ggovsaas@gmail.com');

  const activeFastingLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const activePlans = useQuery(
    api.plans.getActivePlans,
    convexUser?._id ? {} : 'skip'
  );

  const fastingHours = activeFastingLog ? (new Date().getTime() - activeFastingLog.startTime) / (1000 * 60 * 60) : 0;
  const showFatBurnCardio = fastingHours >= 12 && fastingHours < 18;

  const [showProModal, setShowProModal] = useState(false);
  const [proModalConfig, setProModalConfig] = useState({ title: '', message: '' });

  const handleProFeature = (title: string, message: string) => {
    setProModalConfig({ title, message });
    setShowProModal(true);
  };

  const logExerciseEntry = useMutation(api.exercise.logExerciseEntry);
  const deleteRoutine = useMutation(api.routines.deleteRoutine);
  // Strava sync disabled for store submission (avoid broken OAuth flows / bad links).
  const addStepsEntry = useMutation(api.steps.addStepsEntry);
  const deleteExerciseEntry = useMutation(api.exercise.deleteExerciseEntry);
  const deleteStepsEntry = useMutation(api.steps.deleteStepsEntry);
  // const saveExternalData = useMutation(api.integrations.saveExternalData);
  const celebration = useCelebration();

  // Achievements system
  const userAchievements = useQuery(
    api.achievements.getUserAchievements,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );
  const earnAchievement = useMutation(api.achievements.earnAchievement);

  // Achievement definitions
  const achievementDefinitions = [
    {
      id: 'first_workout',
      title: t('achievements.first_workout.title', 'First Steps'),
      description: t('achievements.first_workout.description', 'Complete your first workout! 🎯'),
      icon: 'star',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      check: () => (exerciseEntries?.length ?? 0) >= 1
    },
    {
      id: 'step_goal',
      title: t('achievements.step_goal.title', 'Step Master'),
      description: t('achievements.step_goal.description', 'Reach 1000+ steps in a day! 🚶'),
      icon: 'locate',
      color: '#2563eb',
      bgColor: '#dbeafe',
      check: () => (todayTotals.steps ?? 0) >= 1000
    },
    {
      id: 'calorie_burner',
      title: t('achievements.calorie_burner.title', 'Calorie Crusher'),
      description: t('achievements.calorie_burner.description', 'Burn 500+ calories in a day! 🔥'),
      icon: 'flash',
      color: '#dc2626',
      bgColor: '#fee2e2',
      check: () => (todayTotals.calories ?? 0) >= 500
    },
    {
      id: 'workout_streak_3',
      title: t('achievements.workout_streak_3.title', '3-Day Streak'),
      description: t('achievements.workout_streak_3.description', 'Workout for 3 consecutive days! 💪'),
      icon: 'trending-up',
      color: '#16a34a',
      bgColor: '#dcfce7',
      check: () => {
        // Check last 3 days have workouts
        const last3Days = [];
        for (let i = 0; i < 3; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last3Days.push(d.toISOString().slice(0, 10));
        }
        return last3Days.every(date =>
          weekExerciseEntries?.some(entry => entry.date === date)
        );
      }
    },
    {
      id: 'workout_warrior',
      title: t('achievements.workout_warrior.title', 'Workout Warrior'),
      description: t('achievements.workout_warrior.description', 'Complete 5 workouts in a single day! ⚔️'),
      icon: 'barbell',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      check: () => (exerciseEntries?.length ?? 0) >= 5
    },
    {
      id: 'time_champion',
      title: t('achievements.time_champion.title', 'Time Champion'),
      description: t('achievements.time_champion.description', 'Exercise for 60+ minutes in a day! ⏰'),
      icon: 'time',
      color: '#ea580c',
      bgColor: '#fed7aa',
      check: () => (todayTotals.minutes ?? 0) >= 60
    },
    {
      id: 'week_warrior',
      title: t('achievements.week_warrior.title', 'Week Warrior'),
      description: t('achievements.week_warrior.description', 'Workout 5+ times this week! 🏆'),
      icon: 'trophy',
      color: '#0891b2',
      bgColor: '#cffafe',
      check: () => weekData.reduce((sum, count) => sum + count, 0) >= 5
    },
    {
      id: 'variety_master',
      title: t('achievements.variety_master.title', 'Variety Master'),
      description: t('achievements.variety_master.description', 'Try 3 different workout types! 🌈'),
      icon: 'fitness',
      color: '#be185d',
      bgColor: '#fce7f3',
      check: () => {
        const types = new Set(exerciseEntries?.map(e => e.exerciseType));
        return types.size >= 3;
      }
    }
  ];

  // Check and unlock achievements
  const checkAndUnlockAchievements = async () => {
    if (!convexUser?._id) return;

    for (const achievement of achievementDefinitions) {
      const hasAchievement = userAchievements?.some(a => a.badgeId === achievement.id);
      if (!hasAchievement && achievement.check()) {
        try {
          await earnAchievement({
            userId: convexUser!._id,
            badgeId: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon
          });
          celebration.trigger('fireworks');
        } catch (e) {
          console.error('Failed to unlock achievement:', e);
        }
      }
    }
  };

  // Check achievements when data changes
  // NOTE: this effect is declared after `exerciseEntries` to avoid TS "used before declaration".

  // Calculate progress for achievements
  const getAchievementProgress = (achievement: any) => {
    switch (achievement.id) {
      case 'first_workout':
        return Math.min(100, ((exerciseEntries?.length ?? 0) / 1) * 100);
      case 'step_goal':
        return Math.min(100, ((todayTotals.steps ?? 0) / 1000) * 100);
      case 'calorie_burner':
        return Math.min(100, ((todayTotals.calories ?? 0) / 500) * 100);
      case 'workout_warrior':
        return Math.min(100, ((exerciseEntries?.length ?? 0) / 5) * 100);
      case 'time_champion':
        return Math.min(100, ((todayTotals.minutes ?? 0) / 60) * 100);
      case 'week_warrior':
        return Math.min(100, (weekData.reduce((sum, count) => sum + count, 0) / 5) * 100);
      case 'variety_master':
        const types = new Set(exerciseEntries?.map(e => e.exerciseType));
        return Math.min(100, (types.size / 3) * 100);
      case 'workout_streak_3':
        // Complex streak calculation - simplified for now
        return 0; // Hard to show progress for streak
      default:
        return 0;
    }
  };

  // Show only 3 achievements at a time (mix of earned and pending)
  const displayAchievements = useMemo(() => {
    const earned = achievementDefinitions.filter(a =>
      userAchievements?.some(ua => ua.badgeId === a.id)
    );
    const pending = achievementDefinitions.filter(a =>
      !userAchievements?.some(ua => ua.badgeId === a.id)
    );

    // Show 1-2 earned and 1-2 pending, max 3 total
    const toShow = [];
    toShow.push(...earned.slice(0, 2));
    toShow.push(...pending.slice(0, 1));
    return toShow.slice(0, 3);
  }, [userAchievements, achievementDefinitions]);

  const today = useMemo(() => new Date(), []);
  const currentDate = useMemo(() => toIsoDateString(today), [today]);

  const exerciseEntries = useQuery(
    api.exercise.getExerciseEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: currentDate } : 'skip'
  );

  // Check achievements when data changes
  useEffect(() => {
    if (userAchievements !== undefined && exerciseEntries !== undefined) {
      checkAndUnlockAchievements();
    }
  }, [userAchievements, exerciseEntries]);

  const stepsEntries = useQuery(
    api.steps.getStepsEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: currentDate } : 'skip'
  );

  const myRoutines = useQuery(api.routines.listRoutines) || [];

  const weekStart = useMemo(() => toIsoDateString(addDays(today, -6)), [today]);
  const weekEnd = currentDate;
  const weekExerciseEntries = useQuery(
    api.exercise.getExerciseEntriesInRange,
    convexUser?._id ? { userId: convexUser._id, startDate: weekStart, endDate: weekEnd } : 'skip'
  );

  const syncedMetrics = useQuery(api.integrations.getTodayMetrics, convexUser?._id ? { userId: convexUser._id } : "skip");
  const [isSyncing, setIsSyncing] = useState(false);

  const loading =
    !isClerkLoaded ||
    (clerkUser && convexUser === undefined) ||
    exerciseEntries === undefined ||
    stepsEntries === undefined;

  // UI state
  const [showDropdown, setShowDropdown] = useState(false);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [workoutDetailMode, setWorkoutDetailMode] = useState<'view' | 'start'>('view');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // ── Free plan: week progression & expiry (28 days from signup) ──────────────
  const PLAN_DURATION_MS = 28 * 24 * 60 * 60 * 1000; // 28 days
  const accountAgeMs = convexUser?.createdAt ? Date.now() - convexUser.createdAt : 0;
  const currentWeekIndex = Math.min(3, Math.floor(accountAgeMs / (7 * 24 * 60 * 60 * 1000)));
  const freePlanExpired = !isPro && accountAgeMs > PLAN_DURATION_MS;
  const freePlanCurrentWeek = FREE_4_WEEK_PLAN[currentWeekIndex];

  const [completedWorkoutsThisWeek, setCompletedWorkoutsThisWeek] = useState(1);

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchTarget, setExerciseSearchTarget] = useState<'detail' | 'log' | 'plan_add' | 'active_add'>('detail');
  const [planEditDayIndex, setPlanEditDayIndex] = useState(0);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [showSingleExerciseLog, setShowSingleExerciseLog] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<any>(null);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showOutdoor, setShowOutdoor] = useState(false);
  const [workoutDetailTab, setWorkoutDetailTab] = useState(0);
  const dummyExercises: ActiveExercise[] = [{ id: "1", name: "Barbell Bench Press", sets: [{ id: "1a", weight: "", reps: "", completed: false }] }];

  // Search state (debounced)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof workoutCategories)[number]>('All');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);

  // DB workouts for plan (api.videoWorkouts.list) — used as fallback when no AI plan
  const dbWorkouts = useQuery(api.videoWorkouts.list, {});

  // Extract all unique exercises from video workouts for plan modifications
  const videoWorkoutExercises = useMemo(() => {
    if (!dbWorkouts) return [];
    const allEx: any[] = [];
    const seen = new Set<string>();
    for (const w of dbWorkouts) {
      if (w.exercises) {
        for (const ex of w.exercises) {
          if (!seen.has(ex.name)) {
            seen.add(ex.name);
            allEx.push({
              _id: `${w._id}-${ex.name}`,
              name: ex.name,
              category: ex.primaryMuscles?.[0] || w.category || 'Various',
              muscleGroups: ex.primaryMuscles && ex.primaryMuscles.length > 0 ? ex.primaryMuscles : w.muscleGroupTags || [],
              thumbnailUrl: (convexUser?.biologicalSex === 'male' ? w.thumbnailMale : convexUser?.biologicalSex === 'female' ? w.thumbnailFemale : null) || w.thumbnail,
              videoUrl: (convexUser?.biologicalSex === 'male' ? w.videoUrlMale : convexUser?.biologicalSex === 'female' ? w.videoUrlFemale : null) || w.videoUrl,
              type: ex.exerciseType || 'strength',
              equipment: w.equipment?.length > 0 ? w.equipment[0] : 'Various',
              instructions: ex.instructions || [],
            });
          }
        }
      }
    }
    return allEx;
  }, [dbWorkouts, convexUser?.biologicalSex]);


  // ── Workout display routine: Prioritize AI Plan > DB workouts > static ──
  const initialWorkouts = useMemo(() => {
    // 1. If we have a personalized AI plan, map its workouts to RoutineDay format
    const aiWorkouts = activePlans?.fitnessPlan?.workouts;
    if (aiWorkouts && aiWorkouts.length > 0) {
      return aiWorkouts.map((w: any, idx: number) => ({
        dayNum: idx + 1,
        dayTitle: t(`db.${(w.focus || w.day || '').replace(/\s+/g, '')}`, w.focus || w.day || `Workout ${idx + 1}`),
        muscleGroups: t(`db.${(Array.isArray(w.muscleGroups) ? w.muscleGroups.join('') : (w.muscleGroups || w.focus || 'FullBody')).replace(/\s+/g, '')}`, Array.isArray(w.muscleGroups)
          ? w.muscleGroups.join(', ')
          : (w.muscleGroups || w.focus || 'Full Body')),
        exercises: (w.exercises || []).map((ex: any, j: number) => ({
          id: `ai-d${idx + 1}-e${j}`,
          name: t(`db.${(ex.name || '').replace(/\s+/g, '')}`, ex.name || 'Exercise'),
          thumbnailUrl: ex.thumbnailUrl || '',
          videoUrl: ex.videoUrl || '',
          primaryMuscle: t(`db.${(Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : (ex.primaryMuscles || 'Various')).replace(/\s+/g, '')}`, Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : (ex.primaryMuscles || 'Various')),
          equipment: t(`db.${(ex.equipment || '').replace(/\s+/g, '')}`, ex.equipment || 'Various'),
          sets: typeof ex.sets === 'number' ? ex.sets : (parseInt(String(ex.sets)) || 3),
          reps: ex.reps !== undefined ? String(ex.reps) : '10',
        })),
      }));
    }
    // 2. Try DB workouts (api.videoWorkouts.list) — undefined means still loading
    if (dbWorkouts !== undefined && dbWorkouts.length > 0) {
      const dbDaysPerWeek = Number(convexUser?.weeklyWorkoutTime) || 4;
      return buildPlanFromDBWorkouts(dbWorkouts, currentWeekIndex, dbDaysPerWeek, convexUser?.biologicalSex || 'male', t);
    }
    // 3. Fall back to the static free template
    return getWeekRoutineDays(currentWeekIndex);
  }, [currentWeekIndex, activePlans?.fitnessPlan, dbWorkouts, convexUser, t]);


  const [workouts, setWorkouts] = useState<any[]>(initialWorkouts as any);
  useEffect(() => {
    setWorkouts(initialWorkouts as any);
  }, [initialWorkouts]);

  // Days per week — based on the ACTUAL number of workouts in the plan
  const totalWorkoutsPerWeek = workouts.length;

  const [activeWorkoutExercises, setActiveWorkoutExercises] = useState<ActiveExercise[]>([]);

  // Convex Exercise Library Query
  const exerciseLibrary = useQuery(api.exercises.list, {
    search: searchQuery || undefined,
    category: selectedCategory === 'All' ? undefined : selectedCategory
  });

  const searchResults = (exerciseLibrary || []) as ExerciseLibraryItem[];
  const searchLoading = exerciseLibrary === undefined;

  // Forms
  const [workoutForm, setWorkoutForm] = useState({
    duration: '30',
    sets: '3',
    reps: '10',
    weight: '50',
    calories: '',
  });
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    description: '',
    duration: '',
    calories: '',
  });
  const [stepsInput, setStepsInput] = useState('');

  // Open search modal via route param (only once)
  const openedFromParam = useRef(false);
  useEffect(() => {
    if (openedFromParam.current) return;
    if (params?.openWorkouts) {
      openedFromParam.current = true;
      setShowExerciseSearch(true);
    }
  }, [params?.openWorkouts]);


  const todayTotals = useMemo(() => {
    const ex = exerciseEntries ?? [];
    const total = ex.reduce(
      (acc: { workouts: number; minutes: number; calories: number }, entry: any) => {
        acc.workouts += 1;
        acc.minutes += entry.duration;
        acc.calories += entry.caloriesBurned;
        return acc;
      },
      { workouts: 0, minutes: 0, calories: 0 }
    );
    const steps = (stepsEntries ?? []).reduce((acc: number, e: any) => acc + e.steps, 0);
    const stepsCalories = (stepsEntries ?? []).reduce((acc: number, e: any) => acc + e.caloriesBurned, 0);
    const syncedSteps = syncedMetrics?.steps ?? 0;
    const syncedCalories = syncedMetrics?.calories ?? 0;
    const manualCalories = Math.round(total.calories + stepsCalories);
    // Calories KPI should represent "total burned today" without double-counting.
    // If Health provides ActiveEnergyBurned totals, treat it as authoritative for the day.
    const burnedToday = Math.round(Math.max(manualCalories, syncedCalories));
    return {
      workouts: total.workouts,
      minutes: Math.round(total.minutes),
      calories: burnedToday,
      steps: Math.round(steps),
      syncedSteps,
      syncedCalories,
    };
  }, [exerciseEntries, stepsEntries, syncedMetrics]);

  const todayActivities = useMemo(() => {
    const ex = (exerciseEntries ?? []).map((entry) => ({
      id: entry._id,
      name: entry.exerciseName,
      duration: entry.duration,
      calories: entry.caloriesBurned,
      timestamp: entry.timestamp,
      activityType: 'exercise' as const,
      origin: 'manual' as const,
      entry,
    }));

    const st = (stepsEntries ?? []).map((entry) => ({
      id: entry._id,
      name: `${Math.round(entry.steps).toLocaleString()} Steps`,
      duration: 0,
      calories: entry.caloriesBurned,
      timestamp: entry.timestamp,
      activityType: 'steps' as const,
      synced: false as const,
      origin: 'manual' as const,
      entry,
    }));

    const syncedSteps = syncedMetrics?.steps ?? 0;
    const syncedCalories = syncedMetrics?.calories ?? 0;
    const hasSynced = syncedSteps > 0 || syncedCalories > 0;
    const syncedActivity = hasSynced
      ? [
        {
          id: 'health-sync',
          name: `${Math.round(syncedSteps).toLocaleString()} Steps (Health)`,
          duration: 0,
          calories: Math.round(syncedCalories),
          timestamp: Date.now(),
          activityType: 'steps' as const,
          synced: true as const,
          origin: (Platform.OS === 'ios' ? 'apple' : 'google') as 'apple' | 'google',
          entry: null,
        },
      ]
      : [];

    return [...ex, ...syncedActivity, ...st].sort((a, b) => b.timestamp - a.timestamp);
  }, [exerciseEntries, stepsEntries, syncedMetrics]);

  const weekDays = useMemo(() => {
    const now = today;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(addDays(now, -i));
    }
    return days;
  }, [today]);

  const weekData = useMemo(() => {
    const entries = weekExerciseEntries ?? [];
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    }
    return weekDays.map((d) => counts.get(toIsoDateString(d)) ?? 0);
  }, [weekDays, weekExerciseEntries]);



  const closeAllOverlays = () => setShowDropdown(false);

  const calculateCalories = (
    exercise: ExerciseLibraryItem,
    durationMinutes: number,
    sets?: number,
    reps?: number,
    weight?: number
  ) => {
    let base = (exercise.caloriesPerMinute || 6) * durationMinutes;
    if (exercise.type === 'strength' && sets && reps && weight) {
      const intensityMultiplier = Math.min(weight / 50, 2);
      base *= intensityMultiplier;
    }
    return Math.round(base);
  };

  const handleExerciseSelect = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setWorkoutForm({
      duration: '30',
      sets: exercise.type === 'strength' ? '3' : '',
      reps: exercise.type === 'strength' ? '10' : '',
      weight: exercise.type === 'strength' ? '50' : '',
      calories: '',
    });
  };

  const computeMetFromCaloriesPerMinute = (cpm: number | undefined) => {
    if (!cpm) return 6;
    const MET_FACTOR = 1 / (Math.max(1, convexUser?.weight ?? 70) / 60);
    return Math.max(0.1, cpm * MET_FACTOR);
  };

  const logExercise = async () => {
    if (!convexUser?._id) return;
    if (!selectedExercise) return;
    const duration = Math.max(1, Math.floor(safeNumber(workoutForm.duration, 0)));
    if (!duration) return;

    const sets = workoutForm.sets ? Math.max(0, Math.floor(safeNumber(workoutForm.sets, 0))) : undefined;
    const reps = workoutForm.reps ? Math.max(0, Math.floor(safeNumber(workoutForm.reps, 0))) : undefined;
    const weight = workoutForm.weight ? Math.max(0, safeNumber(workoutForm.weight, 0)) : undefined;

    const caloriesBurned = workoutForm.calories
      ? Math.max(0, Math.floor(safeNumber(workoutForm.calories, 0)))
      : calculateCalories(selectedExercise, duration, sets, reps, weight);

    // Derive MET so server-side formula produces our target calories as closely as possible.
    const durationHours = duration / 60;
    const weightKg = convexUser?.weight ?? 70;
    const metFromCalories = caloriesBurned / (Math.max(1, weightKg) * Math.max(0.01, durationHours));
    const met = Number.isFinite(metFromCalories)
      ? Math.max(0.1, metFromCalories)
      : computeMetFromCaloriesPerMinute(selectedExercise.caloriesPerMinute);

    try {
      await logExerciseEntry({
        userId: convexUser?._id,
        exerciseName: typeof selectedExercise.name === 'object' ? (selectedExercise.name as any).en : selectedExercise.name,
        duration: safeNumber(workoutForm.duration),
        met: met,
        exerciseType: selectedExercise.type,
        // sets: workoutForm.sets ? safeNumber(workoutForm.sets) : undefined, // Removed: Not in schema yet
        // reps: workoutForm.reps ? safeNumber(workoutForm.reps) : undefined, // Removed: Not in schema yet
        // weight: workoutForm.weight ? safeNumber(workoutForm.weight) : undefined, // Removed: Not in schema yet
        date: toIsoDateString(new Date()),
      });

      // Check and unlock First Workout achievement
      const hasFirstWorkout = userAchievements?.some(a => a.badgeId === 'first_workout');
      if (!hasFirstWorkout) {
        await earnAchievement({
          userId: convexUser!._id,
          badgeId: 'first_workout',
          title: 'First Workout',
          description: 'You logged your first workout! Keep up the great work!',
          icon: 'star'
        });
      }

      triggerSound(SoundEffect.LOG_WORKOUT);
      celebration.trigger('fireworks');
      setSelectedExercise(null);
      setShowExerciseSearch(false);
      setShowCustomExercise(false);
      setShowWorkoutModal(false);
      Alert.alert('Success', `${typeof selectedExercise.name === 'string' ? selectedExercise.name : (selectedExercise.name as any).en} logged successfully`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to log workout');
    }
  };

  const logCustomExercise = async () => {
    if (!convexUser?._id) return;
    const name = customExerciseForm.name.trim();
    const duration = Math.max(1, Math.floor(safeNumber(customExerciseForm.duration, 0)));
    const caloriesBurned = Math.max(0, Math.floor(safeNumber(customExerciseForm.calories, 0)));

    if (!name || !duration || !caloriesBurned) return;

    const durationHours = duration / 60;
    const weightKg = convexUser?.weight ?? 70;
    const met = caloriesBurned / (Math.max(1, weightKg) * Math.max(0.01, durationHours));

    try {
      await logExerciseEntry({
        userId: convexUser._id,
        exerciseName: name,
        exerciseType: 'cardio',
        duration,
        met: Number.isFinite(met) ? Math.max(0.1, met) : 6,
        date: currentDate,
      });

      triggerSound(SoundEffect.LOG_WORKOUT);
      celebration.trigger('fireworks');
      setCustomExerciseForm({ name: '', description: '', duration: '', calories: '' });
      setShowCustomExercise(false);
      setShowWorkoutModal(false);
      Alert.alert('Success', `${name} logged successfully`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to log exercise');
    }
  };

  const [isSubmittingSteps, setIsSubmittingSteps] = useState(false);

  const addSteps = async () => {
    if (!convexUser?._id) return;
    const steps = Math.max(0, Math.floor(safeNumber(stepsInput, 0)));
    if (!steps || isSubmittingSteps) return;

    setIsSubmittingSteps(true);
    try {
      await addStepsEntry({
        userId: convexUser._id,
        date: currentDate,
        steps,
      });

      // Check and unlock Step Goal achievement
      const hasStepGoal = userAchievements?.some(a => a.badgeId === 'step_goal');
      if (!hasStepGoal && steps >= 1000) { // 1000 steps is a reasonable first goal
        await earnAchievement({
          userId: convexUser!._id,
          badgeId: 'step_goal',
          title: 'Step Goal',
          description: 'You reached 1000+ steps in a day! Amazing!',
          icon: 'locate'
        });
      }

      triggerSound(SoundEffect.LOG_STEPS);
      celebration.trigger('confetti');
      setStepsInput('');
      setShowStepsModal(false);
      Alert.alert('Success', `${steps.toLocaleString()} steps added`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add steps');
    } finally {
      setIsSubmittingSteps(false);
    }
  };

  const handleDeleteActivity = async (activity: (typeof todayActivities)[number]) => {
    if (activity.activityType === 'exercise') {
      try {
        await deleteExerciseEntry({ entryId: activity.entry._id });
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to delete workout');
      }
      return;
    }
    // Health-synced rows are informational and should not be deletable.
    if ((activity as any).synced) return;
    if (!activity.entry?._id) return;
    try {
      await deleteStepsEntry({ entryId: activity.entry._id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete steps entry');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── WIDGET CONFIG MODAL ── */}
      <Modal visible={showMoveWidgetConfig} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMoveWidgetConfig(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={mwStyles.header}>
            <Text style={mwStyles.title}>{t('move.widgets.title', 'Widget Config')}</Text>
            <TouchableOpacity onPress={() => setShowMoveWidgetConfig(false)} style={mwStyles.close}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 0, paddingBottom: 40 }}>
            <View style={mwStyles.darkRow}>
              <View style={mwStyles.darkLeft}>
                <Ionicons name="moon-outline" size={18} color="#6366f1" />
                <Text style={mwStyles.darkLabel}>{t('common.darkMode', 'Dark Mode')}</Text>
              </View>
              <Switch value={false} onValueChange={() => {}} trackColor={{ true: '#6366f1', false: '#e2e8f0' }} thumbColor="#fff" />
            </View>
            <View style={mwStyles.divider} />
            {MOVE_WIDGETS.map((w, i) => (
              <View key={w.id}>
                <View style={mwStyles.row}>
                  <Text style={mwStyles.emoji}>{w.emoji}</Text>
                  <Text style={mwStyles.label}>{t(w.labelKey, w.id)}</Text>
                  <Switch
                    value={isMW(w.id)}
                    onValueChange={() => toggleMoveWidget(w.id)}
                    trackColor={{ true: '#2563eb', false: '#e2e8f0' }}
                    thumbColor="#fff"
                  />
                </View>
                {i < MOVE_WIDGETS.length - 1 && <View style={mwStyles.divider} />}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
            ...(isTablet ? { alignItems: 'center' as const } : {}),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={isTablet ? { width: '100%', maxWidth: contentMaxWidth ?? 1000, alignSelf: 'center' } : undefined}>

          {/* Header */}
          <View style={[styles.header, { paddingTop: 12 }]}>
            <View style={[styles.headerContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>{t('move.title', 'Move')}</Text>
                <Text style={styles.subtitle}>{t('move.subtitle', 'Track your workouts and activity')}</Text>
              </View>
              <TouchableOpacity style={mwStyles.gearBtn} onPress={() => setShowMoveWidgetConfig(true)} activeOpacity={0.75}>
                <Settings2 size={17} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Activity Summary — 4 KPI cards matching home screen style */}
          {isMW('kpis') && <View style={[styles.activitySummary, isTablet && { justifyContent: 'space-between' }]}>
            {/* Workouts */}
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16) }]}>
              <View style={styles.kpiHead}>
                <Ionicons name="barbell" size={16} color="#2563eb" />
                <Text style={[styles.kpiLbl, { color: '#1e40af' }]} numberOfLines={1}>{t('move.workouts', 'Workouts')}</Text>
              </View>
              <Text style={styles.kpiVal} numberOfLines={1} adjustsFontSizeToFit>{todayTotals.workouts}</Text>
              <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: `${Math.min((todayTotals.workouts / 3) * 100, 100)}%` as any, backgroundColor: '#2563eb' }]} /></View>
              <Text style={styles.kpiSub} numberOfLines={1}>{t('common.today', 'Today')}</Text>
            </View>

            {/* Minutes */}
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16) }]}>
              <View style={styles.kpiHead}>
                <Ionicons name="time" size={16} color="#0891b2" />
                <Text style={[styles.kpiLbl, { color: '#0e7490' }]} numberOfLines={1}>{t('move.minutes', 'Minutes')}</Text>
              </View>
              <Text style={styles.kpiVal} numberOfLines={1} adjustsFontSizeToFit>{todayTotals.minutes}</Text>
              <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: `${Math.min((todayTotals.minutes / 60) * 100, 100)}%` as any, backgroundColor: '#0891b2' }]} /></View>
              <Text style={styles.kpiSub} numberOfLines={1}>{t('move.activeTime', 'Active Time')}</Text>
            </View>

            {/* Calories */}
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16) }]}>
              <View style={styles.kpiHead}>
                <Ionicons name="flash" size={16} color="#f59e0b" />
                <Text style={[styles.kpiLbl, { color: '#d97706' }]} numberOfLines={1}>{t('common.calories', 'Calories')}</Text>
              </View>
              <Text style={styles.kpiVal} numberOfLines={1} adjustsFontSizeToFit>{todayTotals.calories}</Text>
              <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: `${Math.min((todayTotals.calories / 500) * 100, 100)}%` as any, backgroundColor: '#f59e0b' }]} /></View>
              <Text style={styles.kpiSub} numberOfLines={1}>{t('move.burnedToday', 'Burned Today')}</Text>
            </View>

            {/* Steps */}
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16) }]}>
              <View style={styles.kpiHead}>
                <Ionicons name="locate" size={16} color="#8b5cf6" />
                <Text style={[styles.kpiLbl, { color: '#6d28d9' }]} numberOfLines={1}>{t('move.steps', 'Steps')}</Text>
              </View>
              <Text style={styles.kpiVal} numberOfLines={1} adjustsFontSizeToFit>
                {todayTotals.syncedSteps > todayTotals.steps ? todayTotals.syncedSteps.toLocaleString() : todayTotals.steps.toLocaleString()}
              </Text>
              <View style={styles.kpiBar}>
                <View style={[styles.kpiFill, { width: `${Math.min(((todayTotals.syncedSteps > todayTotals.steps ? todayTotals.syncedSteps : todayTotals.steps) / 10000) * 100, 100)}%` as any, backgroundColor: '#8b5cf6' }]} />
              </View>
              <Text style={styles.kpiSub} numberOfLines={1}>
                {todayTotals.syncedSteps > 0 && todayTotals.syncedSteps > todayTotals.steps ? t('move.syncedFromHealth', 'Synced from Health') : t('common.today', 'Today')}
              </Text>
              {todayTotals.syncedSteps > 0 && todayTotals.syncedSteps > todayTotals.steps && (
                <View style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Ionicons name="link" size={14} color="#8b5cf6" />
                </View>
              )}
            </View>
          </View>}

          {/* Program and Workouts Widget — always show, with subtle banner if free plan expired */}
          {isMW('swipeable') && (
            <>
              {freePlanExpired && (
                <TouchableOpacity
                  style={{ marginHorizontal: 24, marginTop: 20, marginBottom: 4, backgroundColor: '#1e293b', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
                  onPress={() => handleProFeature(t('move.continueJourney', 'Continue Your Journey'), t('move.freeUsers28DaysFull', 'Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with an AI-generated plan that adapts every cycle.'))}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed" size={18} color="#f59e0b" />
                  <Text style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{t('move.freePlanComplete', 'Blueprint complete — upgrade to continue')}</Text>
                  <View style={{ backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>{t('move.upgradeToPro', 'Go Pro')}</Text>
                  </View>
                </TouchableOpacity>
              )}
              <ProgramWorkoutWidget
                programName={`${t('common.weekNum', 'Week {{num}}', { num: currentWeekIndex + 1 })}: ${freePlanCurrentWeek?.theme ? t(`db.${freePlanCurrentWeek.theme.toLowerCase()}`, freePlanCurrentWeek.theme) : t('db.foundation', 'Foundation')}`}
                level={isPro ? 'Pro' : 'Beginner'}
                daysPerWeek={totalWorkoutsPerWeek}
                currentWeek={currentWeekIndex + 1}
                totalWeeks={4}
                progressPercent={Math.min(100, Math.floor((accountAgeMs / PLAN_DURATION_MS) * 100))}
                workouts={workouts as any}
                onInfoPress={() => { setWorkoutDetailTab(0); setShowWorkoutDetail(true); }}
                onWorkoutsPress={() => { setWorkoutDetailTab(0); setShowWorkoutDetail(true); }}
                onStartWorkout={(idx) => {
                  setWorkoutDetailTab(idx + 1 as any);
                  setWorkoutDetailMode('start');
                  setShowWorkoutDetail(true);
                }}
                onViewWorkout={(idx) => {
                  setWorkoutDetailTab(idx + 1 as any);
                  setWorkoutDetailMode('view');
                  setShowWorkoutDetail(true);
                }}
              />
            </>
          )}


          {/* Move Quick Actions & Insights */}
          {isMW('quickActions') && <MoveQuickActions
            onAddWorkout={() => {
              setExerciseSearchTarget('log');
              setShowExerciseSearch(true);
            }}
            onAddSteps={() => setShowStepsModal(true)}
            onCustomExercise={() => {
              setShowWorkoutModal(true);
              setShowCustomExercise(true);
            }}
            onViewPlan={() => {
              router.push('/four-week-plan');
            }}
          />}

          {/* Outdoor Activity - Hidden for Lite Build */}
          {/* <OutdoorActivityBanner onStart={() => setShowOutdoor(true)} /> */}

          {/* Today's Activities */}
          {isMW('todayActivities') && <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={styles.cardTitle}>{t('move.todaysActivities', "Today's Activities")}</Text>
                {!!syncedMetrics?.lastSync && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: Platform.OS === 'ios' ? '#fee2e2' : '#dbeafe',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}>
                    <Ionicons
                      name={Platform.OS === 'ios' ? 'heart' : 'logo-google'}
                      size={12}
                      color={Platform.OS === 'ios' ? '#ef4444' : '#4285F4'}
                    />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>{t('common.synced', 'Synced')}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="pulse" size={24} color="#2563eb" />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
              </View>
            ) : todayActivities.length > 0 ? (
              <View style={styles.activitiesList}>
                {(showAllActivities ? todayActivities : todayActivities.slice(0, 2)).map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityLeft}>
                      <View
                        style={[
                          styles.activityIconContainer,
                          {
                            backgroundColor:
                              activity.activityType === 'steps'
                                ? ((activity as any).origin === 'apple'
                                  ? '#fee2e2'
                                  : (activity as any).origin === 'google'
                                    ? '#dbeafe'
                                    : '#ede9fe')
                                : '#dbeafe',
                          },
                        ]}
                      >
                        {activity.activityType === 'steps' ? (
                          (activity as any).origin === 'apple' ? (
                            <Ionicons name="heart" size={16} color="#ef4444" />
                          ) : (activity as any).origin === 'google' ? (
                            <Ionicons name="logo-google" size={16} color="#4285F4" />
                          ) : (
                            <Ionicons name="pencil" size={16} color="#a855f7" />
                          )
                        ) : (
                          <Ionicons name="barbell" size={16} color="#2563eb" />
                        )}
                      </View>

                      <View style={styles.activityInfo}>
                        <Text style={styles.activityName}>
                          {typeof activity.name === 'object' && activity.name !== null
                            ? (activity.name as any).en
                            : activity.name}
                        </Text>
                        <Text style={styles.activityDetails}>
                          {activity.activityType === 'exercise' && activity.duration > 0
                            ? `${Math.round(activity.duration)} ${t('common.min', 'min')} • `
                            : ''}
                          {Math.round(activity.calories)} {t('common.cal', 'cal')}
                          {activity.activityType === 'exercise' && activity.entry.sets && activity.entry.reps
                            ? ` • ${Math.round(activity.entry.sets)}x${Math.round(activity.entry.reps)}`
                            : ''}
                          {activity.activityType === 'exercise' && activity.entry.weight
                            ? ` • ${Math.round(activity.entry.weight)}kg`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.activityRight}>
                      <Text style={styles.activityTime}>
                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {(activity.activityType !== 'steps' ||
                        !((activity as any).origin === 'apple' || (activity as any).origin === 'google')) ? (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(t('move.deleteActivity', "Delete Activity"), t('move.deleteConfirm', "Are you sure you want to delete this activity?"), [
                              { text: t('common.cancel', "Cancel"), style: 'cancel' },
                              {
                                text: t('common.delete', "Delete"),
                                style: 'destructive',
                                onPress: () => handleDeleteActivity(activity),
                              },
                            ]);
                          }}
                          activeOpacity={0.7}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash" size={18} color="#dc2626" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
                {todayActivities.length > 2 && (
                  <TouchableOpacity
                    style={styles.viewMoreBtn}
                    onPress={() => setShowAllActivities((s) => !s)}
                  >
                    <Text style={styles.viewMoreText}>
                      {showAllActivities ? t('common.showLess', 'Show Less') : t('move.viewMore', 'View {{count}} more activities', { count: todayActivities.length - 2 })}
                    </Text>
                    <Ionicons
                      name={showAllActivities ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#3b82f6"
                    />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="barbell" size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyStateText}>{t('move.noActivities', 'No activities yet')}</Text>
                <Text style={styles.emptyStateSubtext}>{t('move.logToStart', 'Log a workout or sync steps to get started')}</Text>
              </View>
            )}
          </View>}

          {isMW('moveInsights') && <MoveInsights isPro={!!isPro} onUpgradePress={() => {
            router.push('/move-insights');
          }} />}

        </View>{/* end tablet maxWidth wrapper */}
      </ScrollView>

      <ActiveWorkoutModal
        visible={showActiveWorkout}
        exercises={activeWorkoutExercises}
        onClose={() => setShowActiveWorkout(false)}
        onFinishWorkout={async (time, vol, sets, ex) => {
          try {
            if (convexUser) {
              await logExerciseEntry({
                userId: convexUser._id,
                exerciseName: `Day ${selectedDayIndex + 1}: ${workouts[selectedDayIndex]?.dayTitle || 'Workout'}`,
                exerciseType: 'strength',
                duration: Math.max(1, Math.floor(time / 60)),
                met: 6.0,
                date: currentDate,
              });
            }
          } catch (e) {
            console.error("Failed to log entry", e);
          }
          setShowActiveWorkout(false);
          setCompletedWorkoutsThisWeek(prev => Math.min(prev + 1, workouts.length * 4));
          Alert.alert(t('move.workoutCompleted', "Workout Completed!"), t('move.workoutSaved', "Great job! Your activity was saved."));
        }}
        onAddExercise={() => {
          if (!isPro) return handleProFeature(t('move.addExercise', 'Add Exercise'), t('move.proAddExerciseDesc', 'Upgrade to Pro to add exercises mid-workout.'));
          setExerciseSearchTarget('active_add');
          setShowExerciseSearch(true);
        }}
        onDeleteExercise={(exIdx) => {
          if (!isPro) return handleProFeature(t('move.removeExercise', 'Remove Exercise'), t('move.proRemoveExerciseDesc', 'Upgrade to Pro to remove exercises mid-workout.'));
          setActiveWorkoutExercises((prev) => prev.filter((_, i) => i !== exIdx));
        }}
      />

      <WorkoutDetailModal
        visible={showWorkoutDetail}
        routineDays={workouts as any}
        initialTab={workoutDetailTab as any}
        isPreviewMode={workoutDetailMode === 'start'}
        onStartActiveWorkout={(idx) => {
          setSelectedDayIndex(idx);
          const built: ActiveExercise[] = (workouts[idx]?.exercises ?? []).map((ex: any) => ({
            id: ex.id,
            name: ex.name,
            thumbnailUrl: ex.thumbnailUrl,
            videoUrl: ex.videoUrl,
            sets: Array.from({ length: typeof ex.sets === 'number' ? ex.sets : 3 }).map((_, i: number) => ({
              id: `${ex.id}-set-${i}`,
              weight: '',
              reps: typeof ex.reps === 'string' ? ex.reps.split('-')[0] : String(ex.reps),
              completed: false
            }))
          }));
          setActiveWorkoutExercises(built);
          // Open ActiveWorkoutModal FIRST so it is already mounted before the preview modal closes.
          // This prevents the brief flash of the Move screen background between transitions.
          setShowActiveWorkout(true);
          setTimeout(() => setShowWorkoutDetail(false), 80);
        }}
        onClose={() => setShowWorkoutDetail(false)}
        onAddExercise={(dayIdx) => {
          if (!isPro) return handleProFeature(t('move.addExercise', 'Add Exercise'), t('move.proAddExerciseDesc', 'Upgrade to Pro to add exercises to your plan.'));
          setPlanEditDayIndex(dayIdx);
          setExerciseSearchTarget('plan_add');
          setShowWorkoutDetail(false);
          setTimeout(() => setShowExerciseSearch(true), 100);
        }}
        onDeleteExercise={(id, dayIdx) => {
          if (!isPro) return handleProFeature(t('move.removeExercise', 'Remove Exercise'), t('move.proRemoveExerciseDesc', 'Upgrade to Pro to customize your routine.'));
          setWorkouts((prev) => {
            const next = [...prev];
            const day = next[dayIdx];
            if (!day) return prev;
            day.exercises = (day.exercises ?? []).filter((e: any) => String(e.id) !== String(id));
            next[dayIdx] = { ...day };
            return next;
          });
        }}
        onExercisePress={(ex) => {
          // Pass ALL exercise data so ExerciseDetailModal has everything to display
          setSelectedExerciseForDetail({
            _id: ex.id,
            name: ex.name,
            category: ex.primaryMuscle,
            type: ex.exerciseType ?? ex.exerciseTypes?.[0] ?? 'Strength',
            exerciseType: ex.exerciseType,
            exerciseTypes: ex.exerciseTypes,
            muscleGroups: [ex.primaryMuscle],
            primaryMuscles: [ex.primaryMuscle],
            secondaryMuscles: ex.secondaryMuscles ?? [],
            thumbnailUrl: ex.thumbnailUrl,
            videoUrl: ex.videoUrl,
            instructions: ex.instructions ?? [],
            instructionsLocalizations: ex.instructionsLocalizations,
            equipment: ex.equipment,
            fromRoutine: true, // ← free users can see full details for plan exercises
          } as any);
          // Open detail first to avoid flash of move screen
          setShowExerciseDetail(true);
          setTimeout(() => setShowWorkoutDetail(false), 80);
        }}
        isPro={!!isPro}
      />

      <ExerciseSearchModal
        visible={showExerciseSearch}
        searchResults={
          (exerciseSearchTarget === 'plan_add' || exerciseSearchTarget === 'active_add')
            ? (videoWorkoutExercises as any)
            : (searchResults as any)
        }
        loading={
          (exerciseSearchTarget === 'plan_add' || exerciseSearchTarget === 'active_add')
            ? (dbWorkouts === undefined)
            : searchLoading
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExerciseSelect={(ex) => {
          setSelectedExerciseForDetail(ex);
          if (exerciseSearchTarget === 'log') {
            setShowExerciseSearch(false);
            setTimeout(() => setShowSingleExerciseLog(true), 50);
          } else if (exerciseSearchTarget === 'plan_add') {
            setWorkouts((prev) => {
              const next = [...prev];
              const day = next[planEditDayIndex];
              if (!day) return prev;
              const muscle =
                Array.isArray((ex as any).muscleGroups) && (ex as any).muscleGroups.length
                  ? (ex as any).muscleGroups[0]
                  : ((ex as any).category ?? 'Full body');
              const newEx = {
                id: (ex as any)._id ?? (ex as any).id ?? `add-${Date.now()}`,
                name: typeof (ex as any).name === 'object' ? (ex as any).name.en : (ex as any).name,
                thumbnailUrl: (ex as any).thumbnailUrl,
                primaryMuscle: muscle,
                equipment: (ex as any).equipment ?? 'Varies',
                sets: 3,
                reps: '10',
              };
              day.exercises = [...(day.exercises ?? []), newEx];
              next[planEditDayIndex] = { ...day };
              return next;
            });
            setShowExerciseSearch(false);
          } else if (exerciseSearchTarget === 'active_add') {
            const newActive: ActiveExercise = {
              id: (ex as any)._id ?? (ex as any).id ?? `active-${Date.now()}`,
              name: typeof (ex as any).name === 'object' ? (ex as any).name.en : (ex as any).name,
              thumbnailUrl: (ex as any).thumbnailUrl,
              videoUrl: (ex as any).videoUrl,
              sets: Array.from({ length: 3 }).map((_, i: number) => ({
                id: `${String((ex as any)._id ?? (ex as any).id ?? 'x')}-set-${i}-${Date.now()}`,
                weight: '',
                reps: '10',
                completed: false,
              })),
            };
            setActiveWorkoutExercises((prev) => [...prev, newActive]);
            setShowExerciseSearch(false);
          } else {
            setShowExerciseSearch(false);
            setTimeout(() => setShowExerciseDetail(true), 50);
          }
        }}
        onClose={() => setShowExerciseSearch(false)}
      />

      <SingleExerciseLogModal
        visible={showSingleExerciseLog}
        exercise={selectedExerciseForDetail ? {
          id: selectedExerciseForDetail._id || selectedExerciseForDetail.id,
          name: typeof selectedExerciseForDetail.name === 'object' ? selectedExerciseForDetail.name.en : selectedExerciseForDetail.name,
          thumbnailUrl: selectedExerciseForDetail.thumbnailUrl,
          type: selectedExerciseForDetail.type,
          caloriesPerMinute: selectedExerciseForDetail.caloriesPerMinute,
        } : null}
        onClose={() => setShowSingleExerciseLog(false)}
        onSave={async (exId, data) => {
          setShowSingleExerciseLog(false);
          try {
            let totalWeight = 0;
            let totalReps = 0;
            if (data.sets) {
              totalWeight = data.sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0), 0);
              totalReps = data.sets.reduce((acc, s) => acc + (parseInt(s.reps) || 0), 0);
            }

            // Assuming logExerciseEntry is defined elsewhere and handles Convex mutation
            if (!convexUser?._id) {
              Alert.alert(t('common.error', 'Error'), t('move.errorProfile', 'User profile not loaded. Cannot log workout.'));
              return;
            }

            const src = selectedExerciseForDetail ?? selectedExercise;
            const etype = (src?.type ?? 'strength') as 'strength' | 'cardio' | 'yoga' | 'hiit';
            const eName = typeof src?.name === 'string'
              ? src.name
              : (src?.name as any)?.en || t('move.manualWorkout', 'Manual Workout');

            await logExerciseEntry({
              userId: convexUser._id,
              exerciseName: eName as string,
              exerciseType: etype,
              duration: data.duration ?? (data.sets ? Math.max(12, data.sets.length * 6) : 30),
              met: src?.caloriesPerMinute ? src.caloriesPerMinute / 1.5 : 5,
              sets: data.sets?.length || 0,
              reps: totalReps,
              weight: totalWeight,
              distance: data.distanceKm,
              pace: data.pace,
              date: new Date().toISOString().split('T')[0]
            });
            Alert.alert(t('move.workoutLogged', 'Workout Logged'), t('move.exerciseSaved', 'Your exercise was successfully saved!'));
          } catch (e) {
            console.error("Failed to log entry", e);
            Alert.alert(t('common.error', 'Error'), t('move.errorLog', 'Could not log exercise'));
          }
        }}
      />

      <ExerciseDetailModal
        visible={showExerciseDetail}
        exercise={selectedExerciseForDetail}
        isPro={!!isPro}
        freeAccess={!!selectedExerciseForDetail?.fromRoutine}
        onClose={() => setShowExerciseDetail(false)}
        onUpgradePress={() => { setShowExerciseDetail(false); router.push('/premium'); }}
      />

      <OutdoorActivityModal
        visible={showOutdoor}
        onClose={() => setShowOutdoor(false)}
      />
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{showCustomExercise ? t('move.createCustomExercise', 'Create Custom Exercise') : t('move.logWorkout', 'Log Workout')}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowWorkoutModal(false);
                setShowCustomExercise(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {showCustomExercise && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('move.exerciseName', 'Exercise Name')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('move.exerciseName', 'Exercise Name')}
                    value={customExerciseForm.name}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, name: text })}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('move.descriptionOpt', 'Description (Optional)')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('move.descriptionOpt', 'Description (Optional)')}
                    value={customExerciseForm.description}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, description: text })}
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('move.durationMin', 'Duration (minutes)')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('move.durationMin', 'Duration (minutes)')}
                    value={customExerciseForm.duration}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, duration: text })}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('move.caloriesBurned', 'Calories Burned')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('move.caloriesBurned', 'Calories Burned')}
                    value={customExerciseForm.calories}
                    onChangeText={(text) => setCustomExerciseForm({ ...customExerciseForm, calories: text })}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => {
                      setShowCustomExercise(false);
                      setShowWorkoutModal(false);
                    }}
                  >
                    <Text style={styles.modalButtonSecondaryText}>{t('common.cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      (!customExerciseForm.name || !customExerciseForm.duration || !customExerciseForm.calories) && styles.modalButtonDisabled,
                    ]}
                    onPress={logCustomExercise}
                    disabled={!customExerciseForm.name || !customExerciseForm.duration || !customExerciseForm.calories}
                  >
                    <Text style={styles.modalButtonText}>{t('move.logExercise', 'Log Exercise')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showStepsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStepsModal(false)}
      >
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('move.addSteps', 'Add Steps')}</Text>
            <TouchableOpacity onPress={() => setShowStepsModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalScroll]}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('move.enterStepsCount', 'Enter steps count')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('move.enterStepsCount', 'Enter steps count')}
                value={stepsInput}
                onChangeText={setStepsInput}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowStepsModal(false)}>
                <Text style={styles.modalButtonSecondaryText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, (!stepsInput || isSubmittingSteps) && styles.modalButtonDisabled]}
                onPress={addSteps}
                disabled={!stepsInput || isSubmittingSteps}
              >
                {isSubmittingSteps ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonText}>{t('move.addSteps', 'Add Steps')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plusButton: {
    backgroundColor: '#3b82f6',
  },
  plusMenu: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  plusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  plusMenuText: {
    fontSize: 14,
    color: '#1e293b',
  },
  activitySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kpiLbl: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  kpiBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  kpiFill: {
    height: '100%' as any,
    borderRadius: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    minHeight: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
    minHeight: 28,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    minHeight: 14,
  },
  addStepsLink: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
  },

  sectionContainer: { marginBottom: 24, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', paddingHorizontal: 20, marginBottom: 12 },
  routineCard: { width: 160, height: 140, marginRight: 12, borderRadius: 16, overflow: 'hidden' },
  routineGradient: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  routineName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  routineStats: { fontSize: 12, color: '#e0e7ff' },

  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },

  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deleteButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  achievementsList: {
    gap: 12,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    flexBasis: '48%',
    maxWidth: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  achievementContent: {
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementCardDesc: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 8,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  // Modal styles
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  searchExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchExerciseButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  selectedExerciseCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  selectedExerciseCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  estimatedCalories: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  categoriesScroll: {
    marginBottom: 16,
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  exerciseResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  exerciseResultInfo: {
    flex: 1,
  },
  exerciseResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exerciseResultCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  exerciseResultMuscles: {
    fontSize: 12,
    color: '#94a3b8',
  },
  exerciseResultAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

// Widget config modal styles
const mwStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  close: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  emoji: { fontSize: 20 },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  darkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  darkLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  darkLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  gearBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
});
