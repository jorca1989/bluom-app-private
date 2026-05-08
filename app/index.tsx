import { View, Platform } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import LandingPage from "./landing";

export default function IndexScreen() {
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }

  // Render a blank white screen — _layout.tsx owns all routing decisions.
  // This screen is only briefly mounted during the routing handoff.
  // No spinner or text means no visible "flash" during transitions.
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
  );
}
