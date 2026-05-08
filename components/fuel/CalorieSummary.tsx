import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

interface CalorieSummaryProps {
  consumed: number;
  goal: number;
}

const CalorieSummary = ({ consumed, goal }: CalorieSummaryProps) => {
  const { t } = useTranslation();
  const remaining = goal - consumed;
  const progress = Math.min(Math.max(consumed / (goal || 1), 0), 1); // Clamp to 0-1

  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - progress * circumference;

  return (
    <View style={styles.container}>
      {/* Circular Progress */}
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9" // hsl(var(--muted)) equivelant - slate 100
            strokeWidth={stroke}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10b981" // emerald 500 for primary green
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={styles.remainingText} adjustsFontSizeToFit numberOfLines={1}>
            {Math.round(Math.abs(remaining))}
          </Text>
          <Text style={styles.kcalLeftText}>
            {remaining < 0 ? t('fuel.summary.kcalOver', 'kcal over') : t('fuel.summary.kcalLeft', 'kcal left')}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {/* Consumed */}
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          <View>
            <Text style={styles.legendLabel}>{t('fuel.summary.consumed', 'Consumed')}</Text>
            <Text style={styles.legendValue}>{Math.round(consumed)} kcal</Text>
          </View>
        </View>
        {/* Goal */}
        <View style={[styles.legendRow, { marginTop: 16 }]}>
          <View style={[styles.dot, { backgroundColor: '#e2e8f0' }]} />
          <View>
            <Text style={styles.legendLabel}>{t('fuel.summary.goal', 'Goal')}</Text>
            <Text style={styles.legendValue}>{Math.round(goal)} kcal</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CalorieSummary;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: 'System', // use default or replace if loaded custom font
  },
  kcalLeftText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  legendContainer: {
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  legendValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});
