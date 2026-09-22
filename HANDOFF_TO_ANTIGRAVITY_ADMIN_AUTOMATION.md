# Bluom — Admin Panel Automation Handoff to Antigravity

**Owner:** Jorge (ggovsaas@gmail.com) · **Project:** `C:\Users\jwfca\Desktop\BluomAppNew` · **Stack:** Expo SDK 54 (React Native Web via react-native-web 0.21), Convex, Clerk

---

## 1. The problem

The admin panel at `bluom.app/admin/*` (workouts, content/blog, foods, recipes, exercises) is built with React Native Web. Across multiple pages, clicking the row "edit" icon (pencil) does **nothing** — no modal opens, no navigation, no console error. Confirmed on both `app/admin/workouts.tsx` and `app/admin/content.tsx` via live browser testing (Chrome DevTools Protocol automation), including calling the row's `onClick`/React `onPress` handler directly in the page's JS context — still zero DOM change.

**Caveat — this is NOT fully proven as an app bug.** The page has many SVG icons (sidebar nav icons render before the row icons in DOM order), so the automated test may have targeted the wrong element. **Ask Jorge to do one real manual click** on an edit-pencil icon in `/admin/workouts` or `/admin/content` in his own Chrome and confirm whether the edit modal opens for him. That result changes priority below.

### Prime suspect if it IS a real bug

Both pages use the identical pattern:
```tsx
<TouchableOpacity onPress={() => openEdit(item)}>...</TouchableOpacity>
...
<Modal visible={isModalOpen} animationType="slide">...</Modal>
```
- `app/admin/workouts.tsx` — `TouchableOpacity onPress` at line 527, `openEdit` at line 435, `<Modal visible={isModalOpen}>` at line 634.
- `app/admin/content.tsx` — `TouchableOpacity onPress` at line 665, `<Modal visible={isModalOpen}>` at line 715.

RN's core `<Modal>` component has a long history of partial/unreliable support in `react-native-web` (portal target, z-index/stacking context, or simply not rendering visible content depending on version and app root structure). Since it's the **same component reused on every admin edit screen**, a bug here would explain the panel-wide symptom. First diagnostic step: add a temporary `console.log('openEdit called', w)` at the top of `openEdit` in both files, reproduce, and check the browser console — that tells you in 30 seconds whether the tap handler is even firing.

---

## 2. Recommended fix: skip the flaky UI entirely for bulk work

Regardless of whether #1 is real, Jorge needs to bulk-import ~90+ exercises (video URLs, thumbnails, muscle-group tags, full localization) and blog articles. Clicking through a UI one row at a time was never going to be a good way to do that. **The admin UI is a thin wrapper over Convex mutations that already support everything needed** — write a script that calls them directly.

### Reference pattern already in this repo

`scripts/recipe-agent.ts` already does exactly this shape of thing (Node script → `ConvexHttpClient` → `convex.mutation(api.X.Y, {...})`, run via `npx tsx scripts/recipe-agent.ts`). Copy that pattern for the two scripts below.

### 2a. Bulk workout/exercise import

