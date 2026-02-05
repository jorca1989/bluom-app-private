import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Submit a support ticket (Bug or Feedback)
 */
export const submitSupportTicket = mutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    category: v.union(v.literal("bug"), v.literal("feedback")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("support_tickets", {
      userId: args.userId,
      userEmail: args.userEmail,
      category: args.category,
      message: args.message,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get AI Coach message count for today
 */
export const getAiMessageCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return 0;
    
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastResetDate !== today) {
      return 0; // Will be reset on first increment
    }
    
    return user.dailyAiMessages ?? 0;
  },
});

/**
 * Increment AI Coach message count
 */
export const incrementAiMessageCount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().slice(0, 10);
    let count = user.dailyAiMessages ?? 0;

    if (user.lastResetDate !== today) {
      count = 1;
    } else {
      count += 1;
    }

    await ctx.db.patch(args.userId, {
      dailyAiMessages: count,
      lastResetDate: today,
    });

    return count;
  },
});

