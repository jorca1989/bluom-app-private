// Backend imports removed committed to frontend utility
import { api } from "@/convex/_generated/api";
import { ConvexReactClient } from "convex/react";

/**
 * Service to handle Food Search operations.
 * Allows switching between local DB and external APIs (Open Food Facts).
 */
export class FoodSearchService {
    private convex: ConvexReactClient;

    constructor(convexClient: ConvexReactClient) {
        this.convex = convexClient;
    }

    /**
     * Search for foods. 
     * First tries local custom foods.
     * If not enough results, falls back to Open Food Facts via server action.
     */
    async search(query: string, lang: string = 'en'): Promise<any[]> {
        if (!query || query.length < 2) return [];

        try {
            // 1. Search Local DB
            const localResults = await this.convex.query(api.customFoods.searchLocalFoods, {
                query,
                limit: 20
            });

            // 2. Return local results only (External API removed)
            return localResults;
        } catch (error) {
            console.error("Food Search Error:", error);
            return [];
        }
    }

    /**
     * Log a food item.
     * If it's an external food, it saves it to the local DB first for future cache.
     * Then it should be logged to the user's daily log (handled by a separate mutation usually).
     * This function primarily ensures the food exists in our `customFoods` table.
     */
    async ensureFoodExists(food: any): Promise<string> {
        // If it has an _id, it's already local
        if (food._id) return food._id;

        // It's an external food, save it
        // Prepare the payload matching the mutation args
        const payload = {
            name: food.name,
            macros: food.macros,
            isVerified: false,
            barcode: food.barcode,
            brand: food.brand,
            servingSize: food.servingSize
        };

        const newId = await this.convex.mutation(api.customFoods.logFood, payload);
        return newId;
    }
}
