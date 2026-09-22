import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { checkAdminScriptKey } from "./functions";

// -------------------------------------------------------------------------
//  Backend Logic for Custom Foods
// -------------------------------------------------------------------------

/**
 * Search for foods in the local database.
 * Uses the search index on the 'searchName' field.
 */
/**
 * Bulk create/update global catalog foods (the customFoods table) from a trusted script.
 * Auth: shared ADMIN_SCRIPT_KEY, same pattern as the workout/article/exercise importers.
 * Matches an existing food by exact (case-insensitive) English name; patches it if found,
 * otherwise inserts a new one. Safe to re-run -- it will not create duplicates.
 */
export const bulkInsertFoodsViaScript = mutation({
  args: {
    scriptKey: v.string(),
    foods: v.array(
      v.object({
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
        saturatedFat: v.optional(v.float64()),
        polyunsaturatedFat: v.optional(v.float64()),
        monounsaturatedFat: v.optional(v.float64()),
        transFat: v.optional(v.float64()),
        iron: v.optional(v.float64()),
        calcium: v.optional(v.float64()),
        potassium: v.optional(v.float64()),
        vitaminA: v.optional(v.float64()),
        vitaminC: v.optional(v.float64()),
        addedSugar: v.optional(v.float64()),
        sodium: v.optional(v.float64()),
        magnesium: v.optional(v.float64()),
        zinc: v.optional(v.float64()),
      }),
        isVerified: v.optional(v.boolean()),
        barcode: v.optional(v.string()),
        brand: v.optional(v.string()),
        servingSize: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        mealType: v.optional(v.array(v.string())),
        dietType: v.optional(v.array(v.string())),
        nutrientType: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    checkAdminScriptKey(args.scriptKey);
    let created = 0;
    let updated = 0;
    const ids = [];

    for (const food of args.foods) {
      const searchName = food.name.en.trim().toLowerCase();
      const candidates = await ctx.db
        .query("customFoods")
        .withSearchIndex("search_name", (q) => q.search("searchName", searchName))
        .take(5);
      const existing = candidates.find((c) => c.searchName === searchName);

      const payload = {
        name: food.name,
        macros: food.macros,
        isVerified: food.isVerified ?? true,
        barcode: food.barcode,
        brand: food.brand,
        servingSize: food.servingSize,
        thumbnail: food.thumbnail,
        searchName,
        countryCode: food.countryCode,
        mealType: food.mealType,
        dietType: food.dietType,
        nutrientType: food.nutrientType,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated++;
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("customFoods", payload);
        created++;
        ids.push(id);
      }
    }

    return { created, updated, ids };
  },
});

export const searchLocalFoods = query({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
        language: v.optional(v.string()),
        mealTypes: v.optional(v.array(v.string())),
        dietTypes: v.optional(v.array(v.string())),
        nutrientTypes: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        const normalizedQuery = args.query.toLowerCase().trim();

        let results = [];
        if (!normalizedQuery) {
            // Pre-populate with all database custom foods (limit to 100) sorted by descending order
            results = await ctx.db
                .query("customFoods")
                .order("desc")
                .take(100);
        } else {
            results = await ctx.db
                .query("customFoods")
                .withSearchIndex("search_name", (q) => q.search("searchName", normalizedQuery))
                .take(limit);
        }

        const { mealTypes, dietTypes, nutrientTypes } = args;

        if (mealTypes && mealTypes.length > 0) {
            results = results.filter(f => f.mealType && f.mealType.some(m => mealTypes.includes(m)));
        }
        if (dietTypes && dietTypes.length > 0) {
            results = results.filter(f => f.dietType && f.dietType.some(d => dietTypes.includes(d)));
        }
        if (nutrientTypes && nutrientTypes.length > 0) {
            results = results.filter(f => f.nutrientType && f.nutrientType.some(n => nutrientTypes.includes(n)));
        }

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
            saturatedFat: v.optional(v.float64()),
            polyunsaturatedFat: v.optional(v.float64()),
            monounsaturatedFat: v.optional(v.float64()),
            transFat: v.optional(v.float64()),
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
                saturatedFat: v.optional(v.float64()),
                polyunsaturatedFat: v.optional(v.float64()),
                monounsaturatedFat: v.optional(v.float64()),
                transFat: v.optional(v.float64()),
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
