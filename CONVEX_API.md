# Convex API Reference

This document provides a comprehensive reference for all Convex mutations and queries in Bluom.App.

## Authentication

All functions require Clerk authentication. Users must be signed in to access any mutations or queries.

---

## Users API (`convex/users.ts`)

### `storeUser` (Mutation)

Creates or retrieves a user from Clerk authentication data.

**Args:**
```typescript
{
  clerkId: string;
  email: string;
  name: string;
}
```

**Returns:** `userId` (string)

**Usage:**
```typescript
const userId = await convex.mutation(api.users.storeUser, {
  clerkId: user.id,
  email: user.emailAddresses[0].emailAddress,
  name: user.fullName || "User",
});
```

### `getUserByClerkId` (Query)

Retrieves user profile by Clerk ID.

**Args:**
```typescript
{
  clerkId: string;
}
```

**Returns:** `UserProfile | null`

### `updateUser` (Mutation)

Updates user profile data.

**Args:**
```typescript
{
  userId: Id<"users">;
  updates: {
    name?: string;
    weight?: number;
    height?: number;
    targetWeight?: number;
    fitnessGoal?: FitnessGoal;
    activityLevel?: ActivityLevel;
    // ... other optional fields
  };
}
```

### `hasCompletedOnboarding` (Query)

Checks if user has completed the onboarding questionnaire.

**Args:**
```typescript
{
  clerkId: string;
}
```

**Returns:** `boolean`

---

## Onboarding API (`convex/onboarding.ts`)

### `onboardUser` (Mutation)

Processes the 18-question onboarding questionnaire and calculates personalized targets using the Mifflin-St Jeor formula.

**Args:**
```typescript
{
  clerkId: string;
  name: string;
  biologicalSex: "male" | "female";
  age: string;
  weight: string;
  height: string;
  targetWeight?: string;
  fitnessGoal: "lose_weight" | "build_muscle" | "maintain" | "improve_health";
  fitnessExperience: "beginner" | "intermediate" | "advanced";
  workoutPreference: "strength" | "cardio" | "hiit" | "yoga" | "mixed";
  weeklyWorkoutTime: string;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
  nutritionApproach: "balanced" | "high_protein" | "low_carb" | "plant_based" | "flexible";
  sleepHours: string;
  stressLevel: "low" | "moderate" | "high" | "very_high";
  motivations: string[];
  challenges: string[];
  mealsPerDay: string;
  threeMonthGoal: string;
}
```

**Returns:**
```typescript
{
  success: boolean;
  userId: Id<"users">;
  calculations: {
    bmr: number;
    tdee: number;
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
    holisticScore: number;
  };
}
```

**Formula:**
1. BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
2. TDEE = BMR × Activity Factor
3. Adjusted Calories = TDEE ± Goal Adjustment
4. Macros = Calculated based on goal and approach

### `preCalculateTargets` (Mutation)

Calculates targets without storing (for preview before signup).

**Args:** Subset of onboarding args

**Returns:** Calculated macro targets

---

## Plans API (`convex/plans.ts`)

### `generateNutritionPlan` (Mutation)

Creates a personalized meal plan based on user's calculated macros.

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:** `nutritionPlanId`

### `generateFitnessPlan` (Mutation)

Creates a workout split based on experience and time commitment.

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:** `fitnessPlanId`

### `generateWellnessPlan` (Mutation)

Creates wellness recommendations for habits, sleep, and meditation.

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:** `wellnessPlanId`

### `generateAllPlans` (Mutation)

Generates all three plans at once (called after onboarding).

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:**
```typescript
{
  nutritionPlanId: Id<"nutritionPlans">;
  fitnessPlanId: Id<"fitnessPlans">;
  wellnessPlanId: Id<"wellnessPlans">;
}
```

### `getActivePlans` (Query)

Retrieves active plans for a user.

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:**
```typescript
{
  nutritionPlan: NutritionPlan | null;
  fitnessPlan: FitnessPlan | null;
  wellnessPlan: WellnessPlan | null;
}
```

---

## Food API (`convex/food.ts`)

### `logFoodEntry` (Mutation)

Logs a food entry to a specific meal slot.

**Args:**
```typescript
{
  userId: Id<"users">;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "premium_slot";
  date: string; // ISO format (YYYY-MM-DD)
}
```

**Returns:** `foodEntryId`

**Note:** Premium slot requires `isPremium: true`

### `getFoodEntriesByDate` (Query)

Gets all food entries for a specific date.

**Args:**
```typescript
{
  userId: Id<"users">;
  date: string;
}
```

**Returns:** `FoodEntry[]`

### `getDailyTotals` (Query)

Calculates total macros consumed for a date.

**Args:**
```typescript
{
  userId: Id<"users">;
  date: string;
}
```

**Returns:**
```typescript
{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
```

### `deleteFoodEntry` (Mutation)

Deletes a food entry.

**Args:**
```typescript
{
  entryId: Id<"foodEntries">;
}
```

---

## Exercise API (`convex/exercise.ts`)

### `logExerciseEntry` (Mutation)

Logs an exercise with MET-based calorie calculation.

**Args:**
```typescript
{
  userId: Id<"users">;
  exerciseName: string;
  exerciseType: "strength" | "cardio" | "hiit" | "yoga";
  duration: number; // minutes
  met: number; // Metabolic Equivalent of Task
  sets?: number;
  reps?: number;
  weight?: number; // kg
  distance?: number; // km
  pace?: number; // min/km
  date: string;
}
```

