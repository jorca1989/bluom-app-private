import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listAiCoachMessages = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const rows = await ctx.db
      .query("ai_coach_messages")
      .withIndex("by_user_createdAt", q => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return rows.reverse();
  },
});

export const addAiCoachMessage = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("coach")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ai_coach_messages", {
      userId: args.userId,
      role: args.role,
      content: args.content,
      createdAt: now,
    });
  },
});

