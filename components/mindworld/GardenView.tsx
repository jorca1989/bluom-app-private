import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GardenView({ userId, onNavigate }: { userId: string, onNavigate: (screen: string) => void }) {
  return (
    <View style={styles.container}>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Welcome to the Data Garden</Text>
        <Text style={styles.infoText}>
          This garden is a visual representation of your mind.
          It grows as you complete logs, meditate, and hit your goals.
        </Text>
      </View>

      <Text style={styles.title}>🌱 Your Mind Garden</Text>
      <View style={styles.gardenPlaceholder}>
        <Text style={styles.emoji}>🌳🏡🌷</Text>
        <Text style={styles.text}>Your garden is growing beautifully!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  gardenPlaceholder: { backgroundColor: '#e8f5e9', padding: 40, borderRadius: 20, alignItems: 'center' },
  emoji: { fontSize: 60, marginBottom: 10 },
  text: { color: '#2e7d32', textAlign: 'center' }
});

