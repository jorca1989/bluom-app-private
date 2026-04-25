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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

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

        const twVolume = tw.reduce((s: number, e: any) => s + (e.weight && e.reps && e.sets ? e.weight * e.reps * e.sets : 0), 0);
        const lwVolume = lw.reduce((s: number, e: any) => s + (e.weight && e.reps && e.sets ? e.weight * e.reps * e.sets : 0), 0);
        const twAvgDuration = tw.length > 0 ? Math.round(tw.reduce((s: number, e: any) => s + e.duration, 0) / tw.length) : 0;
        const twCalories = tw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
        const lwCalories = lw.reduce((s: number, e: any) => s + e.caloriesBurned, 0);
        const calDelta = lwCalories > 0 ? Math.round(((twCalories - lwCalories) / lwCalories) * 100) : null;

        const allDates = new Set([...tw, ...lw].map((e: any) => e.date));
        let streak = 0;
        for (let i = 0; i < 14; i++) {
            if (allDates.has(toIsoDate(addDays(new Date(), -i)))) streak++;
            else break;
        }

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

        const dayCounts: Record<string, number> = {};
        tw.forEach((e: any) => { dayCounts[e.date] = (dayCounts[e.date] ?? 0) + 1; });
        const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        const bestDayLabel = bestDay
            ? new Date(bestDay[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
            : null;

        const maxWeight = Math.max(0, ...tw.map((e: any) => e.weight ?? 0));
        const lwMaxWeight = Math.max(0, ...lw.map((e: any) => e.weight ?? 0));

        return {
            streak,
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
            calDelta,
            hasData: tw.length > 0,
        };
    }, [thisWeekEntries, lastWeekEntries]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('move.insightsTitle', 'Move Insights')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── WEEKLY PROGRESS CHART (Visible to all) ──────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{t('move.weeklyProgress', 'Weekly Progress')}</Text>
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
                            <Text style={styles.weeklyStatLab}>{t('move.sessions', 'Sessions')}</Text>
                        </View>
                        <View style={styles.weeklyStatItem}>
                            <Text style={styles.weeklyStatVal}>
                                {Math.round((thisWeekEntries ?? []).reduce((s: number, e: any) => s + e.duration, 0) / 60)}h
                            </Text>
                            <Text style={styles.weeklyStatLab}>{t('move.totalTime', 'Total Time')}</Text>
                        </View>
                        <View style={styles.weeklyStatItem}>
                            <Text style={styles.weeklyStatVal}>
                                {Math.round((thisWeekEntries ?? []).reduce((s: number, e: any) => s + e.caloriesBurned, 0))}
                            </Text>
                            <Text style={styles.weeklyStatLab}>{t('move.calories', 'Calories')}</Text>
                        </View>
                    </View>
                </View>

                {/* ── ADVANCED INSIGHTS SECTION ──────────────────────────── */}
                <View style={{ position: 'relative', marginTop: 16 }}>
                    {insights.hasData ? (
                        <>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t('move.thisWeekVsLastWeek', 'This Week vs Last Week')}</Text>
                                <StatRow
                                    icon="flame-outline" iconColor="#ea580c" iconBg="#fed7aa"
                                    label={t('move.calorieBurnTrend', 'Calorie Burn Trend')}
                                    value={`${insights.twCalories} kcal`}
                                    sub={t('move.thisWeekTotal', 'This week total')}
                                    trend={insights.calDelta !== null ? t('move.vsLastWeek', { val: Math.abs(insights.calDelta) }) : undefined}
                                    trendUp={insights.calDelta !== null ? insights.calDelta >= 0 : undefined}
                                />
                                <View style={styles.divider} />
                                <StatRow
                                    icon="flash-outline" iconColor="#7c3aed" iconBg="#ede9fe"
                                    label={t('move.consistencyStreak', 'Consistency Streak')}
                                    value={t('move.daysCount', { count: insights.streak })}
                                    sub={insights.streak >= 3 ? t('move.onFire', '🔥 On fire!') : t('move.keepGoing', 'Keep going!')}
                                />
                                <View style={styles.divider} />
                                <StatRow
                                    icon="barbell-outline" iconColor="#0891b2" iconBg="#cffafe"
                                    label={t('move.avgSessionLength', 'Avg Session Length')}
                                    value={`${insights.twAvgDuration} min`}
                                />
                            </View>

                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t('move.workoutMix', 'Workout Mix')}</Text>
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
                            </View>

                            {insights.bestDayLabel && (
                                <View style={[styles.card, styles.bestDayCard]}>
                                    <Ionicons name="trophy" size={24} color="#f59e0b" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.bestDayLabel}>{t('move.mostActiveDay', 'Most Active Day')}</Text>
                                        <Text style={styles.bestDayValue}>{insights.bestDayLabel}</Text>
                                        <Text style={styles.bestDaySub}>{t('move.sessions_count', { count: insights.bestDayCount })}</Text>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Ionicons name="analytics-outline" size={48} color="#e2e8f0" />
                            <Text style={styles.emptyTitle}>{t('move.noWorkoutDataYet', 'No workout data yet')}</Text>
                            <Text style={styles.emptySub}>{t('move.logToUnlockTrends', 'Log sessions to unlock trends.')}</Text>
                        </View>
                    )}

                    {/* LOCK OVERLAY FOR FREE USERS */}
                    {!isPro && (
                        <View style={styles.proLockOverlay}>
                            <View style={styles.lockContent}>
                                <View style={styles.lockIconCircle}>
                                    <Ionicons name="lock-closed" size={28} color="#2563eb" />
                                </View>
                                <Text style={styles.lockTitle}>{t('move.unlockProAnalysis', 'Unlock Pro Analysis')}</Text>
                                <Text style={styles.lockSubtitle}>{t('move.unlockProDesc', 'Get trends, volume tracking, and personal bests.')}</Text>
                                <TouchableOpacity style={styles.lockUpgradeBtn} onPress={() => setShowUpgrade(true)}>
                                    <Text style={styles.lockUpgradeText}>{t('move.upgradeToPro', 'Upgrade to Pro')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <ProUpgradeModal
                visible={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
                title="Unlock Pro Insights"
                message="Get week-over-week trends, personal bests, and streak analysis."
            />
        </SafeAreaView>
    );
}

const statStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    textCol: { flex: 1 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 2 },
    value: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    sub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    trendPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    scroll: { flex: 1 },
    content: { padding: 20, gap: 16 },
    card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    divider: { height: 1, backgroundColor: '#f1f5f9' },
    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, marginTop: 20, marginBottom: 16, paddingHorizontal: 4 },
    chartBarWrapper: { alignItems: 'center', flex: 1 },
    chartBar: { width: 20, backgroundColor: '#2563eb', borderRadius: 4, minHeight: 6 },
    chartDay: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
    weeklyStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    weeklyStatItem: { alignItems: 'center' },
    weeklyStatVal: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
    weeklyStatLab: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    bestDayCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fffbeb', borderColor: '#fde68a' },
    bestDayLabel: { fontSize: 11, fontWeight: '700', color: '#92400e', marginBottom: 2 },
    bestDayValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    bestDaySub: { fontSize: 11, color: '#78350f', marginTop: 2 },
    emptyCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
    proLockOverlay: { position: 'absolute', top: 0, left: -10, right: -10, bottom: -10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    lockContent: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 30, padding: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#f1f5f9', width: '90%' },
    lockIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    lockTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
    lockSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    lockUpgradeBtn: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
    lockUpgradeText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
