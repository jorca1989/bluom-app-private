import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * GENERATE NUTRITION PLAN
 * Creates a personalized meal plan based on user's calculated macros
 */
export const generateNutritionPlan = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Calculate meal distribution based on meals per day
    const totalMeals = Math.max(1, Number(user.mealsPerDay ?? 4));
    const dailyCalories = Number(user.dailyCalories ?? 0);
    const dailyProtein = Number(user.dailyProtein ?? 0);
    const dailyCarbs = Number(user.dailyCarbs ?? 0);
    const dailyFat = Number(user.dailyFat ?? 0);
    const caloriesPerMeal = dailyCalories / totalMeals;

    // Generate meal templates
    const mealTemplates = [];

    // Breakfast (25% of daily calories)
    mealTemplates.push({
      mealType: "breakfast",
      calories: dailyCalories * 0.25,
      protein: dailyProtein * 0.25,
      carbs: dailyCarbs * 0.25,
      fat: dailyFat * 0.25,
      suggestions: [
        "Oatmeal with protein powder and berries",
        "Greek yogurt with granola and nuts",
        "Egg white omelet with vegetables and toast",
        "Protein smoothie with banana and peanut butter",
      ],
    });

    // Lunch (35% of daily calories)
    mealTemplates.push({
      mealType: "lunch",
      calories: dailyCalories * 0.35,
      protein: dailyProtein * 0.35,
      carbs: dailyCarbs * 0.35,
      fat: dailyFat * 0.35,
      suggestions: [
        "Grilled chicken with quinoa and roasted vegetables",
        "Salmon with sweet potato and broccoli",
        "Turkey wrap with hummus and mixed greens",
        "Lean beef stir-fry with brown rice",
      ],
    });

    // Dinner (30% of daily calories)
    mealTemplates.push({
      mealType: "dinner",
      calories: dailyCalories * 0.3,
      protein: dailyProtein * 0.3,
      carbs: dailyCarbs * 0.3,
      fat: dailyFat * 0.3,
      suggestions: [
        "Baked fish with roasted vegetables and rice",
        "Chicken breast with pasta and marinara",
        "Lean steak with baked potato and asparagus",
        "Tofu stir-fry with noodles and vegetables",
      ],
    });

    // Snack (10% of daily calories)
    mealTemplates.push({
      mealType: "snack",
      calories: dailyCalories * 0.1,
      protein: dailyProtein * 0.1,
      carbs: dailyCarbs * 0.1,
      fat: dailyFat * 0.1,
      suggestions: [
        "Protein bar",
        "Apple with almond butter",
        "Cottage cheese with berries",
        "Trail mix with nuts and dried fruit",
      ],
    });

    // Premium 5th slot (if premium user)
    if (user.isPremium) {
      mealTemplates.push({
        mealType: "premium_slot",
        calories: caloriesPerMeal,
        protein: dailyProtein / totalMeals,
        carbs: dailyCarbs / totalMeals,
        fat: dailyFat / totalMeals,
        suggestions: [
          "Post-workout protein shake",
          "Pre-workout energy snack",
          "Late-night protein bowl",
          "Mid-afternoon power snack",
        ],
      });
    }

    // Deactivate existing plans
    const existingPlans = await ctx.db
      .query("nutritionPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    // Create new plan
    const planId = await ctx.db.insert("nutritionPlans", {
      userId: args.userId,
      name: `${user.name}'s Custom Nutrition Plan`,
      calorieTarget: dailyCalories,
      proteinTarget: dailyProtein,
      carbsTarget: dailyCarbs,
      fatTarget: dailyFat,
      mealTemplates,
      isActive: true,
      createdAt: Date.now(),
    });

    return planId;
  },
});

/**
 * GENERATE FITNESS PLAN
 * Creates a workout split based on experience and time commitment
 */
