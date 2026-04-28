import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function requireGeminiApiKey() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY_ANDROID ||
    process.env.GEMINI_API_KEY_IOS ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY_IOS and GEMINI_API_KEY_ANDROID (or GEMINI_API_KEY) in your Convex environment."
    );
  }
  return apiKey;
}

function getGeminiApiKeyForPlatform(platform: string): { apiKey: string; source: string; normalizedPlatform: string } {
  const p = String(platform ?? "").toLowerCase();
  const normalizedPlatform = p === "ios" || p === "android" || p === "web" ? p : "unknown";

  if (normalizedPlatform === "ios" && process.env.GEMINI_API_KEY_IOS) {
    return { apiKey: process.env.GEMINI_API_KEY_IOS, source: "GEMINI_API_KEY_IOS", normalizedPlatform };
  }
  if (normalizedPlatform !== "ios" && process.env.GEMINI_API_KEY_ANDROID) {
    return { apiKey: process.env.GEMINI_API_KEY_ANDROID, source: "GEMINI_API_KEY_ANDROID", normalizedPlatform };
  }
  if (process.env.GEMINI_API_KEY_ANDROID) {
    return { apiKey: process.env.GEMINI_API_KEY_ANDROID, source: "GEMINI_API_KEY_ANDROID(fallback)", normalizedPlatform };
  }
  if (process.env.GEMINI_API_KEY_IOS) {
    return { apiKey: process.env.GEMINI_API_KEY_IOS, source: "GEMINI_API_KEY_IOS(fallback)", normalizedPlatform };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return { apiKey, source: "legacy_fallback", normalizedPlatform };
  }

  throw new Error(
    "Missing Gemini API key. Set GEMINI_API_KEY_IOS and GEMINI_API_KEY_ANDROID (or GEMINI_API_KEY) in your Convex environment."
  );
}

function getModel(apiKeyOverride?: string) {
  const genAI = new GoogleGenerativeAI(apiKeyOverride ?? requireGeminiApiKey());
  // NOTE: Model aliases change over time. We keep a short fallback list and retry on 404 / unsupported.
  // See: https://ai.google.dev/gemini-api/docs/models
  return {
    genAI,
    models: [
      "gemini-flash-latest",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash",
    ],
  };
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isModelNotFoundOrUnsupported(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  return (
    msg.includes("404") ||
    msg.toLowerCase().includes("not found") ||
    msg.toLowerCase().includes("not supported for generatecontent") ||
    msg.toLowerCase().includes("is not supported for generatecontent")
  );
}

function isForbidden403(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  return msg.includes("403") || msg.toLowerCase().includes("forbidden");
}

export async function generateContentWithFallback(parts: any[], apiKeyOverride?: string) {
  const { genAI, models } = getModel(apiKeyOverride);
  let lastErr: unknown = null;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(parts);
    } catch (err) {
      lastErr = err;
      if (isModelNotFoundOrUnsupported(err)) continue;
      throw err;
    }
  }
  throw lastErr ?? new Error("No compatible Gemini model found for generateContent.");
}

