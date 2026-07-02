import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logPulse = mutation({
  args: {
    userId: v.id("users"),
    bpm: v.number(),
    hrv: v.number(),
    stressLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("pulseLogs", {
      userId: args.userId,
      bpm: args.bpm,
      hrv: args.hrv,
      stressLevel: args.stressLevel,
      createdAt: now,
    });
  },
});

export const getPulseHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pulseLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});
