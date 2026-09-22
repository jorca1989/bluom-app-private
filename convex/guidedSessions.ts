import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startFocusSession = mutation({
  args: {
    userId: v.id("users"), title: v.optional(v.string()), preset: v.string(),
    focusSeconds: v.number(), breakSeconds: v.number(), plannedCycles: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.focusSeconds < 60 || args.focusSeconds > 4 * 60 * 60) throw new Error("Invalid focus duration.");
    const now = Date.now();
    return ctx.db.insert("focusSessions", { ...args, completedCycles: 0, startedAt: now, pausedSeconds: 0, status: "active", createdAt: now, updatedAt: now });
  },
});

export const updateFocusSession = mutation({
  args: {
    userId: v.id("users"), sessionId: v.id("focusSessions"), completedCycles: v.number(),
    pausedSeconds: v.number(), status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("ended")),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.sessionId);
    if (!row || row.userId !== args.userId) throw new Error("Focus session was not found.");
    const done = args.status === "completed" || args.status === "ended";
    await ctx.db.patch(args.sessionId, { completedCycles: Math.max(0, args.completedCycles), pausedSeconds: Math.max(0, args.pausedSeconds), status: args.status, endedAt: done ? Date.now() : undefined, updatedAt: Date.now() });
  },
});

export const logPelvicFloorSession = mutation({
  args: {
    userId: v.id("users"), audience: v.union(v.literal("women"), v.literal("men")), lifeStage: v.optional(v.string()),
    program: v.string(), plannedRounds: v.number(), completedRounds: v.number(), contractionSeconds: v.number(), relaxationSeconds: v.number(), durationSeconds: v.number(), discomfort: v.optional(v.number()), status: v.union(v.literal("completed"), v.literal("stopped")),
  },
  handler: async (ctx, args) => {
    if (args.discomfort !== undefined && (args.discomfort < 0 || args.discomfort > 10)) throw new Error("Invalid discomfort rating.");
    return ctx.db.insert("pelvicFloorSessions", { ...args, createdAt: Date.now() });
  },
});

export const listPelvicFloorSessions = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: (ctx, args) => ctx.db.query("pelvicFloorSessions").withIndex("by_user_created", q => q.eq("userId", args.userId)).order("desc").take(Math.min(50, args.limit ?? 10)),
});
