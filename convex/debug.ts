import { query } from "./_generated/server";

export const listFoods = query({
    handler: async (ctx) => {
        return await ctx.db.query("customFoods").take(10);
    },
});
