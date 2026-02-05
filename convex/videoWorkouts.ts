import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

// --- Admin Mutations ---

export const createWorkout = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        thumbnail: v.string(),
        videoUrl: v.optional(v.string()),
        duration: v.float64(),
        calories: v.float64(),
        difficulty: v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced")),
        category: v.string(),
        equipment: v.array(v.string()),
        instructor: v.string(),
        isPremium: v.boolean(),
        exercises: v.array(
            v.object({
                name: v.string(),
                duration: v.float64(),
                reps: v.optional(v.float64()),
                sets: v.optional(v.float64()),
                description: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const workoutId = await ctx.db.insert("videoWorkouts", {
            ...args,
            titleLower: args.title.toLowerCase(),
            rating: 5.0,
            reviews: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return workoutId;
    },
});

export const updateWorkout = mutation({
    args: {
        id: v.id("videoWorkouts"),
        updates: v.object({
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            thumbnail: v.optional(v.string()),
            videoUrl: v.optional(v.string()),
            duration: v.optional(v.float64()),
            calories: v.optional(v.float64()),
            difficulty: v.optional(v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced"))),
            category: v.optional(v.string()),
            equipment: v.optional(v.array(v.string())),
            instructor: v.optional(v.string()),
            isPremium: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        if (args.updates.title) {
            (args.updates as any).titleLower = args.updates.title.toLowerCase();
        }
        await ctx.db.patch(args.id, {
            ...args.updates,
            updatedAt: Date.now(),
        });
    },
});

export const deleteWorkout = mutation({
    args: { id: v.id("videoWorkouts") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.id);
    },
});

// --- Public Queries ---

export const list = query({
    args: {
        category: v.optional(v.string()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let workouts = await ctx.db.query("videoWorkouts").order("desc").collect();

        if (args.category && args.category !== "All") {
            workouts = workouts.filter((w) => w.category === args.category);
        }

        if (args.search) {
            const s = args.search.toLowerCase();
            workouts = workouts.filter(
                (w) => w.titleLower.includes(s) || w.description.toLowerCase().includes(s)
            );
        }

        return workouts;
    },
});

export const getById = query({
    args: { id: v.id("videoWorkouts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
