import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

// --- Admin Mutations ---

export const createExercise = mutation({
    args: {
        name: v.object({
            en: v.string(),
            es: v.optional(v.string()),
            pt: v.optional(v.string()),
            nl: v.optional(v.string()),
            de: v.optional(v.string()),
            fr: v.optional(v.string()),
        }),
        category: v.string(),
        type: v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
        met: v.float64(),
        caloriesPerMinute: v.optional(v.float64()),
        muscleGroups: v.array(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const exerciseId = await ctx.db.insert("exerciseLibrary", {
            ...args,
            nameLower: args.name.en.toLowerCase(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return exerciseId;
    },
});

export const updateExercise = mutation({
    args: {
        id: v.id("exerciseLibrary"),
        updates: v.object({
            name: v.optional(v.object({
                en: v.string(),
                es: v.optional(v.string()),
                pt: v.optional(v.string()),
                nl: v.optional(v.string()),
                de: v.optional(v.string()),
                fr: v.optional(v.string()),
            })),
            category: v.optional(v.string()),
            type: v.optional(v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga"))),
            met: v.optional(v.float64()),
            caloriesPerMinute: v.optional(v.float64()),
            muscleGroups: v.optional(v.array(v.string())),
            description: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        if (args.updates.name) {
            (args.updates as any).nameLower = args.updates.name.en.toLowerCase();
        }
        await ctx.db.patch(args.id, {
            ...args.updates,
            updatedAt: Date.now(),
        });
    },
});

export const deleteExercise = mutation({
    args: { id: v.id("exerciseLibrary") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.id);
    },
});

export const bulkInsertExercises = mutation({
    args: {
        exercises: v.array(
            v.object({
                name: v.object({
                    en: v.string(),
                    es: v.optional(v.string()),
                    pt: v.optional(v.string()),
                    nl: v.optional(v.string()),
                    de: v.optional(v.string()),
                    fr: v.optional(v.string()),
                }),
                category: v.string(),
                type: v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
                met: v.float64(),
                caloriesPerMinute: v.optional(v.float64()),
                muscleGroups: v.array(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        for (const ex of args.exercises) {
            await ctx.db.insert("exerciseLibrary", {
                ...ex,
                nameLower: ex.name.en.toLowerCase(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    },
});

export const seedExerciseLibraryPublic = mutation({
    handler: async (ctx) => {
        console.log("Seeding started (NUCLEAR)...");
        // Always clear existing
        const all = await ctx.db.query("exerciseLibrary").collect();
        for (const doc of all) {
            await ctx.db.delete(doc._id);
        }

        const initial = [
            // STRENGTH
            { name: { en: "Push-ups", es: "Flexiones", pt: "Flexões", nl: "Opdrukken" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Squats", es: "Sentadillas", pt: "Agachamentos", nl: "Squats" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Quads", "Glutes", "Core"] },
            { name: { en: "Deadlift", es: "Peso Muerto", pt: "Levantamiento Terra", nl: "Deadlift" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Glutes", "Hamstrings"] },
            { name: { en: "Bench Press", es: "Press de Banca", pt: "Supino", nl: "Bankdrukken" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Pull-ups", es: "Dominadas", pt: "Barra Fixa", nl: "Optrekken" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Lunges", es: "Zancadas", pt: "Passadas", nl: "Lunges" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Plank", es: "Plancha", pt: "Prancha", nl: "Plank" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Bicep Curls", es: "Curl de Bíceps", pt: "Rosca Direta", nl: "Bicep Curls" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 5, muscleGroups: ["Biceps"] },
            { name: { en: "Tricep Dips", es: "Fondos de Tríceps", pt: "Mergulho de Tríceps", nl: "Tricep Dips" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Triceps"] },
            { name: { en: "Shoulder Press", es: "Press de Hombros", pt: "Desenvolvimento", nl: "Shoulder Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Shoulders"] },
            { name: { en: "Leg Press", es: "Prensa de Piernas", pt: "Leg Press", nl: "Leg Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs"] },
            { name: { en: "Lat Pulldown", es: "Jalón al Pecho", pt: "Puxada Alta", nl: "Lat Pulldown" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Back"] },
            { name: { en: "Russian Twists", es: "Giros Rusos", pt: "Torção Russa", nl: "Russian Twists" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Core"] },
            { name: { en: "Sit-ups", es: "Abdominales", pt: "Abdominais", nl: "Sit-ups" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Glute Bridges", es: "Puente de Glúteos", pt: "Elevação Pélvica", nl: "Glute Bridges" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Glutes"] },
            { name: { en: "Incline Push-ups", es: "Flexiones Inclinadas", pt: "Flexões Inclinadas", nl: "Incline Push-ups" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Decline Push-ups", es: "Flexiones Declinadas", pt: "Flexões Declinadas", nl: "Decline Push-ups" }, category: "Strength", type: "strength", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Diamond Push-ups", es: "Flexiones Diamante", pt: "Flexões Diamante", nl: "Diamond Push-ups" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Triceps", "Chest"] },
            { name: { en: "Wide-arm Push-ups", es: "Flexiones Brazos Abiertos", pt: "Flexões Braços Abertos", nl: "Wide-arm Push-ups" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Clap Push-ups", es: "Flexiones con Aplauso", pt: "Flexões com Palmas", nl: "Clap Push-ups" }, category: "Strength", type: "strength", met: 9.0, caloriesPerMinute: 9, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Staggered Push-ups", es: "Flexiones Escalonadas", pt: "Flexões Escalonadas", nl: "Staggered Push-ups" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Single-arm Push-ups", es: "Flexiones Un Brazo", pt: "Flexões Um Braço", nl: "Single-arm Push-ups" }, category: "Strength", type: "strength", met: 8.5, caloriesPerMinute: 9, muscleGroups: ["Chest", "Core", "Triceps"] },
            { name: { en: "Isometric Push-ups", es: "Flexiones Isométricas", pt: "Flexões Isométricas", nl: "Isometric Push-ups" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Chest", "Triceps"] },
            { name: { en: "Handstand Push-ups", es: "Flexiones de Pino", pt: "Flexões de Mão", nl: "Handstand Push-ups" }, category: "Strength", type: "strength", met: 12.0, caloriesPerMinute: 12, muscleGroups: ["Shoulders", "Triceps", "Core"] },
            { name: { en: "Dumbbell Bench Press", es: "Press de Banca con Mancuernas", pt: "Supino com Halteres", nl: "Dumbbell Bench Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Dumbbell Fly", es: "Vuelo con Mancuernas", pt: "Voo com Halteres", nl: "Dumbbell Fly" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Dumbbell Pullover", es: "Estiramiento con Mancuernas", pt: "Alongamento com Halteres", nl: "Dumbbell Pullover" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Chest", "Lats", "Triceps"] },
            { name: { en: "Dumbbell Press on Incline", es: "Press Inclinado con Mancuernas", pt: "Supino Inclinado com Halteres", nl: "Dumbbell Press on Incline" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Chest", "Shoulders", "Triceps"] },
            { name: { en: "Dumbbell Press on Decline", es: "Press Declinado con Mancuernas", pt: "Supino Declinado com Halteres", nl: "Dumbbell Press on Decline" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps"] },
            { name: { en: "Dumbbell Rotation Press", es: "Press Rotación con Mancuernas", pt: "Supino Rotação com Halteres", nl: "Dumbbell Rotation Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Chest", "Shoulders", "Core"] },
            { name: { en: "Dumbbell Squeeze Press", es: "Press Squeeze con Mancuernas", pt: "Supine Squeeze com Halteres", nl: "Dumbbell Squeeze Press" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Chest", "Triceps"] },
            { name: { en: "Dumbbell Cross-Body Press", es: "Press Cruzado con Mancuernas", pt: "Supino Cruzado com Halteres", nl: "Dumbbell Cross-Body Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Dumbbell Neutral Grip Press", es: "Press Neutro con Mancuernas", pt: "Supine Neutro com Halteres", nl: "Dumbbell Neutral Grip Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Dumbbell Push-Up to Press", es: "Flexión a Press con Mancuernas", pt: "Flexão a Supino com Halteres", nl: "Dumbbell Push-Up to Press" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Barbell Bench Press", es: "Press de Banca con Barra", pt: "Supino com Barra", nl: "Barbell Bench Press" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
            { name: { en: "Barbell Incline Press", es: "Press Inclinado con Barra", pt: "Supino Inclinado com Barra", nl: "Barbell Incline Press" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Chest", "Shoulders", "Triceps"] },
            { name: { en: "Barbell Decline Press", es: "Press Declinado con Barra", pt: "Supino Declinado com Barra", nl: "Barbell Decline Press" }, category: "Strength", type: "strength", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Chest", "Triceps"] },
            { name: { en: "Cable Crossover", es: "Cruce de Cables", pt: "Cruzamento de Cabos", nl: "Cable Crossover" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Pec Deck", es: "Máquina Pecho", pt: "Máquina Peito", nl: "Pec Deck" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Chest"] },
            { name: { en: "Resistance Band Fly", es: "Vuelo con Banda Resistencia", pt: "Voo com Banda Elástica", nl: "Resistance Band Fly" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Bodyweight Squeeze", es: "Squeeze Peso Corporal", pt: "Squeeze Peso Corporal", nl: "Bodyweight Squeeze" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Chest", "Triceps"] },
            { name: { en: "Cable Fly", es: "Vuelo con Cable", pt: "Voo com Cabo", nl: "Cable Fly" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Chest", "Shoulders"] },
            { name: { en: "Lying Dumbbell Pullover", es: "Estiramiento Acostado con Mancuernas", pt: "Alongamento Deitado com Halteres", nl: "Lying Dumbbell Pullover" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Chest", "Lats", "Triceps"] },
            { name: { en: "Machine Chest Fly", es: "Vuelo en Máquina", pt: "Voo na Máquina", nl: "Machine Chest Fly" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Chest"] },
            { name: { en: "Swiss Ball Dumbbell Squeeze", es: "Squeeze con Mancuernas en Balón Suizo", pt: "Squeeze com Halteres na Bola Suíça", nl: "Swiss Ball Dumbbell Squeeze" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Chest", "Core", "Triceps"] },
            { name: { en: "Chin-ups", es: "Dominadas Supinación", pt: "Barra Fixa Supinada", nl: "Chin-ups" }, category: "Strength", type: "strength", met: 8.5, caloriesPerMinute: 9, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Inverted Rows", es: "Remos Invertidos", pt: "Remos Invertidos", nl: "Inverted Rows" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Superman", es: "Superman", pt: "Superman", nl: "Superman" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "Bodyweight Back Bridge", es: "Puente Espalda Peso Corporal", pt: "Ponte Costas Peso Corporal", nl: "Bodyweight Back Bridge" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "L-sit Pull-ups", es: "Dominadas L-sit", pt: "Barra Fixa L-sit", nl: "L-sit Pull-ups" }, category: "Strength", type: "strength", met: 9.0, caloriesPerMinute: 9, muscleGroups: ["Back", "Core", "Biceps"] },
            { name: { en: "Australian Pull-ups", es: "Dominadas Australianas", pt: "Barra Fixa Australiana", nl: "Australian Pull-ups" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Hanging Leg Raises", es: "Elevaciones de Piernas Colgado", pt: "Elevações de Pernas Suspenso", nl: "Hanging Leg Raises" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core", "Hip Flexors"] },
            { name: { en: "Back Extensions", es: "Extensiones Espalda", pt: "Extensões Costas", nl: "Back Extensions" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "Reverse Snow Angels", es: "Ángeles de Nieve Invertidos", pt: "Anjos de Neve Invertidos", nl: "Reverse Snow Angels" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Back", "Shoulders"] },
            { name: { en: "Wall-supported Back Arch", es: "Arco Espalda Apoyado en Pared", pt: "Arco Costas Apoiado na Parede", nl: "Wall-supported Back Arch" }, category: "Strength", type: "strength", met: 3.0, caloriesPerMinute: 3, muscleGroups: ["Back"] },
            { name: { en: "Hollow Body Hold", es: "Mantenimiento Cuerpo Hueco", pt: "Manutenção Corpo Oco", nl: "Hollow Body Hold" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Human Flag", es: "Bandera Humana", pt: "Bandeira Humana", nl: "Human Flag" }, category: "Strength", type: "strength", met: 10.0, caloriesPerMinute: 10, muscleGroups: ["Core", "Shoulders", "Back"] },
            { name: { en: "Towel Pull-ups", es: "Dominadas con Toalla", pt: "Barra Fixa com Toalha", nl: "Towel Pull-ups" }, category: "Strength", type: "strength", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Seated Row", es: "Remo Sentado", pt: "Remo Sentado", nl: "Seated Row" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Bent Over Barbell Row", es: "Remo con Barra Inclinado", pt: "Remo com Barra Inclinado", nl: "Bent Over Barbell Row" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "T-Bar Row", es: "Remo con Barra T", pt: "Remo com Barra T", nl: "T-Bar Row" }, category: "Strength", type: "strength", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Pull-ups Assisted Machine", es: "Dominadas Asistidas Máquina", pt: "Barra Fixa Assistida Máquina", nl: "Pull-ups Assisted Machine" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Cable Row", es: "Remo con Cable", pt: "Remo com Cabo", nl: "Cable Row" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Machine Back Extension", es: "Extensión Espalda Máquina", pt: "Extensão Costas Máquina", nl: "Machine Back Extension" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "Hyperextensions with Pad", es: "Hiperextensiones con Almohadilla", pt: "Hiperextensões com Almofada", nl: "Hyperextensions with Pad" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "Lat Pullover Machine", es: "Estiramiento Lat Máquina", pt: "Alongamento Lat Máquina", nl: "Lat Pullover Machine" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Chest", "Lats"] },
            { name: { en: "Reverse Fly Cable", es: "Vuelo Invertido Cable", pt: "Voo Invertido Cabo", nl: "Reverse Fly Cable" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Back", "Shoulders"] },
            { name: { en: "Straight Arm Pulldown", es: "Jalón Brazo Recto", pt: "Puxada Braço Reto", nl: "Straight Arm Pulldown" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Lats"] },
            { name: { en: "Dumbbell Deadlifts", es: "Peso Muerto con Mancuernas", pt: "Levantamento Terra com Halteres", nl: "Dumbbell Deadlifts" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Glutes", "Legs"] },
            { name: { en: "Dumbbell Row Single Arm", es: "Remo con Mancuernas Un Brazo", pt: "Remo com Halteres Um Braço", nl: "Dumbbell Row Single Arm" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Barbell Shrug", es: "Encogimiento con Barra", pt: "Encolhimento com Barra", nl: "Barbell Shrug" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Traps"] },
            { name: { en: "Dumbbell Shrug", es: "Encogimiento con Mancuernas", pt: "Encolhimento com Halteres", nl: "Dumbbell Shrug" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Traps"] },
            { name: { en: "Cable Face Pull", es: "Tirón a la Cara con Cable", pt: "Puxada na Face com Cabo", nl: "Cable Face Pull" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Back", "Shoulders"] },
            { name: { en: "Reverse Grip Lat Pulldown", es: "Jalón Agarre Invertido", pt: "Puxada Agarre Invertido", nl: "Reverse Grip Lat Pulldown" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Wide Grip Pull-ups Weighted", es: "Dominadas Agarre Ancho Peso", pt: "Barra Fixa Agarre Aberto Peso", nl: "Wide Grip Pull-ups Weighted" }, category: "Strength", type: "strength", met: 9.0, caloriesPerMinute: 9, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Underhand Lat Pulldown", es: "Jalón Agarre Bajo", pt: "Puxada Agarre Abaixo", nl: "Underhand Lat Pulldown" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Smith Machine Bent Over Row", es: "Remo Inclinado Máquina Smith", pt: "Remo Inclinado Máquina Smith", nl: "Smith Machine Bent Over Row" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Seated Cable Row Wide Grip", es: "Remo Sentado Cable Agarre Ancho", pt: "Remo Sentado Cabo Agarre Aberto", nl: "Seated Cable Row Wide Grip" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Lever Pulldown", es: "Palanca Jalón", pt: "Alavanca Puxada", nl: "Lever Pulldown" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Lats"] },
            { name: { en: "Plate Loaded T-Row", es: "Remo T con Placas", pt: "Remo T com Placas", nl: "Plate Loaded T-Row" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Barbell Romanian Deadlifts", es: "Peso Muerto Rumano con Barra", pt: "Levantamento Terra Romeno com Barra", nl: "Barbell Romanian Deadlifts" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Hamstrings", "Glutes"] },
            { name: { en: "Trap Bar Deadlifts", es: "Peso Muerto con Barra Hexagonal", pt: "Levantamento Terra com Barra Hexagonal", nl: "Trap Bar Deadlifts" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Back", "Glutes", "Legs"] },
            { name: { en: "Dumbbell Pullover", es: "Estiramiento con Mancuernas", pt: "Alongamento com Halteres", nl: "Dumbbell Pullover" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Chest", "Lats", "Triceps"] },
            { name: { en: "Cable High Row", es: "Remo Alto Cable", pt: "Remo Alto Cabo", nl: "Cable High Row" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Back", "Shoulders"] },
            { name: { en: "Machine Row", es: "Remo Máquina", pt: "Remo Máquina", nl: "Machine Row" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Back", "Biceps"] },
            { name: { en: "Back Extension 45-degree", es: "Extensión Espalda 45 grados", pt: "Extensão Costas 45 graus", nl: "Back Extension 45-degree" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Back", "Glutes"] },
            { name: { en: "Push Press Barbell", es: "Press Empuje con Barra", pt: "Press Empurrão com Barra", nl: "Push Press Barbell" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Shoulders", "Triceps", "Core"] },
            { name: { en: "Dumbbell Shoulder Press", es: "Press de Hombros con Mancuernas", pt: "Desenvolvimento com Halteres", nl: "Dumbbell Shoulder Press" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Shoulders", "Triceps"] },
            { name: { en: "Lateral Raise Dumbbells", es: "Elevación Lateral con Mancuernas", pt: "Elevação Lateral com Halteres", nl: "Lateral Raise Dumbbells" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Shoulders"] },
            { name: { en: "Front Raise Dumbbells", es: "Elevación Frontal con Mancuernas", pt: "Elevação Frontal com Halteres", nl: "Front Raise Dumbbells" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Shoulders"] },
            { name: { en: "Rear Delt Fly Dumbbells", es: "Vuelo Delt Posterior con Mancuernas", pt: "Voo Deltoide Posterior com Halteres", nl: "Rear Delt Fly Dumbbells" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Shoulders"] },
            { name: { en: "Arnold Press", es: "Press Arnold", pt: "Desenvolvimento Arnold", nl: "Arnold Press" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Shoulders", "Triceps"] },
            { name: { en: "Overhead Press Barbell", es: "Press por Encima de la Cabeza con Barra", pt: "Desenvolvimento com Barra", nl: "Overhead Press Barbell" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Shoulders", "Triceps"] },
            { name: { en: "Cable Lateral Raise", es: "Elevación Lateral con Cable", pt: "Elevação Lateral com Cabo", nl: "Cable Lateral Raise" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Shoulders"] },
            { name: { en: "Cable Front Raise", es: "Elevación Frontal con Cable", pt: "Elevação Frontal com Cabo", nl: "Cable Front Raise" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Shoulders"] },
            { name: { en: "Reverse Fly Cable", es: "Vuelo Invertido Cable", pt: "Voo Invertido Cabo", nl: "Reverse Fly Cable" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Shoulders", "Back"] },
            { name: { en: "Dumbbell Shrug", es: "Encogimiento con Mancuernas", pt: "Encolhimento com Halteres", nl: "Dumbbell Shrug" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Traps"] },
            { name: { en: "Upright Row Barbell", es: "Remo Vertical con Barra", pt: "Remo Vertical com Barra", nl: "Upright Row Barbell" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Shoulders", "Traps"] },
            { name: { en: "Handstand Push-ups", es: "Flexiones de Pino", pt: "Flexões de Mão", nl: "Handstand Push-ups" }, category: "Strength", type: "strength", met: 12.0, caloriesPerMinute: 12, muscleGroups: ["Shoulders", "Triceps", "Core"] },
            { name: { en: "Pike Push-ups", es: "Flexiones Pico", pt: "Flexões Pica", nl: "Pike Push-ups" }, category: "Strength", type: "strength", met: 8.5, caloriesPerMinute: 9, muscleGroups: ["Shoulders", "Triceps"] },
            { name: { en: "Wall Walk Bodyweight", es: "Caminata en Pared Peso Corporal", pt: "Caminhada na Parede Peso Corporal", nl: "Wall Walk Bodyweight" }, category: "Strength", type: "strength", met: 9.0, caloriesPerMinute: 9, muscleGroups: ["Shoulders", "Core"] },
            { name: { en: "Dumbbell Javelin Press", es: "Press Jabalina con Mancuernas", pt: "Press Dardo com Halteres", nl: "Dumbbell Javelin Press" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Shoulders", "Triceps"] },
            { name: { en: "Single-Arm Dumbbell Press", es: "Press Un Brazo con Mancuernas", pt: "Desenvolvimento Um Braço com Halteres", nl: "Single-Arm Dumbbell Press" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Shoulders", "Core"] },
            { name: { en: "45-degree Incline Dumbbell Press", es: "Press Inclinado 45 grados con Mancuernas", pt: "Supino Inclinado 45 graus com Halteres", nl: "45-degree Incline Dumbbell Press" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Shoulders", "Chest"] },
            { name: { en: "Lateral Raise Resistance Band", es: "Elevación Lateral con Banda Resistencia", pt: "Elevação Lateral com Banda Elástica", nl: "Lateral Raise Resistance Band" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Shoulders"] },
            { name: { en: "Front Plate Raise", es: "Elevación Frontal con Placa", pt: "Elevação Frontal com Placa", nl: "Front Plate Raise" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Shoulders"] },
            { name: { en: "Dumbbell Interlock Press", es: "Press Entrelazado con Mancuernas", pt: "Supine Entrelaçado com Halteres", nl: "Dumbbell Interlock Press" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Shoulders", "Chest"] },
            { name: { en: "Overhead Dumbbell Extension", es: "Extensión por Encima con Mancuernas", pt: "Extensão por Cima com Halteres", nl: "Overhead Dumbbell Extension" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Triceps"] },
            { name: { en: "Cable External Rotation", es: "Rotación Externa con Cable", pt: "Rotação Externa com Cabo", nl: "Cable External Rotation" }, category: "Strength", type: "strength", met: 3.0, caloriesPerMinute: 3, muscleGroups: ["Shoulders"] },
            { name: { en: "Dumbbell Internal Rotation", es: "Rotación Interna con Mancuernas", pt: "Rotação Interna com Halteres", nl: "Dumbbell Internal Rotation" }, category: "Strength", type: "strength", met: 3.0, caloriesPerMinute: 3, muscleGroups: ["Shoulders"] },
            { name: { en: "Shoulder Dislocations Stick", es: "Dislocaciones Hombro con Palo", pt: "Deslocamentos Ombro com Bastão", nl: "Shoulder Dislocations Stick" }, category: "Strength", type: "strength", met: 2.5, caloriesPerMinute: 3, muscleGroups: ["Shoulders"] },
            { name: { en: "Bulgarian Split Squats", es: "Sentadillas Búlgaras Divididas", pt: "Agachamentos Búlgaros Divididos", nl: "Bulgarian Split Squats" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Step-ups", es: "Subidas al Escalón", pt: "Subidas no Degrau", nl: "Step-ups" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Calf Raises", es: "Elevaciones de Gemelos", pt: "Elevações de Panturrilhas", nl: "Calf Raises" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Calves"] },
            { name: { en: "Leg Extensions", es: "Extensiones de Piernas", pt: "Extensões de Pernas", nl: "Leg Extensions" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Quads"] },
            { name: { en: "Leg Curls", es: "Curls de Piernas", pt: "Roscas de Pernas", nl: "Leg Curls" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Hamstrings"] },
            { name: { en: "Sissy Squats", es: "Sentadillas Sissy", pt: "Agachamentos Sissy", nl: "Sissy Squats" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Quads"] },
            { name: { en: "Pistol Squats", es: "Sentadillas Pistola", pt: "Agachamentos Pistola", nl: "Pistol Squats" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Wall Sits", es: "Sentadillas en Pared", pt: "Agachamentos na Parede", nl: "Wall Sits" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Quads"] },
            { name: { en: "Box Jumps", es: "Saltos a Caja", pt: "Saltos na Caixa", nl: "Box Jumps" }, category: "Strength", type: "strength", met: 10.0, caloriesPerMinute: 10, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Dumbbell Squats", es: "Sentadillas con Mancuernas", pt: "Agachamentos com Halteres", nl: "Dumbbell Squats" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Barbell Squats", es: "Sentadillas con Barra", pt: "Agachamentos com Barra", nl: "Barbell Squats" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Sumo Squats", es: "Sentadillas Sumo", pt: "Agachamentos Sumo", nl: "Sumo Squats" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Hack Squats", es: "Sentadillas Hack", pt: "Agachamentos Hack", nl: "Hack Squats" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Smith Machine Squats", es: "Sentadillas Máquina Smith", pt: "Agachamentos Máquina Smith", nl: "Smith Machine Squats" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Single-Leg Press", es: "Press Pierna Única", pt: "Press Perna Única", nl: "Single-Leg Press" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs"] },
            { name: { en: "Calf Raises Standing", es: "Elevaciones de Gemelos de Pie", pt: "Elevações de Panturrilhas em Pé", nl: "Calf Raises Standing" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Calves"] },
            { name: { en: "Donkey Calf Raises", es: "Elevaciones de Gemelos Burro", pt: "Elevações de Panturrilhas Burro", nl: "Donkey Calf Raises" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Calves"] },
            { name: { en: "Seated Calf Raises", es: "Elevaciones de Gemelos Sentado", pt: "Elevações de Panturrilhas Sentado", nl: "Seated Calf Raises" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Calves"] },
            { name: { en: "Leg Press Calf Raise", es: "Elevación Gemelos Press Piernas", pt: "Elevação Panturrilhas Press Pernas", nl: "Leg Press Calf Raise" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Calves", "Quads"] },
            { name: { en: "Jump Squats", es: "Sentadillas con Salto", pt: "Agachamentos com Salto", nl: "Jump Squats" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Lunges Walking", es: "Zancadas Caminando", pt: "Passadas Caminhando", nl: "Lunges Walking" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Lunges Stationary", es: "Zancadas Estacionarias", pt: "Passadas Estacionárias", nl: "Lunges Stationary" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Dumbbell Lunges", es: "Zancadas con Mancuernas", pt: "Passadas com Halteres", nl: "Dumbbell Lunges" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Barbell Lunges", es: "Zancadas con Barra", pt: "Passadas com Barra", nl: "Barbell Lunges" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Glute-Ham Raises", es: "Elevaciones Glúteo Isquiotibial", pt: "Elevações Glúteo Isquiotibial", nl: "Glute-Ham Raises" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Hamstrings", "Glutes"] },
            { name: { en: "Krupp Squats", es: "Sentadillas Krupp", pt: "Agachamentos Krupp", nl: "Krupp Squats" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Single-Leg Deadlifts", es: "Peso Muerto Pierna Única", pt: "Levantamento Terra Perna Única", nl: "Single-Leg Deadlifts" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Legs", "Back", "Core"] },
            { name: { en: "Dumbbell Step-ups", es: "Subidas Escalón con Mancuernas", pt: "Subidas Degrau com Halteres", nl: "Dumbbell Step-ups" }, category: "Strength", type: "strength", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Box Squats", es: "Sentadillas en Caja", pt: "Agachamentos na Caixa", nl: "Box Squats" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Front Squats", es: "Sentadillas Frontales", pt: "Agachamentos Frontais", nl: "Front Squats" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Zercher Squats", es: "Sentadillas Zercher", pt: "Agachamentos Zercher", nl: "Zercher Squats" }, category: "Strength", type: "strength", met: 7.0, caloriesPerMinute: 7, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Sled Push", es: "Empuje Trineo", pt: "Empurrão de Sled", nl: "Sled Push" }, category: "Strength", type: "strength", met: 9.0, caloriesPerMinute: 9, muscleGroups: ["Full Body"] },
            { name: { en: "Cleg Raises Ankle Weights", es: "Elevaciones Cleg Pesos de Tobillo", pt: "Elevações Cleg Pesos de Tornozelo", nl: "Cleg Raises Ankle Weights" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Hip Flexors"] },
            { name: { en: "Side Lunges", es: "Zancadas Laterales", pt: "Passadas Laterais", nl: "Side Lunges" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Curtsy Lunges", es: "Zancadas Reverencia", pt: "Passadas Reverência", nl: "Curtsy Lunges" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Hip Thrusts", es: "Empuje de Cadera", pt: "Empurrão de Quadril", nl: "Hip Thrusts" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Glutes", "Hamstrings"] },
            { name: { en: "Glute Kickbacks Cable", es: "Patada Glúteo Cable", pt: "Chute Glúteo Cabo", nl: "Glute Kickbacks Cable" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Glutes"] },
            { name: { en: "Fire Hydrants Bodyweight", es: "Hidrantes Peso Corporal", pt: "Bombeiro Peso Corporal", nl: "Fire Hydrants Bodyweight" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Glutes"] },
            { name: { en: "Donkey Kicks", es: "Patadas de Burro", pt: "Chutes de Burro", nl: "Donkey Kicks" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Glutes"] },
            { name: { en: "Side Leg Raises Bodyweight", es: "Elevaciones Laterales Piernas Peso Corporal", pt: "Elevações Laterais Pernas Peso Corporal", nl: "Side Leg Raises Bodyweight" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Hip Abductors"] },
            { name: { en: "Clute Bridges Single-leg", es: "Puente Glúteo Pierna Única", pt: "Elevação Pélvica Perna Única", nl: "Clute Bridges Single-leg" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Glutes", "Hamstrings"] },
            { name: { en: "Romanian Deadlifts Dumbbells", es: "Peso Muerto Rumano con Mancuernas", pt: "Levantamento Terra Romeno com Halteres", nl: "Romanian Deadlifts Dumbbells" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Hamstrings", "Glutes", "Back"] },
            { name: { en: "Sumo Squats Dumbbells", es: "Sentadillas Sumo con Mancuernas", pt: "Agachamentos Sumo com Halteres", nl: "Sumo Squats Dumbbells" }, category: "Strength", type: "strength", met: 6.5, caloriesPerMinute: 7, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Lateral Walks Band", es: "Caminatas Laterales Banda", pt: "Caminhadas Laterais Banda", nl: "Lateral Walks Band" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Hip Abductors"] },
            { name: { en: "Step-back Lunges", es: "Zancadas Paso Atrás", pt: "Passadas Passo Atrás", nl: "Step-back Lunges" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Curtsy Lunges Dumbbells", es: "Zancadas Reverencia con Mancuernas", pt: "Passadas Reverência com Halteres", nl: "Curtsy Lunges Dumbbells" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Glute-Ham Raises Machine", es: "Elevaciones Glúteo Isquiotibial Máquina", pt: "Elevações Glúteo Isquiotibial Máquina", nl: "Glute-Ham Raises Machine" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Hamstrings", "Glutes"] },
            { name: { en: "Single-Leg Glute Bridges", es: "Puente Glúteo Pierna Única", pt: "Elevação Pélvica Perna Única", nl: "Single-Leg Glute Bridges" }, category: "Strength", type: "strength", met: 5.5, caloriesPerMinute: 6, muscleGroups: ["Glutes", "Hamstrings"] },
            { name: { en: "Banded Walks", es: "Caminatas con Banda", pt: "Caminhadas com Banda", nl: "Banded Walks" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Hip Abductors", "Glutes"] },
            { name: { en: "Elevated Leg Heel Touches", es: "Toques Talón Pierna Elevada", pt: "Toques Calcanhar Perna Elevada", nl: "Elevated Leg Heel Touches" }, category: "Strength", type: "strength", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Core", "Legs"] },
            { name: { en: "Plank", es: "Plancha", pt: "Prancha", nl: "Plank" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Russian Twists", es: "Giros Rusos", pt: "Torção Russa", nl: "Russian Twists" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Core"] },
            { name: { en: "Leg Raises Hanging", es: "Elevaciones de Piernas Colgado", pt: "Elevações de Pernas Suspenso", nl: "Leg Raises Hanging" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core", "Hip Flexors"] },
            { name: { en: "Bicycle Crunches", es: "Bicicleta Abdominales", pt: "Bicicleta Abdominais", nl: "Bicycle Crunches" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Crunch", es: "Abdominales", pt: "Abdominais", nl: "Crunch" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Reverse Crunch", es: "Abdominales Invertidos", pt: "Abdominais Invertidos", nl: "Reverse Crunch" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Side Plank", es: "Plancha Lateral", pt: "Prancha Lateral", nl: "Side Plank" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Mountain Climbers", es: "Escaladores", pt: "Alpinistas", nl: "Mountain Climbers" }, category: "Strength", type: "strength", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Core", "Cardio"] },
            { name: { en: "Flutter Kicks", es: "Patadas Mariposa", pt: "Chutes Borboleta", nl: "Flutter Kicks" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Scissors", es: "Tijeras", pt: "Tesoura", nl: "Scissors" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "L-sit", es: "L-sentado", pt: "L-sentado", nl: "L-sit" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "V-ups", es: "V-elevaciones", pt: "V-elevações", nl: "V-ups" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Cable Rotations", es: "Rotaciones con Cable", pt: "Rotações com Cabo", nl: "Cable Rotations" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Medicine Ball Slams", es: "Golpes con Balón Medicina", pt: "Golpes com Bola Medicina", nl: "Medicine Ball Slams" }, category: "Strength", type: "strength", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Core", "Full Body"] },
            { name: { en: "Pallof Press", es: "Press Pallof", pt: "Press Pallof", nl: "Pallof Press" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Ab Wheel Rollouts", es: "Rodillos Rueda Abdominal", pt: "Rolamentos Roda Abdominal", nl: "Ab Wheel Rollouts" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Side Plank with Leg Lift", es: "Plancha Lateral Elevación Pierna", pt: "Prancha Lateral Elevação Perna", nl: "Side Plank with Leg Lift" }, category: "Strength", type: "strength", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Hanging Knee Raises", es: "Elevaciones de Rodillas Colgado", pt: "Elevações de Joelhos Suspenso", nl: "Hanging Knee Raises" }, category: "Strength", type: "strength", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Core"] },
            { name: { en: "Draw-ins", es: "Contracciones", pt: "Contrações", nl: "Draw-ins" }, category: "Strength", type: "strength", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Core"] },
            { name: { en: "Dead Bugs", es: "Bichos Muertos", pt: "Bichos Mortos", nl: "Dead Bugs" }, category: "Strength", type: "strength", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Core"] },

            // CARDIO
            { name: { en: "Running", es: "Correr", pt: "Corrida", nl: "Hardlopen" }, category: "Cardio", type: "cardio", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Legs", "Cardio"] },
            { name: { en: "Cycling", es: "Ciclismo", pt: "Ciclismo", nl: "Fietsen" }, category: "Cardio", type: "cardio", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Legs", "Cardio"] },
            { name: { en: "Rowing Machine", es: "Máquina de Remo", pt: "Remo", nl: "Roeien" }, category: "Cardio", type: "cardio", met: 9.0, caloriesPerMinute: 10, muscleGroups: ["Full Body"] },
            { name: { en: "Jump Rope", es: "Saltar la Cuerda", pt: "Pular Corda", nl: "Touwtjespringen" }, category: "Cardio", type: "cardio", met: 12.0, caloriesPerMinute: 12, muscleGroups: ["Full Body"] },
            { name: { en: "Walking", es: "Caminar", pt: "Caminhada", nl: "Wandelen" }, category: "Cardio", type: "cardio", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Legs"] },
            { name: { en: "Swimming", es: "Natación", pt: "Natação", nl: "Zwemmen" }, category: "Cardio", type: "cardio", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Full Body"] },
            { name: { en: "Elliptical", es: "Elíptica", pt: "Elíptico", nl: "Crosstrainer" }, category: "Cardio", type: "cardio", met: 6.0, caloriesPerMinute: 7, muscleGroups: ["Legs", "Cardio"] },
            { name: { en: "Stair Climber", es: "Escaladora", pt: "Escada", nl: "Traplopen" }, category: "Cardio", type: "cardio", met: 9.0, caloriesPerMinute: 10, muscleGroups: ["Legs"] },
            { name: { en: "Hiking with Incline", es: "Senderismo con Inclinación", pt: "Trilha com Inclinação", nl: "Hiking with Incline" }, category: "Cardio", type: "cardio", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Legs", "Glutes"] },
            { name: { en: "Mountain Biking", es: "Ciclismo de Montaña", pt: "Ciclismo de Montanha", nl: "Mountain Biking" }, category: "Cardio", type: "cardio", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Trail Running", es: "Correr en Sendero", pt: "Corrida na Trilha", nl: "Trail Running" }, category: "Cardio", type: "cardio", met: 11.0, caloriesPerMinute: 12, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Hill Sprints", es: "Sprints en Colina", pt: "Sprints na Colina", nl: "Hill Sprints" }, category: "Cardio", type: "cardio", met: 12.0, caloriesPerMinute: 13, muscleGroups: ["Legs", "Core"] },
            { name: { en: "Indoor Cycling Classes", es: "Clases Ciclismo Interior", pt: "Aulas de Ciclismo Indoor", nl: "Indoor Cycling Classes" }, category: "Cardio", type: "cardio", met: 9.0, caloriesPerMinute: 10, muscleGroups: ["Legs", "Cardio"] },
            { name: { en: "Outdoor Road Cycling", es: "Ciclismo Carretera Exterior", pt: "Ciclismo Estrada Outdoor", nl: "Outdoor Road Cycling" }, category: "Cardio", type: "cardio", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Legs", "Cardio"] },
            { name: { en: "Skydiving", es: "Paracaidismo", pt: "Paraquedismo", nl: "Skydiving" }, category: "Cardio", type: "cardio", met: 12.0, caloriesPerMinute: 12, muscleGroups: ["Full Body"] },
            { name: { en: "Paragliding", es: "Parapente", pt: "Parapente", nl: "Paragliding" }, category: "Cardio", type: "cardio", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Full Body"] },
            { name: { en: "Indoor Skydiving", es: "Paracaidismo Interior", pt: "Paraquedismo Indoor", nl: "Indoor Skydiving" }, category: "Cardio", type: "cardio", met: 10.0, caloriesPerMinute: 10, muscleGroups: ["Full Body"] },
            { name: { en: "Zumba", es: "Zumba", pt: "Zumba", nl: "Zumba" }, category: "Cardio", type: "cardio", met: 7.5, caloriesPerMinute: 8, muscleGroups: ["Full Body"] },
            { name: { en: "Hip Hop", es: "Hip Hop", pt: "Hip Hop", nl: "Hip Hop" }, category: "Cardio", type: "cardio", met: 9.0, caloriesPerMinute: 10, muscleGroups: ["Full Body"] },
            { name: { en: "Vinyasa Flow", es: "Flujo Vinyasa", pt: "Fluxo Vinyasa", nl: "Vinyasa Flow" }, category: "Flexibility", type: "yoga", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Asana Sequences", es: "Secuencias Asana", pt: "Sequências Asana", nl: "Asana Sequences" }, category: "Flexibility", type: "yoga", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Power Yoga", es: "Yoga Poder", pt: "Yoga Poder", nl: "Power Yoga" }, category: "Flexibility", type: "yoga", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Hatha Yoga", es: "Yoga Hatha", pt: "Yoga Hatha", nl: "Hatha Yoga" }, category: "Flexibility", type: "yoga", met: 3.0, caloriesPerMinute: 3, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Restorative Yoga", es: "Yoga Restaurativo", pt: "Yoga Restaurativo", nl: "Restorative Yoga" }, category: "Flexibility", type: "yoga", met: 2.5, caloriesPerMinute: 3, muscleGroups: ["Mobility"] },
            { name: { en: "Yoga HIIT", es: "Yoga HIIT", pt: "Yoga HIIT", nl: "Yoga HIIT" }, category: "Flexibility", type: "yoga", met: 8.0, caloriesPerMinute: 8, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Sun Salutations", es: "Saludos al Sol", pt: "Saudações ao Sol", nl: "Sun Salutations" }, category: "Flexibility", type: "yoga", met: 4.0, caloriesPerMinute: 4, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Warrior Flows", es: "Flujos Guerrero", pt: "Fluxos Guerreiro", nl: "Warrior Flows" }, category: "Flexibility", type: "yoga", met: 4.5, caloriesPerMinute: 5, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Chair Pose Variations", es: "Variaciones Postura Silla", pt: "Variações Postura Cadeira", nl: "Chair Pose Variations" }, category: "Flexibility", type: "yoga", met: 3.0, caloriesPerMinute: 3, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Downward-facing Dog Jumps", es: "Saltos Perro Boca Abajo", pt: "Saltos Cachorro Cara Abaixo", nl: "Downward-facing Dog Jumps" }, category: "Flexibility", type: "yoga", met: 5.0, caloriesPerMinute: 5, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Partner Exercises", es: "Ejercicios con Pareja", pt: "Exercícios com Parceiro", nl: "Partner Exercises" }, category: "Flexibility", type: "yoga", met: 6.0, caloriesPerMinute: 6, muscleGroups: ["Full Body"] },
            { name: { en: "Hiking", es: "Senderismo", pt: "Trilha", nl: "Hiken" }, category: "Cardio", type: "cardio", met: 7.0, caloriesPerMinute: 8, muscleGroups: ["Legs"] },
            { name: { en: "Dancing", es: "Bailar", pt: "Dança", nl: "Dansen" }, category: "Cardio", type: "cardio", met: 5.0, caloriesPerMinute: 6, muscleGroups: ["Full Body"] },

            // HIIT
            { name: { en: "HIIT Circuit", es: "Circuito HIIT", pt: "Circuito HIIT", nl: "HIIT Circuit" }, category: "HIIT", type: "hiit", met: 13.0, caloriesPerMinute: 13, muscleGroups: ["Full Body"] },
            { name: { en: "Burpees", es: "Burpees", pt: "Burpees", nl: "Burpees" }, category: "HIIT", type: "hiit", met: 11.0, caloriesPerMinute: 12, muscleGroups: ["Full Body"] },
            { name: { en: "Mountain Climbers", es: "Escaladores", pt: "Alpinistas", nl: "Mountain Climbers" }, category: "HIIT", type: "hiit", met: 10.0, caloriesPerMinute: 11, muscleGroups: ["Core", "Cardio"] },
            { name: { en: "Jumping Jacks", es: "Saltos de Tijera", pt: "Polichinelos", nl: "Jumping Jacks" }, category: "HIIT", type: "hiit", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Cardio"] },
            { name: { en: "Box Jumps", es: "Saltos al Cajón", pt: "Saltos na Caixa", nl: "Box Jumps" }, category: "HIIT", type: "hiit", met: 8.0, caloriesPerMinute: 9, muscleGroups: ["Legs"] },

            // YOGA/FLEXIBILITY
            { name: { en: "Yoga Flow", es: "Flujo de Yoga", pt: "Fluxo de Yoga", nl: "Yoga Flow" }, category: "Flexibility", type: "yoga", met: 3.0, caloriesPerMinute: 4, muscleGroups: ["Mobility", "Core"] },
            { name: { en: "Pilates", es: "Pilates", pt: "Pilates", nl: "Pilates" }, category: "Flexibility", type: "yoga", met: 3.5, caloriesPerMinute: 4, muscleGroups: ["Core", "Mobility"] },
            { name: { en: "Stretching", es: "Estiramiento", pt: "Alongamento", nl: "Stretching" }, category: "Flexibility", type: "yoga", met: 2.5, caloriesPerMinute: 3, muscleGroups: ["Mobility"] },
        ];

        for (const ex of initial) {
            await ctx.db.insert("exerciseLibrary", {
                ...ex,
                nameLower: ex.name.en.toLowerCase(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            } as any);
        }
        return { success: true, count: initial.length };
    },
});

// --- Public Queries ---

export const list = query({
    args: {
        search: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let exercises;

        if (args.search) {
            // 1. Try Full-Text Search
            exercises = await ctx.db
                .query("exerciseLibrary")
                .withSearchIndex("search_name", (q) => q.search("nameLower", args.search!))
                .take(50);

            // 2. Fallback: If no results, try simple substring match (broader)
            if (exercises.length === 0) {
                const searchLower = args.search.toLowerCase();
                exercises = await ctx.db
                    .query("exerciseLibrary")
                    .withIndex("by_nameLower")
                    .filter((q) => q.gte(q.field("nameLower"), searchLower)) // Simple optimization attempt
                    .take(100);

                // Precise filtering in memory since comparison operators on strings can be tricky for "contains"
                // Actually, standard filter scan is safer for "contains" fallback
                const allScan = await ctx.db.query("exerciseLibrary").take(200);
                exercises = allScan.filter(e => e.nameLower.includes(searchLower));
            }
        } else {
            // No search query: fetch recent
            // Optimization: if category is present, use the index
            if (args.category && args.category !== 'All') {
                exercises = await ctx.db
                    .query("exerciseLibrary")
                    .withIndex("by_category", (q) => q.eq("category", args.category!))
                    .order("desc")
                    .take(50);
                return exercises;
            }
            exercises = await ctx.db.query("exerciseLibrary").order("desc").take(50);
        }

        if (args.category && args.category !== 'All') {
            exercises = exercises.filter((e) => e.category === args.category);
        }

        return exercises;
    },
});

export const getByNames = query({
    args: { names: v.array(v.string()) },
    handler: async (ctx, args) => {
        const namesLower = args.names.map(n => n.toLowerCase());
        return await ctx.db
            .query("exerciseLibrary")
            .filter((q) => q.or(...namesLower.map(n => q.eq(q.field("nameLower"), n))))
            .collect();
    }
});
