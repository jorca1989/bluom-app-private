import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function isoYesterday(date: string) {
  // date is YYYY-MM-DD
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Create a new habit
 */
export const createHabit = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    category: v.union(
      v.literal("health"),
      v.literal("fitness"),
      v.literal("mindfulness"),
      v.literal("social"),
      v.literal("learning"),
      v.literal("physical"),
      v.literal("mental"),
      v.literal("routine")
    ),
    targetDaysPerWeek: v.float64(),
    reminderTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habitId = await ctx.db.insert("habits", {
      userId: args.userId,
      name: args.name,
      icon: args.icon,
      category: args.category,
      streak: 0,
      longestStreak: 0,
      completedToday: false,
      targetDaysPerWeek: args.targetDaysPerWeek,
      reminderTime: args.reminderTime,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return habitId;
  },
});

/**
 * Ensure default (prebuilt) habits exist for the user.
 * - Inserts missing defaults by name.
 * - Respects previously "deleted" defaults by checking both active + inactive records.
 */
export const ensureDefaultHabits = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingAll = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const existingNames = new Set(existingAll.map((h) => h.name.trim().toLowerCase()));

    const defaults: Array<{
      name: string;
      icon: string;
      category:
      | "health"
      | "fitness"
      | "mindfulness"
      | "social"
      | "learning"
      | "physical"
      | "mental"
      | "routine";
      targetDaysPerWeek: number;
    }> = [
        { name: "Drink 8 glasses of water", icon: "Droplets", category: "health", targetDaysPerWeek: 7 },
        { name: "Take daily vitamins", icon: "Pill", category: "health", targetDaysPerWeek: 7 },
        { name: "Spend time in nature", icon: "Leaf", category: "health", targetDaysPerWeek: 5 },
        { name: "Get 8 hours of sleep", icon: "Moon", category: "health", targetDaysPerWeek: 7 },
        { name: "Limit screen time", icon: "Phone", category: "health", targetDaysPerWeek: 7 },
        { name: "Exercise for 30 minutes", icon: "Dumbbell", category: "fitness", targetDaysPerWeek: 4 },
        { name: "Meditate for 10 minutes", icon: "Brain", category: "mindfulness", targetDaysPerWeek: 5 },
        { name: "Practice gratitude", icon: "Heart", category: "mindfulness", targetDaysPerWeek: 5 },
        { name: "Connect with friends/family", icon: "Users", category: "social", targetDaysPerWeek: 3 },
        { name: "Read for 30 minutes", icon: "Book", category: "learning", targetDaysPerWeek: 4 },
      ];

    const now = Date.now();
    let inserted = 0;
    for (const d of defaults) {
      if (existingNames.has(d.name.trim().toLowerCase())) continue;
      await ctx.db.insert("habits", {
        userId: args.userId,
        name: d.name,
        icon: d.icon,
        category: d.category as any,
        streak: 0,
        longestStreak: 0,
        completedToday: false,
        targetDaysPerWeek: d.targetDaysPerWeek,
        reminderTime: undefined,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted };
  },
});

/**
 * Complete a habit for today
 */
