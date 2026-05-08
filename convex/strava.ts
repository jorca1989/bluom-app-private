import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const exchangeToken = action({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const { code } = args;
        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("Strava credentials not configured");
        }

        const response = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to exchange token");
        }

        // Update user with tokens
        // We need an internal mutation to update the user record
        await ctx.runMutation(internal.strava.saveStravaCredentials, {
            userId: user.subject, // Clerk ID usually, but let's check how we identify users
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
            athleteId: String(data.athlete.id),
            clerkId: user.subject,
        });

        return data;
    },
});

export const fetchLatestActivity = action({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        // We need to fetch the tokens for this user first
        // Since actions can't query directly efficiently without potentially stale data or complex logic,
        // usually we pass tokens in, OR we call a query to get them.
        // However, inside an action, we can't call a query easily unless we use ctx.runQuery

        const dbUser: any = await ctx.runQuery(internal.strava.getUserForStrava, { clerkId: user.subject });

        if (!dbUser || !dbUser.stravaAccessToken) {
            throw new Error("Strava not connected");
        }

        // Check expiry and refresh if needed (Basic implementation for now: assuming valid or manual re-auth if super old, 
        // but ideally we implement refresh logic here. For simplicity/MVP, let's just try to fetch)
        // TODO: Implement token refresh if (Date.now() / 1000 > dbUser.stravaExpiresAt)
        // For now, let's just use the access token.

        const response = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=1", {
            headers: {
                Authorization: `Bearer ${dbUser.stravaAccessToken}`,
            },
        });

        if (!response.ok) {
            // If 401, likely need refresh
            throw new Error("Failed to fetch Strava activities");
        }

        const activities = await response.json();
        return activities.length > 0 ? activities[0] : null;
    },
});

// Internal mutations/queries for DB access
export const saveStravaCredentials = internalMutation({
    args: {
        clerkId: v.string(), // We use clerkId to look up the user
        userId: v.optional(v.string()), // Just in case
        accessToken: v.string(),
        refreshToken: v.string(),
        expiresAt: v.float64(),
        athleteId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id, {
            stravaAccessToken: args.accessToken,
            stravaRefreshToken: args.refreshToken,
            stravaExpiresAt: args.expiresAt,
            stravaAthleteId: args.athleteId,
        });
    },
});

import { internalQuery } from "./_generated/server";

export const getUserForStrava = internalQuery({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});
