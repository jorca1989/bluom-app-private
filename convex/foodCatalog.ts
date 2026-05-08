import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const searchFoods = query({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    if (!q) return [];

    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)));

    const foods = await ctx.db
      .query("foods")
      .withIndex("by_user", (q2) => q2.eq("userId", args.userId))
      .collect();

    return foods
      .filter((f) => {
        const name = (f.nameLower ?? f.name.toLowerCase());
        const desc = (f.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
      .slice(0, limit);
  },
});

export const findFirstMatch = query({
  args: { userId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    if (!q) return null;

    const foods = await ctx.db
      .query("foods")
      .withIndex("by_user", (q2) => q2.eq("userId", args.userId))
      .collect();

    return foods.find((f) => (f.nameLower ?? f.name.toLowerCase()).includes(q)) ?? null;
  },
});

export const matchIngredients = query({
  args: {
    userId: v.id("users"),
    lines: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const foods = await ctx.db
      .query("foods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const normalizedFoods = foods.map((f) => ({
      ...f,
      _nameLower: f.nameLower ?? f.name.toLowerCase(),
    }));

    return args.lines.map((line) => {
      const q = line.trim().toLowerCase();
      if (!q) return { name: line, unmatched: true, quantity: 1, unit: "g" };

      const match =
        normalizedFoods.find((f) => f._nameLower.includes(q)) ??
        normalizedFoods.find((f) => q.includes(f._nameLower));

      if (!match) return { name: line, unmatched: true, quantity: 1, unit: "g" };

      return {
        ...match,
        original: line,
        quantity: 1,
        unit: "g",
        unmatched: false,
      };
    });
  },
});

export const createFood = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    source: v.optional(v.string()),
    externalId: v.optional(v.string()),
    barcode: v.optional(v.string()),
    servingSize: v.string(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const foodId = await ctx.db.insert("foods", {
      userId: args.userId,
      name: args.name,
      nameLower: args.name.trim().toLowerCase(),
      description: args.description,
      brand: args.brand,
      source: args.source,
      externalId: args.externalId,
      barcode: args.barcode,
      servingSize: args.servingSize,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      createdAt: now,
      updatedAt: now,
    });
    return foodId;
  },
});

export const upsertExternalFood = mutation({
  args: {
    userId: v.id("users"),
    source: v.string(), // fatsecret | usda
    externalId: v.string(),
    name: v.string(),
    brand: v.optional(v.string()),
    barcode: v.optional(v.string()),
    servingSize: v.string(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("foods")
      .withIndex("by_user_and_externalId", (q) =>
        q.eq("userId", args.userId).eq("externalId", args.externalId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        nameLower: args.name.trim().toLowerCase(),
        brand: args.brand,
        barcode: args.barcode,
        source: args.source,
        externalId: args.externalId,
        servingSize: args.servingSize,
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fat: args.fat,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("foods", {
      userId: args.userId,
      name: args.name,
      nameLower: args.name.trim().toLowerCase(),
      brand: args.brand,
      barcode: args.barcode,
      source: args.source,
      externalId: args.externalId,
      servingSize: args.servingSize,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      createdAt: now,
      updatedAt: now,
    });
  },
});


