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

if (isHelp) {
    console.log(`
Bluom Bulk Blog Article Importer
================================
Usage:
  npx tsx scripts/import-articles.ts [path-to-file.json] [options]

Options:
  --dry-run         Validate and parse articles without writing to Convex
  --help, -h        Show this help message

Default input file if omitted: scripts/data/articles.json

Required Environment Variables (in .env.local or environment):
  - NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL)
  - ADMIN_SCRIPT_KEY
`);
    process.exit(0);
}

// Find input file from arguments
const filePathArg = args.find(a => !a.startsWith('--'));
const defaultPath = path.join(process.cwd(), 'scripts', 'data', 'articles.json');
const resolvedFilePath = filePathArg ? path.resolve(process.cwd(), filePathArg) : defaultPath;

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const ADMIN_SCRIPT_KEY = process.env.ADMIN_SCRIPT_KEY;

console.log("\n📰 Bluom Blog Article Bulk Importer");
console.log("===================================");
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
    console.error("Tip: Provide a JSON file path or place your file at scripts/data/articles.json");
    console.error("Example template available at: scripts/data/articles.example.json\n");
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

const articleList: any[] = Array.isArray(rawData) ? rawData : (rawData.articles || rawData.posts || []);

if (!Array.isArray(articleList) || articleList.length === 0) {
    console.error("\n❌ Error: JSON file does not contain an array of articles.");
    process.exit(1);
}

console.log(`\n📋 Found ${articleList.length} articles to process.\n`);

const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;

// Helper to generate a clean slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function run() {
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < articleList.length; i++) {
        const item = articleList[i];
        const title = item.title || `Article ${i + 1}`;
        const slug = item.slug ? slugify(item.slug) : slugify(title);

        try {
            if (!item.content) {
                throw new Error("Missing required 'content' field.");
            }

            const status = (item.status || 'PUBLISHED').toUpperCase();
            if (!['DRAFT', 'PENDING', 'PUBLISHED'].includes(status)) {
                throw new Error(`Invalid status "${item.status}". Must be DRAFT, PENDING, or PUBLISHED.`);
            }

            const payload: any = {
                scriptKey: ADMIN_SCRIPT_KEY || 'dry-run-key',
                title: String(title).trim(),
                slug,
                content: String(item.content),
                status,
                category: item.category || 'Wellness',
                featuredImage: item.featuredImage || item.image || undefined,
                focusKeyphrase: item.focusKeyphrase || undefined,
                imageAlt: item.imageAlt || undefined,
                metaDescription: item.metaDescription || undefined,
                tags: Array.isArray(item.tags) ? item.tags : undefined,
                titlePt: item.titlePt || undefined,
                titleEs: item.titleEs || undefined,
                titleFr: item.titleFr || undefined,
                titleDe: item.titleDe || undefined,
                titleNl: item.titleNl || undefined,
                contentPt: item.contentPt || undefined,
                contentEs: item.contentEs || undefined,
                contentFr: item.contentFr || undefined,
                contentDe: item.contentDe || undefined,
                contentNl: item.contentNl || undefined,
                authorEmail: item.authorEmail || undefined,
            };

            if (isDryRun) {
                console.log(`[DRY RUN] [${i + 1}/${articleList.length}] Validated: "${title}" (Slug: /blog/${slug}, Status: ${status})`);
                createdCount++;
            } else {
                const res = await convex!.mutation(api.admin.upsertArticleViaScript, payload);
                if (res.action === 'created') {
                    createdCount++;
                    console.log(`✅ [${i + 1}/${articleList.length}] Created: "${title}" (${res.id}) -> /blog/${slug}`);
                } else {
                    updatedCount++;
                    console.log(`🔄 [${i + 1}/${articleList.length}] Updated: "${title}" (${res.id}) -> /blog/${slug}`);
                }
            }
        } catch (err: any) {
            errorCount++;
            console.error(`❌ [${i + 1}/${articleList.length}] Failed on "${title}":`, err.message);
        }
    }

    console.log("\n=========================================");
    console.log("🎉 Article Import Summary:");
    console.log(`   Total Processed: ${articleList.length}`);
    console.log(`   Created:         ${createdCount}`);
    console.log(`   Updated:         ${updatedCount}`);
    console.log(`   Errors:          ${errorCount}`);
    console.log("=========================================\n");
}

run().catch(err => {
    console.error("Fatal script error:", err);
    process.exit(1);
});
