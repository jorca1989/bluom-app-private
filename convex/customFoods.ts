import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// -------------------------------------------------------------------------
//  Backend Logic for Custom Foods
// -------------------------------------------------------------------------

/**
 * Search for foods in the local database.
 * Uses the search index on the 'searchName' field.
 */
export const searchLocalFoods = query({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
        language: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        const normalizedQuery = args.query.toLowerCase().trim();

        if (!normalizedQuery) return [];

        const results = await ctx.db
            .query("customFoods")
            .withSearchIndex("search_name", (q) => q.search("searchName", normalizedQuery))
            .take(limit);

        return results;
    },
});

/**
 * Log a new food into the custom database.
 * This is typically called when a user selects a food from an external API
 * and we want to cache it locally for future searches.
 */
export const logFood = mutation({
    args: {
        name: v.object({
            en: v.string(),
            pt: v.optional(v.string()),
            es: v.optional(v.string()),
            nl: v.optional(v.string()),
            de: v.optional(v.string()),
            fr: v.optional(v.string()),
        }),
        macros: v.object({
            calories: v.float64(),
            fat: v.float64(),
            protein: v.float64(),
            carbs: v.float64(),
            fiber: v.float64(),
        }),
        isVerified: v.boolean(),
        barcode: v.optional(v.string()),
        brand: v.optional(v.string()),
        servingSize: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Generate the search name from the primary language (usually EN)
        const searchName = (args.name.en || Object.values(args.name)[0] || "").toLowerCase();

        // Check if food with same name/brand or barcode already exists to avoid duplicates
        let existing = null;
        if (args.barcode) {
            existing = await ctx.db
                .query("customFoods")
                .filter((q) => q.eq(q.field("barcode"), args.barcode))
                .first();
        }

        // If exact name match (less reliable, but useful)
        if (!existing && !args.barcode) {
            // It's hard to check efficiently without an index on name.en, relying on search index mainly.
            // For now, we'll just insert.
        }

        if (existing) {
            return existing._id;
        }

        const id = await ctx.db.insert("customFoods", {
            ...args,
            searchName,
        });

        return id;
    },
});

// External search removed in favor of local "Golden List" strategy.
