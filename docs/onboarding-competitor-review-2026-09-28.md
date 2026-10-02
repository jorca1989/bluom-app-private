# Bluom onboarding: Hevy and Lift review

Update, 29 September: [manual fitness and nutrition paths and feature-gap audit](onboarding-manual-plans-feature-gap-audit-2026-09-29.md). The two domains need independent “build it for me / I'll build it myself” choices, backed by persistent tools in Move and Fuel.

Reviewed on 28 September 2026 in the user's existing Chrome WhatsApp session. Scope starts immediately after the two messages dated 27 September at 00:36 and 13:02 identified by the user, and ends at the 28 September 11:17 comparison message. Screenshots were opened and inspected; captions and separate replies were read in the chat. No app implementation changes were made.

## Evidence and interpretation

The user identifies white-background screenshots as Hevy and black-background screenshots as Lift. Some early captions say “Heavy” beside black screenshots; this review follows the user's explicit identification. Animations and navigation between uncaptured screens are described in the user's notes; still screenshots do not independently establish those behaviors. Competitor prices and ratings below are screenshot observations, not current verified offers or metrics to copy.

### Hevy

- **27 Sep 23:11, two Apple Health permission images:** write access for waist circumference, active energy, workouts, lean body mass, weight and body-fat percentage; read access for waist circumference, active energy, date of birth, heart rate, lean body mass, weight, body-fat percentage and sex. These are Apple Health screenshots, not evidence of Android Health Connect parity.
- **23:25–23:29, nine-image album:** the premium screen has a vertically scrolling feature area with product illustrations, followed by social proof, comparison and FAQs. Pricing and the subscribe action stay in the lower portion across the captures. Features include unlimited routines, Hevy Trainer, graph history, custom exercises, advanced statistics, body measurements and warm-up calculation. Later screens show user reviews, an Apple feature badge, Free/Pro comparison, FAQs, support, restore purchases and legal links. The final image is a welcome carousel showing an actual workout logging interface.
- **23:39, separate message:** health connection came before the main questions; app language followed the phone; birth date was prefilled; users could choose guidance or create routines; the user also noted friend sharing/email and an acquisition-source question. These are reported observations; their exact screens were not included in this album.
- **28 Sep 11:17, final reply:** the user specifically wants attention to the illustrated premium features before pricing and broader health integration.

### Lift, in the sequence captured

| Time | Image and associated observation |
|---|---|
| 27 Sep 23:39 | “Track all your workouts” with a large real workout UI preview. Caption calls attention to product screenshots on welcome. |
| 23:45 | Four goals: Build Muscle, Maintain–Recomp, Strength & Performance, Lose Fat. Caption highlights fewer choices and the strength/performance goal. |
| 23:46 | Goal-specific reassurance with a progression graph. The user describes this as more visual, animated feedback than Bluom's toast. |
| 23:50, reply 23:53 | Weekly-volume explainer and “Calculate my optimal volume” button. The separate reply says this leads to training-experience questions. |
| 23:55 | Volume result showing 8 sets per muscle per week and a colored indicator. Caption says this follows stress and sleep answers and animates. A separate message notes lifting-progress tables and graphs. |
| 23:58 | “Build my plan” versus “I'll set it up myself,” illustrated with a four-day schedule. |
| 28 Sep 00:01 | “Solid base… training smarter” interstitial. Caption says choosing a built plan prompted sex, age, weight and height beforehand; the user was unsure of this interstitial's purpose. |
| 00:02 | Days-per-week stepper, showing 4 and a recommendation. Caption prefers its interactive presentation. |
| 00:03 | Session duration: 45, 60 or 75 minutes. Caption flags this as missing in Bluom. |
| 00:04 | Cardio outside lifting: None, Light, Moderate, High, with concrete frequency examples. Caption flags this missing distinction. |
| 00:06 | Separate toggles for weighted pull-ups and weighted dips. Caption notes missing exercise preferences; a separate reply specifically calls out the two toggles. |
| 00:08–00:11 | Optional muscle priorities: front/back body diagram, a tag-selection sheet, up to two selections, then corresponding highlighted regions. User flags compatibility with all Bluom themes as a concern. |
| 00:12 | Full Body, Upper Lower, Push Pull Legs; Upper Lower is recommended. Caption flags missing training-structure choice. |
| 00:13–00:15 | Two captures of a summary: goal, weekly volume, sessions, duration, street lifting, split, muscle priorities, a progression-potential indicator and an optional referral-code entry. The user speculates the code could support influencers or store offers; this purpose is not verified. |
| 00:15–00:17 | Personalization progress screen, then two plan-preview captures with named workout days and exercise counts. Separate replies identify the end of onboarding and the screen immediately after generation. |
| 00:20 | Compact paywall: outcome headline, social proof, four benefits, annual/monthly choices, trial/billing disclosure and one CTA. Caption: much simpler than Hevy. |

