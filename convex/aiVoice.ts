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
    language: v.optional(v.string()), // e.g. "pt", "es" — defaults to "en"
  },
  handler: async (_ctx, args) => {
    let { apiKey, normalizedPlatform } = getGeminiApiKeyForPlatform(args.platform);
    const fallbackKey =
      normalizedPlatform === "ios"
        ? process.env.GEMINI_API_KEY_ANDROID
        : process.env.GEMINI_API_KEY_IOS;

    const lang = args.language ?? 'en';
    const LANG_NAMES: Record<string, string> = {
      'en': 'English',
      'pt': 'European Portuguese',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'it': 'Italian',
      'nl': 'Dutch',
      'pl': 'Polish',
      'da': 'Danish',
      'sv': 'Swedish',
      'no': 'Norwegian',
    };
    const langName = LANG_NAMES[lang] ?? 'English';
    const langInstruction = `\n- Return ALL food item "name" fields in ${langName}. IMPORTANT: Respond ONLY in ${langName}. Do not use any other language. Note: the unit must always remain a standard English string ("g", "ml", "cup", "tbsp", "piece", "serving").`;

    const prompt =
      `You are a nutrition assistant. The user has recorded themselves describing what they just ate.
Listen to the audio and extract all food items mentioned.${langInstruction}

Extract all food items mentioned.

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

    // Gemini requires audio/mp4 for m4a files
    const finalMimeType = args.mimeType === 'audio/m4a' ? 'audio/mp4' : args.mimeType;

    let text = "";
    try {
      const result = await generateContentWithFallback(
        [
          { text: prompt },
          {
            inlineData: {
              mimeType: finalMimeType,
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
        // Retry with fallback key if available
        if (fallbackKey) {
           try {
             const retry = await generateContentWithFallback(
                [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: finalMimeType,
                      data: args.audioBase64,
                    },
                  },
                ],
                fallbackKey
              );
              text = retry.response.text();
           } catch {
             return { status: "maintenance" as const, transcript: "", items: [] };
           }
        } else {
          return { status: "maintenance" as const, transcript: "", items: [] };
        }
      } else {
        throw err;
      }
    }

    if (!text) {
        return { status: "maintenance" as const, transcript: "", items: [] };
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

/**
 * Turns a short gym voice command into a proposed set change. The client must
 * show the proposal and explicitly apply it through workoutSessions.upsertSet.
 */
export const parseVoiceWorkoutLog = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
    platform: v.string(),
    language: v.optional(v.string()),
    exerciseName: v.string(),
    targetSetIndex: v.number(),
    allowAddSet: v.boolean(),
    unit: v.union(v.literal("kg"), v.literal("lb")),
  },
  handler: async (_ctx, args) => {
    const { apiKey } = getGeminiApiKeyForPlatform(args.platform);
    const language = args.language ?? "en";
    const finalMimeType = args.mimeType === "audio/m4a" ? "audio/mp4" : args.mimeType;
    const prompt = `You transcribe a short gym command in ${language}. The active exercise is "${args.exerciseName}". The selected existing set is ${args.targetSetIndex}. Return ONLY valid JSON:
{
  "transcript":"what the user said",
  "operation":"log_set"|"undo_last"|"add_set"|"unknown",
  "setIndex":number,
  "weight":number|null,
  "reps":number|null,
  "rpe":number|null,
  "complete":boolean,
  "confidence":number
}
Rules: use ${args.unit} for weight; default to selected set ${args.targetSetIndex} unless the speaker explicitly names another set; use "add_set" only when the speaker explicitly asks to add an extra set or add mode is ${args.allowAddSet}; never invent weight, reps, or RPE; confidence is 0-1; command words may be in the user's language.`;

    const result = await generateContentWithFallback([
      { text: prompt },
      { inlineData: { mimeType: finalMimeType, data: args.audioBase64 } },
    ], apiKey);
    const text = result.response.text();
    let parsed = safeJsonParse<any>(text);
    if (!parsed) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) parsed = safeJsonParse(text.slice(start, end + 1));
    }
    if (!parsed) return { status: "ok" as const, transcript: text.slice(0, 300), operation: "unknown" as const, setIndex: args.targetSetIndex, confidence: 0 };

    const finite = (value: unknown, min: number, max: number) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
    };
    const operation = ["log_set", "undo_last", "add_set"].includes(parsed.operation) ? parsed.operation : "unknown";
    return {
      status: "ok" as const,
      transcript: String(parsed.transcript ?? "").slice(0, 500),
      operation,
      setIndex: Math.max(1, Math.min(100, Math.round(finite(parsed.setIndex, 1, 100) ?? args.targetSetIndex))),
      weight: finite(parsed.weight, 0, 2000),
      reps: finite(parsed.reps, 0, 1000),
      rpe: finite(parsed.rpe, 1, 10),
      complete: parsed.complete === true,
      confidence: Math.max(0, Math.min(1, finite(parsed.confidence, 0, 1) ?? 0)),
    };
  },
});
