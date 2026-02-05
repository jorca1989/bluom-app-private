import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface FoodSearchResult {
    _id?: string;
    name: {
        en: string;
        pt?: string;
        es?: string;
        nl?: string;
        de?: string;
        [key: string]: string | undefined;
    };
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
    };
    brand?: string;
    servingSize?: string;
    isVerified: boolean;
    image?: string;
    source: 'local' | 'external';
}

/**
 * Search for foods using the Hybrid Engine.
 * 1. Checks local Convex DB first.
 * 2. If < 3 results, falls back to Open Food Facts API.
 */
export const searchFood = async (
    convex: ConvexReactClient,
    query: string,
    language: string = 'en'
): Promise<FoodSearchResult[]> => {
    if (!query || query.length < 2) return [];

    // 1. Local Search
    const localResults = await convex.query(api.customFoods.searchLocalFoods, {
        query,
        limit: 20,
        language,
    });

    const normalizedLocal: FoodSearchResult[] = localResults.map((item: any) => ({
        ...item,
        source: 'local',
    }));

    // 2. Return local results only (External API removed)
    return normalizedLocal;

    return normalizedLocal;
};
