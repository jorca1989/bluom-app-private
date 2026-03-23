import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────
// ADD TODO — full enhanced schema
// ─────────────────────────────────────────────────────────────
export const addTodo = mutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    category: v.union(
      v.literal("Family"),
      v.literal("Work"),
      v.literal("Personal"),
      v.literal("Health"),
      v.literal("Finance"),
      v.literal("Grocery")
    ),
    partnerId:         v.optional(v.id("users")),
    priority:          v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    dueDate:           v.optional(v.string()),   // YYYY-MM-DD
    notes:             v.optional(v.string()),
    estimatedMinutes:  v.optional(v.number()),
    projectTag:        v.optional(v.string()),
    aiGenerated:       v.optional(v.boolean()),
    linkedWorkout:     v.optional(v.string()),
    linkedHabit:       v.optional(v.string()),
    linkedMeal:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todo", {
      userId:           args.userId,
      text:             args.text,
      category:         args.category,
      completed:        false,
      partnerId:        args.partnerId,
      priority:         args.priority ?? "medium",
      dueDate:          args.dueDate,
      notes:            args.notes,
      estimatedMinutes: args.estimatedMinutes,
      projectTag:       args.projectTag,
      aiGenerated:      args.aiGenerated ?? false,
      linkedWorkout:    args.linkedWorkout,
      linkedHabit:      args.linkedHabit,
      linkedMeal:       args.linkedMeal,
      createdAt:        Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────
// UPDATE TODO
// ─────────────────────────────────────────────────────────────
export const updateTodo = mutation({
  args: {
    todoId:           v.id("todo"),
    text:             v.optional(v.string()),
    notes:            v.optional(v.string()),
    priority:         v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    dueDate:          v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    projectTag:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { todoId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(todoId, filtered);
  },
});

// ─────────────────────────────────────────────────────────────
// TOGGLE TODO
// ─────────────────────────────────────────────────────────────
export const toggleTodo = mutation({
  args: { todoId: v.id("todo"), completed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.todoId, {
      completed:   args.completed,
      completedAt: args.completed ? Date.now() : undefined,
    });
  },
});

// ─────────────────────────────────────────────────────────────
// DELETE TODO
// ─────────────────────────────────────────────────────────────
export const deleteTodo = mutation({
  args: { todoId: v.id("todo") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.todoId);
  },
});

// ─────────────────────────────────────────────────────────────
// GET TODOS — own + partner shared Family/Grocery
// ─────────────────────────────────────────────────────────────
export const getTodos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const mine = await ctx.db
      .query("todo")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const sharedWithMe = await ctx.db
      .query("todo")
      .filter((q) => q.eq(q.field("partnerId"), args.userId))
      .collect();

    let partnerShared: any[] = [];
    if ((user as any).partnerId) {
      partnerShared = await ctx.db
        .query("todo")
        .withIndex("by_user", (q) => q.eq("userId", (user as any).partnerId!))
        .filter((q) =>
          q.or(
            q.eq(q.field("category"), "Family"),
            q.eq(q.field("category"), "Grocery")
          )
        )
        .collect();
    }

    const all    = [...mine, ...sharedWithMe, ...partnerShared];
    const unique = Array.from(new Map(all.map((item) => [item._id, item])).values());
    return unique.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────────────────────
// DAILY RESET ROUTINE — seeded from user profile
// ─────────────────────────────────────────────────────────────
export const dailyResetRoutine = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    // Build a routine personalised to onboarding answers
    const goal      = (user as any)?.fitnessGoal     ?? "general_health";
    const stressLvl = (user as any)?.stressLevel     ?? "moderate";
    const sleepHrs  = (user as any)?.sleepHours      ?? 7;
    const waterGoal = Math.round(((user as any)?.weight ?? 70) * 30);

    const routine: { text: string; category: "Personal" | "Health"; priority: string }[] = [
      { text: `Drink ${waterGoal}ml water today`, category: "Health",    priority: "high"   },
      { text: "Write 3 priorities for today",      category: "Personal", priority: "high"   },
      { text: "5-minute mindfulness breathing",    category: "Health",   priority: "medium" },
      { text: "Quick stretch (2 mins)",            category: "Health",   priority: "low"    },
    ];

    if (stressLvl === "high" || stressLvl === "very_high") {
      routine.push({ text: "10-min walk or movement break", category: "Health", priority: "medium" });
    }
    if (goal === "lose_weight" || goal === "build_muscle") {
      routine.push({ text: "Log your workout in Move tab", category: "Health", priority: "medium" });
    }
    if (sleepHrs < 7) {
      routine.push({ text: "Set a 10pm phone-down reminder", category: "Personal", priority: "low" });
    }

    for (const item of routine) {
      await ctx.db.insert("todo", {
        userId:      args.userId,
        text:        item.text,
        category:    item.category,
        completed:   false,
        priority:    item.priority as any,
        aiGenerated: true,
        createdAt:   Date.now(),
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────
// BULK INSERT (AI-generated tasks)
// ─────────────────────────────────────────────────────────────
export const bulkAddTodos = mutation({
  args: {
    userId: v.id("users"),
    tasks: v.array(v.object({
      text:             v.string(),
      category:         v.string(),
      priority:         v.optional(v.string()),
      estimatedMinutes: v.optional(v.number()),
      aiGenerated:      v.optional(v.boolean()),
      linkedWorkout:    v.optional(v.string()),
      linkedHabit:      v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    for (const task of args.tasks) {
      await ctx.db.insert("todo", {
        userId:           args.userId,
        text:             task.text,
        category:         task.category as any,
        completed:        false,
        priority:         (task.priority ?? "medium") as any,
        estimatedMinutes: task.estimatedMinutes,
        aiGenerated:      task.aiGenerated ?? false,
        linkedWorkout:    task.linkedWorkout,
        linkedHabit:      task.linkedHabit,
        createdAt:        Date.now(),
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────
// GET TODAY'S STATS (for dashboard widget)
// ─────────────────────────────────────────────────────────────
export const getTodayStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("todo")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const total     = all.filter(t => !t.completed).length;
    const completed = all.filter(t => t.completed).length;
    const urgent    = all.filter(t => !t.completed && (t as any).priority === "urgent").length;
    const overdue   = all.filter(t => {
      if (t.completed || !(t as any).dueDate) return false;
      return (t as any).dueDate < new Date().toISOString().split("T")[0];
    }).length;

    return { total, completed, urgent, overdue };
  },
});