import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getTodayMetrics = query({
    args: { userId: v.id("users") }, // Strict userId required
    handler: async (ctx, args) => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        const startMs = start.getTime();
        const endMs = end.getTime();

        const latestSteps = await ctx.db
            .query("integrationsData")
            .withIndex("by_user_type_time", (q) =>
                q.eq("userId", args.userId).eq("type", "steps").gte("timestamp", startMs)
            )
            .filter((q) => q.lte(q.field("timestamp"), endMs))
            .order("desc")
            .first();

        const latestCalories = await ctx.db
            .query("integrationsData")
            .withIndex("by_user_type_time", (q) =>
                q.eq("userId", args.userId).eq("type", "active_calories").gte("timestamp", startMs)
            )
            .filter((q) => q.lte(q.field("timestamp"), endMs))
            .order("desc")
            .first();

        const lastSync = Math.max(
            latestSteps?.timestamp ?? 0,
            latestCalories?.timestamp ?? 0
        );

        return {
            steps: Math.round(latestSteps?.value ?? 0),
            calories: Math.round(latestCalories?.value ?? 0),
            sleep: 0,
            lastSync: lastSync > 0 ? lastSync : null,
        };
    },
});

export const saveExternalData = mutation({
    args: {
        userId: v.id("users"),
        steps: v.number(),
        calories: v.number(),
        source: v.optional(v.string()), // 'apple_health' | 'google_health'
    },
    handler: async (ctx, args) => {
        const ts = Date.now();
        const source = args.source ?? "unknown";

        // Store daily totals (latest wins). We insert new rows and read the latest per day.
        if (args.steps > 0) {
            await ctx.db.insert("integrationsData", {
                userId: args.userId,
                source,
                type: "steps",
                value: args.steps,
                unit: "count",
                timestamp: ts,
            });
        }
        if (args.calories > 0) {
            await ctx.db.insert("integrationsData", {
                userId: args.userId,
                source,
                type: "active_calories",
                value: args.calories,
                unit: "kcal",
                timestamp: ts,
            });
        }

        return { success: true, timestamp: ts };
    },
});