Mutations already exist in `convex/videoWorkouts.ts`:
- `createWorkout` (line 79) — full args: `title, description, titleLocalizations, descriptionLocalizations, thumbnail, thumbnailMale, thumbnailFemale, videoUrl, videoUrlMale, videoUrlFemale, duration, calories, difficulty ("Beginner"|"Intermediate"|"Advanced"), category, categories[], muscleGroupTags[], equipment[], optionalEquipment[], instructor, isPremium, exercises: [{ name, duration, reps?, sets?, description, instructions?, instructionsLocalizations?, primaryMuscles?, primaryMusclesLocalizations?, secondaryMuscles?, secondaryMusclesLocalizations?, exerciseType?, exerciseTypes? }]`
- `updateWorkout` (line 117) — `{ id, updates: {...same fields, all optional} }`
- Localization objects support: pt, es, fr, de, nl, bg, da, el, lt, lv, no, pl, ro, sv, tr (see `constants/adminLanguages.ts` for the canonical language list used by the admin form — match it for "localize all languages" per Jorge's requirement).

Also `convex/exercises.ts` → `bulkInsertExercises` (line 96) for the separate `exerciseLibrary` table (bulk array insert in one call — args: `exercises: [{ name: {en, es, pt, ...}, category, met, caloriesPerMinute?, muscleGroups[] }]`).

**Build:** `scripts/import-workouts.ts` that reads a JSON/CSV batch file (one row per exercise: name, muscle group, male/female video URLs, male/female thumbnail URLs, localized text) and loops calling `createWorkout`. I (Claude) will produce that batch file — Dropbox → R2 upload → URL collection is already in progress — Antigravity's job is the script + auth (next section), not the data.

### 2b. Bulk blog article import (unblocks the 4 drafted posts sitting unused)

`convex/admin.ts` → `createArticle` (line 450) / `updateArticle` (line 492). Args: `title, slug, content, status ("DRAFT"|"PENDING"|"PUBLISHED"), category, featuredImage?, focusKeyphrase?, imageAlt?, metaDescription?, titlePt/Es/Fr/De/Nl?, contentPt/Es/Fr/De/Nl?` (table: `blogArticles`). Same script pattern — `scripts/import-articles.ts` reading a JSON file of posts.

### 2c. The auth wrinkle — read before building

All three mutations (`createWorkout`, `updateWorkout`, `bulkInsertExercises`, `createArticle`, `updateArticle`) call `checkAdminPower(ctx)` (`convex/functions.ts`), which requires a real Clerk-authenticated identity whose email is in `MASTER_ADMINS` (`convex/permissions.ts`) or whose `users` row has `role: "admin"/"super_admin"`. `recipe-agent.ts`'s `createRecipe` mutation does **not** call `checkAdminPower`, which is why that script works unauthenticated — the workout/article mutations are stricter and a plain `ConvexHttpClient` with no `.setAuth()` will get `"Unauthorized: admin role required"`.

Two ways to unblock this, pick whichever is faster:
1. **Mint a real Clerk session token for Jorge's admin account** from a script (Clerk Backend SDK, `clerkClient.sessions.createSession` / sign-in token flow) and call `convex.setAuth(token)` before mutating. More "correct" but more setup.
2. **(Recommended, lower-risk, faster)** Add a small parallel mutation for each (e.g. `createWorkoutViaScript`, `createArticleViaScript`) that checks a shared secret instead of Clerk identity — compare an `args.scriptKey` param against a Convex-side env var (`process.env.ADMIN_SCRIPT_KEY`, set via `npx convex env set`). Only Jorge's local script ever has that key. This avoids touching Clerk auth flow entirely and is the standard pattern for trusted internal bulk-import scripts.

Confirm with Jorge which he prefers before building — it's a 10-minute decision, not a research task.

---

## 3. `app/landing.tsx` — separate thread (SEO)

Not related to the click bug. Context: the homepage nav links to same-page anchor sections rather than real indexable routes, so most of a 3,640-row keyword research sheet has nowhere to land. Recommendation once bandwidth allows: pick the 2-3 highest-intent anchor sections (check the keyword sheet's top clusters — nutrition tools, fasting, etc.) and give them real routes with unique `<title>`/meta description, while optionally keeping the anchor links on the homepage too for on-page nav. `/blog` (driven by `app/admin/content.tsx` → `blogArticles`) is already a real route — it just has no content yet, which is section 2b above.

---

## 4. Suggested order of operations for Antigravity

1. Ask Jorge to manually click one edit-pencil in `/admin/workouts` — does the modal open for him? (30 seconds, resolves the ambiguity in section 1)
2. Regardless of the answer to #1, build the script + auth path in section 2c (this unblocks bulk work today either way)
3. Build `scripts/import-workouts.ts` and `scripts/import-articles.ts` per 2a/2b
4. Only then, if #1 confirmed a real bug, circle back and fix the Modal (nice-to-have for one-off single edits — not needed for bulk work once the scripts exist)
5. `landing.tsx` SEO routing — separate, lower urgency, whenever there's time
