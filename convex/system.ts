import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the global system status (maintenance mode, banners).
 * Returns the first document found in the systemStatus table.
 */
export const getSystemStatus = query({
    args: {},
    handler: async (ctx) => {
        const status = await ctx.db.query("systemStatus").first();
        return status ?? { aiMaintenanceMode: false, bannerMessage: undefined };
    },
});
