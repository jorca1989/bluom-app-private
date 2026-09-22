/**
 * Imports catalog foods and optionally uploads their local thumbnails to the foods R2 bucket.
 *
 * Usage:
 *   npx tsx scripts/import-foods.ts --file scripts/data/foods.json --images D:\\FoodImages --dry-run
 *   npx tsx scripts/import-foods.ts --file scripts/data/foods.json --images D:\\FoodImages
 *
 * Each JSON item requires name.en and macros (calories, protein, carbs, fat, fiber).
 * thumbnailFile is resolved within --images; thumbnail is for a pre-existing public R2 URL.
 * Source images are never deleted.
 *
 * Required for a live import:
 * NEXT_PUBLIC_CONVEX_URL, ADMIN_SCRIPT_KEY,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { api } from '../convex/_generated/api';

dotenv.config({ path: '.env.local' });
dotenv.config();

type FoodInput = {
  name: { en: string; [language: string]: string | undefined };
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    [nutrient: string]: number | undefined;
  };
  isVerified?: boolean;
  barcode?: string;
  brand?: string;
  servingSize?: string;
  thumbnail?: string;
  thumbnailFile?: string;
  countryCode?: string;
  mealType?: string[];
  dietType?: string[];
  nutrientType?: string[];
};

const args = process.argv.slice(2);
const valueAfter = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const inputFile = valueAfter('--file');
const imageDirectory = valueAfter('--images');
const isDryRun = args.includes('--dry-run');

if (args.includes('--help') || !inputFile) {
  console.log('Usage: npx tsx scripts/import-foods.ts --file <foods.json> [--images <folder>] [--dry-run]');
  process.exit(inputFile ? 0 : 1);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const scriptKey = process.env.ADMIN_SCRIPT_KEY;
// Foods live in the jwfcarvalho1989 Cloudflare account. Keep this distinct from
// the recipe account so image URLs always resolve from the intended bucket.
const r2AccountId = '716440396590dd2816ba60c8495f6cbd';
const r2Bucket = 'fooddatabase';
const r2PublicUrl = 'https://pub-e8204ad737dc4a5f93bd4f2b1f9f0a15.r2.dev';
const r2AccessKeyId = process.env.R2_FOODS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_FOODS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;

function ensureLiveConfiguration() {
  const missing = [
    ['NEXT_PUBLIC_CONVEX_URL', convexUrl],
    ['ADMIN_SCRIPT_KEY', scriptKey],
    ['R2_ACCESS_KEY_ID', r2AccessKeyId],
    ['R2_SECRET_ACCESS_KEY', r2SecretAccessKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

function imageContentType(fileName: string) {
  switch (path.extname(fileName).toLowerCase()) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

function imageKey(food: FoodInput, fileName: string) {
  const slug = food.name.en.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `foods/${slug}-${Date.now()}${path.extname(fileName).toLowerCase()}`;
}

async function main() {
  const resolvedInput = path.resolve(inputFile!);
  if (!fs.existsSync(resolvedInput)) throw new Error(`Input file not found: ${resolvedInput}`);
  const foods = JSON.parse(fs.readFileSync(resolvedInput, 'utf8')) as FoodInput[];
  if (!Array.isArray(foods) || foods.length === 0) throw new Error('Input must be a non-empty JSON array.');

  for (const food of foods) {
    if (!food.name?.en?.trim()) throw new Error('Every food needs name.en.');
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber']) {
      if (!Number.isFinite(food.macros?.[key])) throw new Error(`"${food.name.en}" has an invalid macros.${key}.`);
    }
  }

  console.log(`Food importer: ${foods.length} food(s), ${isDryRun ? 'DRY RUN' : 'LIVE'}.`);
  if (isDryRun) {
    for (const food of foods) console.log(`[dry-run] ${food.name.en}${food.thumbnailFile ? ` <- ${food.thumbnailFile}` : ''}`);
    return;
  }

  ensureLiveConfiguration();
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2AccessKeyId!, secretAccessKey: r2SecretAccessKey! },
  });
  const readyFoods = await Promise.all(foods.map(async (food) => {
    let thumbnail = food.thumbnail?.trim();
    if (food.thumbnailFile) {
      if (!imageDirectory) throw new Error(`"${food.name.en}" has thumbnailFile but no --images directory was supplied.`);
      const localPath = path.resolve(imageDirectory, food.thumbnailFile);
      if (!fs.existsSync(localPath)) throw new Error(`Thumbnail not found for "${food.name.en}": ${localPath}`);
      const key = imageKey(food, food.thumbnailFile);
      await r2.send(new PutObjectCommand({
        Bucket: r2Bucket!,
        Key: key,
        Body: fs.readFileSync(localPath),
        ContentType: imageContentType(food.thumbnailFile),
      }));
      thumbnail = `${r2PublicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
    }
    const { thumbnailFile: _thumbnailFile, ...foodData } = food;
    return { ...foodData, thumbnail };
  }));

  const convex = new ConvexHttpClient(convexUrl!);
  const result = await convex.mutation(api.customFoods.bulkInsertFoodsViaScript, {
    scriptKey: scriptKey!,
    foods: readyFoods,
  });
  console.log(`Created ${result.created}, updated ${result.updated}.`);
}

main().catch((error) => {
  console.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
