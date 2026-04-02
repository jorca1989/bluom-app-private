import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

// ─── Default muscle groups (fallback order) ───────────────────────────────────
export const DEFAULT_MUSCLE_GROUPS = [
    "Chest", "Back", "Shoulders", "Biceps", "Triceps",
    "Legs", "Glutes", "Core", "Abs", "Cardio",
];

// ─── Public query — used by app/workouts.tsx to render muscle cards ────────────
export const listAll = query({
    handler: async (ctx) => {
        const rows = await ctx.db.query("muscleGroupImages").collect();
        return rows.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    },
});

// ─── Admin mutation — create or update a single muscle group image ─────────────
export const upsert = mutation({
    args: {
        name: v.string(),
        imageUrl: v.string(),
        sortOrder: v.optional(v.float64()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const existing = await ctx.db
            .query("muscleGroupImages")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                imageUrl: args.imageUrl,
                sortOrder: args.sortOrder ?? existing.sortOrder,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("muscleGroupImages", args);
        }
    },
});

// ─── Admin mutation — delete a muscle group image entry ───────────────────────
export const remove = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const existing = await ctx.db
            .query("muscleGroupImages")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();
        if (existing) await ctx.db.delete(existing._id);
    },
});
