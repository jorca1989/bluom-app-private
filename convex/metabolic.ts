import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Metabolic and Keto Hub Logic

export const getDailyMetabolic = query({
    args: {
        userId: v.id("users"),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("dailyMetabolicLogs")
            .withIndex("by_user_date", (q) =>
                q.eq("userId", args.userId).eq("date", args.date)
            )
            .unique();
    },
});

export const logMacros = mutation({
    args: {
        userId: v.id("users"),
        date: v.string(),
        carbs: v.number(),
        fiber: v.number(),
        fat: v.number(),
        protein: v.number(),
        sugar: v.number(),
        calories: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("dailyMetabolicLogs")
            .withIndex("by_user_date", (q) =>
                q.eq("userId", args.userId).eq("date", args.date)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                carbs: existing.carbs + args.carbs,
                fiber: existing.fiber + args.fiber,
                fat: existing.fat + args.fat,
                protein: existing.protein + args.protein,
                sugar: existing.sugar + args.sugar,
                calories: existing.calories + args.calories,
            });
        } else {
            await ctx.db.insert("dailyMetabolicLogs", {
                userId: args.userId,
                date: args.date,
                carbs: args.carbs,
                fiber: args.fiber,
                fat: args.fat,
                protein: args.protein,
                sugar: args.sugar,
                calories: args.calories,
            });
        }
    },
});
