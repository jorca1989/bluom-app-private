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
            version: "1.0.25",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.25",
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "37",
                googleServicesFile: "./GoogleService-Info.plist",
                entitlements: {
                    // "com.apple.developer.healthkit": true,
                    "com.apple.developer.associated-domains": ["applinks:bluom.app"],
                },
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    UIBackgroundModes: ["audio"],

                    // ── Camera & Photos (updated for Body Scan feature) ──
                    NSPhotoLibraryUsageDescription:
                        "Bluom uses your photo library to scan food labels for nutrition insights and to save or upload body progress photos for the Body Scan feature.",
                    NSCameraUsageDescription:
                        "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",

                    // ── Location (Weather & Workouts) ──────────────────────────────
                    /*
                    NSLocationWhenInUseUsageDescription:
                        "Bluom uses your location to provide real-time local weather data on your dashboard and to track your outdoor running or cycling workout routes.",
                    NSLocationAlwaysAndWhenInUseUsageDescription:
                        "Bluom uses your location in the background to accurately record your outdoor workout distance, pace, and routes, even when your phone is in your pocket or the app is closed.",
                    NSLocationAlwaysUsageDescription:
                        "Bluom securely uses your location in the background to maintain accurate live tracking for your outdoor workouts.",
                    */

                    // ── HealthKit (NEW) ───────────────────────────────────────────
                    /*
                    NSHealthShareUsageDescription:
                        "Bluom reads your daily step count, active calories burned, walking distance, body weight, sleep duration, heart rate, and (if you choose to grant access) cycle-related data like menstrual flow and ovulation test results from Apple Health. This data automatically updates your daily calorie burn goal, tracks your body composition progress over time, and generates personalised recovery, Wellness, and cycle insights — so you never have to log manually.",

                    NSHealthUpdateUsageDescription:
                        "Bluom can sync your logged workouts, sleep minutes, and weight back to Apple Health, helping you maintain a unified and complete record of your wellness activities across all your devices.",
                    */

                    // ── Motion (Removed for Lite Build) ──────────────────────────
                    // NSMotionUsageDescription:
                    //     "Bluom uses motion data to count your steps in the background and update your daily activity goal in real time.",

                    // ── URL Schemes ───────────────────────────────────────────────
                    CFBundleURLTypes: [
                        {
                            CFBundleURLSchemes: [
                                // Strava OAuth callback — must match redirectUri in IntegrationsScreen
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
                versionCode: 50,
                googleServicesFile: "./google-services.json",
                splash: {
                    image: "./assets/images/splash.png",
                    imageWidth: 420,
                    resizeMode: "contain"
                },
                permissions: [
                    // ── Existing ──────────────────────────────────────────────────
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                    "android.permission.WAKE_LOCK",

                    // ── Location (Removed for Lite Build) ─────────────────────────

                    // ── Health Connect (Removed for Lite Build) ────────────────────
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
                /*
                "expo-apple-authentication",
                [
                    "react-native-health",
                    {
                        "isClinicalDataEnabled": false
                    }
                ],
                "react-native-health-connect",
                */
                [
                    "expo-camera",
                    {
                        cameraPermission:
                            "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",
                    },
                ],
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
    // isIOS: deploymentTarget intentionally omitted (see comment in original file)

    const plugins = [...base.expo.plugins, ["expo-build-properties", buildProps]];

    return {
        ...base.expo,
        ...config,
        // Override dynamic config slug to match EAS
        slug: "bolt-expo-nativewind",
        plugins,
    };
};