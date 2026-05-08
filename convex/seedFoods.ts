import { mutation } from "./_generated/server";

export const seedGlobalFoods = mutation({
    handler: async (ctx) => {
        console.log("Seeding Foods (NUCLEAR)...");

        // NUCLEAR OPTION: Clear existing foods to ensure fresh multilingual data
        const all = await ctx.db.query("customFoods").collect();
        for (const doc of all) {
            await ctx.db.delete(doc._id);
        }

        // Basic "Golden List" for Keto/Metabolic health - Multilingual (EN, ES, PT, NL, DE, FR)
        const foods = [
            // Fats & Oils
            { name: { en: "Butter", es: "Mantequilla", pt: "Manteiga", nl: "Boter", de: "Butter", fr: "Beurre" }, macros: { calories: 717, protein: 0.9, fat: 81, carbs: 0.1, fiber: 0 }, isVerified: true, searchName: "butter mantequilla manteiga boter beurre", servingSize: "100g" },
            { name: { en: "Olive Oil", es: "Aceite de Oliva", pt: "Azeite de Oliva", nl: "Olijfolie", de: "Olivenöl", fr: "Huile d'olive" }, macros: { calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 }, isVerified: true, searchName: "olive oil aceite oliva azeite olijfolie olivenöl huile", servingSize: "100g" },
            { name: { en: "Coconut Oil", es: "Aceite de Coco", pt: "Óleo de Coco", nl: "Kokosolie", de: "Kokosöl", fr: "Huile de coco" }, macros: { calories: 862, protein: 0, fat: 100, carbs: 0, fiber: 0 }, isVerified: true, searchName: "coconut oil aceite coco óleo kokosolie kokosöl huile", servingSize: "100g" },
            { name: { en: "Avocado", es: "Aguacate", pt: "Abacate", nl: "Avocado", de: "Avocado", fr: "Avocat" }, macros: { calories: 160, protein: 2, fat: 15, carbs: 9, fiber: 7 }, isVerified: true, searchName: "avocado aguacate abacate avocat", servingSize: "100g" },

            // Proteins
            { name: { en: "Egg", es: "Huevo", pt: "Ovo", nl: "Ei", de: "Ei", fr: "Œuf" }, macros: { calories: 143, protein: 13, fat: 10, carbs: 1, fiber: 0 }, isVerified: true, searchName: "egg huevo ovo ei œuf oeuf", servingSize: "100g" },
            { name: { en: "Chicken Breast", es: "Pechuga de Pollo", pt: "Peito de Frango", nl: "Kippenborst", de: "Hähnchenbrust", fr: "Poitrine de poulet" }, macros: { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0 }, isVerified: true, searchName: "chicken breast pechuga pollo peito frango kippenborst hähnchenbrust poitrine poulet", servingSize: "100g" },
            { name: { en: "Salmon", es: "Salmón", pt: "Salmão", nl: "Zalm", de: "Lachs", fr: "Saumon" }, macros: { calories: 208, protein: 20, fat: 13, carbs: 0, fiber: 0 }, isVerified: true, searchName: "salmon salmón salmão zalm lachs saumon", servingSize: "100g" },
            { name: { en: "Ground Beef", es: "Carne Molida", pt: "Carne Moída", nl: "Gehakt", de: "Hackfleisch", fr: "Bœuf haché" }, macros: { calories: 250, protein: 26, fat: 17, carbs: 0, fiber: 0 }, isVerified: true, searchName: "ground beef carne molida moída gehakt hackfleisch bœuf boeuf haché", servingSize: "100g" },
            { name: { en: "Steak", es: "Bistec", pt: "Bife", nl: "Biefstuk", de: "Steak", fr: "Steak" }, macros: { calories: 271, protein: 25, fat: 19, carbs: 0, fiber: 0 }, isVerified: true, searchName: "steak bistec bife biefstuk", servingSize: "100g" },
            { name: { en: "Bacon", es: "Tocino", pt: "Bacon", nl: "Spek", de: "Speck", fr: "Bacon" }, macros: { calories: 541, protein: 37, fat: 42, carbs: 1.4, fiber: 0 }, isVerified: true, searchName: "bacon tocino spek speck", servingSize: "100g" },

            // Dairy
            { name: { en: "Cheddar Cheese", es: "Queso Cheddar", pt: "Queijo Cheddar", nl: "Cheddar Kaas", de: "Cheddar-Käse", fr: "Cheddar" }, macros: { calories: 403, protein: 25, fat: 33, carbs: 1.3, fiber: 0 }, isVerified: true, searchName: "cheddar cheese queso queijo kaas käse", servingSize: "100g" },
            { name: { en: "Heavy Cream", es: "Crema Batida", pt: "Creme de Leite", nl: "Slagroom", de: "Schlagsahne", fr: "Crème épaisse" }, macros: { calories: 340, protein: 2.8, fat: 36, carbs: 2.7, fiber: 0 }, isVerified: true, searchName: "heavy cream crema batida creme leite slagroom schlagsahne crème", servingSize: "100g" },
            { name: { en: "Greek Yogurt", es: "Yogur Griego", pt: "Iogurte Grego", nl: "Griekse Yoghurt", de: "Griechischer Joghurt", fr: "Yaourt grec" }, macros: { calories: 59, protein: 10, fat: 0.4, carbs: 3.6, fiber: 0 }, isVerified: true, searchName: "greek yogurt yogur griego iogurte grego griekse yoghurt joghurt yaourt", servingSize: "100g" },

            // Nuts & Seeds
            { name: { en: "Almonds", es: "Almendras", pt: "Amêndoas", nl: "Amandelen", de: "Mandeln", fr: "Amandes" }, macros: { calories: 579, protein: 21, fat: 50, carbs: 22, fiber: 12.5 }, isVerified: true, searchName: "almonds almendras amêndoas amandelen mandeln amandes", servingSize: "100g" },
            { name: { en: "Macadamia Nuts", es: "Nueces de Macadamia", pt: "Nozes de Macadâmia", nl: "Macadamia Noten", de: "Macadamia-Nüsse", fr: "Noix de macadamia" }, macros: { calories: 718, protein: 8, fat: 76, carbs: 14, fiber: 8.6 }, isVerified: true, searchName: "macadamia nuts nueces nozes noten nüsse noix", servingSize: "100g" },
            { name: { en: "Chia Seeds", es: "Semillas de Chía", pt: "Sementes de Chia", nl: "Chia Zaden", de: "Chiasamen", fr: "Graines de chia" }, macros: { calories: 486, protein: 17, fat: 31, carbs: 42, fiber: 34 }, isVerified: true, searchName: "chia seeds semillas chía sementes zaden chiasamen graines", servingSize: "100g" },
            { name: { en: "Walnuts", es: "Nueces", pt: "Nozes", nl: "Walnoten", de: "Walnüsse", fr: "Noix" }, macros: { calories: 654, protein: 15, fat: 65, carbs: 14, fiber: 7 }, isVerified: true, searchName: "walnuts nueces nozes walnoten walnüsse noix", servingSize: "100g" },

            // Veggies
            { name: { en: "Spinach", es: "Espinaca", pt: "Espinafre", nl: "Spinazie", de: "Spinat", fr: "Épinards" }, macros: { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2 }, isVerified: true, searchName: "spinach espinaca espinafre spinazie spinat épinards", servingSize: "100g" },
            { name: { en: "Broccoli", es: "Brócoli", pt: "Brócolis", nl: "Broccoli", de: "Brokkoli", fr: "Brocoli" }, macros: { calories: 34, protein: 2.8, fat: 0.4, carbs: 7, fiber: 2.6 }, isVerified: true, searchName: "broccoli brócoli brócolis brokkoli brocoli", servingSize: "100g" },
            { name: { en: "Cauliflower", es: "Coliflor", pt: "Couve-flor", nl: "Bloemkool", de: "Blumenkohl", fr: "Chou-fleur" }, macros: { calories: 25, protein: 1.9, fat: 0.3, carbs: 5, fiber: 2 }, isVerified: true, searchName: "cauliflower coliflor couve-flor bloemkool blumenkohl chou-fleur", servingSize: "100g" },
            { name: { en: "Zucchini", es: "Calabacín", pt: "Abobrinha", nl: "Courgette", de: "Zucchini", fr: "Courgette" }, macros: { calories: 17, protein: 1.2, fat: 0.3, carbs: 3.1, fiber: 1 }, isVerified: true, searchName: "zucchini calabacín abobrinha courgette", servingSize: "100g" },
            { name: { en: "Asparagus", es: "Espárragos", pt: "Espargos", nl: "Asperges", de: "Spargel", fr: "Asperges" }, macros: { calories: 20, protein: 2.2, fat: 0.1, carbs: 3.9, fiber: 2.1 }, isVerified: true, searchName: "asparagus espárragos espargos asperges spargel", servingSize: "100g" },
        ];

        let count = 0;
        for (const food of foods) {
            await ctx.db.insert("customFoods", food);
            count++;
        }
        return { success: true, count };
    }
});
