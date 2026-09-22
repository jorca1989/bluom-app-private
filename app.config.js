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
            version: "1.0.48",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.48",
            // New Architecture DISABLED — react-native-maps 1.20.1 doesn't support Fabric
            // (AIRMap view manager fails to register). Re-enable when react-native-maps ships
            // New Arch support, or after migrating to @teovilla/react-native-web-maps.
            newArchEnabled: true,
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "73",
                appleTeamId: "TJSGDC6873",
                googleServicesFile: "./GoogleService-Info.plist",
                entitlements: {
                    // ── Associated Domains (deep links) ──────────────────────────
                    "com.apple.developer.associated-domains": ["applinks:bluom.app"],
                    "com.apple.developer.healthkit": true,
                    "com.apple.developer.healthkit.access": [],
                },
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    SKIncludeConsumableInAppPurchaseHistory: true,

                    // ── HealthKit ────────────────────────────────────────────────
                    NSHealthShareUsageDescription:
                        "Bluom reads your step count, active calories, walking distance, body weight, body composition, sleep duration, and heart rate from Apple Health to automatically update your daily goals and generate personalised wellness insights.",
                    NSHealthUpdateUsageDescription:
                        "Bluom writes health data only when you explicitly choose to share a supported Bluom record with Apple Health.",

                    // ── Background Modes ──────────────────────────────────────────
                    UIBackgroundModes: ["audio", "fetch", "remote-notification", "location"],

                    // ── Location ─────────────────────────────────────────────────
                    NSLocationWhenInUseUsageDescription:
                        "Bluom needs your location to show your position on the map and record your route.",
                    NSLocationAlwaysAndWhenInUseUsageDescription:
                        "Allow Bluom to access your location in the background so your route continues recording when your screen is off.",
                    NSLocationAlwaysUsageDescription:
                        "Bluom accesses location in the background to keep tracking your route when you minimise the app.",

                    // ── Camera & Photos ───────────────────────────────────────────
                    NSPhotoLibraryUsageDescription:
                        "Bluom uses your photo library to scan food labels for nutrition insights and to save or upload body progress photos for the Body Scan feature.",
                    NSCameraUsageDescription:
                        "Bluom uses the camera to scan food items for nutrition insights and to take body progress photos for AI-powered body composition analysis.",
                    NSMicrophoneUsageDescription:
                        "Bluom uses your microphone when you choose to log a workout set or food by voice.",

                    // ── SKAdNetwork Items (AppLovin & AppsFlyer MMP) ────────────────
                    SKAdNetworkItems: [
                        { SKAdNetworkIdentifier: "ludvb6z3bs.skadnetwork" }, // AppLovin
                        { SKAdNetworkIdentifier: "v9wttpbfk9.skadnetwork" }, // AppsFlyer
                        { SKAdNetworkIdentifier: "n38lu8d635.skadnetwork" }, // AppsFlyer
                        { SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork" }, // Google
                    ],

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
                versionCode: 73,
                googleServicesFile: "./google-services.json",
                splash: {
                    image: "./assets/images/logo.png",
                    resizeMode: "contain",
                    backgroundColor: "#ffffff"
                },
                config: {
                    googleMaps: {
                        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || process.env.GOOGLE_MAPS_ANDROID_KEY || ""
                    }
                },
                permissions: [
                    // ── Camera ────────────────────────────────────────────────────
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    // ── Foreground service / wake lock ────────────────────────────
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_LOCATION",
                    "android.permission.WAKE_LOCK",
                    // ── Location ──────────────────────────────────────────────────
                    "android.permission.ACCESS_FINE_LOCATION",
                    "android.permission.ACCESS_COARSE_LOCATION",
                    "android.permission.ACCESS_BACKGROUND_LOCATION",
                    // ── Notifications ─────────────────────────────────────────────
                    "android.permission.POST_NOTIFICATIONS",
                    "android.permission.RECEIVE_BOOT_COMPLETED",
                    // ── Health Connect ─────────────────────────────────────────────
                    "android.permission.health.READ_STEPS",
                    "android.permission.health.READ_DISTANCE",
                    "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
                    "android.permission.health.READ_WEIGHT",
                    "android.permission.health.READ_BODY_FAT",
                    "android.permission.health.READ_HEART_RATE",
                    "android.permission.health.READ_RESTING_HEART_RATE",
                    "android.permission.health.READ_SLEEP",
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
                "expo-localization",
                "@react-native-community/datetimepicker",

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

                // ── AppsFlyer Attribution ──────────────────────────────────────────
                "react-native-appsflyer",

                // ── Location & GPS ───────────────────────────────────────────────
                [
                    "expo-location",
                    {
                        locationAlwaysAndWhenInUsePermission: "Bluom needs access to your location to track your outdoor running, cycling, hiking, and walking routes.",
                        locationAlwaysPermission: "Allow Bluom to access your location in the background so your route continues recording when your screen is off.",
                        locationWhenInUsePermission: "Bluom needs your location to show your position on the map and record your route.",
                        isIosBackgroundLocationEnabled: true,
                        isAndroidBackgroundLocationEnabled: true,
                        isAndroidForegroundServiceEnabled: true,
                    }
                ],

                // ── Health Integration ────────────────────────────────────────────
                [
                    "@kingstinct/react-native-healthkit",
                    {
                        NSHealthShareUsageDescription: "Bluom reads your step count, active calories, walking distance, body weight, body composition, sleep duration, and heart rate from Apple Health to automatically update your daily goals and generate personalised wellness insights.",
                        NSHealthUpdateUsageDescription: "Bluom writes health data only when you explicitly choose to share a supported Bluom record with Apple Health.",
                    }
                ],
                "react-native-health-connect",
            ],
            extra: {
                router: {},
                influtoApiKey: process.env.INFLU || process.env.EXPO_PUBLIC_INFLUTO_API_KEY || "",
                eas: {
                    projectId: "7e08b902-8286-427f-844d-652b292722fe",
                },
            },
            updates: {
                url: "https://u.expo.dev/7e08b902-8286-427f-844d-652b292722fe",
            },
        },
    };

    const buildProps = {
        ios: {
            useFrameworks: "static",
            extraPods: [
                { name: "GoogleUtilities", modular_headers: true },
                { name: "RecaptchaInterop", modular_headers: true }
            ]
        }
    };
    if (isAndroid) {
        buildProps.android = { minSdkVersion: 26 };
    }

    const plugins = [...base.expo.plugins, ["expo-build-properties", buildProps]];

    // Custom plugin to fix react-native-appsflyer's bizarre hardcoded '2.4.10' standard lib version.
    // This injects `ext.kotlin_stdlib_version = "2.1.20"` into the root build.gradle.
    const withAppsFlyerKotlinFix = (config) => {
        return require('@expo/config-plugins').withProjectBuildGradle(config, (cfg) => {
            if (cfg.modResults.language === 'groovy') {
                if (!cfg.modResults.contents.includes('kotlin_stdlib_version')) {
                    cfg.modResults.contents = cfg.modResults.contents + '\n\next {\n    kotlin_stdlib_version = "2.1.20"\n}\n';
                }
            }
            return cfg;
        });
    };

    plugins.push(withAppsFlyerKotlinFix);

    return {
        ...base.expo,
        ...config,
        slug: "bolt-expo-nativewind",
        plugins,
    };
};
