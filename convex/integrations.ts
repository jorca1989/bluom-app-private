import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getTodayMetrics = query({
    args: { userId: v.id("users") }, // Strict userId required
    handler: async (ctx, args) => {
        // Placeholder return to keep UI happy
        return { steps: 0, calories: 0, sleep: 0, lastSync: null };
    },
});

export const saveExternalData = mutation({
    args: { userId: v.id("users"), steps: v.number(), calories: v.number() },
    handler: async (ctx, args) => {
        return { success: true };
    },
});
