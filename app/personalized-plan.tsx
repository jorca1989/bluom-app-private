/**
 * app/personalized-plan.tsx
 *
 * Peak Performance Blueprint — Hub Screen
 * ─────────────────────────────────────────
 * Renders a summary card for each of the 3 plan pillars and navigates
 * to the dedicated full screens. All data is sourced consistently with
 * those screens so nothing is ever out of sync:
 *
 *   Nutrition  → /meal-hub          (data: Convex nutritionPlan.mealTemplates  OR generic GENERIC_WEEK from meal-hub)
 *   Fitness    → /four-week-plan    (data: FREE_4_WEEK_PLAN from fourWeekPlanData.ts)
 *   Mental     → /mental-health-plan (data: WEEK_THEMES from mental-health-plan.tsx)
 *
 * Pro users see AI-generated nutrition + rotation countdown.
 * Free users see baseline targets + upsell nudge.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccessControl } from '@/hooks/useAccessControl';
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Dumbbell,
  Brain,
  Clock,
  Lock,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Data imports — same sources as the dedicated screens ─────────────────────
import { FREE_4_WEEK_PLAN } from '@/utils/fourWeekPlanData';

// ─── Mental Health plan week themes (mirrored from mental-health-plan.tsx) ────
// These 4 themes are the single source of truth displayed in mental-health-plan.tsx.
const MH_WEEKS = [
  { week: 1, theme: 'Foundation', tagline: 'Build your baseline', colors: ['#1e3a8a', '#3730a3'] as const, icon: 'layers-outline', days: 7, pillars: ['Mind', 'Body', 'Purpose'] },
  { week: 2, theme: 'Resilience', tagline: 'Strengthen your mind', colors: ['#064e3b', '#065f46'] as const, icon: 'shield-checkmark-outline', days: 7, pillars: ['Mind', 'Connection', 'Body'] },
  { week: 3, theme: 'Growth', tagline: 'Expand beyond your comfort zone', colors: ['#7c2d12', '#92400e'] as const, icon: 'trending-up-outline', days: 7, pillars: ['Purpose', 'Mind', 'Body'] },
  { week: 4, theme: 'Integration', tagline: 'Make it who you are', colors: ['#1e1b4b', '#4c1d95'] as const, icon: 'infinite-outline', days: 7, pillars: ['Purpose', 'Connection', 'Mind'] },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilRotation(createdAt?: number): number {
  if (!createdAt) return 30;
  const elapsed = Date.now() - createdAt;
  const daysPassed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysPassed);
}

function daysSinceStart(startDate?: number): number {
  if (!startDate) return 0;
  return Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[chip.wrap, { borderColor: color + '30' }]}>
      <Text style={[chip.value, { color }]}>{value}</Text>
      <Text style={chip.label}>{label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#fafafa', minWidth: 62 },
  value: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
});

function ProBadge() {
  return (
    <View style={badge.wrap}>
      <Sparkles size={10} color="#d97706" />
      <Text style={badge.text}>PRO</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef9c3', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: '900', color: '#d97706' },
});

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  onPress: () => void;
  accentColor: string;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isPro?: boolean;
  children: React.ReactNode;
}

function SectionCard({ onPress, accentColor, iconBg, icon, title, subtitle, isPro, children }: SectionCardProps) {
  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.88}>
      {/* Header row */}
      <View style={sc.header}>
        <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={sc.title}>{title}</Text>
          <Text style={sc.sub}>{subtitle}</Text>
        </View>
        {isPro && <ProBadge />}
        <ChevronRight size={18} color="#94a3b8" style={{ marginLeft: 6 }} />
      </View>

      {/* Divider */}
      <View style={sc.divider} />

      {/* Body */}
      {children}

      {/* CTA strip */}
      <View style={[sc.cta, { borderColor: accentColor + '30', backgroundColor: accentColor + '08' }]}>
        <Text style={[sc.ctaText, { color: accentColor }]}>View full plan</Text>
        <ChevronRight size={13} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  sub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 18 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, margin: 14, borderRadius: 12, borderWidth: 1, paddingVertical: 10,
  },
  ctaText: { fontSize: 13, fontWeight: '700' },
});

