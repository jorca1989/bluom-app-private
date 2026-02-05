export type GoogleOAuthClientIds = {
  web?: string;
  android?: string;
  ios?: string;
};

export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  return {
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  };
}

export function warnIfMissingGoogleOAuthClientIds() {
  const ids = getGoogleOAuthClientIds();
  if (!ids.web && !ids.android && !ids.ios) {
    console.warn(
      "[Auth] Missing Google OAuth client IDs. Expected EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.",
    );
  }
}









