import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CurrentProgramCardProps {
  programName?: string;
  level?: string;
  daysPerWeek?: number;
  currentWeek?: number;
  totalWeeks?: number;
  progressPercent?: number;
  onInfoPress?: () => void;
  onWorkoutsPress?: () => void;
}

export default function CurrentProgramCard({
  programName = 'Your 4-Week Program',
  level = 'Beginner',
  daysPerWeek = 3,
  currentWeek = 1,
  totalWeeks = 4,
  progressPercent = 0,
}: CurrentProgramCardProps) {
  return (
    <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: 24,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleBox: {
    flex: 1,
  },
  programTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  programSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
});
