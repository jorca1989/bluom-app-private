# Native Features Restoration Guide

This guide contains the exact configuration and code blocks needed to re-enable HealthKit, Outdoor Activities (Maps/Location), and Social Logins in the Bluom app.

---

## 1. App Configuration (`app.config.js`)

To re-enable native health and location services, restore these sections to your `ios` configuration:

### iOS usage descriptions:
```javascript
NSCameraUsageDescription: "This app uses the camera to allow you to upload a profile picture and scan product barcodes for nutritional information.",
NSPhotoLibraryUsageDescription: "This app requires access to your photos to let you choose and upload a profile picture.",
NSMicrophoneUsageDescription: "This app requires microphone access for video-based workout recording features.",
NSHealthShareUsageDescription: "Bluom reads activity data (steps, calories, workouts) from HealthKit to provide personalized insights and rewards. Your data is never sold or shared without your explicit consent.",
NSHealthUpdateUsageDescription: "Bluom can sync your logged workouts and meals back to HealthKit to help you maintain a complete health profile in one place.",
NSLocationWhenInUseUsageDescription: "Bluom uses your location to provide real-time local weather data on your dashboard and to track your outdoor running or cycling workout routes.",
NSLocationAlwaysAndWhenInUseUsageDescription: "Bluom uses your location in the background to accurately record your outdoor workout distance, pace, and routes, even when your phone is in your pocket or the app is closed.",
NSLocationAlwaysUsageDescription: "Bluom securely uses your location in the background to maintain accurate live tracking for your outdoor workouts.",

NSMotionUsageDescription: "Bluom uses motion data to count your steps in the background and update your daily activity goal in real time.",
```

### iOS URL Schemes:
```javascript
CFBundleURLTypes: [
    {
        CFBundleURLSchemes: [
            // Google Sign-In callback
            "com.googleusercontent.apps.769417597120-b9g72gt78bjm10kes8u63q1rgqs41kem",
            "bluom",
        ],
    },
],
```

### iOS background modes:
```javascript
UIBackgroundModes: ["audio", "location"],
```

### iOS entitlements:
```javascript
entitlements: {
    "com.apple.developer.healthkit": true,
    "com.apple.developer.associated-domains": ["applinks:bluom.app"],
},
```

---

## 2. Android Configuration (`app.config.js`)

To re-enable Android health and location services:

### Android permissions:
```javascript
"android.permission.ACCESS_COARSE_LOCATION",
"android.permission.ACCESS_FINE_LOCATION",
"android.permission.ACCESS_BACKGROUND_LOCATION",
"android.permission.FOREGROUND_SERVICE_HEALTH",
"android.permission.health.READ_STEPS",
"android.permission.health.READ_ACTIVE_CALORIES_BURNED",
"android.permission.health.READ_DISTANCE",
"android.permission.health.READ_WEIGHT",
"android.permission.health.READ_SLEEP",
"android.permission.health.READ_HEART_RATE",
"android.permission.health.READ_EXERCISE",
"android.permission.health.READ_BODY_FAT",
"android.permission.health.READ_MENSTRUATION",
```

---

## 3. Plugins (`app.config.js`)

To re-enable native modules:

```javascript
"expo-apple-authentication",
[
    "react-native-health",
    {
        "isClinicalDataEnabled": false
    }
],
"react-native-health-connect",
```

---

## 4. Move Screen Features (`app/(tabs)/move.tsx`)

To re-enable outdoor activity tracking and health integrations:

1.  **Uncomment the banner component**:
    ```tsx
    {/* Outdoor Activity */}
    <OutdoorActivityBanner onStart={() => setShowOutdoor(true)} />
    ```

2.  **Ensure the modal logic is active**:
    ```tsx
    <OutdoorActivityModal visible={showOutdoor} onClose={() => setShowOutdoor(false)} />
    ```

---

## 3. Social Logins (`app/(auth)/login.tsx` & `signup.tsx`)

To re-enable Google and Apple sign-in buttons, restore these lines to the render function:

```tsx
<GoogleSignInButton disabled={loading} />
<View style={{ height: 12 }} />
<AppleSignInButton disabled={loading} />
```

---

## 🏗️ Build Notes
1.  **Delete folders**: Always delete the `ios/` and `android/` folders in your root directory before running a new native build after changing these settings.
2.  **Run Build**: `eas build --platform ios --profile development`
3.  **App Store Submission**: Ensure your "Privacy Policy" and "Data Collection" information in App Store Connect matches the permissions you have enabled.
