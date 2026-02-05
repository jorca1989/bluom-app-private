import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AchievementBadgeProps {
  title: string;
  description?: string;
  icon?: string;
  earned?: boolean;
  onPress?: () => void;
}

export default function AchievementBadge({
  title,
  description,
  icon = '🏆',
  earned = true,
  onPress
}: AchievementBadgeProps) {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      style={[styles.badge, !earned && styles.badgeLocked]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.text, !earned && styles.textLocked]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, !earned && styles.descriptionLocked]}>
          {description}
        </Text>
      )}
      {!earned && (
        <Text style={styles.lockedLabel}>🔒 Locked</Text>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 6,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#FFA000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeLocked: {
    backgroundColor: '#333',
    borderColor: '#555',
    opacity: 0.6,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  text: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  textLocked: {
    color: '#999',
  },
  description: {
    color: '#000',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  descriptionLocked: {
    color: '#999',
  },
  lockedLabel: {
    color: '#999',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

