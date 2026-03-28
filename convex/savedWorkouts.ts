import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Toggle save/favorite a workout
export const toggleSaveWorkout = mutation({
    args: {
        userId: v.id("users"),
        workoutId: v.id("videoWorkouts"),
    },
    handler: async (ctx, args) => {
        // Check if already saved
        const existing = await ctx.db
            .query("savedWorkouts")
            .withIndex("by_user_workout", (q) =>
                q.eq("userId", args.userId).eq("workoutId", args.workoutId)
            )
            .first();

        if (existing) {
            // Unsave
            await ctx.db.delete(existing._id);
            return { saved: false };
        } else {
            // Save
            await ctx.db.insert("savedWorkouts", {
                userId: args.userId,
                workoutId: args.workoutId,
                savedAt: Date.now(),
            });
            return { saved: true };
        }
    },
});

// Check if a workout is saved by user
export const isWorkoutSaved = query({
    args: {
        userId: v.id("users"),
        workoutId: v.id("videoWorkouts"),
    },
    handler: async (ctx, args) => {
        const saved = await ctx.db
            .query("savedWorkouts")
            .withIndex("by_user_workout", (q) =>
                q.eq("userId", args.userId).eq("workoutId", args.workoutId)
            )
            .first();
        return !!saved;
    },
});

// Get all saved workouts for a user
export const getSavedWorkouts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const saved = await ctx.db
            .query("savedWorkouts")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const workouts = await Promise.all(
            saved.map(async (s) => {
                const workout = await ctx.db.get(s.workoutId);
                return workout ? { ...workout, savedAt: s.savedAt } : null;
            })
        );

        return workouts.filter((w) => w !== null);
    },
});