export const recognizeFoodFromImage = action({
  args: {
    // Base64 without data: prefix
    imageBase64: v.string(),
    mimeType: v.string(), // e.g. "image/jpeg"
    platform: v.string(),
    language: v.optional(v.string()), // e.g. "pt", "es" — defaults to "en"
  },
  handler: async (_ctx, args) => {
    const { apiKey, source, normalizedPlatform } = getGeminiApiKeyForPlatform(args.platform);
    console.log(`[ai] recognizeFoodFromImage platform=${normalizedPlatform} keySource=${source}`);
    const platform = normalizedPlatform;
    const fallbackKey =
      platform === "ios"
        ? process.env.GEMINI_API_KEY_ANDROID
        : process.env.GEMINI_API_KEY_IOS;
    const lang = args.language ?? 'en';
    const langInstruction = lang !== 'en'
      ? `\n- Return the food "name" in ${lang === 'pt' ? 'European Portuguese' : lang} language.`
      : '';
    const prompt =
      'Analyze this food image. Provide the Food Name, estimated Calories, Protein, Carbs, and Fats. Return ONLY a JSON object.\n' +
      'Exact shape:\n' +
      '{\n' +
      '  "name": "string",\n' +
      '  "calories": number,\n' +
      '  "protein": number,\n' +
      '  "carbs": number,\n' +
      '  "fat": number\n' +
      '}\n' +
      'Rules:\n' +
      '- Calories in kcal. Macros in grams.\n' +
      '- If unsure, return name="Desconhecido" and set numbers to 0.\n' +
      '- Output MUST be valid JSON with no extra text.' +
      langInstruction;

    let text = "";
    try {
      const result = await generateContentWithFallback(
        [
          { text: prompt },
          {
            inlineData: {
              mimeType: args.mimeType,
              data: args.imageBase64,
            },
          },
        ],
        apiKey
      );
      text = result.response.text();
    } catch (err) {
      if (isForbidden403(err)) {
        // Some API keys are restricted per-platform; if a platform-restricted key is rejected,
        // retry once with the opposite platform key so the feature doesn't go down completely.
        if (fallbackKey) {
          try {
            const retry = await generateContentWithFallback(
              [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: args.mimeType,
                    data: args.imageBase64,
                  },
                },
              ],
              fallbackKey
            );
            text = retry.response.text();
          } catch {
            // fall through to maintenance below
          }
        }
        if (text) {
          // continue parsing if retry succeeded
        } else {
        return {
          status: "maintenance" as const,
          name: "Unknown",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
        }
      }
      throw err;
    }

    const parsed = safeJsonParse<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>(text);

    if (parsed) return { status: "ok" as const, ...parsed };

    // Fallback: try to extract JSON block if model included commentary
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return { status: "ok" as const, ...maybe };
    }

    return {
      status: "ok" as const,
      name: "Unknown",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  },
});

/**
 * Sugar Control: Scan a product/label photo and estimate sugar + calories + smart alternative.
 */
export const scanSugarProductFromImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
    platform: v.string(),
  },
  handler: async (_ctx, args) => {
    const { apiKey, source, normalizedPlatform } = getGeminiApiKeyForPlatform(args.platform);
    console.log(`[ai] scanSugarProductFromImage platform=${normalizedPlatform} keySource=${source}`);
    const platform = normalizedPlatform;
    const fallbackKey =
      platform === "ios"
        ? process.env.GEMINI_API_KEY_ANDROID
        : process.env.GEMINI_API_KEY_IOS;
    const prompt =
      'You are a nutrition expert and sugar-awareness coach.\n' +
      'Analyze this image of a packaged food/product (front label or nutrition label).\n' +
      'Return ONLY valid JSON with this exact shape:\n' +
      '{\n' +
      '  "productName": "string",\n' +
      '  "estimatedSugarGrams": number,\n' +
      '  "estimatedCalories": number,\n' +
      '  "hiddenSugarsFound": ["string"],\n' +
      '  "smartAlternative": "string",\n' +
      '  "notes": "string"\n' +
      '}\n' +
      'Rules:\n' +
      '- Sugar grams and calories should be per serving if you can read serving info; otherwise best-effort estimate.\n' +
      '- hiddenSugarsFound: list any ingredients that are actually hidden sugars (maltodextrin, high fructose corn syrup, rice syrup, etc.).\n' +
      '- If you cannot read the label, infer from product type; if still unsure, use 0.\n' +
      '- smartAlternative should be a concrete healthier swap a user could buy instead.\n' +
      '- notes: short explanation (1 sentence max), no markdown.\n' +
      '- Output MUST be JSON only, no extra text.';

    let text = "";
    try {
      const result = await generateContentWithFallback(
        [
          { text: prompt },
          {
            inlineData: {
              mimeType: args.mimeType,
              data: args.imageBase64,
            },
          },
        ],
        apiKey
      );
      text = result.response.text();
    } catch (err) {
      if (isForbidden403(err)) {
        if (fallbackKey) {
          try {
            const retry = await generateContentWithFallback(
              [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: args.mimeType,
                    data: args.imageBase64,
                  },
                },
              ],
              fallbackKey
            );
            text = retry.response.text();
          } catch {
            // fall through to maintenance below
          }
        }
        if (text) {
          // continue parsing if retry succeeded
        } else {
        return {
          status: "maintenance" as const,
          productName: "Unknown",
          estimatedSugarGrams: 0,
          estimatedCalories: 0,
          hiddenSugarsFound: [],
          smartAlternative: "",
          notes: "Temporarily unavailable. Please try again later.",
        };
        }
      }
      throw err;
    }

    const parsed = safeJsonParse<{
      productName: string;
      estimatedSugarGrams: number;
      estimatedCalories: number;
      hiddenSugarsFound: string[];
      smartAlternative: string;
      notes: string;
    }>(text);

    if (parsed) return { status: "ok" as const, ...parsed };

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return { status: "ok" as const, ...maybe };
    }

    return {
      status: "ok" as const,
      productName: "Unknown",
      estimatedSugarGrams: 0,
      estimatedCalories: 0,
      hiddenSugarsFound: [],
      smartAlternative: "Try sparkling water, unsweetened yogurt, or whole fruit instead.",
      notes: "Could not confidently read the label from this photo.",
    };
  },
});

