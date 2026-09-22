import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower, checkAdminScriptKey } from "./functions";

// ─── Exercise validator (full schema) ─────────────────────────────────────────
const listLocalizationsValidator = v.optional(v.object({
    pt: v.optional(v.array(v.string())),
    es: v.optional(v.array(v.string())),
    fr: v.optional(v.array(v.string())),
    de: v.optional(v.array(v.string())),
    nl: v.optional(v.array(v.string())),
    bg: v.optional(v.array(v.string())),
    da: v.optional(v.array(v.string())),
    el: v.optional(v.array(v.string())),
    lt: v.optional(v.array(v.string())),
    lv: v.optional(v.array(v.string())),
    no: v.optional(v.array(v.string())),
    pl: v.optional(v.array(v.string())),
    ro: v.optional(v.array(v.string())),
    sv: v.optional(v.array(v.string())),
    tr: v.optional(v.array(v.string())),
}));

const stringListLocalizationsValidator = v.optional(v.object({
    pt: v.optional(v.array(v.string())),
    es: v.optional(v.array(v.string())),
    fr: v.optional(v.array(v.string())),
    de: v.optional(v.array(v.string())),
    nl: v.optional(v.array(v.string())),
    bg: v.optional(v.array(v.string())),
    da: v.optional(v.array(v.string())),
    el: v.optional(v.array(v.string())),
    lt: v.optional(v.array(v.string())),
    lv: v.optional(v.array(v.string())),
    no: v.optional(v.array(v.string())),
    pl: v.optional(v.array(v.string())),
    ro: v.optional(v.array(v.string())),
    sv: v.optional(v.array(v.string())),
    tr: v.optional(v.array(v.string())),
}));

const exerciseValidator = v.object({
    name: v.string(),
    duration: v.float64(),           // seconds
    reps: v.optional(v.float64()),
    sets: v.optional(v.float64()),
    description: v.string(),
    instructions: v.optional(v.array(v.string())),
    instructionsLocalizations: listLocalizationsValidator,
    primaryMuscles: v.optional(v.array(v.string())),
    primaryMusclesLocalizations: stringListLocalizationsValidator,
    secondaryMuscles: v.optional(v.array(v.string())),
    secondaryMusclesLocalizations: stringListLocalizationsValidator,
    exerciseType: v.optional(v.string()),
    exerciseTypes: v.optional(v.array(v.string())), // multi-type support
});

// ─── Shared localization validator ───────────────────────────────────────────
const localizationsValidator = v.optional(v.object({
    pt: v.optional(v.string()),
    es: v.optional(v.string()),
    fr: v.optional(v.string()),
    de: v.optional(v.string()),
    nl: v.optional(v.string()),
    bg: v.optional(v.string()),
    da: v.optional(v.string()),
    el: v.optional(v.string()),
    lt: v.optional(v.string()),
    lv: v.optional(v.string()),
    no: v.optional(v.string()),
    pl: v.optional(v.string()),
    ro: v.optional(v.string()),
    sv: v.optional(v.string()),
    tr: v.optional(v.string()),
}));

// ─── Admin Mutations ──────────────────────────────────────────────────────────

