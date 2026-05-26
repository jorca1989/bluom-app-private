import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: any) => void;
  userId: Id<"users">;
}

const UNIT_OPTIONS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece'] as const;

export default function CreateRecipeModal({ visible, onClose, onRecipeCreated, userId }: CreateRecipeModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const createRecipe = useMutation(api.recipes.createRecipe);
  // External food persistence removed — all foods now come from local customFoods database
  const searchLocalFoods = useQuery(api.customFoods.searchLocalFoods, { query: 'a', limit: 200 });

  const [step, setStep] = useState(1);
  const [recipeForm, setRecipeForm] = useState({ name: '', servings: 1 });
  const [bulkImportEnabled, setBulkImportEnabled] = useState(false);
  const [bulkIngredients, setBulkIngredients] = useState('');
  const [matchedIngredients, setMatchedIngredients] = useState<any[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

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

  const autoMatchIngredients = async () => {
    setMatchingLoading(true);
    const lines = bulkIngredients.split('\n').map((l) => l.trim()).filter(Boolean);
    try {
      // Match each line against local food database
      const matched = lines.map((line) => {
        const lowerLine = line.toLowerCase();
        const found = (searchLocalFoods ?? []).find((f: any) => {
          const name = typeof f.name === 'object' ? (f.name.en || '').toLowerCase() : (f.name || '').toLowerCase();
          return name.includes(lowerLine) || lowerLine.includes(name);
        });
        if (found) {
          return {
            name: typeof found.name === 'object' ? found.name.en : found.name,
            original: line,
            calories: found.macros?.calories ?? 0,
            protein: found.macros?.protein ?? 0,
            carbs: found.macros?.carbs ?? 0,
            fat: found.macros?.fat ?? 0,
            servingSize: found.servingSize ?? '100g',
            quantity: 1,
            unit: 'g',
            _id: found._id,
            unmatched: false,
          };
        }
        return { name: line, original: line, unmatched: true, quantity: 1, unit: 'g' };
      });
      setMatchedIngredients(matched);
    } catch {
      setMatchedIngredients(lines.map((l) => ({ name: l, unmatched: true, quantity: 1, unit: 'g' })));
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleNextStep1 = async () => {
    if (bulkImportEnabled) {
      await autoMatchIngredients();
    }
    setStep(2);
  };

  const updateMatchedIngredient = (idx: number, newData: any) => {
    setMatchedIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...newData } : ing)));
  };

  const removeMatchedIngredient = (idx: number) => {
    setMatchedIngredients((prev) => prev.filter((_, i) => i !== idx));
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
        const userUnit =
          ing.unit ||
          (ing.servingSize && String(ing.servingSize).match(/ml|g|cup|tbsp|tsp|piece/i)?.[0]?.toLowerCase()) ||
          'g';
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
    const userUnit =
      ing.unit ||
      (ing.servingSize && String(ing.servingSize).match(/ml|g|cup|tbsp|tsp|piece/i)?.[0]?.toLowerCase()) ||
      'g';
    const userQty = Number(ing.quantity ?? 1) || 1;
    const gramsPerServing = getGramsPerServing(String(ing.servingSize ?? ''), String(ing.name ?? ''));
    let factor = 1;
    if (userUnit === 'g' || userUnit === 'ml') factor = userQty / gramsPerServing;
    else if (userUnit === 'cup') factor = (userQty * 240) / gramsPerServing;
    else if (userUnit === 'tbsp') factor = (userQty * 15) / gramsPerServing;
    else if (userUnit === 'tsp') factor = (userQty * 5) / gramsPerServing;
    else if (userUnit === 'piece') factor = (userQty * 50) / gramsPerServing;
    else factor = userQty / 100;

    const calories = Number(ing.calories ?? 0) * factor;
    const protein = Number(ing.protein ?? 0) * factor;
    const carbs = Number(ing.carbs ?? 0) * factor;
    const fat = Number(ing.fat ?? 0) * factor;
    return { calories, protein, carbs, fat };
  };

  const handleSaveRecipe = async () => {
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

      const id = await createRecipe({
        userId,
        name: recipeForm.name,
        servings: recipeForm.servings,
        ingredientsJson,
        nutritionJson,
      });

      onRecipeCreated({
        _id: id,
        name: recipeForm.name,
        servings: recipeForm.servings,
        ingredientsJson,
        nutritionJson,
        nutrition,
      });

      handleClose();
    } catch {
      Alert.alert(t('common.error', 'Error'), t('modals.createRecipe.error', 'Failed to save recipe.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClose = () => {
    setRecipeForm({ name: '', servings: 1 });
    setBulkIngredients('');
    setMatchedIngredients([]);
    setStep(1);
    setBulkImportEnabled(false);
    onClose();
  };

  const servings = recipeForm.servings || 1;
  const macros = calculateMacros();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('modals.createRecipe.title', 'Create Recipe')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContainer}>
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

              <View style={styles.switchRow}>
                <Text style={[styles.label, { flex: 1, marginRight: 12 }]} numberOfLines={2}>{t('modals.createRecipe.bulkImport', 'Use Bulk Import for Ingredients?')}</Text>
                <TouchableOpacity 
                   style={[styles.checkbox, bulkImportEnabled && styles.checkboxActive]} 
                   onPress={() => setBulkImportEnabled(!bulkImportEnabled)}
                >
                   {bulkImportEnabled && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
              </View>

              {bulkImportEnabled && (
                <View style={styles.inputGroup}>
                  <Text style={styles.hintText}>{t('modals.createRecipe.pasteIngredients', 'Paste or type your ingredients (one per line):')}</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="2 chicken breasts&#10;1 cup broccoli&#10;1 tbsp olive oil"
                    value={bulkIngredients}
                    onChangeText={setBulkIngredients}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    placeholderTextColor="#cbd5e1"
                  />
                  <Text style={styles.subtext}>{t('modals.createRecipe.autoMatchHint', 'We\'ll try to automatically match them to foods in the database.')}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, (!recipeForm.name || !recipeForm.servings) && styles.disabledButton]}
                onPress={handleNextStep1}
                disabled={!recipeForm.name || !recipeForm.servings}
              >
                <Text style={styles.primaryButtonText}>{t('modals.createRecipe.nextIngredients', 'Next: Ingredients')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              {matchingLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>{t('modals.createRecipe.matching', 'Matching your ingredients...')}</Text>
                </View>
              ) : (
                <View style={styles.ingredientsList}>
                  {matchedIngredients.length === 0 && (
                     <View style={styles.emptyContainer}>
                        <Ionicons name="restaurant-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>{t('modals.createRecipe.noIngredients', 'No ingredients added.')}</Text>
                        <Text style={styles.emptySubtext}>{t('modals.createRecipe.goBack', 'Please go back and add ingredients.')}</Text>
                     </View>
                  )}
                  {matchedIngredients.map((ing, idx) => {
                    const totals = computeIngredientTotals(ing);
                    const isUnmatched = !!ing.unmatched;
                    const isEditing = !!ing.editing;

                    return (
                      <View key={idx} style={[styles.ingredientCard, isUnmatched && styles.ingredientCardError]}>
                        <View style={styles.ingHeader}>
                          <Ionicons name={isUnmatched ? "alert-circle" : "checkmark-circle"} size={22} color={isUnmatched ? "#ef4444" : "#10b981"} />
                          <View style={styles.ingTitleWrap}>
                             <Text style={styles.ingTitle} numberOfLines={2}>
                               {String(ing?.name ?? ing?.original ?? 'Ingredient')}
                             </Text>
                             <Text style={styles.ingMeta} numberOfLines={1}>
                               {String(ing.quantity ?? 1)} {String(ing.unit ?? 'g')}
                               {ing?.servingSize ? ` • ${String(ing.servingSize)}` : ''}
                             </Text>
                             {!!ing?.original && (
                                <Text style={styles.ingOriginal}>{t('modals.createRecipe.foundFrom', 'Found from:')} "{String(ing.original)}"</Text>
                             )}
                          </View>
                          
                          <TouchableOpacity style={styles.iconBtn} onPress={() => updateMatchedIngredient(idx, { editing: !isEditing })}>
                             <Ionicons name={isEditing ? "close" : "search"} size={20} color="#64748b" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconBtn} onPress={() => removeMatchedIngredient(idx)}>
                             <Ionicons name="trash" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>

                        {(isUnmatched || isEditing) && (
                          <View style={styles.searchBox}>
                            <Text style={styles.searchLabel}>{t('modals.createRecipe.searchManually', 'Search manually for a better match:')}</Text>
                            <TextInput
                              style={styles.searchInput}
                              placeholder="e.g. 1 cup oatmeal"
                              defaultValue={isUnmatched ? (ing.original || ing.name) : ''}
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
                                 keyboardType="numeric"
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
                                   <Text style={styles.totalLbl}>{t('common.kcal', 'kcal')}</Text>
                                </View>
                                <View style={styles.totalItem}>
                                   <Text style={styles.totalVal}>{Math.round(totals.protein)}</Text>
                                   <Text style={styles.totalLbl}>{t('common.proteinShort', 'P')}</Text>
                                </View>
                                <View style={styles.totalItem}>
                                   <Text style={styles.totalVal}>{Math.round(totals.carbs)}</Text>
                                   <Text style={styles.totalLbl}>{t('common.carbsShort', 'C')}</Text>
                                </View>
                                <View style={styles.totalItem}>
                                   <Text style={styles.totalVal}>{Math.round(totals.fat)}</Text>
                                   <Text style={styles.totalLbl}>{t('common.fatShort', 'F')}</Text>
                                </View>
                             </View>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.buttonRow}>
                 <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                    <Text style={styles.secondaryButtonText}>{t('common.back', 'Back')}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                    style={[styles.primaryButton, styles.flexButton, (matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)) && styles.disabledButton]}
                    onPress={() => setStep(3)}
                    disabled={matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)}
                 >
                    <Text style={styles.primaryButtonText}>{t('modals.createRecipe.nextReview', 'Next: Review')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                 </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.reviewWidget}>
                 <Text style={styles.reviewLabel}>{t('modals.createRecipe.recipe', 'Recipe')}</Text>
                 <Text style={styles.reviewTitle}>{recipeForm.name}</Text>
                 <Text style={styles.reviewSub}>{t('modals.createRecipe.makesServings', { count: recipeForm.servings })}</Text>

                 <View style={styles.macrosDivider} />
                 
                 <Text style={styles.reviewSub}>{t('modals.createRecipe.perServing', 'Nutrition info per serving')}</Text>
                 <View style={styles.macrosGrid}>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal} numberOfLines={1} adjustsFontSizeToFit>{Math.round(macros.calories / servings)}</Text>
                       <Text style={styles.macroStatLbl} numberOfLines={1} adjustsFontSizeToFit>{t('common.kcal', 'kcal')}</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal} numberOfLines={1} adjustsFontSizeToFit>{Math.round(macros.protein / servings)}g</Text>
                       <Text style={styles.macroStatLbl} numberOfLines={1} adjustsFontSizeToFit>{t('common.protein', 'Protein')}</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal} numberOfLines={1} adjustsFontSizeToFit>{Math.round(macros.carbs / servings)}g</Text>
                       <Text style={styles.macroStatLbl} numberOfLines={1} adjustsFontSizeToFit>{t('common.carbs', 'Carbs')}</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal} numberOfLines={1} adjustsFontSizeToFit>{Math.round(macros.fat / servings)}g</Text>
                       <Text style={styles.macroStatLbl} numberOfLines={1} adjustsFontSizeToFit>{t('common.fat', 'Fat')}</Text>
                    </View>
                 </View>
              </View>

              <View style={styles.buttonRow}>
                 <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
                    <Text style={styles.secondaryButtonText}>{t('common.back', 'Back')}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.primaryButton, styles.flexButton, saveLoading && styles.disabledButton]} onPress={handleSaveRecipe} disabled={saveLoading}>
                    {saveLoading ? <ActivityIndicator size="small" color="#ffffff"/> : (
                       <>
                          <Text style={styles.primaryButtonText}>{t('modals.createRecipe.saveRecipe', 'Save Recipe')}</Text>
                          <Ionicons name="checkmark" size={18} color="#ffffff" />
                       </>
                    )}
                 </TouchableOpacity>
              </View>
            </View>
          )}
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
    padding: 24,
  },
  stepContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.surfaceMuted,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: c.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.surface,
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  hintText: {
    fontSize: 14,
    color: c.text,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: c.text,
    height: 140,
  },
  subtext: {
    fontSize: 12,
    color: c.textMuted,
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
  secondaryButton: {
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  secondaryButtonText: {
    color: c.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  flexButton: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#3b82f6',
    marginTop: 12,
    fontWeight: '500',
  },
  ingredientsList: {
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed'
  },
  emptyText: {
    color: c.text,
    fontWeight: '600',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: c.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  ingredientCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  ingredientCardError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ingTitleWrap: {
    flex: 1,
  },
  ingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 2,
  },
  ingMeta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  ingOriginal: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  iconBtn: {
    padding: 4,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    marginLeft: 4,
  },
  searchBox: {
    marginTop: 12,
    gap: 8,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text,
  },
  searchInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  qtyInput: {
    width: 60,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 15,
  },
  unitsScroll: {
    gap: 6,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  unitChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  unitChipText: {
    fontSize: 13,
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.surfaceMuted,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: c.text,
  },
  totalLbl: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  reviewWidget: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 4,
  },
  reviewSub: {
    fontSize: 14,
    color: c.textMuted,
  },
  macrosDivider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
  },
  macroStat: {
    alignItems: 'center',
    backgroundColor: c.surface,
    padding: 10,
    borderRadius: 16,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: c.surfaceMuted,
  },
  macroStatVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  macroStatLbl: {
    fontSize: 10,
    color: c.textMuted,
    textAlign: 'center',
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
