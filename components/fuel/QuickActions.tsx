import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionsProps {
  onPhoto: () => void;
  onVoice: () => void;
  onSearch: () => void;
  onManual: () => void;
}

export const QuickActions = ({ onPhoto, onVoice, onSearch, onManual }: QuickActionsProps) => {
  return (
    <View style={styles.gridContainer}>
      <ActionCard 
        icon="camera" 
        label="Photo Log" 
        color="#10b981" 
        bgColor="rgba(16, 185, 129, 0.15)" 
        onPress={onPhoto} 
      />
      <ActionCard 
        icon="mic" 
        label="Voice Log" 
        color="#a855f7" 
        bgColor="rgba(168, 85, 247, 0.15)" 
        onPress={onVoice} 
      />
      <ActionCard 
        icon="search" 
        label="Search" 
        color="#3b82f6" 
        bgColor="rgba(59, 130, 246, 0.15)" 
        onPress={onSearch} 
      />
      <ActionCard 
        icon="create" 
        label="Manual" 
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
  return (
    <View style={styles.utilGridContainer}>
      <UtilCard 
        icon="book" 
        label="Recipe Library" 
        desc="Guided recipes" 
        bgColor="#ff4b4b" 
        onPress={onLibrary} 
      />
      <UtilCard 
        icon="restaurant" 
        label="My Recipes" 
        desc="Create & save" 
        bgColor="#2563eb" 
        onPress={onMyRecipes} 
      />
      <UtilCard 
        icon="cart" 
        label="Shopping List" 
        desc="Plan your week" 
        bgColor="#8b5cf6" 
        onPress={onShoppingList} 
      />
      <UtilCard 
        icon="sparkles" 
        label="AI Chef" 
        desc="Scan & create" 
        bgColor="#eab308" 
        onPress={onAiChef} 
      />
      <UtilCard 
        icon="calendar" 
        label="My Personalized Plan" 
        desc="30-Day AI routine" 
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
      <Text style={styles.utilLabel}>{label}</Text>
      <Text style={styles.utilDesc}>{desc}</Text>
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
    gap: 12,
    padding: 12,
    borderRadius: 24,
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
  },
  utilLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  utilDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
