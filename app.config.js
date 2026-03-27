import 'dotenv/config';

export default ({ config }) => {
    // Expo CLI doesn't always evaluate config with a specific platform (e.g. `expo start`).
    // Use env hints when present.
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
            version: "1.0.21",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.21",
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "31",
                googleServicesFile: "./GoogleService-Info.plist",
                entitlements: {
                    "com.apple.developer.healthkit": true,
                },
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    UIBackgroundModes: ["audio"],

                    // ── Camera & Photos (updated for Body Scan feature) ──
                    NSPhotoLibraryUsageDescription:
                        "Bluom uses your photo library to scan food labels for nutrition insights and to save or upload body progress photos for the Body Scan feature.",
                    NSCameraUsageDescription:
                        "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",

                    // ── Location (Weather) ─────────────────────────────────────────
                    NSLocationWhenInUseUsageDescription:
                        "Bluom uses your approximate location solely to provide real-time local weather data on your dashboard.",

                    // ── HealthKit (NEW) ───────────────────────────────────────────
                    // NSHealthShareUsageDescription: what we READ from HealthKit.
                    // Apple requires this to be specific — generic text = instant rejection.
                    NSHealthShareUsageDescription:
                        "Bluom reads your daily step count, active calories burned, walking distance, body weight, sleep duration, heart rate, and (if you choose to grant access) cycle-related data like menstrual flow and ovulation test results from Apple Health. This data automatically updates your daily calorie burn goal, tracks your body composition progress over time, and generates personalised recovery, Wellness, and cycle insights — so you never have to log manually.",

                    // NSHealthUpdateUsageDescription: what we WRITE to HealthKit.
                    // Bluom is read-only, but the key must still be present.
                    NSHealthUpdateUsageDescription:
                        "Bluom does not write any data to Apple Health. This key is present to satisfy HealthKit requirements.",

                    // ── Motion (NEW) ──────────────────────────────────────────────
                    // Required if react-native-health uses CMPedometer.
                    NSMotionUsageDescription:
                        "Bluom uses motion data to count your steps in the background and update your daily activity goal in real time.",

                    // ── URL Schemes ───────────────────────────────────────────────
                    CFBundleURLTypes: [
                        {
                            CFBundleURLSchemes: [
                                // Google Sign-In callback
                                "com.googleusercontent.apps.769417597120-b9g72gt78bjm10kes8u63q1rgqs41kem",
                                // Strava OAuth callback (NEW) — must match redirectUri in IntegrationsScreen
                                "bluom",
                            ],
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
                versionCode: 31,
                googleServicesFile: "./google-services.json",
                permissions: [
                    // ── Existing ──────────────────────────────────────────────────
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                    "android.permission.WAKE_LOCK",

                    // ── Location (Weather) ────────────────────────────────────────
                    "android.permission.ACCESS_COARSE_LOCATION",
                    "android.permission.ACCESS_FINE_LOCATION",

                    // ── Health Connect (NEW) ──────────────────────────────────────
                    // These appear as individual toggles in Android Settings,
                    // just like the Fitbit / Samsung Health permissions panel.
                    // Requires Health Connect app installed (Android 14+ has it built-in).
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
                "react-native-health",
                "react-native-health-connect",
                [
                    "expo-camera",
                    {
                        cameraPermission:
                            "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",
                    },
                ],
                "expo-apple-authentication",
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
    // isIOS: deploymentTarget intentionally omitted (see comment in original file)

    const plugins = [...base.expo.plugins, ["expo-build-properties", buildProps]];

    return {
        ...base.expo,
        ...config,
        // scheme MUST come after ...config to prevent it being overwritten
        scheme: "bluom",
        plugins,
    };
};