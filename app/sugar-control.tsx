import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { triggerSound, SoundEffect } from '@/utils/soundEffects';

const MOODS = [
  { label: 'Great', value: 'great', emoji: '😄' },
  { label: 'Okay', value: 'okay', emoji: '🙂' },
  { label: 'Meh', value: 'meh', emoji: '😐' },
  { label: 'Struggling', value: 'struggling', emoji: '😣' },
] as const;

function moodKeyFromWellnessMood(mood: number | null | undefined): (typeof MOODS)[number]['value'] | '' {
  if (!mood) return '';
  if (mood >= 5) return 'great';
  if (mood === 4) return 'okay';
  if (mood === 3) return 'meh';
  // 1 or 2
  return 'struggling';
}

function wellnessMoodFromKey(key: (typeof MOODS)[number]['value'] | ''): 2 | 3 | 4 | 5 | null {
  if (key === 'great') return 5;
  if (key === 'okay') return 4;
  if (key === 'meh') return 3;
  if (key === 'struggling') return 2;
  return null;
}

export default function SugarControlScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const progress = useQuery(
    api.sugar.getResetProgress,
    convexUser?._id ? { userId: convexUser._id, days: 90, asOf: today } : 'skip'
  );
  const todayLog = useQuery(
    api.sugar.getDailyStatus,
    convexUser?._id ? { userId: convexUser._id, date: today } : 'skip'
  );
  const wellnessMood = useQuery(
    api.wellness.getMoodForDate,
    convexUser?._id ? { userId: convexUser._id, date: today } : 'skip'
  );

  const activeFastingLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const elapsedHours = activeFastingLog ? (Date.now() - activeFastingLog.startTime) / (1000 * 60 * 60) : 0;
  const showGlucoseBonus = elapsedHours > 12;

  const startChallenge = useMutation(api.sugar.startChallenge);
  const saveDaily = useMutation(api.sugar.logDailyStatus);
  const upsertWellnessMood = useMutation(api.wellness.upsertMoodForDate);

  const [isSugarFree, setIsSugarFree] = useState<boolean | null>(null);
  const [mood, setMood] = useState<(typeof MOODS)[number]['value'] | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Sugar values
    if (todayLog) {
      setIsSugarFree(todayLog.isSugarFree);
      setNotes(todayLog.notes ?? '');
    }

    // Mood sync rule:
    // - If Wellness mood exists for today, that is the single source of truth for mood display.
    // - Otherwise, fall back to whatever the sugar log stored (legacy).
    if (wellnessMood?.mood) {
      setMood(moodKeyFromWellnessMood(wellnessMood.mood as any));
      return;
    }

    if (todayLog?.mood) {
      const raw = String(todayLog.mood);
      const asNum = Number(raw);
      if (Number.isFinite(asNum) && asNum > 0) {
        setMood(moodKeyFromWellnessMood(asNum));
      } else {
        // Back-compat if older sugar logs stored strings like "great"
        setMood((todayLog.mood as any) ?? '');
      }
    }
  }, [todayLog, wellnessMood]);

  async function handleStart90() {
    if (!convexUser?._id) return;
    try {
      triggerSound(SoundEffect.UI_TAP);
      await startChallenge({ userId: convexUser._id, type: '90-day-reset' });
      Alert.alert('Started', 'Your 90‑day reset has started. One day at a time.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not start challenge.');
    }
  }

  async function handleSave() {
    if (!convexUser?._id) return;
    if (isSugarFree === null) {
      Alert.alert('Check-in needed', 'Tap “Sugar‑free” or “Had sugar” for today.');
      return;
    }
    setSaving(true);
    try {
      const moodNum = wellnessMoodFromKey(mood);
      if (moodNum) {
        // Upsert into Wellness mood logs so the Wellness dashboard widget is updated automatically.
        await upsertWellnessMood({
          userId: convexUser._id,
          date: today,
          mood: moodNum,
          note: notes.trim() || undefined,
        });
      }
      await saveDaily({
        userId: convexUser._id,
        date: today,
        isSugarFree,
        // Store numeric mood as string for compatibility with schema (and to match Wellness scale).
        mood: moodNum ? String(moodNum) : undefined,
        notes: notes.trim() || undefined,
      });
      triggerSound(SoundEffect.WELLNESS_LOG);
      Alert.alert('Saved', 'Daily check‑in saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const pct = Math.round((progress?.progress ?? 0) * 100);
  const streak = progress?.streak ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sugar Control</Text>
          <Text style={styles.headerSub}>90‑day reset • daily check‑ins</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        {showGlucoseBonus && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
            <View className="bg-emerald-100 p-2 rounded-full">
              <Ionicons name="leaf" size={20} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-emerald-900 font-black text-sm">Glucose Stability Bonus Active</Text>
              <Text className="text-emerald-700 text-xs font-medium">You've crossed 12h of fasting. Insulin is dropping.</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Brain Rewiring Meter</Text>
            <Text style={styles.pill}>{streak}d streak</Text>
          </View>
          <Text style={styles.cardSub}>
            Consecutive days logged as sugar‑free. Keep it going.
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLeft}>{pct}%</Text>
            <Text style={styles.progressRight}>{streak}/90 days</Text>
          </View>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleStart90} activeOpacity={0.85}>
            <Ionicons name="flag" size={16} color="#2563eb" />
            <Text style={styles.secondaryText}>Start / Restart 90‑day reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily check‑in</Text>
          <Text style={styles.cardSub}>How did today go?</Text>

          <View style={styles.choiceRow}>
            <Choice
              label="Sugar‑free"
              active={isSugarFree === true}
              color="#16a34a"
              onPress={() => setIsSugarFree(true)}
            />
            <Choice
              label="Had sugar"
              active={isSugarFree === false}
              color="#ef4444"
              onPress={() => setIsSugarFree(false)}
            />
          </View>

          <Text style={[styles.smallLabel, { marginTop: 10 }]}>Mood</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodChip, mood === m.value && styles.moodChipActive]}
                onPress={() => setMood(m.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodText, mood === m.value && styles.moodTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.smallLabel, { marginTop: 12 }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What triggered cravings? What helped?"
            style={styles.textArea}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save check‑in'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.choice,
        active && { borderColor: color, backgroundColor: `${color}14` },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.choiceText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  cardSub: { marginTop: 8, color: '#64748b', fontWeight: '600', lineHeight: 18 },
  pill: {
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  progressTrack: {
    marginTop: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  progressRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  progressLeft: { color: '#0f172a', fontWeight: '900' },
  progressRight: { color: '#64748b', fontWeight: '800' },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#2563eb', fontWeight: '900' },
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  choiceText: { fontWeight: '900', color: '#0f172a' },
  smallLabel: { color: '#334155', fontWeight: '900' },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  moodChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  moodEmoji: { fontSize: 16 },
  moodText: { color: '#334155', fontWeight: '900', fontSize: 12 },
  moodTextActive: { color: '#2563eb' },
  textArea: {
    marginTop: 8,
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  primaryBtn: {
    marginTop: 12,
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


