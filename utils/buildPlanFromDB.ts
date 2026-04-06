/**
 * buildPlanFromDB.ts
 *
 * Maps DB videoWorkouts (from api.videoWorkouts.list) into the RoutineDay[]
 * format used by WorkoutDetailModal and WorkoutDayCard.
 *
 * Each DB workout doc becomes one "day" in the plan. This means the plan
 * length = however many workouts are in the DB.
 * For the four-week view (four-week-plan.tsx) the same weeks are repeated
 * with DB workout exercises distributed across the 4 weeks.
 */

export interface DBWorkoutDoc {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailMale?: string;
  thumbnailFemale?: string;
  videoUrl?: string;
  videoUrlMale?: string;
  videoUrlFemale?: string;
  category: string;
  muscleGroupTags?: string[];
  equipment: string[];
  difficulty: string;
  duration: number;
  calories: number;
  exercises: Array<{
    name: string;
    duration: number;
    reps?: number;
    sets?: number;
    description: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    exerciseType?: string;
    instructions?: string[];
  }>;
}

export interface RoutineDay {
  dayNum: number;
  dayTitle: string;
  muscleGroups: string;
  exercises: Array<{
    id: string;
    name: string;
    thumbnailUrl: string;
    primaryMuscle: string;
    secondaryMuscles?: string[];
    equipment: string;
    sets: number;
    reps: string;
    instructions?: string[];
  }>;
}

/**
 * Build a routine-day array from DB workouts for the Move tab swipable.
 * Each videoWorkout doc → one day card. Exercises inside each doc are
 * shown in that day's WorkoutDayCard thumbnail strip.
 *
 * @param dbWorkouts  Result of api.videoWorkouts.list
 * @param weekIndex   0-3 (used if we want week-specific filtering in future)
 */
export function buildPlanFromDBWorkouts(
  dbWorkouts: DBWorkoutDoc[],
  weekIndex = 0,
  daysPerWeek = 4,
  userSex: string = 'male'
): RoutineDay[] {
  if (!dbWorkouts || dbWorkouts.length === 0) return [];

  // 1. Flatten all exercises from all DB workouts
  const allExercises: any[] = [];
  for (const workout of dbWorkouts) {
    const primaryMuscleFallback =
      workout.muscleGroupTags?.[0] ?? workout.category ?? 'Full Body';
      
    // Determine the video/thumbnail based on userSex
    let resolvedVideo = workout.videoUrl;
    let resolvedThumb = workout.thumbnail;
    
    // The schema fields are currently on the workout level
    if (userSex === 'female') {
      if (workout.videoUrlFemale) resolvedVideo = workout.videoUrlFemale;
      if (workout.thumbnailFemale) resolvedThumb = workout.thumbnailFemale;
    } else {
      if (workout.videoUrlMale) resolvedVideo = workout.videoUrlMale;
      if (workout.thumbnailMale) resolvedThumb = workout.thumbnailMale;
    }

    // Additional fallback
    if (!resolvedVideo && workout.videoUrl) resolvedVideo = workout.videoUrl;
    if (!resolvedThumb && workout.thumbnail) resolvedThumb = workout.thumbnail;

    for (let exIdx = 0; exIdx < workout.exercises.length; exIdx++) {
      const ex = workout.exercises[exIdx];
      // Note: If exercises also eventually have their own video variants,
      // you could apply similar logic here. We use the workout's resolved media.
      allExercises.push({
        id: `${workout._id}-ex-${exIdx}`,
        name: ex.name,
        thumbnailUrl: resolvedThumb,
        videoUrl: resolvedVideo,
        category: workout.category ?? primaryMuscleFallback,
        type: workout.category ?? 'strength',
        primaryMuscle: ex.primaryMuscles?.[0] ?? primaryMuscleFallback,
        secondaryMuscles: ex.secondaryMuscles ?? [],
        equipment: workout.equipment?.[0] ?? 'Various',
        sets: typeof ex.sets === 'number' ? ex.sets : 3,
        reps: ex.reps !== undefined ? String(ex.reps) : '10',
        instructions: ex.instructions ?? [],
      });
    }
  }

  if (allExercises.length === 0) return [];

  // 2. Group into proper days (e.g., 4 exercises per day)
  const EXERCISES_PER_DAY = Math.min(4, allExercises.length);
  const days: RoutineDay[] = [];

  // To allow for seamless cycling if there are fewer exercises than required for the week:
  let exerciseIndex = (weekIndex * daysPerWeek * EXERCISES_PER_DAY) % allExercises.length;

  // 3. Construct exactly `daysPerWeek` days so the UI isn't flooded with 20+ tabs
  for (let dayOffset = 0; dayOffset < daysPerWeek; dayOffset++) {
    const dayExercises = [];
    for (let i = 0; i < EXERCISES_PER_DAY; i++) {
        dayExercises.push(allExercises[exerciseIndex]);
        exerciseIndex = (exerciseIndex + 1) % allExercises.length;
    }
    
    // Group day title by primary muscles
    const muscles = [...new Set(dayExercises.map(e => e.primaryMuscle))];
    const dayTitle = muscles.length <= 2 
      ? muscles.join(' & ') + ' Focus' 
      : 'Full Body Workout';

    days.push({
      dayNum: dayOffset + 1,
      dayTitle,
      muscleGroups: muscles.slice(0, 3).join(', '),
      exercises: dayExercises
    });
  }

  return days;
}

/**
 * Build a 4-week plan from DB workouts.
 */
export function buildWeekFromDBWorkouts(
  dbWorkouts: DBWorkoutDoc[],
  _weekIndex = 0,
  daysPerWeek = 4,
  userSex: string = 'male'
): RoutineDay[] {
  return buildPlanFromDBWorkouts(dbWorkouts, _weekIndex, daysPerWeek, userSex);
}
