import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAdminPower } from "./functions";

/**
 * Dashboard Overview Stats
 */
export const getDashboardStats = query({
    handler: async (ctx) => {
        await checkAdminPower(ctx);

        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        const users = await ctx.db.query("users").collect();
        const recipes = await ctx.db.query("publicRecipes").collect();
        const workouts = await ctx.db.query("exerciseEntries").collect();
        const transactions = await ctx.db.query("transactions").collect();

        // Unique user count (avoid inflated counts from repeated signups/duplicate records)
        const uniqueUsers = new Set(users.map((u) => u.clerkId)).size;

        // Premium users: based on server-side user flags (not RevenueCat client state)
        const premiumUsers = users.filter((u) => u.isPremium === true || u.subscriptionStatus === "pro").length;

        // Total revenue: succeeded transactions
        const succeeded = transactions.filter((t) => t.status === "succeeded");
        const totalRevenue = succeeded.reduce((acc, t) => acc + t.amount, 0);

        // DAU: user updated within last 24 hours (fallback to createdAt)
        const dau = users.filter((u) => {
            const ts = (u.updatedAt ?? u.createdAt ?? 0) as number;
            return ts > 0 && now - ts < dayMs;
        }).length;

        // MAU: user updated within last 30 days (fallback to createdAt)
        const mau = users.filter((u) => {
            const ts = (u.updatedAt ?? u.createdAt ?? 0) as number;
            return ts > 0 && now - ts < dayMs * 30;
        }).length;

        return {
            totalUsers: uniqueUsers,
            totalUserRecords: users.length,
            premiumUsers,
            totalRecipes: recipes.length,
            totalWorkouts: workouts.length,
            totalRevenue,
            dau,
            mau,
        };
    },
});

/**
 * Financial: Pricing Plans (from schema.pricingPlans)
 */
export const getPricingPlans = query({
    args: {
        onlyActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const plans = await ctx.db.query("pricingPlans").collect();
        const filtered = args.onlyActive ? plans.filter((p) => p.isActive) : plans;
        return filtered;
    },
});

/**
 * Financial: Recent Transactions
 */
export const getRecentTransactions = query({
    args: {
        limit: v.optional(v.float64()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));
        const txs = await ctx.db.query("transactions").collect();
        txs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        return txs.slice(0, limit);
    },
});

/**
 * CRM: Fetch Users
 */
export const getUsers = query({
    args: {
        search: v.optional(v.string()),
        role: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        let users = await ctx.db.query("users").collect();

        if (args.search) {
            const s = args.search.toLowerCase();
            users = users.filter(u =>
                u.name.toLowerCase().includes(s) ||
                u.email.toLowerCase().includes(s)
            );
        }

        if (args.role) {
            users = users.filter(u => u.role === args.role);
        }

        return users.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
});

/**
 * CRM: Update User Role
 */
export const updateUserRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("user"), v.literal("admin"), v.literal("super_admin")),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        await ctx.db.patch(args.userId, {
            role: args.role,
            updatedAt: Date.now(),
        });

        return { success: true };
    }
});

/**
 * CRM: Delete User (Convex record only)
 */
export const deleteUser = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.userId);
        return { success: true };
    },
});

/**
 * Recipes: Create Public Recipe
 */
export const createPublicRecipe = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        cookTimeMinutes: v.optional(v.float64()),
        servings: v.float64(),
        calories: v.float64(),
        protein: v.float64(),
        carbs: v.float64(),
        fat: v.float64(),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        isPremium: v.optional(v.boolean()),
        ingredients: v.optional(v.array(v.string())),
        instructions: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const now = Date.now();
        const titleLower = args.title.trim().toLowerCase();
        const id = await ctx.db.insert("publicRecipes", {
            title: args.title.trim(),
            titleLower,
            description: args.description?.trim(),
            imageUrl: args.imageUrl?.trim(),
            cookTimeMinutes: args.cookTimeMinutes,
            servings: args.servings,
            calories: args.calories,
            protein: args.protein,
            carbs: args.carbs,
            fat: args.fat,
            tags: args.tags,
            category: args.category,
            isPremium: args.isPremium,
            ingredients: args.ingredients,
            instructions: args.instructions,
            createdAt: now,
            updatedAt: now,
        });
        return id;
    },
});

