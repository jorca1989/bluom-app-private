import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementQuestProgress } from "./questProgress";
import { isProOrAdmin } from "./access";

/**
 * Get all active meditation sessions
 */
export const getSessions = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let sessions;
    if (args.category) {
      sessions = await ctx.db
        .query("meditationSessions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      sessions = await ctx.db.query("meditationSessions").collect();
    }
    return sessions
      .filter(s => s.status !== 'draft')
      .map(s => ({ ...s, tags: s.tags ?? [] }));
  },
});

/**
 * Start a meditation session
 */
export const startSession = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("meditationSessions")),
    title: v.string(),
    durationMinutes: v.float64(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Defensive guard for store submission: if the user hasn't been fully created/synced yet,
    // don't crash the client with a server error.
    if (!user) return null as any;

    // Guided session content is still being curated. If a placeholder call happens without a real sessionId,
    // ignore it to avoid production console noise.
    if (!args.sessionId) return null as any;

    if (!isProOrAdmin(user)) {
      // Free users: max 3 meditations/day
      const todayLogs = await ctx.db
        .query("meditationLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
        .collect();
      if (todayLogs.length >= 3) {
        throw new Error("Daily meditation limit reached for free users");
      }
    }

    return await ctx.db.insert("meditationLogs", {
      userId: args.userId,
      sessionId: args.sessionId,
      title: args.title,
      durationMinutes: args.durationMinutes,
      date: args.date,
      timestamp: Date.now(),
    });
  },
});

/**
 * Complete a meditation session and award XP/Tokens
 */
export const completeSession = mutation({
  args: {
    logId: v.id("meditationLogs"),
    durationCompleted: v.float64(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    // Update Mind Garden State
    const gardenState = await ctx.db
      .query("mindGardenState")
      .withIndex("by_user", (q) => q.eq("userId", log.userId))
      .first();

    const xpAwarded = args.durationCompleted * 10;
    const tokensAwarded = Math.floor(args.durationCompleted / 5);

    // quest progress: meditation (minutes)
    await incrementQuestProgress(ctx, log.userId, log.date, "meditation", args.durationCompleted);

    if (gardenState) {
      const newXp = gardenState.xp + xpAwarded;
      const newTokens = gardenState.tokens + tokensAwarded;
      const xpForNextLevel = gardenState.level * gardenState.level * 100;

      let newLevel = gardenState.level;
      let finalXp = newXp;

      if (finalXp >= xpForNextLevel) {
        finalXp -= xpForNextLevel;
        newLevel += 1;
      }

      await ctx.db.patch(gardenState._id, {
        xp: finalXp,
        tokens: newTokens,
        level: newLevel,
        meditationStreak: (gardenState.lastMeditationDate === log.date) ? gardenState.meditationStreak : gardenState.meditationStreak + 1,
        lastMeditationDate: log.date,
        updatedAt: Date.now(),
      });

      return { xpAwarded, tokensAwarded, levelUp: newLevel > gardenState.level, newLevel };
    } else {
      await ctx.db.insert("mindGardenState", {
        userId: log.userId,
        level: 1,
        xp: xpAwarded,
        tokens: tokensAwarded,
        meditationStreak: 1,
        lastMeditationDate: log.date,
        updatedAt: Date.now(),
      });
      return { xpAwarded, tokensAwarded, levelUp: false, newLevel: 1 };
    }
  },
});
