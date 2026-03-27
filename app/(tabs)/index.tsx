import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  Animated,
  Modal,
  Switch,
  Platform,
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
  TrendingUp,
  Timer,
  Footprints,
  MessageSquare,
  Clock,
  BookOpen,
  CheckCircle,
  Droplets,
  Scale,
  Smile,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Settings2,
  X,
  Flame,
  Sparkles,
  TrendingDown,
  Moon,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from '@/components/CircularProgress';
import { useAccessControl } from '@/hooks/useAccessControl';
import NorthStarWidget from '@/components/NorthStarWidget';
import AchievementsCard from '@/components/achievementcard';
import { useResponsive } from '@/utils/responsive';
import Avatar, { AvatarConfig } from '@/components/Avatar';
// IMPORTANT: don't import expo-location at module scope.
// If the current binary wasn't rebuilt after installing expo-location,
// a static import will crash the app with "Cannot find native module 'ExpoLocation'".

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// WIDGET CONFIG
// ─────────────────────────────────────────────────────────────
type WidgetId =
  | 'weather'
  | 'greeting'
  | 'vitality'
  | 'balance'
  | 'kpis'
  | 'achievements'
  | 'quick_actions'
  | 'trends'
  | 'discover'
  | 'north_star';

interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  emoji: string;
  defaultEnabled: boolean;
}

const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: 'weather', label: 'Local Weather', description: 'Real-time temperature & conditions', emoji: '☁️', defaultEnabled: true },
  { id: 'greeting', label: 'Morning Briefing', description: 'Personalised greeting & daily tone-setter', emoji: '☀️', defaultEnabled: true },
  { id: 'vitality', label: 'Vitality Score', description: 'Steps · Mood · Fuel performance snapshot', emoji: '⚡', defaultEnabled: true },
  { id: 'balance', label: 'Calorie Balance', description: 'Goal − Food + Active = Remaining', emoji: '🔥', defaultEnabled: true },
  { id: 'kpis', label: 'Health KPIs', description: 'Steps · Water · Mood · Weight cards', emoji: '📊', defaultEnabled: true },
  { id: 'achievements', label: 'Achievements', description: 'Your XP, tokens & latest unlocks', emoji: '🏆', defaultEnabled: true },
  { id: 'quick_actions', label: 'Quick Log', description: 'One-tap shortcuts to log anything fast', emoji: '⚡', defaultEnabled: true },
  { id: 'trends', label: 'Weekly Trends', description: '7-day activity overview', emoji: '📈', defaultEnabled: true },
  { id: 'discover', label: 'Discover Hub', description: 'All features in one glance', emoji: '🧭', defaultEnabled: true },
  { id: 'north_star', label: 'North Star Goal', description: 'Your 12-month milestone reminder', emoji: '🌟', defaultEnabled: true },
];

