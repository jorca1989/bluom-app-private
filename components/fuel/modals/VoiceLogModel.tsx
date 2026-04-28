/**
 * components/fuel/modals/VoiceLogModal.tsx
 *
 * Voice food-logging modal.
 * Flow:
 *  1. User taps mic → native Audio.Recording starts (expo-av)
 *  2. On stop, audio is base64-encoded and sent to our AI via a Convex action
 *  3. Our AI returns structured JSON: [{name, calories, protein, carbs, fat, quantity}]
 *  4. User reviews parsed items, picks a meal slot, confirms
 *  5. Each item is logged via api.food.logFoodEntry
 *
 * NOTE: This component uses expo-av for recording. Make sure the package is installed
 * and the correct permissions are declared in app.json (RECORD_AUDIO / NSMicrophoneUsageDescription).
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
  Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: Id<'users'>;
  selectedDate: string;
  defaultMeal?: MealName;
  /** Platform string for AI key selection */
  platform?: string;
  isPro?: boolean;
}

const MEAL_OPTIONS: MealName[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_COLORS: Record<MealName, string> = {
  Breakfast: '#f59e0b',
  Lunch:     '#10b981',
  Dinner:    '#8b5cf6',
  Snack:     '#ef4444',
};

type Stage = 'idle' | 'recording' | 'processing' | 'review';

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceLogModal({
  visible, onClose, userId, selectedDate,
  defaultMeal = 'Lunch', platform = 'ios',
  isPro = false,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Convex
  const logFoodEntry   = useMutation(api.food.logFoodEntry);
  const parseVoiceFood = useAction(api.aiVoice.parseVoiceFoodLog);

  // State
  const [stage,       setStage]       = useState<Stage>('idle');
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealName>(defaultMeal);
  const [saving,      setSaving]      = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Recording ref
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Pulse animation for mic button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = async () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Microphone access is needed to log food by voice.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setStage('recording');
      startPulse();
    } catch (e) {
      console.error('Start recording error:', e);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    stopPulse();
    setStage('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      // Convert to base64
      const response = await fetch(uri);
      const blob     = await response.blob();
      const base64   = await blobToBase64(blob);

      // Send to our AI via Convex action
      const result = await parseVoiceFood({
        audioBase64: base64,
        mimeType: 'audio/m4a',
        platform,
      });

      if (result.status === 'maintenance') {
        Alert.alert('AI Unavailable', 'Voice parsing is temporarily offline. Please try again later.');
        setStage('idle');
        return;
      }

      setTranscript(result.transcript ?? '');
      setParsedItems(result.items ?? []);
      setStage('review');
    } catch (e: any) {
      console.error('Stop recording error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to process recording. Please try again.');
      setStage('idle');
    }
  };

  // ── Saving ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!parsedItems.length) return;
    setSaving(true);
    try {
      for (const item of parsedItems) {
        await logFoodEntry({
          userId,
          foodName: item.name,
          calories: item.calories,
          protein:  item.protein,
          carbs:    item.carbs,
          fat:      item.fat,
          servingSize: `${item.quantity} ${item.unit}`,
          mealType: selectedMeal.toLowerCase() as MealTypeLower,
          date: selectedDate,
        });
      }
      handleClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to log food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    stopPulse();
    setStage('idle');
    setParsedItems([]);
    setTranscript('');
    setSelectedMeal(defaultMeal);
    onClose();
  };

  const handleRetry = () => {
    setParsedItems([]);
    setTranscript('');
    setStage('idle');
  };

  const removeItem = (idx: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalCals = parsedItems.reduce((a, b) => a + b.calories, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.container} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('modals.voice.title', 'Voice Log')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── IDLE / RECORDING ── */}
          {(stage === 'idle' || stage === 'recording') && (
            <View style={s.micSection}>
              <LinearGradient
                colors={['#1e1b4b', '#312e81']}
                style={s.micBg}
              >
                <Text style={s.micHint}>
                  {stage === 'idle'
                    ? t('modals.voice.tapHint', 'Tap and describe what you ate')
                    : t('modals.voice.listening', 'Listening… tap to stop')}
                </Text>

                {stage === 'idle' ? (
                  <TouchableOpacity
                    style={s.micBtn}
                    onPress={startRecording}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="mic" size={36} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={stopRecording}
                    activeOpacity={0.85}
                  >
                    <Animated.View style={[s.micBtn, s.micBtnRecording, { transform: [{ scale: pulseAnim }] }]}>
                      <Ionicons name="stop" size={28} color="#fff" />
                    </Animated.View>
                  </TouchableOpacity>
                )}

                <Text style={s.micExample}>
                  {stage === 'idle'
                    ? t('modals.voice.example', '"2 scrambled eggs, oatmeal with blueberries and a black coffee"')
                    : ''}
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* ── PROCESSING ── */}
          {stage === 'processing' && (
            <View style={s.processingSection}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={s.processingTitle}>{t('modals.voice.processing', 'Analysing your food…')}</Text>
              <Text style={s.processingSub}>{t('modals.voice.identifying', 'Our AI is identifying nutrients')}</Text>
            </View>
          )}

          {/* ── REVIEW ── */}
          {stage === 'review' && (
            <View style={s.reviewSection}>

              {/* Transcript */}
              {transcript ? (
                <View style={s.transcriptBox}>
                  <Ionicons name="mic-outline" size={14} color="#7c3aed" />
                  <Text style={s.transcriptText} numberOfLines={3}>{transcript}</Text>
                </View>
              ) : null}

              {/* Parsed items list */}
              <Text style={s.reviewHeading}>{t('modals.voice.parsed', 'Parsed Items')} ({parsedItems.length})</Text>

              {parsedItems.length === 0 ? (
                <View style={s.emptyParsed}>
                  <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
                  <Text style={s.emptyParsedText}>{t('modals.voice.nothing', 'Nothing recognised. Please try again.')}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
                    <Text style={s.retryBtnText}>{t('modals.voice.retry', 'Retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                parsedItems.map((item, idx) => (
                  <View key={idx} style={s.itemCard}>
                    <View style={s.itemLeft}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemQty}>{item.quantity} {item.unit}</Text>
                    </View>
                    <View style={s.itemMacros}>
                      <Text style={s.itemCal}>{Math.round(item.calories)} kcal</Text>
                      <Text style={s.itemMacroSub}>
                        P {Math.round(item.protein)}g · C {Math.round(item.carbs)}g · F {Math.round(item.fat)}g
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(idx)} style={s.removeBtn}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {parsedItems.length > 0 && (
                <>
                  {/* Total */}
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>{t('modals.voice.total', 'Total')}</Text>
                    <Text style={s.totalCal}>{Math.round(totalCals)} kcal</Text>
                  </View>

                  {/* Meal selector */}
                  <Text style={s.mealSelectorLabel}>{t('modals.voice.logTo', 'Log to meal')}</Text>
                  <View style={s.mealSelector}>
                    {MEAL_OPTIONS.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          s.mealChip,
                          selectedMeal === m && { backgroundColor: MEAL_COLORS[m], borderColor: MEAL_COLORS[m] },
                        ]}
                        onPress={() => setSelectedMeal(m)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          s.mealChipText,
                          selectedMeal === m && { color: '#fff' },
                        ]}>
                          {t(`common.${m.toLowerCase()}`, m)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.retrySmall} onPress={handleRetry}>
                      <Ionicons name="refresh" size={16} color="#64748b" />
                      <Text style={s.retrySmallText}>{t('modals.voice.redo', 'Redo')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.confirmBtn, saving && { opacity: 0.6 }]}
                      onPress={handleSave}
                      disabled={saving}
                      activeOpacity={0.88}
                    >
                      {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.confirmBtnText}>{t('modals.voice.logToMeal', 'Log to')} {t(`common.${selectedMeal.toLowerCase()}`, selectedMeal)}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

        </ScrollView>
        <ProUpgradeModal 
          visible={showUpgrade} 
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => {
            setShowUpgrade(false);
            onClose();
            router.push('/(tabs)/profile');
          }}
          title={t('modals.voice.upsellTitle', 'AI Voice Log')}
          message={t('modals.voice.upsellMessage', 'Experience the future of food logging. Upgrade to Pro for instant voice-to-macros parsing.')}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:...;base64," prefix
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  body: { padding: 20 },

  // Mic section
  micSection: { marginBottom: 8 },
  micBg: {
    borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 20, overflow: 'hidden',
  },
  micHint: { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textAlign: 'center' },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  micBtnRecording: { backgroundColor: '#ef4444' },
  micExample: {
    fontSize: 12, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', fontStyle: 'italic', lineHeight: 18,
  },

  // Processing
  processingSection: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  processingTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  processingSub: { fontSize: 13, color: '#64748b' },

  // Review
  reviewSection: { gap: 14 },
  transcriptBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f3f0ff', borderRadius: 12, padding: 12,
  },
  transcriptText: { flex: 1, fontSize: 13, color: '#5b21b6', lineHeight: 18, fontStyle: 'italic' },

  reviewHeading: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  emptyParsed: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  emptyParsedText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  itemLeft:  { flex: 1 },
  itemName:  { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemQty:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  itemMacros:{ alignItems: 'flex-end' },
  itemCal:   { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  itemMacroSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  removeBtn: { padding: 4 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 14, padding: 14,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  totalCal:   { fontSize: 18, fontWeight: '900', color: '#fff' },

  mealSelectorLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  mealChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  retrySmall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  retrySmallText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  confirmBtn: {
    flex: 1, backgroundColor: '#2563eb', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  retryBtn: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
});