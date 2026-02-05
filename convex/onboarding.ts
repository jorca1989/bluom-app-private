import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * MIFFLIN-ST JEOR FORMULA
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
 * s = +5 for males, -161 for females
 *
 * TDEE = BMR × Activity Factor
 * Activity Factors:
 * - Sedentary: 1.2
 * - Lightly Active: 1.375
 * - Moderately Active: 1.55
 * - Very Active: 1.725
 * - Extremely Active: 1.9
 */

function calculateBMR(
  weight: number,
  height: number,
  age: number,
  biologicalSex: "male" | "female"
): number {
  const s = biologicalSex === "male" ? 5 : -161;
  return 10 * weight + 6.25 * height - 5 * age + s;
}

function getActivityFactor(activityLevel: string): number {
  const factors: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };
  return factors[activityLevel] || 1.55;
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  return bmr * getActivityFactor(activityLevel);
}

/**
 * Adjust TDEE based on fitness goal
 * - Lose Weight: -500 cal (1 lb per week)
 * - Build Muscle: +300 cal
 * - Maintain: TDEE
 * - Improve Health: TDEE
 */
function adjustCaloriesForGoal(tdee: number, goal: string): number {
  const adjustments: Record<string, number> = {
    lose_weight: -500,
    build_muscle: 300,
    maintain: 0,
    improve_health: 0,
    improve_endurance: 0,
    general_health: 0,
  };
  return tdee + (adjustments[goal] || 0);
}

/**
 * Calculate macro split based on goal and approach
 */
function calculateMacros(
  calories: number,
  weight: number,
  goal: string,
  nutritionApproach: string
): { protein: number; carbs: number; fat: number } {
  let proteinGrams: number;
  let fatGrams: number;
  let carbsGrams: number;

  // Protein calculation (per kg of body weight)
  if (goal === "build_muscle") {
    proteinGrams = weight * 2.2; // 2.2g per kg for muscle building
  } else if (goal === "lose_weight") {
    proteinGrams = weight * 2.0; // 2.0g per kg to preserve muscle
  } else {
    proteinGrams = weight * 1.6; // 1.6g per kg for maintenance
  }

  // Adjust based on nutrition approach
  if (nutritionApproach === "high_protein") {
    proteinGrams = weight * 2.5;
  }

  // Fat calculation (25-35% of calories)
  let fatPercentage = 0.3; // 30% default

  if (nutritionApproach === "low_carb") {
    fatPercentage = 0.4; // 40% for low carb
  }

  fatGrams = (calories * fatPercentage) / 9; // 9 cal per gram of fat

  // Carbs calculation (remaining calories)
  const proteinCalories = proteinGrams * 4; // 4 cal per gram
  const fatCalories = fatGrams * 9;
  const carbCalories = calories - proteinCalories - fatCalories;
  carbsGrams = carbCalories / 4; // 4 cal per gram

  // Ensure no negative values
  carbsGrams = Math.max(50, carbsGrams); // Minimum 50g carbs

  return {
    protein: Math.round(proteinGrams),
    carbs: Math.round(carbsGrams),
    fat: Math.round(fatGrams),
  };
}

/**
 * Calculate holistic score (0-100) based on questionnaire responses
 * Used for gamification and progress tracking
 */
function calculateHolisticScore(args: OnboardingArgs): number {
  let score = 50; // Base score

  const sleepHours = Number(args.sleepHours);
  const weeklyWorkoutTime = Number(args.weeklyWorkoutTime);

  // Positive factors
  if (sleepHours >= 7 && sleepHours <= 9) score += 10;
  if (args.stressLevel === "low" || args.stressLevel === "moderate") score += 10;
  if (weeklyWorkoutTime >= 3) score += 10;
  if (args.fitnessExperience !== "beginner") score += 5;

  // Negative factors
  if (args.stressLevel === "very_high") score -= 10;
  if (sleepHours < 6) score -= 10;
  if (weeklyWorkoutTime < 1) score -= 5;

  // Keep score between 0-100
  return Math.max(0, Math.min(100, score));
}

