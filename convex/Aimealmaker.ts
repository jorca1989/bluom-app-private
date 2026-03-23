/**
 * convex/aiMealMaker.ts  (merge into convex/ai.ts or keep separate)
 *
 * Gemini action: generate a full recipe from a list of ingredients,
 * a cuisine preference, and a nutrition goal.
 *
 * Called from AiMealMakerScreen.tsx via api.ai.generateAiMealFromIngredients
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { generateContentWithFallback, safeJsonParse } from "./ai";

function getGeminiKey(platform: string): string {
  const p = String(platform ?? "").toLowerCase();
  if (p === "ios" && process.env.GEMINI_API_KEY_IOS) return process.env.GEMINI_API_KEY_IOS;
  if (process.env.GEMINI_API_KEY_ANDROID) return process.env.GEMINI_API_KEY_ANDROID;
  if (process.env.GEMINI_API_KEY_IOS) return process.env.GEMINI_API_KEY_IOS;
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!k) throw new Error("Missing Gemini API key.");
  return k;
}

export const generateAiMealFromIngredients = action({
  args: {
    ingredients: v.array(v.string()),
    cuisine: v.string(),
    goal: v.string(),
    platform: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = getGeminiKey(args.platform);

    const prompt = `You are a professional chef and nutritionist.
Create ONE recipe using these ingredients (you may add basic pantry staples):
Ingredients: ${args.ingredients.join(", ")}
Cuisine: ${args.cuisine !== "Any" ? args.cuisine : "any globally-inspired"}
Nutrition goal: ${args.goal} (e.g. high_protein = maximise protein, low_carb = minimise carbs, etc.)

Return ONLY valid JSON with this EXACT shape — no markdown, no commentary:
{
  "title": "string",
  "description": "string (1-2 sentences)",
  "cookingTime": number (minutes),
  "servings": number,
  "calories": number (per serving, kcal),
  "protein": number (per serving, grams),
  "carbs": number (per serving, grams),
  "fat": number (per serving, grams),
  "ingredients": [
    { "name": "string", "amount": "string e.g. 200g, 1 cup, 2 tbsp" }
  ],
  "steps": ["string (concise instruction)"],
  "tags": ["string"],
  "imageSearchQuery": "string (2-4 word descriptor for a food photo, e.g. 'grilled salmon salad')"
}

Rules:
- All numbers must be plain numbers (no strings).
- steps array: 4-8 steps, each a clear single action.
- tags: 2-4 relevant tags (e.g. "High Protein", "Quick", "Mediterranean").
- Output MUST be valid JSON only.`;

    let text = "";
    try {
      const result = await generateContentWithFallback([{ text: prompt }], apiKey);
      text = result.response.text();
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
        throw new Error("AI service temporarily unavailable. Please try again.");
      }
      throw err;
    }

    // Parse JSON
    let parsed = safeJsonParse<any>(text);
    if (!parsed) {
      const start = text.indexOf("{");
      const end   = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = safeJsonParse(text.slice(start, end + 1));
      }
    }

    if (!parsed || !parsed.title) {
      throw new Error("AI returned an invalid recipe format. Please try again.");
    }

    return {
      title:            String(parsed.title ?? "Chef's Special"),
      description:      String(parsed.description ?? ""),
      cookingTime:      Math.round(Number(parsed.cookingTime ?? 30)),
      servings:         Math.round(Number(parsed.servings ?? 2)),
      calories:         Math.round(Number(parsed.calories ?? 400)),
      protein:          Math.round(Number(parsed.protein ?? 20) * 10) / 10,
      carbs:            Math.round(Number(parsed.carbs ?? 40) * 10) / 10,
      fat:              Math.round(Number(parsed.fat ?? 15) * 10) / 10,
      ingredients:      Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((i: any) => ({
            name:   String(i.name ?? ""),
            amount: String(i.amount ?? ""),
          }))
        : [],
      steps:            Array.isArray(parsed.steps)
        ? parsed.steps.map((s: any) => String(s))
        : [],
      tags:             Array.isArray(parsed.tags)
        ? parsed.tags.map((t: any) => String(t))
        : [],
      imageSearchQuery: String(parsed.imageSearchQuery ?? parsed.title ?? "food"),
    };
  },
});