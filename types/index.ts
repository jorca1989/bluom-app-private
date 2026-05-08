/**
 * Type definitions for Bluom.App
 * Matches Convex schema types
 */

export type BiologicalSex = "male" | "female";

export type FitnessGoal =
  | "lose_weight"
  | "build_muscle"
  | "maintain"
  | "improve_health";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extremely_active";

export type FitnessExperience = "beginner" | "intermediate" | "advanced";

export type WorkoutPreference = "strength" | "cardio" | "hiit" | "yoga" | "mixed";

export type NutritionApproach =
  | "balanced"
  | "high_protein"
  | "low_carb"
  | "plant_based"
  | "flexible";

export type StressLevel = "low" | "moderate" | "high" | "very_high";

export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "premium_slot";

export type ExerciseType = "strength" | "cardio" | "hiit" | "yoga";

export type HabitCategory = "physical" | "mental" | "routine";

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/**
 * User Profile from Convex
 */
export interface UserProfile {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  age: number;
  biologicalSex: BiologicalSex;
  weight: number;
  height: number;
  targetWeight?: number;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  fitnessExperience: FitnessExperience;
  workoutPreference: WorkoutPreference;
  weeklyWorkoutTime: number;
  nutritionApproach: NutritionApproach;
  mealsPerDay: number;
  sleepHours: number;
  stressLevel: StressLevel;
  motivations: string[];
  challenges: string[];
  threeMonthGoal: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  isPremium: boolean;
  premiumExpiry?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Onboarding Questionnaire Data
 */
export interface OnboardingData {
  name: string;
  biologicalSex: BiologicalSex;
  age: string;
  weight: string;
  height: string;
  targetWeight?: string;
  fitnessGoal: FitnessGoal;
  fitnessExperience: FitnessExperience;
  workoutPreference: WorkoutPreference;
  weeklyWorkoutTime: string;
  activityLevel: ActivityLevel;
  nutritionApproach: NutritionApproach;
  sleepHours: string;
  stressLevel: StressLevel;
  motivations: string[];
  challenges: string[];
  mealsPerDay: string;
  threeMonthGoal: string;
}

/**
 * Calculated Targets Response
 */
export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  holisticScore: number;
}

/**
 * Food Entry
 */
export interface FoodEntry {
  _id: string;
  userId: string;
  foodId?: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  mealType: MealType;
  date: string;
  timestamp: number;
  createdAt: number;
}

/**
 * Exercise Entry
 */
export interface ExerciseEntry {
  _id: string;
  userId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  duration: number;
  met: number;
  caloriesBurned: number;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  pace?: number;
  date: string;
  timestamp: number;
  createdAt: number;
}

/**
 * Habit
 */
export interface Habit {
  _id: string;
  userId: string;
  name: string;
  icon: string;
  category: HabitCategory;
  streak: number;
  longestStreak: number;
  completedToday: boolean;
  lastCompletedDate?: string;
  targetDaysPerWeek: number;
  reminderTime?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Mood Log
 */
export interface MoodLog {
  _id: string;
  userId: string;
  mood: MoodLevel;
  moodEmoji: string;
  note?: string;
  tags?: string[];
  date: string;
  timestamp: number;
}

/**
 * Sleep Log
 */
export interface SleepLog {
  _id: string;
  userId: string;
  hours: number;
  quality: number;
  bedTime?: string;
  wakeTime?: string;
  note?: string;
  factors?: string[];
  date: string;
  timestamp: number;
}
