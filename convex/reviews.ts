import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const feedbackCategory = v.union(v.literal("bug"), v.literal("feature_request"), v.literal("general_experience"), v.literal("praise"));
const RECENT_REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

async function requireCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in to submit a review.");
  const user = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject)).first();
  if (!user) throw new Error("Your profile is still being set up. Please try again shortly.");
  return user;
}

export const submitReview = mutation({
  args: { rating: v.number(), feedbackCategory, comment: v.optional(v.string()), appVersion: v.string(), platform: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new Error("Rating must be a whole number from 1 to 5.");
    const comment = args.comment ? sanitizeText(args.comment) : "";
    if (comment.length > 500) throw new Error("Feedback must be 500 characters or fewer.");
    if (args.rating <= 3 && !comment) throw new Error("Please add a short note so we can improve.");
    const appVersion = sanitizeText(args.appVersion).slice(0, 60);
    const platform = sanitizeText(args.platform).slice(0, 30);
    if (!appVersion || !platform) throw new Error("Review metadata is missing.");
    const now = Date.now();
    return await ctx.db.insert("reviews", { userId: user._id, rating: args.rating, feedbackCategory: args.feedbackCategory, comment: comment || undefined, appVersion, platform, status: "pending", createdAt: now, updatedAt: now });
  },
});

export const getUserReviewStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const latestReview = await ctx.db.query("reviews").withIndex("by_user_created_at", (q) => q.eq("userId", user._id)).order("desc").first();
    return { hasSubmittedRecently: !!latestReview && latestReview.createdAt >= Date.now() - RECENT_REVIEW_WINDOW_MS, latestReviewAt: latestReview?.createdAt ?? null };
  },
});