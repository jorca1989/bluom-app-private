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
    exerciseTypes?: string[];
    instructions?: string[];
    instructionsLocalizations?: Record<string, string[]>;
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
    videoUrl?: string;
    primaryMuscle: string;
    secondaryMuscles?: string[];
    equipment: string;
    sets: number;
    reps: string;
    exerciseType?: string;
    exerciseTypes?: string[];
    instructions?: string[];
    instructionsLocalizations?: Record<string, string[]>;
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
  userSex: string = 'male',
  t?: (key: string, defaultText: string) => string
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
        type: ex.exerciseType ?? ex.exerciseTypes?.[0] ?? workout.category ?? 'strength',
        exerciseType: ex.exerciseType,
        exerciseTypes: ex.exerciseTypes,
        primaryMuscle: ex.primaryMuscles?.[0] ?? primaryMuscleFallback,
        secondaryMuscles: ex.secondaryMuscles ?? [],
        equipment: workout.equipment?.[0] ?? 'Various',
        sets: typeof ex.sets === 'number' ? ex.sets : 3,
        reps: ex.reps !== undefined ? String(ex.reps) : '10',
        instructions: ex.instructions ?? [],
        instructionsLocalizations: ex.instructionsLocalizations,
      });
    }
  }

  if (allExercises.length === 0) return [];

  // 2. Classify exercises into broad categories
  const upperBody = [];
  const lowerBody = [];
  const core = [];
  const fullBody = []; // anything else or mixed

  for (const ex of allExercises) {
    const muscles = [...(ex.primaryMuscle ? [ex.primaryMuscle] : []), ...(ex.secondaryMuscles || [])].map(m => m.toLowerCase());
    if (muscles.some(m => ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'pectoralis', 'latissimus', 'deltoids', 'trapezius', 'rhomboids', 'serratus'].some(t => m.includes(t)))) {
      upperBody.push(ex);
    } else if (muscles.some(m => ['quadriceps', 'hamstrings', 'glutes', 'calves', 'legs', 'adductors', 'abductors'].some(t => m.includes(t)))) {
      lowerBody.push(ex);
    } else if (muscles.some(m => ['core', 'abs', 'abdominis', 'obliques', 'pelvic'].some(t => m.includes(t)))) {
      core.push(ex);
    } else {
      fullBody.push(ex);
    }
  }

  // Shuffle array helper using a simple deterministic seed based on weekIndex
  const seededShuffle = (arr: any[], seed: number) => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const shuffledUpper = seededShuffle(upperBody, weekIndex + 1);
  const shuffledLower = seededShuffle(lowerBody, weekIndex + 2);
  const shuffledCore = seededShuffle(core, weekIndex + 3);
  const shuffledFull = seededShuffle(fullBody, weekIndex + 4);
  const shuffledAll = seededShuffle(allExercises, weekIndex + 5); // fallback pool

  const EXERCISES_PER_DAY = Math.min(4, allExercises.length);
  const days: RoutineDay[] = [];

  // Define ideal target for each day (e.g. Day 1: Upper, Day 2: Lower, Day 3: Core, Day 4: Full Body)
  const dayTargets = [
    { title: t ? t('move.upperBodyFocus', 'Upper Body Focus') : 'Upper Body Focus', pool: shuffledUpper },
    { title: t ? t('move.lowerBodyFocus', 'Lower Body Focus') : 'Lower Body Focus', pool: shuffledLower },
    { title: t ? t('move.coreFocus', 'Core & Mobility') : 'Core & Mobility', pool: shuffledCore },
    { title: t ? t('move.fullBodyFocus', 'Full Body / Mixed') : 'Full Body / Mixed', pool: shuffledFull },
  ];

  let allFallbackIndex = 0;

  // 3. Construct exactly `daysPerWeek` days
  for (let dayOffset = 0; dayOffset < daysPerWeek; dayOffset++) {
    const target = dayTargets[dayOffset % dayTargets.length];
    const dayExercises = [];
    
    // Attempt to pull EXERCISES_PER_DAY from the targeted pool
    for (let i = 0; i < EXERCISES_PER_DAY; i++) {
      if (target.pool.length > 0) {
        dayExercises.push(target.pool.pop());
      } else {
        // Fallback to the mixed pool of all exercises
        dayExercises.push(shuffledAll[allFallbackIndex % shuffledAll.length]);
        allFallbackIndex++;
      }
    }
    
    const muscles = [...new Set(dayExercises.map(e => e.primaryMuscle))];

    days.push({
      dayNum: dayOffset + 1,
      dayTitle: target.title,
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
  userSex: string = 'male',
  t?: (key: string, defaultText: string) => string
): RoutineDay[] {
  return buildPlanFromDBWorkouts(dbWorkouts, _weekIndex, daysPerWeek, userSex, t);
}
