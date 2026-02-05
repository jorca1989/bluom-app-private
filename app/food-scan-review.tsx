import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { triggerSound, SoundEffect } from '@/utils/soundEffects';
import { useCelebration } from '@/context/CelebrationContext';

function toMealTypeLower(meal: string) {
  const m = (meal ?? '').toLowerCase();
  if (m.includes('breakfast')) return 'breakfast' as const;
  if (m.includes('lunch')) return 'lunch' as const;
  if (m.includes('dinner')) return 'dinner' as const;
  if (m.includes('snack')) return 'snack' as const;
  return 'lunch' as const;
}

export default function FoodScanReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const logFoodEntry = useMutation(api.food.logFoodEntry);
  const celebration = useCelebration();

  const meal = useMemo(() => String(params.meal ?? 'Lunch'), [params.meal]);
  const date = useMemo(() => String(params.date ?? new Date().toISOString().slice(0, 10)), [params.date]);

  const [name, setName] = useState(String(params.name ?? ''));
  const [calories, setCalories] = useState(String(params.calories ?? '0'));
  const [protein, setProtein] = useState(String(params.protein ?? '0'));
  const [carbs, setCarbs] = useState(String(params.carbs ?? '0'));
  const [fat, setFat] = useState(String(params.fat ?? '0'));
  const [servings, setServings] = useState('1');
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => {
    const s = Math.max(0.1, Number(servings) || 1);
    const cals = Math.max(0, Number(calories) || 0);
    const p = Math.max(0, Number(protein) || 0);
    const cb = Math.max(0, Number(carbs) || 0);
    const f = Math.max(0, Number(fat) || 0);
    return { s, cals, p, cb, f };
  }, [servings, calories, protein, carbs, fat]);

  async function handleSave() {
    if (!convexUser?._id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Enter a food name (or keep “Unknown”).');
      return;
    }
    setSaving(true);
    try {
      await logFoodEntry({
        userId: convexUser._id,
        foodName: trimmed,
        calories: parsed.cals * parsed.s,
        protein: parsed.p * parsed.s,
        carbs: parsed.cb * parsed.s,
        fat: parsed.f * parsed.s,
        servingSize: `${parsed.s} serving(s)`,
        mealType: toMealTypeLower(meal),
        date,
      });
      triggerSound(SoundEffect.LOG_MEAL);
      celebration.trigger('confetti');
      Alert.alert('Saved', `Added ${trimmed} to ${meal}`);
      router.replace('/(tabs)/fuel');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ? String(e.message) : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Review Macros</Text>
          <Text style={styles.headerSub}>{meal} • {date}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Food name"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.hint}>You can overwrite anything the AI guessed.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Per serving (editable)</Text>
          <Row label="Calories" value={calories} onChange={setCalories} />
          <Row label="Protein (g)" value={protein} onChange={setProtein} />
          <Row label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <Row label="Fat (g)" value={fat} onChange={setFat} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Servings</Text>
          <TextInput
            value={servings}
            onChangeText={setServings}
            placeholder="1"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Total: {Math.round(parsed.cals * parsed.s)} cal • P{Math.round(parsed.p * parsed.s)} C{Math.round(parsed.cb * parsed.s)} F{Math.round(parsed.f * parsed.s)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.primaryText}>{saving ? 'Saving…' : `Save to ${meal}`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.rowInput}
        placeholder="0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf1fe' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748b' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  hint: { marginTop: 8, color: '#64748b', fontWeight: '600', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  rowLabel: { flex: 1, color: '#334155', fontWeight: '800' },
  rowInput: {
    width: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});


