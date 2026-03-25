import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function OutdoorActivityModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [Loaded, setLoaded] = useState<React.ComponentType<any> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (Loaded || failed) return;

    (async () => {
      try {
        const mod = await import('./Outdooractivityscreen');
        setLoaded(() => (mod as any).default);
      } catch {
        setFailed(true);
      }
    })();
  }, [visible, Loaded, failed]);

  if (Loaded) {
    return <Loaded visible={visible} onClose={onClose} />;
  }

  // Fallback UI (prevents Move tab disappearing in builds missing native modules)
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
            doesn’t include them yet, so we can’t open the recorder.
          </Text>
          <Text style={s.bodyText}>
            Rebuild the app, then try again:
          </Text>

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

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  close: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  bodyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  bodyText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  cmdBox: { backgroundColor: '#0f172a', borderRadius: 14, padding: 14, gap: 6 },
  cmd: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

