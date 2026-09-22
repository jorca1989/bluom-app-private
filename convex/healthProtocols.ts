import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveProtocol = mutation({
  args: { userId: v.id("users"), name: v.string(), category: v.string(), reminderTime: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("healthProtocols", { ...args, name: args.name.trim().slice(0, 100), category: args.category.trim().slice(0, 60), notes: args.notes?.trim().slice(0, 500), isActive: true, createdAt: now, updatedAt: now });
  },
});

export const logMarker = mutation({
  args: { userId: v.id("users"), marker: v.string(), value: v.number(), unit: v.string(), measuredAt: v.number(), source: v.union(v.literal("manual"), v.literal("lab"), v.literal("device")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.value) || Math.abs(args.value) > 1_000_000) throw new Error("Invalid marker value.");
    return ctx.db.insert("healthMarkerMeasurements", { ...args, marker: args.marker.trim().slice(0, 80), unit: args.unit.trim().slice(0, 20), note: args.note?.trim().slice(0, 500), createdAt: Date.now() });
  },
});

export const recentMarkers = query({
  args: { userId: v.id("users"), marker: v.string(), limit: v.optional(v.number()) },
  handler: (ctx, args) => ctx.db.query("healthMarkerMeasurements").withIndex("by_user_marker_time", q => q.eq("userId", args.userId).eq("marker", args.marker)).order("desc").take(Math.min(args.limit ?? 20, 100)),
});

export const recentMarkerMeasurements = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: (ctx, args) => ctx.db
    .query("healthMarkerMeasurements")
    .withIndex("by_user_measuredAt", q => q.eq("userId", args.userId))
    .order("desc")
    .take(Math.min(args.limit ?? 100, 250)),
});

// Demo rows are deliberately labelled, so they cannot be mistaken for lab or device data.
export const deleteDemoMarkers = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("healthMarkerMeasurements")
      .withIndex("by_user_measuredAt", q => q.eq("userId", args.userId))
      .collect();
    await Promise.all(
      rows
        .filter(row => row.note === "Bluom demo data")
        .map(row => ctx.db.delete(row._id)),
    );
  },
});
