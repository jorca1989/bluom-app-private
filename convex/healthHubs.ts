import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// --- Women's Health ---

export const logCycle = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    symptoms: v.array(v.string()),
    flow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cycleLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { symptoms: args.symptoms, flow: args.flow });
      return existing._id;
    } else {
      return await ctx.db.insert("cycleLogs", {
        userId: args.userId,
        date: args.date,
        symptoms: args.symptoms,
        flow: args.flow,
      });
    }
  },
});

export const getCycleLogs = query({
  args: { userId: v.id("users"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cycleLogs")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();
  },
});

// --- Men's Health ---

export const logVitality = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    mood: v.number(),
    stress: v.string(),
    strength: v.number(),
    sleepQuality: v.number(),
    kegelCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vitalityLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return existing._id;
    } else {
      return await ctx.db.insert("vitalityLogs", { ...args });
    }
  },
});

export const getVitalityLogs = query({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vitalityLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit);
  },
});

