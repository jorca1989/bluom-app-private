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

  const activePlans = useQuery(api.plans.getActivePlans, clerkUser?.id ? {} : 'skip');

  const weekIndex = useMemo(() => {
    const n = parseInt(String(params.week ?? '1'), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n - 1, 0), 3);
  }, [params.week]);

  const week = useMemo(() => {
    // If Pro and we have an AI plan, we use the AI split for ALL weeks in this view
    // (In a more advanced version, we'd have 4 different AI weeks)
    if (isPro && activePlans?.fitnessPlan?.workouts) {
      const split = activePlans.fitnessPlan.workoutSplit || 'Personalised Plan';
      return {
        title: t('common.weekNum', 'Week {{num}}', { num: weekIndex + 1 }),
        subtitle: t(`db.${split.replace(/\s+/g, '')}`, split),
        colors: WEEK_TEMPLATES[weekIndex].colors,
        days: activePlans.fitnessPlan.workouts.map((w: any, idx: number) => ({
          dayNum: idx + 1,
          dayTitle: t(`db.${(w.focus || w.day || `Workout ${idx + 1}`).replace(/\s+/g, '')}`, w.focus || w.day || `Workout ${idx + 1}`),
          muscleGroups: t(`workouts.muscles.${w.focus || w.day || 'Full Body'}`, w.muscleGroups || w.focus || 'Full Body'),
        })),
      };
    }
    const template = WEEK_TEMPLATES[weekIndex];
    return {
      ...template,
      title: t('common.weekNum', 'Week {{num}}', { num: weekIndex + 1 }),
      subtitle: t(`db.${template.subtitle.toLowerCase()}`, template.subtitle),
      days: template.days.map((d: any) => ({
        ...d,
        dayTitle: t(`db.${d.dayTitle.replace(/\s+/g, '').toLowerCase()}`, d.dayTitle),
        muscleGroups: t(`db.${d.muscleGroups.replace(/[\s,\/]+/g, '').toLowerCase()}`, d.muscleGroups),
      }))
    };
  }, [isPro, activePlans, weekIndex]);

  const bottomPad = useMemo(() => getBottomContentPadding(insets.bottom, 18), [insets.bottom]);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>{week.title}</Text>
          <Text style={s.hSub}>{week.subtitle}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View style={s.body}>
          <LinearGradient colors={week.colors} style={s.hero}>
            <Text style={s.heroTitle}>{t('move.yourWeekOverview', 'Your week overview')}</Text>
            <Text style={s.heroSub}>{t('move.weekOverviewDesc', 'Use this as a simple guide. Pro gets a personalised plan that adapts and swaps exercises.')}</Text>
          </LinearGradient>

          <View style={s.dayList}>
            {week.days.map((d: any) => (
              <View key={d.dayNum} style={s.dayCard}>
                <View style={s.dayHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayBadgeText}>{t('move.dayNum', 'Day {{num}}', { num: d.dayNum })}</Text>
                  </View>
                  <Text style={s.dayFocus}>{d.dayTitle}</Text>
                </View>
                <Text style={s.dayMuscleGroups}>{d.muscleGroups}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(tabs)/move')} style={s.openMoveBtn}>
            <LinearGradient colors={['#0ea5e9', '#6366f1']} style={s.openMoveCard}>
              <Text style={s.openMoveText}>{t('move.openMove', 'Open Move')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  hSub: { marginTop: 2, fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  hero: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  heroSub: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  dayList: { gap: 10 },
  dayCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dayBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  dayBadgeText: { fontSize: 11, fontWeight: '900', color: '#ffffff' },
  dayFocus: { flex: 1, fontSize: 13, fontWeight: '900', color: '#0f172a' },
  dayMuscleGroups: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2, marginLeft: 2 },
  dayItems: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8' },
  itemText: { fontSize: 12, fontWeight: '700', color: '#475569' },
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

