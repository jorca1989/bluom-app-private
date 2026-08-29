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
 * Adjust TDEE based on fitness goal and commitment level
 * - Lose Weight: -250 (easy), -500 (balanced), -750 (maximum)
 * - Build Muscle: +150 (easy), +300 (balanced), +500 (maximum)
 * - Maintain: TDEE
 * - Improve Health: TDEE
 */
function adjustCaloriesForGoal(tdee: number, goal: string, commitmentLevel?: string): number {
  const baseAdjustments: Record<string, number> = {
    lose_weight: -500,
    build_muscle: 300,
    maintain: 0,
    improve_health: 0,
    improve_endurance: 0,
    general_health: 0,
  };
  
  let baseAdjustment = baseAdjustments[goal] || 0;
  
  // Apply commitment level multiplier
  if (commitmentLevel === 'easy') {
    baseAdjustment = baseAdjustment * 0.5; // 50% intensity
  } else if (commitmentLevel === 'maximum') {
    baseAdjustment = baseAdjustment * 1.5; // 150% intensity
  }
  // 'balanced' or undefined uses base value (100%)
  
  return tdee + baseAdjustment;
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
  const stressorCount =
    args.lifeStressor === undefined
      ? 0
      : Array.isArray(args.lifeStressor)
        ? args.lifeStressor.length
        : 1;

  // Positive factors
  if (sleepHours >= 7 && sleepHours <= 9) score += 10;
  if (args.stressLevel === "low" || args.stressLevel === "moderate") score += 10;
  if (weeklyWorkoutTime >= 3) score += 10;
  if (args.fitnessExperience !== "beginner") score += 5;

  // Negative factors
  if (args.stressLevel === "very_high") score -= 10;
  if (sleepHours < 6) score -= 10;
  if (weeklyWorkoutTime < 1) score -= 5;
  // Multi-select stressors: apply a small stacking penalty, capped.
  const stressorPenalty = Math.min(stressorCount * 3, 15);
  score -= stressorPenalty;

  // Keep score between 0-100
  return Math.max(0, Math.min(100, score));
}

