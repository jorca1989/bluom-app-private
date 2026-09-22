# Bluom — Health/Watch/Strava/Steps Handoff to Antigravity (Round 2)

**Owner:** Jorge (ggovsaas@gmail.com) · **Date:** Sep 5, 2026 · **Project:** `C:\Users\jwfca\Desktop\BluomAppNew` · **Stack:** Expo SDK 54, React Native 0.81, EAS Build, Convex, Clerk, RevenueCat

**Read `HANDOFF_TO_ANTIGRAVITY.md` (Apr 30, 2026) in this same repo root first.** It documents 15 prior failed build attempts at Apple Health/Google Health integration, the New Architecture incompatibility root cause found with `react-native-health@1.19.0`, Plan A (disable New Arch) and Plan B (migrate to `@kingstinct/react-native-healthkit`). Jorge says both plans were attempted and the integration still does not work — Bluom still never appears under iOS **Settings → Privacy & Security → Health → Data Access & Devices**, and toggling the integration on inside the app still fails. Do not re-run Plan A/B blindly — start with the verification steps below, because a code fix that never reaches a correctly-provisioned build looks identical to a code bug from the outside.

---

## 0. Ground truth check before touching any code

Before writing anything, answer these and report back — don't skip to a fix:

1. `git log -- app.config.js hooks/useHealthSync.ts package.json` — did the Plan B migration to `@kingstinct/react-native-healthkit` actually get committed, or did it get reverted/abandoned partway? Confirm which HealthKit library is in `package.json` right now.
2. `eas credentials -p ios` → inspect the **current** iOS provisioning profile → confirm the entitlements it actually contains include `com.apple.developer.healthkit`. This is different from the Apple Developer Portal App ID capability checkbox — the checkbox can be on while the *provisioning profile EAS is actually signing with* is stale and doesn't include it. This mismatch is the single most common cause of "code looks right, toggle still fails, app never shows in Settings → Health."
3. Pull the most recent EAS build's `.ipa`/entitlements plist directly (`eas build:view <id>` → download → `codesign -d --entitlements :- <app>.app` on a Mac, or ask Jorge) and confirm `com.apple.developer.healthkit` is `true` in the **shipped binary**, not just in the repo's `.entitlements` source file. Xcode/EAS can silently regenerate an entitlements file during `expo prebuild` that drops a manually-added key if it isn't declared via the Expo config plugin (`app.config.js` → `ios.entitlements` or the HealthKit plugin config) — only trust what's in the actual binary.
4. Confirm the answer to #3 by having Jorge check, on the real device with the newest build installed: does Bluom appear in **Settings → Privacy & Security → Health → Data Access & Devices** *before* ever opening the app or tapping any toggle? If it does not appear there, this is 100% a provisioning/entitlement problem, not an app bug — do not spend time in `useHealthSync.ts` until this is fixed.

If #2 or #3 come back missing the entitlement: fix is to re-enable HealthKit capability on `com.jwfca.bluom` in the Apple Developer Portal (again, even if it looks already checked — uncheck, save, recheck, save, to force Apple to regenerate its records), then run `eas credentials -p ios` and force-regenerate the provisioning profile (do not reuse a cached one), then `eas build --profile development --platform ios --clear-cache --non-interactive`. An OTA/JS-only update will never fix this — it requires a brand new signed native build every time the entitlement changes.

---

## 1. Apple Watch integration — important framing, don't build a separate feature

Jorge's ask: connect an Apple Watch (or "any watch") the way Bluom already tries to connect Apple Health, Google Health, and Strava, and surface Watch-sourced metrics (steps, heart rate, HRV as a stress/cortisol proxy) after a normal (non-onboarding) opt-in.

**Technical reality to communicate back to Jorge if it changes scope:** third-party iOS apps cannot pair with or read data directly off an Apple Watch. All Watch health data (heart rate, HRV, steps, workouts, sleep) flows into HealthKit automatically, and HealthKit is the only channel a third-party app has to read it — there is no separate "connect the Watch" API. This means **fixing HealthKit per Section 0 above is the Watch integration.** There is no additional watchOS companion app required to read Watch metrics into Bluom (a companion app would only be needed if Jorge wants Bluom's own UI to run on the watch face, which is a separate, much larger feature — confirm with Jorge if that's actually what he wants before building it; his message describes wanting to *read* metrics into the phone app, not run Bluom on the watch itself).

Once Section 0's verification passes and HealthKit authorization succeeds, confirm Watch-sourced samples specifically are visible (in HealthKit, each sample carries a `sourceRevision` — check that samples with source "Apple Watch" show up, not just iPhone motion-coprocessor steps) so Jorge can see this is actually pulling from the watch and not just the phone.

Do **not** request HealthKit/Health Connect permissions during onboarding. Per the existing scaffolding in `app/integrations.tsx` and `app/settings.tsx` (Connected Apps & Devices row, already uncommented per the Apr 30 handoff), the connect action must live only in Settings/Integrations, triggered by explicit user action, any time after onboarding. Verify no code path calls `connectHealth()` / `requestAuthorization()` automatically during the onboarding flow.