## What Bluom already has, based on code

- `app/onboarding.tsx`: focus-based branches; goals, experience, workout preference, general activity, weekly hours, commitment, sleep, stress, equipment and limitations. Also a goal estimator, toast feedback, a Blueprint results screen and a calibration animation.
- Current onboarding asks **weekly hours**, not explicit sessions plus duration. The existing fitness plan schema can hold days per week, split and workout duration, but these are generated rather than collected as these explicit preferences.
- The Blueprint reveals a calorie target but covers much of the fitness and other content with “PRO INSIGHTS.” It does not provide Lift's concrete workout schedule preview.
- Calibration currently runs a fixed 3.6-second animation before saving the profile and routing to premium. This handler does not generate the workout plan during that animation.
- `convex/plans.ts`: generated plans include split, days per week, workouts, duration, sets/reps/rest. The prompt uses weekly time, experience, goals, sleep and stress. New preferences need schema, persistence, generation and validation support, not only new screens.
- `app/premium.tsx`: annual plan first, other plans behind an expander, then a long feature checklist. There is no comparable illustrated feature sequence before pricing.
- `hooks/useHealthSync.ts`: existing read integration covers steps, active calories, distance, weight, body fat, heart rate, resting heart rate and sleep. Hevy's scope is different, not simply a superset: Bluom already reads several categories absent from these Hevy captures. Write support and onboarding prefill are the useful gaps to assess.
- `i18n.ts` already detects device language and preserves user overrides. Reuse this rather than adding another required language question.
- Preview calorie/macro calculations in onboarding differ from the backend calculation. A new plan preview should use one authoritative calculation so displayed and saved results agree.

## Proposed experience

Retain Bluom's focus branches. The following expanded training flow applies to Fitness and the fitness portion of Holistic; it should not lengthen the Mental Health branch.

1. **Show the product:** short welcome with real Bluom workout, nutrition and progress previews, adapted to the selected focus.
2. **Reduce duplicate entry:** optional health connection with a concrete prefill benefit; review and edit available imported values. Keep manual entry available and preserve language overrides.
3. **Choose the outcome:** clear goal cards, including Strength & Performance if supported end to end. Explain the selected goal with one useful visual.
4. **Choose assistance:** build a plan for me or set up my own. The manual path skips generator-specific questions and leads to a usable routine builder.
5. **Collect meaningful constraints:** experience, equipment, limitations, sessions per week, session duration, outside cardio, sleep and stress. Reorganize existing questions rather than only appending new ones.
6. **Show what changes:** explain the recommended training load using the answers. Treat volume as an adjustable starting recommendation; do not copy a fixed “8 sets” result or unsupported progress promises.
7. **Optional training preferences:** up to two priority muscles; recommended split with an override; weighted pull-up/dip preferences only when relevant to the user's equipment and experience.
8. **Review and edit:** concise summary of all plan-affecting choices, including why the split was recommended. Keep referral entry optional and secondary.
9. **Build and preview:** progress tied to actual save/generation work, followed by named days, exercise counts, approximate durations, muscle focus and nutrition targets. Preserve the same plan after upgrade; provide retry/recovery on failure.
10. **Present premium value:** combine Hevy's product visuals with Lift's brevity. Use a few focus-relevant visual benefits above clear plan choices and a persistent CTA. Show genuine billing/trial terms from the store; use only Bluom's substantiated social proof. Keep extended comparison/FAQ available below.

## Implementation order

**Phase 1 — Make the existing value visible.** Add product previews, clearer goal feedback, an editable summary and a concrete plan preview. Unify preview/backend calculations. Tie progress to actual work. Redesign premium around a small number of illustrated benefits. This addresses the biggest presentation gap before adding many questions.

**Phase 2 — Make personalization real.** Add explicit training frequency, duration, outside cardio, split preference, priority muscles and conditional exercise toggles. Carry these through user types, Convex validators/schema, save/load and plan generation. Verify the resulting schedule respects them. Use a neutral front/back SVG body diagram with theme-token highlights and matching labels; avoid separate raster images for every theme.

**Phase 3 — Integrations and acquisition.** Add optional health prefill and useful write-back with platform-specific capability checks and duplicate prevention. Then implement referral attribution/redemption, acquisition-source capture and friend-sharing entry points as separate optional flows. Do not assume an influencer referral code is an App Store offer code.

Validation should cover both plan paths, every theme, long translations, back navigation and answer preservation, denied/partial health permissions, generation failure, consistent preview/saved plans, and correct subscription state. Track step drop-off, time to first plan, preview-to-upgrade conversion and first completed workout. Compare improvements against the current flow rather than assuming competitor patterns convert better.

## Suggested first design decision

Start with the Fitness flow and the sequence **answers → editable summary → real plan preview → illustrated, concise paywall**. Keep the broader integration and referral work separate so it does not block the core onboarding improvement.
