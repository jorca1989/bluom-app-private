import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface QuickActionsProps {
  onPhoto: () => void;
  onVoice: () => void;
  onSearch: () => void;
  onManual: () => void;
}

export const QuickActions = ({ onPhoto, onVoice, onSearch, onManual }: QuickActionsProps) => {
  const { t } = useTranslation();
  return (
    <View style={styles.gridContainer}>
      <ActionCard 
        icon="camera" 
        label={t('fuel.quickActions.photoLog', 'Photo Log')} 
        color="#10b981" 
        bgColor="rgba(16, 185, 129, 0.15)" 
        onPress={onPhoto} 
      />
      <ActionCard 
        icon="mic" 
        label={t('fuel.quickActions.voiceLog', 'Voice Log')} 
        color="#a855f7" 
        bgColor="rgba(168, 85, 247, 0.15)" 
        onPress={onVoice} 
      />
      <ActionCard 
        icon="search" 
        label={t('fuel.quickActions.search', 'Search')} 
        color="#3b82f6" 
        bgColor="rgba(59, 130, 246, 0.15)" 
        onPress={onSearch} 
      />
      <ActionCard 
        icon="create" 
        label={t('fuel.quickActions.manual', 'Manual')} 
        color="#eab308" 
        bgColor="rgba(234, 179, 8, 0.15)" 
        onPress={onManual} 
      />
    </View>
  );
};

interface UtilityCardsProps {
  onLibrary: () => void;
  onMyRecipes: () => void;
  onShoppingList: () => void;
  onAiChef: () => void;
  onMonthlyPlan: () => void;
}

export const UtilityCards = ({ onLibrary, onMyRecipes, onShoppingList, onAiChef, onMonthlyPlan }: UtilityCardsProps) => {
  const { t } = useTranslation();
  return (
    <View style={styles.utilGridContainer}>
      <UtilCard 
        icon="book" 
        label={t('fuel.quickActions.recipeLib', 'Recipe Library')} 
        desc={t('fuel.quickActions.recipeLibDesc', 'Guided recipes')} 
        bgColor="#ff4b4b" 
        onPress={onLibrary} 
      />
      <UtilCard 
        icon="restaurant" 
        label={t('fuel.quickActions.myRecipes', 'My Recipes')} 
        desc={t('fuel.quickActions.myRecipesDesc', 'Create & save')} 
        bgColor="#2563eb" 
        onPress={onMyRecipes} 
      />
      <UtilCard 
        icon="cart" 
        label={t('fuel.quickActions.shoppingList', 'Shopping List')} 
        desc={t('fuel.quickActions.shoppingListDesc', 'Plan your week')} 
        bgColor="#8b5cf6" 
        onPress={onShoppingList} 
      />
      <UtilCard 
        icon="sparkles" 
        label={t('fuel.quickActions.aiChef', 'AI Chef')} 
        desc={t('fuel.quickActions.aiChefDesc', 'Scan & create')} 
        bgColor="#eab308" 
        onPress={onAiChef} 
      />
      <UtilCard 
        icon="calendar" 
        label={t('fuel.quickActions.personalPlan', 'My Personalized Plan')} 
        desc={t('fuel.quickActions.personalPlanDesc', '30-Day AI routine')} 
        bgColor="#10b981" 
        onPress={onMonthlyPlan} 
        fullWidth
      />
    </View>
  );
};

interface ActionCardProps {
  icon: any;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

const ActionCard = ({ icon, label, color, bgColor, onPress }: ActionCardProps) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIconContainer, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

interface UtilCardProps {
  icon: any;
  label: string;
  desc: string;
  bgColor: string;
  onPress: () => void;
  fullWidth?: boolean;
}

const UtilCard = ({ icon, label, desc, bgColor, onPress, fullWidth }: UtilCardProps) => (
  <TouchableOpacity style={[styles.utilCard, { backgroundColor: bgColor }, fullWidth && { width: '100%' }]} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.utilIconContainer}>
      <Ionicons name={icon} size={20} color="#ffffff" />
    </View>
    <View style={styles.utilTextContainer}>
      <Text style={styles.utilLabel} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7} ellipsizeMode="tail">{label}</Text>
      <Text style={styles.utilDesc} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7} ellipsizeMode="tail">{desc}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  utilGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  utilCard: {
    width: '48%', // roughly half
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  utilIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  utilLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  utilDesc: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
