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
const localizationsValidator = v.optional(v.object({
    pt: v.optional(v.string()),
    es: v.optional(v.string()),
    fr: v.optional(v.string()),
    de: v.optional(v.string()),
    nl: v.optional(v.string()),
}));

const listLocalizationsValidator = v.optional(v.object({
    pt: v.optional(v.array(v.string())),
    es: v.optional(v.array(v.string())),
    fr: v.optional(v.array(v.string())),
    de: v.optional(v.array(v.string())),
    nl: v.optional(v.array(v.string())),
}));

export const createPublicRecipe = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        titleLocalizations: localizationsValidator,
        descriptionLocalizations: localizationsValidator,
        imageUrl: v.optional(v.string()),
        cookTimeMinutes: v.optional(v.float64()),
        servings: v.float64(),
        calories: v.float64(),
        protein: v.float64(),
        carbs: v.float64(),
        fat: v.float64(),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        isPremium: v.optional(v.boolean()),
        ingredients: v.optional(v.array(v.string())),
        instructions: v.optional(v.array(v.string())),
        ingredientsLocalizations: listLocalizationsValidator,
        instructionsLocalizations: listLocalizationsValidator,
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const now = Date.now();
        const titleLower = args.title.trim().toLowerCase();
        const id = await ctx.db.insert("publicRecipes", {
            title: args.title.trim(),
            titleLower,
            description: args.description?.trim(),
            titleLocalizations: args.titleLocalizations,
            descriptionLocalizations: args.descriptionLocalizations,
            imageUrl: args.imageUrl?.trim(),
            cookTimeMinutes: args.cookTimeMinutes,
            servings: args.servings,
            calories: args.calories,
            protein: args.protein,
            carbs: args.carbs,
            fat: args.fat,
            tags: args.tags,
            category: args.category,
            categories: args.categories,
            isPremium: args.isPremium,
            ingredients: args.ingredients,
            instructions: args.instructions,
            ingredientsLocalizations: args.ingredientsLocalizations,
            instructionsLocalizations: args.instructionsLocalizations,
            status: args.status ?? 'draft',
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
const localizationsArg = v.optional(v.object({
    pt: v.optional(v.string()),
    es: v.optional(v.string()),
    nl: v.optional(v.string()),
    de: v.optional(v.string()),
    fr: v.optional(v.string()),
}));

export const createMeditationSession = mutation({
    args: {
        title: v.string(),
        category: v.string(),
        duration: v.float64(),
        description: v.string(),
        titleLocalizations: localizationsArg,
        descriptionLocalizations: localizationsArg,
        audioUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageLandscape: v.optional(v.string()),
        visualType: v.optional(v.union(v.literal("thumbnail"), v.literal("animation"))),
        tags: v.optional(v.array(v.string())),
        status: v.optional(v.string()),
        isPremium: v.boolean(),
        isFeatured: v.optional(v.boolean()),
        type: v.optional(v.union(v.literal("meditation"), v.literal("soundscape"))),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const id = await ctx.db.insert("meditationSessions", {
            title: args.title.trim(),
            category: args.category.trim(),
            duration: args.duration,
            description: args.description.trim(),
            titleLocalizations: args.titleLocalizations,
            descriptionLocalizations: args.descriptionLocalizations,
            audioUrl: args.audioUrl?.trim(),
            videoUrl: args.videoUrl?.trim(),
            coverImage: args.coverImage?.trim(),
            coverImageLandscape: args.coverImageLandscape?.trim(),
            visualType: args.visualType,
            tags: args.tags ?? [],
            status: args.status ?? 'draft',
            isPremium: args.isPremium,
            isFeatured: args.isFeatured,
            type: args.type ?? 'meditation',
        });
        return id;
    },
});

export const deleteMeditationSession = mutation({
    args: { sessionId: v.id("meditationSessions") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.sessionId);
        return { success: true };
    },
});

export const updateMeditationSession = mutation({
    args: {
        sessionId: v.id("meditationSessions"),
        title: v.optional(v.string()),
        category: v.optional(v.string()),
        duration: v.optional(v.float64()),
        description: v.optional(v.string()),
        titleLocalizations: localizationsArg,
        descriptionLocalizations: localizationsArg,
        audioUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageLandscape: v.optional(v.string()),
        visualType: v.optional(v.union(v.literal("thumbnail"), v.literal("animation"))),
        tags: v.optional(v.array(v.string())),
        status: v.optional(v.string()),
        isPremium: v.optional(v.boolean()),
        isFeatured: v.optional(v.boolean()),
        type: v.optional(v.union(v.literal("meditation"), v.literal("soundscape"))),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        await ctx.db.patch(args.sessionId, {
            ...(args.title && { title: args.title.trim() }),
            ...(args.category && { category: args.category.trim() }),
            ...(args.duration !== undefined && { duration: args.duration }),
            ...(args.description && { description: args.description.trim() }),
            ...(args.titleLocalizations !== undefined && { titleLocalizations: args.titleLocalizations }),
            ...(args.descriptionLocalizations !== undefined && { descriptionLocalizations: args.descriptionLocalizations }),
            ...(args.audioUrl !== undefined && { audioUrl: args.audioUrl ? args.audioUrl.trim() : undefined }),
            ...(args.videoUrl !== undefined && { videoUrl: args.videoUrl ? args.videoUrl.trim() : undefined }),
            ...(args.coverImage !== undefined && { coverImage: args.coverImage ? args.coverImage.trim() : undefined }),
            ...(args.coverImageLandscape !== undefined && { coverImageLandscape: args.coverImageLandscape ? args.coverImageLandscape.trim() : undefined }),
            ...(args.visualType !== undefined && { visualType: args.visualType }),
            ...(args.tags && { tags: args.tags }),
            ...(args.status && { status: args.status }),
            ...(args.isPremium !== undefined && { isPremium: args.isPremium }),
            ...(args.isFeatured !== undefined && { isFeatured: args.isFeatured }),
            ...(args.type && { type: args.type }),
        });

        return { success: true };
    },
});

export const updatePublicRecipe = mutation({
    args: {
        recipeId: v.id("publicRecipes"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        titleLocalizations: localizationsValidator,
        descriptionLocalizations: localizationsValidator,
        imageUrl: v.optional(v.string()),
        cookTimeMinutes: v.optional(v.float64()),
        servings: v.optional(v.float64()),
        calories: v.optional(v.float64()),
        protein: v.optional(v.float64()),
        carbs: v.optional(v.float64()),
        fat: v.optional(v.float64()),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        isPremium: v.optional(v.boolean()),
        ingredients: v.optional(v.array(v.string())),
        instructions: v.optional(v.array(v.string())),
        ingredientsLocalizations: listLocalizationsValidator,
        instructionsLocalizations: listLocalizationsValidator,
        status: v.optional(v.string()),
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
        if (args.titleLocalizations !== undefined) updateFields.titleLocalizations = args.titleLocalizations;
        if (args.descriptionLocalizations !== undefined) updateFields.descriptionLocalizations = args.descriptionLocalizations;
        if (args.imageUrl) updateFields.imageUrl = args.imageUrl.trim();
        if (args.cookTimeMinutes !== undefined) updateFields.cookTimeMinutes = args.cookTimeMinutes;
        if (args.servings !== undefined) updateFields.servings = args.servings;
        if (args.calories !== undefined) updateFields.calories = args.calories;
        if (args.protein !== undefined) updateFields.protein = args.protein;
        if (args.carbs !== undefined) updateFields.carbs = args.carbs;
        if (args.fat !== undefined) updateFields.fat = args.fat;
        if (args.tags) updateFields.tags = args.tags;
        if (args.category) updateFields.category = args.category;
        if (args.categories) updateFields.categories = args.categories;
        if (args.isPremium !== undefined) updateFields.isPremium = args.isPremium;
        if (args.ingredients) updateFields.ingredients = args.ingredients;
        if (args.instructions) updateFields.instructions = args.instructions;
        if (args.ingredientsLocalizations !== undefined) updateFields.ingredientsLocalizations = args.ingredientsLocalizations;
        if (args.instructionsLocalizations !== undefined) updateFields.instructionsLocalizations = args.instructionsLocalizations;
        if (args.status) updateFields.status = args.status;

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
        titlePt: v.optional(v.string()),
        titleEs: v.optional(v.string()),
        titleFr: v.optional(v.string()),
        titleDe: v.optional(v.string()),
        titleNl: v.optional(v.string()),
        contentPt: v.optional(v.string()),
        contentEs: v.optional(v.string()),
        contentFr: v.optional(v.string()),
        contentDe: v.optional(v.string()),
        contentNl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await checkAdminPower(ctx);
        const articleId = await ctx.db.insert("blogArticles", {
            ...args,
            authorId: admin.subject as any,
            tags: [],
            updatedAt: Date.now(),
            createdAt: Date.now(),
        });
        return articleId;
    }
});

export const updateArticle = mutation({
    args: {
        articleId: v.id("blogArticles"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        status: v.optional(v.union(v.literal("DRAFT"), v.literal("PENDING"), v.literal("PUBLISHED"))),
        category: v.optional(v.string()),
        featuredImage: v.optional(v.string()),
        titlePt: v.optional(v.string()),
        titleEs: v.optional(v.string()),
        titleFr: v.optional(v.string()),
        titleDe: v.optional(v.string()),
        titleNl: v.optional(v.string()),
        contentPt: v.optional(v.string()),
        contentEs: v.optional(v.string()),
        contentFr: v.optional(v.string()),
        contentDe: v.optional(v.string()),
        contentNl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const { articleId, ...updates } = args;
        await ctx.db.patch(articleId, { ...updates, updatedAt: Date.now() });
    }
});

export const deleteArticle = mutation({
    args: { articleId: v.id("blogArticles") },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        await ctx.db.delete(args.articleId);
    }
});

export const getPublishedArticles = query({
    args: { category: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const all = await ctx.db.query("blogArticles")
            .withIndex("by_status", q => q.eq("status", "PUBLISHED"))
            .order("desc")
            .collect();
        if (args.category && args.category !== 'All') {
            return all.filter(a => a.category === args.category);
        }
        return all;
    }
});

export const getArticleBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("blogArticles")
            .withIndex("by_slug", q => q.eq("slug", args.slug))
            .first();
    }
});

