import 'dotenv/config';

export default {
    expo: {
        name: "Bluom",
        slug: "BluomApp",
        owner: "ggovsaas",
        version: "1.0.1",
        scheme: "bluom",
        userInterfaceStyle: "automatic",
        runtimeVersion: "1.0.0", // Fixed here
        ios: {
            bundleIdentifier: "com.jwfca.bluom",
            googleServicesFile: "./GoogleService-Info.plist",
            infoPlist: {
                CFBundleURLTypes: [
                    {
                        CFBundleURLSchemes: [
                            "com.googleusercontent.apps.769417597120-b9g72gt78bjm10kes8u63q1rgqs41kem"
                        ]
                    }
                ],
                NSHealthShareUsageDescription: "We use health data to sync your daily activity.",
                NSHealthUpdateUsageDescription: "We use health data to sync your daily activity."
            },
            supportsTablet: true
        },
        android: {
            package: "com.jwfca.bluom",
            versionCode: 10,
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
            permissions: [
                "android.permission.CAMERA",
                "android.permission.RECORD_AUDIO",
                "android.permission.health.READ_STEPS",
                "android.permission.health.WRITE_STEPS",
                "android.permission.MODIFY_AUDIO_SETTINGS",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                "android.permission.WAKE_LOCK"
            ]
        },
        plugins: [
            "expo-router",
            "expo-font",
            "expo-web-browser",
            "expo-audio",
            "expo-asset",
            "react-native-health",
            "@react-native-google-signin/google-signin",
            [
                "expo-camera",
                {
                    "cameraPermission": "Allow camera access."
                }
            ]
        ],
        extra: {
            router: {},
            eas: {
                projectId: "7e08b902-8286-427f-844d-652b292722fe"
            }
        },
        updates: {
            url: "https://u.expo.dev/7e08b902-8286-427f-844d-652b292722fe"
        }
    }
};