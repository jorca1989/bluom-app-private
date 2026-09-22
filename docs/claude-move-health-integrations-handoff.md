# Claude Handoff: Move, Health, Profile, and Wearable Polish

## Objective

Finish and correct the existing first vertical slice. This is a product-polish pass, not a rewrite. Preserve the working Apple Health integration and do not change unrelated features.

## Non-Negotiable Product Rules

- Do not silently create a new workout-set row when the user uses voice.
- Machine recognition is a **Move-tab utility**, not an in-workout accordion control.
- iPhone shows Apple Health only. Android shows Health Connect only.
- Profile must not duplicate Discover content. Weight Journey belongs in Discover, not in the removed Profile sections.
- Never show demo health values as if they came from a device or lab.
- No unverified medical claims, diagnosis, or treatment advice.

---

## 1. Voice Workout Logging: Update or Delete Sets Cleanly

### Current cause

`components/move/modals/ActiveWorkoutModal.tsx` passes `nextSetIndex={sets.length + 1}` into `VoiceWorkoutLogModal`. In `applyVoiceProposal`, the `while (exercise.sets.length <= targetIndex)` loop appends rows. That is why a normal voice log creates a new raw/set row.

### Required UX

1. A voice command should target an existing set by default:
   - Default target: first incomplete set for the selected exercise.
   - If all are completed: default to the last completed set.
   - The review UI must show `Update Set 2` (or the appropriate set), not `Next Set 4`.
2. Add a compact target-set selector in `VoiceWorkoutLogModal` before recording/reviewing. It must list the existing set rows and offer one explicit final option: `Add a new set`.
3. An explicit spoken set number, such as `set 3, 80 kg for 10`, overrides the selected target if it exists.
4. Only append a row when the user explicitly chooses `Add a new set` or the parser identifies an unambiguous add-set instruction. Never append just because the modal opened.
5. Keep the parse-review-Apply flow. Nothing writes until Apply.
6. Add a visible trash icon to every existing set row in the active accordion, with an accessible label such as `Delete set 2`. Confirm deletion. Do not let an exercise have zero rows; retain one blank row or offer `Remove exercise` separately.

### Persistence

- The current `workoutSetEvents` design already has a session and set index. Add a secure `deleteSet` mutation in `convex/workoutSessions.ts` that verifies the current user owns an active session before deleting that event.
- The client must remove the same local row only after the mutation succeeds; show an inline retry/error state on failure.
- Use stable client event IDs for an existing set, derived from the session, exercise, and set identity. Re-applying voice values must update the same persisted set event, not create a second event.
- Do not renumber historical completed sets in the database. Keep each set event’s identity stable.

### Acceptance tests

- Start with three rows, voice-log `80 kg, 10 reps`, Apply: only the first incomplete row updates.
- Choose `Set 2`, voice-log it: only Set 2 changes.
- Choose `Add a new set`: exactly one fourth row appears.
- Delete a completed set: its durable event is deleted and final session total-set/volume calculations exclude it.
- Deny microphone permission, parse failure, and mutation failure: no local or durable phantom row.

---

## 2. Move Gym Machine Identifier: Move It Out of Active Workout

### Current cause

`MachineIdentifierModal` is imported, state-owned, and rendered in `ActiveWorkoutModal`. The camera button is in the expanded exercise accordion around the voice button. This is the wrong information architecture.

### Required UX

1. Remove all machine-identification UI, imports, and state from `ActiveWorkoutModal.tsx`.
2. Keep `MachineIdentifierModal` as a reusable modal, but mount it from `app/(tabs)/move.tsx`.
3. Add a full-width `Identify gym equipment` card directly **below Move Insights**. It should have a camera thumbnail/icon on the left, concise title/subtitle, and one clear tap target.
4. Add `machineIdentifier` to the Move widget registry/config so users can hide it. Default: enabled.
5. After a photo/gallery analysis, show the existing confidence, setup guidance, safety note, and a confirmation step. On confirmation, route into the exercise-library/logging flow with the suggested exercise prefilled. It must not silently append an exercise to an already active workout.

### Optional follow-up: swipeable action cards

Replace the three-button `MoveQuickActions` grid with a horizontal FlatList/ScrollView of six fixed-width cards:

