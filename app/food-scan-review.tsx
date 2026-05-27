import React, { useMemo, useState, useEffect } from 'react';
import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';
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
import { useTranslation } from 'react-i18next';

function toMealTypeLower(meal: string) {
  const m = (meal ?? '').toLowerCase();
  if (m.includes('breakfast')) return 'breakfast' as const;
  if (m.includes('lunch')) return 'lunch' as const;
  if (m.includes('dinner')) return 'dinner' as const;
  if (m.includes('snack')) return 'snack' as const;
  return 'lunch' as const;
}

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface Ingredient {
  name: string;
  amount: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export default function FoodScanReviewScreen() {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { t } = useTranslation();
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

  const [meal, setMeal] = useState<MealName>((params.meal as MealName) ?? 'Lunch');
  const date = useMemo(() => String(params.date ?? new Date().toISOString().slice(0, 10)), [params.date]);

  // Master states
  const [name, setName] = useState(String(params.name ?? ''));
  const [calories, setCalories] = useState(String(params.calories ?? '0'));
  const [protein, setProtein] = useState(String(params.protein ?? '0'));
  const [carbs, setCarbs] = useState(String(params.carbs ?? '0'));
  const [fat, setFat] = useState(String(params.fat ?? '0'));
  const [servings, setServings] = useState('1');
  const [saving, setSaving] = useState(false);

  // Accordion state
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Load ingredients from router params
  const initialIngredients = useMemo<Ingredient[]>(() => {
    try {
      if (params.ingredients) {
        const parsed = JSON.parse(String(params.ingredients));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((ing: any) => ({
            name: String(ing.name || 'Unknown'),
            amount: String(ing.amount || '1 serving'),
            calories: String(ing.calories ?? '0'),
            protein: String(ing.protein ?? '0'),
            carbs: String(ing.carbs ?? '0'),
            fat: String(ing.fat ?? '0'),
          }));
        }
      }
    } catch (e) {
      console.log('[food-scan-review] Failed to parse initial ingredients', e);
    }
    // Fallback
    return [{
      name: String(params.name ?? 'Unknown'),
      amount: '1 serving',
      calories: String(params.calories ?? '0'),
      protein: String(params.protein ?? '0'),
      carbs: String(params.carbs ?? '0'),
      fat: String(params.fat ?? '0'),
    }];
  }, [params.ingredients, params.name, params.calories, params.protein, params.carbs, params.fat]);

  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);

  // 1. Live Recalculation: update flat macros whenever ingredients change
  useEffect(() => {
    let totalCals = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    ingredients.forEach((ing) => {
      totalCals += Number(ing.calories) || 0;
      totalProt += Number(ing.protein) || 0;
      totalCarbs += Number(ing.carbs) || 0;
      totalFat += Number(ing.fat) || 0;
    });
    setCalories(String(Math.round(totalCals)));
    setProtein(String(Math.round(totalProt)));
    setCarbs(String(Math.round(totalCarbs)));
    setFat(String(Math.round(totalFat)));
  }, [ingredients]);

  // 2. Synchronization: if there's exactly 1 ingredient, sync main text inputs back to the ingredient
  const handleNameChange = (val: string) => {
    setName(val);
    if (ingredients.length === 1) {
      const copy = [...ingredients];
      copy[0] = { ...copy[0], name: val };
      setIngredients(copy);
    }
  };

  const handleCaloriesChange = (val: string) => {
    setCalories(val);
    if (ingredients.length === 1) {
      const copy = [...ingredients];
      copy[0] = { ...copy[0], calories: val };
      setIngredients(copy);
    }
  };

  const handleProteinChange = (val: string) => {
    setProtein(val);
    if (ingredients.length === 1) {
      const copy = [...ingredients];
      copy[0] = { ...copy[0], protein: val };
      setIngredients(copy);
    }
  };

  const handleCarbsChange = (val: string) => {
    setCarbs(val);
    if (ingredients.length === 1) {
      const copy = [...ingredients];
      copy[0] = { ...copy[0], carbs: val };
      setIngredients(copy);
    }
  };

  const handleFatChange = (val: string) => {
    setFat(val);
    if (ingredients.length === 1) {
      const copy = [...ingredients];
      copy[0] = { ...copy[0], fat: val };
      setIngredients(copy);
    }
  };

  // Ingredient list handlers
  const updateIngredientField = (index: number, field: keyof Ingredient, val: string) => {
    const copy = [...ingredients];
    copy[index] = { ...copy[index], [field]: val };
    setIngredients(copy);

    // If exactly 1 ingredient, sync back to master name state
    if (ingredients.length === 1 && field === 'name') {
      setName(val);
    }
  };

  const addIngredient = () => {
    const newIng: Ingredient = {
      name: `${t('foodReview.food', 'Ingredient')} #${ingredients.length + 1}`,
      amount: '100g',
      calories: '50',
      protein: '2',
      carbs: '10',
      fat: '1',
    };
    setIngredients([...ingredients, newIng]);
    setExpandedIndex(ingredients.length);
  };

  const deleteIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    const copy = ingredients.filter((_, i) => i !== index);
    setIngredients(copy);
    setExpandedIndex(null);
  };

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
      Alert.alert(t('foodReview.missingName', 'Missing name'), t('foodReview.enterName', 'Enter a food name (or keep “Unknown”).'));
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
      Alert.alert(
        t('common.saved', 'Saved'),
        t('foodReview.addedMsg', 'Added {{name}} to {{meal}}', {
          name: trimmed,
          meal: t(`foodReview.${meal.toLowerCase()}`, meal),
        })
      );
      router.replace('/(tabs)/fuel');
    } catch (e: any) {
      Alert.alert(t('common.error', 'Could not save'), e?.message ? String(e.message) : t('common.tryAgain', 'Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('foodReview.title', 'Review Macros')}</Text>
          <Text style={styles.headerSub}>{t(`foodReview.${meal.toLowerCase()}`, meal)} • {date}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Food Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('foodReview.food', 'Food')}</Text>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder={t('foodReview.foodPlaceholder', 'Food name')}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.hint}>{t('foodReview.hint', 'You can overwrite anything the AI guessed.')}</Text>
        </View>

        {/* Meal Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('foodReview.meal', 'Meal')}</Text>
          <View style={styles.mealSelector}>
            {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealName[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealOption, meal === m && styles.mealOptionActive]}
                onPress={() => setMeal(m)}
              >
                <Text style={[styles.mealOptionText, meal === m && styles.mealOptionTextActive]}>
                  {t(`foodReview.${m.toLowerCase()}`, m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t('foodReview.ingredients', 'Ingredients')}</Text>
            <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.addIngText}>{t('foodReview.addIngredient', 'Add')}</Text>
            </TouchableOpacity>
          </View>

          {ingredients.map((ing, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={[styles.ingItemCard, isExpanded && styles.ingItemCardExpanded]}>
                {/* Collapsed Header */}
                <TouchableOpacity
                  style={styles.ingHeader}
                  onPress={() => setExpandedIndex(isExpanded ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ingName} numberOfLines={1}>{ing.name}</Text>
                    <Text style={styles.ingAmountSub}>{ing.amount || '1 serving'} · {ing.calories} kcal</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={themeColors.textMuted}
                  />
                </TouchableOpacity>

                {/* Expanded Details Form */}
                {isExpanded && (
                  <View style={styles.ingDetails}>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.ingredientName', 'Name')}</Text>
                      <TextInput
                        value={ing.name}
                        onChangeText={(v) => updateIngredientField(index, 'name', v)}
                        style={styles.detailsInput}
                        placeholder={t('foodReview.foodPlaceholder')}
                      />
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.amount', 'Amount')}</Text>
                      <TextInput
                        value={ing.amount}
                        onChangeText={(v) => updateIngredientField(index, 'amount', v)}
                        style={styles.detailsInput}
                        placeholder="e.g. 100g"
                      />
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.calories', 'Calories')}</Text>
                      <TextInput
                        value={ing.calories}
                        onChangeText={(v) => updateIngredientField(index, 'calories', v)}
                        keyboardType="decimal-pad"
                        style={styles.detailsInput}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.protein', 'Protein (g)')}</Text>
                      <TextInput
                        value={ing.protein}
                        onChangeText={(v) => updateIngredientField(index, 'protein', v)}
                        keyboardType="decimal-pad"
                        style={styles.detailsInput}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.carbs', 'Carbs (g)')}</Text>
                      <TextInput
                        value={ing.carbs}
                        onChangeText={(v) => updateIngredientField(index, 'carbs', v)}
                        keyboardType="decimal-pad"
                        style={styles.detailsInput}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>{t('foodReview.fat', 'Fat (g)')}</Text>
                      <TextInput
                        value={ing.fat}
                        onChangeText={(v) => updateIngredientField(index, 'fat', v)}
                        keyboardType="decimal-pad"
                        style={styles.detailsInput}
                        placeholder="0"
                      />
                    </View>

                    {ingredients.length > 1 && (
                      <TouchableOpacity
                        style={styles.deleteIngBtn}
                        onPress={() => deleteIngredient(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text style={styles.deleteIngText}>{t('foodReview.delete', 'Delete')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Totals / Per Serving */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('foodReview.perServing', 'Per serving (editable)')}</Text>
          <Row label={t('foodReview.calories', 'Calories')} value={calories} onChange={handleCaloriesChange} />
          <Row label={t('foodReview.protein', 'Protein (g)')} value={protein} onChange={handleProteinChange} />
          <Row label={t('foodReview.carbs', 'Carbs (g)')} value={carbs} onChange={handleCarbsChange} />
          <Row label={t('foodReview.fat', 'Fat (g)')} value={fat} onChange={handleFatChange} />
        </View>

        {/* Servings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('foodReview.servings', 'Servings')}</Text>
          <TextInput
            value={servings}
            onChangeText={setServings}
            placeholder="1"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.hint}>
            {t('foodReview.total', 'Total')}: {Math.round(parsed.cals * parsed.s)} kcal • P{Math.round(parsed.p * parsed.s)} C{Math.round(parsed.cb * parsed.s)} F{Math.round(parsed.f * parsed.s)}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.primaryText}>{saving ? t('common.saving', 'Saving…') : t('foodReview.saveToMeal', 'Save to {{meal}}', { meal: t(`foodReview.${meal.toLowerCase()}`, meal) })}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
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
    backgroundColor: '#2563eb',
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: c.text, marginBottom: 0 },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  addIngText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
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
  hint: { marginTop: 8, color: c.textMuted, fontWeight: '600', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
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
  mealSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  mealOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  mealOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  mealOptionTextActive: {
    color: '#ffffff',
  },

  // Ingredients styles
  ingItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceMuted,
    marginBottom: 8,
    overflow: 'hidden',
  },
  ingItemCardExpanded: {
    borderColor: '#3b82f6',
    backgroundColor: c.surface,
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  ingName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
  },
  ingAmountSub: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  ingDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    gap: 8,
    paddingTop: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailsLabel: {
    flex: 1,
    fontSize: 13,
    color: c.text,
    fontWeight: '700',
  },
  detailsInput: {
    width: 150,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: c.text,
    backgroundColor: c.surface,
    textAlign: 'right',
    fontWeight: '700',
  },
  deleteIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  deleteIngText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
