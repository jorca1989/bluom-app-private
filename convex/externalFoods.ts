import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Buffer } from "buffer";

type ExternalFood = {
  kind: "external";
  source: "fatsecret" | "usda";
  externalId: string;
  name: string;
  brand?: string | null;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string | null;
};

type LocalFood = {
  kind: "local";
  _id: any;
  name: string;
  brand?: string | null;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (set it in Convex env)`);
  return v;
}

function parseFoodDescriptionMacros(desc: string | undefined | null) {
  const text = (desc ?? "").toString();
  const cal = /Calories:\s*([\d.]+)\s*kcal/i.exec(text)?.[1];
  const fat = /Fat:\s*([\d.]+)\s*g/i.exec(text)?.[1];
  const carbs = /Carbs?:\s*([\d.]+)\s*g/i.exec(text)?.[1];
  const protein = /Protein:\s*([\d.]+)\s*g/i.exec(text)?.[1];
  return {
    calories: cal ? Number(cal) : 0,
    fat: fat ? Number(fat) : 0,
    carbs: carbs ? Number(carbs) : 0,
    protein: protein ? Number(protein) : 0,
  };
}

async function getFatSecretToken(): Promise<string> {
  const clientId = requireEnv("FATSECRET_CLIENT_ID");
  const clientSecret = requireEnv("FATSECRET_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "basic",
  });

  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FatSecret token failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  if (!json?.access_token) throw new Error("FatSecret token missing access_token");
  return json.access_token as string;
}

async function fatsecretRequest(token: string, params: Record<string, string>) {
  const url = new URL("https://platform.fatsecret.com/rest/server.api");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FatSecret request failed: ${res.status} ${text}`);
  }
  return (await res.json()) as any;
}

