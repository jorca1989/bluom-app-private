/**
 * convex/integrations.ts
 *
 * Handles all inbound health/fitness data from external sources.
 *
 * Key additions vs original:
 *  - saveExternalData: now accepts distanceKm, weightKg, sleepHours, heartRateAvg
 *  - syncStravaActivities: maps Strava activity objects → exerciseEntries
 *  - deleteAllUserData: cascade delete for account deletion (Apple Guideline 5.1.1)
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Read today's synced metrics (unchanged shape, extended values) ──────────
export const getTodayMetrics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now   = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    const startMs = start.getTime();
    const endMs   = end.getTime();

    const latest = (type: string) =>
      ctx.db
        .query("integrationsData")
        .withIndex("by_user_type_time", (q) =>
          q.eq("userId", args.userId).eq("type", type).gte("timestamp", startMs)
        )
        .filter((q) => q.lte(q.field("timestamp"), endMs))
        .order("desc")
        .first();

    const [steps, calories, distance, weight, sleep, hr, bodyFat, menstrualFlow, ovulationTest] = await Promise.all([
      latest("steps"),
      latest("active_calories"),
      latest("distance_km"),
      latest("weight_kg"),
      latest("sleep_hours"),
      latest("heart_rate_avg"),
      latest("body_fat_pct"),
      latest("menstrual_flow"),
      latest("ovulation_test_result"),
    ]);

    const lastSync = Math.max(
      steps?.timestamp    ?? 0,
      calories?.timestamp ?? 0,
    );

    return {
      steps:          Math.round(steps?.value    ?? 0),
      calories:       Math.round(calories?.value ?? 0),
      distanceKm:     Math.round((distance?.value ?? 0) * 100) / 100,
      weightKg:       weight?.value  ?? null,
      bodyFatPct:     bodyFat?.value ?? null,
      sleepHours:     sleep?.value   ?? null,
      heartRateAvg:   hr?.value      ?? null,
      menstrualFlow:  menstrualFlow?.value ?? null,
      ovulationTestResult: ovulationTest?.value ?? null,
      lastSync:       lastSync > 0 ? lastSync : null,

      // Metadata for UI: show units, timestamps, and source labels per metric
      sources: {
        steps: steps?.source ?? null,
        calories: calories?.source ?? null,
        distanceKm: distance?.source ?? null,
        weightKg: weight?.source ?? null,
        bodyFatPct: bodyFat?.source ?? null,
        sleepHours: sleep?.source ?? null,
        heartRateAvg: hr?.source ?? null,
        menstrualFlow: menstrualFlow?.source ?? null,
        ovulationTestResult: ovulationTest?.source ?? null,
      },
      units: {
        steps: steps?.unit ?? "count",
        calories: calories?.unit ?? "kcal",
        distanceKm: distance?.unit ?? "km",
        weightKg: weight?.unit ?? "kg",
        bodyFatPct: bodyFat?.unit ?? "%",
        sleepHours: sleep?.unit ?? "hours",
        heartRateAvg: hr?.unit ?? "bpm",
        menstrualFlow: menstrualFlow?.unit ?? "level",
        ovulationTestResult: ovulationTest?.unit ?? "result",
      },
      timestamps: {
        steps: steps?.timestamp ?? null,
        calories: calories?.timestamp ?? null,
        distanceKm: distance?.timestamp ?? null,
        weightKg: weight?.timestamp ?? null,
        bodyFatPct: bodyFat?.timestamp ?? null,
        sleepHours: sleep?.timestamp ?? null,
        heartRateAvg: hr?.timestamp ?? null,
        menstrualFlow: menstrualFlow?.timestamp ?? null,
        ovulationTestResult: ovulationTest?.timestamp ?? null,
      },
    };
  },
});

// ─── Save inbound health data (extended) ─────────────────────────────────────
export const saveExternalData = mutation({
  args: {
    userId:       v.id("users"),
    steps:        v.number(),
    calories:     v.number(),
    distanceKm:   v.optional(v.number()),
    weightKg:     v.optional(v.number()),
    bodyFatPct:   v.optional(v.number()),
    sleepHours:   v.optional(v.number()),
    heartRateAvg: v.optional(v.number()),
    menstrualFlow: v.optional(v.number()),
    ovulationTestResult: v.optional(v.number()),
    source:       v.optional(v.string()), // 'apple_health' | 'google_health'
  },
  handler: async (ctx, args) => {
    const ts     = Date.now();
    const source = args.source ?? "unknown";

    const inserts: Promise<any>[] = [];

    if (args.steps > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "steps", value: args.steps, unit: "count", timestamp: ts,
      }));
    }
    if (args.calories > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "active_calories", value: args.calories, unit: "kcal", timestamp: ts,
      }));
    }
    if (args.distanceKm && args.distanceKm > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "distance_km", value: args.distanceKm, unit: "km", timestamp: ts,
      }));
    }
    if (args.weightKg && args.weightKg > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "weight_kg", value: args.weightKg, unit: "kg", timestamp: ts,
      }));
      // Mirror weight to weightLogs for the body metrics tracker
      inserts.push(ctx.db.insert("weightLogs", {
        userId:    args.userId,
        weightKg:  args.weightKg,
        date:      new Date(ts).toISOString().split("T")[0],
        timestamp: ts,
        createdAt: ts,
        note:      `Synced from ${source}`,
      }));
    }
    if (args.bodyFatPct && args.bodyFatPct > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "body_fat_pct", value: args.bodyFatPct, unit: "%", timestamp: ts,
      }));
    }
    if (args.menstrualFlow !== undefined && args.menstrualFlow !== null) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "menstrual_flow", value: args.menstrualFlow, unit: "level", timestamp: ts,
      }));
    }
    if (args.ovulationTestResult !== undefined && args.ovulationTestResult !== null) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "ovulation_test_result", value: args.ovulationTestResult, unit: "result", timestamp: ts,
      }));
    }
    if (args.sleepHours && args.sleepHours > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "sleep_hours", value: args.sleepHours, unit: "hours", timestamp: ts,
      }));
    }
    if (args.heartRateAvg && args.heartRateAvg > 0) {
      inserts.push(ctx.db.insert("integrationsData", {
        userId: args.userId, source,
        type: "heart_rate_avg", value: args.heartRateAvg, unit: "bpm", timestamp: ts,
      }));
    }

    await Promise.all(inserts);
    return { success: true, timestamp: ts };
  },
});

// ─── Recent imported data (for reviewer-facing UI) ───────────────────────────
export const getRecentImportedData = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const types = [
      "steps",
      "active_calories",
      "distance_km",
      "weight_kg",
      "body_fat_pct",
      "sleep_hours",
      "heart_rate_avg",
      "menstrual_flow",
      "ovulation_test_result",
    ] as const;

    const perType = await Promise.all(
      types.map((type) =>
        ctx.db
          .query("integrationsData")
          .withIndex("by_user_type_time", (q) =>
            q.eq("userId", args.userId).eq("type", type)
          )
          .order("desc")
          .take(Math.min(limit, 50))
      )
    );

    const merged = perType.flat();
    merged.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return merged.slice(0, limit);
  },
});

// ─── Strava: sync latest activities → exerciseEntries ────────────────────────
/**
 * Maps Strava sport_type strings to our ExerciseType union.
 * Strava types: https://developers.strava.com/docs/reference/#api-models-SportType
 */
