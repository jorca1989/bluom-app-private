/**
 * Exercise-related utility functions
 */

import { ExerciseType } from "@/types";

/**
 * Common MET values for exercises
 * MET = Metabolic Equivalent of Task
 * 1 MET = energy expenditure at rest
 */
export const MET_VALUES: Record<string, number> = {
  // Cardio
  walking_slow: 3.0,
  walking_moderate: 3.5,
  walking_brisk: 4.5,
  jogging: 7.0,
  running_6mph: 9.8,
  running_8mph: 11.8,
  cycling_light: 5.8,
  cycling_moderate: 8.0,
  cycling_vigorous: 10.0,
  swimming_light: 5.8,
  swimming_moderate: 9.8,
  rowing_moderate: 7.0,

  // Strength Training
  weight_lifting_light: 3.5,
  weight_lifting_vigorous: 6.0,
  bodyweight_exercises: 3.8,
  circuit_training: 8.0,

  // HIIT
  hiit_light: 8.0,
  hiit_moderate: 10.0,
  hiit_intense: 12.0,
  burpees: 8.0,
  jump_rope: 12.3,

  // Yoga & Recovery
  yoga_hatha: 2.5,
  yoga_vinyasa: 4.0,
  yoga_power: 5.0,
  pilates: 3.0,
  stretching: 2.3,
};

/**
 * Calculate calories burned using MET formula
 * Formula: Calories = MET × weight_kg × duration_hours
 */
export function calculateCaloriesBurned(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  const durationHours = durationMinutes / 60;
  return Math.round(met * weightKg * durationHours);
}

/**
 * Get suggested MET value based on exercise name
 */
export function getSuggestedMET(exerciseName: string): number {
  const name = exerciseName.toLowerCase();

  if (name.includes("run")) return MET_VALUES.running_6mph;
  if (name.includes("walk")) return MET_VALUES.walking_moderate;
  if (name.includes("cycle") || name.includes("bike"))
    return MET_VALUES.cycling_moderate;
  if (name.includes("swim")) return MET_VALUES.swimming_moderate;
  if (name.includes("hiit")) return MET_VALUES.hiit_moderate;
  if (name.includes("yoga")) return MET_VALUES.yoga_vinyasa;
  if (name.includes("weight") || name.includes("lift"))
    return MET_VALUES.weight_lifting_vigorous;

  // Default to moderate intensity
  return 6.0;
}

/**
 * Get icon for exercise type
 */
export function getExerciseIcon(type: ExerciseType): string {
  const icons: Record<ExerciseType, string> = {
    strength: "💪",
    cardio: "🏃",
    hiit: "⚡",
    yoga: "🧘",
  };

  return icons[type] || "🏋️";
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Calculate pace (min/km) from distance and duration
 */
export function calculatePace(
  distanceKm: number,
  durationMinutes: number
): number {
  if (distanceKm === 0) return 0;
  return Math.round((durationMinutes / distanceKm) * 10) / 10;
}

/**
 * Format pace to string (e.g., "5:30 min/km")
 */
export function formatPace(pace: number): string {
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
}
