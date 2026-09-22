import { v } from "convex/values";
import { query } from "./_generated/server";

// Kept intentionally compact: this is user-owned context for the coach, not a
// raw database export. Sensitive health domains are excluded until a dedicated
// consent setting is shipped.
export const getSnapshot = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const [user, food, exercise, habits] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.query("foodEntries").withIndex("by_user_date", q => q.eq("userId", args.userId).eq("date", args.date)).collect(),
      ctx.db.query("exerciseEntries").withIndex("by_user_and_date", q => q.eq("userId", args.userId).eq("date", args.date)).collect(),
      ctx.db.query("habits").withIndex("by_user", q => q.eq("userId", args.userId)).collect(),
    ]);
    if (!user) return null;
    const calories = food.reduce((sum, entry) => sum + entry.calories, 0);
    const protein = food.reduce((sum, entry) => sum + entry.protein, 0);
    return {
      profile: {
        goal: user.fitnessGoal ?? "general wellness",
        activityLevel: user.activityLevel ?? "not specified",
        weightKg: user.weight,
        dailyCalories: user.dailyCalories,
        dailyProtein: user.dailyProtein,
        preferredLanguage: user.preferredLanguage,
      },
      today: {
        calories: Math.round(calories),
        protein: Math.round(protein),
        mealsLogged: food.length,
        workoutsLogged: exercise.length,
        activeHabits: habits.filter(habit => habit.isActive).length,
        habitsCompleted: habits.filter(habit => habit.completedToday).length,
      },
    };
  },
});
