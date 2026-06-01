import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

interface DetailedInsightsModalProps {
  visible: boolean;
  onClose: () => void;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    polyunsaturatedFat: number;
    monounsaturatedFat: number;
    transFat: number;
  };
}

export default function DetailedInsightsModal({ visible, onClose, totals }: DetailedInsightsModalProps) {
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();

  const renderRow = (label: string, value: number, unit: string = 'g', isIndented = false) => (
    <View style={[styles.row, isIndented && styles.indentedRow, { borderBottomColor: themeColors.border }]}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      <Text style={[styles.value, { color: themeColors.text }]}>
        {Math.round(value)} {unit}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('fuel.detailedInsights.title', 'Detailed Nutrition')}
          </Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: themeColors.surfaceMuted }]}>
            <Ionicons name="close" size={24} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            {renderRow(t('fuel.detailedInsights.calories', 'Calories'), totals.calories, 'kcal')}
            {renderRow(t('fuel.detailedInsights.protein', 'Total Protein'), totals.protein)}
            
            {renderRow(t('fuel.detailedInsights.carbs', 'Total Carbohydrate'), totals.carbs)}
            {renderRow(t('fuel.detailedInsights.fiber', 'Dietary Fiber'), totals.fiber, 'g', true)}
            {renderRow(t('fuel.detailedInsights.sugar', 'Total Sugars'), totals.sugar, 'g', true)}

            {renderRow(t('fuel.detailedInsights.fat', 'Total Fat'), totals.fat)}
            {renderRow(t('fuel.detailedInsights.saturatedFat', 'Saturated Fat'), totals.saturatedFat, 'g', true)}
            {renderRow(t('fuel.detailedInsights.polyunsaturatedFat', 'Polyunsaturated Fat'), totals.polyunsaturatedFat, 'g', true)}
            {renderRow(t('fuel.detailedInsights.monounsaturatedFat', 'Monounsaturated Fat'), totals.monounsaturatedFat, 'g', true)}
            {renderRow(t('fuel.detailedInsights.transFat', 'Trans Fat'), totals.transFat, 'g', true)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indentedRow: {
    paddingLeft: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
});