async function searchFatSecret(query: string): Promise<ExternalFood[]> {
  const token = await getFatSecretToken();
  const json = await fatsecretRequest(token, {
    method: "foods.search",
    search_expression: query,
  });

  const foods = json?.foods?.food ?? [];
  const arr = Array.isArray(foods) ? foods : [foods];

  return arr
    .slice(0, 20)
    .map((f: any): ExternalFood => {
      const macros = parseFoodDescriptionMacros(f.food_description);
      return {
        kind: "external",
        source: "fatsecret",
        externalId: String(f.food_id),
        name: f.food_name ?? "Food",
        brand: f.brand_name ?? null,
        servingSize: f.serving_description ?? "1 serving",
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    })
    .filter((f: ExternalFood) => !!f.externalId);
}

async function fatSecretLookupBarcode(barcode: string): Promise<ExternalFood | null> {
  const token = await getFatSecretToken();
  const barcodeJson = await fatsecretRequest(token, {
    method: "food.find_id_for_barcode",
    barcode,
  });
  const foodId = barcodeJson?.food_id;
  if (!foodId) return null;

  const foodJson = await fatsecretRequest(token, {
    method: "food.get",
    food_id: String(foodId),
  });
  const food = foodJson?.food;
  if (!food) return null;

  // Try to read first serving nutrition (best-effort)
  const servings = food?.servings?.serving;
  const first = Array.isArray(servings) ? servings[0] : servings;
  const calories = Number(first?.calories ?? 0);
  const protein = Number(first?.protein ?? 0);
  const carbs = Number(first?.carbohydrate ?? 0);
  const fat = Number(first?.fat ?? 0);
  const servingSize = first?.serving_description ?? "1 serving";

  return {
    kind: "external",
    source: "fatsecret",
    externalId: String(food.food_id ?? foodId),
    name: food.food_name ?? "Food",
    brand: food.brand_name ?? null,
    servingSize,
    calories,
    protein,
    carbs,
    fat,
    barcode,
  };
}

async function searchUSDA(query: string): Promise<ExternalFood[]> {
  const apiKey = requireEnv("USDA_API_KEY");
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "20");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`USDA search failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  const foods = json?.foods ?? [];

  return foods.map((f: any): ExternalFood => {
    const nutrients = f.foodNutrients ?? [];
    const calories = nutrients.find((n: any) => n.nutrientId === 1008)?.value ?? 0;
    const protein = nutrients.find((n: any) => n.nutrientId === 1003)?.value ?? 0;
    const carbs = nutrients.find((n: any) => n.nutrientId === 1005)?.value ?? 0;
    const fat = nutrients.find((n: any) => n.nutrientId === 1004)?.value ?? 0;
    return {
      kind: "external",
      source: "usda",
      externalId: String(f.fdcId),
      name: f.description ?? "Food",
      brand: f.brandOwner ?? null,
      servingSize: "100g",
      calories: Math.round(Number(calories) || 0),
      protein: Math.round((Number(protein) || 0) * 10) / 10,
      carbs: Math.round((Number(carbs) || 0) * 10) / 10,
      fat: Math.round((Number(fat) || 0) * 10) / 10,
    };
  });
}

function parseQtyAndName(line: string): { quantity: number; name: string } {
  const m = line.trim().match(/^(\d+\.?\d*)\s+(.+)$/);
  if (!m) return { quantity: 1, name: line.trim() };
  return { quantity: Number(m[1]) || 1, name: m[2].trim() };
}

export const searchFoods = action({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (!q) return [];
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)));

    const local = (await ctx.runQuery(api.foodCatalog.searchFoods, {
      userId: args.userId,
      query: q,
      limit: 50,
    })) as any[];

    const localFoods: LocalFood[] = (local ?? []).map((f: any) => ({
      kind: "local",
      _id: f._id,
      name: f.name,
      brand: f.brand ?? null,
      servingSize: f.servingSize,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    }));

    let fs: ExternalFood[] = [];
    let usda: ExternalFood[] = [];
    try {
      fs = await searchFatSecret(q);
    } catch {
      fs = [];
    }
    try {
      usda = await searchUSDA(q);
    } catch {
      usda = [];
    }

    // Dedup by lowercased name + brand (more precise than name only)
    const seen = new Set<string>();
    const out: Array<LocalFood | ExternalFood> = [];

    for (const f of [...localFoods, ...fs, ...usda]) {
      const nameKey = (f.name ?? "").toLowerCase().trim();
      const brandKey = ((f as any).brand ?? "").toString().toLowerCase().trim();
      const key = `${nameKey}|${brandKey}`;
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
      if (out.length >= limit) break;
    }

    return out;
  },
});

export const lookupBarcode = action({
  args: { barcode: v.string() },
  handler: async (_ctx, args) => {
    const barcode = args.barcode.trim();
    if (!barcode) return null;

    try {
      const fs = await fatSecretLookupBarcode(barcode);
      if (fs) return fs;
    } catch {
      // ignore
    }
    return null;
  },
});

export const matchIngredientLines = action({
  args: { userId: v.id("users"), lines: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: any[] = [];
    for (const line of args.lines) {
      const { quantity, name } = parseQtyAndName(line);
      const q = name.trim();
      if (!q) continue;

      // 1) Try local foods first
      const local = (await ctx.runQuery(api.foodCatalog.findFirstMatch, {
        userId: args.userId,
        query: q,
      })) as any | null;

      if (local) {
        results.push({
          kind: "local",
          _id: local._id,
          name: local.name,
          brand: local.brand ?? null,
          servingSize: local.servingSize,
          calories: local.calories,
          protein: local.protein,
          carbs: local.carbs,
          fat: local.fat,
          original: line,
          quantity,
          unit: "g",
          unmatched: false,
        });
        continue;
      }

      // 2) FatSecret search
      let ext: ExternalFood | null = null;
      try {
        const fs = await searchFatSecret(q);
        ext = fs[0] ?? null;
      } catch {
        ext = null;
      }

      // 3) USDA fallback
      if (!ext) {
        try {
          const u = await searchUSDA(q);
          ext = u[0] ?? null;
        } catch {
          ext = null;
        }
      }

      if (ext) {
        results.push({
          kind: "external",
          source: ext.source,
          externalId: ext.externalId,
          name: ext.name,
          brand: ext.brand ?? null,
          servingSize: ext.servingSize,
          calories: ext.calories,
          protein: ext.protein,
          carbs: ext.carbs,
          fat: ext.fat,
          barcode: ext.barcode ?? null,
          original: line,
          quantity,
          unit: "g",
          unmatched: false,
        });
        continue;
      }

      results.push({
        kind: "none",
        name: q,
        original: line,
        quantity,
        unit: "g",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unmatched: true,
      });
    }
    return results;
  },
});


