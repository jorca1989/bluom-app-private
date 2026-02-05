import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isProOrAdmin } from "./access";

/**
 * Log a food entry
 */
export const logFoodEntry = mutation({
  args: {
    userId: v.id("users"),
    foodId: v.optional(v.string()),
    foodName: v.string(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    servingSize: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack"),
      v.literal("premium_slot")
    ),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Free users: max 5 meal logs/day (any mealType).
    if (!isProOrAdmin(user)) {
      const todays = await ctx.db
        .query("foodEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
        .collect();
      if (todays.length >= 5) {
        throw new Error("Daily meal log limit reached for free users");
      }
    }

    // Check if premium_slot requires premium
    if (args.mealType === "premium_slot" && !user.isPremium) {
      throw new Error(
        "Premium slot is only available for premium users. Upgrade to unlock 5 meal slots!"
      );
    }

    const entryId = await ctx.db.insert("foodEntries", {
      userId: args.userId,
      foodId: args.foodId,
      foodName: args.foodName,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      servingSize: args.servingSize,
      mealType: args.mealType,
      date: args.date,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    return entryId;
  },
});

/**
 * Get food entries for a specific date
 */
export const getFoodEntriesByDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    return entries;
  },
});

/**
 * Get food entries for a date range (inclusive)
 * Used by Fuel weekly calendar dots.
 */
export const getFoodEntriesInRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    return entries;
  },
});

/**
 * Get daily nutrition totals
 */
export const getDailyTotals = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    const totals = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return totals;
  },
});

/**
 * Delete a food entry
 */
export const deleteFoodEntry = mutation({
  args: {
    entryId: v.id("foodEntries"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});
