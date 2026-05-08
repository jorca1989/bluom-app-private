/**
 * components/fuel/DayStrip.tsx
 *
 * Day strip where each day is a circle with a radial progress ring.
 * The selected day shows a prominent ring (like the macro circles in the
 * screenshot) that fills clockwise as calories are logged toward goal.
 * Non-selected days show a faint ring with their own fill fraction.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamically calculate the circle size so 7 circles fit exactly in the container
// The container has 24px padding on each side (48px total). 
// Let's divide the remaining space allowing for space-between flex layout.
const containerWidth = SCREEN_WIDTH - 48;
const CIRCLE_SIZE = Math.floor(Math.min(50, containerWidth / 7.5));
const STROKE_WIDTH_SELECTED = 3.5;
const STROKE_WIDTH_DEFAULT = 2;

// Animated SVG circle wrapper
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DayItem {
  short: string;    // "Mon"
  date: number;     // 15
  fullDate: string; // "2024-03-15"
}

interface DayStripProps {
  days: DayItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  /** 0–1: how full the SELECTED day's ring is (calories logged / goal) */
  fillFraction?: number;
  /** Map of fullDate → 0–1 fill fraction for NON-selected days */
  fillMap?: Record<string, number>;
}

// ─── Single day circle ────────────────────────────────────────────────────────
interface DayCircleProps {
  day: DayItem;
  isSelected: boolean;
  isToday: boolean;
  fill: number; // 0–1
  onPress: () => void;
}

function DayCircle({ day, isSelected, isToday, fill, onPress }: DayCircleProps) {
  const animatedFill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedFill, {
      toValue: Math.min(Math.max(fill, 0), 1),
      duration: 600,
      useNativeDriver: false, // SVG props can't use native driver
    }).start();
  }, [fill]);

  const size = CIRCLE_SIZE;
  const strokeW = isSelected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Goal met = green, in progress = blue (selected) or light blue (others)
  const goalMet = fill >= 1;
  const ringColor = goalMet
    ? '#10b981'
    : isSelected
    ? '#2563eb'
    : '#93c5fd';

  const trackColor = isSelected ? '#dbeafe' : '#f1f5f9';

  // strokeDashoffset drives the arc: 0 = full ring, circumference = empty
  const strokeDashoffset = animatedFill.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Background circle fill color
  const bgColor = isSelected
    ? goalMet ? '#ecfdf5' : '#eff6ff'
    : '#f8fafc';

  const labelColor = isSelected
    ? goalMet ? '#059669' : '#1d4ed8'
    : isToday
    ? '#3b82f6'
    : '#64748b';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.itemWrap}
    >
      {/* Day letter above circle */}
      <Text style={[
        styles.dayLabel,
        isSelected && styles.dayLabelSelected,
        isToday && !isSelected && styles.dayLabelToday,
      ]}>
        {day.short.slice(0, 1)}
      </Text>

      {/* Circle + SVG ring */}
      <View style={[styles.circleOuter, { width: size, height: size }]}>
        {/* Solid background fill */}
        <View style={[
          styles.circleBg,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]} />

        {/* SVG ring layer */}
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
        >
          {/* Track ring (always visible) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeW}
          />

          {/* Progress ring — rotated so it starts at 12 o'clock */}
          {fill > 0 && (
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeW}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${center}, ${center}`}
            />
          )}
        </Svg>

        {/* Date number / checkmark */}
        <View style={styles.circleLabel}>
          <Text style={[styles.dateNum, { color: labelColor, fontSize: isSelected ? 15 : 13 }]}>
            {goalMet && isSelected ? '✓' : day.date}
          </Text>
        </View>

        {/* Dot for today on non-selected days */}
        {isToday && !isSelected && (
          <View style={[styles.todayDot, { bottom: -5 }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const DayStrip = ({
  days,
  selectedDate,
  onSelectDate,
  fillFraction = 0,
  fillMap = {},
}: DayStripProps) => {
  const scrollRef = useRef<ScrollView>(null);

  // Scroll selected day into view
  useEffect(() => {
    const idx = days.findIndex(d => d.fullDate === selectedDate);
    if (idx !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(0, idx * (CIRCLE_SIZE + 8) - 80),
        animated: true,
      });
    }
  }, [selectedDate, days]);

  const todayISO = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { width: SCREEN_WIDTH }]}
        bounces={false}
      >
        {days.map((day) => {
          const isSelected = day.fullDate === selectedDate;
          const isToday = day.fullDate === todayISO;
          const fill = isSelected
            ? Math.min(Math.max(fillFraction, 0), 1)
            : Math.min(Math.max(fillMap[day.fullDate] ?? 0, 0), 1);

          return (
            <DayCircle
              key={day.fullDate}
              day={day}
              isSelected={isSelected}
              isToday={isToday}
              fill={fill}
              onPress={() => onSelectDate(day.fullDate)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DayStrip;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  itemWrap: {
    alignItems: 'center',
    gap: 5,
  },

  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: '#2563eb',
  },
  dayLabelToday: {
    color: '#3b82f6',
  },

  circleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBg: {
    position: 'absolute',
  },
  circleLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNum: {
    fontWeight: '800',
    textAlign: 'center',
  },

  todayDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
});