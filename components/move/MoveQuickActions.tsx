import React from 'react';
import { Dimensions, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

const MOVE_ACTION_WIDTH = (Dimensions.get('window').width - 100) / 4;

interface MoveQuickActionsProps {
  onAddWorkout: () => void;
  onAddSteps: () => void;
  onCustomExercise: () => void;
  onViewPlan?: () => void;
  onIdentifyMachine: () => void;
  onOutdoorActivity: () => void;
}

export default function MoveQuickActions({
  onAddWorkout,
  onAddSteps,
  onCustomExercise,
  onViewPlan,
  onIdentifyMachine,
  onOutdoorActivity,
}: MoveQuickActionsProps) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  const actions = [
    { icon: 'library', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: t('move.exerciseLibrary', 'Exercise Library'), onPress: onAddWorkout },
    { icon: 'footsteps', color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: t('move.addStepsAction', 'Add Steps'), onPress: onAddSteps },
    { icon: 'add-circle', color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: t('move.customExercise', 'Custom Exercise'), onPress: onCustomExercise },
    { icon: 'camera', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', label: t('move.identifyMachine', 'Identify Equipment'), onPress: onIdentifyMachine },
    { icon: 'walk', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', label: t('move.outdoorActivity', 'Outdoor Activity'), onPress: onOutdoorActivity },
    { icon: 'calendar-outline', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: t('move.workoutPlan', 'Workout Plan'), onPress: onViewPlan ?? onAddWorkout },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{t('move.quickActions', 'Quick Actions')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {actions.map((a) => (
          <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon as any} size={20} color={a.color} />
            </View>
            <Text style={[styles.actionTitle, { color: c.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.62}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 17,
    marginBottom: 16,
    marginHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  row: { gap: 6 },
  actionItem: {
    width: MOVE_ACTION_WIDTH,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 5,
    textAlign: 'center',
    width: '100%',
  },
});
