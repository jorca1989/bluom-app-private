import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
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
  onSave: () => void;
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
  const { t } = useTranslation();
  if (!visible || !recipe) return null;

  const perServing = recipe.nutrition?.perServing || recipe.nutrition || {
    calories: recipe.calories || 0,
    protein: recipe.protein || 0,
    carbs: recipe.carbs || 0,
    fat: recipe.fat || 0,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('modals.logRecipe.title', recipe?.ingredients ? 'Log Recipe' : 'Log Food')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successView}>
              <View style={styles.successIconWrap}>
                 <Ionicons name="checkmark-sharp" size={40} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>{t('modals.logRecipe.logged', recipe?.ingredients ? 'Recipe Logged!' : 'Food Logged!')}</Text>
              <Text style={styles.successSub}>{t('modals.logRecipe.addedTo', 'Added to your')} {t(`fuel.meals.${meal.toLowerCase()}`, meal).toLowerCase()}.</Text>
            </View>
          ) : (
            <View style={styles.body}>
              <View style={styles.recipeCard}>
                <Text style={styles.recipeName}>{recipe.title || recipe.name}</Text>
                <View style={styles.macrosRow}>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🔥 {Math.round(perServing.calories)} kcal</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🍗 P {Math.round(perServing.protein)}g</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🍚 C {Math.round(perServing.carbs)}g</Text>
                   </View>
                   <View style={styles.macroPill}>
                      <Text style={styles.macroPillTxt}>🥜 F {Math.round(perServing.fat)}g</Text>
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
                <Text style={styles.label}>{t('modals.logRecipe.qty', 'Quantity (Servings)')}</Text>
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => onQuantityChange(Math.max(1, quantity - 1))}>
                    <Ionicons name="remove" size={24} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => onQuantityChange(quantity + 1)}>
                    <Ionicons name="add" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelBtnTxt}>{t('modals.logRecipe.skip', 'Skip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
                  <Text style={styles.saveBtnTxt}>{t('modals.logRecipe.logTo', 'Log to')} {t(`fuel.meals.${meal.toLowerCase()}`, meal)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
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
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 8,
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
  qtyVal: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
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
