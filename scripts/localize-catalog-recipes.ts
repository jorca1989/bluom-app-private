import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

dotenv.config({ path: '.env.local' });
dotenv.config();

const args = process.argv.slice(2);
const valueAfter = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const input = valueAfter('--file');
const output = valueAfter('--output');
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const targets: Record<string, string> = {
  pt: 'Portuguese (Portugal)', es: 'Spanish', fr: 'French', de: 'German', nl: 'Dutch',
  bg: 'Bulgarian', da: 'Danish', el: 'Greek', lt: 'Lithuanian', lv: 'Latvian',
  no: 'Norwegian Bokmal', pl: 'Polish', ro: 'Romanian', sv: 'Swedish', tr: 'Turkish',
};

if (!input || !output || !convexUrl || args.includes('--help')) {
  console.log('Usage: npx tsx scripts/localize-catalog-recipes.ts --file <input.json> --output <output.json>');
  process.exit(input && output && convexUrl ? 0 : 1);
}

type Recipe = Record<string, any>;
const separator = (name: string) => `<<<BLUOM_${name}>>>`;

function sourceText(recipe: Recipe) {
  return [
    separator('TITLE'), recipe.title,
    separator('DESCRIPTION'), recipe.description,
    separator('INGREDIENTS'), ...(recipe.ingredients || []),
    separator('INSTRUCTIONS'), ...(recipe.instructions || []),
    separator('SHOPPING'), ...(recipe.shoppingListItems || []),
  ].join('\n');
}

function section(text: string, name: string, nextName?: string) {
  const start = text.indexOf(separator(name));
  const end = nextName ? text.indexOf(separator(nextName)) : text.length;
  if (start < 0 || end < 0) throw new Error(`Translation removed ${separator(name)}.`);
  return text.slice(start + separator(name).length, end).trim();
}

function parseTranslation(text: string, recipe: Recipe) {
  const title = section(text, 'TITLE', 'DESCRIPTION');
  const description = section(text, 'DESCRIPTION', 'INGREDIENTS');
  const ingredients = section(text, 'INGREDIENTS', 'INSTRUCTIONS').split('\n').filter(Boolean);
  const instructions = section(text, 'INSTRUCTIONS', 'SHOPPING').split('\n').filter(Boolean);
  const shopping = section(text, 'SHOPPING').split('\n').filter(Boolean);
  if (ingredients.length !== recipe.ingredients.length || instructions.length !== recipe.instructions.length || shopping.length !== recipe.shoppingListItems.length) {
    throw new Error(`Translation changed a list length for ${recipe.title}.`);
  }
  return { title, description, ingredients, instructions, shopping };
}

async function localizeRecipe(recipe: Recipe, convex: ConvexHttpClient) {
  const localized = {
    titleLocalizations: {} as Record<string, string>,
    descriptionLocalizations: {} as Record<string, string>,
    ingredientsLocalizations: {} as Record<string, string[]>,
    instructionsLocalizations: {} as Record<string, string[]>,
    shoppingListLocalizations: {} as Record<string, string[]>,
  };
  const entries = Object.entries(targets);
  for (let index = 0; index < entries.length; index += 3) {
    await Promise.all(entries.slice(index, index + 3).map(async ([code, targetLang]) => {
      const translated = await convex.action(api.ai.translateText, { text: sourceText(recipe), targetLang });
      const value = parseTranslation(translated, recipe);
      localized.titleLocalizations[code] = value.title;
      localized.descriptionLocalizations[code] = value.description;
      localized.ingredientsLocalizations[code] = value.ingredients;
      localized.instructionsLocalizations[code] = value.instructions;
      localized.shoppingListLocalizations[code] = value.shopping;
      console.log(`${recipe.title}: ${code}`);
    }));
  }
  return { ...recipe, ...localized };
}

async function main() {
  const recipes = JSON.parse(fs.readFileSync(path.resolve(input!), 'utf8')) as Recipe[];
  if (!Array.isArray(recipes) || recipes.length === 0) throw new Error('Input must be a non-empty recipe array.');
  const convex = new ConvexHttpClient(convexUrl!);
  const localized: Recipe[] = [];
  for (const recipe of recipes) localized.push(await localizeRecipe(recipe, convex));
  fs.writeFileSync(path.resolve(output!), `${JSON.stringify(localized, null, 2)}\n`);
  console.log(`Wrote ${localized.length} fully localized recipe(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
