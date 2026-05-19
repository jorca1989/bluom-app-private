import React, { useEffect, useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function OutdoorActivityModal({ visible, onClose }: Props) {
  const { colors: themeColors } = useTheme();
  const s = useMemo(() => createS(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const [Loaded, setLoaded] = useState<React.ComponentType<any> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (Loaded || failed) return;

    (async () => {
      try {
        const mod = await import('./OutdoorActivityScreen.native');
        setLoaded(() => (mod as any).default);
      } catch {
        setFailed(true);
      }
    })();
  }, [visible, Loaded, failed]);

  // Reset failure state when modal closes so we retry next time
  useEffect(() => {
    if (!visible && failed) {
      setFailed(false);
    }
  }, [visible, failed]);

  if (Loaded) {
    return <Loaded visible={visible} onClose={onClose} />;
  }

  // Fallback UI while loading or if native modules are missing
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[s.wrap, { paddingTop: Math.max(insets.top, 12) }]} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>Outdoor Activity</Text>
          <TouchableOpacity onPress={onClose} style={s.close} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          <Text style={s.bodyTitle}>Requires a native build</Text>
          <Text style={s.bodyText}>
            Outdoor GPS recording uses native modules (Maps + Task Manager). Your current build
            doesn't include them yet, so we can't open the recorder.
          </Text>
          <Text style={s.bodyText}>Rebuild the app, then try again:</Text>

          <View style={s.cmdBox}>
            <Text style={s.cmd}>npx expo run:android</Text>
            <Text style={s.cmd}>npx expo run:ios</Text>
          </View>

          <TouchableOpacity style={s.primary} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.primaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createS = (c: ThemeColors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.surfaceMuted },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '900', color: c.text },
  close: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  bodyTitle: { fontSize: 18, fontWeight: '900', color: c.text },
  bodyText: { fontSize: 13, color: c.text, lineHeight: 19 },
  cmdBox: { backgroundColor: c.text, borderRadius: 14, padding: 14, gap: 6 },
  cmd: { color: c.border, fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

// Static module-scope fallbacks (default theme) for helper components.
const s = createS(THEMES.default.colors);
