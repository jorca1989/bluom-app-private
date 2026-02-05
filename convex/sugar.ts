import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isProOrAdmin } from "./access";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export const getDailyStatus = query({
  args: {
    userId: v.id("users"),
    date: v.optional(v.string()), // defaults to today
  },
  handler: async (ctx, args) => {
    const date = (args.date ?? todayIsoDate()).slice(0, 10);
    return await ctx.db
      .query("sugarLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", date))
      .first();
  },
});

export const logDailyStatus = mutation({
  args: {
    userId: v.id("users"),
    date: v.optional(v.string()), // defaults to today
    isSugarFree: v.boolean(),
    mood: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = (args.date ?? todayIsoDate()).slice(0, 10);
    const existing = await ctx.db
      .query("sugarLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", date))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        isSugarFree: args.isSugarFree,
        mood: args.mood,
        notes: args.notes,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("sugarLogs", {
      userId: args.userId,
      date,
      isSugarFree: args.isSugarFree,
      mood: args.mood,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const startChallenge = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(), // "90-day-reset", "120-day-reset", etc.
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("challenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", args.type))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { startDate: now, currentStreak: 0, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("challenges", {
      userId: args.userId,
      type: args.type,
      startDate: now,
      currentStreak: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getResetProgress = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()), // default 90
    asOf: v.optional(v.string()), // default today
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const isUnlocked = isProOrAdmin(user);
    const days = Math.max(1, Math.min(365, Math.floor(args.days ?? 90)));
    const asOf = (args.asOf ?? todayIsoDate()).slice(0, 10);

    // Count consecutive sugar-free days backwards from asOf
    const all = await ctx.db
      .query("sugarLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const byDate = new Map(all.map((l) => [l.date, l]));

    let streak = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(asOf);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const log = byDate.get(key);
      if (!log || !log.isSugarFree) break;
      streak += 1;
    }

    const progress = Math.min(1, streak / days);
    return {
      isUnlocked,
      days,
      asOf,
      streak,
      progress,
    };
  },
});

export const getMotivationalQuote = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!isProOrAdmin(user)) {
      return { locked: true, quote: "Upgrade to Pro to unlock SOS support." };
    }

    const quotes = [
      "Cravings peak, then pass. You don’t have to obey them.",
      "One decision right now changes the next hour.",
      "Delay by 60 seconds. Breathe. Let the wave roll through.",
      "You’re not starting over. You’re continuing with more wisdom.",
      "Choose the next best action, not the perfect one.",
      "Your future self is watching—make them proud.",
    ];
    const pick = quotes[Math.floor(Math.random() * quotes.length)];
    return { locked: false, quote: pick };
  },
});


