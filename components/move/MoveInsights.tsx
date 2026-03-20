import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface MoveInsightsProps {
  isPro: boolean;
  onUpgradePress: () => void;
}

export default function MoveInsights({ isPro, onUpgradePress }: MoveInsightsProps) {
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Workout Insights</Text>
        
        <View style={styles.lockedCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800' }} 
            style={styles.blurredBg} 
            blurRadius={20} 
          />
          <View style={styles.overlay}>
            <View style={styles.proBadge}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.lockedTitle}>Advanced Move Insights</Text>
            <Text style={styles.lockedSub}>
              Unlock detailed weekly volume tracking, difficulty ratings, and muscle group analysis tools.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Workout Insights</Text>
      <View style={styles.unlockedCard}>
        <Text style={styles.placeholderText}>Your Move Analytics will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  lockedCard: {
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  blurredBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginBottom: 16,
  },
  proBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeBtn: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  unlockedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 15,
  },
});
