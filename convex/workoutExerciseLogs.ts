import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log an exercise from a workout
export const logExercise = mutation({
    args: {
        userId: v.id("users"),
        workoutId: v.id("videoWorkouts"),
        exerciseName: v.string(),
        date: v.string(), // "YYYY-MM-DD"
        sets: v.optional(
            v.array(
                v.object({
                    weight: v.float64(),
                    reps: v.float64(),
                })
            )
        ),
        duration: v.optional(v.float64()), // minutes
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const logId = await ctx.db.insert("workoutExerciseLogs", {
            userId: args.userId,
            workoutId: args.workoutId,
            exerciseName: args.exerciseName,
            date: args.date,
            sets: args.sets,
            duration: args.duration,
            notes: args.notes,
            createdAt: Date.now(),
        });
        return logId;
    },
});

// Get exercise history for a specific exercise
export const getExerciseHistory = query({
    args: {
        userId: v.id("users"),
        exerciseName: v.string(),
    },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("workoutExerciseLogs")
            .withIndex("by_user_exercise", (q) =>
                q.eq("userId", args.userId).eq("exerciseName", args.exerciseName)
            )
            .order("desc")
            .take(50); // Last 50 logs

        return logs;
    },
});

// Get exercise progress stats (max weight, max volume)
export const getExerciseProgress = query({
    args: {
        userId: v.id("users"),
        exerciseName: v.string(),
    },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("workoutExerciseLogs")
            .withIndex("by_user_exercise", (q) =>
                q.eq("userId", args.userId).eq("exerciseName", args.exerciseName)
            )
            .collect();

        if (logs.length === 0) {
            return null;
        }

        let maxWeight = 0;
        let maxVolume = 0;
        let totalReps = 0;

        logs.forEach((log) => {
            if (log.sets) {
                log.sets.forEach((set) => {
                    if (set.weight > maxWeight) maxWeight = set.weight;
                    const volume = set.weight * set.reps;
                    if (volume > maxVolume) maxVolume = volume;
                    totalReps += set.reps;
                });
            }
        });

        return {
            maxWeight,
            maxVolume,
            totalReps,
            totalSessions: logs.length,
        };
    },
});
