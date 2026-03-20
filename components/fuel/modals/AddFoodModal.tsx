import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
}

export default function AddFoodModal({ visible, onClose, userId }: AddFoodModalProps) {
  const createFood = useMutation(api.foodCatalog.createFood);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    servingSize: '100g',
    calories: '',
    totalCarbs: '',
    totalFat: '',
    protein: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    if (!form.name || !form.calories || !form.totalFat || !form.totalCarbs || !form.protein) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createFood({
        userId,
        name: form.name,
        brand: form.brand || undefined,
        servingSize: form.servingSize,
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.totalCarbs) || 0,
        fat: parseFloat(form.totalFat) || 0,
      });

      Alert.alert('Success', 'Food/ingredient added!');
      handleClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setForm({ name: '', brand: '', servingSize: '100g', calories: '', totalCarbs: '', totalFat: '', protein: '' });
      setError('');
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Custom Food</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>

              <Text style={styles.stepTitle}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Food Name <Text style={styles.required}>*</Text></Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Scrambled Eggs" 
                  value={form.name} 
                  onChangeText={(v) => handleChange('name', v)} 
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand (Optional)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Happy Farms" 
                  value={form.brand} 
                  onChangeText={(v) => handleChange('brand', v)} 
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Serving Size</Text>
                <View style={styles.servingSelector}>
                  {['100g', '100ml', '1cup', '1piece'].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.servingOption, form.servingSize === size && styles.servingOptionActive]}
                      onPress={() => handleChange('servingSize', size)}
                    >
                      <Text style={[styles.servingOptionText, form.servingSize === size && styles.servingOptionTextActive]}>
                        per {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, !form.name && styles.buttonDisabled]} 
                onPress={() => setStep(2)} 
                disabled={!form.name}
              >
                <Text style={styles.primaryButtonText}>Next: Nutrition</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={[styles.stepLine, styles.stepLineActive]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>

              <Text style={styles.stepTitle}>Nutrition Info</Text>
              <Text style={styles.stepSubtitle}>Enter values for {form.servingSize}</Text>

              <View style={styles.macroGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroEmoji}>🔥</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <TextInput 
                    style={styles.macroInput} 
                    placeholder="0" 
                    value={form.calories} 
                    onChangeText={(v) => handleChange('calories', v)} 
                    keyboardType="numeric" 
                    selectTextOnFocus 
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.macroUnit}>kcal</Text>
                </View>

                <View style={styles.macroCard}>
                   <Text style={styles.macroEmoji}>🍗</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <TextInput 
                    style={styles.macroInput} 
                    placeholder="0" 
                    value={form.protein} 
                    onChangeText={(v) => handleChange('protein', v)} 
                    keyboardType="numeric" 
                    selectTextOnFocus 
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>

                <View style={styles.macroCard}>
                   <Text style={styles.macroEmoji}>🍚</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <TextInput 
                    style={styles.macroInput} 
                    placeholder="0" 
                    value={form.totalCarbs} 
                    onChangeText={(v) => handleChange('totalCarbs', v)} 
                    keyboardType="numeric" 
                    selectTextOnFocus 
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>

                <View style={styles.macroCard}>
                   <Text style={styles.macroEmoji}>🥜</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <TextInput 
                    style={styles.macroInput} 
                    placeholder="0" 
                    value={form.totalFat} 
                    onChangeText={(v) => handleChange('totalFat', v)} 
                    keyboardType="numeric" 
                    selectTextOnFocus 
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.flexButton, (!form.calories || !form.totalFat || !form.totalCarbs || !form.protein) && styles.buttonDisabled]}
                  onPress={() => setStep(3)}
                  disabled={!form.calories || !form.totalFat || !form.totalCarbs || !form.protein}
                >
                  <Text style={styles.primaryButtonText}>Next: Review</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
               <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={[styles.stepLine, styles.stepLineActive]} />
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={[styles.stepLine, styles.stepLineActive]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>

              <Text style={styles.stepTitle}>Review & Save</Text>
              
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{form.name}</Text>
                  {form.brand ? <Text style={styles.reviewBrand}>by {form.brand}</Text> : null}
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>{form.servingSize}</Text>
                  </View>
                </View>

                <View style={styles.reviewMacros}>
                  <View style={styles.reviewMacroItem}>
                    <Text style={styles.reviewMacroValue}>{form.calories}</Text>
                    <Text style={styles.reviewMacroLabel}>kcal</Text>
                  </View>
                  <View style={styles.reviewMacroDivider} />
                  <View style={styles.reviewMacroItem}>
                    <Text style={styles.reviewMacroValue}>{form.protein}g</Text>
                    <Text style={styles.reviewMacroLabel}>Protein</Text>
                  </View>
                  <View style={styles.reviewMacroDivider} />
                  <View style={styles.reviewMacroItem}>
                    <Text style={styles.reviewMacroValue}>{form.totalCarbs}g</Text>
                    <Text style={styles.reviewMacroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.reviewMacroDivider} />
                  <View style={styles.reviewMacroItem}>
                    <Text style={styles.reviewMacroValue}>{form.totalFat}g</Text>
                    <Text style={styles.reviewMacroLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, styles.flexButton, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Food'}</Text>
                  {saving ? null : <Ionicons name="checkmark" size={18} color="#ffffff" />}
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
  closeButton: {
    padding: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  stepDotActive: {
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  stepDotCompleted: {
    backgroundColor: '#3b82f6',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#3b82f6',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: -16,
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
  servingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servingOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  servingOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  servingOptionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  servingOptionTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#64748b',
    marginBottom: 8,
  },
  macroInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    width: '100%',
    marginVertical: 4,
  },
  macroUnit: {
    fontSize: 12,
    color: '#94a3b8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  flexButton: {
    flex: 1,
    marginTop: 0,
  },
  reviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  reviewHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  reviewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewBrand: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  reviewBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reviewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  reviewMacros: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewMacroItem: {
    alignItems: 'center',
    flex: 1,
  },
  reviewMacroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewMacroLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  reviewMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
});