export const createWorkout = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        titleLocalizations: localizationsValidator,
        descriptionLocalizations: localizationsValidator,
        thumbnail: v.string(),
        thumbnailMale: v.optional(v.string()),
        thumbnailFemale: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        videoUrlMale: v.optional(v.string()),
        videoUrlFemale: v.optional(v.string()),
        duration: v.float64(),
        calories: v.float64(),
        difficulty: v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced")),
        category: v.string(),
        categories: v.optional(v.array(v.string())),
        muscleGroupTags: v.optional(v.array(v.string())),
        equipment: v.array(v.string()),
        optionalEquipment: v.optional(v.array(v.string())),
        instructor: v.string(),
        isPremium: v.boolean(),
        exercises: v.array(exerciseValidator),
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
            titleLocalizations: localizationsValidator,
            descriptionLocalizations: localizationsValidator,
            thumbnail: v.optional(v.string()),
            thumbnailMale: v.optional(v.string()),
            thumbnailFemale: v.optional(v.string()),
            videoUrl: v.optional(v.string()),
            videoUrlMale: v.optional(v.string()),
            videoUrlFemale: v.optional(v.string()),
            duration: v.optional(v.float64()),
            calories: v.optional(v.float64()),
            difficulty: v.optional(v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced"))),
            category: v.optional(v.string()),
            categories: v.optional(v.array(v.string())),
            muscleGroupTags: v.optional(v.array(v.string())),
            equipment: v.optional(v.array(v.string())),
            optionalEquipment: v.optional(v.array(v.string())),
            instructor: v.optional(v.string()),
            isPremium: v.optional(v.boolean()),
            exercises: v.optional(v.array(exerciseValidator)),
        }),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const patch: any = { ...args.updates, updatedAt: Date.now() };
        if (args.updates.title) {
            patch.titleLower = args.updates.title.toLowerCase();
        }
        await ctx.db.patch(args.id, patch);
    },
});

export const deleteWorkout = mutation({
    args: { id: v.id("videoWorkouts") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.id);
    },
});

// ─── Script Automation Mutations (Protected by ADMIN_SCRIPT_KEY) ─────────────

