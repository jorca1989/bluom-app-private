/**
 * Macro calculation and formatting utilities
 */

/**
 * Calculate percentage of macro consumed vs target
 */
export function calculateMacroPercentage(
  consumed: number,
  target: number
): number {
  if (target === 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 100);
}

/**
 * Calculate remaining macros
 */
export function calculateRemaining(consumed: number, target: number): number {
  return Math.max(0, target - consumed);
}

/**
 * Get color for macro progress (based on percentage)
 */
export function getMacroProgressColor(percentage: number): string {
  if (percentage < 70) return "#ef4444"; // Red - Under
  if (percentage >= 70 && percentage <= 110) return "#16a34a"; // Green - Good
  return "#f59e0b"; // Yellow - Over
}

/**
 * Format macro value with unit (g for grams, kcal for calories)
 */
export function formatMacro(value: number, type: "macro" | "calorie"): string {
  const rounded = Math.round(value);
  return type === "calorie" ? `${rounded} kcal` : `${rounded}g`;
}

/**
 * Calculate calories from macros (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
 */
export function calculateCaloriesFromMacros(
  protein: number,
  carbs: number,
  fat: number
): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/**
 * Get macro split percentages
 */
export function getMacroSplitPercentages(
  protein: number,
  carbs: number,
  fat: number
): { protein: number; carbs: number; fat: number } {
  const totalCalories = calculateCaloriesFromMacros(protein, carbs, fat);

  if (totalCalories === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round(((protein * 4) / totalCalories) * 100),
    carbs: Math.round(((carbs * 4) / totalCalories) * 100),
    fat: Math.round(((fat * 9) / totalCalories) * 100),
  };
}
