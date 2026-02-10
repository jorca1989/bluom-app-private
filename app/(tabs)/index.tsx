import React, { useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getTodayISO } from '@/utils/dates';
import { sendStepReminder } from '@/utils/notifications';
import {
  Dumbbell,
  Utensils,
  Play,
  Moon,
  TrendingUp,
  ChevronRight,
  TrendingDown,
  Timer,
  Footprints,
  Gem,
  Zap,
  Locate,
  MessageSquare,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  Music,
  ShoppingBag,
  Droplets,
  Scale,
  Smile,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
} from 'lucide-react-native';
import { CircularProgress } from '@/components/CircularProgress';
import { useAccessControl } from '@/hooks/useAccessControl';
import CoachMark from '@/components/CoachMark';
import NorthStarWidget from '@/components/NorthStarWidget';



const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // removed usage of useTranslation
  const { user: clerkUser } = useUser();
  const { isLoading: isAccessLoading } = useAccessControl();
  const [showAllDiscovery, setShowAllDiscovery] = useState(false);
  const [showBlueprintCoach, setShowBlueprintCoach] = useState(false);

  useEffect(() => {
    // Coach marks disabled
    /*
    SecureStore.getItemAsync('bluom_show_coach_marks').then(val => {
      if (val === 'true') {
        setShowBlueprintCoach(true);
      }
    });
    */
  }, []);
  const todayISO = useMemo(() => getTodayISO(), []);

  // -- Queries --
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const dailyMacros = useQuery(
    api.daily.getDailyMacros,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const foodTotals = useQuery(
    api.food.getDailyTotals,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const caloriesBurned = useQuery(
    api.exercise.getTotalCaloriesBurned,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const moodLog = useQuery(
    api.wellness.getMoodForDate,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  const stepEntriesToday = useQuery(
    api.steps.getStepsEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: todayISO } : 'skip'
  );

  // -- Derived Data --
  const steps = useMemo(() => {
    if (!stepEntriesToday) return 0;
    return stepEntriesToday.reduce((acc, entry) => acc + entry.steps, 0);
  }, [stepEntriesToday]);

  const burned = caloriesBurned ?? 0;

  // Goals & Totals
  const goalCalories = convexUser?.dailyCalories ?? 2000;
  const todayFoodCalories = foodTotals?.calories ?? 0;
  const remainingCalories = goalCalories - todayFoodCalories + burned;

  const waterOz = dailyMacros?.waterOz ?? 0;
  const prefersMetricVolume = (convexUser?.preferredUnits?.volume ?? 'ml') === 'ml';

  // Water goal: ~30ml/kg
  const weightKg = convexUser?.weight ?? 70;
  const prefersLbs = (convexUser?.preferredUnits?.weight ?? 'kg') === 'lbs';
  const weightDisplay = prefersLbs ? weightKg * 2.2046226218 : weightKg;
  const weightUnitLabel = prefersLbs ? 'lb' : 'kg';
  const waterGoalMl = weightKg > 0 ? Math.round(weightKg * 30) : 2000;
  const waterGoalOz = Math.round(waterGoalMl * 0.033814);
  const waterGoalDisplay = prefersMetricVolume ? waterGoalMl : waterGoalOz;

  // -- Vitality Score Calculation --
  // 40% Steps, 30% Mood, 30% Fuel
  const stepsScore = Math.min(steps / 10000, 1) * 100;

  const moodVal = moodLog?.mood ?? 0;
  const moodScore = (moodVal / 5) * 100;

  const calScore = Math.min(todayFoodCalories / goalCalories, 1);
  const waterScore = Math.min(waterOz / Math.max(1, waterGoalOz), 1);
  const fuelScore = ((calScore + waterScore) / 2) * 100;

  // Only calculate if we have some data interaction, else 0? 
  // Or just calculate raw. If missing mood, it's 0.
  const vitalityScore = Math.round(
    (stepsScore * 0.4) + (moodScore * 0.3) + (fuelScore * 0.3)
  );

  const hasMood = !!moodLog;
  const hasFood = todayFoodCalories > 0;
  const hasSteps = steps > 0;
  const dataMissing = !hasMood && !hasFood && !hasSteps;


  // -- Discovery Items --
  const discoveryItems = useMemo(() => [
    { Icon: MessageSquare, label: 'AI Coach', path: '/ai-coach', color: '#2563eb', bgColor: '#eff6ff' },
    { Icon: ({ size, color }: { size?: number; color?: string }) => <Text style={{ fontSize: (size ?? 24) + 2, color: color ?? '#db2777' }}>♀</Text>, label: "Women", path: '/womens-health', color: '#db2777', bgColor: '#fdf2f8' },
    { Icon: ({ size, color }: { size?: number; color?: string }) => <Text style={{ fontSize: (size ?? 24) + 2, color: color ?? '#3b82f6' }}>♂</Text>, label: "Men", path: '/mens-health', color: '#3b82f6', bgColor: '#eff6ff' },
    { Icon: Clock, label: 'Fasting', path: '/fasting', color: '#f59e0b', bgColor: '#fffbeb' },
    { Icon: BookOpen, label: 'Library', path: '/library', color: '#10b981', bgColor: '#ecfdf5' },
    { Icon: CheckCircle, label: 'Productivity', path: '/todo-list', color: '#8b5cf6', bgColor: '#f5f3ff' },
    // { Icon: Music, label: 'Radio', path: '/music-hub', color: '#8b5cf6', bgColor: '#f5f3ff' }, // hidden per request
    { Icon: Timer, label: 'Focus Mode', path: '/focus-mode', color: '#3b82f6', bgColor: '#eff6ff' },
    { Icon: Utensils, label: 'Recipes', path: '/recipes', color: '#f97316', bgColor: '#fff7ed' },
    { Icon: ShoppingBag, label: 'Shop', path: '/shop', color: '#2563eb', bgColor: '#eff6ff' },
    { Icon: Play, label: 'Workouts', path: '/workouts', color: '#16a34a', bgColor: '#f0fdf4' },
    { Icon: TrendingDown, label: 'Metabolic Hub', path: '/sugar-dashboard', color: '#ef4444', bgColor: '#fee2e2' },
  ] as const, []);

  const displayedItems = showAllDiscovery ? discoveryItems : discoveryItems.slice(0, 6);

  // Weekly chart data (mock data for now, consistent with previous version)
  const weekData = [1, 3, 2, 4, 3, 5, 4];
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Trigger notifications
  useEffect(() => {
    const stepGoal = 10000;
    if (steps > 0 && steps < stepGoal) {
      sendStepReminder(steps, stepGoal);
    }
  }, [steps]);

  // -- Loading State --
  const isLoading = isAccessLoading || !convexUser;
  const resetOnboarding = useMutation(api.users.resetOnboarding);

  const hasCompletedOnboarding = (convexUser?.age ?? 0) > 0 && (convexUser?.weight ?? 0) > 0 && (convexUser?.height ?? 0) > 0;

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'Are you sure you want to reset your onboarding data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (convexUser) {
              await resetOnboarding({ userId: convexUser._id });
              router.replace('/onboarding');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Please complete onboarding first.</Text>

          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: '#fff',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
            activeOpacity={0.7}
            onPress={handleResetOnboarding}
          >
            <RefreshCcw size={18} color="#f97316" />
            <Text style={{ color: '#1e293b', fontWeight: '600', fontSize: 15 }}>Restart Onboarding</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 100, height: 32, marginBottom: 16 }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Vitality Score</Text>
            <CoachMark
              visible={showBlueprintCoach}
              message="New! Your AI Blueprint starts here."
              onClose={() => {
                setShowBlueprintCoach(false);
                SecureStore.deleteItemAsync('bluom_show_coach_marks');
              }}
              position="bottom"
            />
          </View>
          <View style={styles.vitalityContainer}>
            <View style={styles.vitalityCircleWrap}>
              <CircularProgress
                progress={vitalityScore / 100}
                size={140}
                strokeWidth={14}
                trackColor="#e2e8f0"
                progressColor={vitalityScore > 70 ? '#10b981' : vitalityScore > 40 ? '#3b82f6' : '#f59e0b'}
              />
              <View style={styles.vitalityCenterText}>
                <Text style={styles.vitalityScore}>{dataMissing ? '--' : vitalityScore}</Text>
                <Text style={styles.vitalityLabel}>Score</Text>
              </View>
            </View>
            <Text style={styles.vitalityDescription}>
              {dataMissing
                ? 'Log your data to see your score.'
                : 'Your daily snapshot based on meals, exercise and mood.'}
            </Text>
          </View>
        </View>



        {/* -- 2. Today's Balance -- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Daily Balance</Text>
          </View>
          <View style={styles.equationContainer}>
            <View style={styles.equationItem}>
              <Text style={styles.eqLabel}>Goal</Text>
              <Text style={styles.eqValue}>{Math.round(goalCalories)}</Text>
            </View>
            <Text style={styles.eqOperator}>-</Text>
            <View style={styles.equationItem}>
              <Text style={styles.eqLabel}>Food</Text>
              <Text style={[styles.eqValue, { color: '#16a34a' }]}>{Math.round(todayFoodCalories)}</Text>
            </View>
            <Text style={styles.eqOperator}>+</Text>
            <View style={styles.equationItem}>
              <Text style={styles.eqLabel}>Active</Text>
              <Text style={[styles.eqValue, { color: '#f97316' }]}>{Math.round(burned)}</Text>
            </View>
            <Text style={styles.eqOperator}>=</Text>
            <View style={styles.equationItem}>
              <Text style={styles.eqLabel}>Remaining</Text>
              <Text style={[styles.eqValue, { color: remainingCalories >= 0 ? '#2563eb' : '#dc2626' }]}>
                {Math.round(remainingCalories)}
              </Text>
            </View>
          </View>
        </View>

        {/* -- 3. KPI Grid (2x2) -- */}
        <View style={styles.gridContainer}>
          {/* Steps */}
          <View style={[styles.gridCard, { backgroundColor: '#eff6ff' }]}>
            <View style={styles.gridIconRow}>
              <Footprints size={20} color="#2563eb" />
              <Text style={[styles.gridLabel, { color: '#1e40af' }]}>Steps</Text>
            </View>
            <Text style={styles.gridValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.gridSub}>/ 10,000</Text>
          </View>

          {/* Water */}
          <View style={[styles.gridCard, { backgroundColor: '#ecfeff' }]}>
            <View style={styles.gridIconRow}>
              <Droplets size={20} color="#06b6d4" />
              <Text style={[styles.gridLabel, { color: '#0e7490' }]}>Water</Text>
            </View>
            <Text style={styles.gridValue}>
              {prefersMetricVolume ? Math.round(waterOz * 29.5735) : Math.round(waterOz)}
              <Text style={{ fontSize: 16 }}>{prefersMetricVolume ? 'ml' : 'oz'}</Text>
            </Text>
            <Text style={styles.gridSub}>
              / {waterGoalDisplay}
              {prefersMetricVolume ? 'ml' : 'oz'}
            </Text>
          </View>

          {/* Mood */}
          <View style={[styles.gridCard, { backgroundColor: '#f5f3ff' }]}>
            <View style={styles.gridIconRow}>
              <Smile size={20} color="#8b5cf6" />
              <Text style={[styles.gridLabel, { color: '#5b21b6' }]}>Mood</Text>
            </View>
            <Text style={styles.gridValue}>{moodLog?.moodEmoji ?? '--'}</Text>
            <Text style={styles.gridSub}>{hasMood ? 'Logged' : 'No Entry'}</Text>
          </View>

          {/* Weight */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: '#f8fafc' }]}
            onPress={() => router.push('/weight-management')}
            activeOpacity={0.7}
          >
            <View style={styles.gridIconRow}>
              <Scale size={20} color="#475569" />
              <Text style={[styles.gridLabel, { color: '#334155' }]}>Weight</Text>
            </View>
            <Text style={styles.gridValue}>
              {Math.round(weightDisplay)}
              <Text style={{ fontSize: 16 }}>{weightUnitLabel}</Text>
            </Text>
            <Text style={styles.gridSub}>Track Now</Text>
          </TouchableOpacity>
        </View>

        {/* -- 4. Health Trend Chart -- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Trends</Text>
            <TrendingUp size={20} color="#16a34a" />
          </View>
          <View style={styles.chartContainer}>
            {weekData.map((val, idx) => (
              <View key={idx} style={styles.chartCol}>
                <View style={[styles.chartBar, { height: val * 16 }]} />
                <Text style={styles.chartDay}>{weekDays[idx]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartCaption}>Activity vs Goal over the last 7 days</Text>
        </View>

        {/* -- 5. Discovery Grid -- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Discover</Text>
            </View>
          </View>

          <View style={styles.discoveryGrid}>
            {displayedItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.discoveryItem}
                onPress={() => item.path && router.push(item.path as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.discoveryIconBox, { backgroundColor: item.bgColor }]}>
                  <item.Icon size={24} color={item.color} />
                </View>
                <Text style={styles.discoveryLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          <TouchableOpacity
            onPress={() => setShowAllDiscovery(!showAllDiscovery)}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleBtnText}>{showAllDiscovery ? 'Show Less' : 'View More'}</Text>
            {showAllDiscovery ? (
              <ChevronUp size={16} color="#2563eb" />
            ) : (
              <ChevronDown size={16} color="#2563eb" />
            )}
          </TouchableOpacity>
        </View>

        {/* -- North Star -- */}
        <NorthStarWidget
          goal={convexUser?.twelveMonthGoal}
          onPress={() => router.push('/wellness?showLifeGoals=true')}
        />

      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  vitalityContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  vitalityCircleWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  vitalityCenterText: {
    position: 'absolute',
    alignItems: 'center',
  },
  vitalityScore: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 40,
  },
  vitalityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  vitalityDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  proPricing: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  equationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equationItem: {
    alignItems: 'center',
  },
  eqLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eqValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  eqOperator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginTop: 14, // visual alignment
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    width: (width - 40 - 12) / 2, // screen padding 20*2=40, gap 12
    padding: 16,
    borderRadius: 20,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  gridIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  gridValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 12,
  },
  chartCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  chartBar: {
    width: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  chartDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  chartCaption: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  discoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8, // compensate padding
  },
  discoveryItem: {
    width: '33.33%',
    alignItems: 'center',
    padding: 8,
    marginBottom: 12,
  },
  discoveryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  discoveryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    gap: 4,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
});
