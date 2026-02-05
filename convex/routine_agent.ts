import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ROUTINE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        name: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        plannedVolume: { type: SchemaType.NUMBER },
        estimatedDuration: { type: SchemaType.NUMBER },
        estimatedCalories: { type: SchemaType.NUMBER },
        exercises: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    sets: { type: SchemaType.NUMBER },
                    reps: { type: SchemaType.STRING },
                    weight: { type: SchemaType.STRING },
                    rest: { type: SchemaType.NUMBER },
                },
                required: ["name", "sets", "reps"] as string[],
            },
        },
    },
    required: ["name", "description", "plannedVolume", "estimatedDuration", "estimatedCalories", "exercises"] as string[],
} as const;

export const generateRoutine = action({
    args: {
        goal: v.string(),
        duration: v.optional(v.string()), // e.g. "30 mins"
        equipment: v.optional(v.string()), // e.g. "Dumbbells"
    },
    handler: async (ctx, args) => {
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set in environment variables");
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: ROUTINE_SCHEMA,
            },
        });

        const prompt = `
      Create a workout routine for a user with the goal: "${args.goal}".
      ${args.duration ? `Duration preference: ${args.duration}.` : ""}
      ${args.equipment ? `Equipment available: ${args.equipment}.` : ""}
      
      Ensure the routine is balanced and safe.
      For 'plannedVolume', sum up the total number of sets.
      For 'reps', provide a range (e.g. "8-12") or "Failure" if appropriate.
      For 'weight', suggest "Bodyweight" or a guidance like "Moderate" or "Heavy".
      For 'rest', provide seconds (e.g. 60).
      
      Return a JSON object.
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini generation failed:", error);
            throw new Error("Failed to generate routine. Please try again.");
        }
    },
});