1. Exercise Library
2. Add Steps
3. Custom Exercise
4. Identify Equipment
5. Outdoor Activity
6. Workout Plan

Use a small icon or thumbnail column on the left and text on the right. Cards should have stable width and height, scroll horizontally, and not rely on cramped two-column buttons.

Apply the same card presentation to Fuel Utilities, but **do not change Fuel’s widget configuration**; it already exists.

---

## 3. Health Markers: Real Persistence, Safe Demo Data, and Better Values

### Current state

`healthMarkerMeasurements` and `healthProtocols.logMarker` exist and save numeric measurements. `app/mens-health.tsx` writes markers, but currently does not query the persisted history back into the UI. `markerValues` is transient state.

### Required implementation

1. Add a `listRecentMarkersForUser` query that returns the latest measurements per marker, plus a short chronological history for charts.
2. Render saved readings and a small three-point trend in the Men’s Health marker screen. Each data point must display date, source, value, and unit.
3. Fix blood pressure before demo data:
   - A value such as `118/76` cannot be stored by the current numeric-only `value` schema.
   - Implement separate `bpSystolic` and `bpDiastolic` marker fields/records, each in `mmHg`, or add a structurally typed blood-pressure measurement. Do not parse `118/76` with `Number()`.
4. Add a **development-only** `Load sample readings` action. It must be excluded from production builds, clearly labelled `Sample data`, and include `source: manual` plus a `Sample data — delete before production` note.
5. Add a `Remove sample readings` action that deletes only the records created by the sample seed. Never pre-populate health data automatically.

### Demo values for visual QA only

Create three dated readings, one week apart, in a safe/ordinary range:

| Marker | Week 1 | Week 2 | Week 3 |
| --- | ---: | ---: | ---: |
| BP systolic (mmHg) | 118 | 121 | 117 |
| BP diastolic (mmHg) | 76 | 78 | 75 |
| Haematocrit (%) | 45.2 | 46.1 | 45.6 |
| LDL (mg/dL) | 94 | 101 | 96 |
| ALT (U/L) | 22 | 25 | 21 |
| PSA (ng/mL) | 0.8 | 0.9 | 0.8 |

These are interface fixtures, not health guidance. Keep the existing warnings restrained and direct users to a clinician for concerning results.

---

## 4. Men’s Pelvic Protocol: It Was Not Properly Upgraded

The current men’s pelvic feature remains a basic 5s/5s timer. `handleFinishPelvic` writes through `api.mensHealth.logSession`; it does **not** use the new `pelvicFloorSessions` table, selected program state, or session history. The new durable pelvic-session implementation is currently women-focused.

### Bring the Men’s Experience to the Same Standard

1. Use `api.guidedSessions.logPelvicFloorSession` with `audience: 'men'`.
2. Add three programs, with clear non-medical names and brief cues:
   - Gentle coordination: 4s contract / 6s release
   - Strength: 6s contract / 4s release
   - Relaxation: 3s gentle contract / 9s full release
3. Include a session timer, completed-round progress, pause/resume, end-and-save, and a recent-history summary.
4. Do not claim treatment for erectile dysfunction, urinary disease, or pain. Show a concise safety note: stop for pain, pressure, or worsening symptoms and seek a qualified clinician when appropriate.
5. Keep it visually aligned with the women’s pelvic screen, but do not copy women-specific lifecycle wording.

---

## 5. Profile: Remove Duplicate Discover Blocks; Put Weight Journey in Discover

The Profile screen currently declares `ProfileWidgetId = 'hero' | 'achievements' | 'stats' | 'account' | 'health' | 'tools' | 'support'` and renders both `HEALTH & TRACKING` and `TOOLS` sections.

### Required changes

1. Remove the full `HEALTH & TRACKING` and `TOOLS` sections from `app/(tabs)/profile.tsx`.
2. Remove `health` and `tools` from `ProfileWidgetId`, `PROFILE_WIDGETS`, default widget values, config UI, and persisted-profile-widget migration logic. Old stored values must be ignored safely.
3. Keep Support, Account, appearance/settings, privacy, and sign out intact.
4. Add Weight Journey to the Home/Discover experience, not Profile:
   - Create a Discover card linking to `/weightmanagement`.
   - Add it to the Home widget configuration as `weightJourney` so it can be toggled independently.
   - The card must remain present in the relevant Discover area on phone and tablet layouts, without crowding the existing cards.
