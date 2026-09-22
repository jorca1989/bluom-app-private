/**
 * Bluom — Fully Automated Exercise Importer
 * ==========================================
 * Run this against a dedicated folder containing only exercise video/photo files.
 * It does everything end to end:
 *
 *   1. Scans Downloads for exercise file groups ("<Name>.mp4", "<Name>_Female.mp4",
 *      "<Name>.jpg", "<Name>_Female.jpg", etc.)
 *   2. Skips anything already imported (tracked in scripts/data/exercise-import-manifest.json)
 *   3. Flags ambiguous duplicates ("<Name> (1).mp4") instead of guessing which one is right
 *   4. Generates a thumbnail from the video automatically if no photo was provided
 *   5. Uploads every file to the bluomworkouts R2 bucket
 *   6. Asks DeepSeek to classify the exercise properly — category, PRIMARY + SECONDARY
 *      muscle groups, equipment, exercise type, difficulty — and to localize the title,
 *      description, and instructions into all 15 admin languages
 *   7. Writes the workout into Convex via upsertWorkoutViaScript
 *   8. Records everything in the manifest and preserves source files by default
 *
 * Usage:
 *   npx tsx scripts/auto-import-exercises.ts --source "D:\Exercises" --list     # see what's pending vs done, no changes
 *   npx tsx scripts/auto-import-exercises.ts --source "D:\Exercises" --dry-run  # simulate a full run, no writes/uploads/deletes
 *   npx tsx scripts/auto-import-exercises.ts --source "D:\Exercises"            # do it for real
 *   npx tsx scripts/auto-import-exercises.ts --delete-source-files   # explicitly remove source files after import
 *
 * One-time setup:
 *   npm install @aws-sdk/client-s3
 *   (ffmpeg is optional — only needed for auto-generating a thumbnail when a photo is
 *    missing. Install it with `winget install ffmpeg` if you want that. Without it, the
 *    script just imports without a thumbnail for that side, same as before.)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
// @ts-ignore
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// ─── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isDryRun = args.includes('--dry-run');
const isList = args.includes('--list');
// Preserve source media by default. This importer touches a large Downloads folder, so
// source deletion must always be an explicit opt-in rather than a surprise side effect.
const deleteSourceFiles = args.includes('--delete-source-files');
const sourceIdx = args.indexOf('--source');
const SOURCE_DIR = sourceIdx >= 0 ? args[sourceIdx + 1] : undefined;

if (isHelp) {
    console.log(`
Bluom Automated Exercise Importer
==================================
  --list             Show what's pending vs already imported. No changes.
  --dry-run          Simulate a full run (classification, grouping) without uploading,
                      writing to Convex, or deleting anything.
  --source <path>    Required dedicated folder containing only exercise media.
  --delete-source-files  Delete source files after a successful import (off by default)
  --help             Show this help

Required in .env.local: NEXT_PUBLIC_CONVEX_URL, ADMIN_SCRIPT_KEY, DEEPSEEK_API_KEY,
R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
`);
    process.exit(0);
}

// ─── Config ───────────────────────────────────────────────────────────────
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const ADMIN_SCRIPT_KEY = process.env.ADMIN_SCRIPT_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Hardcoded on purpose: .env.local defines CLOUDFLARE_ACCOUNT_ID / R2_BUCKET_NAME /
// R2_PUBLIC_URL THREE times (once per R2 bucket you use). dotenv silently keeps only the
// LAST value of a repeated key, so anything reading those generic names from process.env
// can silently point at the wrong bucket. This script targets the workout-videos account
// explicitly instead of trusting the ambiguous shared var names.
const R2_ACCOUNT_ID = '716440396590dd2816ba60c8495f6cbd';
const R2_BUCKET = 'bluomworkouts';
const R2_PUBLIC_URL = 'https://pub-f21d719c948b41dd8ef5e188aceea102.r2.dev';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const MANIFEST_PATH = path.join(process.cwd(), 'scripts', 'data', 'exercise-import-manifest.json');
const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png'];

const LANGS = ['pt', 'es', 'fr', 'de', 'nl', 'bg', 'da', 'el', 'lt', 'lv', 'no', 'pl', 'ro', 'sv', 'tr'];

type FileEntry = { fullPath: string; name: string; ext: string };
type Group = {
    baseName: string;
    maleVideo?: FileEntry;
    femaleVideo?: FileEntry;
    maleImage?: FileEntry;
    femaleImage?: FileEntry;
    duplicates: FileEntry[];
};

type ManifestEntry = {
    exerciseName: string;
    status: 'imported' | 'error';
    files: Record<string, string>;
    r2Urls: Record<string, string>;
    convexId?: string;
    convexAction?: string;
    importedAt: string;
    error?: string;
};

// ─── Manifest ─────────────────────────────────────────────────────────────
function loadManifest(): ManifestEntry[] {
    if (!fs.existsSync(MANIFEST_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch {
        console.error(`⚠️  Could not parse ${MANIFEST_PATH} — treating as empty. Fix or delete it.`);
        return [];
    }
}

function saveManifest(manifest: ManifestEntry[]) {
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// ─── Scan & group Downloads ───────────────────────────────────────────────
function scanGroups(dir: string): Group[] {
    const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isFile())
        .map(d => d.name);

    const groups = new Map<string, Group>();

    for (const name of files) {
        const ext = path.extname(name).toLowerCase();
        if (![...VIDEO_EXT, ...IMAGE_EXT].includes(ext)) continue;

        const stem = name.slice(0, -ext.length);
        const dupMatch = stem.match(/^(.*?)\s*\((\d+)\)$/);
        const isDup = !!dupMatch;
        const stemNoSuffix = isDup ? dupMatch![1] : stem;

        const isFemale = /_Female$/i.test(stemNoSuffix);
        const baseName = stemNoSuffix.replace(/_Female$/i, '').trim();
        if (!baseName) continue;

        const key = baseName.toLowerCase();
        if (!groups.has(key)) {
            groups.set(key, { baseName, duplicates: [] });
        }
        const group = groups.get(key)!;
        const entry: FileEntry = { fullPath: path.join(dir, name), name, ext };

        if (isDup) {
            group.duplicates.push(entry);
            continue;
        }

        const isVideo = VIDEO_EXT.includes(ext);
        if (isVideo && isFemale) group.femaleVideo = entry;
        else if (isVideo && !isFemale) group.maleVideo = entry;
        else if (!isVideo && isFemale) group.femaleImage = entry;
        else if (!isVideo && !isFemale) group.maleImage = entry;
    }

    return Array.from(groups.values());
}

// ─── Thumbnail generation (optional, requires ffmpeg on PATH) ─────────────
let ffmpegChecked = false;
let ffmpegAvailable = false;
function hasFfmpeg(): boolean {
    if (ffmpegChecked) return ffmpegAvailable;
    ffmpegChecked = true;
    try {
        execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
        ffmpegAvailable = true;
    } catch {
        ffmpegAvailable = false;
    }
    return ffmpegAvailable;
}

function generateThumbnail(videoPath: string): string | null {
    if (!hasFfmpeg()) return null;
    const outPath = path.join(os.tmpdir(), `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    try {
        execFileSync('ffmpeg', [
            '-y', '-i', videoPath, '-ss', '00:00:01.0',
            '-frames:v', '1', '-vf', 'scale=800:-1', '-q:v', '3', outPath,
        ], { stdio: 'ignore' });
        return fs.existsSync(outPath) ? outPath : null;
    } catch {
        return null;
    }
}

// ─── R2 upload ────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID || '', secretAccessKey: R2_SECRET_ACCESS_KEY || '' },
});

async function uploadToR2(localPath: string, objectKey: string): Promise<string> {
    const body = fs.readFileSync(localPath);
    const contentType = objectKey.match(/\.(mp4|mov|m4v)$/i) ? 'video/mp4' : 'image/jpeg';
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: objectKey, Body: body, ContentType: contentType }));
    return `${R2_PUBLIC_URL}/${encodeURIComponent(objectKey)}`;
}

async function existsOnR2(objectKey: string): Promise<boolean> {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: objectKey }));
        return true;
    } catch {
        return false;
    }
}

// ─── DeepSeek classification + localization ────────────────────────────────
type Classification = {
    category: string;
    categories: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    equipment: string[];
    primaryMuscles: string[];
    secondaryMuscles: string[];
    exerciseType: string;
    exerciseTypes: string[];
    duration: number;
    calories: number;
    description: string;
    instructions: string[];
    titleLocalizations: Record<string, string>;
    descriptionLocalizations: Record<string, string>;
    instructionsLocalizations: Record<string, string[]>;
};

async function classifyExercise(exerciseName: string): Promise<Classification> {
    const prompt = `You are a certified strength & conditioning coach building structured data for a fitness app's exercise library.

Exercise name: "${exerciseName}"

Return ONLY a JSON object with this exact shape (no markdown, no commentary):
{
  "category": "Strength" | "Cardio" | "Stretching" | "Mobility" | "Plyometric" | "HIIT" | "Core",
  "categories": ["<1-3 tags from the same list>"],
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "equipment": ["<equipment items, e.g. Dumbbells, Barbell, Resistance Band — empty array if bodyweight>"],
  "primaryMuscles": ["<1-3 primary muscle groups, e.g. Biceps, Quads, Chest, Shoulders, Core, Back, Glutes, Hamstrings, Triceps, Calves>"],
  "secondaryMuscles": ["<0-3 secondary/stabilizer muscle groups, can be empty>"],
  "exerciseType": "<single primary type, e.g. Isolation, Compound, Stretch, Balance>",
  "exerciseTypes": ["<1-2 types from the same idea>"],
  "duration": <typical duration of ONE set/hold in seconds, integer>,
  "calories": <estimated calories burned per minute, integer>,
  "description": "<1 sentence, English, describing what the exercise does>",
  "instructions": ["<3-5 short step-by-step instructions in English>"],
  "titleLocalizations": { "pt": "...", "es": "...", "fr": "...", "de": "...", "nl": "...", "bg": "...", "da": "...", "el": "...", "lt": "...", "lv": "...", "no": "...", "pl": "...", "ro": "...", "sv": "...", "tr": "..." },
  "descriptionLocalizations": { "<same 15 language codes>": "<translated description>" },
  "instructionsLocalizations": { "<same 15 language codes>": ["<translated instructions, same count as English>"] }
}
Translate naturally for a fitness app audience in each language — do not machine-translate word for word. Use exactly these language codes: ${LANGS.join(', ')}.`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.4,
        }),
    });

    if (!res.ok) {
        throw new Error(`DeepSeek API error ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error('DeepSeek returned no content');

    const parsed = JSON.parse(raw);

    // Defensive defaults so one malformed field never crashes the whole import
    return {
        category: parsed.category || 'Strength',
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : [parsed.category || 'Strength'],
        difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(parsed.difficulty) ? parsed.difficulty : 'Beginner',
        equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
        primaryMuscles: Array.isArray(parsed.primaryMuscles) ? parsed.primaryMuscles : [],
        secondaryMuscles: Array.isArray(parsed.secondaryMuscles) ? parsed.secondaryMuscles : [],
        exerciseType: parsed.exerciseType || 'Compound',
        exerciseTypes: Array.isArray(parsed.exerciseTypes) && parsed.exerciseTypes.length ? parsed.exerciseTypes : [parsed.exerciseType || 'Compound'],
        duration: Number.isFinite(parsed.duration) ? parsed.duration : 45,
        calories: Number.isFinite(parsed.calories) ? parsed.calories : 5,
        description: parsed.description || exerciseName,
        instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
        titleLocalizations: parsed.titleLocalizations || {},
        descriptionLocalizations: parsed.descriptionLocalizations || {},
        instructionsLocalizations: parsed.instructionsLocalizations || {},
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
    if (!SOURCE_DIR) {
        console.error('❌ Missing --source <path>. Refusing to scan Downloads because it can contain non-exercise videos.');
        process.exit(1);
    }
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`❌ Source folder not found: ${SOURCE_DIR}`);
        process.exit(1);
    }

    const manifest = loadManifest();
    const importedNames = new Set(manifest.filter(m => m.status === 'imported').map(m => m.exerciseName.toLowerCase()));

    const groups = scanGroups(SOURCE_DIR).filter(g => g.maleVideo || g.femaleVideo);
    const pending = groups.filter(g => !importedNames.has(g.baseName.toLowerCase()));

    console.log(`\n🤖 Bluom Automated Exercise Importer`);
    console.log(`=====================================`);
    console.log(`📂 Source: ${SOURCE_DIR}`);
    console.log(`📋 Already imported (manifest): ${importedNames.size}`);
    console.log(`🆕 New exercise groups found: ${pending.length}\n`);

    if (isList) {
        for (const g of pending) {
            const hasDup = g.duplicates.length > 0;
            const sides = [g.maleVideo ? 'Male✓' : 'Male✗', g.femaleVideo ? 'Female✓' : 'Female✗'].join(' ');
            const imgs = [g.maleImage ? 'MaleImg✓' : '', g.femaleImage ? 'FemaleImg✓' : ''].filter(Boolean).join(' ') || 'no images (will auto-thumbnail)';
            console.log(`  ${hasDup ? '⚠️ ' : '  '}${g.baseName}  —  ${sides}  —  ${imgs}${hasDup ? `  —  ${g.duplicates.length} unresolved duplicate file(s)!` : ''}`);
        }
        if (pending.length === 0) console.log('  Nothing pending — Downloads is fully synced with Convex.');
        console.log('');
        return;
    }

    if (!ADMIN_SCRIPT_KEY || !CONVEX_URL) {
        console.error('❌ Missing ADMIN_SCRIPT_KEY or NEXT_PUBLIC_CONVEX_URL in .env.local');
        process.exit(1);
    }
    if (!DEEPSEEK_API_KEY) {
        console.error('❌ Missing DEEPSEEK_API_KEY in .env.local');
        process.exit(1);
    }
    if (!isDryRun && (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
        console.error('❌ Missing R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local');
        process.exit(1);
    }

    const convex = isDryRun ? null : new ConvexHttpClient(CONVEX_URL);
    if (!isDryRun && !hasFfmpeg()) {
        console.log('ℹ️  ffmpeg not found on PATH — exercises missing a photo will be imported without a thumbnail (falls back to the video URL, same as before). Run `winget install ffmpeg` to enable auto-thumbnails.\n');
    }

    let successCount = 0, errorCount = 0, skippedDupCount = 0;

    for (const group of pending) {
        if (group.duplicates.length > 0) {
            console.log(`⚠️  SKIPPED "${group.baseName}" — ${group.duplicates.length} ambiguous duplicate file(s): ${group.duplicates.map(d => d.name).join(', ')}. Rename/remove the extras and rerun.`);
            skippedDupCount++;
            continue;
        }

        console.log(`\n▶ ${group.baseName}`);
        try {
            // 1. Classify + localize
            console.log(`   Classifying with DeepSeek...`);
            const c = isDryRun
                ? null
                : await classifyExercise(group.baseName);

            // 2. Thumbnails (generate if missing and a video exists)
            let maleImagePath = group.maleImage?.fullPath;
            let femaleImagePath = group.femaleImage?.fullPath;
            let generatedMaleThumb: string | null = null;
            let generatedFemaleThumb: string | null = null;
            if (!isDryRun) {
                if (!maleImagePath && group.maleVideo) {
                    generatedMaleThumb = generateThumbnail(group.maleVideo.fullPath);
                    if (generatedMaleThumb) { maleImagePath = generatedMaleThumb; console.log('   Generated thumbnail for Male side (no photo was provided).'); }
                }
                if (!femaleImagePath && group.femaleVideo) {
                    generatedFemaleThumb = generateThumbnail(group.femaleVideo.fullPath);
                    if (generatedFemaleThumb) { femaleImagePath = generatedFemaleThumb; console.log('   Generated thumbnail for Female side (no photo was provided).'); }
                }
            }

            // 3. Upload to R2
            const urls: Record<string, string> = {};
            const filesUsed: Record<string, string> = {};
            if (!isDryRun) {
                if (group.maleVideo) { urls.videoUrl = await uploadToR2(group.maleVideo.fullPath, group.maleVideo.name); filesUsed.maleVideo = group.maleVideo.name; }
                if (group.femaleVideo) { urls.videoUrlFemale = await uploadToR2(group.femaleVideo.fullPath, group.femaleVideo.name); filesUsed.femaleVideo = group.femaleVideo.name; }
                if (maleImagePath) { const key = group.maleImage?.name || `${group.baseName}.jpg`; urls.thumbnailMale = await uploadToR2(maleImagePath, key); filesUsed.maleImage = key; }
                if (femaleImagePath) { const key = group.femaleImage?.name || `${group.baseName}_Female.jpg`; urls.thumbnailFemale = await uploadToR2(femaleImagePath, key); filesUsed.femaleImage = key; }
                console.log(`   Uploaded ${Object.keys(urls).length} file(s) to R2.`);
            }

            // 4. Write to Convex
            let convexId: string | undefined;
            let convexAction: string | undefined;
            if (!isDryRun && c) {
                const result: any = await convex!.mutation(api.videoWorkouts.upsertWorkoutViaScript, {
                    scriptKey: ADMIN_SCRIPT_KEY,
                    title: group.baseName,
                    description: c.description,
                    titleLocalizations: c.titleLocalizations,
                    descriptionLocalizations: c.descriptionLocalizations,
                    thumbnailMale: urls.thumbnailMale,
                    thumbnailFemale: urls.thumbnailFemale,
                    videoUrl: urls.videoUrl && !urls.videoUrlFemale ? urls.videoUrl : undefined,
                    videoUrlMale: urls.videoUrlFemale ? urls.videoUrl : undefined,
                    videoUrlFemale: urls.videoUrlFemale,
                    duration: c.duration,
                    calories: c.calories,
                    difficulty: c.difficulty,
                    category: c.category,
                    categories: c.categories,
                    muscleGroupTags: [...c.primaryMuscles, ...c.secondaryMuscles],
                    equipment: c.equipment,
                    exercises: [{
                        name: group.baseName,
                        duration: c.duration,
                        description: c.description,
                        instructions: c.instructions,
                        instructionsLocalizations: c.instructionsLocalizations,
                        primaryMuscles: c.primaryMuscles,
                        secondaryMuscles: c.secondaryMuscles,
                        exerciseType: c.exerciseType,
                        exerciseTypes: c.exerciseTypes,
                    }],
                });
                convexId = result.id;
                convexAction = result.action;
                console.log(`   Convex: ${convexAction} (${convexId})`);
            }

            // 5. Manifest + cleanup
            if (!isDryRun) {
                manifest.push({
                    exerciseName: group.baseName,
                    status: 'imported',
                    files: filesUsed,
                    r2Urls: urls,
                    convexId,
                    convexAction,
                    importedAt: new Date().toISOString(),
                });
                saveManifest(manifest);

                if (generatedMaleThumb) fs.unlinkSync(generatedMaleThumb);
                if (generatedFemaleThumb) fs.unlinkSync(generatedFemaleThumb);

                if (deleteSourceFiles) {
                    for (const f of [group.maleVideo, group.femaleVideo, group.maleImage, group.femaleImage]) {
                        if (f) fs.unlinkSync(f.fullPath);
                    }
                    console.log(`   Deleted source files from Downloads.`);
                } else {
                    console.log(`   Kept source files (use --delete-source-files to remove them after an import).`);
                }
            } else {
                console.log(`   [dry-run] would classify, upload, write to Convex, and delete source files.`);
            }

            successCount++;
        } catch (err: any) {
            console.error(`   ❌ Error: ${err.message || err}`);
            if (!isDryRun) {
                manifest.push({
                    exerciseName: group.baseName,
                    status: 'error',
                    files: {},
                    r2Urls: {},
                    importedAt: new Date().toISOString(),
                    error: String(err.message || err),
                });
                saveManifest(manifest);
            }
            errorCount++;
        }
    }

    console.log(`\n=====================================`);
    console.log(`🎉 Done: ${successCount} imported, ${errorCount} errors, ${skippedDupCount} skipped (duplicates need resolving)`);
    console.log(`=====================================\n`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
