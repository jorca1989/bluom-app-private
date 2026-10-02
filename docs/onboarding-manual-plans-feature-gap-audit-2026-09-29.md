# Manual plans and competitor feature gaps

29 September 2026. Supplement to [the screenshot review](onboarding-competitor-review-2026-09-28.md). Planning only; no application changes. Bluom findings are from source inspection, not a device test. “Not found” means not found in the audited paths, not proof that no implementation exists anywhere.

## Screenshot clarification

The review included Lift's black UI screenshots and their captions/replies. In particular, the 27 September 23:58 screenshot offers “Build my plan” and “I'll set it up myself.” Later captures cover days, duration, outside cardio, weighted pull-ups/dips, muscle priorities, split, summary, generated plan and paywall. The original review recorded the manual choice but did not elevate it sufficiently in the recommendation.

Applying this choice to nutrition is a Bluom requirement, not a claim that the captured Lift flow offered nutrition planning. Lifta's exact identity is not confirmed: https://liftaapp.com/ did not return readable feature documentation. Do not conflate Lifta, Lift and Liftoff.

## Required onboarding behavior

Offer independent choices for each enabled domain. Someone must be able to choose manual training and generated nutrition, or the reverse.

| Domain | Build it for me | I'll build it myself | Optional low-friction alternative |
|---|---|---|---|
| Fitness | Ask training-specific questions, generate a real editable program, preview before activation | Start blank or from a template, choose exercises and sets/reps/rest, arrange workout days, preview and save | Just track workouts |
| Nutrition | Ask food preferences, restrictions, cooking time and household needs; generate an editable meal plan | Confirm/edit existing calorie and macro targets, choose foods/recipes and portions for dated meal slots, preview and save | Just track food |

Keep basic profile questions shared. Ask generator-specific questions only when relevant. Manual users can skip detailed programming questions and return later. Do not require a complete week before entering the app: preserve drafts and surface a clear resume action.

For guided fitness, add explicit days/week, minutes/session, outside cardio, preferred split and optional muscle priorities. Weighted pull-up/dip preferences can live under advanced exercise preferences. Present recovery/volume estimates as adjustable recommendations, not guaranteed results.

The final screen must show actual saved/generated content. Current onboarding runs a fixed 3.6-second calibration, saves profile answers and routes to premium; that handler does not generate the displayed workout program. Replace this with real pending/success/failure states and a usable draft on failure.

## What Bluom already has, and the actual gaps

| Capability | Source evidence | Gap or next action |
|---|---|---|
| Manual routine creation | `components/AIRoutineModal.tsx` supports library selection, sets/reps/weight and saving. `convex/routines.ts` has create/list/delete. | The modal is imported in `app/(tabs)/move.tsx` but no JSX mount or open action was found. Expose it, then add editing, duplication, ordering and scheduling. Its AI tab's generate button is a Coming Soon alert; other app generation flows exist separately. |
| Workout logging | `ActiveWorkoutModal.tsx` and `convex/workoutSessions.ts` support set logging and rest timing. | Add warm-up/drop/failure set types, supersets and calculators. Backend RPE support exists, but the inspected set-saving UI does not send it. |
| Exercise progress | `convex/workoutExerciseLogs.ts` and `app/workouts.tsx` have history/progress queries. | Do not rebuild all history. Wire previous performance into the active session; add estimated 1RM, coherent PR presentation and weekly muscle-volume views. Previous-weight/reps fields are displayed in the active logger but no population was found there. |
| Adaptive programming | Existing generated plans and basic workout statistics | A performance-driven progression/recovery loop was not found. Generation alone does not establish adaptive coaching. |
| Manual nutrition targets | `app/settings.tsx` lets users save daily calories, protein, carbs and fat. | Reuse this capability in nutrition onboarding and Fuel. It is not missing. Verify the same saved targets drive diary totals and plan calculations. |
| Food and recipe tracking | Fuel supports search/manual/photo/voice logging, custom recipes, hydration and fasting. | These are existing strengths, not gaps. Manual food logging does not create a future meal plan. |
| Meal planning | `MonthlyMealsModal.tsx` shows templates/generated meals and supports per-meal AI regeneration and logging. | Add manual food/recipe selection into dated meal slots, portions, moving/copying days and repeating weeks. Meal swapping already exists. |
| Shopping lists | Manual items and recipe ingredients can be added. | Whole-plan ingredient aggregation, compatible-unit merging and pantry exclusion were not found. |
| Barcode scanning | `convex/externalFoods.ts` has `lookupBarcode`; FoodSearchModal contains a placeholder comment for a scanner. | Wire a reachable camera scanner and confirmation flow. Label-photo recognition is a separate existing capability. |
| Nutrient analysis | Food detail UI includes several vitamins/minerals. | Expand completeness/source indicators and daily/weekly nutrient targets; do not claim micronutrients are wholly absent. |
| Recipe import | Custom recipe creation/editing exists. | Recipe URL import and ingredient-matching review were not found. |
| Wearable workout logging and migration | Health sync exists; it is not a wearable workout logger. | Apple Watch/Wear OS set logging and Hevy/Strong history import were not found in this audit. Treat as separate later projects. |

