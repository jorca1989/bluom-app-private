import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
