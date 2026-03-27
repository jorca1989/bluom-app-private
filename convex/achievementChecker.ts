/**
 * achievementChecker.ts
 * ─────────────────────────────────────────────────────────────
 * Centralized achievement checking logic.
 * Call these helper functions from relevant mutations to automatically
 * unlock achievements based on user actions.
 */

import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ALL_ACHIEVEMENTS, getAchievementById } from "./Achievementsconfig";

/**
 * Helper to check if an achievement is already unlocked
 */
async function hasAchievement(
  db: DatabaseReader,
  userId: Id<"users">,
  badgeId: string
): Promise<boolean> {
  const existing = await db
    .query("achievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("badgeId"), badgeId))
    .first();
  return !!existing;
}

/**
 * Helper to grant an achievement
 */
async function grantAchievement(
  db: DatabaseWriter,
  mindDb: DatabaseWriter,
  userId: Id<"users">,
  badgeId: string
): Promise<void> {
  const def = getAchievementById(badgeId);
  if (!def) return;

  // Insert achievement
  await db.insert("achievements", {
    userId,
    badgeId: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    unlockedAt: Date.now(),
  });

  // Grant XP and tokens to mind garden
  const garden = await mindDb
    .query("mindGardenState")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (garden) {
    const newXp = (garden.xp ?? 0) + def.xpReward;
    const newTokens = (garden.tokens ?? 0) + def.tokenReward;
    const newLevel = Math.floor(newXp / 500) + 1; // Simple leveling: 500 XP per level

    await mindDb.patch(garden._id, {
      xp: newXp,
      tokens: newTokens,
      level: newLevel,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Check for meal logging achievements
 */
export async function checkMealAchievements(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">,
  date: string
): Promise<void> {
  // First meal log
  if (!(await hasAchievement(db, userId, "first_meal_log"))) {
    await grantAchievement(db, db, userId, "first_meal_log");
  }

  // Check consecutive days logging
  const today = new Date(date);
  let consecutiveDays = 1;
  
  for (let i = 1; i <= 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split("T")[0];
    
    const entries = await db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", checkDateStr)
      )
      .first();
    
    if (entries) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // Grant streak achievements
  if (consecutiveDays >= 7 && !(await hasAchievement(db, userId, "log_7_days_meals"))) {
    await grantAchievement(db, db, userId, "log_7_days_meals");
  }
  
  if (consecutiveDays >= 30 && !(await hasAchievement(db, userId, "log_30_days_meals"))) {
    await grantAchievement(db, db, userId, "log_30_days_meals");
  }
}

/**
 * Check for protein goal achievements
 */
export async function checkProteinGoal(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">,
  date: string,
  totalProtein: number
): Promise<void> {
  const user = await db.get(userId);
  if (!user || !user.dailyProtein) return;

  // Check if protein goal hit
  if (totalProtein >= user.dailyProtein) {
    if (!(await hasAchievement(db, userId, "hit_protein_goal"))) {
      await grantAchievement(db, db, userId, "hit_protein_goal");
    }

    // Check 7-day protein streak
    let streak = 1;
    const today = new Date(date);
    
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split("T")[0];
      
      const entries = await db
        .query("foodEntries")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", checkDateStr)
        )
        .collect();
      
      const dayProtein = entries.reduce((sum, e) => sum + e.protein, 0);
      if (dayProtein >= user.dailyProtein) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7 && !(await hasAchievement(db, userId, "hit_protein_7days"))) {
      await grantAchievement(db, db, userId, "hit_protein_7days");
    }
  }
}

/**
 * Check for calorie goal achievements
 */
export async function checkCalorieGoal(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">,
  date: string,
  totalCalories: number
): Promise<void> {
  const user = await db.get(userId);
  if (!user || !user.dailyCalories) return;

  // Check if under calorie goal (for weight loss)
  if (totalCalories <= user.dailyCalories) {
    if (!(await hasAchievement(db, userId, "under_calorie_goal"))) {
      await grantAchievement(db, db, userId, "under_calorie_goal");
    }

    // Check 14-day calorie streak
    let streak = 1;
    const today = new Date(date);
    
    for (let i = 1; i <= 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split("T")[0];
      
      const entries = await db
        .query("foodEntries")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", checkDateStr)
        )
        .collect();
      
      const dayCalories = entries.reduce((sum, e) => sum + e.calories, 0);
      if (dayCalories <= user.dailyCalories) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 14 && !(await hasAchievement(db, userId, "calorie_goal_14days"))) {
      await grantAchievement(db, db, userId, "calorie_goal_14days");
    }
  }
}

/**
 * Check for water goal achievements
 */
export async function checkWaterAchievements(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">,
  date: string,
  waterOz: number
): Promise<void> {
  // Assuming goal is 64oz per day (adjust as needed)
  const WATER_GOAL = 64;

  if (waterOz >= WATER_GOAL) {
    if (!(await hasAchievement(db, userId, "water_goal_day"))) {
      await grantAchievement(db, db, userId, "water_goal_day");
    }

    // Check 7-day streak
    let streak = 1;
    const today = new Date(date);
    
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split("T")[0];
      
      const stats = await db
        .query("dailyStats")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", checkDateStr)
        )
        .first();
      
      if (stats && stats.waterOz >= WATER_GOAL) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7 && !(await hasAchievement(db, userId, "water_goal_7days"))) {
      await grantAchievement(db, db, userId, "water_goal_7days");
    }

    if (streak >= 30 && !(await hasAchievement(db, userId, "water_goal_30days"))) {
      await grantAchievement(db, db, userId, "water_goal_30days");
    }
  }
}

/**
 * Check XP milestone achievements
 */
export async function checkXPMilestones(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">
): Promise<void> {
  const garden = await db
    .query("mindGardenState")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!garden) return;
  const xp = garden.xp ?? 0;

  if (xp >= 1000 && !(await hasAchievement(db, userId, "xp_1000"))) {
    await grantAchievement(db, db, userId, "xp_1000");
  }
  if (xp >= 5000 && !(await hasAchievement(db, userId, "xp_5000"))) {
    await grantAchievement(db, db, userId, "xp_5000");
  }
  if (xp >= 10000 && !(await hasAchievement(db, userId, "xp_10000"))) {
    await grantAchievement(db, db, userId, "xp_10000");
  }
  if (xp >= 50000 && !(await hasAchievement(db, userId, "xp_50000"))) {
    await grantAchievement(db, db, userId, "xp_50000");
  }
}

/**
 * Check total achievements unlocked milestones
 */
export async function checkAchievementMilestones(
  db: DatabaseReader & DatabaseWriter,
  userId: Id<"users">
): Promise<void> {
  const allAchievements = await db
    .query("achievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const count = allAchievements.length;

  if (count >= 5 && !(await hasAchievement(db, userId, "total_5_achievements"))) {
    await grantAchievement(db, db, userId, "total_5_achievements");
  }
  if (count >= 20 && !(await hasAchievement(db, userId, "total_20_achievements"))) {
    await grantAchievement(db, db, userId, "total_20_achievements");
  }
  if (count >= 50 && !(await hasAchievement(db, userId, "total_50_achievements"))) {
    await grantAchievement(db, db, userId, "total_50_achievements");
  }
}
