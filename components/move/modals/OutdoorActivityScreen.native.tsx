import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

/**
 * OutdoorActivityScreen (Stubbed)
 * 
 * This screen is currently stubbed to remove dependencies on react-native-maps 
 * and expo-location for App Store compliance.
 */
export default function OutdoorActivityScreen({ visible, onClose }: any) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Outdoor Activity</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={48} color="#94a3b8" />
        <Text style={styles.text}>Outdoor tracking is currently unavailable.</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  text: { marginTop: 20, fontSize: 16, color: c.textMuted, textAlign: 'center' },
});
// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
