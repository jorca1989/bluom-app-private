import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementQuestProgress } from "./questProgress";

export const getDailyStats = query({
  args: { userId: v.id("users"), date: v.string() }, // YYYY-MM-DD
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    return (
      stats ?? {
        userId: args.userId,
        date: args.date,
        waterOz: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    );
  },
});

export const setWaterOz = mutation({
  args: { userId: v.id("users"), date: v.string(), waterOz: v.float64() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (!existing) {
      const id = await ctx.db.insert("dailyStats", {
        userId: args.userId,
        date: args.date,
        waterOz: Math.max(0, args.waterOz),
        createdAt: now,
        updatedAt: now,
      });

      // quest progress: water
      await incrementQuestProgress(
        ctx,
        args.userId,
        args.date,
        "water",
        Math.max(0, args.waterOz)
      );

      return id;
    }

    const prev = existing.waterOz ?? 0;
    const next = Math.max(0, args.waterOz);
    const delta = next - prev;

    await ctx.db.patch(existing._id, {
      waterOz: next,
      updatedAt: now,
    });

    if (delta !== 0) {
      await incrementQuestProgress(ctx, args.userId, args.date, "water", delta);
    }
    return existing._id;
  },
});

export const addWaterOz = mutation({
  args: { userId: v.id("users"), date: v.string(), deltaOz: v.float64() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    const current = existing?.waterOz ?? 0;
    const next = Math.max(0, current + args.deltaOz);

    if (!existing) {
      await ctx.db.insert("dailyStats", {
        userId: args.userId,
        date: args.date,
        waterOz: next,
        createdAt: now,
        updatedAt: now,
      });

      if (args.deltaOz !== 0) {
        await incrementQuestProgress(ctx, args.userId, args.date, "water", args.deltaOz);
      }
      return next;
    }

    await ctx.db.patch(existing._id, { waterOz: next, updatedAt: now });
    if (args.deltaOz !== 0) {
      await incrementQuestProgress(ctx, args.userId, args.date, "water", args.deltaOz);
    }
    return next;
  },
});

export const getDailyMacros = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    const consumed = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories ?? 0),
        protein: acc.protein + (e.protein ?? 0),
        carbs: acc.carbs + (e.carbs ?? 0),
        fat: acc.fat + (e.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const target = {
      calories: user.dailyCalories ?? 2000,
      protein: user.dailyProtein ?? 150,
      carbs: user.dailyCarbs ?? 225,
      fat: user.dailyFat ?? 67,
    };

    const remaining = {
      calories: Math.max(0, target.calories - consumed.calories),
      protein: Math.max(0, target.protein - consumed.protein),
      carbs: Math.max(0, target.carbs - consumed.carbs),
      fat: Math.max(0, target.fat - consumed.fat),
    };

    const stats = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    return {
      target,
      consumed,
      remaining,
      waterOz: stats?.waterOz ?? 0,
    };
  },
});







