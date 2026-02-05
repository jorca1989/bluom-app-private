import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';

interface MeditationEndProps {
  userId: Id<"users">;
  durationMinutes: number;
  meditationId?: Id<"meditationSessions">;
  meditationTitle?: string;
  onClose: () => void;
  onComplete?: () => void;
}

export default function MeditationEnd({
  userId,
  durationMinutes,
  meditationId,
  meditationTitle,
  onClose,
  onComplete
}: MeditationEndProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const logMeditation = useMutation(api.wellness.logMeditation);

  useEffect(() => {
    finishMeditation();
  }, []);

  const finishMeditation = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await logMeditation({
        userId,
        title: meditationTitle || 'Meditation Session',
        durationMinutes,
        sessionId: meditationId,
        date: today
      });
      // In a real app, logMeditation would return rewards info.
      // For now we'll simulate or just show success.
      setResult({
        xpAwarded: durationMinutes * 10,
        tokensAwarded: Math.floor(durationMinutes / 5),
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error finishing meditation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Recording your session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
      <Text style={styles.title}>Meditation Complete!</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{durationMinutes}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>+{result?.xpAwarded || 0}</Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>+{result?.tokensAwarded || 0}</Text>
          <Text style={styles.statLabel}>Tokens</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginVertical: 24, color: '#333' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, alignItems: 'center', minWidth: 90 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  closeButton: { backgroundColor: '#4CAF50', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 30 },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});









