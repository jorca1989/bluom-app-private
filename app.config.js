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
            version: "1.0.20",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.20",
            privacyPolicyUrl: "https://www.bluom.app/legal/privacy",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "30",
                googleServicesFile: "./GoogleService-Info.plist",
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    UIBackgroundModes: ["audio"],
                    NSPhotoLibraryUsageDescription:
                        "Bluom uses your photo library to scan food labels and analyze meals for AI-powered nutrition insights.",
                    NSCameraUsageDescription:
                        "Bluom uses the camera to scan food items and nutritional labels for AI-powered nutrition insights.",
                    CFBundleURLTypes: [
                        {
                            CFBundleURLSchemes: [
                                "com.googleusercontent.apps.769417597120-b9g72gt78bjm10kes8u63q1rgqs41kem",
                            ],
                        },
                    ],
                },
                // KEEP: Build 18 requirement
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
                versionCode: 30,
                googleServicesFile: "./google-services.json",
                permissions: [
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                    "android.permission.WAKE_LOCK",
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
                [
                    "expo-camera",
                    {
                        cameraPermission: "Bluom uses the camera to scan food items and nutritional labels for AI-powered nutrition insights.",
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

    // Only apply build-properties keys for the relevant platform.
    // IMPORTANT: expo-build-properties currently throws if you set iOS deploymentTarget < 15.1 in this SDK.
    // We keep `expo.ios.deploymentTarget = "13.0"` for compliance, but we DO NOT pass it through this plugin
    // unless/until we move SDKs or replace the plugin with a custom one.
    const buildProps = {};
    if (isAndroid) {
        buildProps.android = { minSdkVersion: 26 };
    }
    if (isIOS) {
        // Intentionally omitted to avoid Expo SDK validation crash during config evaluation.
        // buildProps.ios = { deploymentTarget: "13.0" };
    }

    // Social sign-in capabilities disabled for Build 18 submission.
    // Keep plugins platform-safe and avoid adding Apple sign-in entitlement.
    const plugins = [...base.expo.plugins, ["expo-build-properties", buildProps]];

    return {
        ...base.expo,
        ...config,
        plugins,
    };
};