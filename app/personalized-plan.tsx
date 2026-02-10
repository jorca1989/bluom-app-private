import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HubCard } from '../components/HubCard';

// Default export is required for Expo Router
export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const activePlans = useQuery(api.plans.getActivePlans, {});
  const generatePlans = useAction(api.plans.generateAllPlans);

  const { nutritionPlan, fitnessPlan, wellnessPlan } = activePlans || {};

  const handleRegenerate = async () => {
    if (!user?.id) return;
    try {
      await generatePlans({ userId: user.id as any });
      Alert.alert("Plan Refreshed", "Your AI Weekly Blueprint has been updated.");
    } catch (e) {
      Alert.alert("Error", "Failed to refresh plan.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Personalized Plan</Text>
        </View>

        {/* AI VALUE BANNER */}
        <LinearGradient colors={['#1e293b', '#334155']} style={styles.aiBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiBannerTitle}>✨ Weekly AI Blueprint</Text>
            <Text style={styles.aiBannerSub}>Your plan adapts every Sunday based on your biometric data.</Text>
          </View>
        </LinearGradient>

        <HubCard
          title="Nutrition"
          subtitle="AI Meal Plan"
          Icon={Ionicons} // Passing the library, but HubCard expects a component. Let's check HubCard definition.
          // Wait, previous HubCard took `icon` string. The new `components/HubCard.tsx` likely takes `Icon` component.
          // Let me check `components/HubCard.tsx` first to be sure.
          onPress={() => router.push('/(tabs)/fuel')}
          data={nutritionPlan ? <Text style={styles.dataText}>{Math.round(nutritionPlan.calorieTarget)} kcal active</Text> : <Text>Generating...</Text>}
        />

        <TouchableOpacity style={styles.regenButton} onPress={handleRegenerate}>
          <Text style={styles.regenButtonText}>Refresh AI Blueprint</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  aiBanner: { padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  aiBannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  aiBannerSub: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  hubGrid: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 12, color: '#64748b' },
  cardContent: { marginTop: 12, paddingLeft: 56 },
  dataText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  regenButton: { marginTop: 30, backgroundColor: '#1e293b', padding: 16, borderRadius: 16, alignItems: 'center' },
  regenButtonText: { color: '#fff', fontWeight: 'bold' }
});