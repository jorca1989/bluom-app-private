export default {
  providers: [
    {
      domain: "https://clerk.bluom.app",
      applicationID: "convex",
    },
    // Optional: accept Google ID tokens across platforms (only included when configured).
    ...[
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    ]
      .filter(Boolean)
      .map((applicationID) => ({
        domain: "https://accounts.google.com",
        applicationID,
      })),
  ],
};
