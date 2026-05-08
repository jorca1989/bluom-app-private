import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkAdminPower } from "./functions";

function normalizeEmail(email: string) {
  return String(email).trim().toLowerCase();
}

export const submit = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()), // e.g. "landing"
  },
  handler: async (ctx, args) => {
    const emailLower = normalizeEmail(args.email);
    if (!emailLower || !emailLower.includes("@") || emailLower.length > 200) {
      throw new Error("Invalid email");
    }

    const existing = await ctx.db
      .query("testUsers")
      .withIndex("by_emailLower", (q) => q.eq("emailLower", emailLower))
      .first();

    if (existing) {
      // idempotent for screenshots / repeated submits
      return { ok: true, id: existing._id, created: false };
    }

    const id = await ctx.db.insert("testUsers", {
      email: args.email.trim(),
      emailLower,
      source: args.source,
      createdAt: Date.now(),
    });

    return { ok: true, id, created: true };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await checkAdminPower(ctx);
    const rows = await ctx.db.query("testUsers").order("desc").collect();
    return rows;
  },
});

