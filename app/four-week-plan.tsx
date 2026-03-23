import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBottomContentPadding } from '@/utils/layout';

type WeekCard = {
  title: string;
  subtitle: string;
  focus: string[];
  colors: [string, string];
};

const WEEKS: WeekCard[] = [
  { title: 'Week 1', subtitle: 'Foundation', focus: ['Full body', 'Form-first', 'Habit building'], colors: ['#0f172a', '#1e293b'] },
  { title: 'Week 2', subtitle: 'Strength', focus: ['Progressive overload', 'Core stability', 'Consistency'], colors: ['#1e1b4b', '#4c1d95'] },
  { title: 'Week 3', subtitle: 'Conditioning', focus: ['Cardio intervals', 'Endurance', 'Recovery'], colors: ['#064e3b', '#065f46'] },
  { title: 'Week 4', subtitle: 'Performance', focus: ['Intensity', 'Mobility', 'Deload option'], colors: ['#7c2d12', '#92400e'] },
];

export default function FourWeekPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useMemo(() => getBottomContentPadding(insets.bottom, 18), [insets.bottom]);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>4-Week Plan</Text>
          <Text style={s.hSub}>A free template to get you moving.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View style={s.body}>
          <LinearGradient colors={['#0f172a', '#1e1b4b']} style={s.hero}>
            <View style={s.heroRow}>
              <View style={s.heroIcon}>
                <Ionicons name="calendar-outline" size={18} color="#c4b5fd" />
              </View>
              <Text style={s.heroBadge}>FREE TEMPLATE</Text>
            </View>
            <Text style={s.heroTitle}>Start with structure.</Text>
            <Text style={s.heroSub}>
              Follow this 4-week routine to build momentum. Upgrade to Pro for a personalised plan that adapts over time.
            </Text>
          </LinearGradient>

          <View style={s.grid}>
            {WEEKS.map((w, idx) => (
              <TouchableOpacity
                key={w.title}
                activeOpacity={0.9}
                style={s.weekCardTap}
                onPress={() => router.push(`/four-week-plan/${idx + 1}` as any)}
              >
                <LinearGradient colors={w.colors} style={s.weekCard}>
                  <Text style={s.weekTitle}>{w.title}</Text>
                  <Text style={s.weekSub}>{w.subtitle}</Text>
                  <View style={s.weekBullets}>
                    {w.focus.map((f) => (
                      <Text key={f} style={s.weekBullet}>• {f}</Text>
                    ))}
                  </View>
                  <View style={s.weekCtaRow}>
                    <Text style={s.weekCtaText}>View week</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push('/premium')}
            style={s.upgradeWrap}
          >
            <LinearGradient colors={['#2563eb', '#7c3aed']} style={s.upgradeCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.upgradeTitle}>Unlock Pro Plan</Text>
                <Text style={s.upgradeSub}>Get a personalised routine, exercise swaps, and progressive guidance.</Text>
              </View>
              <View style={s.upgradeCta}>
                <Text style={s.upgradeCtaText}>Go Pro</Text>
                <Ionicons name="chevron-forward" size={16} color="#ffffff" />
              </View>
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
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(196,181,253,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: { fontSize: 10, fontWeight: '900', color: '#c4b5fd', letterSpacing: 0.8 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  heroSub: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  weekCardTap: { width: '48%' },
  weekCard: { width: '100%', borderRadius: 18, padding: 14, minHeight: 140 },
  weekTitle: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
  weekSub: { marginTop: 6, fontSize: 16, fontWeight: '900', color: '#ffffff' },
  weekBullets: { marginTop: 10, gap: 3 },
  weekBullet: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  weekCtaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekCtaText: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.85)' },
  upgradeWrap: { marginTop: 6 },
  upgradeCard: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
  upgradeSub: { marginTop: 4, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', lineHeight: 16 },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  upgradeCtaText: { fontSize: 12, fontWeight: '900', color: '#ffffff' },
});

