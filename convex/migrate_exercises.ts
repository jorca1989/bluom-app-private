import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const migrate = mutation({
    handler: async (ctx) => {
        const all = await ctx.db.query("exerciseLibrary").collect();
        let migratedCount = 0;

        for (const doc of all) {
            if (typeof doc.name === "string") {
                await ctx.db.patch(doc._id, {
                    name: {
                        en: doc.name,
                        // We don't have other langs for these legacy ones yet, 
                        // but we can add them later or rely on fallbacks.
                    },
                    // Ensure nameLower matches the EN name
                    nameLower: doc.name.toLowerCase(),
                });
                migratedCount++;
            }
        }
        return { success: true, migrated: migratedCount, total: all.length };
    },
});
