import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBottomContentPadding } from '@/utils/layout';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useAccessControl } from '@/hooks/useAccessControl';
import { FREE_4_WEEK_PLAN, getWeekRoutineDays } from '@/utils/fourWeekPlanData';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';

type WeekTemplate = {
  title: string;
  subtitle: string;
  colors: [string, string];
  days: Array<{
    dayNum: number;
    dayTitle: string;
    muscleGroups: string;
    exercises: Array<{ name: string }>;
  }>;
};

const WEEK_TEMPLATES: any[] = [
  {
    title: 'Week 1',
    subtitle: 'Foundation',
    colors: ['#0f172a', '#1e293b'],
    days: [
      { dayNum: 1, dayTitle: 'Full Body Strength', muscleGroups: 'Squat pattern, Push, Pull, Core' },
      { dayNum: 2, dayTitle: 'Zone 2 Cardio', muscleGroups: 'Walk / cycle, Mobility finisher' },
      { dayNum: 3, dayTitle: 'Full Body Strength', muscleGroups: 'Hinge pattern, Push, Pull, Core' },
      { dayNum: 4, dayTitle: 'Recovery', muscleGroups: 'Stretching, Easy walk' },
    ],
  },
  {
    title: 'Week 2',
    subtitle: 'Strength',
    colors: ['#1e1b4b', '#4c1d95'],
    days: [
      { dayNum: 1, dayTitle: 'Lower Body', muscleGroups: 'Squat focus, Glutes, Calves' },
      { dayNum: 2, dayTitle: 'Upper Body', muscleGroups: 'Push focus, Pull focus, Arms' },
      { dayNum: 3, dayTitle: 'Cardio intervals', muscleGroups: 'Intervals, Cooldown' },
      { dayNum: 4, dayTitle: 'Full Body', muscleGroups: 'Compound circuit, Core' },
    ],
  },
  {
    title: 'Week 3',
    subtitle: 'Conditioning',
    colors: ['#064e3b', '#065f46'],
    days: [
      { dayNum: 1, dayTitle: 'Tempo Strength', muscleGroups: 'Full body tempo, Core' },
      { dayNum: 2, dayTitle: 'Conditioning', muscleGroups: 'HIIT / circuits, Cooldown' },
      { dayNum: 3, dayTitle: 'Endurance', muscleGroups: 'Longer walk / cycle, Mobility' },
      { dayNum: 4, dayTitle: 'Recovery', muscleGroups: 'Stretching, Breathwork' },
    ],
  },
  {
    title: 'Week 4',
    subtitle: 'Performance',
    colors: ['#7c2d12', '#92400e'],
    days: [
      { dayNum: 1, dayTitle: 'Full Body Power', muscleGroups: 'Explosive emphasis, Core' },
      { dayNum: 2, dayTitle: 'Intervals', muscleGroups: 'Short intervals, Cooldown' },
      { dayNum: 3, dayTitle: 'Strength Test', muscleGroups: 'Rep PRs (safe), Accessory' },
      { dayNum: 4, dayTitle: 'Deload Option', muscleGroups: 'Light full body, Mobility' },
    ],
  },
];

export default function FourWeekPlanWeekScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ week?: string }>();
  const { user: clerkUser } = useUser();
  const { isPro } = useAccessControl();
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const activePlans = useQuery(api.plans.getActivePlans, clerkUser?.id ? {} : 'skip');

  const weekIndex = useMemo(() => {
    const n = parseInt(String(params.week ?? '1'), 10);
    if (!Number.isFinite(n) || n < 1) return 0;
    return (n - 1) % 4;
  }, [params.week]);

  const translateWorkoutLabel = React.useCallback((value?: string) => {
    if (!value) return '';
    return t(`workouts.labels.${value}`, value) as string;
  }, [t]);

  const translateMuscleList = React.useCallback((value?: string) => {
    if (!value) return '';
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => t(`workouts.muscles.${part}`, translateWorkoutLabel(part)) as string)
      .join(', ');
  }, [t, translateWorkoutLabel]);

  const week = useMemo(() => {
    if (isPro && activePlans?.fitnessPlan?.workouts) {
      const split = activePlans.fitnessPlan.workoutSplit || 'Personalised Plan';
      return {
        title: t('common.weekNum', 'Week {{num}}', { num: weekIndex + 1 }),
        subtitle: translateWorkoutLabel(split),
        colors: WEEK_TEMPLATES[weekIndex].colors,
        days: activePlans.fitnessPlan.workouts.map((w: any, idx: number) => ({
          dayNum: idx + 1,
          dayTitle: translateWorkoutLabel(w.focus || w.day || `Workout ${idx + 1}`),
          muscleGroups: Array.isArray(w.muscleGroups)
            ? translateMuscleList(w.muscleGroups.join(', '))
            : translateMuscleList(w.muscleGroups || w.focus || 'Full Body'),
        })),
      };
    }
    const template = WEEK_TEMPLATES[weekIndex];
    return {
      ...template,
      title: t('common.weekNum', 'Week {{num}}', { num: weekIndex + 1 }),
      subtitle: translateWorkoutLabel(template.subtitle),
      days: template.days.map((d: any) => ({
        ...d,
        dayTitle: translateWorkoutLabel(d.dayTitle),
        muscleGroups: translateMuscleList(d.muscleGroups),
      }))
    };
  }, [isPro, activePlans, weekIndex, t, translateMuscleList, translateWorkoutLabel]);

  const bottomPad = useMemo(() => getBottomContentPadding(insets.bottom, 18), [insets.bottom]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={themeColors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>{week.title}</Text>
          <Text style={styles.hSub}>{week.subtitle}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View style={styles.body}>
          <LinearGradient colors={week.colors} style={styles.hero}>
            <Text style={styles.heroTitle}>{t('move.yourWeekOverview', 'Your week overview')}</Text>
            <Text style={styles.heroSub}>{t('move.weekOverviewDesc', 'Use this as a simple guide. Pro gets a personalised plan that adapts and swaps exercises.')}</Text>
          </LinearGradient>

          <View style={styles.dayList}>
            {week.days.map((d: any) => (
              <View key={d.dayNum} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{t('common.dayNum', 'Day {{num}}', { num: d.dayNum })}</Text>
                  </View>
                  <Text style={styles.dayFocus}>{d.dayTitle}</Text>
                </View>
                <Text style={styles.dayMuscleGroups}>{d.muscleGroups}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(tabs)/move')} style={styles.openMoveBtn}>
            <LinearGradient colors={['#0ea5e9', '#6366f1']} style={styles.openMoveCard}>
              <Text style={styles.openMoveText}>{t('move.openMove', 'Open Move')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
    backgroundColor: c.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { fontSize: 17, fontWeight: '900', color: c.text },
  hSub: { marginTop: 2, fontSize: 11, fontWeight: '700', color: c.textMuted },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  hero: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  heroSub: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  dayList: { gap: 10 },
  dayCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 14,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dayBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: c.text,
  },
  dayBadgeText: { fontSize: 11, fontWeight: '900', color: c.bg },
  dayFocus: { flex: 1, fontSize: 13, fontWeight: '900', color: c.text },
  dayMuscleGroups: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginTop: 2, marginLeft: 2 },
  dayItems: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.textMuted },
  itemText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  openMoveBtn: { marginTop: 8 },
  openMoveCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openMoveText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
});
