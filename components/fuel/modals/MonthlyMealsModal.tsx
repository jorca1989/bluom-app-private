import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface MonthlyMealsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users"> | undefined;
  nutritionPlan: any;
  currentDate: string; // "YYYY-MM-DD"
  isPro: boolean;
  onUpgradePress: () => void;
}

export default function MonthlyMealsModal({
  visible,
  onClose,
  userId,
  nutritionPlan,
  currentDate,
  isPro,
  onUpgradePress
}: MonthlyMealsModalProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [regeneratingMealHash, setRegeneratingMealHash] = useState<string | null>(null);

  const regenerateSpecificMeal = useAction(api.plans.regenerateSpecificMeal);
  const logFoodEntry = useMutation(api.food.logFoodEntry);
  // Optional: add to shopping list feature
  // const addShoppingItem = useMutation(api.shoppingList.addItems); // Example

  // Map database templates or fallback
  const isGeneric = !nutritionPlan;
  const mealTemplates = nutritionPlan?.mealTemplates || Array.from({ length: 30 }).map((_, i) => ({
    day: i + 1,
    meals: [
      { mealType: 'Breakfast', calories: 400, protein: 20, carbs: 50, fat: 15, suggestions: ['Oatmeal with berries', '1 Banana', 'Black Coffee'] },
      { mealType: 'Lunch', calories: 600, protein: 35, carbs: 60, fat: 20, suggestions: ['Grilled Chicken Salad', 'Vinaigrette', 'Whole Wheat Bread'] },
      { mealType: 'Dinner', calories: 700, protein: 40, carbs: 70, fat: 25, suggestions: ['Baked Salmon', 'Brown Rice', 'Steamed Broccoli'] },
      { mealType: 'Snack', calories: 200, protein: 10, carbs: 20, fat: 8, suggestions: ['Greek Yogurt', 'Handful of almonds'] },
    ]
  }));
  
  const activeDayTemplate = mealTemplates.find((d: any) => d.day === selectedDay) || mealTemplates[0];
  const activeMeals = activeDayTemplate?.meals || [];

  const handleRegenerate = async (mealIndex: number, mealType: string) => {
    if (!isPro) return onUpgradePress();
    if (!userId || !nutritionPlan?._id) return;
    
    setRegeneratingMealHash(`${selectedDay}-${mealIndex}`);
    try {
      await regenerateSpecificMeal({
        planId: nutritionPlan._id,
        userId: userId,
        dayIndex: selectedDay - 1,
        mealIndex: mealIndex,
        currentMealType: mealType,
      });
      // Convex will update the reactive query automatically!
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to regenerate meal.');
    } finally {
      setRegeneratingMealHash(null);
    }
  };

  const handleLogMeal = async (meal: any) => {
    if (!userId) return;
    try {
      await logFoodEntry({
        userId,
        foodName: `AI ${meal.mealType} Plan`,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        servingSize: '1 meal',
        mealType: meal.mealType.toLowerCase() as any,
        date: currentDate,
      });
      Alert.alert('Success', `Logged ${meal.mealType} to your daily fuel!`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to log meal.');
    }
  };

  const handleAddShoppingList = (meal: any) => {
    if (!isPro) return onUpgradePress();
    Alert.alert('Added', 'Ingredients added to Shopping List! (Concept)');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>30-Day Nutrition Plan</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!isPro && (
          <TouchableOpacity 
            style={{ backgroundColor: '#fffbeb', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: '#fde68a', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            onPress={onUpgradePress}
          >
            <Ionicons name="sparkles" size={16} color="#d97706" />
            <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '700' }}>
              Unlock unlimited AI personalized meals with Pro
            </Text>
          </TouchableOpacity>
        )}

        {mealTemplates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="restaurant-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No AI Plan Found.</Text>
            <Text style={styles.emptySub}>Visit your profile to generate your blueprint.</Text>
          </View>
        ) : (
          <>
            {/* Days Strip */}
            <View style={styles.daysStripWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysStripContent}>
                {Array.from({ length: 30 }).map((_, i) => {
                  const d = i + 1;
                  const isSelected = selectedDay === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                      onPress={() => setSelectedDay(d)}
                    >
                      <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Day {selectedDay} Meals</Text>
            </View>

            {/* Meal Cards */}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {activeMeals.map((meal: any, idx: number) => {
                const isRegenerating = regeneratingMealHash === `${selectedDay}-${idx}`;
                return (
                  <View key={idx} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealType}>{meal.mealType}</Text>
                      <Text style={styles.mealCals}>{meal.calories} kcal</Text>
                    </View>

                    <View style={styles.macrosRow}>
                      <Text style={styles.macroText}>Protein: <Text style={styles.macroValP}>{meal.protein}g</Text></Text>
                      <Text style={styles.macroText}>Carbs: <Text style={styles.macroValC}>{meal.carbs}g</Text></Text>
                      <Text style={styles.macroText}>Fat: <Text style={styles.macroValF}>{meal.fat}g</Text></Text>
                    </View>

                    {meal.suggestions?.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        <Text style={styles.suggsTitle}>Suggestions:</Text>
                        {meal.suggestions.map((s: string, sj: number) => (
                          <Text key={sj} style={styles.sugItem}>• {s}</Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.actionsBox}>
                      <TouchableOpacity 
                        style={styles.actionBtnLight}
                        onPress={() => handleRegenerate(idx, meal.mealType)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? <ActivityIndicator size="small" color="#eab308" /> : <Ionicons name="refresh" size={16} color="#eab308" />}
                        <Text style={[styles.actionBtnText, { color: '#eab308' }]}>Regenerate</Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {isPro && (
                          <TouchableOpacity style={styles.actionBtnSolidAlt} onPress={() => handleAddShoppingList(meal)}>
                            <Ionicons name="cart-outline" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtnSolid} onPress={() => handleLogMeal(meal)}>
                          <Text style={styles.actionBtnSolidText}>Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  daysStripWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  daysStripContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayCircleActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  dayNumActive: {
    color: '#ffffff',
  },
  dayHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  list: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  mealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  mealCals: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  macroText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  macroValP: { color: '#ef4444', fontWeight: '700' },
  macroValC: { color: '#3b82f6', fontWeight: '700' },
  macroValF: { color: '#eab308', fontWeight: '700' },
  suggestionsBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  suggsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sugItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  actionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtnLight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSolidAlt: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSolid: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSolidText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
