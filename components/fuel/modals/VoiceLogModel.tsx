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

import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
  Animated, Dimensions, TextInput,
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

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface ParsedFoodItem {
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
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
  const { colors: themeColors } = useTheme();
  const s = useMemo(() => createS(themeColors), [themeColors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // Convex
  const logFoodEntry   = useMutation(api.food.logFoodEntry);
  const parseVoiceFood = useAction(api.aiVoice.parseVoiceFoodLog);
  const createFood     = useMutation(api.foodCatalog.createFood);

  // State
  const [stage,       setStage]       = useState<Stage>('idle');
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealName>(defaultMeal);
  const [saving,      setSaving]      = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [savedIndices, setSavedIndices] = useState<number[]>([]);

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
        language: i18n.language,
      });

      if (result.status === 'maintenance') {
        Alert.alert('AI Unavailable', 'Voice parsing is temporarily offline. Please try again later.');
        setStage('idle');
        return;
      }

      setTranscript(result.transcript ?? '');
      const itemsWithStrings = (result.items ?? []).map((item: any) => ({
        name: String(item.name || ''),
        quantity: String(item.quantity ?? '1'),
        unit: String(item.unit || 'g'),
        calories: String(item.calories ?? '0'),
        protein: String(item.protein ?? '0'),
        carbs: String(item.carbs ?? '0'),
        fat: String(item.fat ?? '0'),
      }));
      setParsedItems(itemsWithStrings);
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
          calories: parseFloat(item.calories) || 0,
          protein:  parseFloat(item.protein) || 0,
          carbs:    parseFloat(item.carbs) || 0,
          fat:      parseFloat(item.fat) || 0,
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

  const handleSaveItemToFoods = async (item: ParsedFoodItem, idx: number) => {
    try {
      await createFood({
        userId,
        name: item.name,
        servingSize: `${item.quantity} ${item.unit}`,
        calories: parseFloat(item.calories) || 0,
        protein: parseFloat(item.protein) || 0,
        carbs: parseFloat(item.carbs) || 0,
        fat: parseFloat(item.fat) || 0,
      });
      setSavedIndices(prev => [...prev, idx]);
      Alert.alert(t('common.saved', 'Saved'), t('foodReview.savedToMyFoodsSuccess', 'Saved to My Foods!'));
    } catch {
      Alert.alert(t('common.error', 'Error'), t('common.tryAgain', 'Failed to save item. Please try again.'));
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
    setSavedIndices([]);
    onClose();
  };

  const handleRetry = () => {
    setParsedItems([]);
    setTranscript('');
    setSavedIndices([]);
    setStage('idle');
  };

  const removeItem = (idx: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateVoiceItemField = (index: number, field: keyof ParsedFoodItem, val: string) => {
    const copy = [...parsedItems];
    copy[index] = { ...copy[index], [field]: val };
    setParsedItems(copy);
  };

  const totalCals = parsedItems.reduce((a, b) => a + (parseFloat(b.calories) || 0), 0);

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
                parsedItems.map((item, idx) => {
                  const isSaved = savedIndices.includes(idx);
                  return (
                    <View key={idx} style={[s.itemCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                      {/* Name & Actions */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TextInput
                          style={[s.input, { flex: 1, fontSize: 14, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8 }]}
                          value={item.name}
                          onChangeText={(v) => updateVoiceItemField(idx, 'name', v)}
                        />
                        <TouchableOpacity
                          onPress={() => handleSaveItemToFoods(item, idx)}
                          style={{ padding: 4 }}
                          disabled={isSaved}
                        >
                          <Ionicons
                            name={isSaved ? "bookmark" : "bookmark-outline"}
                            size={20}
                            color={isSaved ? "#10b981" : "#3b82f6"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeItem(idx)} style={s.removeBtn}>
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      {/* Quantity & Unit */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[s.label, { fontSize: 12 }]}>Qty:</Text>
                        <TextInput
                          style={[s.input, { width: 60, textAlign: 'center', fontSize: 13, paddingVertical: 4 }]}
                          value={item.quantity}
                          keyboardType="decimal-pad"
                          onChangeText={(v) => updateVoiceItemField(idx, 'quantity', v)}
                        />
                        <TextInput
                          style={[s.input, { width: 80, fontSize: 13, paddingVertical: 4, paddingHorizontal: 8 }]}
                          value={item.unit}
                          onChangeText={(v) => updateVoiceItemField(idx, 'unit', v)}
                        />
                      </View>

                      {/* Macros row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: themeColors.textMuted }}>kcal</Text>
                          <TextInput
                            style={[s.input, { width: '100%', textAlign: 'center', fontSize: 12, paddingVertical: 4 }]}
                            value={item.calories}
                            keyboardType="decimal-pad"
                            onChangeText={(v) => updateVoiceItemField(idx, 'calories', v)}
                          />
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: themeColors.textMuted }}>Prot (g)</Text>
                          <TextInput
                            style={[s.input, { width: '100%', textAlign: 'center', fontSize: 12, paddingVertical: 4 }]}
                            value={item.protein}
                            keyboardType="decimal-pad"
                            onChangeText={(v) => updateVoiceItemField(idx, 'protein', v)}
                          />
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: themeColors.textMuted }}>Carbs (g)</Text>
                          <TextInput
                            style={[s.input, { width: '100%', textAlign: 'center', fontSize: 12, paddingVertical: 4 }]}
                            value={item.carbs}
                            keyboardType="decimal-pad"
                            onChangeText={(v) => updateVoiceItemField(idx, 'carbs', v)}
                          />
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: themeColors.textMuted }}>Fat (g)</Text>
                          <TextInput
                            style={[s.input, { width: '100%', textAlign: 'center', fontSize: 12, paddingVertical: 4 }]}
                            value={item.fat}
                            keyboardType="decimal-pad"
                            onChangeText={(v) => updateVoiceItemField(idx, 'fat', v)}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })
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

const createS = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: c.surfaceMuted,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.surfaceMuted, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: c.text },

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
  processingTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  processingSub: { fontSize: 13, color: c.textMuted },

  // Review
  reviewSection: { gap: 14 },
  transcriptBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f3f0ff', borderRadius: 12, padding: 12,
  },
  transcriptText: { flex: 1, fontSize: 13, color: '#5b21b6', lineHeight: 18, fontStyle: 'italic' },

  reviewHeading: { fontSize: 16, fontWeight: '800', color: c.text },

  emptyParsed: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  emptyParsedText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surfaceMuted, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: c.border,
  },
  itemLeft:  { flex: 1 },
  itemName:  { fontSize: 14, fontWeight: '700', color: c.text },
  itemQty:   { fontSize: 12, color: c.textMuted, marginTop: 2 },
  itemMacros:{ alignItems: 'flex-end' },
  itemCal:   { fontSize: 15, fontWeight: '800', color: c.text },
  itemMacroSub: { fontSize: 10, color: c.textMuted, marginTop: 2 },
  removeBtn: { padding: 4 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.text, borderRadius: 14, padding: 14,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  totalCal:   { fontSize: 18, fontWeight: '900', color: '#fff' },

  mealSelectorLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceMuted,
  },
  mealChipText: { fontSize: 13, fontWeight: '700', color: c.text },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  retrySmall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: c.border,
    backgroundColor: c.surfaceMuted,
  },
  retrySmallText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  confirmBtn: {
    flex: 1, backgroundColor: '#2563eb', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    color: c.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },

  retryBtn: {
    backgroundColor: c.surfaceMuted, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: c.text },
});
// Static module-scope fallbacks (default theme) for helper components.
const s = createS(THEMES.default.colors);