---

## 2. Google Health / Health Connect (Android) — separate blocker to check

Beyond the New Architecture issue already diagnosed for iOS, Android Health Connect has its own gate Google added: apps requesting broad health data access may need to be **declared/reviewed through the Health Connect developer console** before permission requests succeed in production builds (this is separate from the AndroidManifest permission declarations). Check:

1. `AndroidManifest.xml` (post-prebuild) declares the needed `android.permission.health.READ_STEPS`, `READ_DISTANCE`, etc., and the required `<intent-filter>` for `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`.
2. Whether `com.jwfca.bluom` has completed Google's Health Connect access review/declaration (Play Console → App content → Health Connect, or similar — check current Play Console UI). An undeclared/unreviewed app can pass all code checks and still fail permission grants silently in production.
3. Confirm the test Android device has the Health Connect app itself installed (required on Android versions before it's bundled with the OS).

---

## 3. Strava OAuth — diagnose with actual error output, not "integration failed"

Jorge has a Strava API application already created with fields filled in, but the connection doesn't work and he doesn't know why. Do not guess — add logging first:

1. Find the Strava OAuth implementation (likely in `hooks/` or an `integrations`/`strava` service file) and log the **raw response body** from Strava's `POST https://www.strava.com/oauth/token` exchange on failure, not just a generic alert. Strava returns a specific JSON error (`invalid_grant`, `redirect_uri_mismatch`, `invalid_client`, etc.) that tells you exactly what's wrong.
2. Compare the **Authorization Callback Domain** set in the Strava API app settings (https://www.strava.com/settings/api) against the exact redirect URI the app sends in its OAuth request — these must match exactly, including the custom URL scheme/deep link used for the OAuth redirect back into the app.
3. Confirm `client_id` / `client_secret` in the app's config/`.env` for whichever build is being tested (dev vs. prod) match the Strava API dashboard values exactly — a common bug is dev credentials shipped in a prod build or vice versa.
4. Confirm the requested `scope` parameter includes what the app actually needs (e.g. `read,activity:read_all,profile:read_all`) — a missing scope can cause the token exchange to succeed but subsequent data calls to silently return nothing, which can look like "the integration doesn't work" even though auth succeeded.
5. Note: Strava API applications are capped to a small number of athletes by default until Strava approves the app for broader use. This doesn't block Jorge testing with his own account, but will block other users later — check the app's status on the Strava API dashboard and flag to Jorge if it needs submitting for approval before public launch.

Report back the exact Strava error string found in step 1 before attempting a fix — that determines which of steps 2–4 is the actual cause.

---

## 4. Automatic step / distance / motion tracking (no manual entry required)

Jorge wants steps/distance/motion tracked automatically from the device, the way Google Health/Apple Health do it, with manual entry kept only as an optional fallback (not the primary input).

- **iOS:** once HealthKit is actually working (Section 0), read `HKQuantityTypeIdentifierStepCount` and `HKQuantityTypeIdentifierDistanceWalkingRunning` via whichever HealthKit library is in use (Section 0, item 1) as the primary data source for the Move tab — this keeps Bluom's numbers consistent with what the user sees in Apple Health. `CMPedometer` (Core Motion) is a viable independent fallback for a live "steps so far today" counter if HealthKit read latency is an issue, but HealthKit should be the source of truth.
- **Android:** read `StepsRecord` / `DistanceRecord` from Health Connect as the primary source — this is blocked by Section 2 above, so it depends on that integration actually working first.
- Keep the existing manual step-entry UI as a visible override/fallback for users who deny permissions or are on unsupported devices, but it should not be the default path once auto-tracking is live.
- This is very likely a data-source wiring change on the Move tab screen rather than a new integration — the permission scopes for steps/distance are probably already part of the HealthKit/Health Connect request being built for Section 0/2.

---

## 5. Done definition (do not report success until every line is literally true on a real device)

1. On a fresh install of the newest build, **before opening the app**, Bluom appears in iOS Settings → Privacy & Security → Health → Data Access & Devices.
2. Tapping "Connect Apple Health" in Settings/Integrations (not onboarding) shows the native HealthKit permission sheet and completes without the "Health Connection Failed" alert.
3. After granting permission, at least one HealthKit sample with source "Apple Watch" (not just iPhone) is visible in the synced data, if Jorge is wearing a Watch during the test.
4. Health Connect (Android) toggle completes the same way, with the Health Connect app installed on the test device.
5. Strava "Connect" completes OAuth and pulls at least one real activity from Jorge's Strava account — not just a "connected" state with no data.
6. Move tab shows step/distance numbers that update automatically without the user typing anything in, with a manual-entry option still available and clearly separate.
7. None of the above required a second "next build will fix it" cycle — every claim above was checked directly on-device before reporting done.

If any step fails, stop and report the exact error/behavior rather than shipping another speculative build — this is explicitly what went wrong across the prior 15+ attempts per the Apr 30 handoff.
