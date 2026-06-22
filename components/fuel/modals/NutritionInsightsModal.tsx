import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';

interface NutritionInsightsModalProps {
  visible: boolean;
  onClose: () => void;
  dateEntries: any[];
}

export default function NutritionInsightsModal({ visible, onClose, dateEntries }: NutritionInsightsModalProps) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const totals = useMemo(() => dateEntries.reduce(
    (acc, e) => {
      acc.calories += e.calories || 0;
      acc.p += e.protein || 0;
      acc.c += e.carbs || 0;
      acc.f += e.fat || 0;
      acc.fiber += e.fiber || 0;
      acc.sugar += e.sugar || 0;
      acc.addedSugar += e.addedSugar || 0;
      acc.satFat += e.saturatedFat || 0;
      acc.polyFat += e.polyunsaturatedFat || 0;
      acc.monoFat += e.monounsaturatedFat || 0;
      acc.transFat += e.transFat || 0;
      acc.sodium += e.sodium || 0;
      acc.potassium += e.potassium || 0;
      acc.iron += e.iron || 0;
      acc.calcium += e.calcium || 0;
      acc.magnesium += e.magnesium || 0;
      acc.zinc += e.zinc || 0;
      acc.vitaminA += e.vitaminA || 0;
      acc.vitaminC += e.vitaminC || 0;
      return acc;
    },
    { calories: 0, p: 0, c: 0, f: 0, fiber: 0, sugar: 0, addedSugar: 0, satFat: 0, polyFat: 0, monoFat: 0, transFat: 0, sodium: 0, potassium: 0, iron: 0, calcium: 0, magnesium: 0, zinc: 0, vitaminA: 0, vitaminC: 0 }
  ), [dateEntries]);

  const renderRow = (label: string, val: number, color: string, isSubItem = false, unit = 'g') => {
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

  const foodCount = dateEntries.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('fuel.insights.title', 'Nutrition Insights')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Summary bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{Math.round(totals.calories)}</Text>
              <Text style={styles.summaryLabel}>kcal</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{foodCount}</Text>
              <Text style={styles.summaryLabel}>foods</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: '#fca5a5' }]}>{Math.round(totals.p)}g</Text>
              <Text style={styles.summaryLabel}>protein</Text>
            </View>
          </View>

          {foodCount === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="nutrition-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No foods logged today</Text>
              <Text style={styles.emptySubtitle}>Log meals to see your detailed nutrition insights here.</Text>
            </View>
          )}

          {foodCount > 0 && (
            <>
              {/* ─── FAT BREAKDOWN SUITE ─────────────────── */}
              <View style={styles.breakdownCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="water" size={18} color="#fde047" />
                  <Text style={styles.sectionTitle}>Fat Breakdown</Text>
                </View>
                <Text style={styles.sectionDesc}>Cardiovascular profiling & hormone synthesis</Text>
                
                {renderRow('Total Fat', totals.f, '#fde047')}
                {renderRow('Saturated Fat', totals.satFat, '#fef08a', true)}
                {renderRow('Trans Fat', totals.transFat, '#fef08a', true)}
                {renderRow('Monounsaturated Fat', totals.monoFat, '#fef08a', true)}
                {renderRow('Polyunsaturated Fat', totals.polyFat, '#fef08a', true)}
              </View>

              {/* ─── CARBOHYDRATE & BLOOD SUGAR SUITE ────── */}
              <View style={styles.breakdownCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flash" size={18} color="#93c5fd" />
                  <Text style={styles.sectionTitle}>Carbs & Blood Sugar</Text>
                </View>
                <Text style={styles.sectionDesc}>Sugar control & fasting intelligence</Text>
                
                {renderRow('Total Carbohydrates', totals.c, '#93c5fd')}
                {renderRow('Dietary Fiber', totals.fiber, '#bfdbfe', true)}
                {renderRow('Sugars', totals.sugar, '#bfdbfe', true)}
                {renderRow('Added Sugar', totals.addedSugar, '#bfdbfe', true)}
              </View>

              {/* ─── PROTEIN ──────────────────────────────── */}
              <View style={styles.breakdownCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="fitness" size={18} color="#fca5a5" />
                  <Text style={styles.sectionTitle}>Protein</Text>
                </View>
                {renderRow('Total Protein', totals.p, '#fca5a5')}
              </View>

              {/* ─── MICRO-NUTRIENT & MINERAL SUITE ─────── */}
              <View style={styles.breakdownCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="leaf" size={18} color="#a78bfa" />
                  <Text style={styles.sectionTitle}>Vitamins & Minerals</Text>
                </View>
                <Text style={styles.sectionDesc}>The Vitality Matrix — biological evidence for your health hubs</Text>
                
                {renderRow('Sodium', totals.sodium, '#f97316', false, 'mg')}
                {renderRow('Potassium', totals.potassium, '#22c55e', false, 'mg')}
                {renderRow('Iron', totals.iron, '#ef4444', false, 'mg')}
                {renderRow('Calcium', totals.calcium, '#06b6d4', false, 'mg')}
                {renderRow('Magnesium', totals.magnesium, '#8b5cf6', false, 'mg')}
                {renderRow('Zinc', totals.zinc, '#ec4899', false, 'mg')}
                {renderRow('Vitamin A', totals.vitaminA, '#f59e0b', false, 'mcg')}
                {renderRow('Vitamin C', totals.vitaminC, '#10b981', false, 'mg')}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748b',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  sectionTitle: {
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
});
