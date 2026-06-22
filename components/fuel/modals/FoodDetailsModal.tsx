import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';
import { getFlagEmoji } from './FoodSearchModal';

interface FoodDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  item: any | null; // Can be a customFood or recipe
  itemType: 'food' | 'recipe' | null;
  onLog: (item: any) => void;
  hideLogButton?: boolean;
}

export default function FoodDetailsModal({ visible, onClose, item, itemType, onLog, hideLogButton = false }: FoodDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const currentLang = i18n.language || 'en';

  const [localItem, setLocalItem] = useState<any | null>(null);
  const [localItemType, setLocalItemType] = useState<'food' | 'recipe' | null>(null);

  useEffect(() => {
    if (item) {
      setLocalItem(item);
      setLocalItemType(itemType);
    }
  }, [item, itemType]);

  const activeItem = item || localItem;
  const activeItemType = item ? itemType : localItemType;

  const getLocalizedName = (nameField: any) => {
    if (typeof nameField !== 'object' || nameField === null) return nameField || 'Food';
    return nameField[currentLang] || nameField.en || Object.values(nameField)[0] || 'Food';
  };

  const name = activeItem ? (activeItemType === 'recipe' ? activeItem.name || activeItem.title : getLocalizedName(activeItem.name)) : '';
  const brand = activeItem?.brand ? `${activeItem.brand} • ` : '';
  const servingSize = activeItem ? (activeItemType === 'recipe' ? `1 Serving` : (activeItem.servingSize || '100g')) : '';
  
  const macros = activeItem ? (activeItemType === 'recipe' ? (activeItem.nutrition?.perServing || activeItem.nutrition) : (activeItem.macros || activeItem)) : null;
  
  // Safe parsing
  const cal = Math.round(macros?.calories ?? 0);
  const p = Math.round(macros?.protein ?? 0);
  const c = Math.round(macros?.carbs ?? 0);
  const f = Math.round(macros?.fat ?? 0);

  // Carb sub-nutrients
  const fiber = macros?.fiber;
  const sugar = macros?.sugar;
  const addedSugar = macros?.addedSugar;
  
  // Fat sub-nutrients
  const satFat = macros?.saturatedFat;
  const polyFat = macros?.polyunsaturatedFat;
  const monoFat = macros?.monounsaturatedFat;
  const transFat = macros?.transFat;
  
  // Micro-nutrients & Minerals
  const sodium = macros?.sodium;
  const potassium = macros?.potassium;
  const iron = macros?.iron;
  const calcium = macros?.calcium;
  const magnesium = macros?.magnesium;
  const zinc = macros?.zinc;
  const vitaminA = macros?.vitaminA;
  const vitaminC = macros?.vitaminC;
  
  const imageUrl = activeItem ? (activeItem.thumbnail || activeItem.image || activeItem.featuredImage || activeItem.imageUrl || null) : null;

  const renderNutrientRow = (label: string, val: number | undefined, color: string, isSubItem = false, unit = 'g') => {
    if (val === undefined || val === null) return null;
    return (
      <View style={[styles.macroRow, isSubItem && styles.subMacroRow]}>
        <View style={styles.macroLabelWrap}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={[styles.macroLabelText, isSubItem && styles.subMacroLabelText]}>{label}</Text>
        </View>
        <Text style={[styles.macroValText, isSubItem && styles.subMacroValText]}>{Math.round(val)}{unit}</Text>
      </View>
    );
  };

  const hasFatBreakdown = satFat !== undefined || polyFat !== undefined || monoFat !== undefined || transFat !== undefined;
  const hasCarbBreakdown = fiber !== undefined || sugar !== undefined || addedSugar !== undefined;
  const hasMinerals = sodium !== undefined || potassium !== undefined || iron !== undefined || calcium !== undefined || magnesium !== undefined || zinc !== undefined || vitaminA !== undefined || vitaminC !== undefined;  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {activeItem ? (
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>Food Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Main Info */}
            <View style={styles.infoCard}>
               {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
               ) : (
                  <View style={styles.iconPlaceholder}>
                     <Ionicons name={activeItemType === 'recipe' ? "restaurant" : "nutrition"} size={40} color="#3b82f6" />
                  </View>
               )}
               
               <View style={styles.titleSection}>
                  <Text style={styles.foodName}>{name}</Text>
                  <Text style={styles.foodSub}>{brand}{servingSize}</Text>
                  
                  <View style={styles.badgesRow}>
                     {activeItem.countryCode ? (
                        <View style={[styles.badge, { borderColor: '#3b82f6', backgroundColor: '#eff6ff' }]}>
                           <Text style={[styles.badgeText, { color: '#2563eb' }]}>
                              {getFlagEmoji(activeItem.countryCode)} {activeItem.countryCode.toUpperCase()}
                           </Text>
                        </View>
                     ) : activeItemType === 'recipe' ? (
                        <View style={[styles.badge, { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' }]}>
                           <Text style={[styles.badgeText, { color: '#7c3aed' }]}>Recipe</Text>
                        </View>
                     ) : !activeItem.isVerified ? (
                        <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                           <Text style={[styles.badgeText, { color: '#059669' }]}>Saved</Text>
                        </View>
                     ) : (
                        <View style={styles.badge}>
                           <Text style={styles.badgeText}>🌐 Global</Text>
                        </View>
                     )}
                  </View>
               </View>
            </View>

            {/* Calorie & Top-Level Macros */}
            <View style={styles.caloriesCard}>
               <Text style={styles.calText}>{cal}</Text>
               <Text style={styles.calLabel}>Calories</Text>
            </View>

            {/* ─── FAT BREAKDOWN SUITE ─────────────────────── */}
            <View style={styles.breakdownCard}>
               <View style={styles.sectionHeader}>
                  <Ionicons name="water" size={18} color="#fde047" />
                  <Text style={styles.breakdownTitle}>Fat Breakdown</Text>
               </View>
               <Text style={styles.sectionDesc}>Cardiovascular profiling & hormone synthesis</Text>
               
               {renderNutrientRow('Total Fat', f, '#fde047')}
               {renderNutrientRow('Saturated Fat', satFat, '#fef08a', true)}
               {renderNutrientRow('Trans Fat', transFat, '#fef08a', true)}
               {renderNutrientRow('Monounsaturated Fat', monoFat, '#fef08a', true)}
               {renderNutrientRow('Polyunsaturated Fat', polyFat, '#fef08a', true)}
            </View>

            {/* ─── CARBOHYDRATE & BLOOD SUGAR SUITE ────────── */}
            <View style={styles.breakdownCard}>
               <View style={styles.sectionHeader}>
                  <Ionicons name="flash" size={18} color="#93c5fd" />
                  <Text style={styles.breakdownTitle}>Carbs & Blood Sugar</Text>
               </View>
               <Text style={styles.sectionDesc}>Sugar control & fasting intelligence</Text>
               
               {renderNutrientRow('Total Carbohydrates', c, '#93c5fd')}
               {renderNutrientRow('Dietary Fiber', fiber, '#bfdbfe', true)}
               {renderNutrientRow('Sugars', sugar, '#bfdbfe', true)}
               {renderNutrientRow('Added Sugar', addedSugar, '#bfdbfe', true)}
            </View>

            {/* ─── PROTEIN ─────────────────────────────────── */}
            <View style={styles.breakdownCard}>
               <View style={styles.sectionHeader}>
                  <Ionicons name="fitness" size={18} color="#fca5a5" />
                  <Text style={styles.breakdownTitle}>Protein</Text>
               </View>
               {renderNutrientRow('Total Protein', p, '#fca5a5')}
            </View>

            {/* ─── MICRO-NUTRIENT & MINERAL SUITE ──────────── */}
            <View style={styles.breakdownCard}>
               <View style={styles.sectionHeader}>
                  <Ionicons name="leaf" size={18} color="#a78bfa" />
                  <Text style={styles.breakdownTitle}>Vitamins & Minerals</Text>
               </View>
               <Text style={styles.sectionDesc}>The Vitality Matrix — biological evidence for your health hubs</Text>
               
               {renderNutrientRow('Sodium', sodium, '#f97316', false, 'mg')}
               {renderNutrientRow('Potassium', potassium, '#22c55e', false, 'mg')}
               {renderNutrientRow('Iron', iron, '#ef4444', false, 'mg')}
               {renderNutrientRow('Calcium', calcium, '#06b6d4', false, 'mg')}
               {renderNutrientRow('Magnesium', magnesium, '#8b5cf6', false, 'mg')}
               {renderNutrientRow('Zinc', zinc, '#ec4899', false, 'mg')}
               {renderNutrientRow('Vitamin A', vitaminA, '#f59e0b', false, 'mcg')}
               {renderNutrientRow('Vitamin C', vitaminC, '#10b981', false, 'mg')}
               
               {!hasMinerals && (
                  <Text style={styles.noDataText}>No micronutrient data available for this food.</Text>
               )}
            </View>

          </ScrollView>

          {!hideLogButton && (
            <View style={styles.footer}>
               <TouchableOpacity 
                  style={styles.addBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                     onClose();
                     setTimeout(() => {
                        onLog(activeItem);
                     }, 400);
                  }}
               >
                  <Ionicons name="add-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.addBtnText}>Add to Diary</Text>
               </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginRight: 16,
  },
  iconPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
  },
  foodName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  foodSub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  caloriesCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0f172a',
  },
  calLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  breakdownTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
    fontWeight: '500',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  subMacroRow: {
    paddingLeft: 24,
    paddingVertical: 6,
  },
  macroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  macroLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  subMacroLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  macroValText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subMacroValText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  noDataText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
