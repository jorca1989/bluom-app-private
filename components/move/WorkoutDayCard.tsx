import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getLocalizedExerciseName } from '@/utils/localize';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

interface ExerciseThumb {
  id: string;
  name: string;
  thumbnailUrl?: string; // e.g. a GIF or static image link
}

interface WorkoutDayCardProps {
  dayTitle: string; 
  muscleGroups: string; // e.g., "Quads, Hamstrings, Glutes, Calves, Abs"
  exercises: ExerciseThumb[];
  isUpNext?: boolean;
  onStartWorkout: () => void;
  onViewWorkout: () => void;
}

export default function WorkoutDayCard({
  dayTitle,
  muscleGroups,
  exercises,
  isUpNext = false,
  onStartWorkout,
  onViewWorkout
}: WorkoutDayCardProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { t, i18n } = useTranslation();

  // For visual truncation if more than 3 exercises
  const displayExercises = exercises.slice(0, 3);
  const excessCount = Math.max(0, exercises.length - 3);

  return (
    <View style={[styles.card, isUpNext && styles.cardActive]}>
      {isUpNext && (
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{t('move.upNext', 'Up Next')}</Text>
          </View>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>{dayTitle}</Text>
      </View>
      {/* muscleGroups removed — duplicate of title */}

      <View style={styles.thumbRow}>
        {displayExercises.map((ex, i) => (
          <View key={ex.id || i} style={styles.thumbBox}>
            {ex.thumbnailUrl ? (
               <Image source={{ uri: ex.thumbnailUrl }} style={styles.thumbImage} resizeMode="contain" />
            ) : (
               <Ionicons name="barbell-outline" size={24} color="#94a3b8" />
            )}
          </View>
        ))}
        {excessCount > 0 && (
          <View style={styles.excessBox}>
            <Text style={styles.excessText}>+{excessCount}</Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.countText, { textAlign: 'center' }]}>{t('move.exercisesCount', '{{count}} exercises', { count: exercises.length })}</Text>

      <View style={styles.actionsBox}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onStartWorkout}>
          <Text style={styles.primaryBtnText}>{t('move.startWorkout', 'Start Workout')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onViewWorkout}>
          <Text style={styles.secondaryBtnText}>{t('move.viewWorkout', 'View Workout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 16,
    width: 280,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardActive: {
    // No extra border in V4
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284c7',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  skipText: {
    fontSize: 13,
    color: c.text,
    fontWeight: '500',
    marginRight: 2,
  },
  subtitle: {
    fontSize: 14,
    color: c.text,
    marginBottom: 20,
    lineHeight: 20,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  thumbBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  excessBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  excessText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textMuted,
  },
  countText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    marginBottom: 24,
  },
  actionsBox: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6', // Darker standard blue
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryBtnArrow: {
    width: 32,
    height: 32,
    backgroundColor: c.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
