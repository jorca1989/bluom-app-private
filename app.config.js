import 'dotenv/config';

export default {
    expo: {
        name: "Bluom",
        slug: "bolt-expo-nativewind",
        owner: "ggovsaas",
        version: "1.0.5",
        scheme: "bluom",
        userInterfaceStyle: "automatic",
        runtimeVersion: "1.0.5",
        ios: {
            bundleIdentifier: "com.jwfca.bluom",
            googleServicesFile: "./GoogleService-Info.plist",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
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
            versionCode: 40,
            googleServicesFile: "./google-services.json",
            permissions: [
                "android.permission.CAMERA",
                "android.permission.RECORD_AUDIO",
                "android.permission.MODIFY_AUDIO_SETTINGS",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                "android.permission.WAKE_LOCK"
            ]
        },
        splash: {
            image: "./assets/images/icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        web: {
            bundler: "metro",
            output: "single",
            favicon: "./assets/images/icon.png"
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