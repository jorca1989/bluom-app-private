# Onboarding, Move and Fuel implementation plan

29 September 2026. Implementation specification; application code has not been changed. Based on the [screenshot review](onboarding-competitor-review-2026-09-28.md) and [source/competitor audit](onboarding-manual-plans-feature-gap-audit-2026-09-29.md).

## Product decisions

- Fitness and nutrition independently offer **Build it for me**, **I'll build it myself**, and **Just track for now**. Show only domains relevant to the user's selected focus; preserve mental/hormonal/wellness paths.
- Manual users can begin blank or from a template. Generated plans remain editable through the same builders.
- Builders are persistent product tools reachable from onboarding, Move and Fuel. Onboarding can save an incomplete draft instead of requiring an entire week.
- Separate nutrition target management (manual or guided) from meal selection (manual or generated). Choosing one's meals must not automatically disable target guidance.
- Preserve existing subscription rules initially. Do not introduce new paywall restrictions as part of this refactor. Preview real content; never label a timer as completed generation.
- Existing users retain their plans, goals and history. They can change modes in Move/Fuel without repeating onboarding.

## 1. Plan persistence and compatibility

**Primary files:** `convex/schema.ts`, `convex/plans.ts`, `convex/routines.ts`, `convex/onboarding.ts`.

