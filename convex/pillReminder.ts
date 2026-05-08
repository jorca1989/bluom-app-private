import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addPillSchedule = mutation({
  args: {
    userId: v.id("users"),
    pillName: v.string(),
    reminderTime: v.string(),
    color: v.string(),
    shape: v.union(v.literal("round"), v.literal("oval"), v.literal("square")),
    daysOfWeek: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pillSchedules", { ...args, active: true });
  },
});

export const deletePillSchedule = mutation({
  args: { scheduleId: v.id("pillSchedules") },
  handler: async (ctx, { scheduleId }) => {
    await ctx.db.delete(scheduleId);
  },
});

export const getPillSchedules = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pillSchedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const logPill = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    pillName: v.string(),
    taken: v.boolean(),
    reminderTime: v.string(),
    color: v.string(),
    shape: v.union(v.literal("round"), v.literal("oval"), v.literal("square")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pillLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("pillName"), args.pillName))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        taken: args.taken,
        takenAt: args.taken ? Date.now() : undefined,
        notes: args.notes,
      });
    } else {
      await ctx.db.insert("pillLogs", {
        ...args,
        takenAt: args.taken ? Date.now() : undefined,
      });
    }
  },
});

export const getTodayPills = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const schedules = await ctx.db
      .query("pillSchedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    const todayDow = new Date(date).getDay();
    const todaySchedules = schedules.filter((s) =>
      s.daysOfWeek.includes(todayDow)
    );

    const logs = await ctx.db
      .query("pillLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    return todaySchedules.map((schedule) => {
      const log = logs.find((l) => l.pillName === schedule.pillName);
      return {
        ...schedule,
        taken: log?.taken ?? false,
        takenAt: log?.takenAt,
        logId: log?._id,
      };
    });
  },
});

export const getPillHistory = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, { userId, days }) => {
    const limit = days ?? 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limit);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return await ctx.db
      .query("pillLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), cutoffStr))
      .collect();
  },
});
