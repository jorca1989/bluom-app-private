import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface LogRecipeModalProps {
  visible: boolean;
  recipe: any;
  meal: MealName;
  quantity: number;
  success: boolean;
  onMealChange: (meal: MealName) => void;
  onQuantityChange: (qty: number) => void;
  onSave: (customMultiplier?: number, customServingSize?: string) => void;
  onCancel: () => void;
  onClose: () => void;
}

export default function LogRecipeModal({
  visible,
  recipe,
  meal,
  quantity,
  success,
  onMealChange,
  onQuantityChange,
  onSave,
  onCancel,
  onClose,
}: LogRecipeModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const getLocalizedName = (nameField: any) => {
    if (typeof nameField !== 'object' || nameField === null) return nameField || 'Food';
    return nameField[currentLang] || nameField.en || Object.values(nameField)[0] || 'Food';
  };

  const [localRecipe, setLocalRecipe] = useState<any>(null);

  useEffect(() => {
    if (recipe) {
      setLocalRecipe(recipe);
    }
  }, [recipe]);

  const activeRecipe = recipe || localRecipe;

  const parseServingSize = (sizeStr: string) => {
    if (!sizeStr) return { value: 100, unit: 'g' };
    const match = String(sizeStr).match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (match) {
      return {
        value: parseFloat(match[1]) || 100,
        unit: match[2].trim() || 'g'
      };
    }
    return { value: 100, unit: 'g' };
  };

  const { value: baseValue, unit: baseUnit } = useMemo(() => {
    return parseServingSize(activeRecipe ? activeRecipe.servingSize : '');
  }, [activeRecipe]);

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible && activeRecipe) {
      setInputValue(String(baseValue));
    }
  }, [visible, activeRecipe, baseValue]);

  const perServing = useMemo(() => {
    if (!activeRecipe) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return activeRecipe.nutrition?.perServing || activeRecipe.nutrition || activeRecipe.macros || {
      calories: activeRecipe.calories || 0,
      protein: activeRecipe.protein || 0,
      carbs: activeRecipe.carbs || 0,
      fat: activeRecipe.fat || 0,
    };
  }, [activeRecipe]);

  const adjustValue = (direction: 'up' | 'down') => {
    const current = parseFloat(inputValue) || baseValue;
    let step = 1;
    if (baseUnit === 'g' || baseUnit === 'ml') {
      step = baseValue >= 50 ? 50 : 10;
    } else {
      step = 0.5;
    }
    const next = direction === 'up' ? current + step : Math.max(step, current - step);
    setInputValue(String(next));
  };

  const numericValue = parseFloat(inputValue) || baseValue;
  const factor = activeRecipe ? (numericValue / baseValue) : 1;

  const displayCalories = Math.round((perServing.calories ?? 0) * factor);
  const displayProtein = Math.round((perServing.protein ?? 0) * factor);
  const displayCarbs = Math.round((perServing.carbs ?? 0) * factor);
  const displayFat = Math.round((perServing.fat ?? 0) * factor);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {activeRecipe ? (
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]} edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('modals.logRecipe.title', activeRecipe?.ingredients ? 'Log Recipe' : 'Log Food')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {success ? (
              <View style={styles.successView}>
                <View style={styles.successIconWrap}>
                   <Ionicons name="checkmark-sharp" size={40} color="#10b981" />
                </View>
                <Text style={styles.successTitle}>{t('modals.logRecipe.logged', activeRecipe?.ingredients ? 'Recipe Logged!' : 'Food Logged!')}</Text>
                <Text style={styles.successSub}>{t('modals.logRecipe.addedTo', 'Added to your')} {t(`fuel.meals.${meal.toLowerCase()}`, meal).toLowerCase()}.</Text>
              </View>
            ) : (
            <View style={styles.body}>
              <View style={styles.recipeCard}>
                <Text style={styles.recipeName}>{activeRecipe.title || getLocalizedName(activeRecipe.name)}</Text>
                <View style={styles.macrosRow}>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🔥 {displayCalories} kcal</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🥩 P {displayProtein}g</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🥖 C {displayCarbs}g</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🥑 F {displayFat}g</Text>
                   </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('modals.logRecipe.logToMeal', 'Log to Meal')}</Text>
                <View style={styles.mealSelector}>
                  {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealName[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealOption, meal === m && styles.mealOptionActive]}
                      onPress={() => onMealChange(m)}
                    >
                      <Text style={[styles.mealText, meal === m && styles.mealTextActive]}>
                        {t(`fuel.meals.${m.toLowerCase()}`, m)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  {t('modals.logRecipe.qty', 'Quantity')} {activeRecipe.servingSize ? `(Base: ${activeRecipe.servingSize})` : ''}
                </Text>
                <View style={styles.qtyInputContainer}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustValue('down')}>
                    <Ionicons name="remove" size={20} color="#64748b" />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.qtyTextInput}
                    value={inputValue}
                    onChangeText={setInputValue}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={styles.qtyUnitText}>{baseUnit}</Text>

                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustValue('up')}>
                    <Ionicons name="add" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelBtnTxt}>{t('modals.logRecipe.skip', 'Skip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={() => {
                  const numVal = parseFloat(inputValue) || baseValue;
                  const mult = numVal / baseValue;
                  const servingStr = `${numVal}${baseUnit}`;
                  onSave(mult, servingStr);
                }}>
                  <Text style={styles.saveBtnTxt}>{t('modals.logRecipe.logTo', 'Log to')} {t(`fuel.meals.${meal.toLowerCase()}`, meal)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
      ) : null}
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: c.surfaceMuted,
    borderRadius: 20,
  },
  successView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 15,
    color: c.textMuted,
  },
  body: {
    gap: 24,
  },
  recipeCard: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 20,
    padding:  20,
    borderWidth: 1,
    borderColor: c.border,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 12,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroPill: {
    backgroundColor: c.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.surfaceMuted,
  },
  macroPillTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text,
  },
  field: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  mealSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
  },
  mealOptionActive: {
    backgroundColor: '#3b82f6',
  },
  mealText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.text,
  },
  mealTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  qtyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 6,
  },
  qtyBtn: {
    padding: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  qtyTextInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text,
    paddingVertical: 8,
  },
  qtyUnitText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textMuted,
    marginRight: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnTxt: {
    color: c.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnTxt: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
