import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { TAB_BAR_HEIGHT, getBottomContentPadding } from '@/utils/layout';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useRouter } from 'expo-router';

type Mode = 'breathing' | 'quote' | 'journal';

export default function PanicButton({ userId }: { userId: Id<'users'> }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useQuery(api.users.getUserById, { userId });
  const quoteRes = useQuery(api.sugar.getMotivationalQuote, userId ? { userId } : 'skip');
  const saveJournal = useMutation(api.aimind.saveJournal);

  const isPro = useMemo(() => {
    return (
      user?.subscriptionStatus === 'pro' ||
      user?.isPremium === true ||
      user?.isAdmin === true ||
      user?.role === 'admin' ||
      user?.role === 'super_admin'
    );
  }, [user?.subscriptionStatus, user?.isPremium, user?.isAdmin, user?.role]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('breathing');
  const [journalText, setJournalText] = useState('');

  // 60s breathing
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<any>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  function resetBreathing() {
    setSecondsLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startBreathing() {
    resetBreathing();
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (!open) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    return () => {
      pulse.stopAnimation();
    };
  }, [open, pulse]);

  useEffect(() => {
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  if (!isPro) return null;

  const bottom = getBottomContentPadding(insets.bottom, 16) + TAB_BAR_HEIGHT;

  function openRandom() {
    triggerSound(SoundEffect.UI_TAP);
    const pick: Mode[] = ['breathing', 'quote', 'journal'];
    const next = pick[Math.floor(Math.random() * pick.length)];
    setMode(next);
    setOpen(true);
    setJournalText('');
    resetBreathing();
    if (next === 'breathing') startBreathing();
  }

  async function submitJournal() {
    const text = journalText.trim();
    if (!text) {
      Alert.alert('Write something', 'Just one sentence is enough.');
      return;
    }
    try {
      const date = new Date().toISOString().slice(0, 10);
      await saveJournal({ userId, content: text, date });
      triggerSound(SoundEffect.WELLNESS_LOG);
      setOpen(false);
      setJournalText('');
      Alert.alert('Saved', 'Nice job riding out the craving.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ? String(e.message) : 'Could not save. Try again.');
    }
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const phase = secondsLeft % 4 < 2 ? 'Inhale' : 'Exhale';

  return (
    <>
      <TouchableOpacity style={[styles.fab, { bottom }]} onPress={openRandom} activeOpacity={0.9}>
        <Ionicons name="warning" size={22} color="#fff" />
        <Text style={styles.fabText}>SOS</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Craving SOS</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modeRow}>
              <ModeChip label="Breathe" active={mode === 'breathing'} onPress={() => { setMode('breathing'); startBreathing(); }} />
              <ModeChip label="Quote" active={mode === 'quote'} onPress={() => { setMode('quote'); resetBreathing(); }} />
              <ModeChip label="Journal" active={mode === 'journal'} onPress={() => { setMode('journal'); resetBreathing(); }} />
            </View>

            {mode === 'breathing' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>60-second reset</Text>
                <View style={styles.center}>
                  <Animated.View style={[styles.breathCircle, { transform: [{ scale }] }]}>
                    <Ionicons name="leaf" size={34} color="#16a34a" />
                  </Animated.View>
                  <Text style={styles.breathPhase}>{phase}</Text>
                  <Text style={styles.breathTimer}>{secondsLeft}s</Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => startBreathing()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Restart</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'quote' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>One line. Right now.</Text>
                <Text style={styles.quoteText}>{quoteRes?.quote ?? 'Loading…'}</Text>
                {!!quoteRes?.locked && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={() => router.push('/premium')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.primaryText}>Upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {mode === 'journal' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Why do you want sugar right now?</Text>
                <Text style={styles.hint}>Get it out of your head. 20 seconds.</Text>
                <TextInput
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder="I’m craving because…"
                  style={styles.textArea}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={submitJournal} activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 12 },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#334155', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  hint: { color: '#64748b', fontWeight: '600', marginBottom: 10, lineHeight: 18 },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  center: { alignItems: 'center', paddingVertical: 8 },
  breathCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  breathPhase: { marginTop: 10, fontSize: 16, fontWeight: '900', color: '#0f172a' },
  breathTimer: { marginTop: 4, fontSize: 14, fontWeight: '800', color: '#64748b' },
  quoteText: { fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
});


