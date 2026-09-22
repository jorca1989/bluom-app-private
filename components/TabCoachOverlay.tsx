import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

interface Step {
  emoji: string;
  title: string;
  body: string;
}

interface Props {
  visible: boolean;
  steps: Step[];
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function TabCoachOverlay({ visible, steps, stepIndex, onNext, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const slide = useRef(new Animated.Value(300)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  useEffect(() => {
    if (visible && stepIndex >= 0) {
      slide.setValue(300);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, stepIndex]);

  if (!visible || stepIndex < 0 || !steps[stepIndex]) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const total = steps.length;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent onRequestClose={onSkip}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.58)', opacity: fade }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onSkip} activeOpacity={1} />
      </Animated.View>

      {/* Bottom card */}
      <Animated.View
        style={[
          styles.card,
          { paddingBottom: Math.max(insets.bottom, 16) + 12, transform: [{ translateY: slide }] },
        ]}
      >
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Step counter */}
        <Text style={styles.counter}>{stepIndex + 1} / {total}</Text>

        {/* Emoji */}
        <Text style={styles.emoji}>{step.emoji}</Text>

        {/* Title */}
        <Text style={styles.title}>{step.title}</Text>

        {/* Body */}
        <Text style={styles.body}>{step.body}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipTxt}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={styles.nextBtn} activeOpacity={0.85}>
            <Text style={styles.nextTxt}>{isLast ? '✓ Got it!' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (c: ThemeColors, theme: string) => {
  const isDark = theme === 'black' || theme === 'navy' || theme === 'dark';
  return StyleSheet.create({
    card: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 28,
      paddingTop: 22,
      borderTopWidth: 1,
      borderColor: c.border,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 20,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 20,
    },
    counter: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 1,
      marginBottom: 14,
    },
    emoji: {
      fontSize: 42,
      textAlign: 'center',
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 19,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 25,
    },
    body: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 22,
      paddingHorizontal: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 4,
    },
    skipBtn: {
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    skipTxt: {
      color: c.textMuted,
      fontWeight: '600',
      fontSize: 15,
    },
    nextBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    nextTxt: {
      color: c.onPrimary,
      fontWeight: '800',
      fontSize: 15,
    },
  });
};
