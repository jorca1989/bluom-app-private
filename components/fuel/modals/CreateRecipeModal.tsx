import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: any) => void;
  userId: Id<"users">;
}

const UNIT_OPTIONS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece'] as const;

export default function CreateRecipeModal({ visible, onClose, onRecipeCreated, userId }: CreateRecipeModalProps) {
  const insets = useSafeAreaInsets();
  const createRecipe = useMutation(api.recipes.createRecipe);
  const upsertExternalFood = useMutation(api.foodCatalog.upsertExternalFood);
  const matchIngredientLines = useAction(api.externalFoods.matchIngredientLines);

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
      const matches = await matchIngredientLines({ userId, lines });
      setMatchedIngredients(matches);
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
      const matches = await matchIngredientLines({ userId, lines: [query] });
      const first = matches?.[0];
      if (first && !first.unmatched) {
        updateMatchedIngredient(idx, { ...first, unmatched: false });
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
      const withPersisted = [];
      for (const ing of matchedIngredients) {
        if (ing?.kind === 'external' && ing?.externalId && ing?.source) {
          const savedId = await upsertExternalFood({
            userId,
            source: String(ing.source),
            externalId: String(ing.externalId),
            name: String(ing.name ?? 'Food'),
            brand: ing.brand ?? undefined,
            barcode: ing.barcode ?? undefined,
            servingSize: String(ing.servingSize ?? '100g'),
            calories: Number(ing.calories ?? 0),
            protein: Number(ing.protein ?? 0),
            carbs: Number(ing.carbs ?? 0),
            fat: Number(ing.fat ?? 0),
          });
          withPersisted.push({ ...ing, foodId: String(savedId) });
        } else if (ing?._id) {
          withPersisted.push({ ...ing, foodId: String(ing._id) });
        } else {
          withPersisted.push(ing);
        }
      }

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
      Alert.alert('Error', 'Failed to save recipe.');
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
          <Text style={styles.modalTitle}>Create Recipe</Text>
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
                <Text style={styles.label}>Recipe Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chicken Stir Fry"
                  value={recipeForm.name}
                  onChangeText={(v) => setRecipeForm({ ...recipeForm, name: v })}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Servings <Text style={styles.required}>*</Text></Text>
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
                <Text style={styles.label}>Use Bulk Import for Ingredients?</Text>
                <TouchableOpacity 
                   style={[styles.checkbox, bulkImportEnabled && styles.checkboxActive]} 
                   onPress={() => setBulkImportEnabled(!bulkImportEnabled)}
                >
                   {bulkImportEnabled && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
              </View>

              {bulkImportEnabled && (
                <View style={styles.inputGroup}>
                  <Text style={styles.hintText}>Paste or type your ingredients (one per line):</Text>
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
                  <Text style={styles.subtext}>We'll try to automatically match them to foods in the database.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, (!recipeForm.name || !recipeForm.servings) && styles.disabledButton]}
                onPress={handleNextStep1}
                disabled={!recipeForm.name || !recipeForm.servings}
              >
                <Text style={styles.primaryButtonText}>Next: Ingredients</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              {matchingLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Matching your ingredients...</Text>
                </View>
              ) : (
                <View style={styles.ingredientsList}>
                  {matchedIngredients.length === 0 && (
                     <View style={styles.emptyContainer}>
                        <Ionicons name="restaurant-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No ingredients added.</Text>
                        <Text style={styles.emptySubtext}>Please go back and add ingredients.</Text>
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
                                <Text style={styles.ingOriginal}>Found from: "{String(ing.original)}"</Text>
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
                            <Text style={styles.searchLabel}>Search manually for a better match:</Text>
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
              )}

              <View style={styles.buttonRow}>
                 <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                    style={[styles.primaryButton, styles.flexButton, (matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)) && styles.disabledButton]}
                    onPress={() => setStep(3)}
                    disabled={matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)}
                 >
                    <Text style={styles.primaryButtonText}>Next: Review</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                 </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.reviewWidget}>
                 <Text style={styles.reviewLabel}>Recipe</Text>
                 <Text style={styles.reviewTitle}>{recipeForm.name}</Text>
                 <Text style={styles.reviewSub}>Makes {recipeForm.servings} Servings</Text>

                 <View style={styles.macrosDivider} />
                 
                 <Text style={styles.reviewSub}>Nutrition info per serving</Text>
                 <View style={styles.macrosGrid}>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal}>{Math.round(macros.calories / servings)}</Text>
                       <Text style={styles.macroStatLbl}>kcal</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal}>{Math.round(macros.protein / servings)}g</Text>
                       <Text style={styles.macroStatLbl}>Protein</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal}>{Math.round(macros.carbs / servings)}g</Text>
                       <Text style={styles.macroStatLbl}>Carbs</Text>
                    </View>
                    <View style={styles.macroStat}>
                       <Text style={styles.macroStatVal}>{Math.round(macros.fat / servings)}g</Text>
                       <Text style={styles.macroStatLbl}>Fat</Text>
                    </View>
                 </View>
              </View>

              <View style={styles.buttonRow}>
                 <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.primaryButton, styles.flexButton, saveLoading && styles.disabledButton]} onPress={handleSaveRecipe} disabled={saveLoading}>
                    {saveLoading ? <ActivityIndicator size="small" color="#ffffff"/> : (
                       <>
                          <Text style={styles.primaryButtonText}>Save Recipe</Text>
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#f8fafc',
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
    color: '#334155',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  hintText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: '#0f172a',
    height: 140,
  },
  subtext: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  secondaryButtonText: {
    color: '#475569',
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
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  emptyText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  ingredientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
    marginBottom: 2,
  },
  ingMeta: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ingOriginal: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  iconBtn: {
    padding: 4,
    backgroundColor: '#f1f5f9',
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
    color: '#334155',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
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
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unitChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  unitChipText: {
    fontSize: 13,
    color: '#64748b',
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
    borderTopColor: '#f1f5f9',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalLbl: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reviewWidget: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewSub: {
    fontSize: 14,
    color: '#64748b',
  },
  macrosDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  macroStat: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    width: '23%',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  macroStatVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  macroStatLbl: {
    fontSize: 11,
    color: '#64748b',
  },
});
