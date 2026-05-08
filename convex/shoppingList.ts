import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Seafood",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Snacks",
  "Household",
  "Personal Care",
  "Other",
] as const;

export type ShoppingCategory = (typeof CATEGORIES)[number];

function normalizeName(name: string) {
  const n = (name ?? "").trim().toLowerCase();
  // super-light normalization (good enough for merging common items)
  const collapsed = n.replace(/\s+/g, " ");
  const singular = collapsed.endsWith("s") && collapsed.length > 3 ? collapsed.slice(0, -1) : collapsed;
  return singular;
}

function guessCategory(nameLower: string): ShoppingCategory {
  const n = nameLower;
  if (/(apple|banana|berry|berries|avocado|lettuce|spinach|kale|tomato|onion|garlic|pepper|cucumber|carrot|broccoli|lemon|lime|orange|potato|sweet potato)/.test(n))
    return "Produce";
  if (/(milk|cheese|yogurt|butter|cream|cottage|mozzarella|parmesan)/.test(n)) return "Dairy";
  if (/(chicken|beef|pork|turkey|bacon|sausage|ham|steak)/.test(n)) return "Meat";
  if (/(salmon|tuna|shrimp|prawn|cod|tilapia|fish)/.test(n)) return "Seafood";
  if (/(bread|bagel|bun|tortilla|wrap|pita|croissant)/.test(n)) return "Bakery";
  if (/(rice|pasta|oat|oats|flour|sugar|salt|peppercorn|spice|cumin|paprika|oil|olive oil|vinegar|beans|lentil|chickpea|sauce|broth|stock)/.test(n))
    return "Pantry";
  if (/(ice cream|frozen|pizza)/.test(n)) return "Frozen";
  if (/(water|sparkling|soda|juice|coffee|tea)/.test(n)) return "Beverages";
  if (/(chip|chips|cracker|crackers|snack|nuts|protein bar|bar)/.test(n)) return "Snacks";
  if (/(detergent|soap|dish|paper towel|toilet paper|cleaner|trash bag)/.test(n)) return "Household";
  if (/(shampoo|conditioner|toothpaste|deodorant|lotion)/.test(n)) return "Personal Care";
  return "Other";
}

function parseIngredientLine(line: string): { name: string; quantity: number | string } {
  const raw = (line ?? "").trim();
  if (!raw) return { name: "", quantity: 1 };

  // Examples:
  // "2 Eggs" => qty=2, name="Eggs"
  // "1.5 cups milk" => qty=1.5, name="cups milk" (good enough; name normalization handles merging)
  // "Eggs" => qty=1, name="Eggs"
  const m = raw.match(/^\s*(\d+(?:\.\d+)?)\s+(.*)\s*$/);
  if (m) {
    const qty = Number(m[1]);
    if (Number.isFinite(qty)) return { name: m[2].trim(), quantity: qty };
  }
  return { name: raw, quantity: 1 };
}

function combineQuantities(existing: number | string, incoming: number | string): number | string {
  if (typeof existing === "number" && typeof incoming === "number") return existing + incoming;
  const e = typeof existing === "number" ? String(existing) : existing;
  const i = typeof incoming === "number" ? String(incoming) : incoming;
  if (!i || i === "1") return existing;
  if (!e || e === "1") return incoming;
  if (e === i) return existing;
  return `${e} + ${i}`;
}

async function addOrMergeItem(
  ctx: any,
  args: {
    userId: any;
    name: string;
    quantity?: number | string;
    category?: ShoppingCategory;
    recipeId?: any;
  }
): Promise<{ created: number; merged: number }> {
  const name = args.name.trim();
  if (!name) return { created: 0, merged: 0 };

  const nameLower = normalizeName(name);
  const category = (args.category ?? guessCategory(nameLower)) as ShoppingCategory;
  const incomingQty = args.quantity ?? 1;

  const existing = await ctx.db
    .query("shoppingList")
    .withIndex("by_user_and_nameLower", (q: any) => q.eq("userId", args.userId).eq("nameLower", nameLower))
    .filter((q: any) => q.eq(q.field("completed"), false))
    .first();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      quantity: combineQuantities(existing.quantity, incomingQty),
      category: existing.category === "Other" ? category : existing.category,
      recipeId: existing.recipeId ?? args.recipeId,
      updatedAt: now,
    });
    return { created: 0, merged: 1 };
  }

  await ctx.db.insert("shoppingList", {
    userId: args.userId,
    name,
    nameLower,
    quantity: incomingQty,
    category,
    completed: false,
    recipeId: args.recipeId,
    createdAt: now,
    updatedAt: now,
  });
  return { created: 1, merged: 0 };
}

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    items.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
    return items;
  },
});

export const addItem = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    quantity: v.optional(v.union(v.float64(), v.string())),
    category: v.optional(
      v.union(
        v.literal("Produce"),
        v.literal("Dairy"),
        v.literal("Meat"),
        v.literal("Seafood"),
        v.literal("Bakery"),
        v.literal("Pantry"),
        v.literal("Frozen"),
        v.literal("Beverages"),
        v.literal("Snacks"),
        v.literal("Household"),
        v.literal("Personal Care"),
        v.literal("Other")
      )
    ),
    recipeId: v.optional(v.id("publicRecipes")),
  },
  handler: async (ctx, args) => {
    return await addOrMergeItem(ctx, {
      userId: args.userId,
      name: args.name,
      quantity: args.quantity ?? 1,
      category: (args.category as ShoppingCategory | undefined) ?? undefined,
      recipeId: args.recipeId,
    });
  },
});

export const addRecipeIngredients = mutation({
  args: {
    userId: v.id("users"),
    recipeId: v.id("publicRecipes"),
    ingredients: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let merged = 0;

    for (const line of args.ingredients) {
      const parsed = parseIngredientLine(line);
      if (!parsed.name.trim()) continue;
      const res = await addOrMergeItem(ctx, {
        userId: args.userId,
        name: parsed.name,
        quantity: parsed.quantity,
        recipeId: args.recipeId,
      });
      created += res.created;
      merged += res.merged;
    }

    return { created, merged };
  },
});

export const setCompleted = mutation({
  args: { userId: v.id("users"), itemId: v.id("shoppingList"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) return;
    await ctx.db.patch(args.itemId, { completed: args.completed, updatedAt: Date.now() });
  },
});

export const deleteItem = mutation({
  args: { userId: v.id("users"), itemId: v.id("shoppingList") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) return;
    await ctx.db.delete(args.itemId);
  },
});


