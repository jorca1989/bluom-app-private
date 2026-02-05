import { QueryCtx, MutationCtx } from "./_generated/server";
import { MASTER_ADMINS } from "./permissions";

/**
 * Server-side guard to verify if the current user has admin powers.
 * Throws an 'Unauthorized' error if the check fails.
 */
export async function checkAdminPower(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        throw new Error('Unauthenticated');
    }

    const email = identity.email?.toLowerCase().trim();

    // Primary: verify role on server-side from DB.
    const convexUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (convexUser?.role === "admin" || convexUser?.role === "super_admin") {
      return identity;
    }

    // Fallback: allow hardcoded master admin emails even if DB record is missing.
    if (email && MASTER_ADMINS.map((e) => e.toLowerCase().trim()).includes(email)) {
      return identity;
    }

    console.warn(`Unauthorized admin access attempt by: ${email ?? "unknown"}`);
    throw new Error("Unauthorized: admin role required");
}
