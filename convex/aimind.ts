import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveGratitude = mutation({
  args: {
    userId: v.id("users"),
    entry: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gratitudeEntries", {
      userId: args.userId,
      entry: args.entry,
      date: args.date,
      timestamp: Date.now(),
    });
  },
});

export const getGratitudeEntries = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gratitudeEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);
  },
});

export const saveJournal = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    moodTag: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("journalEntries", {
      userId: args.userId,
      content: args.content,
      moodTag: args.moodTag,
      date: args.date,
      timestamp: Date.now(),
    });
  },
});

export const getJournalEntries = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("journalEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);
  },
});

export const getWellnessInsights = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wellnessInsights")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

/**
 * Aggegate data for the Reflections Hub:
 * - Current Streak (consecutive days with at least one entry in Journal or Gratitude)
 * - Recent Entries (combined & sorted)
 */
export const getReflectionsHubData = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch recent entries (last ~60 items each to be safe for streak calc)
    const gratitudes = await ctx.db
      .query("gratitudeEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(60);

    const journals = await ctx.db
      .query("journalEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(60);

    // 2. Combine and Sort for specific "Recent Entries" list
    // We'll return the top 20 combined entries for the UI list
    const combined = [
      ...gratitudes.map((g) => ({ ...g, type: "gratitude" as const })),
      ...journals.map((j) => ({ ...j, type: "journal" as const })),
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const recentEntries = combined.slice(0, 20);

    // 3. Calculate Streak
    // Collect all unique dates (YYYY-MM-DD) that have an entry
    const activeDates = new Set<string>();
    gratitudes.forEach((g) => activeDates.add(g.date));
    journals.forEach((j) => activeDates.add(j.date));

    // Convert to sorted array of timestamps for easier day diffing
    // Note: dates are YYYY-MM-DD strings. We can rely on string sorting for these.
    const sortedDates = Array.from(activeDates).sort((a, b) => b.localeCompare(a)); // Descending

    let streak = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Check if streak is alive (has entry today or yesterday)
    if (sortedDates.length > 0) {
      const mostRecent = sortedDates[0];

      // If the most recent entry is older than yesterday, streak is broken -> 0
      // (Unless we want to be lenient, but strict streak means today or yesterday)
      if (mostRecent === todayStr || mostRecent === yesterdayStr) {
        streak = 1;
        // Iterate backwards from the most recent match to count consecutive days
        let currentRefDate = new Date(mostRecent);

        for (let i = 1; i < sortedDates.length; i++) {
          const prevDateStr = sortedDates[i];

          // Move checks 1 day back
          currentRefDate.setDate(currentRefDate.getDate() - 1);
          const expectedDateStr = currentRefDate.toISOString().split("T")[0];

          if (prevDateStr === expectedDateStr) {
            streak++;
          } else {
            // Gap found
            break;
          }
        }
      }
    }

    return {
      streak,
      recentEntries,
      hasLoggedToday: sortedDates.includes(todayStr),
    };
  },
});
