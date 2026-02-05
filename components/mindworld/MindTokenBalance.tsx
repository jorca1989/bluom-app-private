import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface MindTokenBalanceProps {
  userId: Id<"users">;
  onBuyFreezePass?: () => void;
}

export default function MindTokenBalance({ userId, onBuyFreezePass }: MindTokenBalanceProps) {
  const gardenState = useQuery(api.mindworld.getGardenState, { userId });

  if (!gardenState) {
    return <View style={styles.container}><Text>Loading Tokens...</Text></View>;
  }

  const { tokens } = gardenState;

  return (
    <View style={styles.container}>
      <View style={styles.tokenDisplay}>
        <Text style={styles.tokenEmoji}>🪙</Text>
        <Text style={styles.tokenAmount}>{Math.floor(tokens)}</Text>
        <Text style={styles.tokenLabel}>Mind Tokens</Text>
      </View>
      {onBuyFreezePass && (
        <TouchableOpacity
          style={styles.freezeButton}
          onPress={onBuyFreezePass}
        >
          <Text style={styles.freezeButtonText}>
            🛡️ Buy Freeze Pass (10 tokens)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  tokenDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenEmoji: {
    fontSize: 24,
  },
  tokenAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tokenLabel: {
    fontSize: 14,
    color: '#666',
  },
  freezeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  freezeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