export const completeHabit = mutation({
  args: {
    habitId: v.id("habits"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");

    if (habit.completedToday && habit.lastCompletedDate === args.date) {
      throw new Error("Habit already completed today");
    }

    const yesterday = isoYesterday(args.date);
    const continuesStreak = habit.lastCompletedDate === yesterday;
    const newStreak = continuesStreak ? habit.streak + 1 : 1;
    const newLongestStreak = Math.max(newStreak, habit.longestStreak);

    await ctx.db.patch(args.habitId, {
      streak: newStreak,
      longestStreak: newLongestStreak,
      completedToday: true,
      lastCompletedDate: args.date,
      updatedAt: Date.now(),
    });

    return { newStreak, newLongestStreak };
  },
});

/**
 * Toggle habit completion for a given date.
 * - If already completed for that date, un-complete it (decrement streak by 1).
 * - If not completed, complete it (with streak continuation logic).
 *
 * Note: We keep lastCompletedDate as-is on uncomplete to preserve history,
 * and rely on completedToday + lastCompletedDate to decide "completed for date".
 */
export const toggleHabitForDate = mutation({
  args: {
    habitId: v.id("habits"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit not found");

    const isCompletedForDate =
      habit.completedToday === true && habit.lastCompletedDate === args.date;

    if (isCompletedForDate) {
      const nextStreak = Math.max(0, habit.streak - 1);
      await ctx.db.patch(args.habitId, {
        streak: nextStreak,
        completedToday: false,
        updatedAt: Date.now(),
      });
      return { completed: false, streak: nextStreak };
    }

    const yesterday = isoYesterday(args.date);
    const continuesStreak = habit.lastCompletedDate === yesterday;
    const newStreak = continuesStreak ? habit.streak + 1 : 1;
    const newLongestStreak = Math.max(newStreak, habit.longestStreak);
    await ctx.db.patch(args.habitId, {
      streak: newStreak,
      longestStreak: newLongestStreak,
      completedToday: true,
      lastCompletedDate: args.date,
      updatedAt: Date.now(),
    });
    return { completed: true, streak: newStreak };
  },
});

/**
 * Reset daily completion status (called at start of new day)
 */
export const resetDailyCompletion = mutation({
  args: {
    userId: v.id("users"),
    currentDate: v.string(),
  },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const habit of habits) {
      // Check if habit was not completed yesterday
      if (
        habit.completedToday === false &&
        habit.lastCompletedDate &&
        habit.lastCompletedDate !== args.currentDate
      ) {
        // Break the streak if habit was missed
        await ctx.db.patch(habit._id, {
          streak: 0,
          completedToday: false,
          updatedAt: Date.now(),
        });
      } else {
        // Just reset completedToday
        await ctx.db.patch(habit._id, {
          completedToday: false,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Get all active habits for a user
 */
export const getUserHabits = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return habits;
  },
});

/**
 * Get all active habits for a user with "completedToday" computed for the provided date.
 */
export const getUserHabitsForDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return habits.map((h) => ({
      ...h,
      completedToday: h.completedToday === true && h.lastCompletedDate === args.date,
    }));
  },
});

/**
 * Get habits by category
 */
export const getHabitsByCategory = query({
  args: {
    userId: v.id("users"),
    category: v.union(
      v.literal("health"),
      v.literal("fitness"),
      v.literal("mindfulness"),
      v.literal("social"),
      v.literal("learning"),
      v.literal("physical"),
      v.literal("mental"),
      v.literal("routine")
    ),
  },
  handler: async (ctx, args) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user_and_category", (q) =>
        q.eq("userId", args.userId).eq("category", args.category)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return habits;
  },
});

/**
 * Delete a habit
 */
export const deleteHabit = mutation({
  args: {
    habitId: v.id("habits"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.habitId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update habit
 */
export const updateHabit = mutation({
  args: {
    habitId: v.id("habits"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    targetDaysPerWeek: v.optional(v.float64()),
    reminderTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { habitId, ...updates } = args;

    await ctx.db.patch(habitId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get all quitting habits for a user
 */
export const getUserQuittingHabits = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quittingHabits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Create a new quitting habit
 */
export const createQuittingHabit = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    costPerDay: v.number(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quittingHabits", {
      userId: args.userId,
      name: args.name,
      startDate: Date.now(),
      costPerDay: args.costPerDay,
      icon: args.icon,
      status: "active",
    });
  },
});

/**
 * Relapse a quitting habit (reset start date)
 */
export const relapseHabit = mutation({
  args: {
    habitId: v.id("quittingHabits"),
  },
  handler: async (ctx, args) => {
    // Reset the start date to now and ensure status is active
    await ctx.db.patch(args.habitId, {
      startDate: Date.now(),
      status: "active",
    });
  },
});
