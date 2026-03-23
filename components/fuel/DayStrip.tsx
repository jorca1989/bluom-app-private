/**
 * components/fuel/DayStrip.tsx
 *
 * Upgraded DayStrip with a "filling glass" effect:
 * – Selected day's pill has a blue tint border + a fill layer that rises from
 *   the bottom as the user logs food (fillFraction = calories_logged / goal).
 * – Other days show a faint fill based on their own logged fraction (fillMap).
 * – paddingHorizontal matches the fuel card's inner padding (24) so the pills
 *   align perfectly with the card edges.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// pill size fits 7 items inside card inner width (screen - 48px card margin)
const PILL_W = Math.floor(Math.max(44, Math.min(52, (SCREEN_WIDTH - 48 - 6 * 8) / 7)));
const PILL_H = PILL_W + 12;

export interface DayItem {
  short: string;     // "Mon"
  date: number;      // 15
  fullDate: string;  // "2024-03-15"
}

interface DayStripProps {
  days: DayItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  /** 0–1: how full the SELECTED day's glass is (calories logged / goal) */
  fillFraction?: number;
  /** Map of fullDate → 0–1 fill fraction for NON-selected days */
  fillMap?: Record<string, number>;
}

const DayStrip = ({
  days,
  selectedDate,
  onSelectDate,
  fillFraction = 0,
  fillMap = {},
}: DayStripProps) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = days.findIndex(d => d.fullDate === selectedDate);
    if (idx !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, idx * (PILL_W + 8) - 80), animated: true });
    }
  }, [selectedDate, days]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isSelected = day.fullDate === selectedDate;
          const rawFill = isSelected ? fillFraction : (fillMap[day.fullDate] ?? 0);
          const fill = Math.min(Math.max(rawFill, 0), 1);
          const goalMet = fill >= 1;

          return (
            <TouchableOpacity
              key={day.fullDate}
              onPress={() => onSelectDate(day.fullDate)}
              activeOpacity={0.75}
              style={styles.item}
            >
              {/* Day label above pill */}
              <Text style={[styles.shortText, isSelected && styles.shortTextSelected]}>
                {day.short.slice(0, 1)}
              </Text>

              {/* The pill / glass */}
              <View style={[styles.pill, isSelected && styles.pillSelected]}>

                {/* Glass fill layer — rises from bottom */}
                {fill > 0 && (
                  <View
                    style={[
                      styles.fillLayer,
                      {
                        height: `${fill * 100}%`,
                        backgroundColor: goalMet
                          ? (isSelected ? 'rgba(16,185,129,0.55)' : 'rgba(16,185,129,0.22)')
                          : (isSelected ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.16)'),
                      },
                    ]}
                  />
                )}

                {/* Gloss sheen — subtle top highlight */}
                <View style={styles.gloss} pointerEvents="none" />

                {/* Date number */}
                <Text style={[
                  styles.dateText,
                  isSelected && styles.dateTextSelected,
                  !isSelected && fill > 0 && styles.dateTextLogged,
                ]}>
                  {goalMet && isSelected ? '✓' : day.date}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DayStrip;

const styles = StyleSheet.create({
  container: {
    // No horizontal padding here — the scrollContent handles alignment
    // so the first pill's left edge sits at card padding (24).
    paddingVertical: 8,
  },
  scrollContent: {
    // 24 = matches fuel card's paddingHorizontal so pills align with card content
    paddingHorizontal: 24,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  item: {
    alignItems: 'center',
    gap: 4,
  },

  shortText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  shortTextSelected: {
    color: '#2563eb',
  },

  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  pillSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },

  // Rises from the bottom of the pill — the "water" fill
  fillLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // borderRadius only on top corners so it looks like liquid surface
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  // Very subtle white gloss at top-center — gives the "glass" look
  gloss: {
    position: 'absolute',
    top: 4,
    left: '20%',
    right: '20%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 3,
  },

  dateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    zIndex: 1,
  },
  dateTextSelected: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  dateTextLogged: {
    color: '#3b82f6',
  },
});
