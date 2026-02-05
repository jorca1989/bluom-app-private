import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GardenView({ userId, onNavigate }: { userId: string, onNavigate: (screen: string) => void }) {
  return (
    <View style={styles.container}>
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
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  gardenPlaceholder: { backgroundColor: '#e8f5e9', padding: 40, borderRadius: 20, alignItems: 'center' },
  emoji: { fontSize: 60, marginBottom: 10 },
  text: { color: '#2e7d32', textAlign: 'center' }
});

