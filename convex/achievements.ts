import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserAchievements = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const earnAchievement = mutation({
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

    if (existing) return;

    await ctx.db.insert("achievements", {
      userId: args.userId,
      badgeId: args.badgeId,
      title: args.title,
      description: args.description,
      icon: args.icon,
      unlockedAt: Date.now(),
    });
  },
});