export const generateFitnessPlan = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let workoutSplit: string;
    let daysPerWeek: number;
    let workouts: any[] = [];

    // Determine workout split based on experience and time
    if (user.fitnessExperience === "beginner") {
      workoutSplit = "Full Body";
      daysPerWeek = 3;

      workouts = [
        {
          day: "Monday",
          focus: "Full Body A",
          exercises: [
            { name: "Squats", sets: 3, reps: 10, rest: 90 },
            { name: "Push-ups", sets: 3, reps: 10, rest: 60 },
            { name: "Dumbbell Rows", sets: 3, reps: 10, rest: 60 },
            { name: "Plank", sets: 3, reps: 30, rest: 45 },
          ],
          estimatedDuration: 45,
        },
        {
          day: "Wednesday",
          focus: "Full Body B",
          exercises: [
            { name: "Lunges", sets: 3, reps: 10, rest: 90 },
            { name: "Overhead Press", sets: 3, reps: 10, rest: 60 },
            { name: "Lat Pulldown", sets: 3, reps: 10, rest: 60 },
            { name: "Bicycle Crunches", sets: 3, reps: 15, rest: 45 },
          ],
          estimatedDuration: 45,
        },
        {
          day: "Friday",
          focus: "Full Body C",
          exercises: [
            { name: "Deadlifts", sets: 3, reps: 8, rest: 120 },
            { name: "Bench Press", sets: 3, reps: 10, rest: 90 },
            { name: "Cable Rows", sets: 3, reps: 10, rest: 60 },
            { name: "Russian Twists", sets: 3, reps: 20, rest: 45 },
          ],
          estimatedDuration: 50,
        },
      ];
    } else if (user.fitnessExperience === "intermediate") {
      workoutSplit = "Push/Pull/Legs";
      daysPerWeek = 4;

      workouts = [
        {
          day: "Monday",
          focus: "Push (Chest, Shoulders, Triceps)",
          exercises: [
            { name: "Bench Press", sets: 4, reps: 8, rest: 120 },
            { name: "Overhead Press", sets: 3, reps: 10, rest: 90 },
            { name: "Incline Dumbbell Press", sets: 3, reps: 10, rest: 90 },
            { name: "Lateral Raises", sets: 3, reps: 12, rest: 60 },
            { name: "Tricep Dips", sets: 3, reps: 10, rest: 60 },
          ],
          estimatedDuration: 60,
        },
        {
          day: "Tuesday",
          focus: "Pull (Back, Biceps)",
          exercises: [
            { name: "Deadlifts", sets: 4, reps: 6, rest: 150 },
            { name: "Pull-ups", sets: 3, reps: 8, rest: 90 },
            { name: "Barbell Rows", sets: 3, reps: 10, rest: 90 },
            { name: "Face Pulls", sets: 3, reps: 15, rest: 60 },
            { name: "Hammer Curls", sets: 3, reps: 12, rest: 60 },
          ],
          estimatedDuration: 60,
        },
        {
          day: "Thursday",
          focus: "Legs (Quads, Hamstrings, Glutes)",
          exercises: [
            { name: "Squats", sets: 4, reps: 8, rest: 150 },
            { name: "Romanian Deadlifts", sets: 3, reps: 10, rest: 120 },
            { name: "Leg Press", sets: 3, reps: 12, rest: 90 },
            { name: "Leg Curls", sets: 3, reps: 12, rest: 60 },
            { name: "Calf Raises", sets: 4, reps: 15, rest: 60 },
          ],
          estimatedDuration: 60,
        },
        {
          day: "Saturday",
          focus: "Upper Body Volume",
          exercises: [
            { name: "Dumbbell Press", sets: 3, reps: 12, rest: 90 },
            { name: "Cable Rows", sets: 3, reps: 12, rest: 90 },
            { name: "Dumbbell Flyes", sets: 3, reps: 12, rest: 60 },
            { name: "Bicep Curls", sets: 3, reps: 12, rest: 60 },
            { name: "Tricep Extensions", sets: 3, reps: 12, rest: 60 },
          ],
          estimatedDuration: 55,
        },
      ];
    } else {
      // Advanced
      workoutSplit = "Upper/Lower";
      daysPerWeek = 5;

      workouts = [
        {
          day: "Monday",
          focus: "Upper Power",
          exercises: [
            { name: "Bench Press", sets: 5, reps: 5, rest: 180 },
            { name: "Barbell Rows", sets: 5, reps: 5, rest: 180 },
            { name: "Overhead Press", sets: 4, reps: 6, rest: 150 },
            { name: "Weighted Pull-ups", sets: 4, reps: 6, rest: 120 },
            { name: "Close Grip Bench", sets: 3, reps: 8, rest: 90 },
          ],
          estimatedDuration: 75,
        },
        {
          day: "Tuesday",
          focus: "Lower Power",
          exercises: [
            { name: "Squats", sets: 5, reps: 5, rest: 210 },
            { name: "Deadlifts", sets: 5, reps: 5, rest: 210 },
            { name: "Leg Press", sets: 3, reps: 10, rest: 120 },
            { name: "Leg Curls", sets: 3, reps: 10, rest: 90 },
            { name: "Calf Raises", sets: 4, reps: 12, rest: 60 },
          ],
          estimatedDuration: 75,
        },
        {
          day: "Thursday",
          focus: "Upper Hypertrophy",
          exercises: [
            { name: "Incline Press", sets: 4, reps: 10, rest: 90 },
            { name: "Cable Rows", sets: 4, reps: 10, rest: 90 },
            { name: "Dumbbell Press", sets: 3, reps: 12, rest: 75 },
            { name: "Lat Pulldown", sets: 3, reps: 12, rest: 75 },
            { name: "Lateral Raises", sets: 4, reps: 15, rest: 60 },
            { name: "Bicep Curls", sets: 3, reps: 12, rest: 60 },
          ],
          estimatedDuration: 70,
        },
        {
          day: "Friday",
          focus: "Lower Hypertrophy",
          exercises: [
            { name: "Front Squats", sets: 4, reps: 10, rest: 120 },
            { name: "Romanian Deadlifts", sets: 4, reps: 10, rest: 120 },
            { name: "Walking Lunges", sets: 3, reps: 12, rest: 90 },
            { name: "Leg Extensions", sets: 3, reps: 15, rest: 60 },
            { name: "Leg Curls", sets: 3, reps: 15, rest: 60 },
          ],
          estimatedDuration: 65,
        },
        {
          day: "Saturday",
          focus: "Accessories & Abs",
          exercises: [
            { name: "Face Pulls", sets: 4, reps: 15, rest: 60 },
            { name: "Shrugs", sets: 4, reps: 12, rest: 60 },
            { name: "Hammer Curls", sets: 3, reps: 12, rest: 60 },
            { name: "Tricep Pushdowns", sets: 3, reps: 12, rest: 60 },
            { name: "Hanging Leg Raises", sets: 4, reps: 12, rest: 60 },
            { name: "Cable Crunches", sets: 4, reps: 15, rest: 45 },
          ],
          estimatedDuration: 50,
        },
      ];
    }

    // Deactivate existing plans
    const existingPlans = await ctx.db
      .query("fitnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    // Create new plan
    const planId = await ctx.db.insert("fitnessPlans", {
      userId: args.userId,
      name: `${user.name}'s ${workoutSplit} Program`,
      workoutSplit,
      daysPerWeek,
      workouts,
      isActive: true,
      createdAt: Date.now(),
    });

    return planId;
  },
});

