import { mutation } from "./_generated/server";

export const seedExercises = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Clear existing library (Reset)
    const existing = await ctx.db.query("exerciseLibrary").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    const exercises = [
      // --- Push-ups Variations ---
      { name: "Push-ups", category: "Strength", type: "strength", met: 3.8, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
      // ... (Content truncated for brevity, assume full list is identical to forceSeed.ts or I should duplicate it fully. I'll duplicate the logic wrapper around the full list as I did in forceSeed to be safe, but since I can't inject 100 lines easily in this thought block without making it huge, I will use the exact same logic as forceSeed.ts but with the export name 'seedExercises'.)
      // Wait, I must provide the FULL CONTENT for write_to_file. I will copy the full content from the previous steps but apply the fix.
      { name: "Push-ups", category: "Strength", type: "strength", met: 3.8, muscleGroups: ["Chest", "Triceps", "Shoulders"] },
      { name: "Incline Push-ups", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest", "Shoulders"] },
      { name: "Decline Push-ups", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Upper Chest", "Shoulders"] },
      { name: "Diamond Push-ups", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Triceps", "Chest"] },
      { name: "Wide Push-ups", category: "Strength", type: "strength", met: 3.8, muscleGroups: ["Chest"] },
      { name: "Clap Push-ups", category: "HIIT", type: "hiit", met: 8.0, muscleGroups: ["Chest", "Power"] },
      { name: "Staggered Push-ups", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Chest", "Core"] },
      { name: "Single-arm Push-ups", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Chest", "Triceps", "Core"] },
      { name: "Isometric Push-ups", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest", "Core"] },
      { name: "Elevated Push-ups", category: "Strength", type: "strength", met: 3.8, muscleGroups: ["Chest", "Shoulders"] },
      { name: "Handstand Push-ups", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Shoulders", "Triceps"] },

      { name: "Dumbbell Press", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Chest", "Triceps"] },
      { name: "Incline Dumbbell Press", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Upper Chest", "Front Delts"] },
      { name: "Decline Dumbbell Press", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Lower Chest"] },
      { name: "Dumbbell Flyes", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest"] },
      { name: "Dumbbell Pullovers", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Lats", "Chest"] },
      { name: "Dumbbell Squeeze Press", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Chest"] },
      { name: "Neutral Grip Dumbbell Press", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Chest", "Triceps"] },
      { name: "Single-arm Dumbbell Press", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Chest", "Core"] },
      { name: "Dumbbell Chest Press on Stability Ball", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Chest", "Core"] },
      { name: "Dumbbell Rotations", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Shoulders"] },
      { name: "Dumbbell Rows", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Back", "Biceps"] },
      { name: "Single-arm Dumbbell Rows", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Lats", "Core"] },
      { name: "Dumbbell Deadlifts", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Hamstrings", "Glutes", "Lower Back"] },
      { name: "Dumbbell Shrugs", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Traps"] },
      { name: "Bent-over Dumbbell Rows", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Back"] },
      { name: "Dumbbell Upright Rows", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Shoulders", "Traps"] },
      { name: "Renegade Rows", category: "Strength", type: "strength", met: 6.5, muscleGroups: ["Back", "Core"] },
      { name: "Dumbbell Good Mornings", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Hamstrings", "Lower Back"] },
      { name: "Dumbbell Squats", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Quads", "Glutes"] },
      { name: "Dumbbell Lunges", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Legs"] },
      { name: "Dumbbell Calf Raises", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Calves"] },
      { name: "Dumbbell Step-ups", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs", "Glutes"] },
      { name: "Dumbbell Bulgarian Split Squats", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Quads", "Glutes"] },
      { name: "Dumbbell Romanian Deadlifts", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Hamstrings"] },
      { name: "Dumbbell Sumo Squats", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Glutes", "Adductors"] },
      { name: "Dumbbell Single-leg Deadlifts", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Hamstrings", "Balance"] },
      { name: "Dumbbell Glute Bridges", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Glutes"] },
      { name: "Dumbbell Side Lunges", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Legs", "Adductors"] },
      { name: "Dumbbell Leg Curls", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Hamstrings"] },
      { name: "Dumbbell Box Jumps", category: "HIIT", type: "hiit", met: 8.0, muscleGroups: ["Legs", "Power"] },
      { name: "Dumbbell Sissy Squats", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Quads"] },

      { name: "Bench Press", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Chest", "Triceps"] },
      { name: "Incline Bench Press", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Upper Chest", "Shoulders"] },
      { name: "Decline Bench Press", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Lower Chest"] },
      { name: "Close-grip Bench Press", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Triceps", "Chest"] },
      { name: "Wide-grip Bench Press", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Chest"] },

      { name: "Cable Flyes", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest"] },
      { name: "Cable Press", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Chest"] },
      { name: "Chest Press Machine", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest"] },
      { name: "Incline Cable Press", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Upper Chest"] },
      { name: "Pec Deck", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Chest"] },
      { name: "Lat Pulldowns", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Lats"] },
      { name: "Seated Cable Rows", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Back"] },
      { name: "Cable Face Pulls", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Rear Delts", "Rotator Cuff"] },
      { name: "High Cable Rows", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Upper Back"] },
      { name: "Reverse Flyes", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Rear Delts"] },
      { name: "Leg Press", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Legs"] },
      { name: "Leg Extensions", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Quads"] },
      { name: "Leg Curls", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Hamstrings"] },
      { name: "Cable Hip Abductions", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Glutes"] },
      { name: "Cable Hip Adductions", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Adductors"] },
      { name: "Seated Calf Raises (Machine)", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Calves"] },
      { name: "Standing Calf Raises (Machine)", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Calves"] },
      { name: "Smith Machine Squats", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Legs"] },
      { name: "Hack Squats", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Quads"] },
      { name: "Glute Machine Extensions", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Glutes"] },

      { name: "Pull-ups", category: "Strength", type: "strength", met: 8.0, muscleGroups: ["Back", "Biceps"] },
      { name: "Chin-ups", category: "Strength", type: "strength", met: 8.0, muscleGroups: ["Biceps", "Back"] },
      { name: "Inverted Rows", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Back"] },
      { name: "Australian Pull-ups", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Back"] },
      { name: "Superman", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Lower Back"] },
      { name: "Back Extensions", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Lower Back"] },
      { name: "L-sit Pull-ups", category: "Strength", type: "strength", met: 9.0, muscleGroups: ["Core", "Back"] },
      { name: "Towel Pulls", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Grip", "Back"] },
      { name: "Mountain Climbers", category: "HIIT", type: "hiit", met: 8.0, muscleGroups: ["Core", "Cardio"] },
      { name: "Squats (Bodyweight)", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Legs"] },
      { name: "Lunges (Bodyweight)", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Legs"] },
      { name: "Calf Raises (Bodyweight)", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Calves"] },
      { name: "Glute Bridges", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Glutes"] },
      { name: "Leg Raises", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Abs"] },
      { name: "Pistol Squats", category: "Strength", type: "strength", met: 7.0, muscleGroups: ["Legs", "Balance"] },
      { name: "Step-ups", category: "Strength", type: "strength", met: 5.5, muscleGroups: ["Legs"] },
      { name: "Bulgarian Split Squats", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs"] },
      { name: "Sissy Squats", category: "Strength", type: "strength", met: 5.0, muscleGroups: ["Quads"] },
      { name: "Wall Sits", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Quads", "Endurance"] },
      { name: "Donkey Kicks", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Glutes"] },
      { name: "Fire Hydrants", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Hips"] },
      { name: "Leg Swings", category: "Flexibility", type: "yoga", met: 2.5, muscleGroups: ["Hips"] },
      { name: "Side Leg Lifts", category: "Strength", type: "strength", met: 3.0, muscleGroups: ["Hips"] },
      { name: "Box Jumps", category: "HIIT", type: "hiit", met: 8.0, muscleGroups: ["Legs", "Power"] },
      { name: "Burpees", category: "HIIT", type: "hiit", met: 10.0, muscleGroups: ["Full Body"] },

      { name: "Deadlifts", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Posterior Chain"] },
      { name: "Barbell Squats", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs", "Core"] },
      { name: "Barbell Deadlifts", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Posterior Chain"] },
      { name: "Bent-over Barbell Rows", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Back"] },
      { name: "T-bar Rows", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Back"] },
      { name: "Barbell Shrugs", category: "Strength", type: "strength", met: 4.0, muscleGroups: ["Traps"] },
      { name: "Power Cleans", category: "Strength", type: "strength", met: 8.0, muscleGroups: ["Full Body", "Power"] },
      { name: "Barbell Lunges", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs"] },
      { name: "Barbell Calf Raises", category: "Strength", type: "strength", met: 3.5, muscleGroups: ["Calves"] },
      { name: "Barbell Romanian Deadlifts", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Hamstrings"] },
      { name: "Barbell Sumo Squats", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Glutes", "Adductors"] },
      { name: "Barbell Hip Thrusts", category: "Strength", type: "strength", met: 4.5, muscleGroups: ["Glutes"] },
      { name: "Barbell Step-ups", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs"] },
      { name: "Barbell Bulgarian Split Squats", category: "Strength", type: "strength", met: 6.5, muscleGroups: ["Legs"] },
      { name: "Barbell Box Squats", category: "Strength", type: "strength", met: 6.0, muscleGroups: ["Legs", "Power"] }
    ] as const;

    for (const ex of exercises) {
      const typeStr = ex.type as string;
      await ctx.db.insert("exerciseLibrary", {
        ...ex,
        nameLower: ex.name.toLowerCase(),
        type: ex.type as "strength" | "cardio" | "hiit" | "yoga",
        muscleGroups: [...ex.muscleGroups],
        caloriesPerMinute: typeStr === 'hiit' ? 10 : (typeStr === 'cardio' ? 8 : 5),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return `Full library of ${exercises.length} exercises seeded successfully!`;
  },
});
