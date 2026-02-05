import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementQuestProgress } from "./questProgress";

/**
 * Log an exercise entry with MET-based calorie calculation
 * Formula: Calories = MET × weight_kg × duration_hours
 */
export const logExerciseEntry = mutation({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    exerciseType: v.union(
      v.literal("strength"),
      v.literal("cardio"),
      v.literal("hiit"),
      v.literal("yoga")
    ),
    duration: v.float64(),
    met: v.float64(),
    sets: v.optional(v.float64()),
    reps: v.optional(v.float64()),
    weight: v.optional(v.float64()),
    distance: v.optional(v.float64()),
    pace: v.optional(v.float64()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Calculate calories burned: MET × weight_kg × duration_hours
    const durationHours = args.duration / 60;
    const weightKg = user.weight ?? 70;
    const caloriesBurned = args.met * weightKg * durationHours;

    const entryId = await ctx.db.insert("exerciseEntries", {
      userId: args.userId,
      exerciseName: args.exerciseName,
      exerciseType: args.exerciseType,
      duration: args.duration,
      met: args.met,
      caloriesBurned: Math.round(caloriesBurned),
      sets: args.sets,
      reps: args.reps,
      weight: args.weight,
      distance: args.distance,
      pace: args.pace,
      date: args.date,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    // quest progress: workout (count one workout per entry)
    await incrementQuestProgress(ctx, args.userId, args.date, "workout", 1);

    return entryId;
  },
});

/**
 * Get exercise entries for a specific date
 */
export const getExerciseEntriesByDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    return entries;
  },
});

/**
 * Get total calories burned for a date
 */
export const getTotalCaloriesBurned = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    const total = entries.reduce((acc, entry) => acc + entry.caloriesBurned, 0);

    return Math.round(total);
  },
});

/**
 * Delete an exercise entry
 */
export const deleteExerciseEntry = mutation({
  args: {
    entryId: v.id("exerciseEntries"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

/**
 * Get exercise statistics for the week
 */
export const getWeeklyExerciseStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all exercises for the user (we'll filter by date range in memory)
    const allEntries = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by date range
    const weekEntries = allEntries.filter(
      (entry) => entry.date >= args.startDate && entry.date <= args.endDate
    );

    // Calculate stats
    const totalWorkouts = weekEntries.length;
    const totalDuration = weekEntries.reduce(
      (acc, entry) => acc + entry.duration,
      0
    );
    const totalCalories = weekEntries.reduce(
      (acc, entry) => acc + entry.caloriesBurned,
      0
    );

    // Group by exercise type
    const byType = weekEntries.reduce(
      (acc, entry) => {
        acc[entry.exerciseType] = (acc[entry.exerciseType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalWorkouts,
      totalDuration: Math.round(totalDuration),
      totalCalories: Math.round(totalCalories),
      byType,
    };
  },
});

/**
 * Get exercise entries within a date range (inclusive).
 * Note: Uses in-memory filtering since date strings are stored as YYYY-MM-DD.
 */
export const getExerciseEntriesInRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allEntries = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .collect();

    return allEntries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );
  },
});
