import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)));
    const search = (args.search ?? "").trim().toLowerCase();
    const category = (args.category ?? "").trim();

    let recipes = await ctx.db.query("publicRecipes").collect();

    if (category && category !== "All") {
      recipes = recipes.filter((r) => (r.category ?? "") === category);
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