/**
 * GENERATE WELLNESS PLAN
 * Creates habits, sleep, and meditation recommendations
 */
export const generateWellnessPlan = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Sleep recommendations based on current sleep
    let sleepRecommendation;
    const sleepHours = Number(user.sleepHours ?? 7.5);
    if (sleepHours < 7) {
      sleepRecommendation = {
        targetHours: 7.5,
        bedTimeWindow: "10:00 PM - 11:00 PM",
        tips: [
          "Establish a consistent bedtime routine",
          "Avoid screens 1 hour before bed",
          "Keep bedroom cool and dark",
          "Limit caffeine after 2 PM",
        ],
      };
    } else {
      sleepRecommendation = {
        targetHours: sleepHours,
        bedTimeWindow: "10:30 PM - 11:30 PM",
        tips: [
          "Maintain your current sleep schedule",
          "Consider sleep tracking for optimization",
          "Practice good sleep hygiene",
        ],
      };
    }

    // Meditation recommendations based on stress level
    let meditationRecommendation;
    if (user.stressLevel === "high" || user.stressLevel === "very_high") {
      meditationRecommendation = {
        frequencyPerWeek: 7,
        sessionDuration: 15,
        style: "guided breathing",
      };
    } else if (user.stressLevel === "moderate") {
      meditationRecommendation = {
        frequencyPerWeek: 4,
        sessionDuration: 10,
        style: "mindfulness",
      };
    } else {
      meditationRecommendation = {
        frequencyPerWeek: 3,
        sessionDuration: 5,
        style: "morning meditation",
      };
    }

    // Recommended habits based on goals and challenges
    const recommendedHabits = [
      {
        name: "Morning Hydration",
        icon: "💧",
        category: "physical",
        frequency: "daily",
      },
      {
        name: "10-Minute Walk",
        icon: "🚶",
        category: "physical",
        frequency: "daily",
      },
      {
        name: "Gratitude Journal",
        icon: "📝",
        category: "mental",
        frequency: "daily",
      },
      {
        name: "Meal Prep Sunday",
        icon: "🥗",
        category: "routine",
        frequency: "weekly",
      },
      {
        name: "Stretch Routine",
        icon: "🧘",
        category: "physical",
        frequency: "5x per week",
      },
      {
        name: "Digital Detox Hour",
        icon: "📱",
        category: "mental",
        frequency: "daily",
      },
    ];

    // Deactivate existing plans
    const existingPlans = await ctx.db
      .query("wellnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    // Intelligent Master Plan Suggestions
    let currentMasterPlanId = undefined;
    const allPrograms = await ctx.db.query("programs").collect();

    // Simple matching logic
    if (allPrograms.length > 0) {
      if ((user as any).biologicalSex === 'male') {
        const menPlan = allPrograms.find(p => p.title.includes("Modern Man") || p.tags?.includes("Men"));
        if (menPlan) currentMasterPlanId = menPlan._id;
      } else if ((user as any).biologicalSex === 'female') {
        const womenPlan = allPrograms.find(p => p.title.includes("Modern Woman") || p.tags?.includes("Women"));
        if (womenPlan) currentMasterPlanId = womenPlan._id;
      }

      // Fallback or specific goal matching could go here
      if (!currentMasterPlanId && allPrograms.length > 0) {
        // Default to first available if no specific match
        currentMasterPlanId = allPrograms[0]._id;
      }
    }

    // Create new plan
    const planId = await ctx.db.insert("wellnessPlans", {
      userId: args.userId,
      name: `${user.name}'s Wellness Plan`,
      sleepRecommendation,
      meditationRecommendation,
      recommendedHabits,
      isActive: true,
      currentMasterPlanId, // Auto-enroll
      programStartDate: Date.now(), // Start today
      createdAt: Date.now(),
    });

    return planId;
  },
});

/**
 * Generate all three plans at once (called after onboarding)
 */
export const generateAllPlans = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    nutritionPlanId: Id<"nutritionPlans">;
    fitnessPlanId: Id<"fitnessPlans">;
    wellnessPlanId: Id<"wellnessPlans">;
  }> => {
    const nutritionPlanId = (await ctx.runMutation(
      internal.plans.generateNutritionPlan,
      args
    )) as Id<"nutritionPlans">;
    const fitnessPlanId = (await ctx.runMutation(
      internal.plans.generateFitnessPlan,
      args
    )) as Id<"fitnessPlans">;
    const wellnessPlanId = (await ctx.runMutation(
      internal.plans.generateWellnessPlan,
      args
    )) as Id<"wellnessPlans">;

    return {
      nutritionPlanId,
      fitnessPlanId,
      wellnessPlanId,
    };
  },
});

/**
 * Get active plans for a user
 */
export const getActivePlans = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const nutritionPlan = await ctx.db
      .query("nutritionPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();

    const fitnessPlan = await ctx.db
      .query("fitnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();

    const wellnessPlan = await ctx.db
      .query("wellnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();

    return {
      nutritionPlan,
      fitnessPlan,
      wellnessPlan,
    };
  },
});
