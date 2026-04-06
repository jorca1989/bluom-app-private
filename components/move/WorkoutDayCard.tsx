import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  // For visual truncation if more than 3 exercises
  const displayExercises = exercises.slice(0, 3);
  const excessCount = Math.max(0, exercises.length - 3);

  return (
    <View style={[styles.card, isUpNext && styles.cardActive]}>
      {isUpNext && (
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Up Next</Text>
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
      
      <Text style={[styles.countText, { textAlign: 'center' }]}>{exercises.length} exercises</Text>

      <View style={styles.actionsBox}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onStartWorkout}>
          <Text style={styles.primaryBtnText}>Start Workout</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onViewWorkout}>
          <Text style={styles.secondaryBtnText}>View Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  skipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginRight: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  excessText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  countText: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#f8fafc',
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
    color: '#0f172a',
  },
});
