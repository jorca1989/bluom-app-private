import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';

export function ProUpgradeModal(props: {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onUpgrade: () => void;
  upgradeLabel?: string;
  soundEffect?: SoundEffect;
}) {
  const { visible, title, message, onClose, onUpgrade, upgradeLabel, soundEffect } = props;
  const insets = useSafeAreaInsets();

  const prevVisibleRef = useRef<boolean>(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (!wasVisible && visible) {
      triggerSound(soundEffect ?? SoundEffect.UPGRADE_ALL_FEATURES);
    }
  }, [soundEffect, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.title}>{title ?? 'Upgrade to Pro'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.upgradeText}>{upgradeLabel ?? 'Go Pro'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeLink} activeOpacity={0.8}>
            <Text style={styles.closeLinkText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '900', color: '#0f172a' },
  closeIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: 10, color: '#475569', fontWeight: '700', lineHeight: 19 },
  upgradeBtn: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
  closeLink: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  closeLinkText: { color: '#64748b', fontWeight: '800' },
});


