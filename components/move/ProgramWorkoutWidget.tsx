import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WorkoutDayCard from './WorkoutDayCard';

interface ExerciseThumb {
  id: string;
  name: string;
  thumbnailUrl?: string; // e.g. a GIF or static image link
}

interface WorkoutDay {
  dayNum: number;
  dayTitle: string;
  muscleGroups: string;
  exercises: ExerciseThumb[];
}

interface ProgramWorkoutWidgetProps {
  // Program Info
  programName?: string;
  level?: string;
  daysPerWeek?: number;
  currentWeek?: number;
  totalWeeks?: number;
  progressPercent?: number;
  
  // Workouts
  workouts: WorkoutDay[];
  
  // Callbacks
  onInfoPress?: () => void;
  onWorkoutsPress?: () => void;
  onStartWorkout: (index: number) => void;
  onViewWorkout: (index: number) => void;
}

export default function ProgramWorkoutWidget({
  programName = 'Your 4-Week Program',
  level = 'Beginner',
  daysPerWeek = 3,
  currentWeek = 1,
  totalWeeks = 4,
  progressPercent = 0,
  workouts,
  onInfoPress,
  onWorkoutsPress,
  onStartWorkout,
  onViewWorkout
}: ProgramWorkoutWidgetProps) {
  return (
    <View style={styles.card}>
      {/* Top Header - Program Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
             <Ionicons name="fitness" size={24} color="#3b82f6" />
          </View>
          <View style={styles.titleBox}>
             <Text style={styles.programTitle} numberOfLines={1}>{programName}</Text>
             <Text style={styles.programSubtitle}>
               {level} • {daysPerWeek} days/week
             </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Week {currentWeek} of {totalWeeks}
            </Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Bottom - Workout List */}
      <View style={styles.workoutsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {workouts.map((day, idx) => (
            <WorkoutDayCard
              key={day.dayNum || idx}
              dayTitle={day.dayTitle}
              muscleGroups={day.muscleGroups}
              exercises={day.exercises}
              isUpNext={idx === 0}
              onStartWorkout={() => onStartWorkout(idx)}
              onViewWorkout={() => onViewWorkout(idx)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleBox: {
    flex: 1,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  programSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 0,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  workoutsContainer: {
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  }
});
