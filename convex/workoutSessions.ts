import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const setSource = v.union(v.literal("manual"), v.literal("voice"), v.literal("machine"));

export const startSession = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    date: v.string(),
    unit: v.union(v.literal("kg"), v.literal("lb")),
    source: setSource,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("workoutSessions", {
      ...args,
      startedAt: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertSet = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.id("workoutSessions"),
    exerciseId: v.optional(v.string()),
    exerciseName: v.string(),
    setIndex: v.number(),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    completed: v.boolean(),
    source: setSource,
    clientEventId: v.string(),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId || session.status !== "active") {
      throw new Error("Workout session is not active.");
    }
    if (args.setIndex < 0 || args.setIndex > 99) throw new Error("Invalid set number.");
    if (args.weight !== undefined && (args.weight < 0 || args.weight > 2000)) throw new Error("Invalid weight.");
    if (args.reps !== undefined && (args.reps < 0 || args.reps > 1000)) throw new Error("Invalid repetitions.");
    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) throw new Error("RPE must be between 1 and 10.");

    const now = Date.now();
    const existing = await ctx.db
      .query("workoutSetEvents")
      .withIndex("by_client_event", q => q.eq("userId", args.userId).eq("clientEventId", args.clientEventId))
      .first();

    const values = {
      exerciseId: args.exerciseId,
      exerciseName: args.exerciseName.trim().slice(0, 160),
      setIndex: args.setIndex,
      weight: args.weight,
      reps: args.reps,
      rpe: args.rpe,
      completedAt: args.completed ? now : undefined,
      source: args.source,
      transcript: args.transcript?.trim().slice(0, 500),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }

    return ctx.db.insert("workoutSetEvents", {
      userId: args.userId,
      sessionId: args.sessionId,
      clientEventId: args.clientEventId,
      createdAt: now,
      ...values,
    });
  },
});

export const deleteSet = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.id("workoutSessions"),
    clientEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId || session.status !== "active") {
      throw new Error("Workout session is not active.");
    }
    const event = await ctx.db
      .query("workoutSetEvents")
      .withIndex("by_client_event", q => q.eq("userId", args.userId).eq("clientEventId", args.clientEventId))
      .first();
    if (event && event.sessionId === args.sessionId) await ctx.db.delete(event._id);
    return null;
  },
});

export const finishSession = mutation({
  args: { userId: v.id("users"), sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) throw new Error("Workout session was not found.");
    const sets = await ctx.db.query("workoutSetEvents").withIndex("by_session", q => q.eq("sessionId", args.sessionId)).collect();
    const completed = sets.filter(set => set.completedAt !== undefined);
    const totalVolume = completed.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      finishedAt: now,
      totalSets: completed.length,
      totalVolume: Math.round(totalVolume * 10) / 10,
      updatedAt: now,
    });
    return { totalSets: completed.length, totalVolume: Math.round(totalVolume * 10) / 10 };
  },
});

export const activeSession = query({
  args: { userId: v.id("users") },
  handler: (ctx, args) => ctx.db.query("workoutSessions").withIndex("by_user_status", q => q.eq("userId", args.userId).eq("status", "active")).first(),
});
