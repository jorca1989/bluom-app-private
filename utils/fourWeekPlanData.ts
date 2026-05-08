// ─── SINGLE SOURCE OF TRUTH for the free 4-week plan ─────────────────────────
// All screens (FourWeekPlanScreen, WorkoutDayCards, WorkoutDetailModal) import
// this so day names, exercises and counts are always in sync.

export interface PlanExercise {
    id: string;
    name: string;
    sets: number;
    reps: string;
    equipment: string;
    primaryMuscle: string;
    thumbnailUrl: string;
}

export interface PlanDay {
    dayNum: number;
    dayTitle: string;           // e.g. "Full Body Strength"
    muscleGroups: string;       // subtitle shown under day title
    focus: string[];            // bullet points shown on the week card
    exercises: PlanExercise[];
}

export interface PlanWeek {
    weekNum: number;
    theme: string;              // e.g. "Foundation"
    color: string;
    focus: string[];
    days: PlanDay[];
}

// ─── Default thumbnail (used when no GIF available) ───────────────────────────
const THUMB = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200';
const THUMB2 = 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=200';
const THUMB3 = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=200';
const THUMB4 = 'https://images.unsplash.com/photo-1574681533083-bf41eb47b2c0?auto=format&fit=crop&q=80&w=200';

// ─── THE PLAN ─────────────────────────────────────────────────────────────────
export const FREE_4_WEEK_PLAN: PlanWeek[] = [
    {
        weekNum: 1,
        theme: 'Foundation',
        color: '#1e293b',
        focus: ['Full body', 'Form-first', 'Habit building'],
        days: [
            {
                dayNum: 1,
                dayTitle: 'Full Body Strength',
                muscleGroups: 'Squat pattern, Push, Pull, Core',
                focus: ['Squat pattern', 'Push', 'Pull', 'Core'],
                exercises: [
                    { id: 'w1d1e1', name: 'Squats', sets: 3, reps: '10', equipment: 'Varies', primaryMuscle: 'Legs', thumbnailUrl: THUMB4 },
                    { id: 'w1d1e2', name: 'Push-ups', sets: 3, reps: '10', equipment: 'Bodyweight', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                    { id: 'w1d1e3', name: 'Dumbbell Rows', sets: 3, reps: '10', equipment: 'Dumbbells', primaryMuscle: 'Back', thumbnailUrl: THUMB },
                    { id: 'w1d1e4', name: 'Plank', sets: 3, reps: '30s', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB3 },
                ],
            },
            {
                dayNum: 2,
                dayTitle: 'Zone 2 Cardio',
                muscleGroups: 'Walk / cycle, Mobility finisher',
                focus: ['Walk / cycle', 'Mobility finisher'],
                exercises: [
                    { id: 'w1d2e1', name: 'Brisk Walk / Easy Cycle', sets: 1, reps: '30 min', equipment: 'None', primaryMuscle: 'Cardio', thumbnailUrl: THUMB3 },
                    { id: 'w1d2e2', name: 'Hip Flexor Stretch', sets: 2, reps: '30s each', equipment: 'None', primaryMuscle: 'Mobility', thumbnailUrl: THUMB },
                    { id: 'w1d2e3', name: 'Cat-Cow', sets: 2, reps: '10', equipment: 'None', primaryMuscle: 'Spine', thumbnailUrl: THUMB2 },
                ],
            },
            {
                dayNum: 3,
                dayTitle: 'Full Body Strength',
                muscleGroups: 'Hinge pattern, Push, Pull, Core',
                focus: ['Hinge pattern', 'Push', 'Pull', 'Core'],
                exercises: [
                    { id: 'w1d3e1', name: 'Romanian Deadlift', sets: 3, reps: '10', equipment: 'Dumbbells', primaryMuscle: 'Hamstrings', thumbnailUrl: THUMB4 },
                    { id: 'w1d3e2', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', equipment: 'Dumbbells', primaryMuscle: 'Shoulders', thumbnailUrl: THUMB2 },
                    { id: 'w1d3e3', name: 'Lat Pulldown / Band Pull', sets: 3, reps: '10', equipment: 'Varies', primaryMuscle: 'Back', thumbnailUrl: THUMB },
                    { id: 'w1d3e4', name: 'Dead Bug', sets: 3, reps: '8 each', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB3 },
                ],
            },
            {
                dayNum: 4,
                dayTitle: 'Recovery',
                muscleGroups: 'Stretching, Easy walk',
                focus: ['Stretching', 'Easy walk'],
                exercises: [
                    { id: 'w1d4e1', name: 'Easy Walk', sets: 1, reps: '20 min', equipment: 'None', primaryMuscle: 'Cardio', thumbnailUrl: THUMB3 },
                    { id: 'w1d4e2', name: 'Full Body Stretch', sets: 1, reps: '10 min', equipment: 'None', primaryMuscle: 'Flexibility', thumbnailUrl: THUMB },
                    { id: 'w1d4e3', name: 'Foam Roll', sets: 1, reps: '5 min', equipment: 'Foam roller', primaryMuscle: 'Recovery', thumbnailUrl: THUMB2 },
                ],
            },
        ],
    },
    {
        weekNum: 2,
        theme: 'Strength',
        color: '#4c1d95',
        focus: ['Progressive overload', 'Core stability', 'Consistency'],
        days: [
            {
                dayNum: 1,
                dayTitle: 'Upper Body Push',
                muscleGroups: 'Chest, Shoulders, Triceps',
                focus: ['Chest', 'Shoulders', 'Triceps'],
                exercises: [
                    { id: 'w2d1e1', name: 'Barbell / DB Bench Press', sets: 4, reps: '8', equipment: 'Dumbbells', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                    { id: 'w2d1e2', name: 'Incline Push-up', sets: 3, reps: '12', equipment: 'Bodyweight', primaryMuscle: 'Chest', thumbnailUrl: THUMB },
                    { id: 'w2d1e3', name: 'Lateral Raise', sets: 3, reps: '12', equipment: 'Dumbbells', primaryMuscle: 'Shoulders', thumbnailUrl: THUMB3 },
                    { id: 'w2d1e4', name: 'Tricep Dip', sets: 3, reps: '10', equipment: 'Bodyweight', primaryMuscle: 'Triceps', thumbnailUrl: THUMB4 },
                ],
            },
            {
                dayNum: 2,
                dayTitle: 'Lower Body',
                muscleGroups: 'Quads, Hamstrings, Glutes, Calves',
                focus: ['Quads', 'Hamstrings', 'Glutes'],
                exercises: [
                    { id: 'w2d2e1', name: 'Goblet Squat', sets: 4, reps: '10', equipment: 'Dumbbell', primaryMuscle: 'Quads', thumbnailUrl: THUMB4 },
                    { id: 'w2d2e2', name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', equipment: 'Dumbbells', primaryMuscle: 'Glutes', thumbnailUrl: THUMB },
                    { id: 'w2d2e3', name: 'Hip Thrust', sets: 3, reps: '12', equipment: 'Varies', primaryMuscle: 'Glutes', thumbnailUrl: THUMB2 },
                    { id: 'w2d2e4', name: 'Calf Raise', sets: 4, reps: '15', equipment: 'Bodyweight', primaryMuscle: 'Calves', thumbnailUrl: THUMB3 },
                ],
            },
            {
                dayNum: 3,
                dayTitle: 'Upper Body Pull',
                muscleGroups: 'Back, Biceps, Rear Delts',
                focus: ['Back', 'Biceps', 'Rear Delts'],
                exercises: [
                    { id: 'w2d3e1', name: 'Pull-up / Assisted', sets: 3, reps: '6-8', equipment: 'Pull-up bar', primaryMuscle: 'Back', thumbnailUrl: THUMB },
                    { id: 'w2d3e2', name: 'Bent-over Row', sets: 4, reps: '8', equipment: 'Dumbbells', primaryMuscle: 'Back', thumbnailUrl: THUMB2 },
                    { id: 'w2d3e3', name: 'Bicep Curl', sets: 3, reps: '10', equipment: 'Dumbbells', primaryMuscle: 'Biceps', thumbnailUrl: THUMB3 },
                    { id: 'w2d3e4', name: 'Face Pull / Band', sets: 3, reps: '12', equipment: 'Band', primaryMuscle: 'Rear Delts', thumbnailUrl: THUMB4 },
                ],
            },
            {
                dayNum: 4,
                dayTitle: 'Core Stability',
                muscleGroups: 'Abs, Obliques, Lower Back',
                focus: ['Abs', 'Obliques', 'Lower Back'],
                exercises: [
                    { id: 'w2d4e1', name: 'Plank', sets: 3, reps: '45s', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB3 },
                    { id: 'w2d4e2', name: 'Russian Twist', sets: 3, reps: '20', equipment: 'Bodyweight', primaryMuscle: 'Obliques', thumbnailUrl: THUMB },
                    { id: 'w2d4e3', name: 'Bird Dog', sets: 3, reps: '10 each', equipment: 'Bodyweight', primaryMuscle: 'Lower Back', thumbnailUrl: THUMB2 },
                    { id: 'w2d4e4', name: 'Hollow Body Hold', sets: 3, reps: '20s', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB4 },
                ],
            },
        ],
    },
    {
        weekNum: 3,
        theme: 'Conditioning',
        color: '#065f46',
        focus: ['Cardio intervals', 'Endurance', 'Recovery'],
        days: [
            {
                dayNum: 1,
                dayTitle: 'HIIT Circuit',
                muscleGroups: 'Full body, Cardio',
                focus: ['Full body', 'Cardio', 'Power'],
                exercises: [
                    { id: 'w3d1e1', name: 'Burpees', sets: 4, reps: '10', equipment: 'Bodyweight', primaryMuscle: 'Full Body', thumbnailUrl: THUMB3 },
                    { id: 'w3d1e2', name: 'Jump Squat', sets: 4, reps: '12', equipment: 'Bodyweight', primaryMuscle: 'Legs', thumbnailUrl: THUMB4 },
                    { id: 'w3d1e3', name: 'Mountain Climbers', sets: 4, reps: '20', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB },
                    { id: 'w3d1e4', name: 'High Knees', sets: 4, reps: '30s', equipment: 'Bodyweight', primaryMuscle: 'Cardio', thumbnailUrl: THUMB2 },
                ],
            },
            {
                dayNum: 2,
                dayTitle: 'Strength Endurance',
                muscleGroups: 'Upper body, Higher reps',
                focus: ['Upper body', 'Higher reps'],
                exercises: [
                    { id: 'w3d2e1', name: 'Push-up Variations', sets: 4, reps: '15', equipment: 'Bodyweight', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                    { id: 'w3d2e2', name: 'Dumbbell Row', sets: 4, reps: '15', equipment: 'Dumbbells', primaryMuscle: 'Back', thumbnailUrl: THUMB },
                    { id: 'w3d2e3', name: 'Arnold Press', sets: 3, reps: '12', equipment: 'Dumbbells', primaryMuscle: 'Shoulders', thumbnailUrl: THUMB3 },
                    { id: 'w3d2e4', name: 'Hammer Curl', sets: 3, reps: '12', equipment: 'Dumbbells', primaryMuscle: 'Biceps', thumbnailUrl: THUMB4 },
                ],
            },
            {
                dayNum: 3,
                dayTitle: 'Zone 2 + Mobility',
                muscleGroups: 'Cardio, Flexibility',
                focus: ['Zone 2 cardio', 'Mobility'],
                exercises: [
                    { id: 'w3d3e1', name: 'Steady State Jog / Cycle', sets: 1, reps: '30 min', equipment: 'None', primaryMuscle: 'Cardio', thumbnailUrl: THUMB3 },
                    { id: 'w3d3e2', name: 'World\'s Greatest Stretch', sets: 2, reps: '5 each', equipment: 'None', primaryMuscle: 'Mobility', thumbnailUrl: THUMB },
                    { id: 'w3d3e3', name: 'Pigeon Pose', sets: 2, reps: '30s each', equipment: 'None', primaryMuscle: 'Hips', thumbnailUrl: THUMB2 },
                ],
            },
            {
                dayNum: 4,
                dayTitle: 'Lower Body Endurance',
                muscleGroups: 'Legs, Glutes, Higher reps',
                focus: ['Legs', 'Glutes', 'Endurance'],
                exercises: [
                    { id: 'w3d4e1', name: 'Walking Lunges', sets: 4, reps: '20', equipment: 'Bodyweight', primaryMuscle: 'Legs', thumbnailUrl: THUMB4 },
                    { id: 'w3d4e2', name: 'Step-up', sets: 3, reps: '12 each', equipment: 'Box/Step', primaryMuscle: 'Glutes', thumbnailUrl: THUMB },
                    { id: 'w3d4e3', name: 'Sumo Squat', sets: 3, reps: '15', equipment: 'Dumbbell', primaryMuscle: 'Inner Thighs', thumbnailUrl: THUMB3 },
                    { id: 'w3d4e4', name: 'Single-leg Calf Raise', sets: 3, reps: '15 each', equipment: 'Bodyweight', primaryMuscle: 'Calves', thumbnailUrl: THUMB2 },
                ],
            },
        ],
    },
    {
        weekNum: 4,
        theme: 'Performance',
        color: '#92400e',
        focus: ['Intensity', 'Mobility', 'Deload option'],
        days: [
            {
                dayNum: 1,
                dayTitle: 'Heavy Compound Day',
                muscleGroups: 'Full body, Maximum effort',
                focus: ['Full body', 'Max effort'],
                exercises: [
                    { id: 'w4d1e1', name: 'Deadlift', sets: 4, reps: '5', equipment: 'Barbell / DB', primaryMuscle: 'Full Body', thumbnailUrl: THUMB4 },
                    { id: 'w4d1e2', name: 'Bench Press', sets: 4, reps: '5', equipment: 'Barbell / DB', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                    { id: 'w4d1e3', name: 'Barbell Row', sets: 4, reps: '5', equipment: 'Barbell / DB', primaryMuscle: 'Back', thumbnailUrl: THUMB },
                    { id: 'w4d1e4', name: 'Overhead Press', sets: 3, reps: '6', equipment: 'Barbell / DB', primaryMuscle: 'Shoulders', thumbnailUrl: THUMB3 },
                ],
            },
            {
                dayNum: 2,
                dayTitle: 'Power & Agility',
                muscleGroups: 'Explosive movement, Speed',
                focus: ['Explosive', 'Speed', 'Power'],
                exercises: [
                    { id: 'w4d2e1', name: 'Box Jump', sets: 4, reps: '6', equipment: 'Box', primaryMuscle: 'Legs', thumbnailUrl: THUMB4 },
                    { id: 'w4d2e2', name: 'Medicine Ball Slam', sets: 3, reps: '10', equipment: 'Med Ball', primaryMuscle: 'Full Body', thumbnailUrl: THUMB3 },
                    { id: 'w4d2e3', name: 'Sprint Intervals', sets: 6, reps: '20s on / 40s off', equipment: 'None', primaryMuscle: 'Cardio', thumbnailUrl: THUMB },
                    { id: 'w4d2e4', name: 'Plyo Push-up', sets: 3, reps: '8', equipment: 'Bodyweight', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                ],
            },
            {
                dayNum: 3,
                dayTitle: 'Mobility & Deload',
                muscleGroups: 'Flexibility, Recovery',
                focus: ['Mobility', 'Deload'],
                exercises: [
                    { id: 'w4d3e1', name: 'Yoga Flow', sets: 1, reps: '20 min', equipment: 'None', primaryMuscle: 'Full Body', thumbnailUrl: THUMB3 },
                    { id: 'w4d3e2', name: 'Thoracic Rotation', sets: 2, reps: '10 each', equipment: 'None', primaryMuscle: 'Upper Back', thumbnailUrl: THUMB },
                    { id: 'w4d3e3', name: 'Hip 90/90 Stretch', sets: 2, reps: '30s each', equipment: 'None', primaryMuscle: 'Hips', thumbnailUrl: THUMB2 },
                ],
            },
            {
                dayNum: 4,
                dayTitle: 'Final Test Day',
                muscleGroups: 'Full body, Progress check',
                focus: ['Intensity', 'Progress check'],
                exercises: [
                    { id: 'w4d4e1', name: 'Max Push-ups', sets: 1, reps: 'Max', equipment: 'Bodyweight', primaryMuscle: 'Chest', thumbnailUrl: THUMB2 },
                    { id: 'w4d4e2', name: 'Max Squats in 2 min', sets: 1, reps: 'Max', equipment: 'Bodyweight', primaryMuscle: 'Legs', thumbnailUrl: THUMB4 },
                    { id: 'w4d4e3', name: 'Plank Hold', sets: 1, reps: 'Max', equipment: 'Bodyweight', primaryMuscle: 'Core', thumbnailUrl: THUMB3 },
                    { id: 'w4d4e4', name: '1km Time Trial', sets: 1, reps: '1 km', equipment: 'None', primaryMuscle: 'Cardio', thumbnailUrl: THUMB },
                ],
            },
        ],
    },
];

// Helper: flatten all days of a specific week into RoutineDay[] format for WorkoutDetailModal
export function getWeekRoutineDays(weekIndex: number) {
    const week = FREE_4_WEEK_PLAN[weekIndex] ?? FREE_4_WEEK_PLAN[0];
    return week.days.map(day => ({
        dayNum: day.dayNum,
        dayTitle: day.dayTitle,
        muscleGroups: day.muscleGroups,
        exercises: day.exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            thumbnailUrl: ex.thumbnailUrl,
            primaryMuscle: ex.primaryMuscle,
            equipment: ex.equipment,
            sets: ex.sets,
            reps: ex.reps,
        })),
    }));
}

// Helper: get WorkoutDayCard props for a specific day
export function getDayCardProps(weekIndex: number, dayIndex: number) {
    const week = FREE_4_WEEK_PLAN[weekIndex] ?? FREE_4_WEEK_PLAN[0];
    const day = week.days[dayIndex] ?? week.days[0];
    return {
        dayTitle: day.dayTitle,
        muscleGroups: day.muscleGroups,
        exercises: day.exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            thumbnailUrl: ex.thumbnailUrl,
        })),
    };
}