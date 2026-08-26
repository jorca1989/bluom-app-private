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
            version: "1.0.43",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.43",
            // New Architecture DISABLED — react-native-maps 1.20.1 doesn't support Fabric
            // (AIRMap view manager fails to register). Re-enable when react-native-maps ships
            // New Arch support, or after migrating to @teovilla/react-native-web-maps.
            newArchEnabled: true,
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "68",
                appleTeamId: "TJSGDC6873",
                googleServicesFile: "./GoogleService-Info.plist",
                entitlements: {
                    // ── Associated Domains (deep links) ──────────────────────────
                    "com.apple.developer.associated-domains": ["applinks:bluom.app"],
                },
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    SKIncludeConsumableInAppPurchaseHistory: true,

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
                versionCode: 68,
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

    return {
        ...base.expo,
        ...config,
        slug: "bolt-expo-nativewind",
        plugins,
    };
};
