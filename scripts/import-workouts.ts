import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'fs';
import path from 'path';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// ─── CLI Args & Help ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isDryRun = args.includes('--dry-run');
const isSyncLibrary = args.includes('--sync-library');

if (isHelp) {
    console.log(`
Bluom Bulk Workout Importer
===========================
Usage:
  npx tsx scripts/import-workouts.ts [path-to-file.json] [options]

Options:
  --dry-run         Validate and parse records without writing to Convex
  --sync-library    Also sync extracted exercises into exerciseLibrary table
  --help, -h        Show this help message

Default input file if omitted: scripts/data/workouts.json

Required Environment Variables (in .env.local or environment):
  - NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL)
  - ADMIN_SCRIPT_KEY
`);
    process.exit(0);
}

// Find input file from arguments
const filePathArg = args.find(a => !a.startsWith('--'));
const defaultPath = path.join(process.cwd(), 'scripts', 'data', 'workouts.json');
const resolvedFilePath = filePathArg ? path.resolve(process.cwd(), filePathArg) : defaultPath;

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const ADMIN_SCRIPT_KEY = process.env.ADMIN_SCRIPT_KEY;

console.log("\n🏋️ Bluom Workout & Exercise Bulk Importer");
console.log("=========================================");
console.log(`📂 Target file: ${resolvedFilePath}`);
console.log(`🔎 Mode:        ${isDryRun ? "DRY RUN (No database writes)" : "LIVE (Writing to Convex)"}`);
console.log(`🔗 Convex URL:  ${CONVEX_URL ? CONVEX_URL : "❌ Missing"}`);
console.log(`🔑 Script Key:  ${ADMIN_SCRIPT_KEY ? "Loaded" : "❌ Missing"}`);

if (!isDryRun) {
    if (!CONVEX_URL) {
        console.error("\n❌ Error: Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.");
        process.exit(1);
    }
    if (!ADMIN_SCRIPT_KEY) {
        console.error("\n❌ Error: Missing ADMIN_SCRIPT_KEY in .env.local or environment.");
        console.error("Set it locally in .env.local and on Convex with: npx convex env set ADMIN_SCRIPT_KEY <your-key>");
        process.exit(1);
    }
}

if (!fs.existsSync(resolvedFilePath)) {
    console.error(`\n❌ Error: Input file not found at: ${resolvedFilePath}`);
    console.error("Tip: Provide a JSON file path or place your file at scripts/data/workouts.json");
    console.error("Example template available at: scripts/data/workouts.example.json\n");
    process.exit(1);
}

// ─── Read and Parse JSON ────────────────────────────────────────────────────
let rawData: any;
try {
    const fileContent = fs.readFileSync(resolvedFilePath, 'utf-8');
    rawData = JSON.parse(fileContent);
} catch (e: any) {
    console.error(`\n❌ Failed to read or parse JSON file: ${e.message}`);
    process.exit(1);
}

const workoutList: any[] = Array.isArray(rawData) ? rawData : (rawData.workouts || rawData.exercises || []);

if (!Array.isArray(workoutList) || workoutList.length === 0) {
    console.error("\n❌ Error: JSON file does not contain an array of workout items.");
    process.exit(1);
}

console.log(`\n📋 Found ${workoutList.length} items to process.\n`);

const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;

