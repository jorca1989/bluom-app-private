import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBottomContentPadding } from '@/utils/layout';

type WeekTemplate = {
  title: string;
  subtitle: string;
  colors: [string, string];
  days: Array<{
    name: string;
    focus: string;
    items: string[];
  }>;
};

const WEEK_TEMPLATES: WeekTemplate[] = [
  {
    title: 'Week 1',
    subtitle: 'Foundation',
    colors: ['#0f172a', '#1e293b'],
    days: [
      { name: 'Day 1', focus: 'Full body strength', items: ['Squat pattern', 'Push', 'Pull', 'Core'] },
      { name: 'Day 2', focus: 'Zone 2 cardio', items: ['Walk / cycle', 'Mobility finisher'] },
      { name: 'Day 3', focus: 'Full body strength', items: ['Hinge pattern', 'Push', 'Pull', 'Core'] },
      { name: 'Day 4', focus: 'Recovery', items: ['Stretching', 'Easy walk'] },
    ],
  },
  {
    title: 'Week 2',
    subtitle: 'Strength',
    colors: ['#1e1b4b', '#4c1d95'],
    days: [
      { name: 'Day 1', focus: 'Lower body', items: ['Squat focus', 'Glutes', 'Calves'] },
      { name: 'Day 2', focus: 'Upper body', items: ['Push focus', 'Pull focus', 'Arms'] },
      { name: 'Day 3', focus: 'Cardio intervals', items: ['Intervals', 'Cooldown'] },
      { name: 'Day 4', focus: 'Full body', items: ['Compound circuit', 'Core'] },
    ],
  },
  {
    title: 'Week 3',
    subtitle: 'Conditioning',
    colors: ['#064e3b', '#065f46'],
    days: [
      { name: 'Day 1', focus: 'Tempo strength', items: ['Full body tempo', 'Core'] },
      { name: 'Day 2', focus: 'Conditioning', items: ['HIIT / circuits', 'Cooldown'] },
      { name: 'Day 3', focus: 'Endurance', items: ['Longer walk / cycle', 'Mobility'] },
      { name: 'Day 4', focus: 'Recovery', items: ['Stretching', 'Breathwork'] },
    ],
  },
  {
    title: 'Week 4',
    subtitle: 'Performance',
    colors: ['#7c2d12', '#92400e'],
    days: [
      { name: 'Day 1', focus: 'Full body power', items: ['Explosive emphasis', 'Core'] },
      { name: 'Day 2', focus: 'Intervals', items: ['Short intervals', 'Cooldown'] },
      { name: 'Day 3', focus: 'Strength test', items: ['Rep PRs (safe)', 'Accessory'] },
      { name: 'Day 4', focus: 'Deload option', items: ['Light full body', 'Mobility'] },
    ],
  },
];

export default function FourWeekPlanWeekScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ week?: string }>();

  const weekIndex = useMemo(() => {
    const n = parseInt(String(params.week ?? '1'), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n - 1, 0), WEEK_TEMPLATES.length - 1);
  }, [params.week]);

  const week = WEEK_TEMPLATES[weekIndex];
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
            <Text style={s.heroTitle}>Your week overview</Text>
            <Text style={s.heroSub}>Use this as a simple guide. Pro gets a personalised plan that adapts and swaps exercises.</Text>
          </LinearGradient>

          <View style={s.dayList}>
            {week.days.map((d) => (
              <View key={d.name} style={s.dayCard}>
                <View style={s.dayHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayBadgeText}>{d.name}</Text>
                  </View>
                  <Text style={s.dayFocus}>{d.focus}</Text>
                </View>
                <View style={s.dayItems}>
                  {d.items.map((it) => (
                    <View key={it} style={s.itemRow}>
                      <View style={s.dot} />
                      <Text style={s.itemText}>{it}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.92} onPress={() => router.push('/(tabs)/move')} style={s.openMoveBtn}>
            <LinearGradient colors={['#0ea5e9', '#6366f1']} style={s.openMoveCard}>
              <Text style={s.openMoveText}>Open Move</Text>
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