5. Do not touch Fuel Utilities’ widget configuration.

---

## 6. Apple Health and Google Health Connect: Platform-Correct UI

### Bug to fix now

`app/integrations.tsx` has platform metadata (`available: Platform.OS === 'ios'` for Apple Health and Android equivalent for Health Connect), but `visible()` currently returns `true` for every integration. Also, both items resolve connection state from one shared `healthConnected` boolean. That is why an iPhone can appear to toggle Health Connect.

### Required changes

1. On iOS, render only Apple Health. On Android, render only Health Connect. Do not show the other card as connected, disconnected, or coming soon.
2. Make `visible(item)` enforce `item.available` and its platform field.
3. Make per-card status source-aware. Apple Health status belongs only to Apple Health; Health Connect status belongs only to Health Connect.
4. Preserve the working HealthKit behavior and its successful permission flow.
5. Add platform test coverage:
   - iOS: Apple Health card visible; Health Connect absent.
   - Android: Health Connect visible; Apple Health absent.
   - Both: connect, permission-denied, sync, revoke, and disconnect states are clear and truthful.

---

## 7. Wearables and Vendor Integration Roadmap

Do not build a separate integration per phone brand first. Bluom should use Apple HealthKit and Android Health Connect as the aggregation layer, preserve data-origin metadata, and only add direct OAuth/partner integrations where they add meaningful data or reliability.

### Phase 1: finish the aggregators

- **Apple Watch / iPhone:** Apple HealthKit remains the single iOS path.
- **Android watches and apps:** Health Connect is the main Android path. It can carry user-authorized data such as steps, workouts, sleep, heart rate, routes, and mindfulness records.
- **Samsung / Galaxy Watch:** Samsung Health can sync activity, heart rate, and sleep to Health Connect. Do not build a Samsung-only connector until a verified data gap justifies it.
- **Oppo, Xiaomi, and other Android ecosystems:** support them through Health Connect when their vendor app exposes the needed records. Do not claim coverage for a vendor/device unless it passes a physical-device test.
- Maintain a normalized `source`, `device manufacturer`, `model`, record time range, and external ID. Deduplicate before showing daily summaries.
- Never read data from Health Connect and write it straight back as Bluom data; that causes duplication/attribution problems.

### Phase 2: direct integrations with clear value

- **Oura:** OAuth server-side integration for readiness, sleep, daily activity, heart-rate, workout, and SpO2 scopes. Requires secure token storage, refresh rotation, user disconnect/revocation, and an approved production application.
- **Fitbit / Pixel Watch:** OAuth Web API connector for users who do not share required data through Health Connect or need Fitbit-specific data.
- **Garmin:** evaluate the Garmin Connect Health API only after commercial/partner approval and licensing. It offers deep all-day metrics but is not a self-serve drop-in integration.
- **Samsung direct SDK:** evaluate only if Health Connect cannot supply an essential Samsung metric or latency requirement. Health Connect is the default integration path.

### Phase 3: wearable-native apps

- Separate Apple Watch and Wear OS apps are a distinct product. They should be built only after the phone sync works reliably. Start with active outdoor workout control, heart rate display, pause/resume, and post-workout sync.

### Integration architecture requirements

- One `connectedIntegrations` data model with provider, OAuth credentials encrypted server-side, scopes, last sync, cursor, error state, source/device metadata, and user-triggered disconnect.
- Background sync must be opt-in, rate-limited, retried with backoff, and display the last successful sync time.
- Ask only for minimum health permissions. Avoid health data in analytics logs. Add a deletion pathway for every connector.

---

## Verification Checklist

- Run TypeScript and Convex code generation.
- Test small Android and iPhone layouts for any new horizontal card carousels.
- Manually test voice update, explicit add-set, delete-set, and retry flows.
- Verify the machine ID entry is absent from an active workout accordion and present in Move under Move Insights.
- Verify the Profile widget config has no health/tools toggles and Home config has Weight Journey.
- Verify iOS never displays/toggles Health Connect.
- Verify Android never displays/toggles Apple Health.
- Confirm sample marker data is unavailable in production builds and removable in development.