// ─── Nutrition preview (consistent with meal-hub.tsx) ─────────────────────────

function NutritionPreview({
  nutritionPlan,
  isPro,
  convexUser,
  rotationDays,
}: {
  nutritionPlan: any;
  isPro: boolean;
  convexUser: any;
  rotationDays: number;
}) {
  // Derive today's meal summary — same logic meal-hub.tsx uses
  const todayMeals: any[] = useMemo(() => {
    if (!nutritionPlan?.mealTemplates?.length) return [];
    const templates = nutritionPlan.mealTemplates;
    // mealTemplates can be array of {day, meals} OR flat meal array
    if (templates[0]?.day !== undefined) {
      // Find today's day based on plan start (same as meal-hub)
      const startDate = nutritionPlan.createdAt;
      const daysSince = startDate ? Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24)) : 0;
      const todayDayNum = Math.min(Math.max(daysSince + 1, 1), 30);
      return templates[todayDayNum - 1]?.meals ?? templates[0]?.meals ?? [];
    }
    return templates.slice(0, 4);
  }, [nutritionPlan]);

  const calories = nutritionPlan?.calorieTarget ?? convexUser?.dailyCalories ?? 2000;
  const protein = nutritionPlan?.proteinTarget ?? convexUser?.dailyProtein ?? 150;
  const carbs = nutritionPlan?.carbsTarget ?? convexUser?.dailyCarbs ?? 200;
  const fat = nutritionPlan?.fatTarget ?? convexUser?.dailyFat ?? 65;

  const MEAL_ACCENT: Record<string, string> = {
    Breakfast: '#f59e0b', Lunch: '#10b981', Dinner: '#8b5cf6', Snack: '#ef4444',
  };

  return (
    <View style={np.wrap}>
      {/* Macro row */}
      <View style={np.macroRow}>
        <StatChip label="Calories" value={`${Math.round(calories)}`} color="#f59e0b" />
        <StatChip label="Protein" value={`${Math.round(protein)}g`} color="#ef4444" />
        <StatChip label="Carbs" value={`${Math.round(carbs)}g`} color="#3b82f6" />
        <StatChip label="Fat" value={`${Math.round(fat)}g`} color="#10b981" />
      </View>

      {/* Today's meals — up to 4 */}
      {todayMeals.slice(0, 4).map((meal: any, i: number) => {
        const accent = MEAL_ACCENT[meal.mealType] ?? '#2563eb';
        return (
          <View key={i} style={[np.mealRow, i === 0 && { marginTop: 4 }]}>
            <View style={[np.dot, { backgroundColor: accent }]} />
            <Text style={np.mealType}>{meal.mealType}</Text>
            <Text style={np.mealKcal}>{Math.round(meal.calories)} kcal</Text>
            <Text style={np.mealMacro}>P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · F {Math.round(meal.fat)}g</Text>
          </View>
        );
      })}

      {/* Rotation countdown (Pro only) */}
      {isPro && (
        <View style={np.countdown}>
          <Clock size={12} color="#60a5fa" />
          <Text style={np.countdownText}>
            {rotationDays > 0
              ? `Rotates in ${rotationDays} day${rotationDays !== 1 ? 's' : ''}`
              : 'Rotating soon…'}
          </Text>
        </View>
      )}
    </View>
  );
}
const np = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  macroRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  mealType: { fontSize: 13, fontWeight: '700', color: '#1e293b', width: 76 },
  mealKcal: { fontSize: 12, fontWeight: '700', color: '#f59e0b', width: 62 },
  mealMacro: { fontSize: 11, color: '#94a3b8', flex: 1 },
  countdown: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 6, marginBottom: 4,
  },
  countdownText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
});

// ─── Fitness preview (consistent with four-week-plan.tsx / FREE_4_WEEK_PLAN) ──

