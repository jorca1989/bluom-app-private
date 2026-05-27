import React, { useMemo, useState } from 'react';
import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser as useAppUser } from '@/context/UserContext';
import { useCelebration } from '@/context/CelebrationContext';
import { getBottomContentPadding } from '@/utils/layout';
import { useTranslation } from 'react-i18next';

// ─── Editable Row helper (same pattern as food-scan-review) ──
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

export default function SugarScanResultScreen() {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const appUser = useAppUser();
  const celebration = useCelebration();
  const { user: clerkUser } = useUser();
  const { t } = useTranslation();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const saveDaily = useMutation(api.sugar.logDailyStatus);
  const logFoodEntry = useMutation(api.food.logFoodEntry);

  // ── Editable state (initialized from AI scan params) ────────
  const [productName, setProductName] = useState(String(params.productName ?? 'Unknown'));
  const [sugar, setSugar] = useState(String(params.sugar ?? '0'));
  const [calories, setCalories] = useState(String(params.calories ?? '0'));
  const [notes, setNotes] = useState(String(params.notes ?? ''));

  // Read-only from AI (not worth editing)
  const hiddenSugars = useMemo(() => {
    try {
      return JSON.parse(String(params.hiddenSugarsFound ?? '[]'));
    } catch {
      return [];
    }
  }, [params.hiddenSugarsFound]);
  const alternative = String(params.alternative ?? '');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Log as Meal state ───────────────────────────────────────
  type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [loggingMeal, setLoggingMeal] = useState(false);

  // Parsed numeric values
  const sugarNum = Math.max(0, Number(sugar) || 0);
  const caloriesNum = Math.max(0, Number(calories) || 0);

  async function saveSugarLog() {
    if (!convexUser?._id) return;
    if (!(appUser.isPro || appUser.isAdmin)) {
      setShowUpgrade(true);
      return;
    }
    const trimmed = productName.trim() || 'Unknown';
    setSaving(true);
    try {
      await saveDaily({
        userId: convexUser._id,
        date: today,
        isSugarFree: sugarNum <= 0,
        notes: `Scan: ${trimmed}. Sugar≈${Math.round(sugarNum)}g, Calories≈${Math.round(caloriesNum)}. ${notes.trim()}. Hidden sugars: ${hiddenSugars.join(', ')}`.slice(0, 900),
      });
      celebration.trigger('fireworks');
      Alert.alert(t('common.saved', 'Saved'), t('modals.sugar.savedSuccessMsg', 'Saved to today\u2019s Sugar check\u2011in.'));
      router.replace('/sugar-dashboard');
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ? String(e.message) : t('common.couldNotSave', 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  // ── Log as Meal in Fuel Diary ────────────────────────────────
  async function handleLogAsMeal(mealType: MealType) {
    if (!convexUser?._id) return;
    const trimmed = productName.trim() || 'Unknown';
    setLoggingMeal(true);
    try {
      await logFoodEntry({
        userId: convexUser._id,
        foodName: trimmed,
        calories: caloriesNum,
        protein: 0,
        carbs: sugarNum,
        fat: 0,
        servingSize: '1 serving',
        mealType,
        date: today,
      });
      celebration.trigger('confetti');
      setShowMealPicker(false);
      const mealLabel = t(`modals.sugar.${mealType}Label`, mealType.charAt(0).toUpperCase() + mealType.slice(1));
      Alert.alert(
        t('modals.sugar.loggedSuccessTitle', '\u2705 Logged!'),
        t('modals.sugar.loggedSuccessMsg', '{{name}} added to {{meal}} in your Fuel diary.', { name: trimmed, meal: mealLabel }),
        [
          { text: t('common.stayHere', 'Stay here'), style: 'cancel' },
          { text: t('common.viewFuel', 'View Fuel'), onPress: () => router.replace('/(tabs)/fuel') },
        ]
      );
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ? String(e.message) : t('common.tryAgain', 'Could not log to Fuel diary.'));
    } finally {
      setLoggingMeal(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('modals.sugar.scanResultTitle', 'Scan Result')}</Text>
          <Text style={styles.headerSub}>{t('modals.sugar.scanResultSub', 'Review & correct if needed')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Product Name (editable) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('modals.sugar.productName', 'Product Name')}</Text>
          <TextInput
            value={productName}
            onChangeText={setProductName}
            placeholder={t('modals.sugar.productNamePH', 'Product name')}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.hint}>{t('modals.sugar.overwriteHint', 'You can overwrite anything the AI guessed.')}</Text>
        </View>

        {/* ── Sugar & Calories (editable) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('modals.sugar.nutritionalInfo', 'Nutritional Info (editable)')}</Text>
          <Row label={t('modals.sugar.sugarLabel', 'Sugar (g)')} value={sugar} onChange={setSugar} />
          <Row label={t('modals.sugar.caloriesLabel', 'Calories')} value={calories} onChange={setCalories} />
        </View>

        {/* ── Hidden Sugars (read-only pills) ── */}
        {hiddenSugars.length > 0 && (
          <View style={styles.hiddenSugarsCard}>
            <View style={styles.hiddenSugarsHeader}>
              <Ionicons name="warning" size={18} color="#e11d48" />
              <Text style={styles.hiddenSugarsTitle}>{t('modals.sugar.hiddenSugarsTitle', 'Hidden Sugars Found')}</Text>
            </View>
            <View style={styles.pillsRow}>
              {hiddenSugars.map((s: string, i: number) => (
                <View key={i} style={styles.sugarPill}>
                  <Text style={styles.sugarPillText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Smart Alternative (Pro-gated, read-only) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('modals.sugar.smartAlternative', 'Smart Alternative')}</Text>
          {appUser.isPro || appUser.isAdmin ? (
            <Text style={styles.alternativeText}>{alternative || '—'}</Text>
          ) : (
            <View style={styles.blurContainer}>
              <BlurView intensity={30} tint="light" style={styles.blurOverlay} />
              <View style={{ padding: 12 }}>
                <Text style={styles.proTitle}>{t('modals.pro.unlockTitle', 'Unlock with Pro')}</Text>
                <Text style={styles.proSubtitle}>{t('modals.pro.smartAltDesc', 'Get smart, low-sugar alternatives tailored to what you scanned.')}</Text>
                <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.85} style={styles.proBtn}>
                  <Text style={styles.proBtnText}>{t('modals.pro.viewPlans', 'View Pro Plans')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Notes (editable) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('modals.sugar.notesTitle', 'Notes')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('modals.sugar.notesPH', 'AI analysis or your own notes')}
            style={styles.textArea}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Log as Meal in Fuel Diary ── */}
        <TouchableOpacity
          style={styles.logMealBtn}
          onPress={() => setShowMealPicker(!showMealPicker)}
          activeOpacity={0.85}
        >
          <Ionicons name="restaurant-outline" size={18} color="#f97316" />
          <Text style={styles.logMealBtnText}>{t('modals.sugar.logAsMeal', 'Log as Meal in Fuel Diary')}</Text>
          <Ionicons name={showMealPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#f97316" />
        </TouchableOpacity>

        {showMealPicker && (
          <View style={styles.mealPickerRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => {
              const labels: Record<string, string> = { breakfast: t('modals.sugar.bLetter', 'B'), lunch: t('modals.sugar.lLetter', 'L'), dinner: t('modals.sugar.dLetter', 'D'), snack: t('modals.sugar.sLetter', 'S') };
              const fullLabels: Record<string, string> = { breakfast: t('modals.sugar.bLabel', 'Breakfast'), lunch: t('modals.sugar.lLabel', 'Lunch'), dinner: t('modals.sugar.dLabel', 'Dinner'), snack: t('modals.sugar.sLabel', 'Snack') };
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealChip, loggingMeal && { opacity: 0.5 }]}
                  onPress={() => handleLogAsMeal(m)}
                  activeOpacity={0.75}
                  disabled={loggingMeal}
                >
                  <Text style={styles.mealChipLetter}>{labels[m]}</Text>
                  <Text style={styles.mealChipLabel}>{fullLabels[m]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Save Sugar Log Button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={saveSugarLog}
          activeOpacity={0.9}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? t('modals.sugar.saving', 'Saving…') : t('modals.sugar.saveLog', 'Save Sugar Log')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title={t('modals.pro.unlockTitle', 'Unlock with Pro')}
        message={t('modals.sugar.proUpsell', 'Upgrade to Pro to save Sugar scan logs and unlock Smart Alternatives.')}
        upgradeLabel={t('modals.pro.viewPlans', 'View Pro Plans')}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bg,
    borderBottomWidth: 0,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: c.text },
  headerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: c.textMuted },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: c.text, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.surface,
  },
  hint: { marginTop: 8, color: c.textMuted, fontWeight: '600', lineHeight: 18, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  rowLabel: { flex: 1, color: c.text, fontWeight: '800' },
  rowInput: {
    width: 120,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '800',
    color: c.text,
    backgroundColor: c.surface,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: c.text,
    backgroundColor: c.surface,
    textAlignVertical: 'top',
  },
  // Hidden sugars
  hiddenSugarsCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  hiddenSugarsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hiddenSugarsTitle: { fontSize: 14, fontWeight: '900', color: '#9f1239' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sugarPill: { backgroundColor: '#ffe4e6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  sugarPillText: { color: '#be123c', fontWeight: '700', fontSize: 12 },
  // Smart alternative
  alternativeText: { color: c.text, fontWeight: '600', lineHeight: 20 },
  blurContainer: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  proTitle: { fontSize: 14, fontWeight: '900', color: c.text },
  proSubtitle: { color: c.text, fontWeight: '600', marginTop: 4, lineHeight: 18 },
  proBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  proBtnText: { color: '#ffffff', fontWeight: '900' },
  // Save
  // Log as Meal
  logMealBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logMealBtnText: { color: '#f97316', fontWeight: '800', fontSize: 15 },
  mealPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
  },
  mealChip: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  mealChipLetter: { fontSize: 18, fontWeight: '900', color: '#f97316' },
  mealChipLabel: { fontSize: 10, fontWeight: '700', color: c.textMuted, textAlign: 'center' },
  // Save Sugar Log
  saveBtn: {
    marginTop: 12,
    backgroundColor: c.text,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
