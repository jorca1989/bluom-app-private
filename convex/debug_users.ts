import { query } from "./_generated/server";

export const check = query({
    handler: async (ctx) => {
        const user = await ctx.db.query("users").first();
        return user ? "Users OK" : "Users Empty";
    },
});