type OnboardingArgs = {
  clerkId: string;
  name: string;
  biologicalSex: "male" | "female";
  age: string;
  weight: string;
  height: string;
  targetWeight?: string;
  fitnessGoal:
    | "lose_weight"
    | "build_muscle"
    | "maintain"
    | "improve_health"
    | "improve_endurance"
    | "general_health";
  fitnessExperience: "beginner" | "intermediate" | "advanced";
  workoutPreference: "strength" | "cardio" | "hiit" | "yoga" | "mixed";
  weeklyWorkoutTime: string;
  activityLevel:
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extremely_active";
  nutritionApproach:
  | "balanced"
  | "high_protein"
  | "low_carb"
  | "plant_based"
  | "flexible";
  sleepHours: string;
  stressLevel: "low" | "moderate" | "high" | "very_high";
  motivations: string[];
  challenges: string[];
  mealsPerDay: string;
  threeMonthGoal: string;
};

/**
 * ONBOARD USER - The Core Personalization Engine
 *
 * Takes 18-question questionnaire data and:
 * 1. Converts string inputs to float64 for calculations
 * 2. Calculates BMR using Mifflin-St Jeor formula
 * 3. Calculates TDEE based on activity level
 * 4. Adjusts calories for fitness goal
 * 5. Calculates macro split (Protein/Carbs/Fat)
 * 6. Updates user profile with calculated targets
 * 7. Returns calculated values for blurred preview (pre-signup)
 */
export const onboardUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    biologicalSex: v.union(v.literal("male"), v.literal("female")),
    age: v.string(),
    weight: v.string(),
    height: v.string(),
    targetWeight: v.optional(v.string()),
    fitnessGoal: v.union(
      v.literal("lose_weight"),
      v.literal("build_muscle"),
      v.literal("maintain"),
      v.literal("improve_health"),
      v.literal("improve_endurance"),
      v.literal("general_health")
    ),
    fitnessExperience: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    workoutPreference: v.union(
      v.literal("strength"),
      v.literal("cardio"),
      v.literal("hiit"),
      v.literal("yoga"),
      v.literal("mixed")
    ),
    weeklyWorkoutTime: v.string(),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("lightly_active"),
      v.literal("moderately_active"),
      v.literal("very_active"),
      v.literal("extremely_active")
    ),
    nutritionApproach: v.union(
      v.literal("balanced"),
      v.literal("high_protein"),
      v.literal("low_carb"),
      v.literal("plant_based"),
      v.literal("flexible")
    ),
    sleepHours: v.string(),
    stressLevel: v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high"),
      v.literal("very_high")
    ),
    motivations: v.array(v.string()),
    challenges: v.array(v.string()),
    mealsPerDay: v.string(),
    threeMonthGoal: v.string(),
    peakEnergy: v.optional(v.string()),
    lifeStressor: v.optional(v.string()),
    coachingStyle: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()), // Added for localization support
    preferredUnits: v.optional(v.any()), // Preferred units (metric/imperial)
  },
  handler: async (ctx, args) => {
    console.log("Onboarding mutation v2 called with:", args.preferredLanguage);
    // STEP 1: Convert string inputs to float64
    const age = parseFloat(args.age);
    const weight = parseFloat(args.weight);
    const height = parseFloat(args.height);
    const targetWeight = args.targetWeight
      ? parseFloat(args.targetWeight)
      : undefined;
    const weeklyWorkoutTime = parseFloat(args.weeklyWorkoutTime);
    const sleepHours = parseFloat(args.sleepHours);
    const mealsPerDay = parseFloat(args.mealsPerDay);

    // Validate inputs
    if (isNaN(age) || isNaN(weight) || isNaN(height)) {
      throw new Error(
        "Invalid numeric input for age, weight, or height. Please ensure all values are valid numbers."
      );
    }

    // STEP 2: Calculate BMR (Basal Metabolic Rate)
    const bmr = calculateBMR(weight, height, age, args.biologicalSex);

    // STEP 3: Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = calculateTDEE(bmr, args.activityLevel);

    // STEP 4: Adjust calories for fitness goal
    const dailyCalories = adjustCaloriesForGoal(tdee, args.fitnessGoal);

    // STEP 5: Calculate macro split
    const macros = calculateMacros(
      dailyCalories,
      weight,
      args.fitnessGoal,
      args.nutritionApproach
    );

    // STEP 6: Calculate holistic score
    const holisticScore = calculateHolisticScore({
      ...args,
      age: args.age,
      weight: args.weight,
      height: args.height,
      weeklyWorkoutTime: args.weeklyWorkoutTime,
      sleepHours: args.sleepHours,
      mealsPerDay: args.mealsPerDay,
    });

    // STEP 7: Find existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!existingUser) {
      throw new Error("User not found. Please sign up first.");
    }

    // STEP 8: Update user with onboarding data and calculated targets
    await ctx.db.patch(existingUser._id, {
      name: args.name,
      age,
      biologicalSex: args.biologicalSex,
      weight,
      height,
      targetWeight,
      fitnessGoal: args.fitnessGoal,
      activityLevel: args.activityLevel,
      fitnessExperience: args.fitnessExperience,
      workoutPreference: args.workoutPreference,
      weeklyWorkoutTime,
      nutritionApproach: args.nutritionApproach,
      mealsPerDay,
      sleepHours,
      stressLevel: args.stressLevel,
      motivations: args.motivations,
      challenges: args.challenges,
      threeMonthGoal: args.threeMonthGoal,
      peakEnergy: args.peakEnergy,
      lifeStressor: args.lifeStressor,
      coachingStyle: args.coachingStyle,
      ...(args.preferredLanguage && { preferredLanguage: args.preferredLanguage }),
      ...(args.preferredUnits && { preferredUnits: args.preferredUnits }),

      // Calculated targets (Mifflin-St Jeor)
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: macros.protein,
      dailyCarbs: macros.carbs,
      dailyFat: macros.fat,

      updatedAt: Date.now(),
    });

    // STEP 9: Return calculated values for UI display
    return {
      success: true,
      userId: existingUser._id,
      calculations: {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        dailyCalories: Math.round(dailyCalories),
        dailyProtein: macros.protein,
        dailyCarbs: macros.carbs,
        dailyFat: macros.fat,
        holisticScore,
      },
    };
  },
});