export const generateAiRecipe = action({
  args: {
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    mealType: v.optional(v.string()),
    dietType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    dislikes: v.optional(v.array(v.string())),
    requestText: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const prompt = `Create a single recipe that matches these macro targets (within ~5%):
Calories: ${args.calories}
Protein: ${args.protein}g
Carbs: ${args.carbs}g
Fat: ${args.fat}g
Meal type: ${args.mealType ?? "lunch"}
Diet type: ${args.dietType ?? "balanced"}
Allergies: ${(args.allergies ?? []).join(", ") || "none"}
Dislikes / avoid: ${(args.dislikes ?? []).join(", ") || "none"}
${args.requestText ? `Special request: ${args.requestText}` : ""}

CRITICAL STRICT CONSTRAINTS:
1. You MUST generate ONLY valid, machine-readable JSON.
2. DO NOT output any markdown blocks (e.g. \`\`\`json).
3. DO NOT output conversational text before or after the JSON (e.g. "Here is your recipe" or "Enjoy").
4. The recipe MUST be realistic, biologically edible, and use normal flavor profiles.

Return EXACTLY this JSON shape:
{
  "title": "string",
  "description": "string",
  "cooking_time": number,
  "servings": number,
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "steps": ["string"],
  "tags": ["string"],
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "g|ml|cup|tbsp|tsp|piece" }
  ]
}`;

    const result = await generateContentWithFallback([{ text: prompt }]);
    const text = result.response.text();
    const parsed = safeJsonParse<any>(text);
    if (parsed) return parsed;

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return maybe;
    }

    throw new Error("Gemini returned invalid JSON for recipe generation.");
  },
});

/**
 * AI Coach Chat Action
 */
