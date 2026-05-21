import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

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
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  const actions = [
    { icon: 'library', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: t('move.exerciseLibrary', 'Exercise Library'), onPress: onAddWorkout },
    { icon: 'footsteps', color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: t('move.addStepsAction', 'Add Steps'), onPress: onAddSteps },
    { icon: 'add-circle', color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: t('move.customExercise', 'Custom Exercise'), onPress: onCustomExercise },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{t('move.quickActions', 'Quick Actions')}</Text>
      <View style={styles.row}>
        {actions.map((a) => (
          <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon as any} size={24} color={a.color} />
            </View>
            <Text style={[styles.actionTitle, { color: c.textMuted }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
        {onViewPlan && (
          <TouchableOpacity style={styles.actionItem} onPress={onViewPlan} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
              <Ionicons name="calendar-outline" size={24} color="#a855f7" />
            </View>
            <Text style={[styles.actionTitle, { color: c.textMuted }]}>{t('move.aiPlan', 'AI Plan')}</Text>
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
    textAlign: 'center',
  },
});