export const getLegalDocuments = query({
    args: {},
    handler: async (ctx) => {
        await checkAdminPower(ctx);
        return await ctx.db.query("legalDocuments").order("desc").collect();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// AFFILIATE / INFLUENCER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const TIER_DURATIONS_MS: Record<string, number | null> = {
    "1_month":  30  * 24 * 60 * 60 * 1000,
    "3_months": 90  * 24 * 60 * 60 * 1000,
    "6_months": 180 * 24 * 60 * 60 * 1000,
    "1_year":   365 * 24 * 60 * 60 * 1000,
    "2_years":  730 * 24 * 60 * 60 * 1000,
    "lifetime": null,
    "family":   null,
};

/**
 * Grant manual Pro access to an influencer or family member by their Clerk ID.
 * Creates or updates their affiliate record and patches the users table.
 * Call this from the Convex dashboard or your admin panel.
 */
export const grantManualAccess = mutation({
    args: {
        clerkId: v.string(),
        tier: v.union(
            v.literal("1_month"),
            v.literal("3_months"),
            v.literal("6_months"),
            v.literal("1_year"),
            v.literal("2_years"),
            v.literal("lifetime"),
            v.literal("family"),
        ),
        name: v.string(),
        email: v.optional(v.string()),
        handle: v.optional(v.string()),
        platform: v.optional(v.string()),
        language: v.optional(v.string()),
        offerCode: v.optional(v.string()),
        commissionPct: v.optional(v.float64()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        const now = Date.now();
        const durationMs = TIER_DURATIONS_MS[args.tier];
        const isLifetime = durationMs === null;
        const expiresAt = isLifetime ? undefined : now + durationMs!;

        // ── 1. Patch the users table ──────────────────────────────────────────
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!user) throw new Error(`No Convex user found for clerkId: ${args.clerkId}`);

        await ctx.db.patch(user._id, {
            isPremium: true,
            subscriptionStatus: "pro",
            isLifetimeAdmin: isLifetime ? true : undefined,
            manualPremiumUntil: isLifetime ? undefined : expiresAt,
            affiliateCode: args.offerCode,
            updatedAt: now,
        });

        // ── 2. Upsert affiliates record ───────────────────────────────────────
        const existing = await ctx.db
            .query("affiliates")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                email: args.email,
                handle: args.handle,
                platform: args.platform,
                language: args.language,
                tier: args.tier,
                offerCode: args.offerCode,
                commissionPct: args.commissionPct,
                notes: args.notes,
                status: "active",
                grantedAt: now,
                expiresAt,
                updatedAt: now,
            });
            return { success: true, affiliateId: existing._id, expiresAt };
        }

        const affiliateId = await ctx.db.insert("affiliates", {
            clerkId: args.clerkId,
            name: args.name,
            email: args.email,
            handle: args.handle,
            platform: args.platform,
            language: args.language,
            tier: args.tier,
            offerCode: args.offerCode,
            commissionPct: args.commissionPct,
            notes: args.notes,
            status: "active",
            grantedAt: now,
            expiresAt,
            createdAt: now,
            updatedAt: now,
        });

        return { success: true, affiliateId, expiresAt };
    },
});