const STORAGE_KEY = 'bluom_home_widgets_v2';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getGreeting(name: string, hour: number) {
  if (hour < 5) return { line1: `Still at it, ${name}?`, line2: 'Make it count.', accent: '#6366f1' };
  if (hour < 12) return { line1: `Good morning, ${name}.`, line2: 'Set the tone for today.', accent: '#f59e0b' };
  if (hour < 17) return { line1: `Afternoon, ${name}.`, line2: 'Stay sharp, stay focused.', accent: '#2563eb' };
  if (hour < 21) return { line1: `Evening, ${name}.`, line2: 'Wind down with intention.', accent: '#8b5cf6' };
  return { line1: `Night mode, ${name}.`, line2: 'Recovery is part of the grind.', accent: '#0ea5e9' };
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isLoading: isAccessLoading } = useAccessControl();
  const { isTablet, contentMaxWidth, discoveryColumns } = useResponsive();

  const [enabledWidgets, setEnabledWidgets] = useState<Set<WidgetId>>(
    new Set(WIDGET_REGISTRY.filter(w => w.defaultEnabled).map(w => w.id))
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAllDiscover, setShowAllDiscover] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const todayISO = useMemo(() => getTodayISO(), []);
  const hour = new Date().getHours();

  // ── Queries ──
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
  const systemStatus = useQuery(api.system.getSystemStatus);
  const resetOnboarding = useMutation(api.users.resetOnboarding);
  const syncedMetrics = useQuery(
    api.integrations.getTodayMetrics,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  // ── Derived values ──
  const steps = useMemo(() =>
    (stepEntriesToday ?? []).reduce((a, e) => a + e.steps, 0), [stepEntriesToday]);
  const stepCalories = useMemo(() =>
    (stepEntriesToday ?? []).reduce((a: number, e: any) => a + (e.caloriesBurned ?? 0), 0), [stepEntriesToday]);

  const burned = (caloriesBurned ?? 0) + stepCalories;
  const goalCalories = convexUser?.dailyCalories ?? 2000;
  const todayFood = foodTotals?.calories ?? 0;
  const remaining = goalCalories - todayFood + burned;
  const overBudget = remaining < 0;

  const waterOz = dailyMacros?.waterOz ?? 0;
  const weightKg = convexUser?.weight ?? 70;
  const prefersLbs = (convexUser?.preferredUnits?.weight ?? 'kg') === 'lbs';
  const prefersMetric = (convexUser?.preferredUnits?.volume ?? 'ml') === 'ml';
  const weightDisplay = prefersLbs ? (weightKg * 2.2046).toFixed(1) : weightKg;
  const weightUnit = prefersLbs ? 'lb' : 'kg';
  const waterGoalOz = Math.round(weightKg * 30 * 0.033814);
  const waterGoalDisplay = prefersMetric ? Math.round(weightKg * 30) : waterGoalOz;
  const waterDisplay = prefersMetric ? Math.round(waterOz * 29.5735) : Math.round(waterOz);
  const waterUnit = prefersMetric ? 'ml' : 'oz';

  const stepsScore = Math.min(steps / 10000, 1) * 100;
  const moodScore = ((moodLog?.mood ?? 0) / 5) * 100;
  const fuelScore = ((Math.min(todayFood / goalCalories, 1) + Math.min(waterOz / Math.max(1, waterGoalOz), 1)) / 2) * 100;
  const vitalityScore = Math.round(stepsScore * 0.4 + moodScore * 0.3 + fuelScore * 0.3);
  const dataMissing = !moodLog && todayFood === 0 && steps === 0;

  const vitalityColor = vitalityScore > 70 ? '#10b981' : vitalityScore > 40 ? '#2563eb' : '#f59e0b';
  const vitalityLabel = vitalityScore > 70 ? 'Excellent' : vitalityScore > 40 ? 'On Track' : 'Needs Work';

  const firstName = convexUser?.name?.split(' ')[0] ?? clerkUser?.firstName ?? 'there';
  const greeting = getGreeting(firstName, hour);

  // Avatar (used in greeting card, replaces duplicate logo)
  const AVATAR_CONFIG_KEY = 'bluom_avatar_config_v2';
  const [homeAvatar, setHomeAvatar] = useState<AvatarConfig>({
    seed: clerkUser?.id ?? 'bluom-user',
    top: 'shortFlat',
    hairColor: '111827',
    eyes: 'happy',
    eyebrows: 'defaultNatural',
    mouth: 'smile',
    facialHair: 'none',
    facialHairColor: '111827',
    skinColor: 'f5d0a0',
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(AVATAR_CONFIG_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        const fixHex = (v: any) => {
          const s = String(v ?? '');
          return s.startsWith('#') ? s.slice(1) : s;
        };
        setHomeAvatar((prev) => ({
          ...prev,
          ...parsed,
          seed: parsed.seed ?? prev.seed,
          hairColor: fixHex(parsed.hairColor ?? prev.hairColor),
          skinColor: fixHex(parsed.skinColor ?? prev.skinColor),
          facialHairColor: fixHex(parsed.facialHairColor ?? prev.facialHairColor),
        }));
      } catch {
        // ignore
      }
    })();
  }, [clerkUser?.id]);

  // ── Weather ──
  const [weather, setWeather] = useState<{
    tempC: number;
    highC: number;
    lowC: number;
    condition: string;
    location: string;
    icon: keyof typeof Ionicons.glyphMap;
    updatedAt: number;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherPerm, setWeatherPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const wmoToCondition = (code: number): { condition: string; icon: keyof typeof Ionicons.glyphMap } => {
    if (code === 0) return { condition: 'Clear', icon: 'sunny' };
    if ([1, 2].includes(code)) return { condition: 'Mostly Clear', icon: 'partly-sunny' };
    if (code === 3) return { condition: 'Cloudy', icon: 'cloudy' };
    if ([45, 48].includes(code)) return { condition: 'Fog', icon: 'cloud' };
    if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: 'rainy' };
    if (code >= 61 && code <= 67) return { condition: 'Rain', icon: 'rainy' };
    if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow' };
    if (code >= 80 && code <= 82) return { condition: 'Showers', icon: 'rainy' };
    if (code >= 95) return { condition: 'Thunderstorm', icon: 'thunderstorm' };
    return { condition: 'Weather', icon: 'partly-sunny' };
  };

  const refreshWeather = useCallback(async (requestPermission: boolean) => {
    if (!enabledWidgets.has('weather')) return;
    setWeatherLoading(true);
    try {
      const Location = await import('expo-location').then(m => m).catch(() => null as any);
      if (!Location?.getForegroundPermissionsAsync) {
        setWeatherPerm('denied');
        setWeather(null);
        return;
      }

      const currentPerm = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (currentPerm.status !== 'granted') {
        setWeatherPerm('denied');
        setWeather(null);
        return;
      }
      setWeatherPerm('granted');

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => [] as any[]);
      const locationLabel =
        (place?.city || place?.district || place?.subregion || place?.region || place?.country || 'Your Area') as string;

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=1`;

      const resp = await fetch(url);
      const data = await resp.json();

      const tempC = Math.round(Number(data?.current?.temperature_2m ?? 0));
      const code = Number(data?.current?.weather_code ?? 0);
      const highC = Math.round(Number((data?.daily?.temperature_2m_max ?? [tempC])[0]));
      const lowC = Math.round(Number((data?.daily?.temperature_2m_min ?? [tempC])[0]));
      const mapped = wmoToCondition(code);

      setWeather({
        tempC,
        highC,
        lowC,
        condition: mapped.condition,
        location: locationLabel,
        icon: mapped.icon,
        updatedAt: Date.now(),
      });
    } catch {
      // Keep whatever last value we have; show a subtle error in the card.
      setWeatherPerm((p) => (p === 'unknown' ? 'denied' : p));
    } finally {
      setWeatherLoading(false);
    }
  }, [enabledWidgets]);

  useEffect(() => {
    if (!enabledWidgets.has('weather')) return;
    refreshWeather(false);
  }, [enabledWidgets, refreshWeather]);

  const maintenanceMode = systemStatus?.aiMaintenanceMode ?? false;
  const maintenanceBanner = systemStatus?.bannerMessage ?? 'AI services are under maintenance.';
  const hasOnboarded = (convexUser?.age ?? 0) > 0 && (convexUser?.weight ?? 0) > 0;

  // ── Persist widget prefs ──
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then(val => {
      if (val) {
        try { setEnabledWidgets(new Set(JSON.parse(val) as WidgetId[])); } catch { }
      }
    });
  }, []);

  const toggleWidget = useCallback((id: WidgetId) => {
    setEnabledWidgets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // ── Fade-in on mount ──
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (steps > 0 && steps < 10000) sendStepReminder(steps, 10000);
  }, [steps]);

  const isW = (id: WidgetId) => enabledWidgets.has(id);

  const handleNav = (path: string) => {
    if (maintenanceMode && path === '/ai-coach') {
      Alert.alert('Maintenance', 'AI Coach is temporarily offline. Check back shortly.');
      return;
    }
    router.push(path as any);
  };

  // ── Loading / gate ──
  if (isAccessLoading || !convexUser) {
    return (
      <SafeAreaView style={s.loadWrap} edges={['top']}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={s.loadText}>Loading your dashboard…</Text>
      </SafeAreaView>
    );
  }

  if (!hasOnboarded) {
    return (
      <SafeAreaView style={s.loadWrap} edges={['top']}>
        <Sparkles size={40} color="#cbd5e1" />
        <Text style={s.errorText}>Complete onboarding to unlock your dashboard.</Text>
        <TouchableOpacity style={s.resetBtn} onPress={async () => {
          Alert.alert('Reset', 'This will restart onboarding.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset', style: 'destructive', onPress: async () => {
                await resetOnboarding({ userId: convexUser._id });
                router.replace('/onboarding');
              }
            }
          ]);
        }}>
          <RefreshCcw size={15} color="#f97316" />
          <Text style={s.resetBtnTxt}>Restart Onboarding</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // WIDGET RENDERERS
  // ─────────────────────────────────────────────────────────

  const wGreeting = () => (
    <View style={s.greetCard}>
      <View style={{ flex: 1 }}>
        <Text style={s.greetLine1}>{greeting.line1}</Text>
        <Text style={[s.greetLine2, { color: greeting.accent }]}>{greeting.line2}</Text>
      </View>
      <View style={{ width: 52, height: 52, borderRadius: 18, overflow: 'hidden' }}>
        <Avatar config={homeAvatar} size={52} />
      </View>
    </View>
  );

  const wWeather = () => (
    <View style={[s.card, { backgroundColor: '#2563eb', shadowColor: '#2563eb' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              {(weather?.location ?? 'LOCAL WEATHER').toUpperCase()}
            </Text>
          </View>

          {weatherPerm !== 'granted' ? (
            <>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 6 }}>
                Enable location for weather
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', lineHeight: 17 }}>
                We use your approximate location to show today’s conditions.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', marginTop: -4 }}>
                {weatherLoading && !weather ? '—' : `${weather?.tempC ?? '—'}°`}
              </Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                {weather?.condition ?? (weatherLoading ? 'Updating…' : '—')}
              </Text>
            </>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Ionicons name={(weather?.icon ?? 'partly-sunny') as any} size={46} color="#ffffff" />
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' }}>
            H:{weather?.highC ?? '—'}°  L:{weather?.lowC ?? '—'}°
          </Text>

          <TouchableOpacity
            onPress={() => refreshWeather(weatherPerm !== 'granted')}
            activeOpacity={0.85}
            style={{
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {weatherLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name={weatherPerm === 'granted' ? 'refresh' : 'navigate'} size={14} color="#ffffff" />
            )}
            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
              {weatherPerm === 'granted' ? 'Refresh' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const wVitality = () => (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View>
          <Text style={s.cardTitle}>Vitality Score</Text>
          <Text style={s.cardSub}>Steps · Mood · Fuel</Text>
        </View>
        <View style={[s.badge, { backgroundColor: vitalityColor + '18' }]}>
          <Text style={[s.badgeTxt, { color: vitalityColor }]}>{vitalityLabel}</Text>
        </View>
      </View>

      <View style={s.vRow}>
        {/* Circle */}
        <View style={s.circleWrap}>
          <CircularProgress
            progress={dataMissing ? 0 : vitalityScore / 100}
            size={116}
            strokeWidth={11}
            trackColor="#f1f5f9"
            progressColor={vitalityColor}
          />
          <View style={s.circleAbs}>
            <Text style={[s.vNum, { color: vitalityColor }]}>{dataMissing ? '--' : vitalityScore}</Text>
            <Text style={s.vSub}>/100</Text>
          </View>
        </View>

        {/* Breakdown bars */}
        <View style={{ flex: 1 }}>
          <MiniBar label="Steps" pct={stepsScore} color="#2563eb" />
          <MiniBar label="Mood" pct={moodScore} color="#8b5cf6" />
          <MiniBar label="Fuel" pct={fuelScore} color="#10b981" />
        </View>
      </View>

      {dataMissing && (
        <Text style={s.vHint}>Log your meals, steps or mood to activate your score.</Text>
      )}
    </View>
  );

  const wBalance = () => (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>Calorie Balance</Text>
        <Flame size={17} color="#f97316" />
      </View>

      <View style={s.balRow}>
        <BalStat label="Goal" val={Math.round(goalCalories)} color="#1e293b" />
        <Text style={s.balOp}>−</Text>
        <BalStat label="Food" val={Math.round(todayFood)} color="#16a34a" />
        <Text style={s.balOp}>+</Text>
        <BalStat label="Active" val={Math.round(burned)} color="#f97316" />
        <Text style={s.balOp}>=</Text>
        <BalStat
          label={overBudget ? 'Over' : 'Left'}
          val={Math.round(Math.abs(remaining))}
          color={overBudget ? '#dc2626' : '#2563eb'}
        />
      </View>

      {/* Progress bar */}
      <View style={s.progTrack}>
        <View style={[s.progFill, {
          width: `${Math.min((todayFood / goalCalories) * 100, 100)}%` as any,
          backgroundColor: overBudget ? '#ef4444' : '#2563eb',
        }]} />
      </View>
      <Text style={s.progLbl}>
        {Math.round((todayFood / goalCalories) * 100)}% of daily goal consumed
      </Text>
    </View>
  );

  const wKPIs = () => (
    <View style={s.kpiGrid}>
      <KPICard
        bg="#eff6ff" iconColor="#2563eb" labelColor="#1e40af"
        icon={<Footprints size={17} color="#2563eb" />}
        label="Steps" value={steps.toLocaleString()} sub="/ 10,000"
        progress={steps / 100} barColor="#2563eb"
        tag={syncedMetrics?.lastSync ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
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
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>Synced</Text>
          </View>
        ) : null}
      />
      <KPICard
        bg="#ecfeff" iconColor="#06b6d4" labelColor="#0e7490"
        icon={<Droplets size={17} color="#06b6d4" />}
        label="Water" value={`${waterDisplay}`} unit={waterUnit} sub={`/ ${waterGoalDisplay}${waterUnit}`}
        progress={(waterOz / waterGoalOz) * 100} barColor="#06b6d4"
      />
      <TouchableOpacity
        style={[s.kpiCard, { backgroundColor: '#f5f3ff' }]}
        onPress={() => router.push('/wellness' as any)} activeOpacity={0.8}
      >
        <View style={s.kpiHead}>
          <Smile size={17} color="#8b5cf6" />
          <Text style={[s.kpiLbl, { color: '#5b21b6' }]}>Mood</Text>
        </View>
        <Text style={[s.kpiVal, { fontSize: 28, marginBottom: 6 }]}>{moodLog?.moodEmoji ?? '—'}</Text>
        <Text style={s.kpiSub}>{moodLog ? 'Logged' : 'Tap to log'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.kpiCard, { backgroundColor: '#f8fafc' }]}
        onPress={() => router.push('/Weightmanagement' as any)} activeOpacity={0.8}
      >
        <View style={s.kpiHead}>
          <Scale size={17} color="#475569" />
          <Text style={[s.kpiLbl, { color: '#334155' }]}>Weight</Text>
        </View>
        <Text style={s.kpiVal}>{weightDisplay}<Text style={s.kpiUnit}> {weightUnit}</Text></Text>
        <Text style={s.kpiSub}>Tap to update</Text>
      </TouchableOpacity>
    </View>
  );

  const wQuickActions = () => (
    <View style={s.card}>
      <Text style={s.cardTitle}>Quick Log</Text>
      <View style={s.qaRow}>
        {[
          { icon: Utensils, label: 'Meal', path: '/fuel', color: '#16a34a', bg: '#f0fdf4' },
          { icon: Dumbbell, label: 'Workout', path: '/move', color: '#2563eb', bg: '#eff6ff' },
          { icon: Droplets, label: 'Water', path: '/fuel', color: '#06b6d4', bg: '#ecfeff' },
          { icon: Moon, label: 'Sleep', path: '/wellness', color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Smile, label: 'Mood', path: '/wellness', color: '#f59e0b', bg: '#fffbeb' },
          { icon: Footprints, label: 'Steps', path: '/move', color: '#f97316', bg: '#fff7ed' },
        ].map(a => (
          <TouchableOpacity key={a.label} style={s.qaItem} onPress={() => router.push(a.path as any)} activeOpacity={0.75}>
            <View style={[s.qaIcon, { backgroundColor: a.bg }]}>
              <a.icon size={19} color={a.color} />
            </View>
            <Text style={s.qaLbl}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const wTrends = () => {
    const data = [1, 3, 2, 4, 3, 5, 4];
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const max = Math.max(...data);
    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <View>
            <Text style={s.cardTitle}>Weekly Trends</Text>
            <Text style={s.cardSub}>Activity overview</Text>
          </View>
          <TrendingUp size={17} color="#10b981" />
        </View>
        <View style={s.chartRow}>
          {data.map((v, i) => (
            <View key={i} style={s.chartCol}>
              <View style={s.chartTrack}>
                <View style={[s.chartFill, { height: `${(v / max) * 100}%` }]} />
              </View>
              <Text style={s.chartDay}>{days[i]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const discoverItems = [
    { icon: MessageSquare, label: 'AI Coach', path: '/ai-coach', color: '#2563eb', bg: '#eff6ff' },
    {
      icon: ({ size, color }: any) => <Text style={{ fontSize: size + 2, color }}>♀</Text>,
      label: 'Women', path: '/womens-health', color: '#db2777', bg: '#fdf2f8'
    },
    {
      icon: ({ size, color }: any) => <Text style={{ fontSize: size + 2, color }}>♂</Text>,
      label: 'Men', path: '/mens-health', color: '#3b82f6', bg: '#eff6ff'
    },
    { icon: Clock, label: 'Fasting', path: '/fasting', color: '#f59e0b', bg: '#fffbeb' },
    { icon: BookOpen, label: 'Library', path: '/library', color: '#10b981', bg: '#ecfdf5' },
    { icon: CheckCircle, label: 'Tasks', path: '/todo', color: '#8b5cf6', bg: '#f5f3ff' },
    { icon: Timer, label: 'Focus', path: '/focus-mode', color: '#3b82f6', bg: '#eff6ff' },
    { icon: Utensils, label: 'Recipes', path: '/recipes', color: '#f97316', bg: '#fff7ed' },
    { icon: Play, label: 'Workouts', path: '/workouts', color: '#16a34a', bg: '#f0fdf4' },
    { icon: TrendingDown, label: 'Metabolic', path: '/sugar-dashboard', color: '#ef4444', bg: '#fee2e2' },
  ];

  const wDiscover = () => {
    const shown = showAllDiscover ? discoverItems : discoverItems.slice(0, 6);
    const cols = discoveryColumns ?? 4;
    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Discover</Text>
          <Text style={s.cardSub}>Everything in one place</Text>
        </View>
        <View style={s.discGrid}>
          {shown.map(item => {
            const restricted = maintenanceMode && item.path === '/ai-coach';
            return (
              <TouchableOpacity
                key={item.label}
                style={[s.discItem, { width: `${(100 / cols).toFixed(1)}%` as any }]}
                onPress={() => handleNav(item.path)}
                activeOpacity={0.75}
              >
                <View style={[s.discIcon, { backgroundColor: restricted ? '#f1f5f9' : item.bg, opacity: restricted ? 0.5 : 1 }]}>
                  <item.icon size={21} color={restricted ? '#94a3b8' : item.color} />
                </View>
                <Text style={[s.discLbl, restricted && { color: '#94a3b8' }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={s.showMore} onPress={() => setShowAllDiscover(p => !p)}>
          <Text style={s.showMoreTxt}>{showAllDiscover ? 'Show Less' : 'View All'}</Text>
          {showAllDiscover ? <ChevronUp size={13} color="#2563eb" /> : <ChevronDown size={13} color="#2563eb" />}
        </TouchableOpacity>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // CUSTOMIZE MODAL
  // ─────────────────────────────────────────────────────────
  const customizeModal = (
    <Modal visible={showCustomize} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.modWrap} edges={['top']}>
        <View style={s.modHeader}>
          <Text style={s.modTitle}>Customize Dashboard</Text>
          <TouchableOpacity onPress={() => setShowCustomize(false)} style={s.modClose}>
            <X size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>
        <Text style={s.modSub}>Toggle cards to personalize your home screen.</Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {WIDGET_REGISTRY.map(w => (
            <View key={w.id} style={s.wRow}>
              <View style={s.wLeft}>
                <Text style={s.wEmoji}>{w.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.wName}>{w.label}</Text>
                  <Text style={s.wDesc}>{w.description}</Text>
                </View>
              </View>
              <Switch
                value={enabledWidgets.has(w.id)}
                onValueChange={() => toggleWidget(w.id)}
                trackColor={{ true: '#2563eb', false: '#e2e8f0' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ─────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {customizeModal}

      {/* TOP BAR */}
      <View style={s.topBar}>
        <Image source={require('../../assets/images/logo.png')} style={s.topLogo} resizeMode="contain" />
        <TouchableOpacity style={s.cBtn} onPress={() => setShowCustomize(true)} activeOpacity={0.75}>
          <Settings2 size={17} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* MAINTENANCE BANNER */}
      {maintenanceMode && (
        <View style={s.banner}>
          <View style={s.bannerDot} />
          <Text style={s.bannerTxt}>{maintenanceBanner}</Text>
        </View>
      )}

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: Math.max(insets.bottom, 12) + 40 },
          isTablet && { alignItems: 'center' as const },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isTablet ? { width: '100%', maxWidth: contentMaxWidth ?? 900, alignSelf: 'center' } : undefined}>
          {isW('weather') && wWeather()}
          {isW('greeting') && wGreeting()}
          {isW('vitality') && wVitality()}
          {isW('balance') && wBalance()}
          {isW('kpis') && wKPIs()}
          {isW('achievements') && (convexUser?._id ? <AchievementsCard userId={convexUser._id} /> : null)}
          {isW('quick_actions') && wQuickActions()}
          {isW('trends') && wTrends()}
          {isW('discover') && wDiscover()}
          {isW('north_star') && (
            <NorthStarWidget
              goal={convexUser?.twelveMonthGoal}
              onPress={() => router.push('/life-goals' as any)}
            />
          )}

          {enabledWidgets.size === 0 && (
            <View style={s.empty}>
              <Sparkles size={44} color="#cbd5e1" />
              <Text style={s.emptyTitle}>Your dashboard is empty</Text>
              <Text style={s.emptySub}>Tap the ⚙ icon above to add widgets.</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={mb.row}>
      <Text style={mb.lbl}>{label}</Text>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[mb.pct, { color }]}>{Math.round(pct)}%</Text>
    </View>
  );
}
const mb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 8 },
  lbl: { width: 38, fontSize: 11, fontWeight: '700', color: '#64748b' },
  track: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { width: 34, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});

function BalStat({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color }}>{val}</Text>
    </View>
  );
}

function KPICard({
  bg, icon, label, labelColor, value, unit, sub, progress, barColor, tag,
}: {
  bg: string; icon: React.ReactNode; label: string; labelColor: string;
  value: string; unit?: string; sub: string; progress: number; barColor: string; iconColor?: string;
  tag?: React.ReactNode;
}) {
  return (
    <View style={[kpi.card, { backgroundColor: bg }]}>
      <View style={kpi.head}>
        {icon}
        <Text style={[kpi.lbl, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={kpi.val}>{value}{unit ? <Text style={kpi.unit}> {unit}</Text> : null}</Text>
      <View style={kpi.bar}>
        <View style={[kpi.fill, { width: `${Math.min(progress, 100)}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={kpi.sub}>{sub}</Text>
      {tag ? <View style={{ marginTop: 6 }}>{tag}</View> : null}
    </View>
  );
}
const kpi = StyleSheet.create({
  card: { flex: 1, minWidth: (SCREEN_WIDTH - 52) / 2, borderRadius: 18, padding: 14, minHeight: 100 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  lbl: { fontSize: 13, fontWeight: '700' },
  val: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  unit: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  bar: { height: 4, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  fill: { height: '100%', borderRadius: 2 },
  sub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 16 },
  loadText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#475569', fontWeight: '700', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  resetBtnTxt: { color: '#1e293b', fontWeight: '600' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  topLogo: { width: 80, height: 26 },
  cBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, marginHorizontal: 16, marginBottom: 6, padding: 11, borderRadius: 12 },
  bannerDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ef4444' },
  bannerTxt: { flex: 1, color: '#991b1b', fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Greeting
  greetCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#2563eb', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  greetLine1: { fontSize: 19, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  greetLine2: { fontSize: 13, fontWeight: '600' },
  greetLogo: { width: 52, height: 18 },

  // Generic card
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 17, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  cardSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  // Vitality
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  circleWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  circleAbs: { position: 'absolute', alignItems: 'center' },
  vNum: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  vSub: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  vHint: { marginTop: 10, fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  // Balance
  balRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  balOp: { fontSize: 17, color: '#cbd5e1', fontWeight: '300', marginBottom: 10 },
  progTrack: { height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  progFill: { height: '100%', borderRadius: 3 },
  progLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, minWidth: (SCREEN_WIDTH - 52) / 2, borderRadius: 18, padding: 14, minHeight: 100 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  kpiLbl: { fontSize: 13, fontWeight: '700' },
  kpiVal: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  kpiUnit: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  kpiSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  // Quick actions
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  qaItem: { alignItems: 'center', flex: 1 },
  qaIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  qaLbl: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },

  // Trends
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 72 },
  chartCol: { flex: 1, alignItems: 'center', gap: 5 },
  chartTrack: { width: 20, height: 56, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  chartFill: { width: '100%', backgroundColor: '#3b82f6', borderRadius: 6 },
  chartDay: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  // Discover
  discGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  discItem: { alignItems: 'center', padding: 6, marginBottom: 8 },
  discIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  discLbl: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
  showMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 6, gap: 4 },
  showMoreTxt: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#94a3b8' },
  emptySub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },

  // Modal
  modWrap: { flex: 1, backgroundColor: '#f8fafc' },
  modHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 6 },
  modTitle: { fontSize: 21, fontWeight: '900', color: '#1e293b' },
  modClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modSub: { fontSize: 13, color: '#64748b', paddingHorizontal: 20, marginBottom: 18, fontWeight: '500' },
  wRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  wLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 10 },
  wEmoji: { fontSize: 24 },
  wName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  wDesc: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
});