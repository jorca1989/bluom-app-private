import { mutation } from "./_generated/server";

export const seedMockRecipes = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Check if recipes already exist
    const existingRecipes = await ctx.db.query("publicRecipes").collect();
    if (existingRecipes.length > 0) {
      return { success: false, message: "Recipes already exist" };
    }

    const mockRecipes = [
      {
        title: "Protein Power Bowl",
        titleLower: "protein power bowl",
        description: "A nutritious bowl packed with protein, fresh vegetables, and healthy fats to fuel your day.",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
        cookTimeMinutes: 25,
        servings: 2,
        calories: 420,
        protein: 35,
        carbs: 28,
        fat: 18,
        tags: ["high protein", "healthy", "bowl"],
        category: "Lunch",
        isPremium: false,
        ingredients: [
          "1 cup quinoa, cooked",
          "200g grilled chicken breast, diced",
          "1 avocado, sliced",
          "2 cups mixed greens",
          "1/4 cup cherry tomatoes",
          "2 tbsp olive oil",
          "1 lemon, juiced",
          "Salt and pepper to taste"
        ],
        instructions: [
          "Cook quinoa according to package directions and let cool slightly.",
          "Season chicken breast with salt and pepper, then grill until cooked through.",
          "Dice cooked chicken into bite-sized pieces.",
          "In a large bowl, combine quinoa, chicken, mixed greens, and cherry tomatoes.",
          "Top with sliced avocado and drizzle with olive oil and lemon juice.",
          "Toss well and serve immediately."
        ],
        createdAt: now - 86400000, // 1 day ago
        updatedAt: now - 86400000
      },
      {
        title: "Overnight Oats Paradise",
        titleLower: "overnight oats paradise",
        description: "Creamy, delicious overnight oats that make breakfast preparation effortless and nutritious.",
        imageUrl: "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&h=600&fit=crop",
        cookTimeMinutes: 5,
        servings: 1,
        calories: 380,
        protein: 18,
        carbs: 52,
        fat: 12,
        tags: ["breakfast", "meal prep", "healthy"],
        category: "Breakfast",
        isPremium: false,
        ingredients: [
          "1/2 cup rolled oats",
          "1/2 cup almond milk",
          "1 tbsp chia seeds",
          "1 tbsp maple syrup",
          "1/2 cup mixed berries",
          "1 tbsp almond butter",
          "1/4 tsp vanilla extract",
          "Pinch of cinnamon"
        ],
        instructions: [
          "In a jar or container, combine oats, almond milk, and chia seeds.",
          "Add maple syrup, vanilla extract, and cinnamon.",
          "Stir well and refrigerate overnight (at least 4 hours).",
          "In the morning, top with mixed berries and almond butter.",
          "Stir and enjoy cold or microwave for 30 seconds if warm is preferred."
        ],
        createdAt: now - 172800000, // 2 days ago
        updatedAt: now - 172800000
      },
      {
        title: "Mediterranean Salmon",
        titleLower: "mediterranean salmon",
        description: "Flaky salmon seasoned with Mediterranean herbs and served with roasted vegetables.",
        imageUrl: "https://images.unsplash.com/photo-1467003909585-60999eda2db8?w=800&h=600&fit=crop",
        cookTimeMinutes: 30,
        servings: 2,
        calories: 480,
        protein: 42,
        carbs: 22,
        fat: 28,
        tags: ["dinner", "fish", "healthy fats"],
        category: "Dinner",
        isPremium: true,
        ingredients: [
          "2 salmon fillets (6oz each)",
          "1 cup cherry tomatoes",
          "1 zucchini, sliced",
          "1 red onion, sliced",
          "2 cloves garlic, minced",
          "3 tbsp olive oil",
          "1 tsp dried oregano",
          "1 tsp dried thyme",
          "Juice of 1 lemon",
          "Salt and pepper to taste"
        ],
        instructions: [
          "Preheat oven to 400°F (200°C).",
          "Season salmon fillets with salt, pepper, oregano, and thyme.",
          "Toss vegetables with olive oil, salt, and pepper.",
          "Place salmon and vegetables on a baking sheet lined with parchment paper.",
          "Bake for 15-20 minutes until salmon is flaky and vegetables are tender.",
          "Drizzle with lemon juice before serving."
        ],
        createdAt: now - 259200000, // 3 days ago
        updatedAt: now - 259200000
      },
      {
        title: "Green Power Smoothie",
        titleLower: "green power smoothie",
        description: "A refreshing and nutrient-dense smoothie packed with greens, fruits, and protein.",
        imageUrl: "https://images.unsplash.com/photo-1505252585461-0db1d9b15a4?w=800&h=600&fit=crop",
        cookTimeMinutes: 5,
        servings: 1,
        calories: 280,
        protein: 24,
        carbs: 35,
        fat: 8,
        tags: ["snack", "healthy", "quick"],
        category: "Snacks",
        isPremium: false,
        ingredients: [
          "1 cup spinach",
          "1 banana",
          "1/2 cup pineapple chunks",
          "1 scoop vanilla protein powder",
          "1 tbsp almond butter",
          "1 cup almond milk",
          "1 tbsp flax seeds",
          "1/2 cup ice cubes"
        ],
        instructions: [
          "Add spinach to blender first.",
          "Add banana, pineapple, protein powder, almond butter, and flax seeds.",
          "Pour in almond milk and add ice cubes.",
          "Blend on high speed for 60-90 seconds until smooth.",
          "Pour into glass and enjoy immediately."
        ],
        createdAt: now - 345600000, // 4 days ago
        updatedAt: now - 345600000
      }
    ];

    // Insert all mock recipes
    for (const recipe of mockRecipes) {
      await ctx.db.insert("publicRecipes", recipe);
    }

    return { success: true, message: `Added ${mockRecipes.length} mock recipes` };
  },
});
