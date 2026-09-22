/**
 * Imports public/admin recipes and their local images as one atomic per-recipe workflow.
 *
 * Usage:
 *   npx tsx scripts/import-public-recipes.ts --file scripts/data/public-recipes.json --images D:\\Recipes --dry-run
 *   npx tsx scripts/import-public-recipes.ts --file scripts/data/public-recipes.json --images D:\\Recipes
 *
 * Each JSON item needs title, servings, calories, protein, carbs, and fat. Set imageFile
 * to a file inside --images; imageUrl can be used only for media already hosted in R2.
 * The importer never deletes source images.
 *
 * Required environment variables for live imports:
 * NEXT_PUBLIC_CONVEX_URL, ADMIN_SCRIPT_KEY,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { api } from '../convex/_generated/api';

dotenv.config({ path: '.env.local' });
dotenv.config();

type RecipeInput = {
  title: string;
  description?: string;
  imageFile?: string;
  imageUrl?: string;
  cookTimeMinutes?: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags?: string[];
  category?: string;
  categories?: string[];
  isPremium?: boolean;
  mealType?: string[];
  dietType?: string[];
  nutrientType?: string[];
  cuisine?: string;
  ingredients?: string[];
  instructions?: string[];
  shoppingListItems?: string[];
  titleLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
  ingredientsLocalizations?: Record<string, string[]>;
  instructionsLocalizations?: Record<string, string[]>;
  shoppingListLocalizations?: Record<string, string[]>;
  status?: string;
};

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const inputFile = getArg('--file');
const imageDirectory = getArg('--images');
const isDryRun = args.includes('--dry-run');

if (args.includes('--help') || !inputFile) {
  console.log('Usage: npx tsx scripts/import-public-recipes.ts --file <recipes.json> [--images <folder>] [--dry-run]');
  process.exit(inputFile ? 0 : 1);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const scriptKey = process.env.ADMIN_SCRIPT_KEY;
// Recipes and foods share jwfcarvalho1989's content bucket, with separate object
// prefixes. Workout media remains in the dedicated workout buckets.
const r2AccountId = '716440396590dd2816ba60c8495f6cbd';
const r2Bucket = 'fooddatabase';
const r2PublicUrl = 'https://pub-e8204ad737dc4a5f93bd4f2b1f9f0a15.r2.dev';
const r2AccessKeyId = process.env.R2_RECIPES_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_RECIPES_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;

function assertLiveConfiguration() {
  const missing = [
    ['NEXT_PUBLIC_CONVEX_URL', convexUrl],
    ['ADMIN_SCRIPT_KEY', scriptKey],
    ['R2_ACCESS_KEY_ID', r2AccessKeyId],
    ['R2_SECRET_ACCESS_KEY', r2SecretAccessKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

function contentTypeFor(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function objectKey(recipe: RecipeInput, fileName: string) {
  const slug = recipe.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `recipes/${slug}-${Date.now()}${path.extname(fileName).toLowerCase()}`;
}

async function main() {
  const absoluteInputFile = path.resolve(inputFile!);
  if (!fs.existsSync(absoluteInputFile)) throw new Error(`Input file not found: ${absoluteInputFile}`);

  const recipes = JSON.parse(fs.readFileSync(absoluteInputFile, 'utf8')) as RecipeInput[];
  if (!Array.isArray(recipes) || recipes.length === 0) throw new Error('Input must be a non-empty JSON array.');

  for (const recipe of recipes) {
    if (!recipe.title?.trim()) throw new Error('Every recipe needs a title.');
    for (const key of ['servings', 'calories', 'protein', 'carbs', 'fat'] as const) {
      if (!Number.isFinite(recipe[key])) throw new Error(`"${recipe.title}" has an invalid ${key}.`);
    }
  }

  console.log(`Public recipe importer: ${recipes.length} recipe(s), ${isDryRun ? 'DRY RUN' : 'LIVE'}.`);
  if (isDryRun) {
    for (const recipe of recipes) console.log(`[dry-run] ${recipe.title}${recipe.imageFile ? ` <- ${recipe.imageFile}` : ''}`);
    return;
  }

  assertLiveConfiguration();
  const convex = new ConvexHttpClient(convexUrl!);
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2AccessKeyId!, secretAccessKey: r2SecretAccessKey! },
  });

  for (const recipe of recipes) {
    let imageUrl = recipe.imageUrl?.trim();
    if (recipe.imageFile) {
      if (!imageDirectory) throw new Error(`"${recipe.title}" has imageFile but no --images directory was supplied.`);
      const localPath = path.resolve(imageDirectory, recipe.imageFile);
      if (!fs.existsSync(localPath)) throw new Error(`Image not found for "${recipe.title}": ${localPath}`);

      const key = objectKey(recipe, recipe.imageFile);
      await r2.send(new PutObjectCommand({
        Bucket: r2Bucket!,
        Key: key,
        Body: fs.readFileSync(localPath),
        ContentType: contentTypeFor(recipe.imageFile),
      }));
      imageUrl = `${r2PublicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
    }

    const { imageFile: _imageFile, imageUrl: _existingImageUrl, ...recipeData } = recipe;
    const result = await convex.mutation(api.admin.upsertPublicRecipeViaScript, {
      scriptKey: scriptKey!,
      ...recipeData,
      title: recipe.title.trim(),
      imageUrl,
      status: recipe.status ?? 'published',
    });
    console.log(`${result.action}: ${recipe.title}`);
  }
}

main().catch((error) => {
  console.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
