import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get the mind garden state for a user
 */
export const getGardenState = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("mindGardenState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return state ?? {
      userId: args.userId,
      level: 1,
      xp: 0,
      tokens: 0,
      meditationStreak: 0,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Get all quests for a user for a specific date
 */
export const getUserQuests = query({
  args: {
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quests")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
  },
});

/**
 * Update quest progress and award rewards if completed
 */
export const updateQuestProgress = mutation({
  args: {
    userId: v.id("users"),
    requirementType: v.string(),
    increment: v.float64(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const quests = await ctx.db
      .query("quests")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("requirementType"), args.requirementType))
      .collect();

    for (const quest of quests) {
      if (quest.completed) continue;

      const newCurrent = Math.min(quest.requirementValue, quest.currentValue + args.increment);
      const isNowCompleted = newCurrent >= quest.requirementValue;

      await ctx.db.patch(quest._id, {
        currentValue: newCurrent,
        completed: isNowCompleted,
      });

      if (isNowCompleted) {
        // Award rewards
        const state = await ctx.db
          .query("mindGardenState")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .first();

        if (state) {
          const newXp = state.xp + quest.xpReward;
          const newTokens = state.tokens + quest.tokenReward;
          
          // Level up logic: Level = floor(sqrt(totalXp / 100)) + 1
          // totalXp here is cumulative. If we reset xp each level, the logic is different.
          // Let's assume xp is cumulative for now.
          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

          await ctx.db.patch(state._id, {
            xp: newXp,
            tokens: newTokens,
            level: newLevel,
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

/**
 * Create initial daily quests for a user
 */
export const createInitialQuests = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if quests already exist for this date
    const existing = await ctx.db
      .query("quests")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) return;

    const defaultQuests = [
      {
        title: "Daily Calm",
        description: "Meditate for 10 minutes",
        type: "daily" as const,
        requirementType: "meditation",
        requirementValue: 10,
        xpReward: 50,
        tokenReward: 5,
      },
      {
        title: "Hydration Hero",
        description: "Drink 64oz of water",
        type: "daily" as const,
        requirementType: "water",
        requirementValue: 64,
        xpReward: 30,
        tokenReward: 2,
      },
      {
        title: "Active Move",
        description: "Complete 1 workout",
        type: "daily" as const,
        requirementType: "workout",
        requirementValue: 1,
        xpReward: 100,
        tokenReward: 10,
      },
    ];

    for (const q of defaultQuests) {
      await ctx.db.insert("quests", {
        userId: args.userId,
        ...q,
        currentValue: 0,
        completed: false,
        date: args.date,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Get achievements for a user
 */
export const getAchievements = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Unlock an achievement
 */
export const unlockAchievement = mutation({
  args: {
    userId: v.id("users"),
    badgeId: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("achievements", {
      userId: args.userId,
      badgeId: args.badgeId,
      title: args.title,
      description: args.description,
      icon: args.icon,
      unlockedAt: Date.now(),
    });
  },
});