1. Add optional independent fitness/nutrition planning modes (`guided`, `manual`, `tracking`), nutrition target mode, onboarding draft/version and training preference fields. Missing fields on old accounts preserve existing behavior rather than resetting plans.
2. Extend the existing `fitnessPlans`, `nutritionPlans` and `routines` model rather than create parallel competing plan systems. Define typed plan contents for new writes; keep adapters for legacy generated arrays. Include draft/active/archived state, Act as a senior operations engineer and build a structured Creator & UGC Management tracking schema for our Notion workspace (page: https://app.notion.com/p/fda9518d1c2d4bd3b234d964ed8a069a?v=4b829bf587094b38814d3aadde2002fd) or a Google Sheets export.

App Context:
Bluom (https://bluom.app/) – All-in-one Health & Wellness OS (Workouts, Macros, Habits, Sleep, Hormonal/Cycle Tracking, Recovery).

Please generate:
1. A Notion Database Property Schema with the following fields:
   - Creator Name (Title)
   - Channel / Handle (URL / Text)
   - Persona / Niche (Select: Fit Mom / Busy Parent, Dedicated Lifter, Women's Holistic / Cycle, Men's Lifestyle / Discipline, Busy Student / Professional)
   - Platform Sourced (Select: UGC.nl, Trybe, Direct Inbound)
   - Status (Select: Outreach, Brief Sent, In Production, Videos Received, In Ad Review, Live on Meta/Google, Retainer Active, Inactive)
   - Deal Structure (Select: Pure Rev-Share 10%, Base + Commission, Flat Fee / Retainer)
   - Cost / Floor (€ Number)
   - Deliverables Committed (Text, e.g., "1 Core + 3 Hooks / month")
   - Monthly Video Target (Number)
   - Raw Footage Folder (URL)
   - Performance Rating (1-5 Stars)

2. A CSV/TSV table template pre-populated with our first 3 onboarding creators:
   - Cassidy (Fit Mom / Transformation / Busy Routine, Sourced via Trybe, 2 test videos committed)
   - Kilee (Fitness & Lifestyle / Dance, Sourced via Trybe)
   - N. Yarrow Davis (ADHD / Autoimmune / Holistic Wellness & Habits, Sourced via Inbound)

3. A 'Master Ad Concepts & Hooks' relation table with fields:
   - Concept ID (e.g., C-01)
   - Angle Pillar (Nutrition, Workouts, Life Stages/Cycle, App Detox, Mental Load)
   - Hook Copy (3-sec opener)
   - Body Summary
   - Assigned Creator(s)
   - Meta Ad Set Link
   - Current CPI (€)
   - Status (Draft, Testing, Winner, Fatigued)manual/generated/template provenance, update timestamp and revision.
3. Split domain-specific save/activate operations. **Current `saveGeneratedPlans` deactivates active nutrition, fitness and wellness plans together.** Retain a compatible wrapper where needed, but ensure generating one domain cannot deactivate another domain's manual plan.
4. Add owned get/update/duplicate/archive routines and program scheduling. Derive the current user from authenticated identity; reject access to another user's plan even if its ID is supplied.
5. Store dated planned meals separately from consumed diary entries. Use local calendar dates and the user's timezone. Preserve food/exercise references plus the data needed to interpret historical logs after catalog/template edits.
6. Make generation/save/log requests retry-safe. Protect newer draft edits from late generation results using request IDs/revisions. Activate a new plan only after validation and successful persistence; retain the previous active plan on failure.
7. Keep one effective calorie/macro target source shared by Settings, Fuel, onboarding and plan generation. Do not let a generated meal plan silently overwrite manually chosen targets.

**Acceptance:** old plans load unchanged; cross-user access fails; manual fitness survives nutrition regeneration; retries do not create multiple active plans; switching modes preserves history.

## 2. Shared manual fitness builder and Move

**Existing files:** `components/AIRoutineModal.tsx`, `app/(tabs)/move.tsx`, `components/move/MoveQuickActions.tsx`, `convex/routines.ts`, `app/four-week-plan.tsx`.

**Proposed routes/components:** `app/fitness-plan-builder.tsx`, `components/move/PlanEditor.tsx`, shared exercise prescription controls.

- Extract/reuse useful manual builder logic from the currently unmounted AIRoutineModal. Replace hardcoded theme/text/unit assumptions with project conventions.
- Build a program containing named workout days and reusable routines. Select exercises from the existing library; add/edit/remove/reorder them; set reps or rep ranges, sets, rest, optional load and notes.
- Support blank/template/generated entry, draft autosave, duplicate routines/programs, assign weekdays and preview before activation.
- Add **My Plans**, **Create Plan**, **Resume Draft**, **Edit Plan** and **Start Empty Workout** entry points in Move. Surface these contextually instead of adding every action to the main dashboard.
- Route generated plans through the same editor and workout start flow. Decide which plan is active explicitly rather than relying on AI > database > static fallback precedence.

**Acceptance:** a user builds a two-day program, closes/reopens the app, edits and duplicates it, then starts the correct routine from Move. Editing it never changes a completed session.

## 3. Shared manual nutrition builder and Fuel

**Existing files:** `app/(tabs)/fuel.tsx`, `components/fuel/QuickActions.tsx`, `components/fuel/modals/MonthlyMealsModal.tsx`, `app/meal-hub.tsx`, `app/settings.tsx`, `convex/plans.ts`.

**Proposed routes/components:** `app/meal-plan-builder.tsx`, `components/fuel/MealPlanEditor.tsx`, shared nutrition target editor; a focused Convex planned-meal module if needed.

- Reuse existing target settings, food search, saved foods and recipe selection. Offer blank week, template and edit-generated-plan entry points.
- Add foods/recipes to a local date and meal slot; edit servings; calculate planned energy/macros from canonical serving quantities; show progress toward the day's targets.
- Move/replace meals, copy a day, repeat a week and save reusable combinations. Copying a plan creates planned entries only.
- Add **My Meal Plan**, **Build My Plan**, **Resume Draft** and **Edit Targets** in Fuel. Preserve existing diary/photo/voice/recipe features.
- Provide an explicit **Log Meal** action with date/serving confirmation and duplicate protection. A deliberate second serving remains possible; retrying the same request must not double-log.
- Existing AI meal swaps become one replacement option alongside manual food/recipe selection.

**Acceptance:** a user builds meals for three dates, adjusts portions, copies a day, restarts and sees the same plan; nothing enters the diary until logged; changes to planned meals leave prior consumed entries intact.

## 4. Onboarding routing, personalization and real preview

**Primary files:** `app/onboarding.tsx`, `convex/onboarding.ts`, shared builders above, existing onboarding components and locale catalogs.

1. Show a concise welcome using actual product screens and explain the outcome of setup. Respect device locale and existing overrides.
2. Collect shared profile information once. Make health import optional; prefill only fields actually supported and authorized, with editable confirmation and a working denial path.
3. Ask the independent fitness and nutrition planning choices. Preserve answers when navigating backward or changing choices.
4. Guided fitness: explicit days/week, minutes/session, experience, equipment/limitations, outside cardio, preferred split and optional muscle priorities. Put weighted pull-up/dip preferences in optional exercise settings.
5. Guided nutrition: preferences/restrictions, cooking time and practical meal requirements. Manual nutrition opens the target review and meal builder; manual fitness opens its builder. Tracking-only skips plan generation.
6. Show a concise editable answer summary. Generated choices run actual domain-specific generation; manual choices show saved content/draft state. Handle retries and partial success per domain.
7. Show actual workout days/exercises and/or planned meals/targets before the existing subscription transition. Users can enter the app with a saved draft or use tracking if generation fails.
8. Use contextual explanations of recommendations and interactive controls from the screenshot review. Do not present animated volume/recovery estimates as measured facts or guaranteed progress.

**Acceptance:** test all nine fitness/nutrition mode combinations, mixed-mode backward navigation, interrupted setup, permission denial, generation failure, restart/resume and existing non-fitness focus paths. No manual/tracking selection is silently converted into guided mode.

## 5. Workout execution and progress

**Primary files:** `components/move/modals/ActiveWorkoutModal.tsx`, `convex/workoutSessions.ts`, `convex/workoutExerciseLogs.ts`, `app/workouts.tsx`, schema.

- Populate previous comparable sets from completed sessions using stable exercise IDs and consistent units.
- Add warm-up/work/drop/failure tags, superset groups and optional RPE; persist fields end to end. Define how warm-ups and unilateral exercises affect working-volume totals.
- Save/resume active sessions, honor kg/lb preferences and preserve explicit rest settings. Verify timer behavior through backgrounding.
- Add PRs, estimated 1RM where applicable, exercise trends and weekly per-muscle working sets. State the estimation method and limitations; avoid invented values when history is absent.
- Add plate loading and configurable warm-up calculators that respect available plates/bar weight and rounding.

**Acceptance:** meaningful tests for load conversion, volume, PR/e1RM calculation, warm-up exclusion, previous-session retrieval and superset order; device verification for interrupted workouts and timers.

## 6. Nutrition convenience and data quality

**Primary files:** `convex/externalFoods.ts`, food search/detail components, `convex/shoppingList.ts`, `app/shopping-list.tsx`, recipe and nutrition insight modules.

- Connect existing barcode lookup to an Expo camera scanner; handle permission denial, repeat detections, no match and user confirmation before logging.
- Aggregate groceries for selected plan dates. Scale ingredients by servings, merge only compatible ingredient/unit pairs, allow pantry exclusions and preserve manual list items on refresh.
- Add recipe URL import with server-side URL validation, timeouts/size limits, ingredient matching and mandatory review of uncertain matches/servings.
- Expand daily/weekly nutrient views with source and completeness indicators. Unknown nutrient values remain unknown rather than being counted as zero.

**Acceptance:** device barcode tests, serving/unit/aggregation fixtures, invalid URL/error cases, incomplete food data, and no accidental shopping-list duplication.

## 7. Adaptive guidance

**Depends on reliable completed sessions, intake and weight history from previous phases.**

- Suggest next-session load/reps from comparable performance, completion and optional effort feedback. Explain and let users accept/decline changes; manual plans remain user-controlled.
- Add nutrition check-ins with trends, minimum data requirements and reviewable target suggestions. Keep meal selection mode independent. Do not infer precise expenditure from sparse or incomplete logs.
- Centralize formulas and recommendation bounds, persist recommendation versions and show why a change was suggested. Validate with scenario fixtures before enabling broadly.

**Acceptance:** sparse/missing/noisy data produces no false precision; declined suggestions do not modify targets; manual mode never changes automatically.

## 8. Migration, wearables and optional motivation

- Import Hevy/Strong exports using format adapters, preview/mapping, unit normalization and duplicate detection. Provide account-data export with owned records only.
- Build Apple Watch/Wear OS workout logging and lock-screen timer surfaces as separate native deliverables with explicit phone/watch sync conflict rules. Existing health sync is not a substitute. Native targets, platform capabilities and physical device builds must be verified before claiming completion.
- Expand health reads/writes only for supported data categories with granular permissions and deduplication.
- Add opt-in program/workout sharing and later strength ranks/challenges if desired. Define ranking calculations, privacy, visibility and abuse controls before public leaderboards.

**Acceptance:** import retries preserve counts and units; wearable interruption/offline reconciliation is tested on supported devices; private data is not shared by default.

## Rollout and validation

Deliver in order: persistence → both builders → onboarding integration → daily workout/nutrition tools → adaptive guidance → native/social extensions. Builders can be validated independently before onboarding depends on them.

Use additive schema changes and legacy read adapters first. Avoid destructive backfills. Exercise each new flow with an existing account and a fresh account. Keep unfinished capabilities hidden until their UI/backend pair works.

Run `npm run typecheck`, `npm run lint` and `npm run build:web` at appropriate integration milestones. Record pre-existing failures separately. Add targeted behavioral tests for ownership, mode isolation, retries, history preservation and numerical/date logic; the current package has no test script, so select a minimal repository-compatible harness during implementation rather than assume a runner exists.

Validate on iOS/Android where available: every app theme, supported unit systems, translated/long text, keyboard/small screens, screen-reader labels, timezone/DST changes, back navigation and interrupted requests. Browser-only checks cannot verify camera, health permissions, native timers or wearables.

Track onboarding completion by mode, draft resumption, first saved plan, first completed workout/meal log and generation errors using non-sensitive event properties. Compare before/after without recording meal contents or health answers in analytics.

Existing uncommitted changes are present in Fuel, workout/plan screens, signup, configuration and package files. Preserve and integrate them; do not reset or overwrite the checkout. Implementation completion must report shipped features, checks performed and native/external dependencies still unverified.