export const deletePublicRecipe = mutation({
    args: {
        recipeId: v.id("publicRecipes"),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.recipeId);
        return { success: true };
    },
});

/**
 * Meditations: Create Session
 */
export const createMeditationSession = mutation({
    args: {
        title: v.string(),
        category: v.string(),
        duration: v.float64(),
        description: v.string(),
        audioUrl: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        isPremium: v.boolean(),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const id = await ctx.db.insert("meditationSessions", {
            title: args.title.trim(),
            category: args.category.trim(),
            duration: args.duration,
            description: args.description.trim(),
            audioUrl: args.audioUrl?.trim(),
            tags: args.tags ?? [],
            isPremium: args.isPremium,
        });
        return id;
    },
});

export const updateMeditationSession = mutation({
    args: {
        sessionId: v.id("meditationSessions"),
        title: v.optional(v.string()),
        category: v.optional(v.string()),
        duration: v.optional(v.float64()),
        description: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        isPremium: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        await ctx.db.patch(args.sessionId, {
            ...(args.title && { title: args.title.trim() }),
            ...(args.category && { category: args.category.trim() }),
            ...(args.duration !== undefined && { duration: args.duration }),
            ...(args.description && { description: args.description.trim() }),
            ...(args.audioUrl && { audioUrl: args.audioUrl.trim() }),
            ...(args.tags && { tags: args.tags }),
            ...(args.isPremium !== undefined && { isPremium: args.isPremium }),
        });

        return { success: true };
    },
});

export const updatePublicRecipe = mutation({
    args: {
        recipeId: v.id("publicRecipes"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        cookTimeMinutes: v.optional(v.float64()),
        servings: v.optional(v.float64()),
        calories: v.optional(v.float64()),
        protein: v.optional(v.float64()),
        carbs: v.optional(v.float64()),
        fat: v.optional(v.float64()),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        isPremium: v.optional(v.boolean()),
        ingredients: v.optional(v.array(v.string())),
        instructions: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const now = Date.now();

        const updateFields: any = { updatedAt: now };
        if (args.title) {
            updateFields.title = args.title.trim();
            updateFields.titleLower = args.title.trim().toLowerCase();
        }
        if (args.description) updateFields.description = args.description.trim();
        if (args.imageUrl) updateFields.imageUrl = args.imageUrl.trim();
        if (args.cookTimeMinutes !== undefined) updateFields.cookTimeMinutes = args.cookTimeMinutes;
        if (args.servings !== undefined) updateFields.servings = args.servings;
        if (args.calories !== undefined) updateFields.calories = args.calories;
        if (args.protein !== undefined) updateFields.protein = args.protein;
        if (args.carbs !== undefined) updateFields.carbs = args.carbs;
        if (args.fat !== undefined) updateFields.fat = args.fat;
        if (args.tags) updateFields.tags = args.tags;
        if (args.category) updateFields.category = args.category;
        if (args.isPremium !== undefined) updateFields.isPremium = args.isPremium;
        if (args.ingredients) updateFields.ingredients = args.ingredients;
        if (args.instructions) updateFields.instructions = args.instructions;

        await ctx.db.patch(args.recipeId, updateFields);
        return { success: true };
    },
});

/**
 * CMS: Blog Articles CRUD
 */
export const getArticles = query({
    handler: async (ctx) => {
        await checkAdminPower(ctx);
        return await ctx.db.query("blogArticles").order("desc").collect();
    }
});

export const createArticle = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        status: v.union(v.literal("DRAFT"), v.literal("PENDING"), v.literal("PUBLISHED")),
        category: v.string(),
        featuredImage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await checkAdminPower(ctx);

        const articleId = await ctx.db.insert("blogArticles", {
            ...args,
            authorId: admin.subject as any, // Clerk ID handled as user ID in ctx.auth
            tags: [],
            updatedAt: Date.now(),
            createdAt: Date.now(),
        });

        return articleId;
    }
});
