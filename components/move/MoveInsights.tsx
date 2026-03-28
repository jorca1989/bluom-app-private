import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser as useClerkUser } from '@clerk/clerk-expo';

interface MoveInsightsProps {
  isPro: boolean;
  onUpgradePress: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toIsoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function getWeekDates(weeksAgo = 0) {
  const now = new Date();
  const end = addDays(now, -weeksAgo * 7);
  const start = addDays(end, -6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({
  icon,
  iconColor,
  iconBg,
  title,
  value,
  subtitle,
  trend,
  trendPositive,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <View style={insightStyles.card}>
      <View style={[insightStyles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={insightStyles.textBox}>
        <Text style={insightStyles.cardTitle}>{title}</Text>
        <Text style={insightStyles.cardValue}>{value}</Text>
        <Text style={insightStyles.cardSub}>{subtitle}</Text>
      </View>
      {trend && (
        <View style={[
          insightStyles.trendBadge,
          { backgroundColor: trendPositive ? '#dcfce7' : '#fee2e2' }
        ]}>
          <Ionicons
            name={trendPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={trendPositive ? '#16a34a' : '#dc2626'}
          />
          <Text style={[insightStyles.trendText, { color: trendPositive ? '#16a34a' : '#dc2626' }]}>
            {trend}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Bar mini-chart ───────────────────────────────────────────────────────────

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(1, value / max);
  return (
    <View style={insightStyles.miniBarRow}>
      <Text style={insightStyles.miniBarLabel}>{label}</Text>
      <View style={insightStyles.miniBarBg}>
        <View style={[insightStyles.miniBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={insightStyles.miniBarValue}>{value}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MoveInsights({ isPro, onUpgradePress }: MoveInsightsProps) {
  const { user: clerkUser } = useClerkUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  // This week & last week data for trends
  const thisWeek = getWeekDates(0);
  const lastWeek = getWeekDates(1);

  const thisWeekEntries = useQuery(
    api.exercise.getExerciseEntriesInRange,
    convexUser?._id
      ? { userId: convexUser._id, startDate: thisWeek.start, endDate: thisWeek.end }
      : 'skip'
  );

  const lastWeekEntries = useQuery(
    api.exercise.getExerciseEntriesInRange,
    convexUser?._id
      ? { userId: convexUser._id, startDate: lastWeek.start, endDate: lastWeek.end }
      : 'skip'
  );

  // ── Derived insights ─────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const tw = thisWeekEntries ?? [];
    const lw = lastWeekEntries ?? [];

    // 1. Weekly volume (minutes)
    const twMinutes = tw.reduce((s: number, e: any) => s + e.duration, 0);
    const lwMinutes = lw.reduce((s: number, e: any) => s + e.duration, 0);
    const minutesDelta = lwMinutes > 0 ? Math.round(((twMinutes - lwMinutes) / lwMinutes) * 100) : null;

    // 2. Weekly calorie burn
    const twCalories = tw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
    const lwCalories = lw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
    const calDelta = lwCalories > 0 ? Math.round(((twCalories - lwCalories) / lwCalories) * 100) : null;

    // 3. Workout count this week
    const twCount = tw.length;
    const lwCount = lw.length;
    const countDelta = lwCount > 0 ? twCount - lwCount : null;

    // 4. Consistency streak — how many consecutive days ending today have at least one entry
    const allDates = new Set(tw.map((e: any) => e.date).concat(lw.map((e: any) => e.date)));
    let streak = 0;
    for (let i = 0; i < 14; i++) {
      const d = toIsoDate(addDays(new Date(), -i));
      if (allDates.has(d)) { streak++; } else { break; }
    }

    // 5. Muscle group variety (this week's unique exercise types)
    const typeCount: Record<string, number> = {};
    tw.forEach((e: any) => {
      const t = e.exerciseType ?? 'other';
      typeCount[t] = (typeCount[t] ?? 0) + 1;
    });
    const typeNames: Record<string, string> = {
      strength: 'Strength',
      cardio: 'Cardio',
      hiit: 'HIIT',
      yoga: 'Yoga / Mindful',
    };
    const typeEntries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    const maxTypeCount = typeEntries[0]?.[1] ?? 1;

    // 6. Most active day this week
    const dayCounts: Record<string, number> = {};
    tw.forEach((e: any) => { dayCounts[e.date] = (dayCounts[e.date] ?? 0) + 1; });
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const bestDayLabel = bestDay
      ? new Date(bestDay[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
      : null;

    return {
      twMinutes: Math.round(twMinutes),
      lwMinutes: Math.round(lwMinutes),
      minutesDelta,
      twCalories: Math.round(twCalories),
      calDelta,
      twCount,
      lwCount,
      countDelta,
      streak,
      typeEntries,
      typeNames,
      maxTypeCount,
      bestDayLabel,
      bestDayCount: bestDay ? Number(bestDay[1]) : 0,
      hasData: tw.length > 0,
    };
  }, [thisWeekEntries, lastWeekEntries]);

  // ─── Locked (non-Pro) state ───────────────────────────────────────────────
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Workout Insights</Text>
        <View style={styles.lockedCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800' }}
            style={styles.blurredBg}
            blurRadius={20}
          />
          <View style={styles.overlay}>
            <View style={styles.proBadge}>
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.lockedTitle}>Advanced Move Insights</Text>
            <Text style={styles.lockedSub}>
              Unlock weekly trends, consistency streaks, calorie burn comparisons, and muscle group variety analysis.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── No data placeholder ──────────────────────────────────────────────────
  if (!insights.hasData) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Workout Insights</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={48} color="#e2e8f0" />
          <Text style={styles.emptyTitle}>No data yet this week</Text>
          <Text style={styles.emptySub}>
            Log your first workout to unlock personalized insights and trends.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Pro insights ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Workout Insights</Text>

      {/* Row 1: Weekly volume & calorie trend */}
      <View style={styles.cardRow}>
        <InsightCard
          icon="time-outline"
          iconColor="#2563eb"
          iconBg="#dbeafe"
          title="Active Time"
          value={`${insights.twMinutes} min`}
          subtitle="This week"
          trend={insights.minutesDelta !== null
            ? `${Math.abs(insights.minutesDelta)}% vs last week`
            : undefined}
          trendPositive={insights.minutesDelta !== null ? insights.minutesDelta >= 0 : undefined}
        />
        <InsightCard
          icon="flame-outline"
          iconColor="#ea580c"
          iconBg="#fed7aa"
          title="Calories Burned"
          value={`${insights.twCalories}`}
          subtitle="This week"
          trend={insights.calDelta !== null
            ? `${Math.abs(insights.calDelta)}% vs last week`
            : undefined}
          trendPositive={insights.calDelta !== null ? insights.calDelta >= 0 : undefined}
        />
      </View>

      {/* Row 2: Streak & session count */}
      <View style={styles.cardRow}>
        <InsightCard
          icon="flash-outline"
          iconColor="#7c3aed"
          iconBg="#ede9fe"
          title="Streak"
          value={`${insights.streak} day${insights.streak !== 1 ? 's' : ''}`}
          subtitle={insights.streak > 0 ? 'Keep it up! 🔥' : 'Start your streak today'}
          trendPositive={insights.streak > 0}
        />
        <InsightCard
          icon="barbell-outline"
          iconColor="#0891b2"
          iconBg="#cffafe"
          title="Sessions"
          value={String(insights.twCount)}
          subtitle="This week"
          trend={insights.countDelta !== null
            ? `${insights.countDelta >= 0 ? '+' : ''}${insights.countDelta} vs last week`
            : undefined}
          trendPositive={insights.countDelta !== null ? insights.countDelta >= 0 : undefined}
        />
      </View>

      {/* Workout variety breakdown */}
      {insights.typeEntries.length > 0 && (
        <View style={styles.varietyCard}>
          <View style={styles.varietyHeader}>
            <Ionicons name="pie-chart-outline" size={18} color="#0f172a" />
            <Text style={styles.varietyTitle}>Workout Mix This Week</Text>
          </View>
          {insights.typeEntries.map(([type, count]) => (
            <MiniBar
              key={type}
              label={insights.typeNames[type] ?? type}
              value={count}
              max={insights.maxTypeCount}
              color={
                type === 'strength' ? '#3b82f6'
                  : type === 'cardio' ? '#f59e0b'
                    : type === 'hiit' ? '#ef4444'
                      : '#10b981'
              }
            />
          ))}
          {insights.typeEntries.length < 2 && (
            <Text style={styles.varietyHint}>
              💡 Try mixing in a cardio or flexibility session for a more balanced week
            </Text>
          )}
        </View>
      )}

      {/* Best day */}
      {insights.bestDayLabel && (
        <View style={styles.bestDayCard}>
          <Ionicons name="trophy-outline" size={22} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bestDayTitle}>Most Active Day</Text>
            <Text style={styles.bestDayValue}>{insights.bestDayLabel}</Text>
            <Text style={styles.bestDaySub}>{insights.bestDayCount} session{insights.bestDayCount !== 1 ? 's' : ''} logged</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const insightStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  textBox: {},
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  cardSub: { fontSize: 11, color: '#94a3b8' },
  trendBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: { fontSize: 10, fontWeight: '700' },
  miniBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  miniBarLabel: { width: 80, fontSize: 12, fontWeight: '600', color: '#475569' },
  miniBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 4 },
  miniBarValue: { width: 24, fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

  // Card layout
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  // Variety card
  varietyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  varietyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  varietyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  varietyHint: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 },

  // Best day
  bestDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 4,
  },
  bestDayTitle: { fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  bestDayValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  bestDaySub: { fontSize: 12, color: '#78350f', marginTop: 2 },

  // Locked state
  lockedCard: { height: 240, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b' },
  blurredBg: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginBottom: 16,
  },
  proBadgeText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  lockedTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  lockedSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  upgradeBtn: { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  upgradeGradient: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  upgradeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Empty
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
});