function FitnessPreview({ currentWeekIndex }: { currentWeekIndex: number }) {
  // Mirrors the week cards shown in four-week-plan.tsx
  const WEEK_COLORS = ['#1e293b', '#4c1d95', '#065f46', '#92400e'];

  return (
    <View style={fp.wrap}>
      <View style={fp.weekRow}>
        {FREE_4_WEEK_PLAN.map((week, idx) => {
          const isActive = idx === currentWeekIndex;
          return (
            <View
              key={week.weekNum}
              style={[fp.weekPill, { backgroundColor: WEEK_COLORS[idx] }, isActive && fp.weekPillActive]}
            >
              <Text style={fp.weekNum}>W{week.weekNum}</Text>
              <Text style={fp.weekTheme} numberOfLines={1}>{week.theme}</Text>
              {isActive && <View style={fp.activeDot} />}
            </View>
          );
        })}
      </View>

      {/* Active week detail */}
      {(() => {
        const week = FREE_4_WEEK_PLAN[currentWeekIndex];
        return (
          <View style={fp.activeDetail}>
            <Text style={fp.activeWeekLabel}>Week {week.weekNum} · {week.theme}</Text>
            <View style={fp.focusTags}>
              {week.focus.map(f => (
                <View key={f} style={fp.focusTag}>
                  <Text style={fp.focusTagText}>{f}</Text>
                </View>
              ))}
            </View>
            <Text style={fp.dayCount}>{week.days.length} training days</Text>
          </View>
        );
      })()}
    </View>
  );
}
const fp = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  weekRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  weekPill: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, opacity: 0.65 },
  weekPillActive: { opacity: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  weekNum: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 },
  weekTheme: { fontSize: 11, fontWeight: '700', color: '#fff' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', marginTop: 2 },
  activeDetail: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  activeWeekLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  focusTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  focusTag: { backgroundColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  focusTagText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  dayCount: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});

// ─── Mental health preview (consistent with mental-health-plan.tsx WEEK_THEMES) ─

function MentalHealthPreview({ currentDay }: { currentDay: number }) {
  const currentWeekIdx = Math.min(Math.floor((currentDay - 1) / 7), 3);

  return (
    <View style={mhp.wrap}>
      {/* Week pills */}
      <View style={mhp.weekRow}>
        {MH_WEEKS.map((w, idx) => {
          const isActive = idx === currentWeekIdx;
          return (
            <LinearGradient
              key={w.week}
              colors={w.colors}
              style={[mhp.weekPill, isActive && mhp.weekPillActive]}
            >
              <Ionicons name={w.icon as any} size={10} color={isActive ? '#fff' : 'rgba(255,255,255,0.55)'} />
              <Text style={[mhp.weekLabel, !isActive && { opacity: 0.55 }]}>W{w.week}</Text>
              <Text style={[mhp.weekTheme, !isActive && { opacity: 0.55 }]} numberOfLines={1}>{w.theme}</Text>
            </LinearGradient>
          );
        })}
      </View>

      {/* Active week detail */}
      {(() => {
        const w = MH_WEEKS[currentWeekIdx];
        const dayInWeek = ((currentDay - 1) % 7) + 1;
        return (
          <View style={mhp.activeDetail}>
            <Text style={mhp.activeLabel}>Week {w.week} · {w.theme}</Text>
            <Text style={mhp.activeTagline}>{w.tagline}</Text>
            <View style={mhp.pillarsRow}>
              {w.pillars.map(p => (
                <View key={p} style={mhp.pillarTag}>
                  <Text style={mhp.pillarText}>{p}</Text>
                </View>
              ))}
            </View>
            <View style={mhp.progressRow}>
              <View style={mhp.progressTrack}>
                <View style={[mhp.progressFill, { width: `${((dayInWeek - 1) / 7) * 100}%` }]} />
              </View>
              <Text style={mhp.progressText}>Day {currentDay} of 28</Text>
            </View>
          </View>
        );
      })()}
    </View>
  );
}
const mhp = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  weekRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  weekPill: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  weekPillActive: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  weekLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8 },
  weekTheme: { fontSize: 10, fontWeight: '700', color: '#fff' },
  activeDetail: { backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12 },
  activeLabel: { fontSize: 13, fontWeight: '800', color: '#4c1d95', marginBottom: 2 },
  activeTagline: { fontSize: 11, color: '#6d28d9', marginBottom: 8 },
  pillarsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  pillarTag: { backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillarText: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#ddd6fe', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: 2 },
  progressText: { fontSize: 10, color: '#7c3aed', fontWeight: '700' },
});

