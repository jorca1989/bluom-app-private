# Bluom — Native Build Handoff to Antigravity

**Owner:** Jorge (ggovsaas@gmail.com) · **Date:** Apr 30, 2026 · **Project:** `C:\Users\jwfca\Desktop\BluomAppNew` · **Stack:** Expo SDK 54, React Native 0.81, EAS Build, Convex, Clerk, RevenueCat

---

## 1. The goal

Get three native iOS+Android features working end-to-end on a fresh EAS dev build of Bluom (`com.jwfca.bluom`):

1. **Sign in with Apple** — `expo-apple-authentication` via Clerk OAuth on `/login` and `/signup`
2. **Apple Health (iOS) + Health Connect (Android)** — wired through `useHealthSync` hook on the `/integrations` screen, toggleable per-integration
3. **Outdoor Activity GPS recorder** — `react-native-maps` + `expo-location` + `expo-task-manager` background tracking, opened from a banner on the Move tab

Acceptance: on a fresh dev build installed on a real iPhone AND a real Android device, all three features open their native permission sheets and execute their happy path without showing the "Native build required" or "Health Connection Failed" fallbacks.

---

## 2. Why the previous 15 builds failed (root cause)

Expo SDK 54 enables **New Architecture (Fabric/TurboModules) by default**. The HealthKit library `react-native-health@1.19.0` is not compatible with the New Architecture (confirmed by `expo-doctor` warning: *"Untested on New Architecture: react-native-health"*). Because of this, even though the modules were compiled into the binary, the runtime `safeRequire('react-native-health')` returned `null`, triggering the "Health Connection Failed" alert in `useHealthSync.ts`. Same class of failure affected `react-native-maps` (the AIRMap view manager check at `Outdooractivityscreen.tsx:203` returned null) and likely `expo-apple-authentication`.

Previous Claude/agent sessions confirmed package.json + app.config.js were "clean" — that was correct in isolation, but they missed the New Arch compatibility issue.

---

## 3. What's already been done in this session (do NOT redo these)

### Config changes (committed, no rebuild yet)

**File: `app.config.js`**
- Added `newArchEnabled: false` right after `runtimeVersion: "1.0.27"` with a comment explaining why and a TODO to revisit when react-native-health publishes New Arch support (or migrate to `@kingstinct/react-native-healthkit`).

**File: `package.json`**
- Added `react-native-health` to `expo.doctor.reactNativeDirectoryCheck.exclude` array (alongside the existing `@solana-mobile/mobile-wallet-adapter-protocol`)
- Added `listUnknownPackages: false` to suppress noise

### UI / source changes (already applied)

- `app/(tabs)/profile.tsx` line 634+ — uncommented the Integrations menu row
- `app/settings.tsx` line 223+ — uncommented Connected Apps & Devices row (with reminder to re-hide before App Store submission unless entitlements are configured)
- `app/(auth)/login.tsx` line 250+ — uncommented `<GoogleSignInButton>` + `<AppleSignInButton>`
- `app/(auth)/signup.tsx` line 187+ — same as login
- `app/(tabs)/move.tsx` line 984 — uncommented `<OutdoorActivityBanner>`
- `app/(tabs)/move.tsx` line 931 — Blueprint Complete banner: `marginTop: 20→4`, `marginBottom: 4→16` (margins were inverted, banner was floating)
- `app/(tabs)/move.tsx` line 1587 — `activitySummary.marginBottom: 16→8` to tighten the gap above the Blueprint banner
- `app/landing.tsx` line 143 — App Store button now points at `https://apps.apple.com/app/bluom-nutrition-fitness-ai/id6759072102` with `target="_blank"`

### Verified externally

