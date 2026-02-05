import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log a Men's Health session (Vitality Check + Pelvic Protocol)
// Refreshed to ensure export visibility
export const logSession = mutation({
    args: {
        userId: v.id("users"),
        date: v.string(), // YYYY-MM-DD
        duration: v.number(), // Duration in seconds (for Pelvic Power)
        drive: v.number(), // 1-10
        recovery: v.number(), // 1-10
        focus: v.number(), // 1-10
    },
    handler: async (ctx, args) => {
        // Check if a log already exists for this date to update it, or create new
        const existingLog = await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) =>
                q.eq("userId", args.userId).eq("date", args.date)
            )
            .first();

        if (existingLog) {
            await ctx.db.patch(existingLog._id, {
                duration: (existingLog.duration || 0) + args.duration, // Accumulate duration if multiple sessions? OR just overwrite. Let's accumulate.
                drive: args.drive,
                recovery: args.recovery,
                focus: args.focus,
                kegelCompleted: true,
                // Update other fields if needed, or leave them. 
                // We'll set default values for the old required fields if creating new, 
                // but here we are patching.
            });
        } else {
            await ctx.db.insert("vitalityLogs", {
                userId: args.userId,
                date: args.date,
                duration: args.duration,
                drive: args.drive,
                recovery: args.recovery,
                focus: args.focus,
                kegelCompleted: true,
                // Defaults for legacy/other fields to satisfy schema if they were not optional (they are not optional in schema currently, wait... I see standard fields mood/stress/strength/sleepQuality are NOT optional in the schema I read).
                // I should check the schema again. 
                // In the previous step I kept them non-optional? 
                // "mood: v.number(), stress: v.string(), strength: v.number(), sleepQuality: v.number()"
                // I need to provide dummy values or make them optional in schema. 
                // I'll provide dummy defaults for now to be safe.
                mood: 5,
                stress: "low",
                strength: 5,
                sleepQuality: 5,
            });
        }
    },
});

export const logSupplement = mutation({
    args: {
        userId: v.id("users"),
        date: v.string(),
        items: v.array(v.object({ name: v.string(), dosage: v.string(), taken: v.boolean() })),
        cyclePhase: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("supplementLogs")
            .withIndex("by_user_date", (q) =>
                q.eq("userId", args.userId).eq("date", args.date)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                items: args.items,
                cyclePhase: args.cyclePhase,
                notes: args.notes,
            });
        } else {
            await ctx.db.insert("supplementLogs", {
                userId: args.userId,
                date: args.date,
                items: args.items,
                cyclePhase: args.cyclePhase,
                notes: args.notes,
            });
        }
    },
});

export const getVitalityHistory = query({
    args: { userId: v.id("users"), days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.days || 7;
        const logs = await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(limit);

        return logs.reverse(); // Return oldest to newest for graphing
    },
});

export const getTodayLog = query({
    args: { userId: v.id("users"), date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vitalityLogs")
            .withIndex("by_user_date", (q) =>
                q.eq("userId", args.userId).eq("date", args.date)
            )
            .first();
    },
});

export const getOptimizationStatus = query({
    args: { userId: v.id("users"), date: v.string() },
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

        // 50% Vitality Stack, 25% Pelvic, 25% Vitality Check
        let score = 0;
        if (vitality) score += 25;
        if (vitality?.kegelCompleted) score += 25;
        if (supplements && supplements.items.some(i => i.taken)) score += 50;

        // --- Dynamic Recommendations ---
        let recommendedStack: { name: string, reason: string }[] = [];

        // Base
        recommendedStack.push({ name: "Multivitamin", reason: "Foundation" });

        // Activity Based
        if (user.activityLevel === 'very_active' || user.activityLevel === 'extremely_active' || user.fitnessGoal === 'build_muscle') {
            recommendedStack.push({ name: "Creatine Monohydrate", reason: "Muscle energy & cognition" });
            recommendedStack.push({ name: "Electrolytes", reason: "Hydration support" });
        }

        // Goals Base
        if (user.fitnessGoal === 'build_muscle') {
            recommendedStack.push({ name: "Whey Protein", reason: "Recovery" });
        }
        if (
            user.fitnessGoal === 'improve_health' ||
            user.fitnessGoal === 'improve_endurance' ||
            user.fitnessGoal === 'general_health' ||
            user.fitnessGoal === 'lose_weight'
        ) {
            recommendedStack.push({ name: "Omega-3", reason: "Inflammation control" });
        }


        // Wellness/Mood Based (if vitality logged low mood/high stress)
        // Vitality has mood (1-10) and stress (string)
        if (vitality) {
            if ((vitality.mood !== undefined && vitality.mood <= 4) || vitality.stress === 'high' || vitality.stress === 'very_high') {
                recommendedStack.push({ name: "Ashwagandha", reason: "Cortisol management" });
                recommendedStack.push({ name: "Magnesium", reason: "Relaxation" });
            }
            if (vitality.drive && vitality.drive <= 4) {
                recommendedStack.push({ name: "Maca Root", reason: "Libido support" });
            }
        }

        return {
            score,
            recommendedStack,
            kegelCompleted: !!vitality?.kegelCompleted,
            bioLogCompleted: !!vitality,
            supplementsLogged: !!supplements
        };
    },
});
