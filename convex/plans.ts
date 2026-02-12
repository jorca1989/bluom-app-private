import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { generateContentWithFallback, safeJsonParse } from "./ai";

/**
 * SAVE GENERATED PLANS (Internal Mutation)
 */
export const saveGeneratedPlans = internalMutation({
  args: {
    userId: v.id("users"),
    nutritionPlan: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      mealTemplates: v.array(v.any()), // flexible for now
    }),
    fitnessPlan: v.object({
      workoutSplit: v.string(),
      daysPerWeek: v.number(),
      workouts: v.array(v.any()),
    }),
    wellnessPlan: v.object({
      sleepRecommendation: v.any(),
      meditationRecommendation: v.any(),
      recommendedHabits: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Deactivate existing plans
    const existingNutrition = await ctx.db
      .query("nutritionPlans")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    for (const p of existingNutrition) await ctx.db.patch(p._id, { isActive: false });

    const existingFitness = await ctx.db
      .query("fitnessPlans")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    for (const p of existingFitness) await ctx.db.patch(p._id, { isActive: false });

    const existingWellness = await ctx.db
      .query("wellnessPlans")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    for (const p of existingWellness) await ctx.db.patch(p._id, { isActive: false });

    // Insert New Plans
    const nutritionPlanId = await ctx.db.insert("nutritionPlans", {
      userId: args.userId,
      name: `AI Nutrition Plan`,
      calorieTarget: args.nutritionPlan.calories,
      proteinTarget: args.nutritionPlan.protein,
      carbsTarget: args.nutritionPlan.carbs,
      fatTarget: args.nutritionPlan.fat,
      mealTemplates: args.nutritionPlan.mealTemplates,
      isActive: true,
      createdAt: Date.now(),
    });

    const fitnessPlanId = await ctx.db.insert("fitnessPlans", {
      userId: args.userId,
      name: `AI Fitness Plan (${args.fitnessPlan.workoutSplit})`,
      workoutSplit: args.fitnessPlan.workoutSplit,
      daysPerWeek: args.fitnessPlan.daysPerWeek,
      workouts: args.fitnessPlan.workouts,
      isActive: true,
      createdAt: Date.now(),
    });

    // Auto-match master plan (simple logic preserved)
    let currentMasterPlanId = undefined;
    const allPrograms = await ctx.db.query("programs").collect();
    if (allPrograms.length > 0) {
      if ((user as any).biologicalSex === 'male') {
        const p = allPrograms.find(prog => prog.title.includes("Modern Man"));
        if (p) currentMasterPlanId = p._id;
      } else if ((user as any).biologicalSex === 'female') {
        const p = allPrograms.find(prog => prog.title.includes("Modern Woman"));
        if (p) currentMasterPlanId = p._id;
      }
      if (!currentMasterPlanId && allPrograms.length > 0) currentMasterPlanId = allPrograms[0]._id;
    }

    const wellnessPlanId = await ctx.db.insert("wellnessPlans", {
      userId: args.userId,
      name: `AI Wellness Plan`,
      sleepRecommendation: args.wellnessPlan.sleepRecommendation,
      meditationRecommendation: args.wellnessPlan.meditationRecommendation,
      recommendedHabits: args.wellnessPlan.recommendedHabits,
      isActive: true,
      currentMasterPlanId,
      programStartDate: Date.now(),
      createdAt: Date.now(),
    });

    return { nutritionPlanId, fitnessPlanId, wellnessPlanId };
  },
});

/**
 * GENERATE ALL PLANS ACTION
 * Uses Gemini to generate personalized JSONs for Nutrition, Fitness, and Wellness
 */
