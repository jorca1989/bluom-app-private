import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logDental = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    brushDuration: v.number(),
    flossed: v.boolean(),
    mouthwash: v.boolean(),
    tongueClean: v.boolean(),
    sensitiveTeeth: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dentalLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        brushDuration: args.brushDuration,
        flossed: args.flossed,
        mouthwash: args.mouthwash,
        tongueClean: args.tongueClean,
        sensitiveTeeth: args.sensitiveTeeth,
      });
      return existing._id;
    }

    return await ctx.db.insert("dentalLogs", {
      userId: args.userId,
      date: args.date,
      brushDuration: args.brushDuration,
      flossed: args.flossed,
      mouthwash: args.mouthwash,
      tongueClean: args.tongueClean,
      sensitiveTeeth: args.sensitiveTeeth,
    });
  },
});

export const getDentalHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dentalLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
  },
});

export const getDentalToday = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dentalLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .first();
  },
});
