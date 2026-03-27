import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Calendar, Target, Zap } from 'lucide-react-native';

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
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const isLosing = targetWeight < currentWeight;

  const weeklyLossRates: Record<string, number> = {
    easy: 0.25,
    balanced: 0.5,
    maximum: 0.75,
  };

  const weeklyRate = weeklyLossRates[commitmentLevel] || 0.5;
  const estimatedWeeks = weightDiff > 0 ? Math.ceil(weightDiff / weeklyRate) : 0;
  const estimatedMonths = Math.floor(estimatedWeeks / 4);
  const remainingWeeks = estimatedWeeks % 4;

  const timelineText =
    estimatedMonths > 0
      ? `${estimatedMonths} month${estimatedMonths > 1 ? 's' : ''}${
          remainingWeeks > 0
            ? ` ${remainingWeeks} wk${remainingWeeks > 1 ? 's' : ''}`
            : ''
        }`
      : `${estimatedWeeks} week${estimatedWeeks > 1 ? 's' : ''}`;

  const commitmentLabels: Record<string, string> = {
    easy: 'Gentle & Sustainable',
    balanced: 'Steady Progress',
    maximum: 'Intensive Transformation',
  };

  // Generate progress milestones for the mini graph
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
          <Target size={32} color="#2563eb" />
        </View>
        <Text style={styles.title}>Your Goal Timeline</Text>
        <Text style={styles.subtitle}>
          Based on your commitment and availability
        </Text>
      </View>

      <View style={styles.timelineCard}>
        <Calendar size={40} color="#2563eb" style={{ marginBottom: 12 }} />
        <Text style={styles.timelineValue}>{timelineText}</Text>
        <Text style={styles.timelineLabel}>Estimated Time to Goal</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendingUp size={22} color="#10b981" />
          <Text style={styles.statValue}>
            {weightDiff.toFixed(1)} {units}
          </Text>
          <Text style={styles.statLabel}>
            {isLosing ? 'To Lose' : 'To Gain'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Zap size={22} color="#f59e0b" />
          <Text style={styles.statValue}>
            ~{weeklyRate.toFixed(2)} {units}
          </Text>
          <Text style={styles.statLabel}>Per Week</Text>
        </View>
      </View>

      {/* Mini Progress Graph */}
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Your Journey</Text>
        <View style={styles.graphRow}>
          {/* Y-axis labels */}
          <View style={styles.graphYAxis}>
            <Text style={styles.graphYLabel}>
              {currentWeight} {units}
            </Text>
            <Text style={styles.graphYLabel}>
              {targetWeight} {units}
            </Text>
          </View>
          {/* Graph bars */}
          <View style={styles.graphBars}>
            {milestones.map((m, i) => {
              const maxW = Math.max(currentWeight, targetWeight);
              const minW = Math.min(currentWeight, targetWeight);
              const range = maxW - minW || 1;
              // Bar height represents how far from target
              const distFromTarget = Math.abs(m.weight - targetWeight);
              const barPercent = Math.max(
                10,
                Math.min(100, (distFromTarget / range) * 80 + 20),
              );
              const isLast = i === milestones.length - 1;

              return (
                <View key={i} style={styles.graphBarCol}>
                  <View
                    style={[
                      styles.graphBar,
                      {
                        height: `${barPercent}%`,
                        backgroundColor: isLast ? '#10b981' : '#2563eb',
                        opacity: isLast ? 1 : 0.3 + (i / milestones.length) * 0.7,
                      },
                    ]}
                  />
                  <Text style={styles.graphBarLabel}>
                    {m.week === 0 ? 'Now' : `Wk ${m.week}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.commitmentBadge}>
        <Text style={styles.commitmentText}>
          {commitmentLabels[commitmentLevel]}
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        ⚡ This is an estimate. Actual results depend on consistency, recovery,
        and individual metabolism.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  timelineCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  timelineValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2563eb',
    marginBottom: 6,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  // Mini Graph
  graphContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  graphTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'center',
  },
  graphRow: {
    flexDirection: 'row',
    height: 100,
  },
  graphYAxis: {
    justifyContent: 'space-between',
    marginRight: 8,
    paddingBottom: 18,
  },
  graphYLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  graphBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  graphBarCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphBar: {
    width: 20,
    borderRadius: 6,
    minHeight: 8,
  },
  graphBarLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  commitmentBadge: {
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  commitmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
