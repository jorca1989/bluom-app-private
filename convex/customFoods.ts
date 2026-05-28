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
        const limit = args.limit || 50;
        const normalizedQuery = args.query.toLowerCase().trim();

        if (!normalizedQuery) {
            // Pre-populate with all database custom foods (limit to 100) sorted by descending order
            return await ctx.db
                .query("customFoods")
                .order("desc")
                .take(100);
        }

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
        }),
        macros: v.object({
            calories: v.float64(),
            fat: v.float64(),
            protein: v.float64(),
            carbs: v.float64(),
            fiber: v.float64(),
            sugar: v.optional(v.float64()),
        }),
        isVerified: v.boolean(),
        barcode: v.optional(v.string()),
        brand: v.optional(v.string()),
        servingSize: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        countryCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Generate the search name by combining all populated translations to support multilingual search
        const searchName = Object.values(args.name)
            .filter(Boolean)
            .map((v) => v.trim())
            .join(" ")
            .toLowerCase();

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

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

/** List all custom foods with pagination (admin panel). */
export const listAll = query({
    args: {
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        const result = await ctx.db.query("customFoods").order("desc").paginate({
            numItems: limit,
            cursor: args.cursor ? (args.cursor as any) : null,
        });
        return result;
    },
});

/** Total count of foods in the database. */
export const getCount = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("customFoods").collect();
        return all.length;
    },
});

/** Update an existing custom food (admin). */
export const updateFood = mutation({
    args: {
        id: v.id("customFoods"),
        updates: v.object({
            name: v.optional(v.object({
                en: v.string(),
                pt: v.optional(v.string()),
                es: v.optional(v.string()),
                nl: v.optional(v.string()),
                de: v.optional(v.string()),
                fr: v.optional(v.string()),
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
            })),
            macros: v.optional(v.object({
                calories: v.float64(),
                fat: v.float64(),
                protein: v.float64(),
                carbs: v.float64(),
                fiber: v.float64(),
                sugar: v.optional(v.float64()),
            })),
            isVerified: v.optional(v.boolean()),
            barcode: v.optional(v.string()),
            brand: v.optional(v.string()),
            servingSize: v.optional(v.string()),
            thumbnail: v.optional(v.string()),
            countryCode: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Food not found");

        const patch: any = { ...args.updates };
        if (patch.name) {
            patch.searchName = Object.values(patch.name)
                .filter(Boolean)
                .map((v: any) => v.trim())
                .join(" ")
                .toLowerCase();
        }
        await ctx.db.patch(args.id, patch);
    },
});

/** Delete a custom food (admin). */
export const deleteFood = mutation({
    args: { id: v.id("customFoods") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
