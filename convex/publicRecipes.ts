import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    mealTypes: v.optional(v.array(v.string())),
    dietTypes: v.optional(v.array(v.string())),
    cuisines: v.optional(v.array(v.string())),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)));
    const search = (args.search ?? "").trim().toLowerCase();
    const category = (args.category ?? "").trim();
    const mealTypes = args.mealTypes ?? [];
    const dietTypes = args.dietTypes ?? [];
    const cuisines = args.cuisines ?? [];

    let recipes = await ctx.db.query("publicRecipes").collect();

    // Filter out drafts (undefined status treated as published for backward compatibility)
    recipes = recipes.filter(r => r.status !== 'draft');

    if (category && category !== "All") {
      recipes = recipes.filter((r) => {
        const matchSingle = (r.category ?? "") === category;
        const matchMulti = (r.categories ?? []).includes(category);
        return matchSingle || matchMulti;
      });
    }

    if (mealTypes.length > 0) {
      recipes = recipes.filter(r => r.mealType && r.mealType.some(m => mealTypes.includes(m)));
    }

    if (dietTypes.length > 0) {
      recipes = recipes.filter(r => r.dietType && r.dietType.some(d => dietTypes.includes(d)));
    }

    if (cuisines.length > 0) {
      recipes = recipes.filter(r => r.cuisine && cuisines.includes(r.cuisine));
    }

    if (search) {
      recipes = recipes.filter((r) => {
        const title = (r.titleLower ?? r.title.toLowerCase());
        const desc = (r.description ?? "").toLowerCase();
        const tags = (r.tags ?? []).map((t) => t.toLowerCase());
        return title.includes(search) || desc.includes(search) || tags.some((t) => t.includes(search));
      });
    }

    recipes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return recipes.slice(0, limit);
  },
});















