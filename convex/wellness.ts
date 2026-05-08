import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementQuestProgress } from "./questProgress";
import { isProOrAdmin } from "./access";

/**
 * Log mood entry
 */
export const logMood = mutation({
  args: {
    userId: v.id("users"),
    mood: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5)
    ),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Map mood number to emoji
    const moodEmojiMap: Record<number, string> = {
      1: "😢",
      2: "😟",
      3: "😐",
      4: "🙂",
      5: "😄",
    };

    const moodLogId = await ctx.db.insert("moodLogs", {
      userId: args.userId,
      mood: args.mood,
      moodEmoji: moodEmojiMap[args.mood],
      note: args.note,
      tags: args.tags,
      date: args.date,
      timestamp: Date.now(),
    });

    return moodLogId;
  },
});

/**
 * Get mood log for a specific date (used for cross-module sync like Sugar Control)
 */
export const getMoodForDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
    if (logs.length === 0) return null;
    return logs.reduce((best, cur) =>
      (cur.timestamp ?? 0) >= (best.timestamp ?? 0) ? cur : best
    );
  },
});

/**
 * Get today's wellness log (Alias for getMoodForDate used in Optimization Hubs)
 */
export const getTodayLog = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
    if (logs.length === 0) return null;
    return logs.reduce((best, cur) =>
      (cur.timestamp ?? 0) >= (best.timestamp ?? 0) ? cur : best
    );
  },
});

/**
 * Upsert mood for a date (prevents duplicate "today" moods across modules)
 */
export const upsertMoodForDate = mutation({
  args: {
    userId: v.id("users"),
    mood: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5)
    ),
    date: v.string(), // YYYY-MM-DD
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const moodEmojiMap: Record<number, string> = {
      1: "😢",
      2: "😟",
      3: "😐",
      4: "🙂",
      5: "😄",
    };

    const existing = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    const now = Date.now();
    if (existing.length === 0) {
      return await ctx.db.insert("moodLogs", {
        userId: args.userId,
        mood: args.mood,
        moodEmoji: moodEmojiMap[args.mood],
        note: args.note,
        tags: args.tags,
        date: args.date,
        timestamp: now,
      });
    }

    const keep = existing.reduce((best, cur) =>
      (cur.timestamp ?? 0) >= (best.timestamp ?? 0) ? cur : best
    );

    await ctx.db.patch(keep._id, {
      mood: args.mood,
      moodEmoji: moodEmojiMap[args.mood],
      note: args.note,
      tags: args.tags,
      date: args.date,
      timestamp: now,
    });

    // Clean up any duplicates for the same date (optional, but prevents "Not set" from picking an older record)
    for (const l of existing) {
      if (l._id !== keep._id) {
        await ctx.db.delete(l._id);
      }
    }

    return keep._id;
  },
});

/**
 * Log sleep entry
 */
export const logSleep = mutation({
  args: {
    userId: v.id("users"),
    hours: v.float64(),
    quality: v.float64(),
    bedTime: v.optional(v.string()),
    wakeTime: v.optional(v.string()),
    note: v.optional(v.string()),
    factors: v.optional(v.array(v.string())),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate quality is between 0-100
    if (args.quality < 0 || args.quality > 100) {
      throw new Error("Sleep quality must be between 0-100");
    }

    const sleepLogId = await ctx.db.insert("sleepLogs", {
      userId: args.userId,
      hours: args.hours,
      quality: args.quality,
      bedTime: args.bedTime,
      wakeTime: args.wakeTime,
      note: args.note,
      factors: args.factors,
      date: args.date,
      timestamp: Date.now(),
    });

    return sleepLogId;
  },
});

/**
 * Get mood logs for date range
 */
export const getMoodLogs = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();
  },
});

/**
 * Get weekly mood trend
 */
export const getWeeklyMoodTrend = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const weekLogs = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    if (weekLogs.length === 0) {
      return { averageMood: 0, trendEmoji: "😐", totalEntries: 0 };
    }

    const averageMood =
      weekLogs.reduce((acc, log) => acc + log.mood, 0) / weekLogs.length;

    // Map average to emoji
    let trendEmoji = "😐";
    if (averageMood >= 4.5) trendEmoji = "😄";
    else if (averageMood >= 3.5) trendEmoji = "🙂";
    else if (averageMood >= 2.5) trendEmoji = "😐";
    else if (averageMood >= 1.5) trendEmoji = "😟";
    else trendEmoji = "😢";

    return {
      averageMood: Math.round(averageMood * 10) / 10,
      trendEmoji,
      totalEntries: weekLogs.length,
    };
  },
});

/**
 * Get sleep logs for date range
 */
export const getSleepLogs = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sleepLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();
  },
});

/**
 * Get average sleep stats for week
 */
