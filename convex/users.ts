import { v } from "convex/values";
import { internalMutation, mutation, query, internalQuery } from "./_generated/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();
const MASTER_ADMIN_EMAILS = new Set(
  ["ggovsaas@gmail.com", "jwfcarvalho1989@gmail.com", "josecarvalhoggov@gmail.com"].map((e) =>
    e.toLowerCase().trim()
  )
);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Store or update user from Clerk authentication
 * Called when user signs up or signs in
 */
export const storeUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      const emailLower = args.email.toLowerCase().trim();
      const isMasterAdmin = MASTER_ADMIN_EMAILS.has(emailLower);
      // ALWAYS enforce master admin flags (even if user already exists).
      if (isMasterAdmin) {
        await ctx.db.patch(existingUser._id, {
          role: "admin",
          isAdmin: true,
          isPremium: true,
          subscriptionStatus: "pro",
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    const emailLower = args.email.toLowerCase().trim();
    const isMasterAdmin = MASTER_ADMIN_EMAILS.has(emailLower);
    const isOwnerAdmin = isMasterAdmin || (!!ADMIN_EMAIL && emailLower === ADMIN_EMAIL);
    const initialResetDate = todayIsoDate();

    // Create new user with ONLY the required basics + safe defaults.
    // Onboarding can fill in the rest later (schema allows optional fields).
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,

      // Localization Defaults (can be updated in Step 0/1 of onboarding)
      preferredLanguage: "en",
      preferredUnits: {
        height: "ft", // Defaulting to Imperial just as a placeholder, will be set in onboarding
        weight: "lbs",
        volume: "oz"
      },

      // Defaults to prevent "Mutation Failed" and keep auth flow consistent
      isPremium: isOwnerAdmin,
      subscriptionStatus: isOwnerAdmin ? "pro" : "free",
      role: isOwnerAdmin ? "admin" : "user",
      isAdmin: isOwnerAdmin,
      dailyGamePlays: 0,
      dailyMeditationPlays: 0,
      dailyMealLogs: 0,
      lastResetDate: initialResetDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Internal-only: hard override master admin account flags from verified webhooks.
 */
export const masterAdminOverride = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      role: "admin",
      isAdmin: true,
      isPremium: true,
      subscriptionStatus: "pro",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get user by Clerk ID
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

/**
 * Get user by ID
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const internalGetUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update user profile
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      name: v.optional(v.string()),
      weight: v.optional(v.float64()),
      height: v.optional(v.float64()),
      targetWeight: v.optional(v.float64()),
      preferredLanguage: v.optional(v.string()),
      preferredUnits: v.optional(v.object({
        height: v.string(),
        weight: v.string(),
        volume: v.string(),
      })),
      fitnessGoal: v.optional(
        v.union(
          v.literal("lose_weight"),
          v.literal("build_muscle"),
          v.literal("maintain"),
          v.literal("improve_health"),
          v.literal("improve_endurance"),
          v.literal("general_health")
        )
      ),
      activityLevel: v.optional(
        v.union(
          v.literal("sedentary"),
          v.literal("lightly_active"),
          v.literal("moderately_active"),
          v.literal("very_active"),
          v.literal("extremely_active")
        )
      ),
      fitnessExperience: v.optional(
        v.union(
          v.literal("beginner"),
          v.literal("intermediate"),
          v.literal("advanced")
        )
      ),
      workoutPreference: v.optional(
        v.union(
          v.literal("strength"),
          v.literal("cardio"),
          v.literal("hiit"),
          v.literal("yoga"),
          v.literal("mixed")
        )
      ),
      weeklyWorkoutTime: v.optional(v.float64()),
      nutritionApproach: v.optional(
        v.union(
          v.literal("balanced"),
          v.literal("high_protein"),
          v.literal("low_carb"),
          v.literal("plant_based"),
          v.literal("flexible")
        )
      ),
      mealsPerDay: v.optional(v.float64()),
      sleepHours: v.optional(v.float64()),
      stressLevel: v.optional(
        v.union(
          v.literal("low"),
          v.literal("moderate"),
          v.literal("high"),
          v.literal("very_high")
        )
      ),
      dailyCalories: v.optional(v.float64()),
      dailyProtein: v.optional(v.float64()),
      dailyCarbs: v.optional(v.float64()),
      dailyFat: v.optional(v.float64()),
      isPremium: v.optional(v.boolean()),
      premiumExpiry: v.optional(v.float64()),
      lifeStage: v.optional(v.union(v.literal("cycle"), v.literal("pregnancy"), v.literal("menopause"))),
      pregnancyStartDate: v.optional(v.number()),
      lastPeriodDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal-only: update subscription status from RevenueCat webhooks
 */
export const updateSubscription = internalMutation({
  args: {
    userId: v.string(), // RevenueCat passes this as string, usually matches clerkId, but we might need to lookup user first if rcUserId != clerkId
    status: v.string(),
    endsOn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // args.userId from RevenueCat logic is expected to be the Clerk ID (app_user_id)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      console.error(`RevenueCat webhook: User not found for clerkId ${args.userId}`);
      return;
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      endsOn: args.endsOn,
      isPremium: args.status === "pro", // Keep isPremium in sync for backward compatibility
      updatedAt: Date.now(),
    });
  },
});

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return false;

    // Check if user has filled in essential onboarding data
    return (user.age ?? 0) > 0 && (user.weight ?? 0) > 0 && (user.height ?? 0) > 0;
  },
});
/**
 * Reset user onboarding data
 */
export const resetOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      age: 0,
      weight: 0,
      height: 0,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Link a partner by email for shared features (Todo/Grocery)
 */
export const linkPartner = mutation({
  args: {
    userId: v.id("users"),
    partnerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const partner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.partnerEmail.toLowerCase().trim()))
      .first();

    if (!partner) {
      throw new Error("User with this email not found. Tell them to join Bluom first!");
    }

    if (partner._id === args.userId) {
      throw new Error("You cannot link with yourself.");
    }

    // Bidirectional link
    await ctx.db.patch(args.userId, { partnerId: partner._id, updatedAt: Date.now() });
    await ctx.db.patch(partner._id, { partnerId: args.userId, updatedAt: Date.now() });

    return { partnerName: partner.name };
  },
});

/**
 * Unlink partner
 */
export const unlinkPartner = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    if (user.partnerId) {
      await ctx.db.patch(user.partnerId, { partnerId: undefined, updatedAt: Date.now() });
    }
    await ctx.db.patch(args.userId, { partnerId: undefined, updatedAt: Date.now() });
  },
});