export const generateAllPlans = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch User Data
    const user = await ctx.runQuery(internal.users.internalGetUserById, { userId: args.userId });
    if (!user) throw new Error("User not found via action"); // Should not happen

    // 2. Construct Prompt for Gemini
    const systemPrompt = `
    You are an expert AI Health Coach for the app "Bluom".
    Generate 3 distinct plans (Nutrition, Fitness, Wellness) for this user based on their profile.
    
    USER PROFILE:
    - Age: ${user.age}, Sex: ${user.biologicalSex}, Weight: ${user.weight}kg, Height: ${user.height}cm
    - Goal: ${user.fitnessGoal}
    - Experience: ${user.fitnessExperience}
    - Workout Preference: ${user.workoutPreference}
    - Weekly Time Available: ${user.weeklyWorkoutTime} hours
    - Diet: ${user.nutritionApproach}
    - Meals/Day: ${user.mealsPerDay}
    - Sleep: ${user.sleepHours}h/night
    - Stress: ${user.stressLevel}
    - Motivations: ${JSON.stringify(user.motivations)}
    - Challenges: ${JSON.stringify(user.challenges)}
    
    REQUIREMENTS:
    
    1. NUTRITION PLAN:
       - Calculate approx calories/macros (TDEE + goal adjustment).
       - Generate EXACTLY ${user.mealsPerDay || 4} meal templates.
       - If 3 meals: Breakfast, Lunch, Dinner.
       - If 4 meals: Breakfast, Lunch, Dinner, Snack.
       - If 5 meals: Breakfast, Mid-Morning Snack, Lunch, Afternoon Snack, Dinner.
       - If 6+: Breakfast, Mid-Morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack.
       - Each template MUST include: mealType (string), calories (number), protein (number), carbs (number), fat (number), suggestions (array of 3-5 specific food items, not generic categories).
       - Suggestions should be real, specific foods like "3 scrambled eggs with spinach", "grilled chicken breast 200g with sweet potato".
    
    2. FITNESS PLAN:
       - Determine best 'workoutSplit' (e.g. Full Body, UL, PPL)
       - Determine 'daysPerWeek' (must be a number).
       - Provide 'workouts' array. Each workout: day, focus, estimatedDuration (number or omit), exercises[].
       - Each exercise: name, sets (number or string like "3-4"), reps (number or string like "8-12" or "To Failure"), rest in seconds (number or string).
       - IMPORTANT: All nutrition values (calories, protein, carbs, fat) MUST be pure numbers. For exercises, reps and sets CAN be strings (e.g., "10-12" or "To Failure").
    
    3. WELLNESS PLAN:
       - 'sleepRecommendation': targetHours, bedTimeWindow, tips[].
       - 'meditationRecommendation': frequencyPerWeek, sessionDuration, style.
       - 'recommendedHabits': array of { name, icon, category, frequency }.
    
    OUTPUT FORMAT:
    Return ONLY a single valid JSON object with keys: "nutrition", "fitness", "wellness".
    
    Example Structure:
    {
      "nutrition": {
        "calories": 2500, "protein": 180, "carbs": 250, "fat": 80,
        "mealTemplates": [ ... ]
      },
      "fitness": {
        "workoutSplit": "Full Body", "daysPerWeek": 3,
        "workouts": [ ... ]
      },
      "wellness": {
        "sleepRecommendation": { ... },
        "meditationRecommendation": { ... },
        "recommendedHabits": [ ... ]
      }
    }
    `;

    // 3. Call Gemini
    try {
      const result = await generateContentWithFallback([{ text: systemPrompt }]);
      const text = result.response.text();
      const parsed = safeJsonParse<any>(text);

      let data = parsed;
      if (!data) {
        // Fallback extract
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          data = safeJsonParse(text.slice(start, end + 1));
        }
      }

      if (!data || !data.nutrition || !data.fitness || !data.wellness) {
        console.error("Gemini failed to generate valid plan JSON. Using basic fallback.");
        throw new Error("Invalid AI Response");
      }

      // 4. Save to Database
      await ctx.runMutation(internal.plans.saveGeneratedPlans, {
        userId: args.userId,
        nutritionPlan: data.nutrition,
        fitnessPlan: data.fitness,
        wellnessPlan: data.wellness
      });

      return { success: true };

    } catch (err: any) {
      console.error("AI Plan Generation Failed:", err);
      // In a real app we might fallback to the deterministic logic here?
      // For now, let's re-throw so the UI knows
      throw new Error("AI Generation Failed: " + err.message);
    }
  },
});

/**
 * Get active plans for a user
 */
export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      return { nutritionPlan: null, fitnessPlan: null, wellnessPlan: null };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userIdentity.subject))
      .first();

    if (!user) {
      return { nutritionPlan: null, fitnessPlan: null, wellnessPlan: null };
    }

    const nutritionPlan = await ctx.db
      .query("nutritionPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    const fitnessPlan = await ctx.db
      .query("fitnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    const wellnessPlan = await ctx.db
      .query("wellnessPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    return {
      nutritionPlan: nutritionPlan ?? null,
      fitnessPlan: fitnessPlan ?? null,
      wellnessPlan: wellnessPlan ?? null,
    };
  },
});
