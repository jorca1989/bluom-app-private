import 'dotenv/config';

export default ({ config }) => {
    const platformEnv = String(process.env.EAS_BUILD_PLATFORM || process.env.EXPO_OS || "").toLowerCase();
    const isIOS = platformEnv === "ios";
    const isAndroid =
        platformEnv === "android" ||
        !!process.env.ANDROID_HOME ||
        !!process.env.ANDROID_SDK_ROOT;

    const base = {
        expo: {
            name: "Bluom",
            slug: "bolt-expo-nativewind",
            owner: "ggovsaas",
            version: "1.0.27",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.27",
            // Enable New Architecture (Fabric/TurboModules) — supported by @kingstinct/react-native-healthkit
            newArchEnabled: true,
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                // buildNumber: "42", // Ignored when using EAS remote versioning
                googleServicesFile: "./GoogleService-Info.plist",
                entitlements: {
                    // ── HealthKit ─────────────────────────────────────────────────
                    "com.apple.developer.healthkit": true,
                    "com.apple.developer.healthkit.background-delivery": true,
                    // ── Associated Domains (deep links) ──────────────────────────
                    "com.apple.developer.associated-domains": ["applinks:bluom.app"],
                },
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,

                    // ── Background Modes ──────────────────────────────────────────
                    // "location" enables background GPS for outdoor workouts
                    UIBackgroundModes: ["audio", "location", "fetch", "remote-notification"],

                    // ── Camera & Photos ───────────────────────────────────────────
                    NSPhotoLibraryUsageDescription:
                        "Bluom uses your photo library to scan food labels for nutrition insights and to save or upload body progress photos for the Body Scan feature.",
                    NSCameraUsageDescription:
                        "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",

                    // ── Location (Weather + Outdoor Workouts) ─────────────────────
                    NSLocationWhenInUseUsageDescription:
                        "Bluom uses your location to show real-time local weather on your dashboard and to track outdoor workout routes.",
                    NSLocationAlwaysAndWhenInUseUsageDescription:
                        "Bluom uses your location in the background to accurately record distance, pace, and routes for outdoor workouts, even when your phone is in your pocket.",
                    NSLocationAlwaysUsageDescription:
                        "Bluom uses your location in the background to maintain accurate live GPS tracking during outdoor workouts.",

                    // ── HealthKit ─────────────────────────────────────────────────
                    NSHealthShareUsageDescription:
                        "Bluom reads your step count, active calories, walking distance, body weight, sleep duration, and heart rate from Apple Health to automatically update your daily goals and generate personalised wellness insights — so you never have to log manually.",
                    NSHealthUpdateUsageDescription:
                        "Bluom writes your logged workouts, sleep minutes, and body weight back to Apple Health, keeping all your wellness data in one place.",

                    // ── URL Schemes ───────────────────────────────────────────────
                    CFBundleURLTypes: [
                        {
                            CFBundleURLSchemes: ["bluom"],
                        },
                    ],
                },
                deploymentTarget: "15.1",
                supportsTablet: true,
                isTabletOnly: false,
                requireFullScreen: true,
                privacyManifests: {
                    NSPrivacyAccessedAPITypes: [
                        {
                            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
                            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
                        },
                        {
                            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
                            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
                        },
                    ],
                },
            },
            android: {
                package: "com.jwfca.bluom",
                versionCode: 52,
                googleServicesFile: "./google-services.json",
                // Google Maps SDK for Android — required for react-native-maps to render
                // Key lives in .env.local (GOOGLE_MAPS_ANDROID_KEY) and EAS secrets for build server
                config: {
                    googleMaps: {
                        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
                    },
                },
                splash: {
                    image: "./assets/images/splash.png",
                    imageWidth: 420,
                    resizeMode: "contain"
                },
                permissions: [
                    // ── Camera ────────────────────────────────────────────────────
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    // ── Foreground service / wake lock ────────────────────────────
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                    "android.permission.FOREGROUND_SERVICE_LOCATION",
                    "android.permission.WAKE_LOCK",
                    // ── Location (outdoor workouts + weather) ─────────────────────
                    "android.permission.ACCESS_FINE_LOCATION",
                    "android.permission.ACCESS_COARSE_LOCATION",
                    "android.permission.ACCESS_BACKGROUND_LOCATION",
                    // ── Notifications ─────────────────────────────────────────────
                    "android.permission.POST_NOTIFICATIONS",
                    "android.permission.RECEIVE_BOOT_COMPLETED",
                    // ── Health Connect ────────────────────────────────────────────
                    "android.permission.health.READ_STEPS",
                    "android.permission.health.READ_DISTANCE",
                    "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
                    "android.permission.health.READ_HEART_RATE",
                    "android.permission.health.READ_SLEEP",
                    "android.permission.health.READ_WEIGHT",
                    "android.permission.health.WRITE_EXERCISE",
                    "android.permission.health.WRITE_SLEEP",
                    "android.permission.health.WRITE_WEIGHT",
                ],
            },
            icon: "./assets/images/icon.png",
            splash: {
                image: "./assets/images/splash.png",
                resizeMode: "contain",
                backgroundColor: "#ffffff",
            },
            web: {
                bundler: "metro",
                output: "single",
                favicon: "./assets/images/icon.png",
            },
            plugins: [
                "expo-router",
                "expo-font",
                "expo-web-browser",
                "expo-audio",
                "expo-asset",
                "expo-splash-screen",
                "@react-native-community/datetimepicker",

                // ── Apple Sign In ─────────────────────────────────────────────────
                "expo-apple-authentication",

                // ── Location + Background GPS (outdoor workouts + weather) ─────────
                [
                    "expo-location",
                    {
                        locationAlwaysAndWhenInUsePermission:
                            "Bluom uses your location in the background to accurately record distance, pace, and routes for outdoor workouts.",
                        locationAlwaysPermission:
                            "Bluom uses your location in the background to maintain accurate live GPS tracking during outdoor workouts.",
                        locationWhenInUsePermission:
                            "Bluom uses your location to show local weather and track outdoor workout routes.",
                        isIosBackgroundLocationEnabled: true,
                        isAndroidBackgroundLocationEnabled: true,
                    },
                ],

                // ── HealthKit (iOS) ───────────────────────────────────────────────
                [
                    "@kingstinct/react-native-healthkit",
                    {
                        healthSharePermission:
                            "Bluom reads your step count, active calories, walking distance, body weight, sleep duration, and heart rate from Apple Health to automatically update your daily goals and generate personalised wellness insights — so you never have to log manually.",
                        healthUpdatePermission:
                            "Bluom writes your logged workouts, sleep minutes, and body weight back to Apple Health, keeping all your wellness data in one place.",
                    },
                ],

                // ── Health Connect (Android) ──────────────────────────────────────
                "react-native-health-connect",

                // ── Camera ────────────────────────────────────────────────────────
                [
                    "expo-camera",
                    {
                        cameraPermission:
                            "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",
                    },
                ],

                // ── Push Notifications ────────────────────────────────────────────
                "expo-notifications",
            ],
            extra: {
                router: {},
                eas: {
                    projectId: "7e08b902-8286-427f-844d-652b292722fe",
                },
            },
            updates: {
                url: "https://u.expo.dev/7e08b902-8286-427f-844d-652b292722fe",
            },
        },
    };

    const buildProps = {};
    if (isAndroid) {
        buildProps.android = { minSdkVersion: 26 };
    }

    const plugins = [...base.expo.plugins, ["expo-build-properties", buildProps]];

    return {
        ...base.expo,
        ...config,
        slug: "bolt-expo-nativewind",
        plugins,
    };
};
