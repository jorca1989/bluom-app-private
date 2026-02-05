import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- Queries ---

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("programs").order("desc").collect();
    },
});

export const getById = query({
    args: { programId: v.id("programs") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.programId);
    },
});

export const getEnrolledProgram = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const plans = await ctx.db
            .query("wellnessPlans")
            .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
            .first();

        if (!plans?.currentMasterPlanId) return null;

        const program = await ctx.db.get(plans.currentMasterPlanId);
        if (!program) return null;

        // Calculate progress
        const now = Date.now();
        const start = plans.programStartDate ?? now;
        const msPerDay = 86400000;
        const progressDay = Math.floor((now - start) / msPerDay) + 1;

        return {
            ...program,
            progressDay: Math.max(1, progressDay)
        };
    },
});

// --- Mutations ---

export const create = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        coverImage: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        isPremium: v.boolean(),
        contentList: v.array(
            v.object({
                day: v.float64(),
                type: v.union(v.literal("meditation"), v.literal("article"), v.literal("exercise"), v.literal("recipe")),
                contentId: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Ideally verify admin via ctx.auth or similar logic
        const programId = await ctx.db.insert("programs", {
            ...args,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return programId;
    },
});

export const enrollUser = mutation({
    args: {
        userId: v.id("users"),
        programId: v.id("programs"),
    },
    handler: async (ctx, args) => {
        // 1. Find active wellness plan
        const wellnessPlan = await ctx.db
            .query("wellnessPlans")
            .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
            .first();

        if (wellnessPlan) {
            await ctx.db.patch(wellnessPlan._id, {
                currentMasterPlanId: args.programId,
                programStartDate: Date.now()
            });
        } else {
            // Create a shell plan if none exists (unlikely in this flow but safe)
            await ctx.db.insert("wellnessPlans", {
                userId: args.userId,
                name: "My Wellness Plan",
                isActive: true,
                currentMasterPlanId: args.programId,
                programStartDate: Date.now(),
                createdAt: Date.now(),
                // Defaults
                sleepRecommendation: { targetHours: 8, bedTimeWindow: "22:00-06:00", tips: [] },
                meditationRecommendation: { frequencyPerWeek: 7, sessionDuration: 10, style: "mindfulness" },
                recommendedHabits: [],
            });
        }

        // Also update other plans if necessary, but Wellness is the primary "Master" holder for now
        return { success: true };
    },
});