export const upsertWorkoutViaScript = mutation({
    args: {
        scriptKey: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        titleLocalizations: localizationsValidator,
        descriptionLocalizations: localizationsValidator,
        thumbnail: v.optional(v.string()),
        thumbnailMale: v.optional(v.string()),
        thumbnailFemale: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        videoUrlMale: v.optional(v.string()),
        videoUrlFemale: v.optional(v.string()),
        duration: v.optional(v.float64()),
        calories: v.optional(v.float64()),
        difficulty: v.optional(v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced"))),
        category: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        muscleGroupTags: v.optional(v.array(v.string())),
        equipment: v.optional(v.array(v.string())),
        optionalEquipment: v.optional(v.array(v.string())),
        instructor: v.optional(v.string()),
        isPremium: v.optional(v.boolean()),
        exercises: v.optional(v.array(exerciseValidator)),
    },
    handler: async (ctx, args) => {
        checkAdminScriptKey(args.scriptKey);
        const { scriptKey, ...data } = args;

        const titleLower = data.title.trim().toLowerCase();
        const existing = await ctx.db
            .query("videoWorkouts")
            .filter(q => q.eq(q.field("titleLower"), titleLower))
            .first();

        const defaultExercises = data.exercises && data.exercises.length > 0
            ? data.exercises
            : [{
                name: data.title,
                duration: data.duration ?? 0,
                description: data.description ?? data.title,
                primaryMuscles: data.muscleGroupTags ?? [],
                exerciseTypes: data.categories ?? [data.category ?? 'Strength'],
            }];

        const category = data.category ?? data.muscleGroupTags?.[0] ?? "Full Body";
        const thumbnail = data.thumbnail ?? data.thumbnailMale ?? data.thumbnailFemale ?? data.videoUrl ?? "";

        const payload = {
            title: data.title.trim(),
            titleLower,
            description: data.description ?? data.title,
            titleLocalizations: data.titleLocalizations,
            descriptionLocalizations: data.descriptionLocalizations,
            thumbnail,
            thumbnailMale: data.thumbnailMale,
            thumbnailFemale: data.thumbnailFemale,
            videoUrl: data.videoUrl,
            videoUrlMale: data.videoUrlMale,
            videoUrlFemale: data.videoUrlFemale,
            duration: data.duration ?? 0,
            calories: data.calories ?? 0,
            difficulty: data.difficulty ?? "Beginner",
            category,
            categories: data.categories ?? (data.muscleGroupTags ? [...data.muscleGroupTags] : [category]),
            muscleGroupTags: data.muscleGroupTags ?? [],
            equipment: data.equipment ?? [],
            optionalEquipment: data.optionalEquipment,
            instructor: data.instructor ?? "Bluom Coach",
            isPremium: data.isPremium ?? true,
            exercises: defaultExercises,
            updatedAt: Date.now(),
        };

        if (existing) {
            await ctx.db.patch(existing._id, payload);
            return { action: "updated" as const, id: existing._id };
        } else {
            const id = await ctx.db.insert("videoWorkouts", {
                ...payload,
                rating: 5.0,
                reviews: 0,
                createdAt: Date.now(),
            });
            return { action: "created" as const, id };
        }
    },
});

export const createWorkoutViaScript = mutation({
    args: {
        scriptKey: v.string(),
        title: v.string(),
        description: v.string(),
        titleLocalizations: localizationsValidator,
        descriptionLocalizations: localizationsValidator,
        thumbnail: v.string(),
        thumbnailMale: v.optional(v.string()),
        thumbnailFemale: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        videoUrlMale: v.optional(v.string()),
        videoUrlFemale: v.optional(v.string()),
        duration: v.float64(),
        calories: v.float64(),
        difficulty: v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced")),
        category: v.string(),
        categories: v.optional(v.array(v.string())),
        muscleGroupTags: v.optional(v.array(v.string())),
        equipment: v.array(v.string()),
        optionalEquipment: v.optional(v.array(v.string())),
        instructor: v.string(),
        isPremium: v.boolean(),
        exercises: v.array(exerciseValidator),
    },
    handler: async (ctx, args) => {
        checkAdminScriptKey(args.scriptKey);
        const { scriptKey, ...data } = args;
        const workoutId = await ctx.db.insert("videoWorkouts", {
            ...data,
            titleLower: data.title.toLowerCase(),
            rating: 5.0,
            reviews: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return workoutId;
    },
});

export const updateWorkoutViaScript = mutation({
    args: {
        scriptKey: v.string(),
        id: v.id("videoWorkouts"),
        updates: v.object({
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            titleLocalizations: localizationsValidator,
            descriptionLocalizations: localizationsValidator,
            thumbnail: v.optional(v.string()),
            thumbnailMale: v.optional(v.string()),
            thumbnailFemale: v.optional(v.string()),
            videoUrl: v.optional(v.string()),
            videoUrlMale: v.optional(v.string()),
            videoUrlFemale: v.optional(v.string()),
            duration: v.optional(v.float64()),
            calories: v.optional(v.float64()),
            difficulty: v.optional(v.union(v.literal("Beginner"), v.literal("Intermediate"), v.literal("Advanced"))),
            category: v.optional(v.string()),
            categories: v.optional(v.array(v.string())),
            muscleGroupTags: v.optional(v.array(v.string())),
            equipment: v.optional(v.array(v.string())),
            optionalEquipment: v.optional(v.array(v.string())),
            instructor: v.optional(v.string()),
            isPremium: v.optional(v.boolean()),
            exercises: v.optional(v.array(exerciseValidator)),
        }),
    },
    handler: async (ctx, args) => {
        checkAdminScriptKey(args.scriptKey);
        const { updates } = args;
        const patch: Record<string, any> = { ...updates, updatedAt: Date.now() };
        if (updates.title) patch.titleLower = updates.title.toLowerCase();
        await ctx.db.patch(args.id, patch);
        return { success: true };
    },
});



// ─── Public Queries ───────────────────────────────────────────────────────────

export const list = query({
    args: {
        category: v.optional(v.string()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let workouts = await ctx.db.query("videoWorkouts").order("desc").collect();

        if (args.category && args.category !== "All") {
            workouts = workouts.filter(w => w.category === args.category);
        }

        if (args.search) {
            const s = args.search.toLowerCase();
            workouts = workouts.filter(
                w => w.titleLower.includes(s) || w.description.toLowerCase().includes(s)
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
