import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MacroItem {
  name: string;
  emoji: string;
  current: number;
  goal: number;
  color: string;
  trackColor: string;
}

interface MacroCardsProps {
  macros: MacroItem[];
}

const MacroCards = ({ macros }: MacroCardsProps) => {
  return (
    <View style={styles.container}>
      {macros.map((macro) => {
        const pct = Math.min((macro.current / Math.max(1, macro.goal)) * 100, 100);

        return (
          <View key={macro.name} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.emoji}>{macro.emoji}</Text>
              <Text style={styles.name}>{macro.name}</Text>
            </View>
            
            <View style={styles.values}>
              <Text style={styles.current}>{Math.round(macro.current)}</Text>
              <Text style={styles.goal}>/{Math.round(macro.goal)}g</Text>
            </View>

            <View style={[styles.track, { backgroundColor: macro.trackColor }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: macro.color, width: `${pct}%` }
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default MacroCards;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  values: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  current: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  goal: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
