import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MoveQuickActionsProps {
  onAddWorkout: () => void;
  onAddSteps: () => void;
  onCustomExercise: () => void;
  onViewPlan?: () => void;
}

export default function MoveQuickActions({
  onAddWorkout,
  onAddSteps,
  onCustomExercise,
  onViewPlan,
}: MoveQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.row}>
        <TouchableOpacity style={styles.actionItem} onPress={onAddWorkout} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="library" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionTitle}>Exercise Library</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onAddSteps} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="footsteps" size={24} color="#10b981" />
          </View>
          <Text style={styles.actionTitle}>Add Steps</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onCustomExercise} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="add-circle" size={24} color="#f97316" />
          </View>
          <Text style={styles.actionTitle}>Custom Exercise</Text>
        </TouchableOpacity>

        {onViewPlan && (
          <TouchableOpacity style={styles.actionItem} onPress={onViewPlan} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="calendar-outline" size={24} color="#a855f7" />
            </View>
            <Text style={styles.actionTitle}>AI Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 88,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
});
