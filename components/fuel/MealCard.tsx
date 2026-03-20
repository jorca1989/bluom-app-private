import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FoodItem {
  id: string; // Convex _id
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealCardProps {
  title: string;
  icon: any;
  time?: string;
  foods: FoodItem[];
  onAddPress: () => void;
  onDeletePress: (id: string) => void;
}

const MealCard = ({ title, icon, time, foods, onAddPress, onDeletePress }: MealCardProps) => {
  const totals = foods.reduce(
    (acc, f) => ({
      cal: acc.cal + f.cal,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const macroTotal = totals.protein + totals.carbs + totals.fat || 1;
  const proteinPct = (totals.protein / macroTotal) * 100;
  const carbsPct = (totals.carbs / macroTotal) * 100;
  const fatPct = (totals.fat / macroTotal) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={icon} size={24} color="#3b82f6" />
          <View>
            <Text style={styles.title}>{title}</Text>
            {time && <Text style={styles.time}>{time}</Text>}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.calTotal}>{Math.round(totals.cal)} kcal</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Ionicons name="add" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      {foods.length > 0 && (
        <View style={styles.foodsList}>
          {foods.map((food, i) => (
            <View key={food.id || i} style={styles.foodRow}>
              <Text style={styles.foodName}>{food.name}</Text>
              <View style={styles.foodRight}>
                <Text style={styles.foodCal}>{Math.round(food.cal)} kcal</Text>
                <TouchableOpacity onPress={() => onDeletePress(food.id)} style={styles.deleteBtn}>
                   <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {foods.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.macroBar}>
            <View style={[styles.macroSegment, { backgroundColor: '#fca5a5', width: `${proteinPct}%` }]} />
            <View style={[styles.macroSegment, { backgroundColor: '#93c5fd', width: `${carbsPct}%` }]} />
            <View style={[styles.macroSegment, { backgroundColor: '#fde047', width: `${fatPct}%` }]} />
          </View>
          <Text style={styles.macroText}>
            P:{Math.round(totals.protein)}g C:{Math.round(totals.carbs)}g F:{Math.round(totals.fat)}g
          </Text>
        </View>
      )}

      {foods.length === 0 && (
        <Text style={styles.emptyText}>Tap + to log a meal</Text>
      )}
    </View>
  );
};

export default MealCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  time: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // #10b981 at 10%
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodsList: {
    marginTop: 12,
    gap: 6,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 36,
  },
  foodName: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  foodRight: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
  },
  foodCal: {
    fontSize: 14,
    color: '#64748b',
  },
  deleteBtn: {
     padding: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
    paddingLeft: 36,
  },
  macroBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  macroSegment: {
    height: '100%',
  },
  macroText: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
});
