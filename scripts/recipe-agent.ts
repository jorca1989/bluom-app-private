import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// Fallback to .env if .env.local doesn't exists or keys are missing
dotenv.config();

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Check args first so --help works without env vars
const args = process.argv.slice(2);
const helpIndex = args.indexOf('--help');
if (helpIndex !== -1 || args.length === 0) {
    console.log("Usage: npx tsx scripts/recipe-agent.ts \"Recipe Name\" [--dry-run]");
    console.log("\nEnvironment Variables required in .env.local:");
    console.log("  - GEMINI_API_KEY");
    console.log("  - SILICONFLOW_API_KEY");
    console.log("  - NEXT_PUBLIC_CONVEX_URL");
    console.log("  - USER_ID (The Convex User ID to assign recipes to)");
    process.exit(0);
}

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
// You can set a default user ID here or in .env.local
const USER_ID = process.env.USER_ID;

if (!GEMINI_API_KEY || !SILICONFLOW_API_KEY || !CONVEX_URL) {
    console.error("❌ Error: Missing required environment variables in .env.local.");
    console.error("Required: GEMINI_API_KEY, SILICONFLOW_API_KEY, NEXT_PUBLIC_CONVEX_URL");
    process.exit(1);
}

if (!USER_ID) {
    console.warn("⚠️ WARNING: USER_ID environment variable is not set. Saving to DB will fail unless you set it.");
}

const recipeName = args[0];
const isDryRun = args.includes('--dry-run');

console.log(`\n👨‍🍳 Recipe Agent Starting...`);
console.log(`📝 Recipe: "${recipeName}"`);
console.log(`🔎 Mode: ${isDryRun ? "DRY RUN (No Database Changes)" : "LIVE (Writes to Convex)"}`);

const convex = new ConvexHttpClient(CONVEX_URL);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const RECIPE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        title: { type: SchemaType.STRING },
        calories: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        fat: { type: SchemaType.NUMBER },
        servings: { type: SchemaType.NUMBER },
        ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        },
        instructions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        }
    },
    required: ["title", "calories", "protein", "carbs", "fat", "ingredients", "instructions", "servings"]
} as any; // Change 'as const' to 'as any' to satisfy the typechecker

async function generateRecipe(name: string) {
    console.log(`\n🔮 Generating recipe with Gemini 2.0 Flash...`);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        // @ts-ignore - Schema is supported in newer versions but types might lag
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RECIPE_SCHEMA,
        }
    });

    const prompt = `Create a healthy, delicious recipe for "${name}". 
  Ensure the macro nuntrients (calories, protein, carbs, fat) are realistic and sum up correctly roughly: (protein * 4) + (carbs * 4) + (fat * 9) ~= calories.
  Return JSON.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return JSON.parse(text);
}

async function generateImage(prompt: string) {
    console.log(`\n🎨 Generating image with SiliconFlow (FLUX.1-dev)...`);
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-dev", // or "z-image-turbo"
            prompt: `Cinematic professional food photography of ${prompt}, high resolution, 8k, delicious, gourmet plating, soft lighting.`,
            image_size: "1024x1024",
        })
    };

    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', options);

    if (!response.ok) {
        throw new Error(`SiliconFlow API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
        throw new Error("No image URL returned from SiliconFlow");
    }

    return imageUrl;
}

async function uploadImageToConvex(imageUrl: string) {
    console.log(`\n☁️ Uploading image to Convex...`);

    // 1. Fetch the image data
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    // 2. Generate Upload URL
    const uploadUrl = await convex.mutation(api.recipes.generateUploadUrl);

    // 3. Upload to the URL
    const postResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": imageBlob.type },
        body: imageBlob,
    });

    if (!postResponse.ok) {
        throw new Error(`Failed to upload image to Convex: ${postResponse.statusText}`);
    }

    const { storageId } = await postResponse.json();
    console.log(`✅ Image uploaded! Storage ID: ${storageId}`);
    return storageId;
}

async function main() {
    try {
        // 1. Generate Recipe JSON
        const recipeData = await generateRecipe(recipeName);
        console.log("\n----- Generated Recipe -----");
        console.log(JSON.stringify(recipeData, null, 2));

        if (isDryRun) {
            console.log("\n[Dry Run] Skipping Image Generation and Database Save.");
            return;
        }

        // 2. Generate Image
        const imageUrl = await generateImage(recipeData.title);
        console.log(`\n🖼️ Generated Image URL: ${imageUrl}`);

        // 3. Upload Image to Convex
        const storageId = await uploadImageToConvex(imageUrl);

        // 4. Save to Database
        if (!USER_ID) {
            throw new Error("Cannot save to database: USER_ID is missing in .env.local.");
        }

        // Convert arrays to JSON strings as per schema
        const ingredientsJson = JSON.stringify(recipeData.ingredients);
        const nutritionJson = JSON.stringify({
            calories: recipeData.calories,
            protein: recipeData.protein,
            carbs: recipeData.carbs,
            fat: recipeData.fat
        });

        console.log(`\n💾 Saving to Convex (User ID: ${USER_ID})...`);

        const recipeId = await convex.mutation(api.recipes.createRecipe, {
            userId: USER_ID as any, // Cast to any to assume ID format is correct or let it fail
            name: recipeData.title,
            servings: recipeData.servings,
            ingredientsJson: ingredientsJson,
            nutritionJson: nutritionJson,
            storageId: storageId
        });

        console.log(`\n🎉 Success! Recipe Created.`);
        console.log(`Recipe ID: ${recipeId}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

main();
