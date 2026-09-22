import React from 'react';
import { Dimensions, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

const FUEL_ACTION_WIDTH = (Dimensions.get('window').width - 100) / 4;

interface QuickActionsProps {
  onPhoto: () => void;
  onVoice: () => void;
  onSearch: () => void;
  onManual: () => void;
  onLibrary: () => void;
  onAiChef: () => void;
}

export const QuickActions = ({ onPhoto, onVoice, onSearch, onManual, onLibrary, onAiChef }: QuickActionsProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const actions = [
    { icon: 'camera', label: t('fuel.quickActions.photoLog', 'Photo Log'), color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', onPress: onPhoto },
    { icon: 'mic', label: t('fuel.quickActions.voiceLog', 'Voice Log'), color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)', onPress: onVoice },
    { icon: 'search', label: t('fuel.quickActions.search', 'Search'), color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', onPress: onSearch },
    { icon: 'create', label: t('fuel.quickActions.manual', 'Manual'), color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', onPress: onManual },
    { icon: 'book', label: t('profile.recipes', 'Recipes'), color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', onPress: onLibrary },
    { icon: 'sparkles', label: t('fuel.quickActions.aiChef', 'AI Chef'), color: '#ca8a04', bgColor: 'rgba(234, 179, 8, 0.15)', onPress: onAiChef },
  ];

  return (
    <View style={[styles.quickActionsCard, { backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
        {actions.map((action) => <ActionCard key={action.label} {...action} labelColor={colors.text} />)}
      </ScrollView>
    </View>
  );
};

interface UtilityCardsProps {
  onMyRecipes: () => void;
  onShoppingList: () => void;
  onMonthlyPlan: () => void;
  onNutritionInsights: () => void;
}

export const UtilityCards = ({ onMyRecipes, onShoppingList, onMonthlyPlan, onNutritionInsights }: UtilityCardsProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const utilities = [
    { icon: 'restaurant', label: t('fuel.quickActions.myRecipes', 'My Recipes'), color: '#2563eb', bgColor: 'rgba(37, 99, 235, 0.14)', onPress: onMyRecipes },
    { icon: 'cart', label: t('fuel.quickActions.shoppingList', 'Shopping List'), color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.14)', onPress: onShoppingList },
    { icon: 'calendar', label: t('fuel.quickActions.personalPlan', 'My Personalized Plan'), color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.14)', onPress: onMonthlyPlan },
    { icon: 'pie-chart', label: t('fuel.quickActions.nutritionInsights', 'Nutrition Insights'), color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.14)', onPress: onNutritionInsights },
  ];

  return (
    <View style={styles.utilityGrid} accessibilityLabel={t('fuel.utilities', 'Nutrition utilities')}>
      {utilities.map((utility) => <UtilButton key={utility.label} {...utility} textColor={colors.text} surfaceColor={colors.surfaceMuted} borderColor={colors.border} />)}
    </View>
  );
};

interface ActionCardProps {
  icon: any;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  labelColor: string;
}

const ActionCard = ({ icon, label, color, bgColor, onPress, labelColor }: ActionCardProps) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIconContainer, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.actionLabel, { color: labelColor }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.62}>{label}</Text>
  </TouchableOpacity>
);

interface UtilButtonProps {
  icon: any;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
}

const UtilButton = ({ icon, label, color, bgColor, onPress, textColor, surfaceColor, borderColor }: UtilButtonProps) => (
  <TouchableOpacity style={[styles.utilityButton, { backgroundColor: surfaceColor, borderColor }]} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.utilityIcon, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.utilityLabel, { color: textColor }]} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={0.62}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  quickActionsCard: {
    padding: 17,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  actionRow: { gap: 6 },
  utilityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  actionCard: {
    width: FUEL_ACTION_WIDTH,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
  },
  actionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    width: '100%',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  utilityButton: {
    width: '48.5%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  utilityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
