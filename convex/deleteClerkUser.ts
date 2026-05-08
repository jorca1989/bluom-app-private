import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Server-side action to delete a user from Clerk via the Backend API.
 * This runs on the Convex server where CLERK_SECRET_KEY is available.
 */
export const deleteClerkUser = action({
    args: { clerkId: v.string() },
    handler: async (_ctx, args) => {
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new Error("CLERK_SECRET_KEY is not configured in Convex environment variables.");
        }

        const response = await fetch(`https://api.clerk.com/v1/users/${args.clerkId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(`[deleteClerkUser] Clerk API returned ${response.status}: ${body}`);
            // Don't throw for 404 — user may already be deleted from Clerk
            if (response.status !== 404) {
                throw new Error(`Failed to delete user from Clerk (status ${response.status})`);
            }
        }

        return { success: true };
    },
});
