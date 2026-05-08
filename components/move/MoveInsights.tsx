import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

interface MoveInsightsProps {
  isPro: boolean;
  onUpgradePress: () => void;
}

function toIsoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export default function MoveInsights({ isPro, onUpgradePress }: MoveInsightsProps) {
  const router = useRouter();
  const { user: clerkUser } = useClerkUser();
  const { t } = useTranslation();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  // Only fetch streak - the ONE unique stat not on Move KPI cards
  const now = new Date();
  const recentEntries = useQuery(
    api.exercise.getExerciseEntriesInRange,
    convexUser?._id ? {
      userId: convexUser._id,
      startDate: toIsoDate(addDays(now, -13)),
      endDate: toIsoDate(now)
    } : 'skip'
  );

  const streak = React.useMemo(() => {
    const dates = new Set((recentEntries ?? []).map((e: any) => e.date));
    let s = 0;
    for (let i = 0; i < 14; i++) {
      if (dates.has(toIsoDate(addDays(new Date(), -i)))) s++;
      else break;
    }
    return s;
  }, [recentEntries]);

  const handlePress = () => {
    if (isPro) {
      router.push('/move-insights' as any);
    } else {
      onUpgradePress();
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
        <View style={styles.left}>
          <View style={styles.iconBox}>
            <Ionicons name="analytics" size={22} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('move.insightsTitle', 'Workout Insights')}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {isPro
                ? (streak > 0 ? t('move.streakTrends', '🔥 {{streak}}-day streak • Tap to view trends', { streak }) : t('move.tapWeeklyTrends', 'Tap to view weekly trends'))
                : t('move.upgradeTrends', 'Upgrade to unlock weekly trends & more')}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          {!isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={10} color="#f59e0b" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 24, marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  sub: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  proBadgeText: { fontSize: 9, fontWeight: '900', color: '#92400e' },
});