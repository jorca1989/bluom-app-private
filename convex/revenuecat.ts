import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const handleWebhook = httpAction(async (ctx, request) => {
    const body = await request.json();
    const { event } = body;

    // app_user_id is the unique ID you set (likely the Clerk User ID)
    const userId = event.app_user_id;
    const eventType = event.type;

    if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
        await ctx.runMutation(internal.users.updateSubscription, {
            userId,
            status: "pro",
            endsOn: event.expiration_at_ms,
        });

        const user = await ctx.runQuery(internal.users.internalGetUserByClerkId, { clerkId: userId });
        if (user) {
            if (eventType === "INITIAL_PURCHASE") {
                await ctx.scheduler.runAfter(0, internal.plans.internalGenerateAllPlans, { userId: user._id });
            } else if (eventType === "RENEWAL") {
                await ctx.scheduler.runAfter(0, internal.plans.checkAndRegenerateSingle, { userId: user._id });
            }
        }
    } else if (eventType === "EXPIRATION") {
        await ctx.runMutation(internal.users.updateSubscription, {
            userId,
            status: "free",
        });
    }

    return new Response(null, { status: 200 });
});
