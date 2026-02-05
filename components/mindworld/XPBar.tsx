import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface XPBarProps {
  userId: Id<"users">;
}

export default function XPBar({ userId }: XPBarProps) {
  const gardenState = useQuery(api.mindworld.getGardenState, { userId });

  if (!gardenState) {
    return <View style={styles.container}><Text>Loading XP...</Text></View>;
  }

  const { level, xp } = gardenState;
  const xpForNextLevel = (level * level) * 100;
  const xpProgress = xpForNextLevel > 0 ? (xp / xpForNextLevel) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>
      
      <View style={styles.xpContainer}>
        <View style={styles.xpBarBackground}>
          <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
        </View>
        <Text style={styles.xpText}>
          {Math.floor(xp)} / {xpForNextLevel} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  levelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  xpContainer: {
    position: 'relative',
  },
  xpBarBackground: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
