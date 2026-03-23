/**
 * convex/aiVoice.ts  (or merge into convex/ai.ts)
 *
 * Gemini action: parse a voice recording into structured food items.
 * The audio is sent as inline base64 to the Gemini multimodal API.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { generateContentWithFallback, safeJsonParse } from "./ai";

function getGeminiApiKeyForPlatform(platform: string) {
  const p = String(platform ?? "").toLowerCase();
  const norm = p === "ios" || p === "android" || p === "web" ? p : "unknown";
  if (norm === "ios" && process.env.GEMINI_API_KEY_IOS)
    return { apiKey: process.env.GEMINI_API_KEY_IOS, normalizedPlatform: norm };
  if (process.env.GEMINI_API_KEY_ANDROID)
    return { apiKey: process.env.GEMINI_API_KEY_ANDROID, normalizedPlatform: norm };
  if (process.env.GEMINI_API_KEY_IOS)
    return { apiKey: process.env.GEMINI_API_KEY_IOS, normalizedPlatform: norm };
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API key.");
  return { apiKey, normalizedPlatform: norm };
}

/**
 * parseVoiceFoodLog
 *
 * Accepts a base64-encoded audio clip (m4a/wav) and returns:
 * {
 *   status: "ok" | "maintenance",
 *   transcript: string,
 *   items: [{ name, quantity, unit, calories, protein, carbs, fat }]
 * }
 */
export const parseVoiceFoodLog = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),   // "audio/m4a" | "audio/wav" | "audio/webm"
    platform: v.string(),
  },
  handler: async (_ctx, args) => {
    const { apiKey } = getGeminiApiKeyForPlatform(args.platform);

    const prompt =
      `You are a nutrition assistant. The user has recorded themselves describing what they just ate.
Listen to the audio and extract all food items mentioned.

Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{
  "transcript": "string (what the user said, verbatim)",
  "items": [
    {
      "name": "string (food name)",
      "quantity": number,
      "unit": "string (g | ml | cup | tbsp | tsp | piece | serving)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ]
}

Rules:
- calories in kcal, macros in grams per the stated quantity.
- If unsure of exact macros, use best-estimate nutritional values from standard databases.
- If no food is mentioned, return items as an empty array.
- Output MUST be valid JSON only.`;

    let text = "";
    try {
      const result = await generateContentWithFallback(
        [
          { text: prompt },
          {
            inlineData: {
              mimeType: args.mimeType,
              data: args.audioBase64,
            },
          },
        ],
        apiKey
      );
      text = result.response.text();
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
        return { status: "maintenance" as const, transcript: "", items: [] };
      }
      throw err;
    }

    // Parse JSON
    let parsed = safeJsonParse<{ transcript: string; items: any[] }>(text);
    if (!parsed) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = safeJsonParse(text.slice(start, end + 1));
      }
    }

    if (!parsed || !Array.isArray(parsed.items)) {
      return { status: "ok" as const, transcript: text.slice(0, 200), items: [] };
    }

    return {
      status: "ok" as const,
      transcript: parsed.transcript ?? "",
      items: parsed.items.map((item: any) => ({
        name:     String(item.name ?? "Food"),
        quantity: Number(item.quantity ?? 1),
        unit:     String(item.unit ?? "serving"),
        calories: Math.round(Number(item.calories ?? 0)),
        protein:  Math.round(Number(item.protein ?? 0) * 10) / 10,
        carbs:    Math.round(Number(item.carbs ?? 0) * 10) / 10,
        fat:      Math.round(Number(item.fat ?? 0) * 10) / 10,
      })),
    };
  },
});