// Helper to clean array of strings
function cleanStringList(input: any): string[] {
    if (Array.isArray(input)) {
        return input.map(s => String(s).trim()).filter(Boolean);
    }
    if (typeof input === 'string') {
        return input.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
}

// Helper to normalize difficulty
function normalizeDifficulty(input: any): 'Beginner' | 'Intermediate' | 'Advanced' {
    const s = String(input || '').toLowerCase();
    if (s.includes('adv')) return 'Advanced';
    if (s.includes('int')) return 'Intermediate';
    return 'Beginner';
}

async function run() {
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const libraryExercisesToSync: any[] = [];

    for (let i = 0; i < workoutList.length; i++) {
        const item = workoutList[i];
        const title = item.title || item.name || `Exercise ${i + 1}`;

        try {
            const muscleGroupTags = cleanStringList(item.muscleGroupTags || item.muscleGroups || item.primaryMuscles);
            const category = item.category || muscleGroupTags[0] || 'Strength';
            const categories = cleanStringList(item.categories || [category]);
            const equipment = cleanStringList(item.equipment || []);
            const optionalEquipment = cleanStringList(item.optionalEquipment || []);
            const difficulty = normalizeDifficulty(item.difficulty);

            const payload: any = {
                scriptKey: ADMIN_SCRIPT_KEY || 'dry-run-key',
                title: String(title).trim(),
                description: item.description ? String(item.description).trim() : title,
                titleLocalizations: item.titleLocalizations || undefined,
                descriptionLocalizations: item.descriptionLocalizations || undefined,
                thumbnail: item.thumbnail || item.thumbnailMale || item.thumbnailFemale || item.videoUrl || '',
                thumbnailMale: item.thumbnailMale || undefined,
                thumbnailFemale: item.thumbnailFemale || undefined,
                videoUrl: item.videoUrl || undefined,
                videoUrlMale: item.videoUrlMale || undefined,
                videoUrlFemale: item.videoUrlFemale || undefined,
                duration: typeof item.duration === 'number' ? item.duration : (Number(item.duration) || 0),
                calories: typeof item.calories === 'number' ? item.calories : (Number(item.calories) || 0),
                difficulty,
                category,
                categories: categories.length > 0 ? categories : [category],
                muscleGroupTags,
                equipment,
                optionalEquipment: optionalEquipment.length > 0 ? optionalEquipment : undefined,
                instructor: item.instructor || 'Bluom Coach',
                isPremium: item.isPremium !== undefined ? Boolean(item.isPremium) : true,
            };

            // Process nested exercises if present
            if (Array.isArray(item.exercises) && item.exercises.length > 0) {
                payload.exercises = item.exercises.map((ex: any) => ({
                    name: String(ex.name || title).trim(),
                    duration: typeof ex.duration === 'number' ? ex.duration : (Number(ex.duration) || 0),
                    reps: ex.reps !== undefined ? Number(ex.reps) : undefined,
                    sets: ex.sets !== undefined ? Number(ex.sets) : undefined,
                    description: ex.description ? String(ex.description) : title,
                    instructions: ex.instructions ? cleanStringList(ex.instructions) : undefined,
                    instructionsLocalizations: ex.instructionsLocalizations || undefined,
                    primaryMuscles: ex.primaryMuscles ? cleanStringList(ex.primaryMuscles) : (muscleGroupTags.length > 0 ? muscleGroupTags : undefined),
                    primaryMusclesLocalizations: ex.primaryMusclesLocalizations || undefined,
                    secondaryMuscles: ex.secondaryMuscles ? cleanStringList(ex.secondaryMuscles) : undefined,
                    secondaryMusclesLocalizations: ex.secondaryMusclesLocalizations || undefined,
                    exerciseType: ex.exerciseType || category,
                    exerciseTypes: ex.exerciseTypes ? cleanStringList(ex.exerciseTypes) : [category],
                }));
            }

            if (isDryRun) {
                console.log(`[DRY RUN] [${i + 1}/${workoutList.length}] Validated: "${title}" (Category: ${category}, Difficulty: ${difficulty})`);
                if (payload.videoUrlMale || payload.videoUrlFemale) {
                    console.log(`          Gender videos: Male=${payload.videoUrlMale ? '✓' : '-'}, Female=${payload.videoUrlFemale ? '✓' : '-'}`);
                }
                createdCount++;
            } else {
                const res = await convex!.mutation(api.videoWorkouts.upsertWorkoutViaScript, payload);
                if (res.action === 'created') {
                    createdCount++;
                    console.log(`✅ [${i + 1}/${workoutList.length}] Created: "${title}" (${res.id})`);
                } else {
                    updatedCount++;
                    console.log(`🔄 [${i + 1}/${workoutList.length}] Updated: "${title}" (${res.id})`);
                }
            }

            // Collect for exerciseLibrary sync if requested
            if (isSyncLibrary) {
                libraryExercisesToSync.push({
                    name: {
                        en: title,
                        ...(item.titleLocalizations || {}),
                    },
                    category,
                    categories,
                    met: item.met || 6.0,
                    caloriesPerMinute: item.caloriesPerMinute || (item.calories ? Math.round(item.calories / Math.max(1, item.duration)) : 6),
                    muscleGroups: muscleGroupTags,
                    thumbnailUrl: payload.thumbnail,
                    videoUrl: payload.videoUrl || payload.videoUrlMale || payload.videoUrlFemale,
                });
            }

        } catch (err: any) {
            errorCount++;
            console.error(`❌ [${i + 1}/${workoutList.length}] Failed on "${title}":`, err.message);
        }
    }

    // Sync to exerciseLibrary if requested
    if (isSyncLibrary && libraryExercisesToSync.length > 0) {
        console.log(`\n📚 Syncing ${libraryExercisesToSync.length} exercises into exerciseLibrary...`);
        if (isDryRun) {
            console.log(`[DRY RUN] Would bulk-insert/upsert ${libraryExercisesToSync.length} items to exerciseLibrary.`);
        } else {
            try {
                const libRes = await convex!.mutation(api.exercises.bulkInsertExercisesViaScript, {
                    scriptKey: ADMIN_SCRIPT_KEY!,
                    exercises: libraryExercisesToSync,
                });
                console.log(`✅ exerciseLibrary sync complete: ${libRes.inserted} inserted, ${libRes.updated} updated.`);
            } catch (libErr: any) {
                console.error(`❌ exerciseLibrary sync failed:`, libErr.message);
            }
        }
    }

    console.log("\n=========================================");
    console.log("🎉 Workout Import Summary:");
    console.log(`   Total Processed: ${workoutList.length}`);
    console.log(`   Created:         ${createdCount}`);
    console.log(`   Updated:         ${updatedCount}`);
    console.log(`   Errors:          ${errorCount}`);
    console.log("=========================================\n");
}

run().catch(err => {
    console.error("Fatal script error:", err);
    process.exit(1);
});
