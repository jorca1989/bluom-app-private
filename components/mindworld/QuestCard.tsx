import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';

interface QuestCardProps {
  userId: Id<"users">;
  type: 'daily' | 'weekly';
}

export default function QuestCard({ userId, type }: QuestCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const quests = useQuery(api.quests.getUserQuests, { userId, date: today });

  if (!quests) return null;

  const filteredQuests = quests.filter(q => q.type === type);
  if (filteredQuests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type === 'daily' ? 'Daily Quests' : 'Weekly Quests'}</Text>
      {filteredQuests.map(quest => (
        <View key={quest._id} style={styles.questRow}>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDesc}>{quest.description}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(100, (quest.currentValue / quest.requirementValue) * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {quest.currentValue} / {quest.requirementValue}
              </Text>
            </View>
          </View>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardText}>+{quest.xpReward} XP</Text>
            <Text style={styles.rewardText}>+{quest.tokenReward} 🪙</Text>
            {quest.completed && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  questRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  questDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 10,
    color: '#64748b',
    minWidth: 40,
  },
  rewardInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
    gap: 2,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

