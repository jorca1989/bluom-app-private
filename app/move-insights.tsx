import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toIsoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function getWeekRange(weeksAgo = 0) {
    const now = new Date();
    const end = addDays(now, -weeksAgo * 7);
    const start = addDays(end, -6);
    return { start: toIsoDate(start), end: toIsoDate(end) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ icon, iconColor, iconBg, label, value, sub, trend, trendUp }: {
    icon: string; iconColor: string; iconBg: string;
    label: string; value: string; sub?: string;
    trend?: string; trendUp?: boolean;
}) {
    return (
        <View style={statStyles.row}>
            <View style={[statStyles.iconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={statStyles.textCol}>
                <Text style={statStyles.label}>{label}</Text>
                <Text style={statStyles.value}>{value}</Text>
                {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
            </View>
            {trend ? (
                <View style={[statStyles.trendPill, { backgroundColor: trendUp ? '#dcfce7' : '#fee2e2' }]}>
                    <Ionicons name={trendUp ? 'trending-up' : 'trending-down'} size={12} color={trendUp ? '#16a34a' : '#dc2626'} />
                    <Text style={[statStyles.trendText, { color: trendUp ? '#16a34a' : '#dc2626' }]}>{trend}</Text>
                </View>
            ) : null}
        </View>
    );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max === 0 ? 0 : Math.min(1, value / max);
    return (
        <View style={barStyles.row}>
            <Text style={barStyles.label}>{label}</Text>
            <View style={barStyles.bg}>
                <View style={[barStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={barStyles.val}>{value}</Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MoveInsightsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useClerkUser();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const convexUser = useQuery(
        api.users.getUserByClerkId,
        clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
    );

    const isPro = convexUser?.subscriptionStatus === 'active' ||
        clerkUser?.emailAddresses?.some(e => e.emailAddress === 'ggovsaas@gmail.com');

    // Week data
    const thisWeek = getWeekRange(0);
    const lastWeek = getWeekRange(1);

    const thisWeekEntries = useQuery(
        api.exercise.getExerciseEntriesInRange,
        convexUser?._id ? { userId: convexUser._id, startDate: thisWeek.start, endDate: thisWeek.end } : 'skip'
    );
    const lastWeekEntries = useQuery(
        api.exercise.getExerciseEntriesInRange,
        convexUser?._id ? { userId: convexUser._id, startDate: lastWeek.start, endDate: lastWeek.end } : 'skip'
    );

    // Weekly chart data (last 7 days)
    const today = new Date();
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
        return days;
    }, []);
    const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const weekData = useMemo(() => {
        const entries = thisWeekEntries ?? [];
        const counts = new Map<string, number>();
        for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
        return weekDays.map(d => counts.get(toIsoDate(d)) ?? 0);
    }, [weekDays, thisWeekEntries]);

    // Computed insights
    const insights = useMemo(() => {
        const tw = thisWeekEntries ?? [];
        const lw = lastWeekEntries ?? [];

        // Unique metrics only — NOT repeating what's on the Move KPI cards
        const twVolume = tw.reduce((s: number, e: any) => {
            // volume = weight * reps * sets if available, else 0
            return s + (e.weight && e.reps && e.sets ? e.weight * e.reps * e.sets : 0);
        }, 0);

        const lwVolume = lw.reduce((s: number, e: any) =>
            s + (e.weight && e.reps && e.sets ? e.weight * e.reps * e.sets : 0), 0);

        const twAvgDuration = tw.length > 0
            ? Math.round(tw.reduce((s: number, e: any) => s + e.duration, 0) / tw.length)
            : 0;

        const twCalories = tw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
        const lwCalories = lw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
        const calDelta = lwCalories > 0 ? Math.round(((twCalories - lwCalories) / lwCalories) * 100) : null;

        const twCount = tw.length;
        const lwCount = lw.length;
        const countDelta = lwCount > 0 ? twCount - lwCount : null;

        // Streak — consecutive active days ending today
        const allDates = new Set([...tw, ...lw].map((e: any) => e.date));
        let streak = 0;
        for (let i = 0; i < 14; i++) {
            if (allDates.has(toIsoDate(addDays(new Date(), -i)))) streak++;
            else break;
        }

        // Workout type breakdown
        const typeCount: Record<string, number> = {};
        tw.forEach((e: any) => {
            const t = e.exerciseType ?? 'other';
            typeCount[t] = (typeCount[t] ?? 0) + 1;
        });
        const typeEntries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
        const maxType = typeEntries[0]?.[1] ?? 1;

        const typeLabels: Record<string, string> = {
            strength: 'Strength', cardio: 'Cardio', hiit: 'HIIT', yoga: 'Yoga / Mindful',
        };
        const typeColors: Record<string, string> = {
            strength: '#3b82f6', cardio: '#f59e0b', hiit: '#ef4444', yoga: '#10b981',
        };

        // Best day
        const dayCounts: Record<string, number> = {};
        tw.forEach((e: any) => { dayCounts[e.date] = (dayCounts[e.date] ?? 0) + 1; });
        const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        const bestDayLabel = bestDay
            ? new Date(bestDay[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
            : null;

        // Personal best (max weight across all entries)
        const maxWeight = Math.max(0, ...tw.map((e: any) => e.weight ?? 0));
        const lwMaxWeight = Math.max(0, ...lw.map((e: any) => e.weight ?? 0));

        return {
            streak,
            twCount,
            lwCount,
            countDelta,
            calDelta,
            twCalories: Math.round(twCalories),
            twVolume: Math.round(twVolume),
            lwVolume: Math.round(lwVolume),
            twAvgDuration,
            typeEntries,
            maxType,
            typeLabels,
            typeColors,
            bestDayLabel,
            bestDayCount: bestDay ? Number(bestDay[1]) : 0,
            maxWeight,
            lwMaxWeight,
            hasData: tw.length > 0,
        };
    }, [thisWeekEntries, lastWeekEntries]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Move Insights</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── WEEKLY PROGRESS CHART ──────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Weekly Progress</Text>
                        <Ionicons name="trending-up" size={20} color="#2563eb" />
                    </View>
                    <View style={styles.chartContainer}>
                        {weekData.map((count, idx) => (
                            <View key={idx} style={styles.chartBarWrapper}>
                                <View style={[
                                    styles.chartBar,
                                    { height: Math.max(6, count * 20), opacity: count === 0 ? 0.2 : 1 }
                                ]} />
                                <Text style={styles.chartDay}>{weekLabels[idx]}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.weeklyStatsRow}>
                        <View style={styles.weeklyStatItem}>
                            <Text style={styles.weeklyStatVal}>{weekData.reduce((a, b) => a + b, 0)}</Text>
                            <Text style={styles.weeklyStatLab}>Sessions</Text>
                        </View>
                        <View style={styles.weeklyStatItem}>
                            <Text style={styles.weeklyStatVal}>
                                {Math.round((thisWeekEntries ?? []).reduce((s: number, e: any) => s + e.duration, 0) / 60)}h
                            </Text>
                            <Text style={styles.weeklyStatLab}>Total Time</Text>
                        </View>
                        <View style={styles.weeklyStatItem}>
                            <Text style={styles.weeklyStatVal}>
                                {Math.round((thisWeekEntries ?? []).reduce((s: number, e: any) => s + e.caloriesBurned, 0))}
                            </Text>
                            <Text style={styles.weeklyStatLab}>Calories</Text>
                        </View>
                    </View>
                </View>

                {/* ── PRO INSIGHTS ─────────────────────────────────────────── */}
                {isPro ? (
                    <>
                        {insights.hasData ? (
                            <>
                                {/* Unique KPIs — NOT repeating Move screen KPIs */}
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>This Week vs Last Week</Text>
                                    <Text style={styles.cardSubtitle}>Unique metrics beyond today's totals</Text>

                                    <StatRow
                                        icon="flame-outline" iconColor="#ea580c" iconBg="#fed7aa"
                                        label="Calorie Burn Trend"
                                        value={`${insights.twCalories} kcal`}
                                        sub="This week total"
                                        trend={insights.calDelta !== null ? `${Math.abs(insights.calDelta)}% vs last week` : undefined}
                                        trendUp={insights.calDelta !== null ? insights.calDelta >= 0 : undefined}
                                    />
                                    <View style={styles.divider} />
                                    <StatRow
                                        icon="flash-outline" iconColor="#7c3aed" iconBg="#ede9fe"
                                        label="Consistency Streak"
                                        value={`${insights.streak} day${insights.streak !== 1 ? 's' : ''}`}
                                        sub={insights.streak >= 3 ? '🔥 On fire!' : insights.streak > 0 ? 'Keep going!' : 'Start today'}
                                        trendUp={insights.streak > 0}
                                    />
                                    <View style={styles.divider} />
                                    <StatRow
                                        icon="barbell-outline" iconColor="#0891b2" iconBg="#cffafe"
                                        label="Avg Session Length"
                                        value={`${insights.twAvgDuration} min`}
                                        sub="Per workout this week"
                                    />
                                    {insights.maxWeight > 0 && (
                                        <>
                                            <View style={styles.divider} />
                                            <StatRow
                                                icon="trophy-outline" iconColor="#d97706" iconBg="#fef3c7"
                                                label="Heaviest Lift This Week"
                                                value={`${insights.maxWeight} kg`}
                                                sub="Personal best tracker"
                                                trend={insights.lwMaxWeight > 0
                                                    ? `${insights.maxWeight >= insights.lwMaxWeight ? '+' : ''}${Math.round(insights.maxWeight - insights.lwMaxWeight)} kg vs last week`
                                                    : undefined}
                                                trendUp={insights.maxWeight >= insights.lwMaxWeight}
                                            />
                                        </>
                                    )}
                                    {insights.twVolume > 0 && (
                                        <>
                                            <View style={styles.divider} />
                                            <StatRow
                                                icon="stats-chart-outline" iconColor="#16a34a" iconBg="#dcfce7"
                                                label="Total Volume Lifted"
                                                value={`${insights.twVolume.toLocaleString()} kg`}
                                                sub="Weight × Reps × Sets this week"
                                                trend={insights.lwVolume > 0
                                                    ? `${insights.twVolume >= insights.lwVolume ? '+' : ''}${Math.round(((insights.twVolume - insights.lwVolume) / Math.max(1, insights.lwVolume)) * 100)}% vs last week`
                                                    : undefined}
                                                trendUp={insights.twVolume >= insights.lwVolume}
                                            />
                                        </>
                                    )}
                                </View>

                                {/* Workout Mix */}
                                {insights.typeEntries.length > 0 && (
                                    <View style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.cardTitle}>Workout Mix</Text>
                                            <Ionicons name="pie-chart-outline" size={18} color="#64748b" />
                                        </View>
                                        <Text style={styles.cardSubtitle}>Session types logged this week</Text>
                                        <View style={{ marginTop: 16 }}>
                                            {insights.typeEntries.map(([type, count]) => (
                                                <MiniBar
                                                    key={type}
                                                    label={insights.typeLabels[type] ?? type}
                                                    value={count}
                                                    max={insights.maxType}
                                                    color={insights.typeColors[type] ?? '#64748b'}
                                                />
                                            ))}
                                        </View>
                                        {insights.typeEntries.length < 2 && (
                                            <View style={styles.tipBox}>
                                                <Ionicons name="bulb-outline" size={14} color="#2563eb" />
                                                <Text style={styles.tipText}>
                                                    Mix in cardio or yoga for a more balanced week
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Best day */}
                                {insights.bestDayLabel && (
                                    <View style={[styles.card, styles.bestDayCard]}>
                                        <Ionicons name="trophy" size={24} color="#f59e0b" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bestDayLabel}>Most Active Day This Week</Text>
                                            <Text style={styles.bestDayValue}>{insights.bestDayLabel}</Text>
                                            <Text style={styles.bestDaySub}>
                                                {insights.bestDayCount} session{insights.bestDayCount !== 1 ? 's' : ''} logged
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.emptyCard}>
                                <Ionicons name="analytics-outline" size={48} color="#e2e8f0" />
                                <Text style={styles.emptyTitle}>No workout data yet this week</Text>
                                <Text style={styles.emptySub}>
                                    Log your first session to unlock personalized insights and trend analysis.
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    /* Free users — locked insights card */
                    <TouchableOpacity style={styles.lockedCard} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
                        <View style={styles.lockedInner}>
                            <View style={styles.proBadge}>
                                <Ionicons name="star" size={13} color="#f59e0b" />
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                            <Text style={styles.lockedTitle}>Advanced Insights</Text>
                            <Text style={styles.lockedSub}>
                                Unlock calorie burn trends, personal bests, volume tracking, streak analysis, and workout variety — all compared week over week.
                            </Text>
                            <View style={styles.upgradeBtn}>
                                <Text style={styles.upgradeBtnText}>Upgrade to Pro →</Text>
                            </View>
                        </View>
                        {/* Blurred KPI preview rows */}
                        <View style={styles.blurredPreview} pointerEvents="none">
                            {['Calorie Burn Trend', 'Consistency Streak', 'Total Volume', 'Personal Best'].map(label => (
                                <View key={label} style={styles.blurRow}>
                                    <View style={styles.blurIcon} />
                                    <View style={styles.blurTextCol}>
                                        <View style={[styles.blurLine, { width: 80 }]} />
                                        <View style={[styles.blurLine, { width: 50, marginTop: 4, opacity: 0.4 }]} />
                                    </View>
                                    <View style={[styles.blurLine, { width: 60 }]} />
                                </View>
                            ))}
                        </View>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <ProUpgradeModal
                visible={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
                title="Unlock Pro Insights"
                message="Get week-over-week trends, personal bests, volume tracking, streak analysis and more."
                upgradeLabel="View Pro Plans"
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const statStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    textCol: { flex: 1 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 2 },
    value: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    sub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    trendPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    trendText: { fontSize: 10, fontWeight: '700' },
});

const barStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    label: { width: 90, fontSize: 12, fontWeight: '600', color: '#475569' },
    bg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
    val: { width: 24, fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'right' },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    scroll: { flex: 1 },
    content: { padding: 20, gap: 16 },

    card: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: '#f1f5f9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    cardSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
    divider: { height: 1, backgroundColor: '#f1f5f9' },

    // Chart
    chartContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        height: 80, marginVertical: 16, paddingHorizontal: 4,
    },
    chartBarWrapper: { alignItems: 'center', flex: 1 },
    chartBar: { width: 20, backgroundColor: '#2563eb', borderRadius: 4, minHeight: 6 },
    chartDay: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
    weeklyStatsRow: {
        flexDirection: 'row', justifyContent: 'space-around',
        paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
    weeklyStatItem: { alignItems: 'center' },
    weeklyStatVal: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
    weeklyStatLab: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    // Tips
    tipBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginTop: 12,
    },
    tipText: { flex: 1, fontSize: 12, color: '#1e40af' },

    // Best day
    bestDayCard: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: '#fffbeb', borderColor: '#fde68a',
    },
    bestDayLabel: { fontSize: 11, fontWeight: '700', color: '#92400e', marginBottom: 2 },
    bestDayValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    bestDaySub: { fontSize: 11, color: '#78350f', marginTop: 2 },

    // Empty
    emptyCard: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 40,
        alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9',
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

    // Locked card for free users
    lockedCard: {
        backgroundColor: '#1e293b', borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: '#334155',
    },
    lockedInner: { padding: 24, alignItems: 'center' },
    proBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 14,
    },
    proBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
    lockedTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 10, textAlign: 'center' },
    lockedSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    upgradeBtn: {
        backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 14,
    },
    upgradeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
    blurredPreview: { padding: 16, paddingTop: 0, gap: 2 },
    blurRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
        opacity: 0.3,
    },
    blurIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#475569' },
    blurTextCol: { flex: 1 },
    blurLine: { height: 10, backgroundColor: '#64748b', borderRadius: 4 },
});