import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addStepsEntry = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    steps: v.float64(),
    caloriesBurned: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const steps = Math.max(0, Math.floor(args.steps));
    // Rough estimate: 0.04 calories per step (same as old app)
    const caloriesBurned = Math.max(
      0,
      Math.round(args.caloriesBurned ?? steps * 0.04)
    );

    const now = Date.now();
    return await ctx.db.insert("stepsEntries", {
      userId: args.userId,
      date: args.date,
      steps,
      caloriesBurned,
      timestamp: now,
      createdAt: now,
    });
  },
});

export const getStepsEntriesByDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stepsEntries")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
  },
});

export const deleteStepsEntry = mutation({
  args: {
    entryId: v.id("stepsEntries"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});