**Returns:** `exerciseEntryId`

**Calories Formula:** `MET × weight_kg × (duration / 60)`

### `getExerciseEntriesByDate` (Query)

Gets all exercises for a specific date.

**Args:**
```typescript
{
  userId: Id<"users">;
  date: string;
}
```

**Returns:** `ExerciseEntry[]`

### `getTotalCaloriesBurned` (Query)

Calculates total calories burned for a date.

**Args:**
```typescript
{
  userId: Id<"users">;
  date: string;
}
```

**Returns:** `number`

### `getWeeklyExerciseStats` (Query)

Gets exercise statistics for a week.

**Args:**
```typescript
{
  userId: Id<"users">;
  startDate: string;
  endDate: string;
}
```

**Returns:**
```typescript
{
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  byType: Record<string, number>;
}
```

### `deleteExerciseEntry` (Mutation)

Deletes an exercise entry.

---

## Habits API (`convex/habits.ts`)

### `createHabit` (Mutation)

Creates a new habit.

**Args:**
```typescript
{
  userId: Id<"users">;
  name: string;
  icon: string;
  category: "physical" | "mental" | "routine";
  targetDaysPerWeek: number;
  reminderTime?: string; // HH:MM
}
```

**Returns:** `habitId`

### `completeHabit` (Mutation)

Marks a habit as completed for today.

**Args:**
```typescript
{
  habitId: Id<"habits">;
  date: string;
}
```

**Returns:**
```typescript
{
  newStreak: number;
  newLongestStreak: number;
}
```

### `resetDailyCompletion` (Mutation)

Resets daily completion status (called at start of new day).

**Args:**
```typescript
{
  userId: Id<"users">;
  currentDate: string;
}
```

### `getUserHabits` (Query)

Gets all active habits for a user.

**Args:**
```typescript
{
  userId: Id<"users">;
}
```

**Returns:** `Habit[]`

### `getHabitsByCategory` (Query)

Gets habits filtered by category.

**Args:**
```typescript
{
  userId: Id<"users">;
  category: "physical" | "mental" | "routine";
}
```

**Returns:** `Habit[]`

### `updateHabit` (Mutation)

Updates habit details.

### `deleteHabit` (Mutation)

Soft deletes a habit (sets `isActive: false`).

---

## Wellness API (`convex/wellness.ts`)

### `logMood` (Mutation)

Logs a mood entry (1-5 scale).

**Args:**
```typescript
{
  userId: Id<"users">;
  mood: 1 | 2 | 3 | 4 | 5;
  note?: string;
  tags?: string[];
  date: string;
}
```

**Returns:** `moodLogId`

**Mood Scale:**
- 1 = 😢 Terrible
- 2 = 😟 Bad
- 3 = 😐 Okay
- 4 = 🙂 Good
- 5 = 😄 Excellent

### `logSleep` (Mutation)

Logs a sleep entry.

**Args:**
```typescript
{
  userId: Id<"users">;
  hours: number;
  quality: number; // 0-100%
  bedTime?: string; // HH:MM
  wakeTime?: string; // HH:MM
  note?: string;
  factors?: string[]; // e.g., ["caffeine", "stress"]
  date: string;
}
```

**Returns:** `sleepLogId`

### `getMoodLogs` (Query)

Gets mood logs for a date range.

**Args:**
```typescript
{
  userId: Id<"users">;
  startDate: string;
  endDate: string;
}
```

**Returns:** `MoodLog[]`

### `getWeeklyMoodTrend` (Query)

Calculates weekly mood average and trend.

**Args:**
```typescript
{
  userId: Id<"users">;
  startDate: string;
  endDate: string;
}
```

**Returns:**
```typescript
{
  averageMood: number;
  trendEmoji: string;
  totalEntries: number;
}
```

### `getSleepLogs` (Query)

Gets sleep logs for a date range.

### `getWeeklySleepStats` (Query)

Calculates weekly sleep statistics.

**Returns:**
```typescript
{
  averageHours: number;
  averageQuality: number;
  totalNights: number;
}
```

### `deleteMoodLog` (Mutation)

Deletes a mood log.

### `deleteSleepLog` (Mutation)

Deletes a sleep log.

---

## Error Handling

All mutations throw errors with descriptive messages. Common errors:

- `"User not found"` - Invalid userId
- `"Habit already completed today"` - Duplicate completion
- `"Premium slot is only available for premium users"` - Premium required
- `"Invalid numeric input"` - Validation failed

Always wrap mutations in try-catch blocks:

```typescript
try {
  const result = await convex.mutation(api.food.logFoodEntry, args);
} catch (error) {
  console.error("Failed to log food:", error);
  // Show error to user
}
```

---

## Usage with React

### Using Queries

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function MyComponent() {
  const user = useQuery(api.users.getUserByClerkId, {
    clerkId: "user_123",
  });

  if (user === undefined) return <Loading />;
  if (user === null) return <NotFound />;

  return <div>{user.name}</div>;
}
```

### Using Mutations

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function MyComponent() {
  const logFood = useMutation(api.food.logFoodEntry);

  const handleSubmit = async () => {
    await logFood({
      userId: user._id,
      foodName: "Chicken Breast",
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      servingSize: "100g",
      mealType: "lunch",
      date: "2024-12-20",
    });
  };

  return <button onClick={handleSubmit}>Log Food</button>;
}
```
