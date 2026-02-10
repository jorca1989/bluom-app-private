import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new Life Goal
export const create = mutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        status: v.string(),
        weblink: v.optional(v.string()),
        targetCost: v.optional(v.float64()),
        startDate: v.optional(v.string()),
        deadline: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const goalId = await ctx.db.insert("lifeGoals", {
            ...args,
        });
        return goalId;
    },
});

// Update an existing Life Goal
export const update = mutation({
    args: {
        goalId: v.id("lifeGoals"),
        updates: v.object({
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            category: v.optional(v.string()),
            status: v.optional(v.string()),
            weblink: v.optional(v.string()),
            targetCost: v.optional(v.float64()),
            startDate: v.optional(v.string()),
            deadline: v.optional(v.string()),
            completedAt: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.goalId, args.updates);
    },
});

// Delete a Life Goal
export const remove = mutation({
    args: { goalId: v.id("lifeGoals") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.goalId);
    },
});

// Get all Life Goals for a user
export const list = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("lifeGoals")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

// Get Life Goals by Status
export const listByStatus = query({
    args: { userId: v.id("users"), status: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("lifeGoals")
            .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", args.status))
            .collect();
    },
});
