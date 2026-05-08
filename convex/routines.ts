import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoutine = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        plannedVolume: v.optional(v.number()),
        estimatedDuration: v.optional(v.number()),
        estimatedCalories: v.optional(v.number()),
        exercises: v.array(v.object({
            name: v.string(),
            sets: v.number(),
            reps: v.string(),
            weight: v.optional(v.string()),
            rest: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const userId = await ctx.auth.getUserIdentity();
        if (!userId) {
            throw new Error("Unauthenticated call to createRoutine");
        }

        // Get the user document to link by ID
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId.subject))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const routineId = await ctx.db.insert("routines", {
            userId: user._id,
            name: args.name,
            description: args.description,
            plannedVolume: args.plannedVolume,
            estimatedDuration: args.estimatedDuration,
            estimatedCalories: args.estimatedCalories,
            exercises: args.exercises,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return routineId;
    },
});

export const listRoutines = query({
    args: {},
    handler: async (ctx) => {
        const userId = await ctx.auth.getUserIdentity();
        if (!userId) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId.subject))
            .first();

        if (!user) return [];

        return await ctx.db
            .query("routines")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();
    },
});

export const deleteRoutine = mutation({
    args: {
        routineId: v.id("routines"),
    },
    handler: async (ctx, args) => {
        const userId = await ctx.auth.getUserIdentity();
        if (!userId) {
            throw new Error("Unauthenticated call to deleteRoutine");
        }
        // Verify ownership? Or just rely on RLS logic if implemented (currently no RLS on delete, assuming client passes correct ID owned by them.
        // Good practice: check if user owns it.
        const routine = await ctx.db.get(args.routineId);
        if (!routine) {
            throw new Error("Routine not found");
        }

        // Check ownership
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId.subject))
            .first();

        if (!user || routine.userId !== user._id) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.routineId);
    },
});
