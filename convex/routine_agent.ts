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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Error: GEMINI_API_KEY is not set in environment variables.");
            throw new Error("Server Error: Configuration missing. GEMINI_API_KEY is not set.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
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
            console.log("Generating routine with prompt:", prompt);
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            console.log("Gemini response:", text);
            return JSON.parse(text);
        } catch (error: any) {
            console.error("Gemini generation failed:", error);
            // Check for specific API key related errors if possible
            if (error.message?.includes("API key")) {
                throw new Error("Server Error: Invalid API Configuration.");
            }
            // Throw the actual error for debugging purposes in development
            throw new Error(`Failed to generate routine: ${error.message}`);
        }
    },
});