type OnboardingArgs = {
  clerkId: string;
  name?: string;
  biologicalSex: "male" | "female";
  age: number;
  weight: number;
  height: number;
  targetWeight?: number;
  fitnessGoal: string;
  fitnessExperience: string;
  workoutPreference: string;
  weeklyWorkoutTime: number;
  activityLevel: string;
  nutritionApproach: string;
  sleepHours: number;
  stressLevel: string;
  motivations: string[];
  challenges: string[];
  mealsPerDay: number;
  twelveMonthGoal?: string;
  peakEnergy?: string;
  lifeStressor?: string | string[];
  coachingStyle?: string;
  commitmentLevel?: string;
  preferredLanguage?: string;
  preferredTheme?: string;
  preferredUnits?: {
    weight: string;
    height: string;
    volume?: string;
  };
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
    name: v.optional(v.string()),
    biologicalSex: v.optional(v.union(v.literal("male"), v.literal("female"))),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    height: v.optional(v.number()),
    targetWeight: v.optional(v.number()),
    fitnessGoal: v.optional(v.string()),
    fitnessExperience: v.optional(v.string()),
    workoutPreference: v.optional(v.string()),
    weeklyWorkoutTime: v.optional(v.number()),
    activityLevel: v.optional(v.string()),
    nutritionApproach: v.optional(v.string()),
    sleepHours: v.optional(v.number()),
    stressLevel: v.optional(v.string()),
    motivations: v.optional(v.array(v.string())),
    challenges: v.optional(v.array(v.string())),
    mealsPerDay: v.optional(v.number()),
    twelveMonthGoal: v.optional(v.string()),
    peakEnergy: v.optional(v.string()),
    lifeStressor: v.optional(v.union(v.string(), v.array(v.string()))),
    coachingStyle: v.optional(v.string()),
    commitmentLevel: v.optional(v.string()),
    primaryFocus: v.optional(v.union(v.literal("fitness"), v.literal("mental_health"), v.literal("hormonal"), v.literal("holistic"))),
    activeTools: v.optional(v.array(v.string())),
    preferredLanguage: v.optional(v.string()),
    preferredTheme: v.optional(v.string()),
    preferredUnits: v.optional(v.object({
      weight: v.string(),
      height: v.string(),
      volume: v.optional(v.string()),
    })),
    // ── Mental Health Branch ──────────────────────────────────────────────
    mindfulnessGoal: v.optional(v.string()),
    meditationExperience: v.optional(v.string()),
    peakFocusWindow: v.optional(v.string()),
    screenTimeRisk: v.optional(v.string()),
    stressSymptomType: v.optional(v.array(v.string())),
    preferredResetTool: v.optional(v.string()),
    eveningRoutine: v.optional(v.string()),
    // ── Hormonal Branch ──────────────────────────────────────────────────
    pmsSeverityPattern: v.optional(v.array(v.string())),
    energyCrashPattern: v.optional(v.string()),
    dailyHydration: v.optional(v.string()),
    bloodSugarStability: v.optional(v.string()),
    // ── Fitness / Holistic Branch ─────────────────────────────────────────
    dietaryObstacle: v.optional(v.string()),
    dietingHistory: v.optional(v.string()),
    equipmentAccess: v.optional(v.string()),
    physicalLimitations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    console.log("Onboarding mutation v2 called with:", args.preferredLanguage, "primaryFocus:", args.primaryFocus);
    // Safe numeric inputs with defaults
    const biologicalSex = args.biologicalSex || 'female';
    const age = (args.age && !isNaN(args.age)) ? args.age : 25;
    const weight = (args.weight && !isNaN(args.weight)) ? args.weight : 65;
    const height = (args.height && !isNaN(args.height)) ? args.height : 165;
    const targetWeight = (args.targetWeight && !isNaN(args.targetWeight)) ? args.targetWeight : weight;
    const weeklyWorkoutTime = (args.weeklyWorkoutTime && !isNaN(args.weeklyWorkoutTime)) ? args.weeklyWorkoutTime : 3;
    const sleepHours = (args.sleepHours && !isNaN(args.sleepHours)) ? args.sleepHours : 7;
    const mealsPerDay = (args.mealsPerDay && !isNaN(args.mealsPerDay)) ? args.mealsPerDay : 3;

    const activityLevel = args.activityLevel || 'moderately_active';
    const fitnessGoal = args.fitnessGoal || 'general_health';
    const fitnessExperience = args.fitnessExperience || 'intermediate';
    const workoutPreference = args.workoutPreference || 'mixed';
    const nutritionApproach = args.nutritionApproach || 'balanced';
    const stressLevel = args.stressLevel || 'moderate';
    const motivations = args.motivations || [];
    const challenges = args.challenges || [];

    // STEP 2: Calculate BMR (Basal Metabolic Rate)
    const bmr = calculateBMR(weight, height, age, biologicalSex);

    // STEP 3: Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = calculateTDEE(bmr, activityLevel);

    // STEP 4: Adjust calories for fitness goal and commitment level
    const dailyCalories = adjustCaloriesForGoal(tdee, fitnessGoal, args.commitmentLevel);

    // STEP 5: Calculate macro split
    const macros = calculateMacros(
      dailyCalories,
      weight,
      fitnessGoal,
      nutritionApproach
    );

    // STEP 6: Calculate holistic score
    const holisticScore = calculateHolisticScore({
      ...args,
      biologicalSex,
      age,
      weight,
      height,
      weeklyWorkoutTime,
      sleepHours,
      mealsPerDay,
      activityLevel,
      fitnessGoal,
      fitnessExperience,
      workoutPreference,
      nutritionApproach,
      stressLevel,
      motivations,
      challenges,
    });

    // STEP 7: Find existing user or create if webhook hasn't fired yet
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!existingUser) {
      // Clerk webhook may not have fired yet — create the user record now
      // so onboarding can proceed without waiting for the webhook.
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: "",
        name: args.name || "User",
        preferredLanguage: "en",
        preferredUnits: { height: "cm", weight: "kg", volume: "ml" },
        isPremium: false,
        subscriptionStatus: "free",
        role: "user",
        isAdmin: false,
        dailyGamePlays: 0,
        dailyMeditationPlays: 0,
        dailyMealLogs: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      existingUser = await ctx.db.get(userId);
      if (!existingUser) {
        throw new Error("Failed to create user record.");
      }
    }

    const lifeStressors =
      args.lifeStressor === undefined
        ? undefined
        : Array.isArray(args.lifeStressor)
          ? args.lifeStressor
          : [args.lifeStressor];

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
      twelveMonthGoal: args.twelveMonthGoal,
      peakEnergy: args.peakEnergy,
      // DataModel types are generated from schema; during transition, cast to allow string[] storage.
      lifeStressor: lifeStressors as any,

      commitmentLevel: args.commitmentLevel,
      primaryFocus: args.primaryFocus,
      activeTools: args.activeTools,
      planGeneratedAt: Date.now(),
      planIsAiCustom: true,
      ...(args.preferredLanguage && { preferredLanguage: args.preferredLanguage }),
      ...(args.preferredTheme && { preferredTheme: args.preferredTheme }),
      ...(args.preferredUnits && {
        preferredUnits: {
          ...args.preferredUnits,
          volume: args.preferredUnits.volume ?? 'ml'
        }
      }),
      // ── Mental Health Branch ──────────────────────────────────────────────
      ...(args.mindfulnessGoal && { mindfulnessGoal: args.mindfulnessGoal }),
      ...(args.meditationExperience && { meditationExperience: args.meditationExperience }),
      ...(args.peakFocusWindow && { peakFocusWindow: args.peakFocusWindow }),
      ...(args.screenTimeRisk && { screenTimeRisk: args.screenTimeRisk }),
      ...(args.stressSymptomType && { stressSymptomType: args.stressSymptomType }),
      ...(args.preferredResetTool && { preferredResetTool: args.preferredResetTool }),
      ...(args.eveningRoutine && { eveningRoutine: args.eveningRoutine }),
      // ── Hormonal Branch ──────────────────────────────────────────────────
      ...(args.pmsSeverityPattern && { pmsSeverityPattern: args.pmsSeverityPattern }),
      ...(args.energyCrashPattern && { energyCrashPattern: args.energyCrashPattern }),
      ...(args.dailyHydration && { dailyHydration: args.dailyHydration }),
      ...(args.bloodSugarStability && { bloodSugarStability: args.bloodSugarStability }),
      // ── Fitness / Holistic Branch ─────────────────────────────────────────
      ...(args.dietaryObstacle && { dietaryObstacle: args.dietaryObstacle }),
      ...(args.dietingHistory && { dietingHistory: args.dietingHistory }),
      ...(args.equipmentAccess && { equipmentAccess: args.equipmentAccess }),
      ...(args.physicalLimitations && { physicalLimitations: args.physicalLimitations }),

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
    activityLevel: v.string(),
    fitnessGoal: v.string(),
    nutritionApproach: v.string(),
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
