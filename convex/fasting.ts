import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const startFasting = mutation({
  args: {
    userId: v.id("users"),
    protocol: v.string(), // "16:8", "18:6", "20:4"
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    // End any active fasting logs
    const active = await ctx.db
      .query("fasting_logs")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    
    for (const log of active) {
      await ctx.db.patch(log._id, { isActive: false, endTime: Date.now() });
    }

    return await ctx.db.insert("fasting_logs", {
      userId: args.userId,
      protocol: args.protocol,
      startTime: args.startTime,
      isActive: true,
    });
  },
});

export const endFasting = mutation({
  args: {
    userId: v.id("users"),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("fasting_logs")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();
    
    if (!active) return null;

    await ctx.db.patch(active._id, {
      isActive: false,
      endTime: args.endTime,
    });

    return active._id;
  },
});

export const getActiveFastingLog = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fasting_logs")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();
  },
});

export const getFastingHistory = query({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fasting_logs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit);
  },
});

