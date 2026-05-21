import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Calendar, Target, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

interface EstimatorProps {
  currentWeight: number;
  targetWeight: number;
  weeklyTime: number;
  commitmentLevel: string;
  units: string;
}

export default function GoalEstimator({
  currentWeight,
  targetWeight,
  weeklyTime,
  commitmentLevel,
  units,
}: EstimatorProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { t } = useTranslation();

  const weightDiff = Math.abs(currentWeight - targetWeight);
  const isLosing = targetWeight < currentWeight;

  const weeklyLossRates: Record<string, number> = { easy: 0.25, balanced: 0.5, maximum: 0.75 };
  const weeklyRate = weeklyLossRates[commitmentLevel] || 0.5;
  const estimatedWeeks = weightDiff > 0 ? Math.ceil(weightDiff / weeklyRate) : 0;
  const estimatedMonths = Math.floor(estimatedWeeks / 4);
  const remainingWeeks = estimatedWeeks % 4;

  const timelineText =
    estimatedMonths > 0
      ? `${estimatedMonths} ${t('onboarding.estimator.month', { count: estimatedMonths })}${remainingWeeks > 0 ? ` ${remainingWeeks} ${t('onboarding.estimator.week', { count: remainingWeeks })}` : ''}`
      : `${estimatedWeeks} ${t('onboarding.estimator.week', { count: estimatedWeeks })}`;

  const commitmentLabels: Record<string, string> = {
    easy: t('onboarding.estimator.commitEasy'),
    balanced: t('onboarding.estimator.commitBalanced'),
    maximum: t('onboarding.estimator.commitMaximum'),
  };

  const milestones = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const weight = isLosing
      ? currentWeight - weightDiff * progress
      : currentWeight + weightDiff * progress;
    const weekNum = Math.round(estimatedWeeks * progress);
    milestones.push({ weight: Math.round(weight * 10) / 10, week: weekNum });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Target size={32} color={themeColors.primary} />
        </View>
        <Text style={styles.title}>{t('onboarding.estimator.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.estimator.subtitle')}</Text>
      </View>

      <View style={styles.timelineCard}>
        <Calendar size={40} color={themeColors.primary} style={{ marginBottom: 12 }} />
        <Text style={styles.timelineValue}>{timelineText}</Text>
        <Text style={styles.timelineLabel}>{t('onboarding.estimator.estimatedTime')}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendingUp size={22} color="#10b981" />
          <Text style={styles.statValue}>{weightDiff.toFixed(1)} {units}</Text>
          <Text style={styles.statLabel}>{isLosing ? t('onboarding.estimator.toLose') : t('onboarding.estimator.toGain')}</Text>
        </View>
        <View style={styles.statCard}>
          <Zap size={22} color="#f59e0b" />
          <Text style={styles.statValue}>~{weeklyRate.toFixed(2)} {units}</Text>
          <Text style={styles.statLabel}>{t('onboarding.estimator.perWeek')}</Text>
        </View>
      </View>

      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>{t('onboarding.estimator.journey')}</Text>
        <View style={styles.graphRow}>
          <View style={styles.graphYAxis}>
            <Text style={styles.graphYLabel}>{currentWeight} {units}</Text>
            <Text style={styles.graphYLabel}>{targetWeight} {units}</Text>
          </View>
          <View style={styles.graphBars}>
            {milestones.map((m, i) => {
              const maxW = Math.max(currentWeight, targetWeight);
              const minW = Math.min(currentWeight, targetWeight);
              const range = maxW - minW || 1;
              const distFromTarget = Math.abs(m.weight - targetWeight);
              const barPercent = Math.max(10, Math.min(100, (distFromTarget / range) * 80 + 20));
              const isLast = i === milestones.length - 1;
              return (
                <View key={i} style={styles.graphBarCol}>
                  <View style={[styles.graphBar, { height: `${barPercent}%`, backgroundColor: isLast ? '#10b981' : themeColors.primary, opacity: isLast ? 1 : 0.3 + (i / milestones.length) * 0.7 }]} />
                  <Text style={styles.graphBarLabel}>{m.week === 0 ? t('onboarding.estimator.now') : `${t('onboarding.estimator.wk')} ${m.week}`}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.commitmentBadge}>
        <Text style={styles.commitmentText}>{commitmentLabels[commitmentLevel]}</Text>
      </View>

      <Text style={styles.disclaimer}>⚡ {t('onboarding.estimator.disclaimer')}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: c.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: c.border },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.textMuted },
  timelineCard: { backgroundColor: c.surfaceMuted, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: c.primary },
  timelineValue: { fontSize: 30, fontWeight: '900', color: c.primary, marginBottom: 6 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: c.surfaceMuted, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  statValue: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 6, marginBottom: 2 },
  statLabel: { fontSize: 12, color: c.textMuted, textAlign: 'center' },
  graphContainer: { backgroundColor: c.surfaceMuted, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: c.border },
  graphTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 12, textAlign: 'center' },
  graphRow: { flexDirection: 'row', height: 100 },
  graphYAxis: { justifyContent: 'space-between', marginRight: 8, paddingBottom: 18 },
  graphYLabel: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  graphBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  graphBarCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  graphBar: { width: 20, borderRadius: 6, minHeight: 8 },
  graphBarLabel: { fontSize: 9, color: c.textMuted, marginTop: 4, fontWeight: '600' },
  commitmentBadge: { backgroundColor: c.surfaceMuted, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  commitmentText: { fontSize: 14, fontWeight: '700', color: c.primary },
  disclaimer: { fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 18, fontStyle: 'italic' },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