/**
 * Pre-calculate targets WITHOUT storing (for blurred preview before signup)
 */
export const preCalculateTargets = mutation({
  args: {
    biologicalSex: v.union(v.literal("male"), v.literal("female")),
    age: v.string(),
    weight: v.string(),
    height: v.string(),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("lightly_active"),
      v.literal("moderately_active"),
      v.literal("very_active"),
      v.literal("extremely_active")
    ),
    fitnessGoal: v.union(
      v.literal("lose_weight"),
      v.literal("build_muscle"),
      v.literal("maintain"),
      v.literal("improve_health"),
      v.literal("improve_endurance"),
      v.literal("general_health")
    ),
    nutritionApproach: v.union(
      v.literal("balanced"),
      v.literal("high_protein"),
      v.literal("low_carb"),
      v.literal("plant_based"),
      v.literal("flexible")
    ),
  },
  handler: async (ctx, args) => {
    // Convert string inputs
    const age = parseFloat(args.age);
    const weight = parseFloat(args.weight);
    const height = parseFloat(args.height);

    if (isNaN(age) || isNaN(weight) || isNaN(height)) {
      throw new Error("Invalid numeric input");
    }

    // Calculate
    const bmr = calculateBMR(weight, height, age, args.biologicalSex);
    const tdee = calculateTDEE(bmr, args.activityLevel);
    const dailyCalories = adjustCaloriesForGoal(tdee, args.fitnessGoal);
    const macros = calculateMacros(
      dailyCalories,
      weight,
      args.fitnessGoal,
      args.nutritionApproach
    );

    return {
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: macros.protein,
      dailyCarbs: macros.carbs,
      dailyFat: macros.fat,
    };
  },
});
