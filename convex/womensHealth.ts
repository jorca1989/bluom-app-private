import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Consolidated Bio-Log for Women (Mood + Energy + Cycle Symptoms)
// Refreshed to ensure export visibility
export const logBioCheck = mutation({
    args: {
        userId: v.id("users"),
        date: v.string(), // YYYY-MM-DD
        mood: v.number(), // 1-10
        energy: v.number(), // 1-10
        babyMovement: v.optional(v.number()),
        hotFlashSeverity: v.optional(v.number()),
        symptoms: v.array(v.string()), // For cycle/menopause/pregnancy
        flow: v.optional(v.string()), // For cycle
    },
    handler: async (ctx, args) => {
        // 1. Log Vitality (Mood + Energy)
        const existingVitality = await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();

        if (existingVitality) {
            await ctx.db.patch(existingVitality._id, {
                mood: args.mood,
                energy: args.energy,
                babyMovement: args.babyMovement,
                hotFlashSeverity: args.hotFlashSeverity,
            });
        } else {
            await ctx.db.insert("vitalityLogs", {
                userId: args.userId,
                date: args.date,
                mood: args.mood,
                energy: args.energy,
                babyMovement: args.babyMovement,
                hotFlashSeverity: args.hotFlashSeverity,
                strength: 0, // Default
                sleepQuality: 0, // Default
                stress: "normal", // Default
            });
        }

        // 2. Log Cycle (Symptoms + Flow)
        const existingCycle = await ctx.db
            .query("cycleLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();

        if (existingCycle) {
            await ctx.db.patch(existingCycle._id, {
                symptoms: args.symptoms,
                flow: args.flow,
            });
        } else {
            await ctx.db.insert("cycleLogs", {
                userId: args.userId,
                date: args.date,
                symptoms: args.symptoms,
                flow: args.flow,
            });
        }
    },
});

export const getOptimizationHistory = query({
    args: { userId: v.id("users"), days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.days || 7;
        const logs = await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(limit);

        return logs.reverse();
    },
});

export const getOptimizationStatus = query({
    args: { userId: v.id("users"), date: v.string() }, // TODAY
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        const vitality = await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();

        const supplements = await ctx.db
            .query("supplementLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();

        const stepsLog = await ctx.db
            .query("stepsEntries")
            .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
            .first();

        // --- Calculate Score ---
        // 50% Vitality Stack (Supplements)
        // 25% Pelvic Protocol (Kegel)
        // 25% Bio-Log (Vitality Check)

        let score = 0;

        // 1. Bio-Log (25%)
        if (vitality) score += 25;

        // 2. Pelvic Protocol (25%)
        if (vitality?.kegelCompleted) score += 25;

        // 3. Supplement Stack (50%)
        // If they took > 0 items, give full points for now, or proportional? Let's say if log exists and has items taken.
        if (supplements && supplements.items.some(i => i.taken)) score += 50;


        // --- Dynamic Stack Recommendations ---
        let recommendedStack: { name: string, reason: string }[] = [];
        const lifeStage = user.lifeStage || 'cycle';

        // Base by LifeStage
        if (lifeStage === 'pregnancy') {
            recommendedStack.push({ name: "Prenatal Multivitamin", reason: "Essential for development" });
            recommendedStack.push({ name: "Folate", reason: "Neural tube support" });
        } else if (lifeStage === 'menopause') {
            recommendedStack.push({ name: "Calcium + D3", reason: "Bone density protection" });
            recommendedStack.push({ name: "Black Cohosh", reason: "Hot flash support" });
        } else {
            recommendedStack.push({ name: "Magnesium Glycinate", reason: "Cycle & sleep support" });
            recommendedStack.push({ name: "Iron", reason: "Replenish levels" });
        }

        // Dynamic by Activity (Move)
        const isHighlyActive = (user.activityLevel === "very_active" || user.activityLevel === "extremely_active") || (stepsLog?.steps || 0) > 8000;
        if (isHighlyActive) {
            recommendedStack.push({ name: "Electrolytes", reason: "Hydration for high activity" });
        }

        // Dynamic by Wellness (Mood) - fetch mood from vitality or specialized wellness check
        // We know vitality log has mood.
        if (vitality?.mood && vitality.mood <= 4) {
            recommendedStack.push({ name: "Omega-3", reason: "Mood stabilization support" });
        }

        return {
            score,
            lifeStage,
            recommendedStack,
            kegelCompleted: !!vitality?.kegelCompleted,
            bioLogCompleted: !!vitality,
            supplementsLogged: !!supplements,
        };
    },
});
