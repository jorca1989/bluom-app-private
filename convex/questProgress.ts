import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

const DEFAULT_DAILY_QUESTS = [
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
] as const;

export async function ensureDailyQuests(ctx: MutationCtx, userId: any, date: string) {
  const existing = await ctx.db
    .query("quests")
    .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
    .first();
  if (existing) return;

  const now = Date.now();
  for (const q of DEFAULT_DAILY_QUESTS) {
    await ctx.db.insert("quests", {
      userId,
      ...q,
      currentValue: 0,
      completed: false,
      date,
      createdAt: now,
    });
  }
}

export async function incrementQuestProgress(
  ctx: MutationCtx,
  userId: any,
  date: string,
  requirementType: string,
  increment: number
) {
  await ensureDailyQuests(ctx, userId, date);

  const quests = await ctx.db
    .query("quests")
    .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
    .filter((q) => q.eq(q.field("requirementType"), requirementType))
    .collect();

  for (const quest of quests) {
    const next = Math.max(
      0,
      Math.min(quest.requirementValue, quest.currentValue + increment)
    );
    const isNowCompleted = next >= quest.requirementValue;

    await ctx.db.patch(quest._id, {
      currentValue: next,
      completed: isNowCompleted,
    });

    if (isNowCompleted) {
      const state = await ctx.db
        .query("mindGardenState")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!state) {
        await ctx.db.insert("mindGardenState", {
          userId,
          xp: quest.xpReward,
          level: 1,
          tokens: quest.tokenReward,
          meditationStreak: 0,
          lastMeditationDate: undefined,
          updatedAt: Date.now(),
        });
      } else {
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
}










