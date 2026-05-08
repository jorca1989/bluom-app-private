import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getMetricStreaks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Helper for consecutive day streaks
    const calculateStreak = (dates: string[]) => {
      if (dates.length === 0) return 0;
      const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
      
      let streak = 0;
      let current = new Date(todayStr);

      // If they haven't logged today, check if they logged yesterday to keep streak alive
      if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;
      
      if (sorted[0] === yesterdayStr && sorted[0] !== todayStr) {
        current = new Date(yesterdayStr);
      }

      for (let i = 0; i < sorted.length; i++) {
        const d = sorted[i];
        if (d === current.toISOString().split("T")[0]) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    };

    // 1. Sugar Streak
    const sugarLogs = await ctx.db
      .query("sugarLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isSugarFree"), true))
      .collect();
    const sugarStreak = calculateStreak(sugarLogs.map((l) => l.date));

    // 2. Water Streak (assume 64oz+ is a "win")
    const waterLogs = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("waterOz"), 64))
      .collect();
    const waterStreak = calculateStreak(waterLogs.map((l) => l.date));

    // 3. Exercise Streak
    const exerciseLogs = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_type", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gt(q.field("caloriesBurned"), 0)) 
      .collect();
    const workoutStreak = calculateStreak(exerciseLogs.map((l) => l.date));

    // 4. Mood Streak
    const moodLogs = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .collect();
    const moodStreak = calculateStreak(moodLogs.map(l => l.date));

    // 5. Sleep Streak
    const sleepLogs = await ctx.db
      .query("sleepLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .collect();
    const sleepStreak = calculateStreak(sleepLogs.map(l => l.date));

    // 6. Meditation Streak
    const meditationLogs = await ctx.db
      .query("meditationLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .collect();
    const meditationStreak = calculateStreak(meditationLogs.map(l => l.date));

    return {
      sugar: sugarStreak,
      water: waterStreak,
      workout: workoutStreak,
      mood: moodStreak,
      sleep: sleepStreak,
      meditation: meditationStreak,
    };
  },
});
