/**
 * nutritionMath.ts
 *
 * Client-side utility for instant calorie/macro calculations.
 * Implements Mifflin-St Jeor Equation.
 *
 * IMPORTANT: This file intentionally lives outside `app/` so Expo Router
 * doesn't treat it as a route.
 */

// Types matching the Onboarding/Convex types
export type UserBiometrics = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goal: 'lose_weight' | 'build_muscle' | 'maintain' | 'improve_health' | 'improve_endurance' | 'general_health';
  approach?: 'balanced' | 'high_protein' | 'low_carb' | 'plant_based' | 'flexible';
};

export type NutritionResult = {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// 1. Calculate BMR (Mifflin-St Jeor)
export function calculateBMR(data: UserBiometrics): number {
  const s = data.sex === 'male' ? 5 : -161;
  return 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age + s;
}

// 2. TDEE Multipliers
const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

// 3. Goal Adjustments
const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -500,
  build_muscle: 300,
  maintain: 0,
  improve_health: 0,
  improve_endurance: 0,
  general_health: 0,
};

// 4. Main Calculation Function
export function calculateNutritionTargets(data: UserBiometrics): NutritionResult {
  const bmr = calculateBMR(data);
  const activityFactor = ACTIVITY_FACTORS[data.activityLevel] || 1.55;
  const tdee = Math.round(bmr * activityFactor);

  const goalAdj = GOAL_ADJUSTMENTS[data.goal] || 0;
  const dailyCalories = Math.max(1200, tdee + goalAdj); // Safety floor

  // Macro Split Logic
  let proteinGrams: number;
  let fatGrams: number;

  // Protein (per kg)
  if (data.goal === 'build_muscle') {
    proteinGrams = data.weightKg * 2.2;
  } else if (data.goal === 'lose_weight') {
    proteinGrams = data.weightKg * 2.0;
  } else {
    proteinGrams = data.weightKg * 1.6;
  }

  // Adjust for High Protein preference
  if (data.approach === 'high_protein') {
    proteinGrams = Math.max(proteinGrams, data.weightKg * 2.5);
  }

  // Fat (25-35% of cal)
  let fatPct = 0.3;
  if (data.approach === 'low_carb') fatPct = 0.4;

  fatGrams = (dailyCalories * fatPct) / 9;

  // Carbs (Remainder)
  const proteinCal = proteinGrams * 4;
  const fatCal = fatGrams * 9;
  const remainingCal = dailyCalories - proteinCal - fatCal;
  const carbsGrams = Math.max(50, remainingCal / 4); // Safety floor

  return {
    bmr: Math.round(bmr),
    tdee,
    dailyCalories: Math.round(dailyCalories),
    protein: Math.round(proteinGrams),
    carbs: Math.round(carbsGrams),
    fat: Math.round(fatGrams),
  };
}

