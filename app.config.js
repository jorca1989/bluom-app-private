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
            version: "1.0.15",
            scheme: "bluom",
            userInterfaceStyle: "automatic",
            runtimeVersion: "1.0.15",
            ios: {
                bundleIdentifier: "com.jwfca.bluom",
                buildNumber: "18",
                googleServicesFile: "./GoogleService-Info.plist",
                usesAppleSignIn: true,
                infoPlist: {
                    ITSAppUsesNonExemptEncryption: false,
                    CFBundleURLTypes: [
                        {
                            CFBundleURLSchemes: [
                                "com.googleusercontent.apps.769417597120-b9g72gt78bjm10kes8u63q1rgqs41kem",
                            ],
                        },
                    ],
                    NSHealthShareUsageDescription:
                        "We use your step and activity data to calculate your daily Vitality Score and help you track your fitness goals.",
                    NSHealthUpdateUsageDescription:
                        "We securely write workouts to Apple Health to keep your fitness data in sync across your devices.",
                },
                // KEEP: Build 18 requirement
                deploymentTarget: "13.0",
                supportsTablet: true,
                requireFullScreen: true,
            },
            android: {
                package: "com.jwfca.bluom",
                versionCode: 18,
                googleServicesFile: "./google-services.json",
                permissions: [
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.MODIFY_AUDIO_SETTINGS",
                    "android.permission.FOREGROUND_SERVICE",
                    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                    "android.permission.WAKE_LOCK",
                    // BUILD 18: Health Connect (steps) — fixes OEM (e.g., Oppo) manifest/permission headings
                    "android.permission.health.READ_STEPS",
                    "android.permission.health.WRITE_STEPS",
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
                "@react-native-google-signin/google-signin",
                "@react-native-community/datetimepicker",
                [
                    "expo-camera",
                    {
                        cameraPermission: "Allow camera access.",
                    },
                ],
                "react-native-health",
                "react-native-health-connect",
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

    const platformPlugins = isIOS ? ["expo-apple-authentication"] : [];
    const plugins = [...base.expo.plugins, ...platformPlugins, ["expo-build-properties", buildProps]];

    return {
        ...config,
        ...base,
        expo: {
            ...config?.expo,
            ...base.expo,
            plugins,
        },
    };
};