export const chatWithCoach = action({
  args: {
    message: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
    context: v.optional(v.string()), // User's fitness/nutrition data
    platform: v.string(),
  },
  handler: async (_ctx, args) => {
    const { apiKey, source, normalizedPlatform } = getGeminiApiKeyForPlatform(args.platform);
    console.log(`[ai] chatWithCoach platform=${normalizedPlatform} keySource=${source}`);
    const platform = normalizedPlatform;
    const fallbackKey =
      platform === "ios"
        ? process.env.GEMINI_API_KEY_ANDROID
        : process.env.GEMINI_API_KEY_IOS;
    const systemPrompt = `You are the Bluom AI Coach, a highly skilled expert in Fitness, Nutrition, and Wellness.
Your goal is to provide precise, science-backed, and encouraging advice to help the user achieve their health goals.
Context about the user: ${args.context ?? "No specific context provided."}

Keep responses concise, professional, and actionable. Use bullet points for advice.
If the user asks for medical advice, always include a disclaimer that you are an AI coach and they should consult a doctor.`;

    const chatHistory = args.history.map(h => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }]
    }));

    let responseText = "";
    let success = false;
    let sawForbidden = false;

    const apiKeysToTry = [apiKey, fallbackKey].filter(Boolean) as string[];
    for (const key of apiKeysToTry) {
      const { genAI, models } = getModel(key);
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const chat = model.startChat({
            history: [
              { role: "user", parts: [{ text: systemPrompt }] },
              { role: "model", parts: [{ text: "Understood. I am the Bluom AI Coach. How can I help you today?" }] },
              ...chatHistory
            ],
          });

          const result = await chat.sendMessage(args.message);
          responseText = result.response.text();
          success = true;
          break;
        } catch (err) {
          if (isForbidden403(err)) {
            // Try next key (if any)
            sawForbidden = true;
            break;
          }
          if (isModelNotFoundOrUnsupported(err)) continue;
          throw err;
        }
      }
      if (success) break;
    }

    if (!success) {
      if (sawForbidden) {
        return { status: "maintenance" as const, text: "Coach is resting. Please try again later." };
      }
      throw new Error("Failed to get response from Gemini.");
    }

    return { status: "ok" as const, text: responseText };
  },
});

/**
 * Generate a "Mental Weather Report" based on user's recent reflections.
 */
export const generateReflectionInsight = action({
  args: {
    journalText: v.string(), // Combined recent journal text
    gratitudeText: v.string(), // Combined recent gratitude text
    moodHistory: v.string(), // Summary of recent moods
  },
  handler: async (_ctx, args) => {
    const prompt = `You are a compassionate AI wellness companion. Analyze the user's recent reflections and mood history.
    
    Journal Content: "${args.journalText.slice(0, 2000)}"
    Gratitude Content: "${args.gratitudeText.slice(0, 2000)}"
    Mood History: "${args.moodHistory}"

    Generate a "Mental Weather Report" with exactly 3 short, distinct sections.
    1. Theme: A one-sentence observation about their main focus or recurring topic.
    2. Mood Correlation: A one-sentence insight connecting their writing to their mood (e.g., "You feel lighter when you write about nature").
    3. Nudge: A gentle, actionable suggestion for the coming days (e.g., "Try writing about a small win tomorrow").

    Return ONLY valid JSON with this exact shape:
    {
      "theme": "string",
      "moodCorrelation": "string",
      "nudge": "string"
    }
    `;

    const result = await generateContentWithFallback([{ text: prompt }]);
    const text = result.response.text();
    const parsed = safeJsonParse<{
      theme: string;
      moodCorrelation: string;
      nudge: string;
    }>(text);

    if (parsed) return parsed;

    // Fallback parsing
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybe = safeJsonParse<any>(text.slice(start, end + 1));
      if (maybe) return maybe;
    }

    return {
      theme: "Your reflections are growing.",
      moodCorrelation: "Keep writing to see more patterns.",
      nudge: "Take a moment to breathe deeply today.",
    };
  },
});
/**
 * Simple text translation action using Gemini.
 */
export const translateText = action({
  args: {
    text: v.string(),
    targetLang: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `Translate the following text into ${args.targetLang}. 
Return ONLY the translated text. Do not include any explanations or extra commentary.
If it is a list of items separated by newlines, maintain the same format.

Text to translate:
${args.text}`;

    try {
      const result = await generateContentWithFallback([{ text: prompt }]);
      return result.response.text().trim();
    } catch (err) {
      console.error("Translation error:", err);
      return args.text; // Fallback to original text on error
    }
  },
});
