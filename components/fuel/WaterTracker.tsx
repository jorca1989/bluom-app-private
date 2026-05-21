import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors } from '@/context/ThemeContext';

interface WaterTrackerProps {
  currentOz: number;
  goalOz: number;
  onAddWater: (oz: number) => void;
  isMetric: boolean;
}

const TOTAL_GLASSES = 8;

const WaterTracker = ({ currentOz, goalOz, onAddWater, isMetric }: WaterTrackerProps) => {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  // Assume each glass is goalOz / 8. Or just use 8 glasses for the standard ~64oz.
  // For simplicity, keeping the logic from screenshot: 8 glasses total.
  const glassOz = goalOz / TOTAL_GLASSES; 
  const filledGlasses = Math.min(Math.floor(currentOz / Math.max(glassOz, 1)), TOTAL_GLASSES);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>💧</Text>
          <Text style={styles.title}>{t('fuel.waterTracker.water', 'Water')}</Text>
        </View>
        <Text style={styles.subtitle}>{filledGlasses}/{TOTAL_GLASSES} {t('fuel.waterTracker.glasses', 'glasses')}</Text>
      </View>

      <View style={styles.glassesContainer}>
        {Array.from({ length: TOTAL_GLASSES }).map((_, i) => {
          const isFilled = i < filledGlasses;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onAddWater(glassOz)}
              activeOpacity={0.7}
              style={[
                styles.glass,
                isFilled ? styles.glassFilled : styles.glassEmpty
              ]}
            >
              <Ionicons 
                name="water" 
                size={18} 
                color={isFilled ? '#3b82f6' : 'rgba(148, 163, 184, 0.4)'} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default WaterTracker;

const createStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: c.surfaceMuted
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
  },
  glassesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  glass: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 42,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassFilled: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue 500 at 15% opacity
  },
  glassEmpty: {
    backgroundColor: c.surfaceMuted, // Slate 50
    borderWidth: 1,
    borderColor: c.surfaceMuted, // Slate 100
  },
});