/**
 * Revoke manual Pro access (sets status to "revoked" and clears manual fields).
 */
export const revokeManualAccess = mutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        const now = Date.now();

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (user) {
            await ctx.db.patch(user._id, {
                isPremium: false,
                subscriptionStatus: "free",
                isLifetimeAdmin: undefined,
                manualPremiumUntil: undefined,
                updatedAt: now,
            });
        }

        const affiliate = await ctx.db
            .query("affiliates")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (affiliate) {
            await ctx.db.patch(affiliate._id, { status: "revoked", updatedAt: now });
        }

        return { success: true };
    },
});

/**
 * List all affiliates (admin only).
 */
export const listAffiliates = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);
        const all = await ctx.db.query("affiliates").order("desc").collect();
        if (args.status) return all.filter((a) => a.status === args.status);
        return all;
    },
});

/**
 * Extend or change the tier for an existing affiliate.
 */
export const extendAffiliateAccess = mutation({
    args: {
        clerkId: v.string(),
        tier: v.union(
            v.literal("1_month"),
            v.literal("3_months"),
            v.literal("6_months"),
            v.literal("1_year"),
            v.literal("2_years"),
            v.literal("lifetime"),
            v.literal("family"),
        ),
    },
    handler: async (ctx, args) => {
        await checkAdminPower(ctx);

        const now = Date.now();
        const durationMs = TIER_DURATIONS_MS[args.tier];
        const isLifetime = durationMs === null;
        const expiresAt = isLifetime ? undefined : now + durationMs!;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!user) throw new Error(`No Convex user found for clerkId: ${args.clerkId}`);

        await ctx.db.patch(user._id, {
            isLifetimeAdmin: isLifetime ? true : undefined,
            manualPremiumUntil: isLifetime ? undefined : expiresAt,
            isPremium: true,
            subscriptionStatus: "pro",
            updatedAt: now,
        });

        const affiliate = await ctx.db
            .query("affiliates")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (affiliate) {
            await ctx.db.patch(affiliate._id, {
                tier: args.tier,
                grantedAt: now,
                expiresAt,
                status: "active",
                updatedAt: now,
            });
        }

        return { success: true, expiresAt };
    },
});
