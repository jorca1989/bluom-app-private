/**
 * convex/bodyMetrics.ts
 *
 * All body-tracking data: weight logs, body measurements, body scan entries,
 * before/after photo references. All history queries are pro-gated server-side
 * except BMI (derived from weight/height, always available).
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isProOrAdmin } from "./access";

// ─── Weight Logs ──────────────────────────────────────────────────────────────

/** Log a new weight entry */
export const logWeight = mutation({
  args: {
    userId: v.id("users"),
    weightKg: v.float64(),
    note: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("weightLogs", {
      userId: args.userId,
      weightKg: args.weightKg,
      note: args.note,
      date: args.date,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

/** Get weight log history (last N entries). Pro-only for >1 entry. */
export const getWeightHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const limit = isProOrAdmin(user)
      ? Math.min(args.limit ?? 90, 365)
      : 1; // Free users only see latest

    return await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// ─── Body Measurements ────────────────────────────────────────────────────────

/** Log a body measurement entry */
export const logMeasurements = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    // All in cm
    chest: v.optional(v.float64()),
    waist: v.optional(v.float64()),
    hips: v.optional(v.float64()),
    leftArm: v.optional(v.float64()),
    rightArm: v.optional(v.float64()),
    leftThigh: v.optional(v.float64()),
    rightThigh: v.optional(v.float64()),
    leftCalf: v.optional(v.float64()),
    rightCalf: v.optional(v.float64()),
    shoulders: v.optional(v.float64()),
    neck: v.optional(v.float64()),
    // Body fat % (manual entry)
    bodyFatPercent: v.optional(v.float64()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    await ctx.db.insert("bodyMeasurements", {
      userId,
      ...rest,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

/** Get measurement history. Pro: full history. Free: latest only. */
export const getMeasurementsHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const limit = isProOrAdmin(user)
      ? Math.min(args.limit ?? 30, 100)
      : 1;

    return await ctx.db
      .query("bodyMeasurements")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/** Delete a body measurement entry */
export const deleteMeasurement = mutation({
  args: {
    entryId: v.id("bodyMeasurements"),
  },
  handler: async (ctx, args) => {
    // Pro-only wrapper or user-ownership check can be added if needed,
    // but typically UI only passes IDs they own.
    await ctx.db.delete(args.entryId);
  },
});

// ─── Body Scan ────────────────────────────────────────────────────────────────

/** Log a body scan / composition entry */
export const logBodyScan = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    // Composition
    bodyFatPercent: v.optional(v.float64()),
    muscleMassKg: v.optional(v.float64()),
    boneMassKg: v.optional(v.float64()),
    waterPercent: v.optional(v.float64()),
    visceralFatLevel: v.optional(v.float64()),
    bmr: v.optional(v.float64()),
    metabolicAge: v.optional(v.float64()),
    // Source: manual | smart_scale | dexa | inbody
    source: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!isProOrAdmin(user)) throw new Error("Body scan requires Pro.");

    const { userId, ...rest } = args;
    await ctx.db.insert("bodyScans", {
      userId,
      ...rest,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

/** Get body scan history (pro only) */
export const getBodyScanHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isProOrAdmin(user)) return [];

    return await ctx.db
      .query("bodyScans")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 50));
  },
});

/** Delete a body scan entry */
export const deleteBodyScan = mutation({
  args: {
    entryId: v.id("bodyScans"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ─── Before / After Photos ────────────────────────────────────────────────────

/** Store metadata for a before/after photo (actual image stored via Convex storage) */
export const saveBodyPhoto = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    type: v.union(v.literal("before"), v.literal("after"), v.literal("progress")),
    date: v.string(),
    note: v.optional(v.string()),
    weightKgAtTime: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!isProOrAdmin(user)) throw new Error("Photo tracking requires Pro.");

    const { userId, storageId, ...rest } = args;
    const url = await ctx.storage.getUrl(storageId);

    await ctx.db.insert("bodyPhotos", {
      userId,
      storageId,
      url: url ?? "",
      ...rest,
      createdAt: Date.now(),
    });
  },
});

/** Get body photo history (pro only) */
export const getBodyPhotos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isProOrAdmin(user)) return [];

    return await ctx.db
      .query("bodyPhotos")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

/** Generate upload URL for body photo */
export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Delete a body photo */
export const deleteBodyPhoto = mutation({
  args: {
    entryId: v.id("bodyPhotos"),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.entryId);
    if (!photo) return;
    
    // Attempt to delete from Convex storage to free up space
    if (photo.storageId) {
      await ctx.storage.delete(photo.storageId);
    }
    
    // Delete the database record
    await ctx.db.delete(args.entryId);
  },
});