// ─── Free user upsell lock overlay ────────────────────────────────────────────

function ProLockedOverlay({ onPress }: { onPress: () => void }) {
  return (
    <View style={lo.wrap}>
      <View style={lo.badge}><Lock size={16} color="#fff" /></View>
      <Text style={lo.title}>Pro Blueprint</Text>
      <Text style={lo.sub}>AI personalisation, meal swaps & rotating 30-day plans</Text>
      <TouchableOpacity style={lo.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={lo.btnText}>Unlock Pro</Text>
      </TouchableOpacity>
    </View>
  );
}
const lo = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 20 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  btn: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro } = useAccessControl();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const activePlans = useQuery(api.plans.getActivePlans, {});
  const systemStatus = useQuery(api.system.getSystemStatus);

  const isLoading = activePlans === undefined || convexUser === undefined;
  const { nutritionPlan, wellnessPlan } = activePlans || {};

  // ── Derived values ────────────────────────────────────────────────────────
  const rotationDays = daysUntilRotation(nutritionPlan?.createdAt);

  // Fitness: current week is based on how many weeks since wellnessPlan started
  const startDate = (wellnessPlan as any)?.programStartDate;
  const daysSince = daysSinceStart(startDate);
  const fitnessWeekIdx = Math.min(Math.floor(daysSince / 7), 3); // 0-3

  // Mental health: current day (1-28)
  const mhCurrentDay = Math.min(Math.max(daysSince + 1, 1), 28);

  // Overall progress across all 3 pillars (simple average)
  const nutritionProgress = Math.round(Math.min(((30 - rotationDays) / 30) * 100, 100));
  const fitnessProgress = Math.round((fitnessWeekIdx / 4) * 100);
  const mhProgress = Math.round(((mhCurrentDay - 1) / 28) * 100);
  const overallProgress = Math.round((nutritionProgress + fitnessProgress + mhProgress) / 3);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your Blueprint</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Hero banner ── */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={s.hero}>
          <View style={s.heroBlob} />
          <View style={s.heroBadge}>
            <Sparkles size={11} color="#a78bfa" />
            <Text style={s.heroBadgeText}>
              {isPro ? 'AI-Powered · Rotates every 30 days' : 'Free Blueprint'}
            </Text>
          </View>
          <Text style={s.heroTitle}>Peak Performance{'\n'}Blueprint</Text>
          <Text style={s.heroSub}>
            {isPro
              ? 'Your personalised nutrition, fitness & mental health prescription.'
              : 'A structured 30-day programme. Upgrade Pro for AI personalisation.'}
          </Text>

          {/* Overall progress */}
          {!isLoading && (
            <View style={s.overallRow}>
              <View style={s.overallTrack}>
                <View style={[s.overallFill, { width: `${overallProgress}%` }]} />
              </View>
              <Text style={s.overallText}>{overallProgress}% complete across all pillars</Text>
            </View>
          )}

          {isLoading && <ActivityIndicator color="#a78bfa" style={{ marginTop: 10 }} />}
        </LinearGradient>

        {/* ── Section divider ── */}
        <Text style={s.sectionLabel}>Your Plans</Text>

        {/* ════════════════════════════════════════════════════════
            1. NUTRITION — navigates to /meal-hub
            Data source: same Convex nutritionPlan used by meal-hub.tsx
            ════════════════════════════════════════════════════════ */}
        <SectionCard
          onPress={() => router.push('/meal-hub' as any)}
          accentColor="#f59e0b"
          iconBg="#fef3c7"
          icon={<Utensils size={20} color="#d97706" />}
          title="Nutrition Blueprint"
          subtitle={
            isLoading ? 'Loading…'
              : nutritionPlan
                ? `${Math.round(nutritionPlan.calorieTarget)} kcal · 28-day meal plan`
                : `${Math.round(convexUser?.dailyCalories ?? 2000)} kcal · Baseline targets`
          }
          isPro={isPro && !!nutritionPlan}
        >
          {isLoading
            ? <View style={{ padding: 18 }}><ActivityIndicator color="#f59e0b" /></View>
            : <NutritionPreview
              nutritionPlan={nutritionPlan}
              isPro={isPro}
              convexUser={convexUser}
              rotationDays={rotationDays}
            />
          }
        </SectionCard>

        {/* ════════════════════════════════════════════════════════
            2. FITNESS — navigates to /four-week-plan
            Data source: FREE_4_WEEK_PLAN (fourWeekPlanData.ts) — same file
            ════════════════════════════════════════════════════════ */}
        <SectionCard
          onPress={() => router.push('/four-week-plan' as any)}
          accentColor="#7c3aed"
          iconBg="#ede9fe"
          icon={<Dumbbell size={20} color="#7c3aed" />}
          title="Fitness Blueprint"
          subtitle={`4-Week Plan · Week ${fitnessWeekIdx + 1} of 4`}
          isPro={isPro}
        >
          <FitnessPreview currentWeekIndex={fitnessWeekIdx} />
        </SectionCard>

        {/* ════════════════════════════════════════════════════════
            3. MENTAL HEALTH — navigates to /mental-health-plan
            Data source: WEEK_THEMES from mental-health-plan.tsx (mirrored above)
            ════════════════════════════════════════════════════════ */}
        <SectionCard
          onPress={() => router.push('/mental-health-plan' as any)}
          accentColor="#8b5cf6"
          iconBg="#f5f3ff"
          icon={<Brain size={20} color="#8b5cf6" />}
          title="Mental Health Blueprint"
          subtitle={`30-Day Programme · Day ${mhCurrentDay} of 28`}
          isPro={isPro}
        >
          <MentalHealthPreview currentDay={mhCurrentDay} />
        </SectionCard>

        {/* ── Pro upsell banner (free users) ── */}
        {!isPro && (
          <TouchableOpacity onPress={() => router.push('/premium' as any)} activeOpacity={0.9}>
            <LinearGradient colors={['#0f172a', '#1e1b4b']} style={s.upsell}>
              <View style={s.upsellBlob} />
              <Ionicons name="sparkles" size={22} color="#a78bfa" style={{ marginBottom: 10 }} />
              <Text style={s.upsellTitle}>Continue Your Journey</Text>
              <Text style={s.upsellSub}>
                Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with an AI-generated plan that adapts every cycle.
              </Text>
              <View style={s.upsellCta}>
                <Text style={s.upsellCtaText}>Upgrade to Pro →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Quick links row ── */}
        <View style={s.quickLinks}>
          {[
            { label: 'Meal Hub', icon: 'restaurant-outline', route: '/meal-hub', color: '#f59e0b' },
            { label: '4-Week Plan', icon: 'barbell-outline', route: '/four-week-plan', color: '#7c3aed' },
            { label: 'Mind Plan', icon: 'heart-outline', route: '/mental-health-plan', color: '#8b5cf6' },
          ].map(link => (
            <TouchableOpacity
              key={link.route}
              style={s.quickLink}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.quickLinkIcon, { backgroundColor: link.color + '15' }]}>
                <Ionicons name={link.icon as any} size={18} color={link.color} />
              </View>
              <Text style={s.quickLinkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },

  // Hero
  hero: { borderRadius: 22, padding: 22, marginBottom: 24, overflow: 'hidden' },
  heroBlob: { position: 'absolute', top: -40, right: -20, width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.18)' },
  heroBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(167,139,250,0.18)', borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  heroBadgeText: { fontSize: 10, color: '#a78bfa', fontWeight: '800' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 32, marginBottom: 8 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18, marginBottom: 16 },

  overallRow: {},
  overallTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  overallFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 3 },
  overallText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },

  // Upsell
  upsell: { borderRadius: 22, padding: 22, marginTop: 4, overflow: 'hidden' },
  upsellBlob: { position: 'absolute', top: -20, right: 0, width: 110, height: 110, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.2)' },
  upsellTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 8 },
  upsellSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18, marginBottom: 16 },
  upsellCta: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  upsellCtaText: { color: '#c4b5fd', fontWeight: '800', fontSize: 13 },

  // Quick links
  quickLinks: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickLink: { flex: 1, alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  quickLinkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontSize: 11, fontWeight: '700', color: '#475569' },
});