- **Apple Developer Portal** — `com.jwfca.bluom` App ID has Sign In with Apple, HealthKit, Associated Domains capabilities checked (per Jorge)
- **Google Cloud Console** (project `bluom`, https://console.cloud.google.com/google/maps-apis/home?project=bluomapp) — billing is enabled. **Maps SDK for Android is NOT yet enabled** (only Maps 3D SDK for Android is, which is a different product). This must be addressed for Android Outdoor.
- **Email forwarding** — `support@bluom.app` and `affiliates@bluom.app` forward via Namecheap free forwarding to `ggovsaas@gmail.com`. No DNS changes needed.

---

## 4. PLAN A — what to do next (estimated 30–60 min hands-on, plus ~20 min EAS build wait per platform)

### Step 1 — Clean install and verify config (Jorge's machine; PowerShell in `C:\Users\jwfca\Desktop\BluomAppNew`)

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npx expo-doctor
```

**Expected:** `npx expo-doctor` should now pass 17/17. If a different warning appears, STOP and report it.

### Step 2 — Enable Maps SDK for Android + create API key (browser, Jorge's Google account)

1. Go to https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com?project=bluomapp
2. Click **ENABLE** on "Maps SDK for Android"
3. Then go to https://console.cloud.google.com/apis/credentials?project=bluomapp
4. Click **+ CREATE CREDENTIALS → API key**
5. After creation, click the new key → **Edit** → **Application restrictions: Android apps** → add:
   - Package name: `com.jwfca.bluom`
   - SHA-1: get this with `eas credentials` → Android → Production → "View SHA-1 fingerprint" (or run `keytool -list -v -keystore <upload-keystore>` if you have the keystore locally)
6. Under **API restrictions**, restrict to "Maps SDK for Android"
7. Save. Copy the new key.

### Step 3 — Wire the Android Maps key into `app.config.js`

In `app.config.js`, inside the `android:` object (alongside `package`, `versionCode`, `googleServicesFile`, `splash`, `permissions`), add:

```js
config: {
  googleMaps: {
    apiKey: "AIza...PASTE_NEW_KEY_HERE",
  },
},
```

⚠ If the user is uncomfortable committing the key to git, store it in `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` and reference it as `process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` inside `app.config.js`. Add `.env` to `.gitignore` if not already.

### Step 4 — Regenerate native folders and trigger fresh builds

```powershell
npx expo prebuild --clean
eas build --profile development --platform ios --clear-cache --non-interactive
eas build --profile development --platform android --clear-cache --non-interactive
```

Both run in EAS cloud (~15-20 min each). Wait for completion. EAS will print install URLs.

### Step 5 — Install on devices and test

- **Delete the old Bluom dev build** from both iPhone and Android device
- Install the new builds via EAS install URLs
- Run `npx expo start --tunnel --clear` on Jorge's dev machine
- Open the new Bluom dev build on each device, scan QR

### Step 6 — Smoke test in this exact order

For each device, test:

1. `/login` → tap **Sign in with Apple** (iOS) / **Sign in with Google** (both) → expect native sheet, NOT silent failure
2. Profile/Settings → **Integrations** → toggle **Apple Health** (iOS) / **Health Connect** (Android) → expect native permission sheet, NOT "Health Connection Failed" alert
3. Move tab → **Outdoor Activity** banner → tap → expect a map view with GPS controls, NOT the dark "Native build required" screen

If all three pass on both platforms, you're done. Re-comment the Integrations row in `settings.tsx` BEFORE next App Store submission unless you've added the HealthKit entitlement to your provisioning profile.

---

## 5. PLAN B — fallback if Plan A doesn't work

If after Plan A any of the three features still fail (especially Apple Health), the cause is likely that `react-native-health` itself is broken in your specific Expo SDK 54 + iOS combo, regardless of New Arch. Switch to `@kingstinct/react-native-healthkit` which is actively maintained and supports New Arch natively. Estimated effort: 2 hours.

### Migration outline

1. **Uninstall old, install new:**
   ```powershell
   npm uninstall react-native-health
   npm install @kingstinct/react-native-healthkit
   ```

2. **Update `app.config.js` plugins:**
   ```js
   // REMOVE this:
   ["react-native-health", { isClinicalDataEnabled: false }],

   // ADD this:
   ["@kingstinct/react-native-healthkit", {
     healthSharePermission: "Bluom reads your step count, active calories, walking distance, body weight, sleep duration, and heart rate from Apple Health to automatically update your daily goals and generate personalised wellness insights — so you never have to log manually.",
     healthUpdatePermission: "Bluom writes your logged workouts, sleep minutes, and body weight back to Apple Health, keeping all your wellness data in one place.",
   }],
   ```

3. **Re-enable New Architecture in `app.config.js`** (kingstinct supports it):
   ```js
   newArchEnabled: true,
   ```

4. **Remove the doctor exclude in `package.json`**:
   - Remove `"react-native-health"` from the exclude array

5. **Rewrite `hooks/useHealthSync.ts`** — new API surface:
   - The current code uses `safeRequire('react-native-health')`, then `AppleHealthKit.initHealthKit({permissions:{read,write}}, callback)` and method-style getters like `AppleHealthKit.getStepCount(options, callback)`.
   - Replace with kingstinct's promise-based API:
     ```ts
     import {
       isHealthDataAvailable,
       requestAuthorization,
       queryQuantitySamples,
       HKQuantityTypeIdentifier,
     } from '@kingstinct/react-native-healthkit';
     ```
   - Permission strings change from `AppleHealthKit.Constants.Permissions.Steps` etc. to enum constants like `HKQuantityTypeIdentifier.stepCount`.
   - Reference docs: https://github.com/kingstinct/react-native-healthkit
   - Keep the same exported hook signature (`connectHealth`, `disconnectHealth`, `syncHealth`, `healthConnected`) so `app/integrations.tsx` doesn't need changes.

6. **Repeat Plan A Steps 1, 4, 5, 6** to rebuild and retest.

If Plan B also fails for Apple Sign In specifically, the next thing to check is **Clerk's Apple OAuth config** (https://dashboard.clerk.com → User & Authentication → Social Connections → Apple). It needs:
- Apple Service ID matching the bundle ID
- Apple Team ID
- Apple Key ID + private key (`.p8` file uploaded)
- Verified by clicking "Test connection" in Clerk dashboard

---

## 6. Hard constraints — do not change

- Convex functions in `convex/` (business logic, must stay stable)
- Anything in `app/(tabs)/index.tsx` (home dashboard — has its own widget system)
- Web landing page (`app/landing.tsx`) — already updated this session
- `AFFILIATE_PLAYBOOK.md` and other docs
- The Expo project `slug: "bolt-expo-nativewind"` (legacy, can't be renamed without breaking EAS history)

---

## 7. Reference info

- **Bundle ID (iOS):** `com.jwfca.bluom`
- **Package (Android):** `com.jwfca.bluom`
- **EAS project ID:** `7e08b902-8286-427f-844d-652b292722fe`
- **EAS owner:** `ggovsaas`
- **App Store ID:** `6759072102`
- **App Store URL:** https://apps.apple.com/app/bluom-nutrition-fitness-ai/id6759072102
- **Most recent failing build:** https://expo.dev/accounts/ggovsaas/projects/bolt-expo-nativewind/builds/f457bfcb-3711-4023-ac48-9e72ad67e49e
- **Convex deployment:** `cheerful-snake-681.convex.cloud`
- **Clerk:** Production keys, app ID `app_377Hh9dMZsEBLrRCfw24FrhcoI7`
- **RevenueCat project:** `223c9fcd`, app `appb556ea78bc`
- **Domain:** `bluom.app` (Namecheap, BasicDNS, Vercel hosts landing via A record `216.198.79.1`)

---

## 8. Done definition

A single message to Jorge with:
1. Both EAS build URLs (iOS + Android)
2. Confirmation that all 3 features pass the smoke test on both platforms
3. Any caveats or follow-ups (e.g. "Health Connect requires the Health Connect app installed on the Android test device — installed it for you" or "had to switch to Plan B because X")

If any step fails, STOP and report rather than improvising. This is the 16th attempt at getting this working — clean diagnosis matters more than another speculative build.
