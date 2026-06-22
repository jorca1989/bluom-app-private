import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

interface EditRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
  recipe: any;
  onUpdated: () => void;
  onDeleted: () => void;
}

const UNIT_OPTIONS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece'] as const;

export default function EditRecipeModal({ visible, onClose, userId, recipe, onUpdated, onDeleted }: EditRecipeModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const updateRecipe = useMutation(api.recipes.updateRecipe);
  const deleteRecipe = useMutation(api.recipes.deleteRecipe);
  const searchLocalFoods = useQuery(api.customFoods.searchLocalFoods, { query: 'a', limit: 200 });

  const [recipeForm, setRecipeForm] = useState({ name: '', servings: 1 });
  const [matchedIngredients, setMatchedIngredients] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (recipe) {
      setRecipeForm({
        name: recipe.name || '',
        servings: recipe.servings || 1,
      });

      try {
        const parsed = JSON.parse(recipe.ingredientsJson || '[]');
        setMatchedIngredients(
          parsed.map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity ?? 1,
            unit: ing.unit ?? 'g',
            calories: ing.calories ?? 0,
            protein: ing.protein ?? 0,
            carbs: ing.carbs ?? 0,
            fat: ing.fat ?? 0,
            servingSize: ing.servingSize ?? '',
            _id: ing.foodId ? ing.foodId : undefined,
            unmatched: !ing.calories && !ing.protein && !ing.carbs && !ing.fat,
          }))
        );
      } catch (e) {
        console.error('Failed to parse ingredientsJson', e);
        setMatchedIngredients([]);
      }
    }
  }, [recipe, visible]);

  const getGramsPerServing = (servingSize: string, name: string) => {
    const known = [
      { name: /rice/i, unit: 'cup', grams: 158 },
      { name: /oats/i, unit: 'cup', grams: 81 },
      { name: /black beans/i, unit: 'cup', grams: 172 },
      { name: /chicken breast/i, unit: 'piece', grams: 120 },
    ];
    for (const k of known) {
      if (name.match(k.name) && servingSize.includes(k.unit)) return k.grams;
    }
    const match = servingSize.match(/(\d+\.?\d*)\s*(g|ml|cup|tbsp|tsp|piece)/i);
    if (match) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'g' || unit === 'ml') return amount;
      if (unit === 'cup') return 240 * amount;
      if (unit === 'tbsp') return 15 * amount;
      if (unit === 'tsp') return 5 * amount;
      if (unit === 'piece') return 50 * amount;
    }
    return 100;
  };

  const updateMatchedIngredient = (idx: number, newData: any) => {
    setMatchedIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...newData } : ing)));
  };

  const removeMatchedIngredient = (idx: number) => {
    setMatchedIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const addIngredient = () => {
    setMatchedIngredients((prev) => [
      ...prev,
      {
        name: t('foodReview.food', 'New Ingredient'),
        quantity: 100,
        unit: 'g',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: '100g',
        unmatched: true,
        editing: true,
      },
    ]);
  };

  const handleManualSearch = async (idx: number, query: string) => {
    try {
      const lowerQ = query.toLowerCase();
      const found = (searchLocalFoods ?? []).find((f: any) => {
        const name = typeof f.name === 'object' ? (f.name.en || '').toLowerCase() : (f.name || '').toLowerCase();
        return name.includes(lowerQ) || lowerQ.includes(name);
      });
      if (found) {
        updateMatchedIngredient(idx, {
          name: typeof found.name === 'object' ? found.name.en : found.name,
          calories: found.macros?.calories ?? 0,
          protein: found.macros?.protein ?? 0,
          carbs: found.macros?.carbs ?? 0,
          fat: found.macros?.fat ?? 0,
          servingSize: found.servingSize ?? '100g',
          _id: found._id,
          unmatched: false,
        });
      } else {
        updateMatchedIngredient(idx, { name: query, unmatched: true });
      }
    } catch {
      updateMatchedIngredient(idx, { name: query, unmatched: true });
    }
  };

  const calculateMacros = (ings: any[] = matchedIngredients) => {
    return ings.reduce(
      (total, ing) => {
        if (ing.unmatched) return total;
        const userUnit = ing.unit || 'g';
        const userQty = ing.quantity ?? 1;
        const gramsPerServing = getGramsPerServing(ing.servingSize || '', ing.name || '');
        let factor = 1;
        if (userUnit === 'g' || userUnit === 'ml') factor = userQty / gramsPerServing;
        else if (userUnit === 'cup') factor = (userQty * 240) / gramsPerServing;
        else if (userUnit === 'tbsp') factor = (userQty * 15) / gramsPerServing;
        else if (userUnit === 'tsp') factor = (userQty * 5) / gramsPerServing;
        else if (userUnit === 'piece') factor = (userQty * 50) / gramsPerServing;
        else factor = userQty / 100;

        return {
          calories: total.calories + (ing.calories || 0) * factor,
          protein: total.protein + (ing.protein || 0) * factor,
          carbs: total.carbs + (ing.carbs || 0) * factor,
          fat: total.fat + (ing.fat || 0) * factor,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const computeIngredientTotals = (ing: any) => {
    if (!ing || ing.unmatched) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const userUnit = ing.unit || 'g';
    const userQty = Number(ing.quantity ?? 1) || 1;
    const gramsPerServing = getGramsPerServing(String(ing.servingSize ?? ''), String(ing.name ?? ''));
    let factor = 1;
    if (userUnit === 'g' || userUnit === 'ml') factor = userQty / gramsPerServing;
    else if (userUnit === 'cup') factor = (userQty * 240) / gramsPerServing;
    else if (userUnit === 'tbsp') factor = (userQty * 15) / gramsPerServing;
    else if (userUnit === 'tsp') factor = (userQty * 5) / gramsPerServing;
    else if (userUnit === 'piece') factor = (userQty * 50) / gramsPerServing;
    else factor = userQty / 100;

    return {
      calories: Number(ing.calories ?? 0) * factor,
      protein: Number(ing.protein ?? 0) * factor,
      carbs: Number(ing.carbs ?? 0) * factor,
      fat: Number(ing.fat ?? 0) * factor,
    };
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.name || !recipeForm.servings) {
      Alert.alert(t('common.error', 'Error'), t('modals.addFood.error', 'Please fill in all required fields'));
      return;
    }

    if (matchedIngredients.length === 0) {
      Alert.alert(t('common.error', 'Error'), t('modals.createRecipe.noIngredients', 'Please add at least one ingredient.'));
      return;
    }

    if (matchedIngredients.some((ing) => ing.unmatched)) {
      Alert.alert(t('common.error', 'Error'), t('modals.editRecipe.unmatchedError', 'Please resolve all unmatched ingredients.'));
      return;
    }

    setSaveLoading(true);
    try {
      const withPersisted = matchedIngredients.map((ing) => {
        if (ing?._id) {
          return { ...ing, foodId: String(ing._id) };
        }
        return ing;
      });

      const totalMacros = calculateMacros(withPersisted);
      const servings = recipeForm.servings || 1;
      const perServing = {
        calories: totalMacros.calories / servings,
        protein: totalMacros.protein / servings,
        carbs: totalMacros.carbs / servings,
        fat: totalMacros.fat / servings,
      };
      const nutrition = { total: totalMacros, perServing };

      const ingredientsJson = JSON.stringify(
        withPersisted.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? 1,
          unit: ing.unit ?? 'g',
          calories: ing.calories ?? 0,
          protein: ing.protein ?? 0,
          carbs: ing.carbs ?? 0,
          fat: ing.fat ?? 0,
          servingSize: ing.servingSize ?? '',
          foodId: ing.foodId ?? undefined,
          source: ing.source ?? undefined,
          externalId: ing.externalId ?? undefined,
        }))
      );

      const nutritionJson = JSON.stringify(nutrition);

      await updateRecipe({
        recipeId: recipe._id,
        name: recipeForm.name,
        servings: recipeForm.servings,
        ingredientsJson,
        nutritionJson,
      });

      Alert.alert(t('common.saved', 'Saved'), t('modals.editRecipe.successMsg', 'Recipe updated!'));
      onUpdated();
      onClose();
    } catch {
      Alert.alert(t('common.error', 'Error'), t('modals.createRecipe.error', 'Failed to save recipe.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('modals.editRecipe.deleteTitle', 'Delete Recipe'),
      t('modals.editRecipe.deleteConfirm', 'Are you sure you want to delete this recipe permanently?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRecipe({ recipeId: recipe._id });
              onDeleted();
              onClose();
            } catch {
              Alert.alert(t('common.error', 'Error'), t('modals.editRecipe.deleteFailed', 'Failed to delete recipe.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const servings = recipeForm.servings || 1;
  const macros = calculateMacros();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('modals.editRecipe.title', 'Edit Recipe')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={{ padding: 24, paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('modals.createRecipe.name', 'Recipe Name')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.createRecipe.namePlaceholder', 'e.g. Chicken Stir Fry')}
              value={recipeForm.name}
              onChangeText={(v) => setRecipeForm({ ...recipeForm, name: v })}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('modals.createRecipe.servings', 'Servings')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 4"
              value={String(recipeForm.servings)}
              onChangeText={(v) => setRecipeForm({ ...recipeForm, servings: parseInt(v) || 1 })}
              keyboardType="numeric"
              selectTextOnFocus
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.reviewWidget}>
            <Text style={styles.reviewSub}>{t('modals.createRecipe.perServing', 'Nutrition info per serving')}</Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroStat}>
                <Text style={styles.macroStatVal}>{Math.round(macros.calories / servings)}</Text>
                <Text style={styles.macroStatLbl}>{t('common.kcal', 'kcal')}</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={styles.macroStatVal}>{Math.round(macros.protein / servings)}g</Text>
                <Text style={styles.macroStatLbl}>{t('common.protein', 'Protein')}</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={styles.macroStatVal}>{Math.round(macros.carbs / servings)}g</Text>
                <Text style={styles.macroStatLbl}>{t('common.carbs', 'Carbs')}</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={styles.macroStatVal}>{Math.round(macros.fat / servings)}g</Text>
                <Text style={styles.macroStatLbl}>{t('common.fat', 'Fat')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionHeader, { marginTop: 24, marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>{t('modals.createRecipe.ingredients', 'Ingredients')}</Text>
            <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient}>
              <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />
              <Text style={styles.addIngText}>{t('foodReview.addIngredient', 'Add')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ingredientsList}>
            {matchedIngredients.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t('modals.createRecipe.noIngredients', 'No ingredients added.')}</Text>
              </View>
            )}
            {matchedIngredients.map((ing, idx) => {
              const totals = computeIngredientTotals(ing);
              const isUnmatched = !!ing.unmatched;
              const isEditing = !!ing.editing;

              return (
                <View key={idx} style={[styles.ingredientCard, isUnmatched && styles.ingredientCardError]}>
                  <View style={styles.ingHeader}>
                    <Ionicons name={isUnmatched ? "alert-circle" : "checkmark-circle"} size={20} color={isUnmatched ? "#ef4444" : "#10b981"} />
                    <View style={styles.ingTitleWrap}>
                      <Text style={styles.ingTitle} numberOfLines={2}>
                        {String(ing?.name ?? 'Ingredient')}
                      </Text>
                      <Text style={styles.ingMeta} numberOfLines={1}>
                        {String(ing.quantity ?? 1)} {String(ing.unit ?? 'g')}
                        {ing?.servingSize ? ` • ${String(ing.servingSize)}` : ''}
                      </Text>
                    </View>
                    
                    <TouchableOpacity style={styles.iconBtn} onPress={() => updateMatchedIngredient(idx, { editing: !isEditing })}>
                      <Ionicons name={isEditing ? "close" : "search"} size={18} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => removeMatchedIngredient(idx)}>
                      <Ionicons name="trash" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {(isUnmatched || isEditing) && (
                    <View style={styles.searchBox}>
                      <Text style={styles.searchLabel}>{t('modals.createRecipe.searchManually', 'Search manually for a better match:')}</Text>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="e.g. 1 cup oatmeal"
                        defaultValue={ing.name}
                        onSubmitEditing={(e) => {
                          handleManualSearch(idx, e.nativeEvent.text);
                          updateMatchedIngredient(idx, { editing: false });
                        }}
                        autoFocus={isEditing}
                      />
                    </View>
                  )}

                  {!isUnmatched && (
                    <>
                      <View style={styles.controlsRow}>
                        <TextInput
                          style={styles.qtyInput}
                          value={String(ing.quantity ?? 1)}
                          onChangeText={(v) => updateMatchedIngredient(idx, { quantity: parseFloat(v) || 1 })}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitsScroll}>
                          {UNIT_OPTIONS.map((unit) => {
                            const active = (ing.unit || 'g') === unit;
                            return (
                              <TouchableOpacity
                                key={unit}
                                style={[styles.unitChip, active && styles.unitChipActive]}
                                onPress={() => updateMatchedIngredient(idx, { unit })}
                              >
                                <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{unit}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={styles.totalsRow}>
                        <View style={styles.totalItem}>
                          <Text style={styles.totalVal}>{Math.round(totals.calories)}</Text>
                          <Text style={styles.totalLbl}>kcal</Text>
                        </View>
                        <View style={styles.totalItem}>
                          <Text style={styles.totalVal}>{Math.round(totals.protein)}</Text>
                          <Text style={styles.totalLbl}>P</Text>
                        </View>
                        <View style={styles.totalItem}>
                          <Text style={styles.totalVal}>{Math.round(totals.carbs)}</Text>
                          <Text style={styles.totalLbl}>C</Text>
                        </View>
                        <View style={styles.totalItem}>
                          <Text style={styles.totalVal}>{Math.round(totals.fat)}</Text>
                          <Text style={styles.totalLbl}>F</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting || saveLoading}>
              {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash" size={20} color="#ef4444" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton, saveLoading && styles.disabledButton]}
              onPress={handleSaveRecipe}
              disabled={saveLoading || deleting}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{t('common.save', 'Save Changes')}</Text>
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: c.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: c.surfaceMuted,
    borderRadius: 20,
  },
  modalContent: {
    flex: 1,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: c.text,
  },
  reviewWidget: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 8,
  },
  reviewSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroStat: {
    alignItems: 'center',
    flex: 1,
  },
  macroStatVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
  },
  macroStatLbl: {
    fontSize: 11,
    color: c.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addIngText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  ingredientsList: {
    gap: 12,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: c.textMuted,
    fontWeight: '500',
    fontSize: 14,
    marginTop: 8,
  },
  ingredientCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
  ingredientCardError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingTitleWrap: {
    flex: 1,
  },
  ingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: c.text,
  },
  ingMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: c.surfaceMuted,
    borderRadius: 10,
    marginLeft: 4,
  },
  searchBox: {
    marginTop: 12,
    gap: 6,
  },
  searchLabel: {
    fontSize: 12,
    color: c.text,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  qtyInput: {
    width: 60,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 6,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  unitsScroll: {
    gap: 6,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  unitChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  unitChipText: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.surfaceMuted,
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: c.text,
  },
  totalLbl: {
    fontSize: 10,
    color: c.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  flexButton: {
    flex: 1,
  },
});