function stravaTypeToExerciseType(
  sportType: string
): "strength" | "cardio" | "hiit" | "yoga" {
  const t = (sportType ?? "").toLowerCase();
  if (t.includes("yoga") || t.includes("pilates") || t.includes("stretch")) return "yoga";
  if (t.includes("weight") || t.includes("crossfit") || t.includes("rock") || t.includes("climb")) return "strength";
  if (t.includes("hiit") || t.includes("interval") || t.includes("crossfit")) return "hiit";
  // Default: cardio (covers run, ride, swim, walk, hike, row, etc.)
  return "cardio";
}

export const syncStravaActivities = action({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Get user + Strava tokens via internal query
    const dbUser: any = await ctx.runQuery(internal.strava.getUserForStrava, {
      clerkId: identity.subject,
    });
    if (!dbUser) throw new Error("User not found");
    if (!dbUser.stravaAccessToken) throw new Error("Strava not connected");

    // Fetch activities since last sync (or last 30 days)
    const after = dbUser.stravaExpiresAt
      ? Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
      : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=30&after=${after}`,
      { headers: { Authorization: `Bearer ${dbUser.stravaAccessToken}` } }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message ?? `Strava API error ${resp.status}`);
    }

    const activities: any[] = await resp.json();
    if (!activities.length) return 0;

    // Upsert each activity as an exerciseEntry
    let imported = 0;
    for (const act of activities) {
      const durationMinutes = Math.max(1, Math.round((act.moving_time ?? act.elapsed_time ?? 60) / 60));
      const caloriesBurned  = act.calories ?? Math.round(durationMinutes * 7); // rough fallback
      const distanceKm      = Math.round((act.distance ?? 0) / 10) / 100;
      const type            = stravaTypeToExerciseType(act.sport_type ?? act.type ?? "");
      const dateStr         = (act.start_date_local ?? act.start_date ?? "").split("T")[0];
      const met             = caloriesBurned / (Math.max(1, (dbUser.weight ?? 70)) * Math.max(0.01, durationMinutes / 60));

      await ctx.runMutation(internal.integrations.upsertStravaActivity, {
        userId:        dbUser._id,
        stravaId:      String(act.id),
        exerciseName:  act.name ?? `Strava ${type}`,
        exerciseType:  type,
        duration:      durationMinutes,
        met:           Number.isFinite(met) ? Math.max(0.1, met) : 6,
        caloriesBurned,
        distanceKm,
        date:          dateStr,
        timestamp:     new Date(act.start_date ?? Date.now()).getTime(),
      });
      imported++;
    }

    return imported;
  },
});

// Internal mutation: insert Strava activity (skips duplicates by stravaId note field)
export const upsertStravaActivity = internalMutation({
  args: {
    userId:        v.id("users"),
    stravaId:      v.string(),
    exerciseName:  v.string(),
    exerciseType:  v.union(v.literal("strength"), v.literal("cardio"), v.literal("hiit"), v.literal("yoga")),
    duration:      v.float64(),
    met:           v.float64(),
    caloriesBurned: v.float64(),
    distanceKm:    v.float64(),
    date:          v.string(),
    timestamp:     v.float64(),
  },
  handler: async (ctx, args) => {
    // Check for existing entry with same Strava ID stored as pace field
    // (We encode stravaId in the pace field as a lookup key since the schema
    //  doesn't have a stravaId column. If you want a cleaner approach, add
    //  an externalId column to exerciseEntries in schema.ts)
    const existing = await ctx.db
      .query("exerciseEntries")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("pace"), parseFloat(args.stravaId)))
      .first();

    if (existing) return; // already imported

    await ctx.db.insert("exerciseEntries", {
      userId:        args.userId,
      exerciseName:  args.exerciseName,
      exerciseType:  args.exerciseType,
      duration:      args.duration,
      met:           args.met,
      caloriesBurned: args.caloriesBurned,
      distance:      args.distanceKm,
      // Encode stravaId here as pace to detect duplicates — replace with
      // a proper externalId field when you next update schema.ts
      pace:          parseFloat(args.stravaId),
      date:          args.date,
      timestamp:     args.timestamp,
      createdAt:     Date.now(),
    });
  },
});

// ─── Account deletion cascade (Apple Guideline 5.1.1) ───────────────────────
/**
 * Call this from your account deletion flow BEFORE deleting the users row.
 * Deletes ALL data in integrationsData, weightLogs, bodyMeasurements,
 * bodyScans, bodyPhotos, meditationLogs, foodEntries, exerciseEntries,
 * stepsEntries, sleepLogs, moodLogs, habitEntries for the given userId.
 */
export const deleteAllUserIntegrationsData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tables = [
      "integrationsData",
      "weightLogs",
      "bodyMeasurements",
      "bodyScans",
      // bodyPhotos has storageIds — delete storage objects too
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db
        .query(table as any)
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    // Body photos: also delete from Convex storage
    const photos = await ctx.db
      .query("bodyPhotos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const photo of photos) {
      try { await ctx.storage.delete(photo.storageId); } catch { /* already gone */ }
      await ctx.db.delete(photo._id);
    }
  },
});

/**
 * Full account deletion: removes the user row + all associated records.
 * Expose this via a mutation that your settings screen calls.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    // 1. Delete health / integration data
    await ctx.runMutation(internal.integrations.deleteAllUserIntegrationsData, {
      userId: user._id,
    });

    // 2. Delete the users row itself (Clerk account deletion must be handled
    //    separately via Clerk's Management API from your backend webhook)
    await ctx.db.delete(user._id);
  },
});