import { query } from "./_generated/server";

export const stats = query({
    handler: async (ctx) => {
        // 1. Basic Check
        console.log("Checking connectivity...");

        // 2. Check Users (should work)
        const user = await ctx.db.query("users").first();
        console.log("Found user:", !!user);

        // 3. Check Exercises
        const exercise = await ctx.db.query("exerciseLibrary").first();
        console.log("Found exercise:", exercise);

        return {
            status: "Available",
            exercise
        };
    },
});
