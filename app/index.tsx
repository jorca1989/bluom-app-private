import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import LandingPage from "./landing";

export default function IndexScreen() {
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }

  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  // Root screen should never present extra choices; routing is owned by app/_layout.tsx.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.text}>
        {!isAuthLoaded || !isClerkLoaded
          ? 'Initializing...'
          : isSignedIn || clerkUser
            ? 'Setting up your account...'
            : 'Preparing onboarding...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#ffffff',
    gap: 16,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    color: '#64748b',
  },
});
