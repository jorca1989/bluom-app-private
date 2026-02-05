import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import DailyQuestCard from './DailyQuestCard';
import WeeklyQuestCard from './WeeklyQuestCard';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface QuestSystemProps {
  userId: Id<"users">;
}

export default function QuestSystem({ userId }: QuestSystemProps) {
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const createInitialQuests = useMutation(api.quests.createInitialQuests);
  const quests = useQuery(api.quests.getUserQuests, { userId, date: today });

  useEffect(() => {
    // Ensure quests exist for today
    createInitialQuests({ userId, date: today }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, today]);

  const dailyQuests = quests?.filter(q => q.type === 'daily') || [];
  const weeklyQuests = quests?.filter(q => q.type === 'weekly') || [];

  const dailyCompleted = dailyQuests.filter(q => q.completed).length;
  const weeklyCompleted = weeklyQuests.filter(q => q.completed).length;

  const onRefresh = () => {
    setRefreshing(true);
    // Convex queries auto-refresh, but we can simulate a delay
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {dailyCompleted}/{dailyQuests.length}
          </Text>
          <Text style={styles.statLabel}>Daily Quests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {weeklyCompleted}/{weeklyQuests.length}
          </Text>
          <Text style={styles.statLabel}>Weekly Quests</Text>
        </View>
      </View>

      {/* Daily Quests */}
      <DailyQuestCard userId={userId} />

      {/* Weekly Quests */}
      <WeeklyQuestCard userId={userId} />

      {/* Quest Tips */}
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>💡 Quest Tips</Text>
        <Text style={styles.tipsText}>
          • Complete quests automatically by doing activities{'\n'}
          • Some quests require manual completion{'\n'}
          • Weekly quests reset every Monday{'\n'}
          • Daily quests reset at midnight{'\n'}
          • Complete all daily quests for bonus rewards
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statsHeader: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  tipsBox: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  tipsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  tipsText: { fontSize: 14, color: '#666', lineHeight: 20 },
});

