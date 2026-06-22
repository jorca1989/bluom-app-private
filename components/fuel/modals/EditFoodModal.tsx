import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

interface EditFoodModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
  food: any;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function EditFoodModal({ visible, onClose, userId, food, onUpdated, onDeleted }: EditFoodModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const updateFood = useMutation(api.foodCatalog.updateFood);
  const deleteFood = useMutation(api.foodCatalog.deleteFood);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    servingSize: '100g',
    calories: '',
    totalCarbs: '',
    totalFat: '',
    protein: '',
    sugar: '',
    fiber: '',
    saturatedFat: '',
    polyunsaturatedFat: '',
    monounsaturatedFat: '',
    transFat: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (food) {
      setForm({
        name: food.name || '',
        brand: food.brand || '',
        servingSize: food.servingSize || '100g',
        calories: String(food.calories ?? ''),
        totalCarbs: String(food.carbs ?? ''),
        totalFat: String(food.fat ?? ''),
        protein: String(food.protein ?? ''),
        sugar: food.sugar !== undefined ? String(food.sugar) : '',
        fiber: food.fiber !== undefined ? String(food.fiber) : '',
        saturatedFat: food.saturatedFat !== undefined ? String(food.saturatedFat) : '',
        polyunsaturatedFat: food.polyunsaturatedFat !== undefined ? String(food.polyunsaturatedFat) : '',
        monounsaturatedFat: food.monounsaturatedFat !== undefined ? String(food.monounsaturatedFat) : '',
        transFat: food.transFat !== undefined ? String(food.transFat) : '',
      });
      setShowAdvanced(
        food.sugar !== undefined ||
        food.fiber !== undefined ||
        food.saturatedFat !== undefined ||
        food.polyunsaturatedFat !== undefined ||
        food.monounsaturatedFat !== undefined ||
        food.transFat !== undefined
      );
    }
  }, [food, visible]);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    if (!form.name || !form.calories || !form.totalFat || !form.totalCarbs || !form.protein) {
      setError(t('modals.addFood.error', 'Please fill in all required fields'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateFood({
        foodId: food._id,
        name: form.name,
        brand: form.brand || undefined,
        servingSize: form.servingSize,
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.totalCarbs) || 0,
        fat: parseFloat(form.totalFat) || 0,
        sugar: form.sugar ? parseFloat(form.sugar) : undefined,
        fiber: form.fiber ? parseFloat(form.fiber) : undefined,
        saturatedFat: form.saturatedFat ? parseFloat(form.saturatedFat) : undefined,
        polyunsaturatedFat: form.polyunsaturatedFat ? parseFloat(form.polyunsaturatedFat) : undefined,
        monounsaturatedFat: form.monounsaturatedFat ? parseFloat(form.monounsaturatedFat) : undefined,
        transFat: form.transFat ? parseFloat(form.transFat) : undefined,
      });

      Alert.alert(t('common.saved', 'Saved'), t('modals.editFood.successMsg', 'Food updated!'));
      onUpdated();
      onClose();
    } catch {
      setError(t('common.error', 'Failed to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('modals.editFood.deleteTitle', 'Delete Food'),
      t('modals.editFood.deleteConfirm', 'Are you sure you want to delete this food item permanently?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteFood({ foodId: food._id });
              onDeleted();
              onClose();
            } catch {
              Alert.alert(t('common.error', 'Error'), t('modals.editFood.deleteFailed', 'Failed to delete food.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('modals.editFood.title', 'Edit Food')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: Math.max(insets.bottom, 24) + 24 }}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('modals.addFood.foodName', 'Food Name')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.addFood.namePlaceholder', 'e.g. Scrambled Eggs')}
              value={form.name}
              onChangeText={(v) => handleChange('name', v)}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('modals.addFood.brand', 'Brand (Optional)')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('modals.addFood.brandPlaceholder', 'e.g. Happy Farms')}
              value={form.brand}
              onChangeText={(v) => handleChange('brand', v)}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('modals.addFood.servingSize', 'Serving Size')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100g"
              value={form.servingSize}
              onChangeText={(v) => handleChange('servingSize', v)}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('modals.addFood.nutritionInfo', 'Nutrition Info')}</Text>

          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <Text style={styles.macroEmoji}>🔥</Text>
              <Text style={styles.macroLabel}>{t('modals.addFood.calories', 'Calories')}</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                value={form.calories}
                onChangeText={(v) => handleChange('calories', v)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.macroUnit}>kcal</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroEmoji}>🍗</Text>
              <Text style={styles.macroLabel}>{t('modals.addFood.protein', 'Protein')}</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                value={form.protein}
                onChangeText={(v) => handleChange('protein', v)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroEmoji}>🍚</Text>
              <Text style={styles.macroLabel}>{t('modals.addFood.carbs', 'Carbs')}</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                value={form.totalCarbs}
                onChangeText={(v) => handleChange('totalCarbs', v)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroEmoji}>🥜</Text>
              <Text style={styles.macroLabel}>{t('modals.addFood.fat', 'Fat')}</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                value={form.totalFat}
                onChangeText={(v) => handleChange('totalFat', v)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <TouchableOpacity style={{ alignSelf: 'flex-start', marginTop: 16, marginBottom: 8 }} onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={{ color: themeColors.primary, fontWeight: '700', fontSize: 14 }}>
              {showAdvanced ? 'Hide Advanced Macros' : '+ Add Advanced Macros (Optional)'}
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={[styles.macroGrid, { marginTop: 8 }]}>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Sugar</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.sugar} onChangeText={(v) => handleChange('sugar', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Fiber</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.fiber} onChangeText={(v) => handleChange('fiber', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Saturated Fat</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.saturatedFat} onChangeText={(v) => handleChange('saturatedFat', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Trans Fat</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.transFat} onChangeText={(v) => handleChange('transFat', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Polyunsat. Fat</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.polyunsaturatedFat} onChangeText={(v) => handleChange('polyunsaturatedFat', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Monounsat. Fat</Text>
                <TextInput style={styles.macroInput} placeholder="0" value={form.monounsaturatedFat} onChangeText={(v) => handleChange('monounsaturatedFat', v)} keyboardType="decimal-pad" selectTextOnFocus placeholderTextColor="#94a3b8" />
                <Text style={styles.macroUnit}>g</Text>
              </View>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting || saving}>
              {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash" size={20} color="#ef4444" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving || deleting}
            >
              {saving ? (
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
  closeButton: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 12,
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
  primaryButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: c.textMuted,
    opacity: 0.7,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroCard: {
    width: '48%',
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  macroEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: 8,
  },
  macroInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: c.text,
    textAlign: 'center',
    width: '100%',
    marginVertical: 4,
  },
  macroUnit: {
    fontSize: 12,
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
  flexButton: {
    flex: 1,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
  },
});