export const getWeeklySleepStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const weekLogs = await ctx.db
      .query("sleepLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    if (weekLogs.length === 0) {
      return { averageHours: 0, averageQuality: 0, totalNights: 0 };
    }

    const averageHours =
      weekLogs.reduce((acc, log) => acc + log.hours, 0) / weekLogs.length;
    const averageQuality =
      weekLogs.reduce((acc, log) => acc + log.quality, 0) / weekLogs.length;

    return {
      averageHours: Math.round(averageHours * 10) / 10,
      averageQuality: Math.round(averageQuality),
      totalNights: weekLogs.length,
    };
  },
});

/**
 * Delete mood log
 */
export const deleteMoodLog = mutation({
  args: {
    logId: v.id("moodLogs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logId);
  },
});

/**
 * Log meditation session
 */
export const logMeditation = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    durationMinutes: v.float64(),
    sessionId: v.optional(v.id("meditationSessions")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("meditationLogs", {
      userId: args.userId,
      title: args.title,
      durationMinutes: args.durationMinutes,
      sessionId: args.sessionId,
      date: args.date,
      timestamp: Date.now(),
    });

    // quest progress: meditation (minutes)
    await incrementQuestProgress(ctx, args.userId, args.date, "meditation", args.durationMinutes);

    // Award XP/Tokens and update streak
    const state = await ctx.db
      .query("mindGardenState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const xpEarned = args.durationMinutes * 10;
    const tokensEarned = Math.floor(args.durationMinutes / 5);

    if (!state) {
      await ctx.db.insert("mindGardenState", {
        userId: args.userId,
        level: 1,
        xp: xpEarned,
        tokens: tokensEarned,
        meditationStreak: 1,
        lastMeditationDate: args.date,
        updatedAt: Date.now(),
      });
    } else {
      const yesterday = new Date(args.date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = state.meditationStreak;
      if (state.lastMeditationDate === yesterdayStr) {
        newStreak += 1;
      } else if (state.lastMeditationDate !== args.date) {
        newStreak = 1;
      }

      const newXp = state.xp + xpEarned;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      await ctx.db.patch(state._id, {
        xp: newXp,
        level: newLevel,
        tokens: state.tokens + tokensEarned,
        meditationStreak: newStreak,
        lastMeditationDate: args.date,
        updatedAt: Date.now(),
      });
    }

    return logId;
  },
});

/**
 * Get meditation catalog
 */
export const getMeditationSessions = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("meditationSessions")
        .withIndex("by_category", (dbq) => dbq.eq("category", args.category!))
        .collect();
    }
    return await ctx.db.query("meditationSessions").collect();
  },
});

/**
 * Get meditation logs
 */
export const getMeditationLogs = query({
  args: { userId: v.id("users"), limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meditationLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

/**
 * Get games progress for user
 */
export const getGamesProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gamesProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Complete a game session and update daily limits + high score.
 */
export const completeGameSession = mutation({
  args: {
    userId: v.id("users"),
    gameId: v.string(),
    gameName: v.string(),
    score: v.optional(v.float64()),
    reactionMs: v.optional(v.float64()),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const u = await ctx.db.get(args.userId);
    if (!u) throw new Error("User not found");

    // Enforce daily limit server-side for free users: max 2 plays/day across all games.
    if (!isProOrAdmin(u)) {
      const all = await ctx.db
        .query("gamesProgress")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      const totalToday = all.reduce((acc, gp) => {
        if (gp.lastResetDate === args.date) return acc + (gp.playsToday ?? 0);
        return acc;
      }, 0);
      if (totalToday >= 2) {
        throw new Error("Daily game limit reached for free users");
      }
    }

    const existing = await ctx.db
      .query("gamesProgress")
      .withIndex("by_user_and_game", (q) =>
        q.eq("userId", args.userId).eq("gameId", args.gameId)
      )
      .first();

    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("gamesProgress", {
        userId: args.userId,
        gameId: args.gameId,
        gameName: args.gameName,
        highScore: args.score ?? 0,
        timesPlayed: 1,
        lastPlayedDate: args.date,
        playsToday: 1,
        lastResetDate: args.date,
        createdAt: now,
        updatedAt: now,
      });
      return { playsToday: 1, highScore: args.score ?? 0 };
    }

    const resetNeeded = existing.lastResetDate !== args.date;
    const playsToday = resetNeeded ? 1 : existing.playsToday + 1;
    const nextHighScore =
      args.score === undefined ? existing.highScore : Math.max(existing.highScore, args.score);

    await ctx.db.patch(existing._id, {
      highScore: nextHighScore,
      timesPlayed: existing.timesPlayed + 1,
      lastPlayedDate: args.date,
      playsToday,
      lastResetDate: args.date,
      updatedAt: now,
    });

    return { playsToday, highScore: nextHighScore };
  },
});

/**
 * Delete sleep log
 */
export const deleteSleepLog = mutation({
  args: {
    logId: v.id("sleepLogs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logId);
  },
});
