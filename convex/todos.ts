import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const addTodo = mutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    category: v.union(v.literal("Family"), v.literal("Work"), v.literal("Personal"), v.literal("Grocery")),
    partnerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todo", {
      userId: args.userId,
      text: args.text,
      category: args.category,
      completed: false,
      partnerId: args.partnerId,
      createdAt: Date.now(),
    });
  },
});

export const toggleTodo = mutation({
  args: { todoId: v.id("todo"), completed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.todoId, { completed: args.completed });
  },
});

export const deleteTodo = mutation({
  args: { todoId: v.id("todo") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.todoId);
  },
});

export const getTodos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    // 1. User's own todos
    const mine = await ctx.db
      .query("todo")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // 2. Todos shared explicitly with user
    const sharedWithMe = await ctx.db
      .query("todo")
      .filter((q) => q.eq(q.field("partnerId"), args.userId))
      .collect();

    // 3. Partner's "Family" and "Grocery" todos (if user has a partner)
    let partnerShared: any[] = [];
    if (user.partnerId) {
      partnerShared = await ctx.db
        .query("todo")
        .withIndex("by_user", (q) => q.eq("userId", user.partnerId!))
        .filter((q) => q.or(
          q.eq(q.field("category"), "Family"),
          q.eq(q.field("category"), "Grocery")
        ))
        .collect();
    }

    const all = [...mine, ...sharedWithMe, ...partnerShared];
    
    // Deduplicate by ID
    const unique = Array.from(new Map(all.map(item => [item._id, item])).values());

    return unique.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const dailyResetRoutine = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const routine = [
      "Drink 500ml water",
      "5-minute mindfulness breathing",
      "Write down 3 priorities for today",
      "Quick stretch (2 mins)",
    ];

    for (const text of routine) {
      await ctx.db.insert("todo", {
        userId: args.userId,
        text,
        category: "Personal",
        completed: false,
        createdAt: Date.now(),
      });
    }
  },
});