## Tools that should remain available after onboarding

### Move

- A visible My Plans entry with Create Plan, Edit, Duplicate and Schedule actions.
- Shared builder for manually authored and generated plans; allow exercise replacement, reordering, rest settings and optional exercise notes.
- Start an empty workout without constructing a program first.
- Show the last comparable performance while logging; expose progress from an exercise.
- Switching planning mode must preserve completed sessions and history. Editing a template must not rewrite past workouts.

### Fuel

- A visible My Meal Plan entry, separate from today's food diary.
- Target editor reusing existing calorie/protein/carbs/fat settings.
- Choose a date and meal slot; add saved recipes or foods, adjust portions, and see planned totals versus targets.
- Copy meals/days, repeat a week, and replace individual meals manually or with AI assistance.
- Generate a shopping list from selected plan dates and exclude pantry items.
- Planned food becomes consumed food only through an explicit Log action. Editing a plan must not change historical diary entries.

## Competitor evidence and implications

Official documentation checked 29 September 2026; these are documented capabilities, not hands-on verification or claims of regional/subscription availability.

- [Hevy feature guide](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide): advanced set types, supersets, previous performance, RPE, plate/warm-up calculators, estimated 1RM and muscle statistics. Trainer offers performance-based weight/repetition recommendations. Implication: prioritize logging depth and useful progress feedback.
- [Liftoff](https://info.liftoffrank.com/ai-workout-tracker): strength ranks, quests/leaderboards, multi-week editable programs, history import, body measurements, watch support and lock-screen rest timers. Implication: migration and workout convenience are useful follow-ons; competitive ranks are optional, after core planning works.
- [Fitbod](https://help.fitbod.me/hc/en-us/sections/360001078993-How-Fitbod-Works): programming informed by training performance, equipment, recovery and feedback. Implication: build a feedback loop, not just a one-time generated plan.
- [MacroFactor program styles](https://help.macrofactorapp.com/macro_program/program_styles): coached, collaborative and manual targets, with weekly adjustments in coached/collaborative modes. Implication: separate who controls targets from who selects meals. Bluom already permits manual targets; adaptive check-ins remain a separate opportunity.
- [MyFitnessPal Meal Planner](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-to-use-the-Meal-Planner): dated meal planning, preference controls, swaps, diary logging and pantry-aware groceries. Availability depends on country, language and subscription. Implication: connect planning, cooking/shopping and actual consumption without merging their records.
- [Cronometer features](https://cronometer.com/features/) and [recipe importer](https://cronometer.com/blog/recipe-importer/): broad nutrient coverage, barcode logging and URL recipe import. Implication: finish barcode access and improve food-data depth before adding more disconnected AI entry points.

## Delivery order and acceptance criteria

1. **Manual paths and durable plans:** independent fitness/nutrition choices, reachable shared builders, save/resume/edit, schedule and actual preview. Reuse routine and target infrastructure. A user can finish onboarding with either mixed combination, restart the app and resume the same plan.
2. **Daily-use quality:** previous workout values, set types/RPE, manual meal calendar, copy/repeat, barcode and plan-derived groceries. Logging planned meals is explicit and cannot silently duplicate entries; past workout/food logs remain unchanged when templates change.
3. **Feedback and analysis:** muscle volume/PR/e1RM, nutrition trends, user-reviewable adaptive suggestions, then imports and wearable logging. Validate calculations, units and incomplete data before displaying recommendations.
4. **Optional motivation:** ranks, leaderboards and richer social sharing only after the core workflow is dependable.

Implementation proposal: persist independent `fitnessPlanMode` and `nutritionPlanMode`, plus active plan references and resumable draft state. Use stable exercise/food/recipe references with historical snapshots for completed logs. Prefer shared builder routes over two large modal implementations inside Move and Fuel. Review schema migrations, ownership checks and existing generated-plan storage before selecting exact tables. All new screens must use existing theme/i18n/unit systems; the dormant routine modal needs adaptation here.
